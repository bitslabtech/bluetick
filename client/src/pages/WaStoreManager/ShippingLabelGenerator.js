import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

// ─── Helpers: Currency & Formatting ──────────────────────────────────────────
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'AED', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
export const getCurrencySymbol = (code) => CURRENCY_SYMBOLS[code || 'INR'] || code || '₹';

export function formatLabelDate(dateStr) {
    if (!dateStr) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const d = new Date(dateStr);
    return isNaN(d.getTime()) 
        ? String(dateStr) 
        : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Helper: Extract PIN / Postal Code from Address ───────────────────────────
export function extractPostalCode(address) {
    if (!address) return '';
    // Look for 6-digit Indian PIN (e.g. 560001) or 5-digit US ZIP (e.g. 90210) or alphanumeric postal codes
    const match6 = address.match(/\b([1-9][0-9]{5})\b/);
    if (match6) return match6[1];
    const match5 = address.match(/\b([0-9]{5}(?:-[0-9]{4})?)\b/);
    if (match5) return match5[1];
    const matchUk = address.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})\b/i);
    if (matchUk) return matchUk[1].toUpperCase();
    return '';
}

// ─── Image Loader with CORS & Blob Fallback ───────────────────────────────────
export async function loadStoreLogoDataUrl(rawUrl) {
    if (!rawUrl) return null;
    let resolvedUrl = rawUrl;
    if (!rawUrl.startsWith('http') && !rawUrl.startsWith('data:')) {
        const base = import.meta.env.VITE_API_URL || '';
        resolvedUrl = `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    }

    // Attempt 1: Direct Canvas via Image element with crossOrigin
    try {
        const res = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve({ dataUrl, width: canvas.width, height: canvas.height });
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = resolvedUrl;
        });
        if (res && res.dataUrl) return res;
    } catch {
        // Continue to fallback
    }

    // Attempt 2: Fetch Blob & FileReader
    try {
        const response = await fetch(resolvedUrl);
        const blob = await response.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        dataUrl: reader.result,
                        width: img.naturalWidth || 100,
                        height: img.naturalHeight || 100
                    });
                };
                img.onerror = () => resolve({ dataUrl: reader.result, width: 100, height: 100 });
                img.src = reader.result;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

// ─── Barcode Generator (Code 128) ─────────────────────────────────────────────
export function generateBarcodeDataUrl(text, options = {}) {
    if (!text) return null;
    try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, String(text).toUpperCase().trim(), {
            format: 'CODE128',
            lineColor: '#000000',
            width: 2.2,
            height: 48,
            displayValue: true,
            fontSize: 12,
            font: 'Helvetica',
            textMargin: 3,
            margin: 2,
            background: '#ffffff',
            ...options
        });
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.warn('Barcode generation error:', e);
        return null;
    }
}

// ─── QR Code Generator ────────────────────────────────────────────────────────
export async function generateQrCodeDataUrl(text, options = {}) {
    if (!text) return null;
    try {
        return await QRCode.toDataURL(text, {
            width: 220,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'M',
            ...options
        });
    } catch (e) {
        console.warn('QR code generation error:', e);
        return null;
    }
}

// ─── Core Shipping Label PDF Generator ────────────────────────────────────────
/**
 * Generates an advanced e-commerce shipping label document.
 * @param {Object} params
 * @param {Object} params.order - The order object
 * @param {Object} params.store - The store object
 * @param {Object} params.options - Custom options (format: 'portrait_4x6' | 'landscape_6x4', includeItems: boolean, trackingProvider: string, trackingNumber: string)
 */
export async function generateShippingLabelPdf({ order, store, options = {} }) {
    const isLandscape = options.format === 'landscape_a5';
    const includeItems = options.includeItems !== false;
    const currency = getCurrencySymbol(store?.currency || order.currency);
    const paymentType = options.paymentType || 'prepaid';
    const payableAmount = options.payableAmount || 0;
    const cautionText = options.cautionText || 'none';
    const isCod = paymentType === 'cod';

    // 1. Initialize Document (A5 size)
    const doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a5'
    });

    // 2. Fetch Assets (Logo, QR)
    const logoAsset = await loadStoreLogoDataUrl(store?.logo);
    const qrTargetUrl = order.trackingUrl || 
        (store?.slug ? `https://${window.location.host}/store/${store.slug}` : window.location.origin);
    const qrDataUrl = await generateQrCodeDataUrl(qrTargetUrl);

    if (isLandscape) {
        renderLandscapeLabel({ doc, order, store, options, currency, isCod, payableAmount, cautionText, logoAsset, qrDataUrl, includeItems });
    } else {
        renderPortraitLabel({ doc, order, store, options, currency, isCod, payableAmount, cautionText, logoAsset, qrDataUrl, includeItems });
    }

    return doc;
}

// ─── A5 Portrait (148mm x 210mm) Thermal Label Layout ──────────
function renderPortraitLabel({ doc, order, store, currency, isCod, payableAmount, cautionText, logoAsset, qrDataUrl, includeItems }) {
    // Scaling multipliers for A5 dimensions (from base 100x150 layout)
    const sX = (x) => x * 1.48;
    const sY = (y) => y * 1.4;
    const sF = (f) => f * 1.4;

    const hasCaution = cautionText !== 'none';
    const margin = hasCaution ? 12 : 0; 
    // Shift inner content if we have caution borders. (X is scaled first, then padded inward)
    const innerX = (x) => sX(x) + margin * (1 - (x / 50)); // simplistic squeeze, or better just static shift

    // Outer Frame
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(sX(0.6));
    doc.roundedRect(sX(4) + margin, sY(4), sX(92) - (margin * 2), sY(142), sX(2), sY(2));

    if (hasCaution) {
        const textStr = cautionText === 'fragile' ? 'FRAGILE' : 'HANDLE WITH CARE';
        doc.setFillColor(0, 0, 0);
        // Black side strips (ultra-slim)
        doc.rect(4, 4, 3.5, 202, 'F');
        doc.rect(140.5, 4, 3.5, 202, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        
        // Clean spaced text
        doc.text(textStr, 6.5, 70, { angle: -90 });
        doc.text(textStr, 6.5, 150, { angle: -90 });
        
        doc.text(textStr, 143, 70, { angle: -90 });
        doc.text(textStr, 143, 150, { angle: -90 });
    }

    // ── SECTION 1: HEADER & STORE BRANDING (Y: 4 - 23 mm) ──
    let logoDrawn = false;
    const centerX = 148 / 2;

    if (logoAsset && logoAsset.dataUrl) {
        try {
            const maxW = sX(60);
            const maxH = sY(16);
            const ratio = logoAsset.width / logoAsset.height;
            let w = maxW;
            let h = w / ratio;
            if (h > maxH) { h = maxH; w = h * ratio; }
            doc.addImage(logoAsset.dataUrl, 'PNG', centerX - (w / 2), sY(5) + (maxH - h) / 2, w, h);
            logoDrawn = true;
        } catch (e) {
            console.warn('Could not add logo to PDF:', e);
        }
    }

    if (!logoDrawn) {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.roundedRect(centerX - sX(6), sY(6.5), sX(12), sY(12), sX(2), sY(2), 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(10));
        doc.text((store?.name || 'WA').substring(0, 2).toUpperCase(), centerX, sY(14.5), { align: 'center' });
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(sX(0.5));
    doc.line(sX(4) + margin, sY(23), sX(96) - margin, sY(23));

    // ── SECTION 2: ORDER REFERENCE (Y: 23 - 48 mm) ──
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(8));
    doc.text('ORDER REFERENCE', sX(6) + margin, sY(27.5));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sF(7));
    doc.setTextColor(80, 80, 80);
    doc.text(`DISPATCH: ${formatLabelDate(order.createdAt)}`, sX(94) - margin, sY(27.5), { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(14));
    doc.setTextColor(0, 0, 0);
    doc.text(`ORDER: ${order.orderNumber}`, centerX, sY(38), { align: 'center' });

    doc.setLineWidth(sX(0.5));
    doc.line(sX(4) + margin, sY(48), sX(96) - margin, sY(48));

    // ── SECTION 3: PAYMENT STATUS STRIP (Y: 48 - 58 mm) ──
    if (isCod) {
        doc.setFillColor(0, 0, 0);
        doc.rect(sX(4) + margin, sY(48), sX(92) - (margin * 2), sY(10), 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(9));
        doc.text('CASH ON DELIVERY (COD)', sX(7) + margin, sY(54.5));
        doc.setFontSize(sF(10.5));
        doc.text(`COLLECT: ${currency} ${payableAmount}`, sX(93) - margin, sY(54.5), { align: 'right' });
    } else {
        doc.setFillColor(245, 245, 245);
        doc.rect(sX(4) + margin, sY(48), sX(92) - (margin * 2), sY(10), 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(9));
        doc.text('PREPAID SHIPMENT', sX(7) + margin, sY(54.5));
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(sF(7.5));
        doc.setTextColor(60, 60, 60);
        doc.text('DO NOT COLLECT CASH', sX(93) - margin, sY(54.5), { align: 'right' });
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(sX(0.5));
    doc.line(sX(4) + margin, sY(58), sX(96) - margin, sY(58));

    // ── SECTION 4: SHIP TO (Y: 58 - 95 mm) ──
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(7.5));
    doc.text('DELIVER TO / SHIP TO:', sX(6) + margin, sY(62.5));

    doc.setFontSize(sF(11));
    doc.text(order.customerName || 'Customer / Consignee', sX(6) + margin, sY(67.5));

    let addrStartY = sY(72);
    if (order.customerCompany) {
        doc.setFontSize(sF(8));
        doc.text(order.customerCompany, sX(6) + margin, addrStartY);
        addrStartY += sY(4);
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sF(8));
    doc.setTextColor(20, 20, 20);
    const addrLines = doc.splitTextToSize(order.customerAddress || 'No street address provided', sX(54));
    for (let i = 0; i < Math.min(addrLines.length, 4); i++) {
        doc.text(addrLines[i], sX(6) + margin, addrStartY + (i * sY(3.8)));
    }

    const pin = extractPostalCode(order.customerAddress);
    let contactY = sY(87);
    if (pin) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(8));
        doc.setTextColor(0, 0, 0);
        doc.text(`PIN CODE: ${pin}`, sX(6) + margin, contactY);
        contactY += sY(4);
    }

    if (order.customerPhone) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(8));
        doc.setTextColor(0, 0, 0);
        doc.text(`TEL: ${order.customerPhone}`, sX(6) + margin, contactY);
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(sX(0.5));
    doc.line(sX(4) + margin, sY(95), sX(96) - margin, sY(95));

    // ── SECTION 5: PACKAGE ITEM MANIFEST (Y: 95 - 119 mm) ──
    if (includeItems && order.items && order.items.length > 0) {
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(7));
        doc.text('ITEMS', sX(6) + margin, sY(99));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(6.5));
        doc.text(`TOTAL: ${order.items.length} items`, sX(94) - margin, sY(99), { align: 'right' });

        doc.setLineWidth(sX(0.3));
        doc.line(sX(4) + margin, sY(101), sX(96) - margin, sY(101));

        let rowY = sY(105);
        order.items.slice(0, 3).forEach((item, i) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(sF(7.5));
            const qtyAndName = doc.splitTextToSize(`${i + 1}. ${item.name || 'Product'}`, sX(65))[0];
            doc.text(qtyAndName, sX(6) + margin, rowY);
            
            doc.setFont('helvetica', 'bold');
            const qtyText = `Qty: ${item.qty || 1}`;
            doc.text(qtyText, sX(94) - margin, rowY, { align: 'right' });
            
            rowY += sY(4.5);
        });
        
        if (order.items.length > 3) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(sF(6));
            doc.setTextColor(100, 100, 100);
            doc.text(`+ ${order.items.length - 3} more items...`, centerX, rowY, { align: 'center' });
        }
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(sX(0.5));
    doc.line(sX(4) + margin, sY(119), sX(96) - margin, sY(119));

    // ── SECTION 6: RETURN ADDRESS (Y: 119 - 139 mm) ──
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(7));
    doc.text('IF UNDELIVERED, PLEASE RETURN TO (SHIPPER):', sX(6) + margin, sY(123));
    doc.setFontSize(sF(9));
    doc.text(store?.name || 'Authorized Merchant', sX(6) + margin, sY(127.5));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sF(7));
    
    const storeAddrStr = [store?.address, store?.city, store?.state, store?.country].filter(Boolean).join(', ') || 'Contact store for return address';
    const splitStoreAddr = doc.splitTextToSize(storeAddrStr, sX(88) - (margin * 2));
    for (let j = 0; j < Math.min(splitStoreAddr.length, 2); j++) {
        doc.text(splitStoreAddr[j], sX(6) + margin, sY(131) + (j * sY(3.3)));
    }

    doc.setDrawColor(0, 0, 0);
    doc.line(sX(4) + margin, sY(139), sX(96) - margin, sY(139));

    // ── SECTION 7: FOOTER ──
    const storeSlug = store?.slug || (store?.name ? store.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-') : '');
    const footerBrand = store?.customDomain
        ? store.customDomain.replace(/^https?:\/\//i, '')
        : (storeSlug ? `bluetick.cloud/store/${storeSlug}` : 'bluetick.cloud');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(6));
    doc.setTextColor(100, 100, 100);
    doc.text(footerBrand.toUpperCase(), centerX, sY(143.3), { align: 'center' });
}

