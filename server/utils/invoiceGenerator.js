const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');

// Define fonts - using Roboto as default (standard for pdfmake)
// In a real prod env, you'd want to point to actual .ttf files in your project.
// For now we'll use the standard fonts built into pdfmake or download standard Roboto.
// We can use standard Base14 fonts if we don't want to mess with TTF files.
const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const generateInvoicePdf = (orderData, storeData, customerData, filePath) => {
    return new Promise((resolve, reject) => {
        try {
            const printer = new PdfPrinter(fonts);
            
            const docDefinition = {
                defaultStyle: {
                    font: 'Helvetica'
                },
                content: [
                    // Header
                    {
                        columns: [
                            {
                                text: storeData.name,
                                fontSize: 24,
                                bold: true,
                                margin: [0, 0, 0, 10]
                            },
                            {
                                text: 'INVOICE',
                                fontSize: 24,
                                bold: true,
                                alignment: 'right',
                                color: '#4f46e5' // Indigo
                            }
                        ]
                    },
                    {
                        columns: [
                            {
                                text: `Store: ${storeData.name}\nEmail: ${storeData.contactEmail || ''}\nPhone: ${storeData.contactPhone || ''}`,
                                fontSize: 10,
                                color: '#4b5563'
                            },
                            {
                                text: `Date: ${new Date().toLocaleDateString()}\nOrder No: ${orderData.orderNumber}`,
                                fontSize: 10,
                                alignment: 'right',
                                color: '#4b5563'
                            }
                        ],
                        margin: [0, 0, 0, 30]
                    },
                    // Customer Details
                    {
                        text: 'BILL TO:',
                        fontSize: 12,
                        bold: true,
                        margin: [0, 0, 0, 5]
                    },
                    {
                        text: `${customerData.name}\nWhatsApp: ${customerData.phone}`,
                        fontSize: 10,
                        margin: [0, 0, 0, 20]
                    },
                    // Items Table
                    {
                        table: {
                            headerRows: 1,
                            widths: ['*', 'auto', 'auto', 'auto'],
                            body: [
                                // Table Header
                                [
                                    { text: 'Item Description', bold: true, fillColor: '#f3f4f6', margin: [5, 5] },
                                    { text: 'Price', bold: true, fillColor: '#f3f4f6', margin: [5, 5], alignment: 'right' },
                                    { text: 'Qty', bold: true, fillColor: '#f3f4f6', margin: [5, 5], alignment: 'center' },
                                    { text: 'Total', bold: true, fillColor: '#f3f4f6', margin: [5, 5], alignment: 'right' }
                                ],
                                // Items
                                ...orderData.items.map(item => [
                                    { text: item.name, margin: [5, 5] },
                                    { text: `${storeData.currency} ${parseFloat(item.price).toFixed(2)}`, margin: [5, 5], alignment: 'right' },
                                    { text: item.qty.toString(), margin: [5, 5], alignment: 'center' },
                                    { text: `${storeData.currency} ${(parseFloat(item.price) * item.qty).toFixed(2)}`, margin: [5, 5], alignment: 'right' }
                                ])
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    },
                    // Totals
                    {
                        columns: [
                            { text: '' },
                            {
                                table: {
                                    widths: ['*', 'auto'],
                                    body: [
                                        [
                                            { text: 'Subtotal:', margin: [0, 5], alignment: 'right' },
                                            { text: `${storeData.currency} ${orderData.subtotal.toFixed(2)}`, margin: [0, 5], alignment: 'right' }
                                        ],
                                        [
                                            { text: `${orderData.taxName || 'Tax'} (${orderData.taxRate || 0}%):`, margin: [0, 5], alignment: 'right' },
                                            { text: `${storeData.currency} ${orderData.taxAmount.toFixed(2)}`, margin: [0, 5], alignment: 'right' }
                                        ],
                                        [
                                            { text: 'Total Amount:', bold: true, fontSize: 14, margin: [0, 5], alignment: 'right' },
                                            { text: `${storeData.currency} ${orderData.total.toFixed(2)}`, bold: true, fontSize: 14, margin: [0, 5], alignment: 'right', color: '#4f46e5' }
                                        ]
                                    ]
                                },
                                layout: 'noBorders'
                            }
                        ]
                    },
                    // Footer
                    {
                        text: 'Thank you for your business!',
                        alignment: 'center',
                        fontSize: 10,
                        color: '#9ca3af',
                        margin: [0, 50, 0, 0]
                    }
                ]
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);
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

module.exports = { generateInvoicePdf };
