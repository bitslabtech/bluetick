const PdfPrinter = require('pdfmake');

const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const getCurrencySymbol = (code) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
    return symbols[(code || '').toUpperCase()] || code || '';
};

const fmt = (num, currency) => `${getCurrencySymbol(currency)} ${parseFloat(num || 0).toFixed(2)}`;

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
            const printer = new PdfPrinter(fonts);
            const tc = storeData.taxConfig || {};
            const currency = storeData.currency || 'INR';
            const currSym = getCurrencySymbol(currency);

            // ── GST Breakdown Logic ──────────────────────────────────────────────────
            const isGst = tc.type === 'gst';
            const taxAmount = parseFloat(orderData.taxAmount || 0);
            const taxRate = parseFloat(orderData.taxRate || 0);

            // Determine CGST/SGST vs IGST based on seller and buyer state
            const sellerState = (tc.sellerState || '').toLowerCase().trim();
            const buyerState = (customerData.state || '').toLowerCase().trim();
            const isInterState = sellerState && buyerState && sellerState !== buyerState;

            let gstRows = [];
            if (isGst && taxAmount > 0) {
                if (isInterState) {
                    gstRows = [
                        [{ text: `IGST (${taxRate}%):`, alignment: 'right', margin: [0, 3] }, { text: fmt(taxAmount, currency), alignment: 'right', margin: [0, 3] }]
                    ];
                } else {
                    const half = taxAmount / 2;
                    const halfRate = taxRate / 2;
                    gstRows = [
                        [{ text: `CGST (${halfRate}%):`, alignment: 'right', margin: [0, 3] }, { text: fmt(half, currency), alignment: 'right', margin: [0, 3] }],
                        [{ text: `SGST (${halfRate}%):`, alignment: 'right', margin: [0, 3] }, { text: fmt(half, currency), alignment: 'right', margin: [0, 3] }]
                    ];
                }
            } else if (taxAmount > 0) {
                gstRows = [
                    [{ text: `${orderData.taxName || 'Tax'} (${taxRate}%):`, alignment: 'right', margin: [0, 3] }, { text: fmt(taxAmount, currency), alignment: 'right', margin: [0, 3] }]
                ];
            }

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
                    { text: '#', bold: true, fillColor: '#1e293b', color: '#fff', margin: [4, 6], alignment: 'center' },
                    { text: 'Item Description', bold: true, fillColor: '#1e293b', color: '#fff', margin: [4, 6] },
                    { text: 'Qty', bold: true, fillColor: '#1e293b', color: '#fff', margin: [4, 6], alignment: 'center' },
                    { text: 'Unit Price', bold: true, fillColor: '#1e293b', color: '#fff', margin: [4, 6], alignment: 'right' },
                    { text: 'Total', bold: true, fillColor: '#1e293b', color: '#fff', margin: [4, 6], alignment: 'right' }
                ],
                // Item rows
                ...orderData.items.map((item, i) => [
                    { text: String(i + 1), margin: [4, 5], alignment: 'center', color: '#6b7280', fontSize: 9 },
                    { text: item.name, margin: [4, 5], fontSize: 9 },
                    { text: String(item.qty || 1), margin: [4, 5], alignment: 'center', fontSize: 9 },
                    { text: `${currSym} ${parseFloat(item.price || 0).toFixed(2)}`, margin: [4, 5], alignment: 'right', fontSize: 9 },
                    { text: `${currSym} ${(parseFloat(item.price || 0) * (item.qty || 1)).toFixed(2)}`, margin: [4, 5], alignment: 'right', fontSize: 9 }
                ])
            ];

            // ── Totals Table ─────────────────────────────────────────────────────────
            const subtotalBeforeDiscount = parseFloat(orderData.originalTotal || orderData.subtotal || 0);
            const discountAmount = parseFloat(orderData.discountAmount || 0);
            const totalAmount = parseFloat(orderData.total || orderData.subtotal || 0);

            const totalsBody = [
                [{ text: 'Subtotal:', alignment: 'right', margin: [0, 4] }, { text: fmt(subtotalBeforeDiscount, currency), alignment: 'right', margin: [0, 4] }],
            ];
            if (discountAmount > 0) {
                totalsBody.push([
                    { text: `Discount${orderData.couponCode ? ` (${orderData.couponCode})` : ''}:`, alignment: 'right', margin: [0, 4], color: '#16a34a' },
                    { text: `- ${fmt(discountAmount, currency)}`, alignment: 'right', margin: [0, 4], color: '#16a34a' }
                ]);
            }
            if (taxAmount === 0) {
                totalsBody.push([
                    { text: 'Tax:', alignment: 'right', margin: [0, 4], color: '#6b7280' },
                    { text: 'N/A', alignment: 'right', margin: [0, 4], color: '#6b7280' }
                ]);
            } else {
                gstRows.forEach(r => totalsBody.push(r));
            }
            totalsBody.push([
                { text: 'Grand Total:', bold: true, fontSize: 13, alignment: 'right', margin: [0, 6], color: '#1e293b' },
                { text: fmt(totalAmount, currency), bold: true, fontSize: 13, alignment: 'right', margin: [0, 6], color: '#4f46e5' }
            ]);

            // ── Doc Definition ───────────────────────────────────────────────────────
            const invoiceType = isGst ? 'TAX INVOICE' : 'INVOICE';

            const docDefinition = {
                pageMargins: [40, 40, 40, 60],
                defaultStyle: { font: 'Helvetica', fontSize: 9 },
                footer: (currentPage, pageCount) => ({
                    text: `Page ${currentPage} of ${pageCount}  |  ${storeData.name}  |  Thank you for your purchase!`,
                    alignment: 'center', color: '#9ca3af', fontSize: 8, margin: [40, 10]
                }),
                content: [
                    // ── Header ──────────────────────────────────────────────────────
                    {
                        columns: [
                            { text: storeData.name, fontSize: 22, bold: true, color: '#1e293b' },
                            { text: invoiceType, fontSize: 20, bold: true, alignment: 'right', color: '#4f46e5' }
                        ],
                        margin: [0, 0, 0, 4]
                    },
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#4f46e5' }], margin: [0, 0, 0, 12] },

                    // ── Seller / Buyer / Invoice Meta ────────────────────────────────
                    {
                        columns: [
                            {
                                stack: [
                                    { text: 'FROM', fontSize: 7, bold: true, color: '#9ca3af', characterSpacing: 1 },
                                    { text: sellerInfo, fontSize: 9, color: '#374151', margin: [0, 3, 0, 0], lineHeight: 1.4 }
                                ],
                                width: '40%'
                            },
                            { width: '5%', text: '' },
                            {
                                stack: [
                                    { text: 'BILL TO', fontSize: 7, bold: true, color: '#9ca3af', characterSpacing: 1 },
                                    { text: buyerInfo, fontSize: 9, color: '#374151', margin: [0, 3, 0, 0], lineHeight: 1.4 }
                                ],
                                width: '30%'
                            },
                            { width: '5%', text: '' },
                            {
                                stack: [
                                    { text: 'INVOICE DETAILS', fontSize: 7, bold: true, color: '#9ca3af', characterSpacing: 1 },
                                    {
                                        table: {
                                            widths: ['auto', '*'],
                                            body: [
                                                [{ text: 'Order No:', bold: true, color: '#374151', margin: [0, 3] }, { text: orderData.orderNumber, color: '#374151', margin: [0, 3] }],
                                                [{ text: 'Date:', bold: true, color: '#374151', margin: [0, 3] }, { text: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), color: '#374151', margin: [0, 3] }],
                                                isGst ? [{ text: 'Type:', bold: true, color: '#374151', margin: [0, 3] }, { text: isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)', color: '#374151', fontSize: 8, margin: [0, 3] }] : ['', '']
                                            ]
                                        },
                                        layout: 'noBorders',
                                        margin: [0, 3, 0, 0]
                                    }
                                ],
                                width: '20%'
                            }
                        ],
                        margin: [0, 0, 0, 16]
                    },

                    // ── Items Table ──────────────────────────────────────────────────
                    {
                        table: {
                            headerRows: 1,
                            widths: [20, '*', 30, 70, 70],
                            body: tableBody
                        },
                        layout: {
                            hLineColor: (i) => i === 0 || i === 1 ? '#1e293b' : '#e5e7eb',
                            vLineColor: () => '#e5e7eb',
                            hLineWidth: (i) => i === 0 || i === 1 ? 1 : 0.5,
                            vLineWidth: () => 0.5,
                        },
                        margin: [0, 0, 0, 16]
                    },

                    // ── Totals ───────────────────────────────────────────────────────
                    {
                        columns: [
                            { text: '', width: '*' },
                            {
                                table: { widths: [130, 80], body: totalsBody },
                                layout: {
                                    hLineColor: (i, node) => i === node.table.body.length - 1 ? '#4f46e5' : '#e5e7eb',
                                    vLineColor: () => 'transparent',
                                    hLineWidth: (i, node) => i === node.table.body.length - 1 ? 1.5 : 0.5,
                                    vLineWidth: () => 0,
                                },
                                width: 'auto'
                            }
                        ],
                        margin: [0, 0, 0, 20]
                    },

                    // ── GST Declaration (for tax invoices) ───────────────────────────
                    ...(isGst && taxAmount > 0 ? [{
                        text: `Tax Amount (in words): ${taxInWords(taxAmount)} Only`,
                        fontSize: 8, color: '#6b7280', italics: true, margin: [0, 0, 0, 16]
                    }] : []),

                    // ── Footer Note ──────────────────────────────────────────────────
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 8] },
                    {
                        columns: [
                            { text: 'This is a computer-generated invoice and does not require a signature.', fontSize: 8, color: '#9ca3af', italics: true },
                            { text: 'Thank you for your business!', fontSize: 8, color: '#4f46e5', bold: true, alignment: 'right' }
                        ]
                    }
                ]
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const fs = require('fs');
            const writeStream = fs.createWriteStream(filePath);
            pdfDoc.pipe(writeStream);
            pdfDoc.end();
            writeStream.on('finish', () => resolve(filePath));
            writeStream.on('error', (err) => reject(err));

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
