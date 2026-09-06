import React, { useState, useRef, useEffect } from 'react';
import {
    Printer, Download, X, Truck,
    Sliders, Eye, MapPin, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import {
    getCurrencySymbol,
    extractPostalCode
} from './ShippingLabelGenerator';

// Fetch any URL and return it as a base64 data URL (avoids CORS during capture)
async function toDataUrl(url) {
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

// SVG Icon for Fragile (official ISO 780 cracked wine glass symbol)
function FragileIcon({ className = "w-3.5 h-3.5" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M8 22h8" />
            <path d="M12 15v7" />
            <path d="M12 15a5 5 0 0 0 5-5V3H7v7a5 5 0 0 0 5 5Z" />
            <path d="m11 3 2 3-2 3" />
        </svg>
    );
}

// SVG Icon for Handle With Care (warning alert triangle symbol)
function CareIcon({ className = "w-3.5 h-3.5" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

// Side Caution Banner: ultra-slim, high-contrast thermal black strip with distinct warning badges
function SideCautionBanner({ format, cautionText, side }) {
    if (cautionText === 'none') return null;

    const isFragile = cautionText === 'fragile';
    const isLandscape = format === 'landscape_a5';
    // For Fragile in portrait: 3 complete badges. For landscape or handle_with_care: 2 complete badges.
    const count = isFragile && !isLandscape ? 3 : 2;
    const Icon = isFragile ? FragileIcon : CareIcon;
    const label = isFragile ? 'FRAGILE' : 'HANDLE WITH CARE';

    return (
        <div
            className={`absolute ${side === 'left' ? 'left-0 border-r border-black' : 'right-0 border-l border-black'} top-0 bottom-0 w-3.5 bg-black text-white flex flex-col items-center justify-around py-3 z-10 select-none`}
        >
            {Array.from({ length: count }).map((_, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && <div className="text-[5px] text-white/40 select-none">◆</div>}
                    <div className="flex flex-col items-center gap-1 py-1">
                        <Icon className="w-2.5 h-2.5 text-white shrink-0" />
                        <span
                            className={`font-black uppercase text-white select-none whitespace-nowrap ${
                                isFragile ? 'text-[8px] tracking-[0.16em]' : 'text-[7px] tracking-[0.08em]'
                            }`}
                            style={{ writingMode: 'vertical-rl' }}
                        >
                            {label}
                        </span>
                        <Icon className="w-2.5 h-2.5 text-white shrink-0" />
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}

export default function ShippingLabelModal({ order: initialOrder, orders, store, onClose }) {
    const targetOrders = orders?.length > 0 ? orders : (initialOrder ? [initialOrder] : []);
    const [previewIndex, setPreviewIndex] = useState(0);
    const order = targetOrders[previewIndex] || {};

    const [format, setFormat] = useState('portrait_a5'); // 'portrait_a5' | 'landscape_a5'
    const [includeItems, setIncludeItems] = useState(true);
    const [paymentType, setPaymentType] = useState('prepaid');
    const [payableAmount, setPayableAmount] = useState(Number(order.total || order.subtotal || 0).toFixed(2));
    const [useFullAmount, setUseFullAmount] = useState(true);
    const [cautionText, setCautionText] = useState('none');
    const [printing, setPrinting] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const labelRef = useRef(null);

    // Sync payable amount if order changes during bulk preview
    useEffect(() => {
        if (useFullAmount && order) {
            setPayableAmount(Number(order.total || order.subtotal || 0).toFixed(2));
        }
    }, [order, useFullAmount]);

    const currency = getCurrencySymbol(store?.currency || order.currency);
    const pin = extractPostalCode(order.customerAddress);

    const storeSlug = store?.slug || (store?.name ? store.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-') : '');
    const storeLinkText = (
        store?.customDomain
            ? store.customDomain.replace(/^https?:\/\//i, '')
            : (storeSlug ? `bluetick.cloud/store/${storeSlug}` : 'bluetick.cloud')
    ).toUpperCase();

    // Pre-fetch logo as base64 to avoid CORS issues during capture
    const rawLogoSrc = store?.logo
        ? (store.logo.startsWith('http') || store.logo.startsWith('data:')
            ? store.logo
            : `${import.meta.env.VITE_API_URL}${store.logo.startsWith('/') ? '' : '/'}${store.logo}`)
        : null;
    const [logoDataUrl, setLogoDataUrl] = useState(null);

    useEffect(() => {
        if (!rawLogoSrc) { setLogoDataUrl(null); return; }
        if (rawLogoSrc.startsWith('data:')) { setLogoDataUrl(rawLogoSrc); return; }
        toDataUrl(rawLogoSrc).then(setLogoDataUrl);
    }, [rawLogoSrc]);

    const logoSrc = logoDataUrl || rawLogoSrc;

    const capturePreviewToPdf = async () => {
        const el = labelRef.current;
        if (!el) throw new Error('Label preview element not mounted');

        const isLandscape = format === 'landscape_a5';
        const pdfW = isLandscape ? 210 : 148;
        const pdfH = isLandscape ? 148 : 210;

        const imgs = el.querySelectorAll('img');
        const origSrcs = [];
        imgs.forEach((img) => { origSrcs.push(img.src); if (logoDataUrl) img.src = logoDataUrl; });

        let imgData;
        try {
            const { toPng } = await import('html-to-image');
            imgData = await toPng(el, { pixelRatio: 3, backgroundColor: '#ffffff' });
        } catch (captureError) {
            console.error('[ShippingLabel] capture error:', captureError);
            throw captureError;
        } finally {
            imgs.forEach((img, i) => { img.src = origSrcs[i]; });
        }

        const doc = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'mm',
            format: 'a5',
        });

        const nativeImg = new Image();
        await new Promise((res) => { nativeImg.onload = res; nativeImg.src = imgData; });
        const imgAspect = nativeImg.width / nativeImg.height;
        const pageAspect = pdfW / pdfH;
        let imgW = pdfW, imgH = pdfH;
        if (imgAspect > pageAspect) { imgH = pdfW / imgAspect; }
        else { imgW = pdfH * imgAspect; }
        doc.addImage(imgData, 'PNG', (pdfW - imgW) / 2, (pdfH - imgH) / 2, imgW, imgH);
        return doc;
    };
    
    const generateBulkPdf = async () => {
        const isLandscape = format === 'landscape_a5';
        const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a5' });
        const { toPng } = await import('html-to-image');
        
        for (let i = 0; i < targetOrders.length; i++) {
            setPreviewIndex(i);
            await new Promise(r => setTimeout(r, 200)); 
            
            const el = labelRef.current;
            const imgs = el.querySelectorAll('img');
            const origSrcs = [];
            imgs.forEach((img) => { origSrcs.push(img.src); if (logoDataUrl) img.src = logoDataUrl; });
            
            let imgData;
            try {
                imgData = await toPng(el, { pixelRatio: 3, backgroundColor: '#ffffff' });
            } finally {
                imgs.forEach((img, j) => { img.src = origSrcs[j]; });
            }
            
            const pdfW = isLandscape ? 210 : 148;
            const pdfH = isLandscape ? 148 : 210;
            const nativeImg = new Image();
            await new Promise((res) => { nativeImg.onload = res; nativeImg.src = imgData; });
            const imgAspect = nativeImg.width / nativeImg.height;
            const pageAspect = pdfW / pdfH;
            let imgW = pdfW, imgH = pdfH;
            if (imgAspect > pageAspect) { imgH = pdfW / imgAspect; } else { imgW = pdfH * imgAspect; }
            
            if (i > 0) doc.addPage();
            doc.addImage(imgData, 'PNG', (pdfW - imgW) / 2, (pdfH - imgH) / 2, imgW, imgH);
        }
        setPreviewIndex(0);
        return doc;
    };

    const handlePrint = async () => {
        setPrinting(true);
        try {
            const doc = targetOrders.length > 1 ? await generateBulkPdf() : await capturePreviewToPdf();
            const blobUrl = doc.output('bloburl');
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframe.src = blobUrl;
            iframe.onload = () => {
                iframe.contentWindow.print();
                setTimeout(() => document.body.removeChild(iframe), 3000);
            };
            toast.success(targetOrders.length > 1 ? `Sent ${targetOrders.length} labels to printer` : 'Sent to printer');
        } catch (error) {
            console.error('Print error:', error);
            toast.error('Failed to print label');
        } finally {
            setPrinting(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            if (targetOrders.length > 1) {
                const doc = await generateBulkPdf();
                doc.save(`bulk-shipping-labels-${targetOrders.length}.pdf`);
                toast.success(`Downloaded ${targetOrders.length} labels`);
            } else {
                const doc = await capturePreviewToPdf();
                doc.save(`shipping-label-${order.orderNumber}.pdf`);
                toast.success('Shipping label downloaded');
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download PDF');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" onClick={onClose} />
            <div className="relative w-full max-w-5xl max-h-[95vh] bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-white">
                
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                                Shipping Label <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/30">Order {order.orderNumber}</span>
                                {targetOrders.length > 1 && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-500/30">Bulk: {previewIndex + 1} of {targetOrders.length}</span>}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Thermal sticker & parcel manifest generator</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    <div className="lg:col-span-7 flex flex-col items-center">
                        <div className="flex items-center justify-between w-full mb-3 px-1">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Live Thermal Preview {targetOrders.length > 1 && `(${previewIndex + 1} of ${targetOrders.length})`}
                            </span>
                            {targetOrders.length > 1 && (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPreviewIndex(p => Math.max(0, p - 1))} disabled={previewIndex === 0} className="px-2 py-1 text-xs bg-slate-200 dark:bg-zinc-800 rounded-md disabled:opacity-50">Prev</button>
                                    <button onClick={() => setPreviewIndex(p => Math.min(targetOrders.length - 1, p + 1))} disabled={previewIndex === targetOrders.length - 1} className="px-2 py-1 text-xs bg-slate-200 dark:bg-zinc-800 rounded-md disabled:opacity-50">Next</button>
                                </div>
                            )}
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                {format === 'portrait_a5' ? 'A5 Portrait (148×210mm)' : 'A5 Landscape (210×148mm)'}
                            </span>
                        </div>

                        <div className="w-full flex justify-center p-3 sm:p-5 bg-slate-200/70 dark:bg-zinc-950/70 border border-slate-300 dark:border-white/5 rounded-2xl overflow-x-auto shadow-inner">
                            <div 
                                ref={labelRef}
                                className={`relative bg-white text-black font-sans shadow-2xl rounded-sm border-2 border-slate-900 select-none flex flex-col transition-all duration-300 ${
                                    format === 'portrait_a5' ? 'w-[320px] sm:w-[350px] min-h-[496px]' : 'w-[450px] min-h-[317px]'
                                } ${cautionText !== 'none' ? 'px-3.5' : ''}`}
                                style={{ fontSize: '12px' }}
                            >
                                <SideCautionBanner format={format} cautionText={cautionText} side="left" />
                                <SideCautionBanner format={format} cautionText={cautionText} side="right" />
                                <div className="p-3 border-b-2 border-black flex justify-center">
                                    {logoSrc ? (
                                        <img src={logoSrc} alt={store?.name} className="h-12 max-w-[200px] object-contain" />
                                    ) : (
                                        <div className="w-12 h-12 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-lg tracking-wider">
                                            {(store?.name || 'WA').substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className="p-2 border-b-2 border-black bg-white flex flex-col items-center">
                                    <div className="w-full flex justify-end items-center text-[10px] font-bold">
                                        <span className="text-slate-600 font-mono text-[9px]">{order.orderNumber}</span>
                                    </div>
                                </div>

                                <div className={`px-3 py-2 border-b-2 border-black font-bold ${
                                    paymentType === 'cod' ? 'bg-black text-white' : 'bg-slate-100 text-black'
                                }`}>
                                    <div className="text-[9px] uppercase tracking-widest opacity-70 mb-0.5">
                                        {paymentType === 'cod' ? 'CASH ON DELIVERY' : 'PAYMENT METHOD'}
                                    </div>
                                    <div className="text-sm font-black uppercase">
                                        {paymentType === 'cod'
                                            ? `COD — COLLECT: ${currency} ${Math.round(payableAmount)}`
                                            : 'PREPAID — DO NOT COLLECT CASH'
                                        }
                                    </div>
                                </div>

                                <div className="p-3 border-b-2 border-black flex gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                            <MapPin className="w-2.5 h-2.5" /> SHIP TO / DELIVER TO:
                                        </p>
                                        <p className="font-bold text-xs text-black leading-tight">{order.customerName || 'Valued Customer'}</p>
                                        {order.customerCompany && (
                                            <p className="font-semibold text-[10px] text-slate-700">{order.customerCompany}</p>
                                        )}
                                        <p className="text-[10px] text-slate-800 leading-snug mt-1 whitespace-pre-line">
                                            {order.customerAddress || 'No address provided'}
                                        </p>
                                        {pin && (
                                            <p className="text-[10px] font-bold text-black mt-0.5">
                                                PIN CODE: {pin}
                                            </p>
                                        )}
                                        {order.customerPhone && (
                                            <p className="text-[10px] font-bold text-black mt-1 flex items-center gap-1">
                                                <Phone className="w-2.5 h-2.5" /> {order.customerPhone}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {includeItems && order.items && order.items.length > 0 && (
                                    <div className="p-2 border-b-2 border-black text-[9px] bg-white">
                                        <div className="flex justify-between font-bold text-slate-600 border-b border-slate-200 pb-1 mb-1 uppercase">
                                            <span>ITEMS</span>
                                            <span>QTY</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            {order.items.slice(0, 3).map((item, i) => (
                                                <div key={i} className="flex justify-between text-black gap-2">
                                                    <span className="truncate flex-1 min-w-0">{i + 1}. {item.name}</span>
                                                    <span className="font-semibold shrink-0">{item.qty || 1}</span>
                                                </div>
                                            ))}
                                            {order.items.length > 3 && (
                                                <p className="text-[8px] text-slate-500 italic">+ {order.items.length - 3} more items...</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="p-2.5 text-[9px] text-slate-700 bg-slate-50 mt-auto border-t border-slate-200">
                                    <p className="font-bold text-black uppercase text-[8px]">IF UNDELIVERED, RETURN TO:</p>
                                    <p className="font-bold text-black">{store?.name}</p>
                                    <p className="truncate">{[store?.address, store?.city, store?.state, store?.country].filter(Boolean).join(', ')}</p>
                                    <p className="text-[8px] font-semibold text-slate-600 mt-0.5">Helpline: {store?.phone || store?.whatsappNumber || 'Support'}</p>
                                </div>

                                <div className="px-3 py-1.5 bg-black text-white text-[8px] font-bold flex items-center justify-center text-center tracking-wider">
                                    <span>{storeLinkText}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-5">
                        <div className="bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-sm">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Label Format
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormat('portrait_a5')}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        format === 'portrait_a5'
                                            ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 dark:border-blue-500 text-blue-900 dark:text-white shadow-sm'
                                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <div className="font-bold text-sm text-slate-900 dark:text-white">A5 Portrait</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">148 × 210 mm</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormat('landscape_a5')}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        format === 'landscape_a5'
                                            ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 dark:border-blue-500 text-blue-900 dark:text-white shadow-sm'
                                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <div className="font-bold text-sm text-slate-900 dark:text-white">A5 Landscape</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">210 × 148 mm</div>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-4 shadow-sm">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Payment Options
                            </label>

                            <div>
                                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-2">Payment Type</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                                        <input
                                            type="radio"
                                            name="paymentType"
                                            value="prepaid"
                                            checked={paymentType === 'prepaid'}
                                            onChange={() => setPaymentType('prepaid')}
                                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 bg-white dark:bg-zinc-900"
                                        />
                                        Prepaid
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                                        <input
                                            type="radio"
                                            name="paymentType"
                                            value="cod"
                                            checked={paymentType === 'cod'}
                                            onChange={() => setPaymentType('cod')}
                                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 bg-white dark:bg-zinc-900"
                                        />
                                        Cash on Delivery (COD)
                                    </label>
                                </div>
                            </div>

                            {paymentType === 'cod' && (
                                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer" htmlFor="use-full-amount">
                                            Use Full Order Value
                                        </label>
                                        <input
                                            type="checkbox"
                                            id="use-full-amount"
                                            checked={useFullAmount}
                                            onChange={(e) => {
                                                setUseFullAmount(e.target.checked);
                                                if (e.target.checked) {
                                                    setPayableAmount(Number(order.total || order.subtotal || 0).toFixed(2));
                                                }
                                            }}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-zinc-900 border-slate-300 dark:border-white/20 cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Payable Amount ({currency})</label>
                                        <input
                                            type="number"
                                            value={payableAmount}
                                            max={Number(order.total || order.subtotal || 0)}
                                            onChange={(e) => {
                                                const maxVal = Number(order.total || order.subtotal || 0);
                                                const val = Number(e.target.value);
                                                if (val > maxVal) {
                                                    setPayableAmount(maxVal.toFixed(2));
                                                } else {
                                                    setPayableAmount(e.target.value);
                                                }
                                                setUseFullAmount(false);
                                            }}
                                            disabled={useFullAmount}
                                            placeholder="Enter amount to collect"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-1 pb-1">
                                <label className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer" htmlFor="toggle-items">
                                    Include Item Manifest / Contents
                                </label>
                                <input
                                    type="checkbox"
                                    id="toggle-items"
                                    checked={includeItems}
                                    onChange={e => setIncludeItems(e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-zinc-900 border-slate-300 dark:border-white/20 cursor-pointer"
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-2">Print Caution Text / Warning Borders</label>
                                <select
                                    value={cautionText}
                                    onChange={e => setCautionText(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="none">None (Standard Label)</option>
                                    <option value="fragile">FRAGILE</option>
                                    <option value="handle_with_care">HANDLE WITH CARE</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-row items-center gap-3 pt-6 border-t border-slate-200 dark:border-white/10 w-full">
                            <button
                                onClick={handlePrint}
                                disabled={printing || downloading}
                                className="flex-1 px-2 sm:px-4 py-2.5 rounded-xl font-bold bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap text-sm sm:text-base"
                            >
                                <Printer className="w-4 h-4" /> {printing ? 'Preparing...' : targetOrders.length > 1 ? `Print ${targetOrders.length} Labels` : 'Print Directly'}
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={printing || downloading}
                                className="flex-1 px-2 sm:px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap text-sm sm:text-base"
                            >
                                <Download className="w-4 h-4" /> {downloading ? 'Generating...' : targetOrders.length > 1 ? `Download ${targetOrders.length}` : 'Download PDF'}
                            </button>
                        </div>
                        <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                            Compatible with all thermal printers (Rollo, Zebra, Munbyn, TSC) & regular A4 printing.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
