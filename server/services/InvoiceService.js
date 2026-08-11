/**
 * InvoiceService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Core service for GST invoice generation, PDF creation, and WhatsApp delivery.
 *
 * Responsibilities:
 *  1. generateAndDeliverInvoice(transactionId) — main entry point
 *  2. buildInvoiceData()     — fetches all data and computes GST
 *  3. generatePdf()          — creates PDF using pdfmake
 *  4. sendViaWhatsApp()      — sends template + document to user + CC numbers
 *
 * Strict anti-duplicate protection:
 *  - DB UNIQUE constraint on Invoice.transactionId
 *  - Pre-check before generation: skip if invoice already exists
 *  - Non-blocking: errors are logged but never propagate to payment flow
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ─── GST Calculation Helper ───────────────────────────────────────────────────

/**
 * Compute all GST fields given raw inputs.
 *
 * @param {number} unitPrice      - Price as entered (before discount)
 * @param {number} discount       - Discount amount applied
 * @param {number} gstRate        - GST percentage e.g. 18
 * @param {string} gstType        - 'inclusive' | 'exclusive'
 * @param {string} buyerState     - Buyer's state name
 * @param {string} sellerState    - Seller's state name
 * @param {boolean} useIgstAlways - If true, always use IGST regardless of state match
 * @returns {object} Full GST breakdown
 */
function computeGst(unitPrice, discount, gstRate, gstType, buyerState, sellerState, useIgstAlways) {
    const priceAfterDiscount = Math.max(0, parseFloat(unitPrice) - parseFloat(discount || 0));
    let taxableAmount, totalTaxAmount, grandTotal;

    if (!gstRate || gstRate <= 0) {
        return {
            taxScheme: 'none',
            taxableAmount: priceAfterDiscount,
            igstAmount: 0, cgstAmount: 0, sgstAmount: 0,
            totalTaxAmount: 0,
            grandTotal: priceAfterDiscount
        };
    }

    if (gstType === 'inclusive') {
        // Price already includes GST — back-calculate taxable amount
        taxableAmount = priceAfterDiscount / (1 + gstRate / 100);
        totalTaxAmount = priceAfterDiscount - taxableAmount;
        grandTotal = priceAfterDiscount;
    } else {
        // Exclusive — add GST on top
        taxableAmount = priceAfterDiscount;
        totalTaxAmount = taxableAmount * (gstRate / 100);
        grandTotal = taxableAmount + totalTaxAmount;
    }

    // Determine intra vs inter state
    const normalizedBuyer = (buyerState || '').trim().toLowerCase();
    const normalizedSeller = (sellerState || '').trim().toLowerCase();
    const isInterState = useIgstAlways || !normalizedBuyer || normalizedBuyer !== normalizedSeller;

    const taxScheme = isInterState ? 'igst' : 'cgst_sgst';
    const igstAmount = isInterState ? totalTaxAmount : 0;
    const cgstAmount = isInterState ? 0 : totalTaxAmount / 2;
    const sgstAmount = isInterState ? 0 : totalTaxAmount / 2;

    return {
        taxScheme,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        igstAmount: Math.round(igstAmount * 100) / 100,
        cgstAmount: Math.round(cgstAmount * 100) / 100,
        sgstAmount: Math.round(sgstAmount * 100) / 100,
        totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100
    };
}

// ─── Number to Words (Indian System) ─────────────────────────────────────────

function numberToWords(num) {
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convert(n) {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    }

    const intPart = Math.floor(Math.abs(num));
    const decPart = Math.round((Math.abs(num) - intPart) * 100);
    let result = convert(intPart) + ' Rupees';
    if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise';
    result += ' Only';
    return result;
}

// ─── Format date ──────────────────────────────────────────────────────────────

function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-IN', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}

