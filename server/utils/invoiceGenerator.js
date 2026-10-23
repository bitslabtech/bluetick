const pdfMake = require('pdfmake');

pdfMake.setUrlAccessPolicy(() => true);
pdfMake.setLocalAccessPolicy(() => true);
pdfMake.addFonts({
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
});

const getCurrencySymbol = (code) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
    return symbols[(code || '').toUpperCase()] || code || '';
};

const fmt = (num, currency) => `${getCurrencySymbol(currency)} ${parseFloat(num || 0).toFixed(2)}`;

/**
 * Computes GST tax analysis grouped by slab rate.
 * Handles inclusive/exclusive tax, proportional coupon discount, and intra vs inter-state tax splits.
 */
function computeGstBreakdown(items, tc, discountAmount, orderTaxRate, orderTaxAmount, isInterState) {
    const isInclusive = !!tc.taxInclusive;
    let totalGross = 0;

    const processedItems = (items || []).map(item => {
        const qty = parseInt(item.qty) || 1;
        const price = parseFloat(item.price) || 0;
        const gross = price * qty;
        totalGross += gross;

        let rate = 0;
        if (item.taxRate !== null && item.taxRate !== undefined && item.taxRate !== '' && !isNaN(parseFloat(item.taxRate))) {
            rate = parseFloat(item.taxRate);
        } else if (orderTaxRate !== null && orderTaxRate !== undefined && orderTaxRate !== '' && !isNaN(parseFloat(orderTaxRate))) {
            rate = parseFloat(orderTaxRate);
        } else if (tc.rate !== null && tc.rate !== undefined && tc.rate !== '' && !isNaN(parseFloat(tc.rate))) {
            rate = parseFloat(tc.rate);
        }
        return { item, qty, price, gross, rate };
    });

    const discAmt = parseFloat(discountAmount) || 0;
    const discountRatio = (totalGross > 0 && discAmt > 0) ? Math.min(1, discAmt / totalGross) : 0;

    const slabMap = {};

    processedItems.forEach(({ gross, rate }) => {
        let taxable = 0;
        let tax = 0;
        if (isInclusive) {
            taxable = gross / (1 + rate / 100);
            tax = gross - taxable;
        } else {
            taxable = gross;
            tax = gross * (rate / 100);
        }

        if (discountRatio > 0) {
            taxable = taxable * (1 - discountRatio);
            tax = tax * (1 - discountRatio);
        }

        const rateKey = rate.toFixed(2);
        if (!slabMap[rateKey]) {
            slabMap[rateKey] = {
                rate,
                rateKey,
                taxableAmount: 0,
                taxAmount: 0
            };
        }
        slabMap[rateKey].taxableAmount += taxable;
        slabMap[rateKey].taxAmount += tax;
    });

    let slabs = Object.values(slabMap).sort((a, b) => a.rate - b.rate).map(s => {
        let cgst = 0, sgst = 0, igst = 0;
        if (isInterState) {
            igst = s.taxAmount;
        } else {
            cgst = s.taxAmount / 2;
            sgst = s.taxAmount / 2;
        }
        return {
            rate: s.rate,
            rateStr: `${s.rate}%`,
            taxableAmount: s.taxableAmount,
            taxAmount: s.taxAmount,
            cgst,
            sgst,
            igst
        };
    });

    // Fallback if no item had rate recorded but order had positive taxAmount
    if ((slabs.length === 0 || slabs.every(s => s.taxAmount === 0)) && parseFloat(orderTaxAmount) > 0) {
        const rate = parseFloat(orderTaxRate) || 0;
        const taxAmt = parseFloat(orderTaxAmount) || 0;
        const taxable = isInclusive ? (totalGross > 0 ? Math.max(0, totalGross - taxAmt) : 0) : (rate > 0 ? (taxAmt / (rate / 100)) : totalGross);
        const cgst = isInterState ? 0 : taxAmt / 2;
        const sgst = isInterState ? 0 : taxAmt / 2;
        const igst = isInterState ? taxAmt : 0;
        slabs = [{
            rate,
            rateStr: `${rate}%`,
            taxableAmount: taxable,
            taxAmount: taxAmt,
            cgst,
            sgst,
            igst
        }];
    }

    const totalTaxable = slabs.reduce((sum, s) => sum + s.taxableAmount, 0);
    const totalTax = slabs.reduce((sum, s) => sum + s.taxAmount, 0);
    const totalCgst = slabs.reduce((sum, s) => sum + s.cgst, 0);
    const totalSgst = slabs.reduce((sum, s) => sum + s.sgst, 0);
    const totalIgst = slabs.reduce((sum, s) => sum + s.igst, 0);

    return {
        slabs,
        totalTaxable,
        totalTax,
        totalCgst,
        totalSgst,
        totalIgst
    };
}

