const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    const day = dt.getDate().toString().padStart(2, '0');
    const month = dt.toLocaleString('en-IN', { month: 'short' });
    const year = dt.getFullYear();
    return `${day} ${month} ${year}`;
}

function formatCurrency(amount, currency = 'INR') {
    if (currency === 'INR') return `INR ${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    return `${currency} ${parseFloat(amount).toFixed(2)}`;
}

async function generatePdf(inv, ic) {
    const isTaxInvoice = inv.invoiceType === 'tax_invoice';
    const isGstApplicable = isTaxInvoice && inv.taxScheme !== 'none';
    const title = isTaxInvoice ? 'TAX INVOICE' : 'QUOTATION';
    
    // Modern Color Palette
    const PRIMARY = '#2563EB'; // Bright blue
    const TEXT_DARK = '#111827'; // Dark gray
    const TEXT_MUTED = '#6B7280'; // Muted gray
    const BG_LIGHT = '#F3F4F6'; // Light gray background
    const BORDER = '#E5E7EB'; // Very light gray border
    const SUCCESS = '#059669'; // Green

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
                doc.text(inv.sellerName || 'Company', LM, pb, { width: PW / 3, align: 'left', lineBreak: false });
                doc.text(`Invoice ${inv.invoiceNumber || ''}`, LM, pb, { width: PW, align: 'center', lineBreak: false });
                doc.text('Computer generated document.', LM, pb, { width: PW, align: 'right', lineBreak: false });
                doc.restore();
            };

            doc.on('pageAdded', () => { pageNum++; });
            doc.addPage();

            // ── HEADER ────────────────────────────────────────────────────────
            let currentY = 40;

            // Left: Company Name & Info
            doc.font('Helvetica-Bold').fontSize(22).fillColor(PRIMARY).text(inv.sellerName || 'Your Company', LM, currentY);
            currentY += 28;
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED);
            const sellerDetails = [];
            if (inv.sellerAddress) sellerDetails.push(inv.sellerAddress);
            if (inv.sellerState) sellerDetails.push(`${inv.sellerState} (${inv.sellerStateCode || ''})`);
            if (inv.sellerGstin) sellerDetails.push(`GSTIN: ${inv.sellerGstin}`);
            if (inv.sellerPhone) sellerDetails.push(`Phone: ${inv.sellerPhone}`);
            
            doc.text(sellerDetails.join(' | '), LM, currentY, { width: PW * 0.6, align: 'left' });

            // Right: Invoice Title & Meta
            let metaY = 40;
            doc.font('Helvetica-Bold').fontSize(16).fillColor(TEXT_DARK).text(title, LM, metaY, { width: PW, align: 'right' });
            metaY += 22;
            
            const metaRows = [
                ['Invoice No:', inv.invoiceNumber || 'N/A'],
                ['Issue Date:', formatDate(inv.invoiceDate)]
            ];
            if (inv.placeOfSupply) metaRows.push(['Place of Supply:', inv.placeOfSupply]);
            
            metaRows.forEach(([lbl, val]) => {
                doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_MUTED).text(lbl, LM + PW * 0.6, metaY, { width: PW * 0.2, align: 'right', lineBreak: false });
                doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK).text(val, LM + PW * 0.8 + 5, metaY, { width: PW * 0.2 - 5, align: 'right', lineBreak: false });
                metaY += 14;
            });

            currentY = Math.max(currentY + 20, metaY + 10);
            
            doc.save().strokeColor(BORDER).lineWidth(1).moveTo(LM, currentY).lineTo(LM + PW, currentY).stroke().restore();
            currentY += 15;

            // ── BILL TO & PAYMENT INFO ────────────────────────────────────────────────
            
            // Bill To Box (Left)
            const boxW = (PW - 15) / 2;
            doc.save().rect(LM, currentY, boxW, 85).fill(BG_LIGHT).restore();
            doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED).text('BILLED TO', LM + 10, currentY + 10);
            
            doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text(inv.buyerName || 'Customer Name', LM + 10, currentY + 25);
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED);
            let by = currentY + 40;
            if (inv.buyerCompany) { doc.text(inv.buyerCompany, LM + 10, by); by += 12; }
            if (inv.buyerAddress) { doc.text(inv.buyerAddress, LM + 10, by); by += 12; }
            if (inv.buyerGstin) { doc.font('Helvetica-Bold').text(`GSTIN: ${inv.buyerGstin}`, LM + 10, by).font('Helvetica'); by += 12; }

            // Payment Info Box (Right)
            const rightBoxX = LM + boxW + 15;
            doc.save().rect(rightBoxX, currentY, boxW, 85).fill(BG_LIGHT).restore();
            doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_MUTED).text('PAYMENT DETAILS', rightBoxX + 10, currentY + 10);
            
            let py = currentY + 25;
            
            const payMethod = inv.paymentMethod || inv.paymentGateway || (inv.paymentStatus === 'paid' ? 'Online' : 'Pending');
            const txnId = inv.paymentTransactionId || inv.razorpayPaymentId || inv.paymentId || 'N/A';
            const pStatus = inv.paymentStatus === 'paid' ? 'Paid' : 'Pending';
            
            const payRows = [
                ['Status:', pStatus],
                ['Method:', payMethod],
                ['Txn ID:', txnId]
            ];
            payRows.forEach(([l, v]) => {
                doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED).text(l, rightBoxX + 10, py, { width: 60, lineBreak: false });
                doc.font('Helvetica-Bold').fontSize(9).fillColor(pStatus === 'Paid' && l==='Status:' ? SUCCESS : TEXT_DARK).text(v, rightBoxX + 70, py, { width: boxW - 80 });
                py += 14;
            });

            currentY += 105;

            // ── ITEMS TABLE ────────────────────────────────────────────────
            const cols = [
                { t: '#', w: 30, a: 'center' },
                { t: 'Item Description', w: PW - 30 - 60 - 45 - 85 - 85, a: 'left' },
                { t: 'SAC', w: 60, a: 'center' },
                { t: 'Qty', w: 45, a: 'center' },
                { t: 'Price', w: 85, a: 'right' },
                { t: 'Amount', w: 85, a: 'right' }
            ];
            
            // Table Header
            doc.save().rect(LM, currentY, PW, 24).fill(PRIMARY).restore();
            let tx = LM;
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
            cols.forEach(c => {
                doc.text(c.t, tx + 5, currentY + 7, { width: c.w - 10, align: c.a, lineBreak: false });
                tx += c.w;
            });
            currentY += 24;

            // Table Row (Single item for now)
            doc.save().rect(LM, currentY, PW, 28).fill(BG_LIGHT).restore();
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK);
            tx = LM;
            [
                { t: '1', w: cols[0].w, a: 'center' },
                { t: inv.itemDescription || 'Service', w: cols[1].w, a: 'left' },
                { t: inv.itemHsnSac || '-', w: cols[2].w, a: 'center' },
                { t: String(inv.quantity || 1), w: cols[3].w, a: 'center' },
                { t: formatCurrency(inv.unitPrice || 0), w: cols[4].w, a: 'right' },
                { t: formatCurrency(inv.taxableAmount || 0), w: cols[5].w, a: 'right' }
            ].forEach(c => {
                doc.text(c.t, tx + 5, currentY + 8, { width: c.w - 10, align: c.a, lineBreak: false });
                tx += c.w;
            });
            currentY += 28;

            if (inv.discountAmount > 0) {
                doc.font('Helvetica').fontSize(8).fillColor(SUCCESS).text(`Includes Discount: -${formatCurrency(inv.discountAmount)}`, LM + cols[0].w + 5, currentY + 5);
                currentY += 20;
            }
            
            doc.save().strokeColor(BORDER).lineWidth(1).moveTo(LM, currentY).lineTo(LM + PW, currentY).stroke().restore();
            currentY += 15;

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

            addTot('Subtotal:', formatCurrency(inv.taxableAmount));
            if (inv.discountAmount > 0) addTot('Discount:', `-${formatCurrency(inv.discountAmount)}`, false, SUCCESS);
            if (isGstApplicable) addTot('Total Tax:', formatCurrency(inv.totalTaxAmount || (inv.cgstAmount + inv.sgstAmount + inv.igstAmount)));
            
            doc.save().strokeColor(BORDER).lineWidth(1).moveTo(totalX, totY).lineTo(LM+PW, totY).stroke().restore();
            totY += 10;
            addTot('Total Amount:', formatCurrency(inv.grandTotal), true, PRIMARY);
            
            currentY = Math.max(nextY + 60, totY) + 20;
            
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

            drawPageFooter();
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

const mockInv = {
    invoiceNumber: 'INV-MODERN-01', invoiceType: 'tax_invoice', invoiceDate: new Date(),
    buyerName: 'Modern Client Corp', buyerAddress: '123 New Age St, Cyber City', buyerState: 'Karnataka',
    buyerStateCode: '29', buyerGstin: '29ABCDE1234F1Z5',
    sellerName: 'NexGen Technologies', sellerAddress: '456 Tech Park, Indiranagar\nBengaluru',
    sellerState: 'Karnataka', sellerStateCode: '29', sellerGstin: '29SELLER9876P1Z3', sellerEmail: 'billing@nexgen.com', sellerPhone: '+91 9876543210',
    placeOfSupply: 'Karnataka (29)', itemDescription: 'Enterprise SaaS License - Yearly', quantity: 1, unitPrice: 10000,
    discountAmount: 0, taxableAmount: 10000, gstRate: 18, taxScheme: 'cgst_sgst',
    cgstAmount: 900, sgstAmount: 900, igstAmount: 0, totalTaxAmount: 1800,
    grandTotal: 11800, currency: 'INR', reverseCharge: false,
    paymentMethod: 'Credit Card', paymentStatus: 'paid', paymentTransactionId: 'txn_12345ABCDE'
};

const ic = {
    paymentTerms: 'Payment due within 15 days.',
    invoiceNotes: 'Thank you for choosing NexGen Technologies.'
};

generatePdf(mockInv, ic).then(buf => {
    fs.writeFileSync('modern_invoice.pdf', buf);
    console.log('Successfully generated modern_invoice.pdf (' + buf.length + ' bytes)');
}).catch(e => {
    console.error('Error generating PDF:', e);
});