function formatCurrency(amount, currency = 'INR') {
    if (currency === 'INR') return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    return parseFloat(amount).toFixed(2);
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

/**
 * Generate GST-compliant invoice PDF buffer using pdfkit (native Node.js).
 * @param {object} inv - Invoice data object
 * @param {object} ic  - invoiceConfig from SystemConfig
 * @returns {Buffer} PDF buffer
 */
async function generatePdf(inv, ic) {
    const PDFDocument = require('pdfkit');

    // Pre-fetch signature image as buffer
    let signatureBuffer = null;
    if (ic && ic.authorizedSignatureUrl) {
        try {
            if (ic.authorizedSignatureUrl.startsWith('http')) {
                const response = await axios.get(ic.authorizedSignatureUrl, { responseType: 'arraybuffer', timeout: 5000 });
                signatureBuffer = Buffer.from(response.data);
            } else if (ic.authorizedSignatureUrl.startsWith('data:image')) {
                const base64Data = ic.authorizedSignatureUrl.split(',')[1];
                signatureBuffer = Buffer.from(base64Data, 'base64');
            } else {
                const localPath = path.join(__dirname, '../public', ic.authorizedSignatureUrl);
                if (fs.existsSync(localPath)) signatureBuffer = fs.readFileSync(localPath);
            }
            
            // Convert signature to PNG to ensure PDFKit compatibility (especially for WebP)
            if (signatureBuffer) {
                const sharp = require('sharp');
                signatureBuffer = await sharp(signatureBuffer).png().toBuffer();
            }
        } catch (err) {
            console.warn('[PDF] Failed to load signature image:', err.message);
        }
    }

    const isTaxInvoice = inv.invoiceType === 'tax_invoice';
    const isGstApplicable = isTaxInvoice && inv.taxScheme !== 'none';
    const title = isTaxInvoice ? 'TAX INVOICE' : 'QUOTATION';
    
    // Ultra-Premium Design Palette
    const HEADER_BG = '#FFFFFF'; // White header
    const HEADER_TEXT = '#1F2937'; // Dark text
    const HEADER_MUTED = '#64748B'; // Muted text
    const PRIMARY = '#3B82F6'; // Modern Blue accent
    const TEXT_DARK = '#1F2937'; 
    const TEXT_MUTED = '#64748B'; 
    const BG_LIGHT = '#F1F5F9'; 
    const BORDER = '#E2E8F0'; 
    const SUCCESS = '#10B981';

    return new Promise((resolve, reject) => {
        try {
            let pageNum = 0;
            const doc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: false });
            const chunks = [];
            doc.on('data', c => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const PW = 595.28 - 80; // A4 usable width
            const LM = 40;
            
            const drawPageFooter = () => {
                const pb = doc.page.height - 40 - 10;
                doc.save();
                doc.strokeColor(BORDER).lineWidth(1).moveTo(LM, pb - 12).lineTo(LM + PW, pb - 12).stroke();
                doc.font('Helvetica').fontSize(8).fillColor(TEXT_MUTED);
                doc.text(inv.sellerName || '', LM, pb, { width: PW / 3, align: 'left', lineBreak: false });
                doc.text(`Invoice ${inv.invoiceNumber || ''}`, LM, pb, { width: PW, align: 'center', lineBreak: false });
                doc.text('Computer generated document.', LM, pb, { width: PW, align: 'right', lineBreak: false });
                doc.restore();
            };

            doc.on('pageAdded', () => { pageNum++; });
            doc.addPage();

            // ── FULL-BLEED DARK HEADER ────────────────────────────────────────────────
            const headerHeight = 180;
            doc.save().rect(0, 0, doc.page.width, headerHeight).fill(HEADER_BG).restore();
            
            let currentY = 40;

            // Left: Company Name & Info (White text)
            doc.font('Helvetica-Bold').fontSize(24).fillColor(HEADER_TEXT);
            const sellerName = inv.sellerName || '';
            if (sellerName) {
                doc.text(sellerName, LM, currentY, { width: PW * 0.5 });
                currentY += doc.heightOfString(sellerName, { width: PW * 0.5 }) + 6;
            }
            
            doc.font('Helvetica').fontSize(9.5).fillColor(HEADER_MUTED);
            if (inv.sellerAddress) {
                doc.text(inv.sellerAddress, LM, currentY, { width: PW * 0.5 });
                currentY += doc.heightOfString(inv.sellerAddress, { width: PW * 0.5 }) + 4;
            }
            if (inv.sellerState) {
                const stateTxt = `${inv.sellerState} ${inv.sellerStateCode ? `(${inv.sellerStateCode})` : ''}`;
                doc.text(stateTxt, LM, currentY, { width: PW * 0.5 });
                currentY += doc.heightOfString(stateTxt, { width: PW * 0.5 }) + 4;
            }
            
            let contactInfo = [];
            if (inv.sellerEmail) contactInfo.push(`E: ${inv.sellerEmail}`);
            if (inv.sellerPhone) contactInfo.push(`P: ${inv.sellerPhone}`);
            if (contactInfo.length > 0) {
                const contactTxt = contactInfo.join('  •  ');
                doc.text(contactTxt, LM, currentY, { width: PW * 0.5 });
                currentY += doc.heightOfString(contactTxt, { width: PW * 0.5 }) + 4;
            }
            
            let taxInfo = [];
            if (inv.sellerGstin) taxInfo.push(`GSTIN: ${inv.sellerGstin}`);
            if (inv.sellerCin) taxInfo.push(`CIN: ${inv.sellerCin}`);
            if (taxInfo.length > 0) {
                doc.font('Helvetica-Bold').fontSize(9).fillColor(HEADER_TEXT);
                const taxTxt = taxInfo.join('  |  ');
                doc.text(taxTxt, LM, currentY, { width: PW * 0.5 });
                currentY += doc.heightOfString(taxTxt, { width: PW * 0.5 }) + 4;
            }

            // Right: Invoice Title & Meta (White text)
            let metaY = 40;
            doc.font('Helvetica-Bold').fontSize(24).fillColor(PRIMARY).text(title, LM, metaY, { width: PW, align: 'right', characterSpacing: 2 });
            metaY += 30;
            
            const metaRows = [
                ['Invoice Number:', inv.invoiceNumber || 'N/A'],
                ['Invoice Date:', formatDate(inv.invoiceDate)]
            ];
            if (inv.placeOfSupply) metaRows.push(['Place of Supply:', inv.placeOfSupply]);
            
            metaRows.forEach(([lbl, val]) => {
                doc.font('Helvetica-Bold').fontSize(9).fillColor(HEADER_MUTED).text(lbl, LM + PW * 0.6, metaY, { width: PW * 0.2, align: 'right', lineBreak: false });
                doc.font('Helvetica').fontSize(9).fillColor(HEADER_TEXT).text(val, LM + PW * 0.8 + 5, metaY, { width: PW * 0.2 - 5, align: 'right', lineBreak: false });
                metaY += 18;
            });

            // ── FLOATING OVERLAP CARD (BILL TO & PAYMENT INFO) ───────────────────────
            currentY = 140; // Start overlapping the dark header
            
            // Draw subtle drop shadow for the card
            doc.save().roundedRect(LM - 2, currentY - 2, PW + 4, 124, 8).fill('#E2E8F0').restore();
            // Main white card
            doc.save().roundedRect(LM, currentY, PW, 120, 8).fill('#FFFFFF').strokeColor(BORDER).lineWidth(1).stroke().restore();

            const boxW = (PW - 30) / 2;
            const leftPad = LM + 20;
            const rightPad = LM + boxW + 30;
            
            // Bill To Box (Left inside Card)
            doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED).text('BILLED TO', leftPad, currentY + 20, { characterSpacing: 1 });
            
            doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text(inv.buyerName || '', leftPad, currentY + 35);
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED);
            let by = currentY + 50;
            if (inv.buyerCompany) { 
                const h = doc.heightOfString(inv.buyerCompany, { width: boxW - 10 });
                doc.text(inv.buyerCompany, leftPad, by, { width: boxW - 10 }); 
                by += h + 2; 
            }
            if (inv.buyerAddress) { 
                const h = doc.heightOfString(inv.buyerAddress, { width: boxW - 10 });
                doc.text(inv.buyerAddress, leftPad, by, { width: boxW - 10 }); 
                by += h + 2; 
            }
            if (inv.buyerGstin) { doc.font('Helvetica-Bold').text(`GSTIN: ${inv.buyerGstin}`, leftPad, by).font('Helvetica'); by += 13; }
            if (inv.buyerPhone || inv.buyerEmail) {
                const h = doc.heightOfString([inv.buyerPhone, inv.buyerEmail].filter(Boolean).join('  |  '), { width: boxW - 10 });
                doc.fillColor(TEXT_MUTED).text([inv.buyerPhone, inv.buyerEmail].filter(Boolean).join('  |  '), leftPad, by, { width: boxW - 10 });
            }

            // Divider line in the middle of the card
            doc.save().strokeColor(BG_LIGHT).lineWidth(1).moveTo(LM + PW/2, currentY + 20).lineTo(LM + PW/2, currentY + 100).stroke().restore();

            // Payment Info Box (Right inside Card)
            doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED).text('PAYMENT DETAILS', rightPad, currentY + 20, { characterSpacing: 1 });
            
            let py = currentY + 35;
            const payMethod = inv.paymentMethod || inv.paymentGateway || (inv.paymentStatus === 'paid' ? 'Online' : 'Pending');
            const txnId = inv.paymentTransactionId || inv.razorpayPaymentId || inv.paymentId || 'N/A';
            const pStatus = inv.paymentStatus === 'paid' ? 'Paid' : 'Pending';
            
            const payRows = [
                ['Status:', pStatus],
                ['Method:', payMethod],
                ['Payment ID:', txnId]
            ];
            payRows.forEach(([l, v]) => {
                doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED).text(l, rightPad, py, { width: 60, lineBreak: false });
                doc.font('Helvetica-Bold').fontSize(9).fillColor(pStatus === 'Paid' && l==='Status:' ? SUCCESS : TEXT_DARK).text(v, rightPad + 60, py, { width: boxW - 60 });
                py += 16;
            });

            currentY += 160; // Move below the floating card

            // ── PREMIUM ITEMS TABLE ──────────────────────────────────────────────────
            const cols = [
                { t: '#', w: 35, a: 'center' },
                { t: 'DESCRIPTION', w: PW - 35 - 65 - 40 - 90 - 95, a: 'left' },
                { t: 'HSN', w: 65, a: 'center' },
                { t: 'Qty', w: 40, a: 'center' },
                { t: 'PRICE', w: 90, a: 'right' },
                { t: 'AMOUNT', w: 95, a: 'right' }
            ];
            
            // Table Header Background
            doc.save().roundedRect(LM, currentY, PW, 30, 6).fill(BG_LIGHT).restore();
            
            let tx = LM;
            doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED);
            cols.forEach((c, i) => {
                const pad = i === cols.length - 1 ? 15 : (i === 1 ? 5 : 0);
                doc.text(c.t, tx + (i===0?0:5), currentY + 11, { width: c.w - pad, align: c.a, lineBreak: false, characterSpacing: 1 });
                tx += c.w;
            });
            currentY += 40;

            // Table Row
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK);
            tx = LM;
            [
                { t: '1', w: cols[0].w, a: 'center' },
                { t: inv.itemDescription || '', w: cols[1].w, a: 'left' },
                { t: inv.itemHsnSac || '', w: cols[2].w, a: 'center' },
                { t: String(inv.quantity || 1), w: cols[3].w, a: 'center' },
                { t: formatCurrency(inv.unitPrice || 0), w: cols[4].w, a: 'right' },
                { t: formatCurrency(inv.taxableAmount || 0), w: cols[5].w, a: 'right' }
            ].forEach((c, i) => {
                const isDesc = i === 1;
                const isAmount = i === 5;
                if (isDesc || isAmount) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
                if (isAmount) doc.fillColor(PRIMARY); else doc.fillColor(TEXT_DARK);
                
                const pad = i === 5 ? 15 : (i === 1 ? 5 : 0);
                doc.text(c.t, tx + (i===0?0:5), currentY, { width: c.w - pad, align: c.a, lineBreak: false });
                tx += c.w;
            });
            currentY += 25;

            if (inv.discountAmount > 0) {
                const discountText = inv.couponCode 
                    ? `Coupon Discount (${inv.couponCode}): -${formatCurrency(inv.discountAmount)}` 
                    : `Includes Discount: -${formatCurrency(inv.discountAmount)}`;
                doc.font('Helvetica-Bold').fontSize(9).fillColor(SUCCESS).text(discountText, LM + cols[0].w + 5, currentY);
                currentY += 25;
            }
            
            // Subtle bottom border for the row
            doc.save().strokeColor(BORDER).lineWidth(1).moveTo(LM + 10, currentY).lineTo(LM + PW - 10, currentY).stroke().restore();
            currentY += 20;

            // ── TOTALS ──────────────────────────────────────────────────
            let nextY = currentY;
            
            if (isGstApplicable) {
                doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED).text('TAX SUMMARY', LM, nextY);
                let ty = nextY + 12;
                doc.font('Helvetica').fontSize(8).fillColor(TEXT_DARK);
                
                if (inv.taxScheme === 'igst') {
                    doc.text(`IGST (${inv.gstRate}%): ${formatCurrency(inv.igstAmount)}`, LM, ty);
                } else {
                    doc.text(`CGST (${inv.gstRate / 2}%): ${formatCurrency(inv.cgstAmount)}`, LM, ty);
                    doc.text(`SGST (${inv.gstRate / 2}%): ${formatCurrency(inv.sgstAmount)}`, LM, ty + 12);
                }
            }
            
            let totY = currentY;
            const totalX = LM + PW * 0.55;
            const totalW = PW * 0.45;
            
            const addTot = (l, v, bold=false, col=TEXT_DARK) => {
                const f = bold ? 'Helvetica-Bold' : 'Helvetica';
                const sz = bold ? 11 : 9;
                doc.font(f).fontSize(sz).fillColor(TEXT_MUTED).text(l, totalX, totY, { width: totalW * 0.55, align: 'right', lineBreak: false });
                doc.font(f).fontSize(sz).fillColor(col).text(v, totalX + totalW * 0.55 + 5, totY, { width: totalW * 0.45 - 5, align: 'right', lineBreak: false });
                totY += bold ? 18 : 16;
            };

            addTot('Taxable Value:', formatCurrency(inv.taxableAmount));
            if (isGstApplicable) addTot('Total Tax:', formatCurrency(inv.totalTaxAmount || (inv.cgstAmount + inv.sgstAmount + inv.igstAmount)));
            
            doc.save().strokeColor(BORDER).lineWidth(1).moveTo(totalX, totY).lineTo(LM+PW, totY).stroke().restore();
            totY += 10;
            addTot('Total Amount:', formatCurrency(inv.grandTotal), true, PRIMARY);
            
            currentY = Math.max(nextY + 60, totY) + 20;
            
            doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED).text('AMOUNT IN WORDS', LM, currentY);
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK).text(numberToWords(inv.grandTotal || 0), LM, currentY + 12, { width: PW * 0.6 });
            
            currentY += 40;
            doc.save().strokeColor(BORDER).lineWidth(1).moveTo(LM, currentY).lineTo(LM + PW, currentY).stroke().restore();
            currentY += 15;

            // ── NOTES & SIGNATURE ───────────────────────────────────────
            let ny = currentY;
            if (ic && ic.paymentTerms) {
                doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED).text('PAYMENT TERMS', LM, ny);
                doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK).text(ic.paymentTerms, LM, ny + 12, { width: PW * 0.5 });
                ny += 35;
            }
            if (ic && ic.invoiceNotes) {
                doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED).text('NOTES', LM, ny);
                doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK).text(ic.invoiceNotes, LM, ny + 12, { width: PW * 0.5 });
            }

            const sigW = 120;
            const sigX = LM + PW - sigW;
            
            if (signatureBuffer) {
                try {
                    // Fit the signature reasonably in a 90x40 box to prevent overlapping
                    doc.image(signatureBuffer, sigX + 15, currentY, { fit: [90, 40], align: 'center', valign: 'center' });
                } catch (e) {
                    console.warn('[PDF] Signature image error:', e.message);
                }
            }
            
            const sigLy = currentY + 50;
            doc.save().strokeColor(BORDER).lineWidth(1).moveTo(sigX, sigLy).lineTo(sigX + sigW, sigLy).stroke().restore();
            if (ic && ic.authorizedSignatoryName) {
                doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK).text(ic.authorizedSignatoryName, sigX, sigLy + 6, { width: sigW, align: 'center' });
            }
            if (inv.sellerName) {
                doc.font('Helvetica').fontSize(8).fillColor(TEXT_MUTED).text('For ' + inv.sellerName, sigX, sigLy + 18, { width: sigW, align: 'center' });
            }

            drawPageFooter();
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// ─── Save PDF to disk ─────────────────────────────────────────────────────────

