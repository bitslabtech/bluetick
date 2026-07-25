const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    // ── Invoice Identity ──────────────────────────────────────────────────────
    invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Formatted invoice number e.g. INV-2025-0001'
    },
    invoiceType: {
        type: DataTypes.ENUM('tax_invoice', 'quotation'),
        defaultValue: 'tax_invoice',
        comment: 'tax_invoice shows full GST breakdown; quotation hides GST lines'
    },
    invoiceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },

    // ── Source References ─────────────────────────────────────────────────────
    transactionId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,  // DB-level uniqueness — prevents duplicate invoices on retries
        comment: 'FK to Transaction.id — one invoice per transaction, strictly enforced'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK to User.id — preserved even if user is soft-deleted'
    },

    // ── Buyer Snapshot (frozen at purchase time) ──────────────────────────────
    buyerName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    buyerEmail: {
        type: DataTypes.STRING,
        allowNull: true
    },
    buyerPhone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    buyerCompany: {
        type: DataTypes.STRING,
        allowNull: true
    },
    buyerAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    buyerState: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Used for IGST vs CGST+SGST determination'
    },
    buyerStateCode: {
        type: DataTypes.STRING(5),
        allowNull: true
    },
    buyerGstin: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Buyer GSTIN if provided (B2B invoice)'
    },
    buyerPan: {
        type: DataTypes.STRING,
        allowNull: true
    },
    buyerCountry: {
        type: DataTypes.STRING,
        defaultValue: 'India'
    },
    buyerPincode: {
        type: DataTypes.STRING,
        allowNull: true
    },

    // ── Seller Snapshot (frozen from invoiceConfig at time of generation) ─────
    sellerName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sellerAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    sellerState: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sellerStateCode: {
        type: DataTypes.STRING(5),
        allowNull: true
    },
    sellerGstin: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sellerPan: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sellerCin: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sellerEmail: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sellerPhone: {
        type: DataTypes.STRING,
        allowNull: true
    },

    // ── Line Item ─────────────────────────────────────────────────────────────
    itemDescription: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'e.g. "Pro Plan - Monthly Subscription" or "AI Bot Add-on - Monthly"'
    },
    itemHsnSac: {
        type: DataTypes.STRING,
        defaultValue: '998314',
        comment: 'SAC code for SaaS services; configurable in invoiceConfig'
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Price before any discount'
    },
    discountAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        comment: 'Coupon or upgrade credit discount applied'
    },
    taxableAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Amount on which GST is calculated (after discount, exclusive of GST)'
    },

    // ── GST Breakdown ─────────────────────────────────────────────────────────
    gstRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        comment: 'GST % applied e.g. 18.00'
    },
    taxScheme: {
        type: DataTypes.ENUM('igst', 'cgst_sgst', 'none'),
        defaultValue: 'none',
        comment: 'igst=inter-state; cgst_sgst=intra-state; none=non-INR or GST not applicable'
    },
    igstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00
    },
    cgstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00
    },
    sgstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00
    },
    totalTaxAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00
    },
    reverseCharge: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Reverse charge mechanism applicable (required field on GST invoice)'
    },

    // ── Totals ────────────────────────────────────────────────────────────────
    grandTotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Final amount charged = taxableAmount + totalTaxAmount'
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'INR'
    },

    // ── PDF Storage ───────────────────────────────────────────────────────────
    pdfPath: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Relative path from server/public: uploads/invoices/INV-2025-0001.pdf'
    },
    pdfUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Publicly accessible HTTPS URL for WhatsApp document delivery'
    },

    // ── WhatsApp Delivery Status ──────────────────────────────────────────────
    whatsappStatus: {
        type: DataTypes.ENUM('pending', 'sent', 'failed', 'skipped_no_phone'),
        defaultValue: 'pending'
    },
    whatsappSentAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    whatsappError: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if WA delivery failed'
    },
    adminCcSentAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    adminCcStatus: {
        type: DataTypes.ENUM('pending', 'sent', 'failed', 'skipped'),
        defaultValue: 'pending'
    },

    // ── Misc ──────────────────────────────────────────────────────────────────
    placeOfSupply: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'State name where service is supplied (buyer state for B2C)'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isDuplicate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'True when user downloads the invoice a second time (watermark DUPLICATE)'
    },
    downloadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true
});

module.exports = Invoice;