// ─── A5 Landscape (210mm x 148mm) Wide Label Layout ─────────────────────
function renderLandscapeLabel({ doc, order, store, currency, isCod, payableAmount, cautionText, logoAsset, qrDataUrl, includeItems }) {
    // Scaling multipliers for A5 dimensions (from base 150x100 layout)
    const sX = (x) => x * 1.4;
    const sY = (y) => y * 1.48;
    const sF = (f) => f * 1.4;

    const hasCaution = cautionText !== 'none';
    const margin = hasCaution ? 12 : 0; 
    
    // Outer Frame
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(sX(0.6));
    doc.roundedRect(sX(4) + margin, sY(4), sX(142) - (margin * 2), sY(92), sX(2), sY(2));

    if (hasCaution) {
        const textStr = cautionText === 'fragile' ? 'FRAGILE' : 'HANDLE WITH CARE';
        doc.setFillColor(0, 0, 0);
        // Black side strips (ultra-slim)
        doc.rect(4, 4, 3.5, 140, 'F');
        doc.rect(202.5, 4, 3.5, 140, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        
        // Clean spaced text
        doc.text(textStr, 6.5, 55, { angle: -90 });
        doc.text(textStr, 6.5, 115, { angle: -90 });
        
        doc.text(textStr, 205, 55, { angle: -90 });
        doc.text(textStr, 205, 115, { angle: -90 });
    }

    // Vertical Divider separating Left (Addresses) and Right (Barcode & Package)
    const splitX = sX(86);
    doc.setLineWidth(sX(0.5));
    doc.line(splitX, sY(4), splitX, sY(96));

    // ── LEFT COLUMN: BRANDING & ADDRESSES ──

    // 1. Store Header (Y: 4 - 20 mm)
    let logoDrawn = false;
    if (logoAsset && logoAsset.dataUrl) {
        try {
            const maxW = sX(60);
            const maxH = sY(14);
            const ratio = logoAsset.width / logoAsset.height;
            let w = maxW;
            let h = w / ratio;
            if (h > maxH) { h = maxH; w = h * ratio; }
            
            const leftCenterX = (splitX - (sX(4) + margin)) / 2 + (sX(4) + margin);
            doc.addImage(logoAsset.dataUrl, 'PNG', leftCenterX - (w / 2), sY(5) + (maxH - h) / 2, w, h);
            logoDrawn = true;
        } catch (e) {
            console.warn('Landscape logo error:', e);
        }
    }
    if (!logoDrawn) {
        doc.setFillColor(15, 23, 42);
        const leftCenterX = (splitX - (sX(4) + margin)) / 2 + (sX(4) + margin);
        doc.roundedRect(leftCenterX - sX(6), sY(6), sX(12), sY(12), sX(1.5), sY(1.5), 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(10));
        doc.text((store?.name || 'WA').substring(0, 2).toUpperCase(), leftCenterX, sY(14), { align: 'center' });
    }

    // Divider under header
    doc.setDrawColor(0, 0, 0);
    doc.line(sX(4) + margin, sY(20), splitX, sY(20));

    // 2. DELIVER TO (Y: 20 - 62 mm)
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(7.5));
    doc.text('DELIVER TO:', sX(6) + margin, sY(24.5));

    doc.setFontSize(sF(12));
    doc.text(order.customerName || 'Customer / Consignee', sX(6) + margin, sY(30));

    let addrY = sY(35);
    if (order.customerCompany) {
        doc.setFontSize(sF(9));
        doc.text(order.customerCompany, sX(6) + margin, addrY);
        addrY += sY(4);
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sF(9));
    doc.setTextColor(20, 20, 20);
    const addrLines = doc.splitTextToSize(order.customerAddress || 'No street address', sX(52));
    for (let i = 0; i < Math.min(addrLines.length, 4); i++) {
        doc.text(addrLines[i], sX(6) + margin, addrY + (i * sY(4)));
    }

    const pin = extractPostalCode(order.customerAddress);
    let contactY = sY(50);
    if (pin) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(8));
        doc.text(`PIN CODE: ${pin}`, sX(6) + margin, contactY);
        contactY += sY(4);
    }

    if (order.customerPhone) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(8));
        doc.text(`TEL: ${order.customerPhone}`, sX(6) + margin, contactY);
    }

    // Divider under Deliver To
    doc.line(sX(4) + margin, sY(62), splitX, sY(62));

    // 3. RETURN ADDRESS (Y: 62 - 88 mm)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(7));
    doc.text('IF UNDELIVERED, RETURN TO:', sX(6) + margin, sY(66.5));

    doc.setFontSize(sF(8.5));
    doc.text(store?.name || 'Shipper', sX(6) + margin, sY(71));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sF(7));
    doc.setTextColor(60, 60, 60);
    const storeAddrParts = [store?.address, store?.city, store?.state, store?.country].filter(Boolean);
    const storeAddrStr = storeAddrParts.join(', ') || 'Contact store';
    const splitAddr = doc.splitTextToSize(storeAddrStr, sX(76) - margin);
    doc.text(splitAddr[0] || '', sX(6) + margin, sY(75));
    if (splitAddr[1]) doc.text(splitAddr[1], sX(6) + margin, sY(78.5));

    const retTel = store?.phone || store?.whatsappNumber;
    if (retTel) doc.text(`Helpline: ${retTel}`, sX(6) + margin, sY(82.5));

    // Left Footer
    const storeSlug = store?.slug || (store?.name ? store.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-') : '');
    const footerBrand = store?.customDomain
        ? store.customDomain.replace(/^https?:\/\//i, '')
        : (storeSlug ? `bluetick.cloud/store/${storeSlug}` : 'bluetick.cloud');
    doc.line(sX(4) + margin, sY(86), splitX, sY(86));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(6));
    doc.setTextColor(0, 0, 0);
    doc.text(footerBrand.toUpperCase(), (sX(4) + margin + splitX) / 2, sY(91.5), { align: 'center' });

    // ── RIGHT COLUMN: PAYMENT, BARCODE & PACKAGE MANIFEST ──

    // 1. Payment Strip (Y: 4 - 17 mm)
    if (isCod) {
        doc.setFillColor(0, 0, 0);
        doc.rect(splitX, sY(4), sX(60) - margin, sY(13), 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(8.5));
        doc.text('CASH ON DELIVERY (COD)', splitX + sX(3), sY(9.5));
        doc.setFontSize(sF(10));
        doc.text(`COLLECT: ${currency} ${payableAmount}`, splitX + sX(3), sY(14.5));
    } else {
        doc.setFillColor(245, 245, 245);
        doc.rect(splitX, sY(4), sX(60) - margin, sY(13), 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sF(9));
        doc.text('PREPAID SHIPMENT', splitX + sX(3), sY(10));
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(sF(7));
        doc.setTextColor(70, 70, 70);
        doc.text('DO NOT COLLECT CASH', splitX + sX(3), sY(14));
    }

    doc.line(splitX, sY(17), sX(146) - margin, sY(17));

    // 2. Order Details (Y: 17 - 45 mm)
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(7.5));
    doc.text('ORDER REFERENCE', splitX + sX(3), sY(21.5));

    doc.setFontSize(sF(14));
    doc.text(`ORDER: ${order.orderNumber}`, splitX + sX(3), sY(33));

    doc.line(splitX, sY(42), sX(146) - margin, sY(42));

    // 3. Package Manifest
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sF(7));
    doc.text('ITEMS', splitX + sX(3), sY(46.5));
    doc.setFontSize(sF(6.5));
    doc.text(`TOTAL: ${order.items.length} items`, sX(143) - margin, sY(46.5), { align: 'right' });

    doc.setLineWidth(sX(0.3));
    doc.line(splitX, sY(48), sX(146) - margin, sY(48));

    if (includeItems && order.items && order.items.length > 0) {
        let rowY = sY(53);
        const visibleItems = order.items.slice(0, 3);
        visibleItems.forEach((item, i) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(sF(7.5));
            const qtyAndName = doc.splitTextToSize(`${i + 1}. ${item.name || 'Product'}`, sX(40))[0];
            doc.text(qtyAndName, splitX + sX(3), rowY);
            
            doc.setFont('helvetica', 'bold');
            const qtyText = `Qty: ${item.qty || 1}`;
            doc.text(qtyText, sX(143) - margin, rowY, { align: 'right' });
            
            rowY += sY(4.5);
        });
        
        if (order.items.length > 3) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(sF(6));
            doc.setTextColor(100, 100, 100);
            const centerR = splitX + ((sX(146) - margin - splitX) / 2);
            doc.text(`+ ${order.items.length - 3} more items...`, centerR, rowY, { align: 'center' });
        }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`Powered by ${store?.customDomain || store?.name || 'Bluetick.cloud'}`, splitX + 3, 91.5);
}

// ─── Direct Thermal Print Helper ──────────────────────────────────────────────
/**
 * Triggers the native browser print dialog for the generated shipping label.
 * Uses an invisible iframe to print directly without opening unwanted popups or file download dialogs.
 */
export async function printShippingLabelDirect(params) {
    const doc = await generateShippingLabelPdf(params);
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);
    iframe.onload = () => {
        setTimeout(() => {
            try {
                iframe.focus();
                iframe.contentWindow.print();
            } catch (e) {
                console.error('Direct print failed, opening in new tab:', e);
                window.open(blobUrl, '_blank');
            }
            // Cleanup after printing
            setTimeout(() => {
                try {
                    document.body.removeChild(iframe);
                } catch {}
                URL.revokeObjectURL(blobUrl);
            }, 60000);
        }, 300);
    };
}

// ─── Direct Download Helper ───────────────────────────────────────────────────
export async function downloadShippingLabelPdf(params) {
    const doc = await generateShippingLabelPdf(params);
    const filename = `Shipping_Label_${params.order?.orderNumber || 'Order'}.pdf`;
    doc.save(filename);
}