async function savePdf(buffer, invoiceNumber, userId = null) {
    const { processAndStoreBuffer } = require('../utils/storageProvider');
    const filename = `${invoiceNumber}.pdf`;
    
    const publicUrl = await processAndStoreBuffer(
        buffer,
        filename,
        'application/pdf',
        'invoices',
        userId,
        { registerMedia: false, trackMedia: false }
    );

    return {
        pdfPath: publicUrl, // Storing the full URL directly
        pdfPublicUrl: publicUrl,
        filename
    };
}

// ─── WhatsApp Delivery ────────────────────────────────────────────────────────

/**
 * Sends a WA template message + document (PDF) to a phone number.
 * Uses the linked admin's Meta credentials.
 */
async function sendInvoiceWhatsApp(toPhone, inv, ic, pdfPublicUrl) {
    try {
        const SystemConfig = require('../models/SystemConfig');
        const Settings = require('../models/Settings');
        const User = require('../models/User');

        const config = await SystemConfig.getCachedConfig();
        const linkedAdminId = config?.settings?.linkedAdminUserId;
        if (!linkedAdminId) {
            console.warn('[INVOICE WA] No linked admin account configured.');
            return { success: false, error: 'No linked account' };
        }

        const adminSettings = await Settings.findOne({ where: { userId: linkedAdminId } });
        if (!adminSettings?.metaPhoneNumberId || !adminSettings?.metaAccessToken) {
            console.warn('[INVOICE WA] Linked account missing WA configuration.');
            return { success: false, error: 'WA not configured' };
        }

        const token = adminSettings.metaAccessToken.replace(/[^\x20-\x7E]/g, '').trim();
        const phoneId = adminSettings.metaPhoneNumberId.replace(/[^\x20-\x7E]/g, '').trim();
        const apiUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
        const normalizedTo = String(toPhone).replace(/\D/g, '');

        if (!normalizedTo) return { success: false, error: 'Invalid phone number' };

        if (!ic.invoiceWaTemplateName) {
            return { success: false, error: 'WhatsApp template for invoices is not configured in Settings' };
        }

        // Step 1: Send template message with PDF document header
        const components = [];

        if (pdfPublicUrl) {
            components.push({
                type: 'header',
                parameters: [
                    {
                        type: 'document',
                        document: {
                            link: pdfPublicUrl,
                            filename: `Invoice-${inv.invoiceNumber}.pdf`
                        }
                    }
                ]
            });
        }

        components.push({
            type: 'body',
            parameters: [
                { type: 'text', text: inv.buyerName || 'Customer' }
            ]
        });

        await axios.post(apiUrl, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedTo,
            type: 'template',
            template: {
                name: ic.invoiceWaTemplateName,
                language: { code: ic.invoiceWaLanguageCode || 'en' },
                components: components
            }
        }, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        return { success: true };
    } catch (err) {
        console.error('[INVOICE WA] Send error:', err.response?.data || err.message);
        return { success: false, error: err.response?.data?.error?.message || err.message };
    }
}