/**
 * Generates a GST-compliant store order invoice PDF.
 *
 * @param {object} orderData  - { orderNumber, items, subtotal, taxAmount, taxRate, taxName, total, discountAmount, couponCode }
 * @param {object} storeData  - { name, currency, contactEmail, contactPhone, taxConfig: { sellerLegalName, sellerGstin, sellerPan, sellerAddress, sellerState, sellerStateCode, type } }
 * @param {object} customerData - { name, phone, address, company, gstin }
 * @param {string} filePath   - Absolute path to write the PDF to
 */
const generateInvoicePdf = (orderData, storeData, customerData, filePath) => {
    return new Promise((resolve, reject) => {
        try {
            const tc = storeData.taxConfig || {};
            const currency = storeData.currency || 'INR';
            const currSym = getCurrencySymbol(currency);

            // ── GST Multi-Slab Calculation ───────────────────────────────────────────
            const isGst = tc.type === 'gst';

            // Determine CGST/SGST vs IGST based on seller and buyer state
            const sellerState = (tc.sellerState || '').toLowerCase().trim();
            let buyerState = (customerData.state || '').toLowerCase().trim();
            if (!buyerState && customerData.address) {
                const beforePincode = customerData.address.split(' - ')[0];
                const parts = beforePincode.split(',');
                buyerState = (parts[parts.length - 1]?.trim() || '').toLowerCase();
            }
            const isInterState = isGst && Boolean(sellerState && buyerState && sellerState !== buyerState);

            const gstAnalysis = computeGstBreakdown(
                orderData.items,
                tc,
                orderData.discountAmount,
                orderData.taxRate,
                orderData.taxAmount,
                isInterState
            );

            const finalTotalTax = (gstAnalysis && gstAnalysis.totalTax > 0)
                ? gstAnalysis.totalTax
                : parseFloat(orderData.taxAmount || 0);

            // ── Seller Info Block ────────────────────────────────────────────────────
            const sellerName = tc.sellerLegalName || storeData.name;
            let sellerInfo = sellerName;
            if (tc.sellerAddress) sellerInfo += `\n${tc.sellerAddress}`;
            if (tc.sellerState) sellerInfo += `\n${tc.sellerState}${tc.sellerStateCode ? ' - ' + tc.sellerStateCode : ''}`;
            if (tc.sellerGstin) sellerInfo += `\nGSTIN: ${tc.sellerGstin}`;
            if (tc.sellerPan) sellerInfo += `\nPAN: ${tc.sellerPan}`;
            if (storeData.contactEmail) sellerInfo += `\nEmail: ${storeData.contactEmail}`;
            if (storeData.contactPhone) sellerInfo += `\nPhone: ${storeData.contactPhone}`;

            // ── Buyer Info Block ─────────────────────────────────────────────────────
            let buyerInfo = customerData.name || '';
            if (customerData.company) buyerInfo += `\n${customerData.company}`;
            if (customerData.address) buyerInfo += `\n${customerData.address}`;
            if (customerData.gstin) buyerInfo += `\nGSTIN: ${customerData.gstin}`;
            if (customerData.phone) buyerInfo += `\nPhone: ${customerData.phone}`;

            // ── Items Table ──────────────────────────────────────────────────────────
            const tableBody = [
                // Header Row
                [
                    { text: '#', bold: true, fillColor: '#1e293b', color: '#fff', margin: [2, 3], alignment: 'center', fontSize: 7.5 },
                    { text: 'Item Description', bold: true, fillColor: '#1e293b', color: '#fff', margin: [3, 3], fontSize: 7.5 },
                    { text: isGst ? 'GST %' : 'Tax %', bold: true, fillColor: '#1e293b', color: '#fff', margin: [2, 3], alignment: 'center', fontSize: 7.5 },
                    { text: 'Qty', bold: true, fillColor: '#1e293b', color: '#fff', margin: [2, 3], alignment: 'center', fontSize: 7.5 },
                    { text: 'Unit Price', bold: true, fillColor: '#1e293b', color: '#fff', margin: [3, 3], alignment: 'right', fontSize: 7.5 },
                    { text: 'Total', bold: true, fillColor: '#1e293b', color: '#fff', margin: [3, 3], alignment: 'right', fontSize: 7.5 }
                ],
                // Item rows
                ...orderData.items.map((item, i) => {
                    const itemRate = (item.taxRate !== null && item.taxRate !== undefined && item.taxRate !== '' && !isNaN(parseFloat(item.taxRate)))
                        ? parseFloat(item.taxRate)
                        : (parseFloat(orderData.taxRate) || parseFloat(tc.rate) || 0);

                    let itemVariants = '';
                    if (item.selectedVariants && typeof item.selectedVariants === 'object') {
                        itemVariants = Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' | ');
                    }

                    return [
                        { text: String(i + 1), margin: [2, 2], alignment: 'center', color: '#6b7280', fontSize: 7.5 },
                        {
                            stack: [
                                { text: item.name, fontSize: 7.5, bold: true, color: '#1e293b' },
                                ...(itemVariants ? [{ text: itemVariants, fontSize: 6.8, color: '#64748b', italics: true, margin: [0, 0.5, 0, 0] }] : [])
                            ],
                            margin: [3, 2]
                        },
                        { text: `${itemRate}%`, margin: [2, 2], alignment: 'center', fontSize: 7.5, color: '#0f172a' },
                        { text: String(item.qty || 1), margin: [2, 2], alignment: 'center', fontSize: 7.5 },
                        { text: `${currSym} ${parseFloat(item.price || 0).toFixed(2)}`, margin: [3, 2], alignment: 'right', fontSize: 7.5 },
                        { text: `${currSym} ${(parseFloat(item.price || 0) * (item.qty || 1)).toFixed(2)}`, margin: [3, 2], alignment: 'right', fontSize: 7.5 }
                    ];
                })
            ];

            // ── GST Analysis / Breakdown Table (Bottom Left) ────────────────────────
            let gstBreakdownTableBody = [];
            if (isInterState) {
                gstBreakdownTableBody.push([
                    { text: 'GST Rate', fontSize: 6.5, bold: true, alignment: 'center', margin: [1, 2], color: '#334155' },
                    { text: 'Taxable Val', fontSize: 6.5, bold: true, alignment: 'right', margin: [1, 2], color: '#334155' },
                    { text: 'IGST Amt', fontSize: 6.5, bold: true, alignment: 'right', margin: [1, 2], color: '#334155' },
                    { text: 'Total Tax', fontSize: 6.5, bold: true, alignment: 'right', margin: [1, 2], color: '#334155' }
                ]);
                gstAnalysis.slabs.forEach(slab => {
                    gstBreakdownTableBody.push([
                        { text: slab.rateStr, fontSize: 7, alignment: 'center', margin: [1, 1.8], color: '#0f172a' },
                        { text: fmt(slab.taxableAmount, currency), fontSize: 7, alignment: 'right', margin: [1, 1.8], color: '#0f172a' },
                        { text: fmt(slab.igst, currency), fontSize: 7, alignment: 'right', margin: [1, 1.8], color: '#475569' },
                        { text: fmt(slab.taxAmount, currency), fontSize: 7, bold: true, alignment: 'right', margin: [1, 1.8], color: '#0f172a' }
                    ]);
                });
                gstBreakdownTableBody.push([
                    { text: 'Total', fontSize: 7, bold: true, alignment: 'center', margin: [1, 2], color: '#0f172a' },
                    { text: fmt(gstAnalysis.totalTaxable, currency), fontSize: 7, bold: true, alignment: 'right', margin: [1, 2], color: '#0f172a' },
                    { text: fmt(gstAnalysis.totalIgst, currency), fontSize: 7, bold: true, alignment: 'right', margin: [1, 2], color: '#0f172a' },
                    { text: fmt(gstAnalysis.totalTax, currency), fontSize: 7, bold: true, alignment: 'right', margin: [1, 2], color: '#4f46e5' }
                ]);
            } else {
                gstBreakdownTableBody.push([
                    { text: 'GST Rate', fontSize: 6.5, bold: true, alignment: 'center', margin: [1, 2], color: '#334155' },
                    { text: 'Taxable Val', fontSize: 6.5, bold: true, alignment: 'right', margin: [1, 2], color: '#334155' },
                    { text: 'CGST', fontSize: 6.5, bold: true, alignment: 'right', margin: [1, 2], color: '#334155' },
                    { text: 'SGST', fontSize: 6.5, bold: true, alignment: 'right', margin: [1, 2], color: '#334155' },
                    { text: 'Total Tax', fontSize: 6.5, bold: true, alignment: 'right', margin: [1, 2], color: '#334155' }
                ]);
                gstAnalysis.slabs.forEach(slab => {
                    gstBreakdownTableBody.push([
                        { text: slab.rateStr, fontSize: 7, alignment: 'center', margin: [1, 1.8], color: '#0f172a' },
                        { text: fmt(slab.taxableAmount, currency), fontSize: 7, alignment: 'right', margin: [1, 1.8], color: '#0f172a' },
                        { text: fmt(slab.cgst, currency), fontSize: 7, alignment: 'right', margin: [1, 1.8], color: '#475569' },
                        { text: fmt(slab.sgst, currency), fontSize: 7, alignment: 'right', margin: [1, 1.8], color: '#475569' },
                        { text: fmt(slab.taxAmount, currency), fontSize: 7, bold: true, alignment: 'right', margin: [1, 1.8], color: '#0f172a' }
                    ]);
                });
                gstBreakdownTableBody.push([
                    { text: 'Total', fontSize: 7, bold: true, alignment: 'center', margin: [1, 2], color: '#0f172a' },
                    { text: fmt(gstAnalysis.totalTaxable, currency), fontSize: 7, bold: true, alignment: 'right', margin: [1, 2], color: '#0f172a' },
                    { text: fmt(gstAnalysis.totalCgst, currency), fontSize: 7, bold: true, alignment: 'right', margin: [1, 2], color: '#0f172a' },
                    { text: fmt(gstAnalysis.totalSgst, currency), fontSize: 7, bold: true, alignment: 'right', margin: [1, 2], color: '#0f172a' },
                    { text: fmt(gstAnalysis.totalTax, currency), fontSize: 7, bold: true, alignment: 'right', margin: [1, 2], color: '#4f46e5' }
                ]);
            }

            // ── Totals Table (Bottom Right) ──────────────────────────────────────────
            const subtotalBeforeDiscount = parseFloat(orderData.originalTotal || orderData.subtotal || 0);
            const discountAmount = parseFloat(orderData.discountAmount || 0);
            const shippingCost = parseFloat(orderData.shippingCost || 0);
            const totalAmount = parseFloat(orderData.total || orderData.subtotal || 0);

            const totalsBody = [
                [
                    { text: tc.taxInclusive ? 'Subtotal (Incl. Tax):' : 'Subtotal:', alignment: 'right', margin: [0, 1.8], fontSize: 7.5 },
                    { text: fmt(subtotalBeforeDiscount, currency), alignment: 'right', margin: [0, 1.8], fontSize: 7.5 }
                ],
            ];
            if (discountAmount > 0) {
                totalsBody.push([
                    { text: `Discount${orderData.couponCode ? ` (${orderData.couponCode})` : ''}:`, alignment: 'right', margin: [0, 1.8], color: '#16a34a', fontSize: 7.5 },
                    { text: `- ${fmt(discountAmount, currency)}`, alignment: 'right', margin: [0, 1.8], color: '#16a34a', fontSize: 7.5 }
                ]);
            }
            if (finalTotalTax > 0) {
                totalsBody.push([
                    {
                        text: isGst
                            ? (tc.taxInclusive ? 'Total GST (Included):' : 'Total GST:')
                            : (tc.taxInclusive ? `${orderData.taxName || 'Tax'} (Included):` : `${orderData.taxName || 'Tax'}:`),
                        alignment: 'right',
                        margin: [0, 1.8],
                        bold: true,
                        color: '#1e293b',
                        fontSize: 7.5
                    },
                    {
                        text: fmt(finalTotalTax, currency),
                        alignment: 'right',
                        margin: [0, 1.8],
                        bold: true,
                        color: '#1e293b',
                        fontSize: 7.5
                    }
                ]);
            } else {
                totalsBody.push([
                    { text: 'Tax:', alignment: 'right', margin: [0, 1.8], color: '#6b7280', fontSize: 7.5 },
                    { text: 'N/A', alignment: 'right', margin: [0, 1.8], color: '#6b7280', fontSize: 7.5 }
                ]);
            }
            if (shippingCost > 0) {
                totalsBody.push([
                    { text: 'Shipping:', alignment: 'right', margin: [0, 1.8], color: '#6b7280', fontSize: 7.5 },
                    { text: fmt(shippingCost, currency), alignment: 'right', margin: [0, 1.8], color: '#6b7280', fontSize: 7.5 }
                ]);
            }
            totalsBody.push([
                { text: 'Grand Total:', bold: true, fontSize: 9.5, alignment: 'right', margin: [0, 3], color: '#1e293b' },
                { text: fmt(totalAmount, currency), bold: true, fontSize: 9.5, alignment: 'right', margin: [0, 3], color: '#4f46e5' }
            ]);

            // ── Doc Definition ───────────────────────────────────────────────────────
            const invoiceType = isGst ? 'TAX INVOICE' : 'INVOICE';

            const docDefinition = {
                pageMargins: [36, 26, 36, 30],
                defaultStyle: { font: 'Helvetica', fontSize: 8 },
                footer: (currentPage, pageCount) => ({
                    columns: [
                        { text: `Page ${currentPage} of ${pageCount}  |  ${storeData.name}`, fontSize: 7, color: '#9ca3af' },
                        { text: 'This is a computer-generated invoice and does not require a signature.', fontSize: 7, color: '#9ca3af', italics: true, alignment: 'right' }
                    ],
                    margin: [36, 8, 36, 0]
                }),
                content: [
                    // ── Header (Store / Seller Info & Invoice Details) ──────────────
                    {
                        columns: [
                            {
                                stack: [
                                    { text: sellerName, fontSize: 13, bold: true, color: '#1e293b' },
                                    ...(tc.sellerLegalName && tc.sellerLegalName !== storeData.name ? [{ text: `(${storeData.name})`, fontSize: 7.5, color: '#64748b', margin: [0, 0.5, 0, 0] }] : []),
                                    ...(tc.sellerAddress ? [{ text: tc.sellerAddress, fontSize: 7.5, color: '#475569', margin: [0, 1, 0, 0] }] : []),
                                    ...((tc.sellerState || tc.sellerStateCode) ? [{ text: `${tc.sellerState || ''}${tc.sellerStateCode ? ' (State Code: ' + tc.sellerStateCode + ')' : ''}`, fontSize: 7.5, color: '#475569', margin: [0, 0.5, 0, 0] }] : []),
                                    ...(tc.sellerGstin ? [{ text: `GSTIN: ${tc.sellerGstin}${tc.sellerPan ? '  |  PAN: ' + tc.sellerPan : ''}`, fontSize: 7.5, bold: true, color: '#1e293b', margin: [0, 1, 0, 0] }] : (tc.sellerPan ? [{ text: `PAN: ${tc.sellerPan}`, fontSize: 7.5, bold: true, color: '#1e293b', margin: [0, 1, 0, 0] }] : [])),
                                    ...((storeData.contactEmail || storeData.contactPhone) ? [{ text: `${storeData.contactEmail ? 'Email: ' + storeData.contactEmail : ''}${storeData.contactEmail && storeData.contactPhone ? '  |  ' : ''}${storeData.contactPhone ? 'Phone: ' + storeData.contactPhone : ''}`, fontSize: 7.5, color: '#64748b', margin: [0, 0.5, 0, 0] }] : [])
                                ],
                                width: '58%'
                            },
                            {
                                stack: [
                                    { text: invoiceType, fontSize: 15, bold: true, alignment: 'right', color: '#4f46e5' },
                                    ...(isGst ? [{ text: 'ORIGINAL FOR RECIPIENT', fontSize: 6.5, bold: true, alignment: 'right', color: '#94a3b8', characterSpacing: 1, margin: [0, 0.5, 0, 0] }] : []),
                                    {
                                        table: {
                                            widths: ['auto', '*'],
                                            body: [
                                                [{ text: 'Order No:', bold: true, fontSize: 7.5, color: '#334155', margin: [0, 1] }, { text: orderData.orderNumber, bold: true, fontSize: 7.5, color: '#0f172a', alignment: 'right', margin: [0, 1] }],
                                                [{ text: 'Date:', bold: true, fontSize: 7.5, color: '#334155', margin: [0, 1] }, { text: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), fontSize: 7.5, color: '#334155', alignment: 'right', margin: [0, 1] }],
                                                ...(isGst ? [[{ text: 'Place of Supply:', bold: true, fontSize: 7.5, color: '#334155', margin: [0, 1] }, { text: customerData.state || tc.sellerState || 'N/A', fontSize: 7.5, color: '#334155', alignment: 'right', margin: [0, 1] }]] : []),
                                                ...(isGst ? [[{ text: 'Tax Type:', bold: true, fontSize: 7.5, color: '#334155', margin: [0, 1] }, { text: isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)', fontSize: 7, bold: true, color: '#4f46e5', alignment: 'right', margin: [0, 1] }]] : [])
                                            ]
                                        },
                                        layout: 'noBorders',
                                        margin: [0, 2, 0, 0]
                                    }
                                ],
                                width: '42%'
                            }
                        ],
                        margin: [0, 0, 0, 5]
                    },
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 1, lineColor: '#4f46e5' }], margin: [0, 0, 0, 6] },

                    // ── Buyer / Bill To Section ──────────────────────────────────────
                    {
                        columns: [
                            {
                                stack: [
                                    { text: 'BILL TO (BUYER DETAILS)', fontSize: 7, bold: true, color: '#6366f1', characterSpacing: 1 },
                                    { text: customerData.name || 'Customer', fontSize: 8.5, bold: true, color: '#0f172a', margin: [0, 1, 0, 0] },
                                    ...(customerData.company ? [{ text: customerData.company, fontSize: 7.5, bold: true, color: '#334155', margin: [0, 0.5, 0, 0] }] : []),
                                    ...(customerData.address ? [{ text: customerData.address, fontSize: 7.5, color: '#475569', margin: [0, 1, 0, 0], lineHeight: 1.2 }] : []),
                                    ...(customerData.gstin ? [{ text: `GSTIN: ${customerData.gstin}`, fontSize: 7.5, bold: true, color: '#0f172a', margin: [0, 1, 0, 0] }] : []),
                                    ...((customerData.phone || customerData.email) ? [{ text: `${customerData.phone ? 'Phone: ' + customerData.phone : ''}${customerData.phone && customerData.email ? '  |  ' : ''}${customerData.email ? 'Email: ' + customerData.email : ''}`, fontSize: 7.5, color: '#64748b', margin: [0, 0.5, 0, 0] }] : [])
                                ],
                                width: customerData.address ? '55%' : '100%'
                            },
                            ...(customerData.address ? [
                                {
                                    stack: [
                                        { text: 'SHIP TO (DELIVERY ADDRESS)', fontSize: 7, bold: true, color: '#6366f1', characterSpacing: 1 },
                                        { text: customerData.name || '', fontSize: 8.5, bold: true, color: '#0f172a', margin: [0, 1, 0, 0] },
                                        { text: customerData.address, fontSize: 7.5, color: '#475569', margin: [0, 1, 0, 0], lineHeight: 1.2 },
                                        ...(customerData.phone ? [{ text: `Contact: ${customerData.phone}`, fontSize: 7.5, color: '#64748b', margin: [0, 0.5, 0, 0] }] : [])
                                    ],
                                    width: '45%'
                                }
                            ] : [])
                        ],
                        margin: [0, 0, 0, 6]
                    },

                    // ── Items Table ──────────────────────────────────────────────────
                    {
                        table: {
                            headerRows: 1,
                            dontBreakRows: true,
                            keepWithHeaderRows: 1,
                            widths: [16, '*', 34, 24, 58, 58],
                            body: tableBody
                        },
                        layout: {
                            hLineColor: (i) => i === 0 || i === 1 ? '#1e293b' : '#e5e7eb',
                            vLineColor: () => '#f1f5f9',
                            hLineWidth: (i) => i === 0 || i === 1 ? 1 : 0.5,
                            vLineWidth: () => 0.5,
                            paddingLeft: () => 3,
                            paddingRight: () => 3,
                            paddingTop: (i) => (i === 0 ? 3 : 2),
                            paddingBottom: (i) => (i === 0 ? 3 : 2)
                        },
                        margin: [0, 0, 0, 6]
                    },

                    // ── Bottom Section: GST Breakdown on Left, Summary on Right ──────
                    {
                        unbreakable: true,
                        stack: [
                            {
                                columns: [
                                    ...(isGst && gstAnalysis.slabs.length > 0 ? [
                                        {
                                            stack: [
                                                { text: 'TAX ANALYSIS / GST BREAKDOWN', fontSize: 7, bold: true, color: '#4f46e5', margin: [0, 0, 0, 2] },
                                                {
                                                    table: {
                                                        headerRows: 1,
                                                        dontBreakRows: true,
                                                        widths: isInterState ? [40, 72, 72, 72] : [30, 58, 48, 48, 56],
                                                        body: gstBreakdownTableBody
                                                    },
                                                    layout: {
                                                        hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length - 1 || i === node.table.body.length) ? '#94a3b8' : '#e2e8f0',
                                                        vLineColor: () => '#e2e8f0',
                                                        hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length - 1) ? 1 : 0.5,
                                                        vLineWidth: () => 0.5,
                                                        paddingLeft: () => 2.5,
                                                        paddingRight: () => 2.5,
                                                        paddingTop: () => 1.8,
                                                        paddingBottom: () => 1.8,
                                                        fillColor: (i, node) => {
                                                            if (i === 0) return '#f8fafc';
                                                            if (i === node.table.body.length - 1) return '#f1f5f9';
                                                            return null;
                                                        }
                                                    }
                                                }
                                            ],
                                            width: '58%'
                                        }
                                    ] : [
                                        { text: '', width: '58%' }
                                    ]),
                                    {
                                        table: { widths: [95, 75], body: totalsBody },
                                        layout: {
                                            hLineColor: (i, node) => i === node.table.body.length - 1 ? '#4f46e5' : '#e5e7eb',
                                            vLineColor: () => 'transparent',
                                            hLineWidth: (i, node) => i === node.table.body.length - 1 ? 1.5 : 0.5,
                                            vLineWidth: () => 0,
                                            paddingLeft: () => 2,
                                            paddingRight: () => 2,
                                            paddingTop: () => 1.8,
                                            paddingBottom: () => 1.8
                                        },
                                        width: '42%'
                                    }
                                ],
                                margin: [0, 0, 0, 5]
                            },

                            // ── GST Declaration & In Words ────────────────────────────────────
                            ...(finalTotalTax > 0 ? [{
                                stack: [
                                    { text: `Amount Chargeable (in words): ${taxInWords(totalAmount)} Only`, fontSize: 7.5, color: '#334155', bold: true, margin: [0, 0, 0, 1] },
                                    { text: `Tax Amount (in words): ${taxInWords(finalTotalTax)} Only`, fontSize: 7, color: '#64748b', italics: true, margin: [0, 0, 0, 4] }
                                ]
                            }] : [{
                                text: `Amount Chargeable (in words): ${taxInWords(totalAmount)} Only`, fontSize: 7.5, color: '#334155', bold: true, margin: [0, 0, 0, 4]
                            }]),

                            // ── Footer Note ──────────────────────────────────────────────────
                            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 4] },
                            {
                                columns: [
                                    { text: 'This is a computer-generated invoice and does not require a signature.', fontSize: 7, color: '#9ca3af', italics: true },
                                    { text: 'Thank you for your business!', fontSize: 7, color: '#4f46e5', bold: true, alignment: 'right' }
                                ]
                            }
                        ]
                    }
                ]
            };

            const doc = pdfMake.createPdf(docDefinition);
            doc.write(filePath)
                .then(() => resolve(filePath))
                .catch(err => reject(err));

        } catch (error) {
            reject(error);
        }
    });
};

// Simple tax amount to words (Indian number system)
function taxInWords(amount) {
    const n = Math.round(amount);
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (n === 0) return 'Zero';
    const toWords = (num) => {
        if (num < 20) return ones[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + toWords(num % 100) : '');
        if (num < 100000) return toWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + toWords(num % 1000) : '');
        if (num < 10000000) return toWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + toWords(num % 100000) : '');
        return toWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + toWords(num % 10000000) : '');
    };
    return `Rupees ${toWords(n)}`;
}

module.exports = { generateInvoicePdf };
