/**
 * routes/invoices.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Admin invoice management + User invoice download endpoints.
 *
 * Admin endpoints (require auth + admin middleware):
 *   GET  /api/invoices             — Paginated list with filters
 *   GET  /api/invoices/stats       — Aggregate stats
 *   GET  /api/invoices/:id         — Single invoice full details
 *   GET  /api/invoices/:id/pdf     — Stream PDF for download (admin)
 *   POST /api/invoices/:id/resend  — Re-trigger WhatsApp delivery
 *   GET  /api/invoices/export/csv  — CSV export of all/filtered invoices
 *   POST /api/invoices/test-send   — Send test invoice to admin phone
 *
 * User endpoints (require auth — own invoices only):
 *   GET  /api/invoices/my          — List user's own invoices
 *   GET  /api/invoices/my/:id/pdf  — Download user's own invoice PDF
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');

const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilters(query) {
    const where = {};

    if (query.invoiceType && ['tax_invoice', 'quotation'].includes(query.invoiceType)) {
        where.invoiceType = query.invoiceType;
    }
    if (query.whatsappStatus) {
        where.whatsappStatus = query.whatsappStatus;
    }
    if (query.userId) {
        where.userId = query.userId;
    }
    if (query.search) {
        where[Op.or] = [
            { invoiceNumber: { [Op.iLike]: `%${query.search}%` } },
            { buyerName: { [Op.iLike]: `%${query.search}%` } },
            { buyerEmail: { [Op.iLike]: `%${query.search}%` } },
            { buyerPhone: { [Op.like]: `%${query.search}%` } },
            { itemDescription: { [Op.iLike]: `%${query.search}%` } }
        ];
    }
    if (query.from || query.to) {
        where.invoiceDate = {};
        if (query.from) where.invoiceDate[Op.gte] = new Date(query.from);
        if (query.to) where.invoiceDate[Op.lte] = new Date(query.to);
    }

    return where;
}

function pdfServePath(inv) {
    if (!inv.pdfPath) return null;
    return path.join(__dirname, '../public', inv.pdfPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/invoices/my — List user's own invoices
router.get('/my', auth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;

        const { count, rows } = await Invoice.findAndCountAll({
            where: { userId: req.user.id },
            order: [['invoiceDate', 'DESC']],
            limit,
            offset,
            attributes: [
                'id', 'invoiceNumber', 'invoiceType', 'invoiceDate',
                'itemDescription', 'grandTotal', 'currency',
                'whatsappStatus', 'downloadCount', 'createdAt'
            ]
        });

        res.json({
            invoices: rows,
            total: count,
            page,
            pages: Math.ceil(count / limit)
        });
    } catch (err) {
        console.error('GET /invoices/my error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/invoices/my/:id/pdf — Download user's own invoice PDF
router.get('/my/:id/pdf', auth, async (req, res) => {
    try {
        const inv = await Invoice.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });

        const filePath = pdfServePath(inv);
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Invoice PDF not found on disk' });
        }

        // Mark as duplicate on re-download (first download: count 0 → 1, subsequent are duplicates)
        const isDuplicate = inv.downloadCount >= 1;
        await inv.increment('downloadCount');
        if (!inv.isDuplicate && isDuplicate) {
            await inv.update({ isDuplicate: true });
        }

        const filename = `Invoice-${inv.invoiceNumber}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        console.error('GET /invoices/my/:id/pdf error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/invoices/stats — Aggregate dashboard stats
router.get('/stats', auth, admin, async (req, res) => {
    try {
        const { sequelize } = require('../config/database');

        const [totalInvoices, totalRevenue, totalGst, pendingWa] = await Promise.all([
            Invoice.count(),
            Invoice.sum('grandTotal'),
            Invoice.sum('totalTaxAmount'),
            Invoice.count({ where: { whatsappStatus: { [Op.in]: ['pending', 'failed'] } } })
        ]);

        const byType = await Invoice.findAll({
            attributes: ['invoiceType', [sequelize.fn('COUNT', '*'), 'count']],
            group: ['invoiceType'],
            raw: true
        });

        res.json({
            totalInvoices: totalInvoices || 0,
            totalRevenue: parseFloat(totalRevenue || 0).toFixed(2),
            totalGst: parseFloat(totalGst || 0).toFixed(2),
            pendingWaDelivery: pendingWa || 0,
            byType
        });
    } catch (err) {
        console.error('GET /invoices/stats error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/invoices — Paginated + filtered list
router.get('/', auth, admin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 25);
        const offset = (page - 1) * limit;

        const where = buildFilters(req.query);

        const { count, rows } = await Invoice.findAndCountAll({
            where,
            order: [['invoiceDate', 'DESC']],
            limit,
            offset
        });

        res.json({
            invoices: rows,
            total: count,
            page,
            pages: Math.ceil(count / limit)
        });
    } catch (err) {
        console.error('GET /invoices error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/invoices/:id — Single invoice full detail
router.get('/:id', auth, admin, async (req, res) => {
    try {
        const inv = await Invoice.findByPk(req.params.id);
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });

        // Attach linked transaction details
        const txn = await Transaction.findByPk(inv.transactionId, {
            attributes: ['id', 'transactionReference', 'paymentGateway', 'razorpayOrderId', 'razorpayPaymentId', 'createdAt']
        });

        res.json({ ...inv.toJSON(), transaction: txn });
    } catch (err) {
        console.error('GET /invoices/:id error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/invoices/:id/pdf — Admin download invoice PDF
router.get('/:id/pdf', auth, admin, async (req, res) => {
    try {
        const inv = await Invoice.findByPk(req.params.id);
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });

        const filePath = pdfServePath(inv);
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Invoice PDF not found on disk' });
        }

        const filename = `Invoice-${inv.invoiceNumber}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        console.error('GET /invoices/:id/pdf error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/invoices/:id/resend — Re-trigger WhatsApp delivery
router.post('/:id/resend', auth, admin, async (req, res) => {
    try {
        const { resendInvoice } = require('../services/InvoiceService');
        const result = await resendInvoice(req.params.id);
        if (result.success) {
            res.json({ success: true, message: 'Invoice re-sent successfully via WhatsApp' });
        } else {
            res.status(500).json({ success: false, error: result.error || 'Delivery failed' });
        }
    } catch (err) {
        console.error('POST /invoices/:id/resend error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/invoices/test-send — Send a test invoice PDF to admin phone
router.post('/test-send', auth, admin, async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number required' });

        const config = await SystemConfig.getCachedConfig();
        const ic = config?.settings?.invoiceConfig || {};

        const { sendTestInvoice } = require('../services/InvoiceService');
        const result = await sendTestInvoice(phone, ic);

        res.json({ success: result.success, error: result.error });
    } catch (err) {
        console.error('POST /invoices/test-send error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/export/csv — CSV export
router.get('/export/csv', auth, admin, async (req, res) => {
    try {
        const where = buildFilters(req.query);
        const invoices = await Invoice.findAll({ where, order: [['invoiceDate', 'DESC']] });

        const headers = [
            'Invoice Number', 'Date', 'Type', 'Buyer Name', 'Buyer Email', 'Buyer Phone',
            'Buyer Company', 'Buyer GSTIN', 'Buyer State',
            'Item Description', 'HSN/SAC', 'Qty', 'Unit Price', 'Discount',
            'Taxable Amount', 'GST Rate', 'Tax Scheme', 'CGST', 'SGST', 'IGST',
            'Total Tax', 'Grand Total', 'Currency',
            'Seller Name', 'Seller GSTIN', 'Seller State',
            'WA Status', 'CC Status', 'Created At'
        ];

        const csvRows = invoices.map(inv => [
            inv.invoiceNumber, inv.invoiceDate, inv.invoiceType,
            inv.buyerName, inv.buyerEmail, inv.buyerPhone,
            inv.buyerCompany || '', inv.buyerGstin || '', inv.buyerState || '',
            `"${(inv.itemDescription || '').replace(/"/g, '""')}"`,
            inv.itemHsnSac, inv.quantity, inv.unitPrice, inv.discountAmount,
            inv.taxableAmount, inv.gstRate, inv.taxScheme,
            inv.cgstAmount, inv.sgstAmount, inv.igstAmount,
            inv.totalTaxAmount, inv.grandTotal, inv.currency,
            inv.sellerName, inv.sellerGstin || '', inv.sellerState || '',
            inv.whatsappStatus, inv.adminCcStatus,
            new Date(inv.createdAt).toISOString()
        ].join(','));

        const csvContent = [headers.join(','), ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="invoices-${Date.now()}.csv"`);
        res.send(csvContent);
    } catch (err) {
        console.error('GET /invoices/export/csv error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── User-Facing Endpoints (own invoices only) ───────────────────────────────

// GET /api/invoices/my — list authenticated user's own invoices
router.get('/my', auth, async (req, res) => {
    try {
        const userId = req.user.realId || req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await Invoice.findAndCountAll({
            where: { userId },
            order: [['invoiceDate', 'DESC']],
            limit: parseInt(limit),
            offset,
            attributes: [
                'id', 'invoiceNumber', 'invoiceDate', 'invoiceType',
                'itemDescription', 'grandTotal', 'currency',
                'whatsappStatus', 'createdAt'
            ]
        });

        res.json({
            invoices: rows,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit))
        });
    } catch (err) {
        console.error('GET /invoices/my error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/invoices/my/:id/pdf — Download own invoice as PDF
router.get('/my/:id/pdf', auth, async (req, res) => {
    try {
        const userId = req.user.realId || req.user.id;
        const invoice = await Invoice.findOne({
            where: { id: req.params.id, userId }
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        // Re-generate PDF on demand
        const { generatePdf } = require('../services/InvoiceService');
        const config = await SystemConfig.findOne();
        const ic = config?.settings?.invoiceConfig || {};

        const pdfBuffer = await generatePdf(invoice.toJSON(), ic);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('GET /invoices/my/:id/pdf error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/invoices/preview — Generate and return a PDF buffer directly for preview
router.post('/preview', auth, admin, async (req, res) => {
    try {
        const { generatePdf } = require('../services/InvoiceService');
        const ic = req.body.invoiceConfig || {};
        
        const mockInv = {
            invoiceNumber: `${ic.invoicePrefix || 'INV-'}${ic.invoiceCounter || '0001'}`,
            invoiceType: 'tax_invoice',
            invoiceDate: new Date(),
            buyerName: 'Preview Client LLC',
            buyerCompany: 'Client Company',
            buyerAddress: '123 Preview St, Business Park',
            buyerState: 'Maharashtra',
            buyerStateCode: '27',
            buyerPincode: '400001',
            buyerGstin: '27AAAAA0000A1Z5',
            buyerPhone: '+91 98765 43210',
            buyerEmail: 'client@preview.com',
            
            sellerName: ic.sellerName || '',
            sellerAddress: ic.sellerAddress || '',
            sellerState: ic.sellerState || '',
            sellerStateCode: ic.sellerStateCode || '',
            sellerGstin: ic.sellerGstin || '',
            sellerPan: ic.sellerPan || '',
            sellerCin: ic.sellerCin || '',
            sellerEmail: ic.sellerEmail || '',
            sellerPhone: ic.sellerPhone || '',
            
            placeOfSupply: 'Maharashtra (27)',
            itemDescription: 'Annual SaaS Subscription (Preview)',
            itemHsnSac: '9983',
            quantity: 1,
            unitPrice: 10000,
            discountAmount: 1000,
            couponCode: 'SAVE10',
            taxableAmount: 9000,
            gstRate: 18,
            taxScheme: 'cgst_sgst',
            cgstAmount: 810,
            sgstAmount: 810,
            igstAmount: 0,
            totalTaxAmount: 1620,
            grandTotal: 10620,
            currency: 'INR',
            reverseCharge: false
        };

        const pdfBuffer = await generatePdf(mockInv, ic);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
        res.send(pdfBuffer);
    } catch (err) {
        console.error('POST /invoices/preview error:', err);
        res.status(500).json({ error: 'Failed to generate preview PDF' });
    }
});

module.exports = router;