// ─── Build Item Description ───────────────────────────────────────────────────

function buildDescription(planName, ic) {
    if (!planName) return 'Software Subscription Service';

    if (planName.startsWith('Addon:')) {
        const addonName = planName.replace('Addon:', '').trim();
        return (ic.addonDescriptionTemplate || '{addon_name} Add-on')
            .replace('{addon_name}', addonName);
    }
    if (planName.startsWith('Store:')) {
        const itemName = planName.replace('Store:', '').trim();
        return (ic.topupDescriptionTemplate || '{item_name} Top-up')
            .replace('{item_name}', itemName);
    }
    return (ic.planDescriptionTemplate || '{plan_name} Subscription')
        .replace('{plan_name}', planName);
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Generates an invoice for a completed transaction, saves it to disk,
 * and delivers it via WhatsApp to the user + admin CC numbers.
 *
 * This is intentionally non-throwing — all errors are caught internally.
 * The payment flow must never fail because of invoice errors.
 *
 * @param {string} transactionId - UUID of the COMPLETED Transaction record
 */
async function generateAndDeliverInvoice(transactionId, options = { silent: false }) {
    const Invoice = require('../models/Invoice');
    const Transaction = require('../models/Transaction');
    const User = require('../models/User');
    const SystemConfig = require('../models/SystemConfig');
    const { getNextInvoiceNumber } = require('../utils/invoiceNumber');

    // ── 1. Strict anti-duplicate check ──────────────────────────────────────────
    const existingInvoice = await Invoice.findOne({ where: { transactionId } });
    if (existingInvoice) {
        console.log(`[INVOICE] Skipping duplicate — invoice ${existingInvoice.invoiceNumber} already exists for transaction ${transactionId}`);
        return existingInvoice;
    }

    // ── 2. Fetch transaction ───────────────────────────────────────────────────
    const txn = await Transaction.findByPk(transactionId);
    if (!txn) throw new Error(`Transaction ${transactionId} not found`);
    if (txn.status !== 'COMPLETED') throw new Error(`Transaction ${transactionId} is not COMPLETED (status: ${txn.status})`);

    // ── 3. Fetch user ──────────────────────────────────────────────────────────
    const user = await User.findByPk(txn.userId);
    if (!user) throw new Error(`User ${txn.userId} not found`);

    // ── 4. Load GST config ─────────────────────────────────────────────────────
    const config = await SystemConfig.getCachedConfig();
    const ic = config?.settings?.invoiceConfig || {};
    const gstEnabled = ic.gstEnabled !== false;
    const currency = (txn.currency || 'INR').toUpperCase();
    const skipGst = currency !== 'INR'; // Non-INR transactions: skip GST as decided

    // ── 5. Build buyer snapshot ────────────────────────────────────────────────
    const bp = user.billingProfile || {};
    const buyerState = bp.state || '';
    const buyerName = txn.userName || user.name || '';
    const buyerEmail = txn.userEmail || user.email || '';
    const buyerPhone = txn.userPhone || user.phone || '';

    // ── 6. Compute GST ────────────────────────────────────────────────────────
    // txn.amount = amount actually paid (after discount)
    // txn.discountApplied = voucher/coupon discount value
    // originalPrice = the full plan price before any discount
    const discountAmount = parseFloat(txn.discountApplied || 0);
    const amountPaid = parseFloat(txn.amount); // what was actually charged
    const originalPrice = amountPaid + discountAmount; // full price before discount

    let gstFields = {};
    if (gstEnabled && !skipGst && (ic.invoiceType || 'tax_invoice') === 'tax_invoice') {
        // Compute GST on the original price, with discount applied — so taxable base = amountPaid
        gstFields = computeGst(
            originalPrice,
            discountAmount,
            ic.defaultGstRate || 18,
            ic.gstType || 'exclusive',
            buyerState,
            ic.sellerState || '',
            ic.useIgstAlways || false
        );
    } else {
        // Quotation or non-INR or GST disabled — no tax breakdown
        gstFields = {
            taxScheme: 'none',
            taxableAmount: amountPaid,
            igstAmount: 0, cgstAmount: 0, sgstAmount: 0,
            totalTaxAmount: 0,
            grandTotal: amountPaid
        };
    }

    // ── 7. Get invoice number ──────────────────────────────────────────────────
    const invoiceNumber = await getNextInvoiceNumber(config);

    // ── 8. Determine public URL base ───────────────────────────────────────────
    const appBaseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5000';
    const backendUrl = appBaseUrl.replace(':5173', ':5000'); // Handle dev port mismatch

    const invoiceData = {
        invoiceNumber,
        invoiceType: ic.invoiceType || 'tax_invoice',
        invoiceDate: new Date(),
        transactionId,
        userId: user.id,

        // Buyer
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerCompany: bp.company || user.company || '',
        buyerAddress: bp.address || '',
        buyerState,
        buyerStateCode: bp.stateCode || '',
        buyerGstin: bp.gstin || '',
        buyerPan: bp.pan || '',
        buyerCountry: bp.country || 'India',
        buyerPincode: bp.pincode || '',

        // Seller (frozen from config)
        sellerName: ic.sellerName || '',
        sellerAddress: ic.sellerAddress || '',
        sellerState: ic.sellerState || '',
        sellerStateCode: ic.sellerStateCode || '',
        sellerGstin: ic.sellerGstin || '',
        sellerPan: ic.sellerPan || '',
        sellerCin: ic.sellerCin || '',
        sellerEmail: ic.sellerEmail || '',
        sellerPhone: ic.sellerPhone || '',

        // Line item
        itemDescription: buildDescription(txn.planName, ic),
        itemHsnSac: ic.hsnSacCode || '998314',
        quantity: 1,
        unitPrice: originalPrice,         // ← Full plan price before discount
        discountAmount: discountAmount,    // ← Voucher/coupon discount
        couponCode: txn.couponCode || null, // ← For PDF label: "Coupon Discount (CODE)"

        // GST
        gstRate: ic.defaultGstRate || 0,
        ...gstFields,

        // Misc
        currency,
        placeOfSupply: buyerState || ic.sellerState || '',
        reverseCharge: false,
        notes: ic.invoiceNotes || '',

        // Payment Info (passed to PDF generator)
        paymentMethod: txn.paymentGateway || 'Online',
        paymentTransactionId: txn.razorpayPaymentId || txn.transactionReference || txn.id,
        paymentStatus: txn.status === 'COMPLETED' ? 'paid' : 'pending'
    };

    // ── 9. Generate PDF ────────────────────────────────────────────────────────
    const pdfBuffer = await generatePdf(invoiceData, ic);
    const { pdfPath, pdfPublicUrl } = await savePdf(pdfBuffer, invoiceNumber, user.id);

    // ── 10. Save Invoice record ────────────────────────────────────────────────
    const invoice = await Invoice.create({
        ...invoiceData,
        pdfPath,
        pdfUrl: pdfPublicUrl,
        whatsappStatus: 'pending',
        adminCcStatus: 'pending'
    });

    console.log(`[INVOICE] Generated ${invoiceNumber} for transaction ${transactionId}`);

    // ── 11. Send WhatsApp to user ──────────────────────────────────────────────
    const userPhone = buyerPhone;
    if (options.silent) {
        await invoice.update({ whatsappStatus: 'skipped_silent' });
        console.log(`[INVOICE] WA delivery skipped for user ${userPhone} (Silent mode)`);
    } else if (userPhone) {
        const waResult = await sendInvoiceWhatsApp(userPhone, invoiceData, ic, pdfPublicUrl);
        await invoice.update({
            whatsappStatus: waResult.success ? 'sent' : 'failed',
            whatsappSentAt: waResult.success ? new Date() : null,
            whatsappError: waResult.success ? null : waResult.error
        });
        console.log(`[INVOICE] WA delivery to user ${userPhone}: ${waResult.success ? 'sent' : 'FAILED'}`);
    } else {
        await invoice.update({ whatsappStatus: 'skipped_no_phone' });
        console.warn(`[INVOICE] WA delivery skipped — user has no phone number`);
    }

    // ── 12. Send CC copies to admin numbers ────────────────────────────────────
    const ccNumbers = ic.ccNumbers || [];
    if (options.silent) {
        await invoice.update({ adminCcStatus: 'skipped_silent' });
        console.log(`[INVOICE] CC copies skipped (Silent mode)`);
    } else if (ic.sendCcOnPurchase && ccNumbers.length > 0) {
        let ccFailed = 0;
        for (const ccPhone of ccNumbers) {
            if (!ccPhone) continue;
            const ccResult = await sendInvoiceWhatsApp(ccPhone, invoiceData, ic, pdfPublicUrl);
            if (!ccResult.success) ccFailed++;
        }
        await invoice.update({
            adminCcStatus: ccFailed === 0 ? 'sent' : (ccFailed === ccNumbers.length ? 'failed' : 'sent'),
            adminCcSentAt: new Date()
        });
        console.log(`[INVOICE] CC copies sent to ${ccNumbers.length - ccFailed}/${ccNumbers.length} admin numbers`);
    } else {
        await invoice.update({ adminCcStatus: 'skipped' });
    }

    return invoice;
}

/**
 * Re-sends an existing invoice via WhatsApp.
 * Used by admin "Re-Send" button in Invoice Manager.
 */
async function resendInvoice(invoiceId) {
    const Invoice = require('../models/Invoice');
    const inv = await Invoice.findByPk(invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const SystemConfig = require('../models/SystemConfig');
    const config = await SystemConfig.getCachedConfig();
    const ic = config?.settings?.invoiceConfig || {};

    const pdfPublicUrl = inv.pdfUrl;
    if (!pdfPublicUrl) throw new Error('No PDF URL on invoice record');

    const waResult = await sendInvoiceWhatsApp(inv.buyerPhone, inv.toJSON(), ic, pdfPublicUrl);
    await inv.update({
        whatsappStatus: waResult.success ? 'sent' : 'failed',
        whatsappSentAt: waResult.success ? new Date() : null,
        whatsappError: waResult.success ? null : waResult.error
    });

    return { success: waResult.success };
}

/**
 * Sends a test invoice to the admin's own phone.
 * Used by the "Test Invoice" button in AdminSystemControls.
 */
async function sendTestInvoice(adminPhone, ic) {
    const sampleInvoice = {
        invoiceNumber: 'TEST-INV-0001',
        invoiceType: ic.invoiceType || 'tax_invoice',
        invoiceDate: new Date(),
        transactionId: 'test',
        userId: 'test',
        buyerName: 'Test Customer',
        buyerEmail: 'test@example.com',
        buyerPhone: adminPhone,
        buyerCompany: 'Test Company',
        buyerAddress: '123, Test Street, Hyderabad',
        buyerState: 'Telangana',
        buyerStateCode: '36',
        buyerGstin: '36AABCT1234F1Z1',
        buyerPan: '',
        buyerCountry: 'India',
        buyerPincode: '500001',
        sellerName: ic.sellerName || 'Your Company',
        sellerAddress: ic.sellerAddress || '',
        sellerState: ic.sellerState || '',
        sellerStateCode: ic.sellerStateCode || '',
        sellerGstin: ic.sellerGstin || '',
        sellerPan: ic.sellerPan || '',
        sellerCin: ic.sellerCin || '',
        sellerEmail: ic.sellerEmail || '',
        sellerPhone: ic.sellerPhone || '',
        itemDescription: 'Test - Pro Plan Monthly Subscription',
        itemHsnSac: ic.hsnSacCode || '998314',
        quantity: 1,
        unitPrice: 999,
        discountAmount: 0,
        taxableAmount: 999,
        gstRate: ic.defaultGstRate || 18,
        taxScheme: 'cgst_sgst',
        igstAmount: 0,
        cgstAmount: 89.91,
        sgstAmount: 89.91,
        totalTaxAmount: 179.82,
        grandTotal: 1178.82,
        currency: 'INR',
        placeOfSupply: ic.sellerState || 'Telangana',
        reverseCharge: false,
        notes: ic.invoiceNotes || 'This is a test invoice.'
    };

    const pdfBuffer = await generatePdf(sampleInvoice, ic);
    const { pdfPath, filename } = savePdf(pdfBuffer, 'TEST-INV-0001');
    const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const backendUrl = appBaseUrl.replace(':5173', ':5000');
    const pdfPublicUrl = `${backendUrl}/uploads/invoices/${filename}`;

    return await sendInvoiceWhatsApp(adminPhone, sampleInvoice, ic, pdfPublicUrl);
}

module.exports = {
    generateAndDeliverInvoice,
    resendInvoice,
    sendTestInvoice,
    computeGst,         // Exported for unit testing
    generatePdf,        // Exported for custom PDF generation
    savePdf,            // Exported for manual PDF regeneration
    numberToWords       // Exported for use in frontend/preview
};
