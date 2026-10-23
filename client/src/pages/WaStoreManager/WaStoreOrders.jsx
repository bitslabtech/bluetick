import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    ShoppingBag, X, Search, Filter, RefreshCw, ChevronRight,
    Clock, CheckCircle, Truck, Package, XCircle, AlertCircle,
    Phone, Mail, MapPin, MessageCircle, StickyNote, User, Download, Printer,
    Check, ChevronDown, Loader2, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import ShippingLabelModal from './ShippingLabelModal';
import { downloadShippingLabelPdf } from './ShippingLabelGenerator';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'text-amber-700   bg-amber-100   dark:bg-amber-900/30  dark:text-amber-300  border-amber-200   dark:border-amber-800', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'text-blue-700    bg-blue-100    dark:bg-blue-900/30   dark:text-blue-300   border-blue-200    dark:border-blue-800', icon: CheckCircle },
    processing: { label: 'Processing', color: 'text-violet-700  bg-violet-100  dark:bg-violet-900/30 dark:text-violet-300 border-violet-200  dark:border-violet-800', icon: Package },
    shipped: { label: 'Shipped', color: 'text-indigo-700  bg-indigo-100  dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200  dark:border-indigo-800', icon: Truck },
    delivered: { label: 'Delivered', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'text-rose-700    bg-rose-100    dark:bg-rose-900/30   dark:text-rose-300   border-rose-200    dark:border-rose-800', icon: XCircle },
};

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
const sym = (code) => CURRENCY_SYMBOLS[code] || code;

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
            <Icon className="w-3.5 h-3.5" /> {cfg.label}
        </span>
    );
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Simple amount to words converter (Indian Numbering System)
const taxInWords = (amount) => {
    const n = Math.round(Number(amount) || 0);
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
};

/**
 * Computes GST tax analysis grouped by slab rate.
 * Handles inclusive/exclusive tax, proportional coupon discount, and intra vs inter-state tax splits.
 */
const computeGstBreakdown = (items, tc, discountAmount, orderTaxRate, orderTaxAmount, isInterState) => {
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
};

// ─── Order PDF Generator ──────────────────────────────────────────────────────
export function downloadOrderReceiptPdf(order, store) {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        const getPdfCurrency = (code) => {
            const map = { USD: '$', EUR: '€', GBP: '£', INR: 'Rs.', AED: 'AED', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
            return map[code || 'USD'] || code || 'USD';
        };
        const cSym = getPdfCurrency(order.currency);

        // ─── Tax / GST Helpers ───────────────────────────────────────────────────
        const tc = store?.taxConfig || {};
        const isGst = tc.type === 'gst' && tc.enabled;
        const taxAmount = Number(order.taxAmount || order.taxTotal || 0);
        const taxRate = Number(order.taxRate || 0);

        // CGST/SGST vs IGST: compare seller state (from taxConfig) with buyer state
        const sellerState = (tc.sellerState || '').toLowerCase().trim();
        const buyerState = (() => {
            const addr = order.customerAddress || '';
            const beforePincode = addr.split(' - ')[0];
            const parts = beforePincode.split(',');
            return (parts[parts.length - 1]?.trim() || '').toLowerCase();
        })();
        const isInterState = isGst && sellerState && buyerState && sellerState !== buyerState;

        // ─── Invoice type label ───────────────────────────────────────────────────
        const invoiceLabel = isGst ? 'TAX INVOICE' : 'ORDER DETAILS';

        // 1. Header Background & Store Details
        doc.setFillColor(79, 70, 229); // Indigo-600
        const sellerName = tc.sellerLegalName || store?.name || "Order Details";
        let headerExtraLines = 0;
        if (tc.sellerAddress) headerExtraLines += 1;
        if (tc.sellerGstin || tc.sellerState || tc.sellerPan) headerExtraLines += 1;
        const headerHeight = 24 + (headerExtraLines * 4);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(sellerName, 14, 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        let hdrY = 17;
        if (tc.sellerAddress) {
            const splitHdrAddr = doc.splitTextToSize(tc.sellerAddress, pageWidth * 0.55);
            doc.text(splitHdrAddr, 14, hdrY);
            hdrY += (splitHdrAddr.length * 3.2);
        }
        let sellerMeta = [];
        if (tc.sellerState) sellerMeta.push(tc.sellerState + (tc.sellerStateCode ? ` (${tc.sellerStateCode})` : ''));
        if (tc.sellerGstin) sellerMeta.push(`GSTIN: ${tc.sellerGstin}`);
        if (tc.sellerPan) sellerMeta.push(`PAN: ${tc.sellerPan}`);
        if (sellerMeta.length > 0) {
            doc.text(sellerMeta.join('  |  '), 14, hdrY);
            hdrY += 3.2;
        }

        // Top-Right Header Title
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(invoiceLabel, pageWidth - 14, 13, { align: "right" });
        if (isGst) {
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.text("ORIGINAL FOR RECIPIENT", pageWidth - 14, 18, { align: "right" });
        }

        // 2. Info Sections below header
        let currentY = headerHeight + 5;
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);

        // Left: Customer / Billed To
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("BILL TO (BUYER DETAILS):", 14, currentY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        let leftY = currentY + 4;
        if (order.customerName) { doc.setFont("helvetica", "bold"); doc.text(order.customerName, 14, leftY); doc.setFont("helvetica", "normal"); leftY += 3.8; }
        if (order.customerCompany) { doc.text(order.customerCompany, 14, leftY); leftY += 3.5; }
        if (order.customerAddress) {
            const splitAddress = doc.splitTextToSize(order.customerAddress, pageWidth * 0.5 - 20);
            doc.text(splitAddress, 14, leftY);
            leftY += (splitAddress.length * 3.5);
        }
        if (order.customerGstin) { doc.setFont("helvetica", "bold"); doc.text(`GSTIN: ${order.customerGstin}`, 14, leftY); doc.setFont("helvetica", "normal"); leftY += 3.5; }
        if (order.customerPhone || order.customerEmail) {
            const contactParts = [];
            if (order.customerPhone) contactParts.push(`Phone: ${order.customerPhone}`);
            if (order.customerEmail) contactParts.push(`Email: ${order.customerEmail}`);
            doc.text(contactParts.join('  |  '), 14, leftY);
            leftY += 3.5;
        }

        // Right: Order Details
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("INVOICE DETAILS:", pageWidth - 80, currentY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        let rightY = currentY + 4;
        doc.text(`Order No: ${order.orderNumber}`, pageWidth - 80, rightY); rightY += 3.6;
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, pageWidth - 80, rightY); rightY += 3.6;
        doc.text(`Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`, pageWidth - 80, rightY); rightY += 3.6;
        if (order.paymentStatus) {
            doc.text(`Payment: ${order.paymentStatus.toUpperCase()}`, pageWidth - 80, rightY); rightY += 3.6;
        }
        if (isGst) {
            doc.text(`Place of Supply: ${buyerState || tc.sellerState || 'N/A'}`, pageWidth - 80, rightY); rightY += 3.6;
            doc.text(`Type: ${isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}`, pageWidth - 80, rightY); rightY += 3.6;
        }
        if (order.source) {
            doc.text(`Source: ${order.source.toUpperCase()}`, pageWidth - 80, rightY); rightY += 3.6;
        }

        currentY = Math.max(leftY, rightY) + 5;

        // 3. Items Table
        const tableColumn = ["#", "Item Description", isGst ? "GST %" : "Tax %", "Qty", "Price", "Total"];
        const tableRows = [];

        (order.items || []).forEach((item, i) => {
            const itemTotal = parseFloat(item.price) * parseInt(item.qty || 1);
            let itemDesc = item.name;
            if (item.selectedVariants && typeof item.selectedVariants === 'object') {
                const vStr = Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' | ');
                if (vStr) itemDesc += `\n(${vStr})`;
            }
            const itemRate = (item.taxRate !== null && item.taxRate !== undefined && item.taxRate !== '' && !isNaN(parseFloat(item.taxRate)))
                ? parseFloat(item.taxRate)
                : (parseFloat(order.taxRate) || parseFloat(tc.rate) || 0);

            tableRows.push([
                String(i + 1),
                itemDesc,
                `${itemRate}%`,
                (item.qty || 1).toString(),
                `${cSym} ${Number(item.price).toFixed(2)}`,
                `${cSym} ${itemTotal.toFixed(2)}`
            ]);
        });

        autoTable(doc, {
            startY: currentY,
            head: [tableColumn],
            body: tableRows,
            showHead: 'everyPage',
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 } },
            styles: { fontSize: 7.5, cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 } },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 16, halign: 'center' },
                3: { cellWidth: 14, halign: 'center' },
                4: { cellWidth: 26, halign: 'right' },
                5: { cellWidth: 26, halign: 'right' },
            }
        });

        let finalY = doc.lastAutoTable.finalY + 6;

        // 4. Multi-Slab GST Analysis (Left Side) & Totals Summary Box (Right Side)
        const gstAnalysis = computeGstBreakdown(
            order.items,
            tc,
            order.discountAmount,
            taxRate,
            taxAmount,
            isInterState
        );

        const finalTotalTax = (gstAnalysis && gstAnalysis.totalTax > 0)
            ? gstAnalysis.totalTax
            : taxAmount;

        let shippingCost = Number(order.shippingCost || 0);
        if (!shippingCost) {
            shippingCost = Number(order.total) - Number(order.subtotal) - taxAmount;
            if (shippingCost < 0 || isNaN(shippingCost)) shippingCost = 0;
        }

        let numTotalLines = 1; // subtotal
        if (order.couponCode && parseFloat(order.discountAmount) > 0) numTotalLines++;
        numTotalLines++; // Total GST / Tax line
        if (shippingCost > 0) numTotalLines++;

        const boxWidth = 72;
        const boxX = pageWidth - boxWidth - 14;
        const boxHeight = (numTotalLines * 5.2) + 16;
        const neededBottomHeight = Math.max((isGst && gstAnalysis.slabs.length > 0 ? (16 + gstAnalysis.slabs.length * 4) : 0), boxHeight) + 18;

        if (finalY + neededBottomHeight > 275) {
            doc.addPage();
            finalY = 16;
            // Continuation header on Page 2
            doc.setFillColor(79, 70, 229);
            doc.rect(0, 0, pageWidth, 9, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text(`${sellerName} — ${invoiceLabel} #${order.orderNumber} (Continued)`, 14, 6.2);
            finalY = 16;
        }

        let gstTableFinalY = finalY;

        // Render Left Side: GST Analysis Table (if GST is enabled and slabs exist)
        if (isGst && gstAnalysis.slabs.length > 0) {
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(79, 70, 229);
            doc.text("TAX ANALYSIS / GST BREAKDOWN", 14, finalY + 3.5);

            const gstTableHead = isInterState
                ? [["GST Rate", "Taxable Val", "IGST Amt", "Total Tax"]]
                : [["GST Rate", "Taxable Val", "CGST", "SGST", "Total Tax"]];

            const gstTableRows = gstAnalysis.slabs.map(s => (
                isInterState
                    ? [s.rateStr, `${cSym} ${s.taxableAmount.toFixed(2)}`, `${cSym} ${s.igst.toFixed(2)}`, `${cSym} ${s.taxAmount.toFixed(2)}`]
                    : [s.rateStr, `${cSym} ${s.taxableAmount.toFixed(2)}`, `${cSym} ${s.cgst.toFixed(2)}`, `${cSym} ${s.sgst.toFixed(2)}`, `${cSym} ${s.taxAmount.toFixed(2)}`]
            ));

            // Total row
            gstTableRows.push(
                isInterState
                    ? ["Total", `${cSym} ${gstAnalysis.totalTaxable.toFixed(2)}`, `${cSym} ${gstAnalysis.totalIgst.toFixed(2)}`, `${cSym} ${gstAnalysis.totalTax.toFixed(2)}`]
                    : ["Total", `${cSym} ${gstAnalysis.totalTaxable.toFixed(2)}`, `${cSym} ${gstAnalysis.totalCgst.toFixed(2)}`, `${cSym} ${gstAnalysis.totalSgst.toFixed(2)}`, `${cSym} ${gstAnalysis.totalTax.toFixed(2)}`]
            );

            autoTable(doc, {
                startY: finalY + 5,
                margin: { left: 14 },
                tableWidth: 104,
                head: gstTableHead,
                body: gstTableRows,
                theme: 'grid',
                headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 6.8, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
                styles: { fontSize: 6.8, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, textColor: [30, 41, 59] },
                columnStyles: isInterState ? {
                    0: { halign: 'center', cellWidth: 20 },
                    1: { halign: 'right', cellWidth: 28 },
                    2: { halign: 'right', cellWidth: 28 },
                    3: { halign: 'right', cellWidth: 28 }
                } : {
                    0: { halign: 'center', cellWidth: 18 },
                    1: { halign: 'right', cellWidth: 23 },
                    2: { halign: 'right', cellWidth: 21 },
                    3: { halign: 'right', cellWidth: 21 },
                    4: { halign: 'right', cellWidth: 21 }
                },
                didParseCell: (data) => {
                    // Make last total row bold
                    if (data.row.index === gstTableRows.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [241, 245, 249];
                    }
                }
            });

            gstTableFinalY = doc.lastAutoTable.finalY;
        }

        // Render Right Side: Totals Summary Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 2, 2, 'FD');

        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);

        const rightAlignX = boxX + boxWidth - 4;
        const leftAlignX = boxX + 4;
        let currentBoxY = finalY + 4.5;

        // Subtotal
        const subtotalLabel = tc.taxInclusive ? "Subtotal (Incl. Tax):" : "Subtotal:";
        doc.text(subtotalLabel, leftAlignX, currentBoxY);
        doc.text(`${cSym} ${Number(order.originalTotal || order.subtotal).toFixed(2)}`, rightAlignX, currentBoxY, { align: "right" });
        currentBoxY += 5.2;

        // Discount
        if (order.couponCode && parseFloat(order.discountAmount) > 0) {
            doc.setTextColor(220, 38, 38);
            doc.text(`Discount (${order.couponCode}):`, leftAlignX, currentBoxY);
            doc.text(`-${cSym} ${Number(order.discountAmount).toFixed(2)}`, rightAlignX, currentBoxY, { align: "right" });
            doc.setTextColor(60, 60, 60);
            currentBoxY += 5.2;
        }

        // Total GST (Right side total GST across all slabs)
        if (finalTotalTax > 0) {
            const taxLabel = isGst ? (tc.taxInclusive ? "Total GST (Incl.):" : "Total GST:") : (order.taxName || "Tax:");
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text(taxLabel, leftAlignX, currentBoxY);
            doc.text(`${cSym} ${finalTotalTax.toFixed(2)}`, rightAlignX, currentBoxY, { align: "right" });
            doc.setFont("helvetica", "normal");
            doc.setTextColor(60, 60, 60);
            currentBoxY += 5.2;
        } else {
            doc.text("Tax:", leftAlignX, currentBoxY);
            doc.text("N/A", rightAlignX, currentBoxY, { align: "right" });
            currentBoxY += 5.2;
        }

        // Shipping
        if (shippingCost > 0) {
            doc.text("Shipping:", leftAlignX, currentBoxY);
            doc.text(`${cSym} ${shippingCost.toFixed(2)}`, rightAlignX, currentBoxY, { align: "right" });
            currentBoxY += 5.2;
        }

        // Divider
        doc.setDrawColor(203, 213, 225);
        doc.line(leftAlignX, currentBoxY - 1.5, rightAlignX, currentBoxY - 1.5);

        // Grand Total
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Total:", leftAlignX, currentBoxY + 3.8);
        doc.setTextColor(79, 70, 229);
        doc.text(`${cSym} ${Number(order.total).toFixed(2)}`, rightAlignX, currentBoxY + 3.8, { align: "right" });

        const totalsBoxFinalY = currentBoxY + 7;
        let afterBoxY = Math.max(gstTableFinalY, totalsBoxFinalY) + 5;

        // 5. In Words & GST Declaration
        if (finalTotalTax > 0) {
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(51, 65, 85);
            doc.text(`Amount Chargeable (in words): ${taxInWords(order.total)} Only`, 14, afterBoxY);
            afterBoxY += 3.8;
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100, 116, 139);
            doc.text(`Tax Amount (in words): ${taxInWords(finalTotalTax)} Only`, 14, afterBoxY);
            afterBoxY += 3.8;
        } else {
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(51, 65, 85);
            doc.text(`Amount Chargeable (in words): ${taxInWords(order.total)} Only`, 14, afterBoxY);
            afterBoxY += 3.8;
        }

        // 6. Notes (if any)
        if (order.customerNote) {
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(60, 60, 60);
            doc.text("Customer Note:", 14, afterBoxY);
            doc.setFont("helvetica", "italic");
            const splitNotes = doc.splitTextToSize(order.customerNote, pageWidth - 28);
            doc.text(splitNotes, 14, afterBoxY + 3.8);
            afterBoxY += (splitNotes.length * 3.5) + 2;
        }

        // 7. Multi-page Running Footer on ALL pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 287, pageWidth - 14, 287);
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text("This is a computer-generated tax invoice and does not require a signature.", 14, 291);
            doc.text(`Page ${p} of ${totalPages}`, pageWidth - 14, 291, { align: "right" });
        }

        doc.save(`Invoice_${order.orderNumber}.pdf`);
        return true;
    } catch (error) {
        console.error("PDF Generation Error:", error);
        toast.error("Failed to generate Invoice PDF");
        return false;
    }
}


// ─── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetailModal({ order, storeId, store, onClose, onUpdate }) {
    const [status, setStatus] = useState(order.status);
    const [notes, setNotes] = useState(order.notes || '');
    const [saving, setSaving] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);

    const downloadOrderPDF = () => downloadOrderReceiptPdf(order, store);

    const downloadShippingLabel = async () => {
        try {
            await downloadShippingLabelPdf({ order, store });
            toast.success("Shipping label downloaded");
        } catch (error) {
            console.error("Shipping Label Generation Error:", error);
            toast.error("Failed to generate Shipping Label");
        }
    };

    // Fulfillment state
    const [trackingProvider, setTrackingProvider] = useState(order.trackingProvider || '');
    const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '');
    const [fulfilling, setFulfilling] = useState(false);

    // Modal positioning bounds to align with main section and exclude sidebar
    const [bounds, setBounds] = useState({ left: 0, top: 0, width: '100%', height: '100%' });

    useEffect(() => {
        const mainEl = document.querySelector('main');
        let originalOverflow = '';
        if (mainEl) {
            const rect = mainEl.getBoundingClientRect();
            setBounds({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });

            // Prevent background scrolling while modal is open
            originalOverflow = window.getComputedStyle(mainEl).overflow;
            mainEl.style.overflow = 'hidden';

            // Handle window resize to recalculate bounds
            const handleResize = () => {
                const newRect = mainEl.getBoundingClientRect();
                setBounds({ left: newRect.left, top: newRect.top, width: newRect.width, height: newRect.height });
            };
            window.addEventListener('resize', handleResize);

            return () => {
                mainEl.style.overflow = originalOverflow;
                window.removeEventListener('resize', handleResize);
            };
        }
    }, []);

    const handleFulfill = async () => {
        setFulfilling(true);
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders/${order.id}/fulfill`,
                { trackingProvider, trackingUrl }
            );
            onUpdate(res.data);
            setStatus('shipped');
            toast.success('Order fulfilled and customer notified via WhatsApp!');
        } catch {
            toast.error('Failed to fulfill order');
        } finally {
            setFulfilling(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders/${order.id}`,
                { status, notes }
            );
            onUpdate(res.data);
            toast.success('Order updated!');
            onClose();
        } catch {
            toast.error('Failed to update order');
        } finally {
            setSaving(false);
        }
    };

    const openWhatsApp = () => {
        if (!order.customerPhone) return;
        const phone = order.customerPhone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}`, '_blank');
    };

    return (
        <div
            className="fixed z-50 flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden"
            style={{ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose} />
            <div className="relative w-full h-full sm:h-auto max-w-5xl max-h-full overflow-y-auto bg-slate-50 dark:bg-zinc-900 sm:rounded-3xl shadow-2xl text-slate-900 dark:text-white flex flex-col">

                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 sm:rounded-t-3xl shadow-sm">
                    <div>
                        <h2 className="text-xl font-black">Order {order.orderNumber}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Placed on {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={() => setShowLabelModal(true)} className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm whitespace-nowrap">
                            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Shipping Label</span><span className="sm:hidden">Label</span>
                        </button>
                        <button onClick={downloadOrderPDF} className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm whitespace-nowrap">
                            <Download className="w-4 h-4" /> <span className="hidden sm:inline">{store?.taxConfig?.type === 'gst' && store?.taxConfig?.enabled ? 'Tax Invoice' : 'Order Receipt'}</span><span className="sm:hidden">Invoice</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors ml-1" title="Close">
                            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column (Customer Info, Items & Notes) */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Customer Details (Moved from right to above items) */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-500" /> Customer Details
                                    </h3>
                                </div>
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        {order.customerName && (
                                            <div className="text-sm">
                                                <span className="block text-xs text-slate-500 mb-0.5">Name</span>
                                                <span className="font-medium">{order.customerName}</span>
                                            </div>
                                        )}
                                        {order.customerPhone && (
                                            <div className="text-sm">
                                                <span className="block text-xs text-slate-500 mb-0.5">Phone</span>
                                                <span>{order.customerPhone}</span>
                                            </div>
                                        )}
                                        {order.customerEmail && (
                                            <div className="text-sm">
                                                <span className="block text-xs text-slate-500 mb-0.5">Email</span>
                                                <span>{order.customerEmail}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        {order.customerAddress && (
                                            <div className="text-sm h-full flex flex-col">
                                                <span className="block text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5" /> Shipping Address
                                                </span>
                                                <span className="whitespace-pre-line text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-zinc-800 p-3 rounded-xl border border-slate-100 dark:border-white/5 flex-1">
                                                    {order.customerAddress}
                                                </span>
                                            </div>
                                        )}
                                        {!order.customerName && !order.customerPhone && !order.customerEmail && !order.customerAddress && (
                                            <p className="text-slate-400 text-sm italic">No details provided</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Order Items Table */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">Items ({order.items?.length || 0})</h3>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {(order.items || []).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4">
                                            {item.imageUrls?.[0] ? (
                                                <img src={item.imageUrls[0]} alt={item.name} className="w-16 h-16 object-cover rounded-xl border border-slate-100 dark:border-white/10" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10">
                                                    <ShoppingBag className="w-6 h-6 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-base text-slate-900 dark:text-white truncate">{item.name}</p>
                                                {item.selectedVariants && typeof item.selectedVariants === 'object' && (
                                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                                                        {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <p className="text-sm text-slate-500">{sym(order.currency)} {Number(item.price).toFixed(2)}</p>
                                                    {item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== '' && (
                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                            GST {parseFloat(item.taxRate)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-center px-4 border-l border-r border-slate-100 dark:border-white/10">
                                                <p className="text-xs text-slate-400">Qty</p>
                                                <p className="font-bold">x{item.qty}</p>
                                            </div>
                                            <div className="text-right min-w-[80px]">
                                                <p className="text-xs text-slate-400">Total</p>
                                                <p className="font-black text-indigo-600 dark:text-indigo-400">{sym(order.currency)} {(item.price * item.qty).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Totals Breakdown */}
                                <div className="border-t border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-white/[0.02] space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Items Subtotal:</span>
                                        <span className="font-medium">{sym(order.currency)} {Number(order.originalTotal || order.subtotal).toFixed(2)}</span>
                                    </div>
                                    {order.couponCode && parseFloat(order.discountAmount) > 0 && (
                                        <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                                            <span>Discount (Coupon: {order.couponCode}):</span>
                                            <span>− {sym(order.currency)} {Number(order.discountAmount).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {/* GST-compliant tax display: show multi-slab or single breakdown */}
                                    {Number(order.taxAmount) > 0 && (() => {
                                        const isGstOrder = store?.taxConfig?.type === 'gst' && store?.taxConfig?.enabled;
                                        const taxAmt = Number(order.taxAmount);
                                        const sellerSt = (store?.taxConfig?.sellerState || '').toLowerCase();
                                        const addr = order.customerAddress || '';
                                        const buyerSt = (addr.split(' - ')[0].split(',').pop()?.trim() || '').toLowerCase();
                                        const interState = sellerSt && buyerSt && sellerSt !== buyerSt;

                                        if (isGstOrder) {
                                            const modalGst = computeGstBreakdown(order.items, store?.taxConfig || {}, order.discountAmount, order.taxRate, taxAmt, interState);
                                            if (modalGst.slabs.length > 1) {
                                                return (
                                                    <div className="space-y-1.5 py-1">
                                                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">GST Breakdown by Tax Slab:</p>
                                                        {modalGst.slabs.map(s => (
                                                            <div key={s.rateStr} className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-indigo-300 dark:border-indigo-700">
                                                                <span>GST @ {s.rateStr} (Taxable: {sym(order.currency)} {s.taxableAmount.toFixed(2)}):</span>
                                                                <span>
                                                                    {interState
                                                                        ? `IGST: ${sym(order.currency)} ${s.igst.toFixed(2)}`
                                                                        : `CGST: ${sym(order.currency)} ${s.cgst.toFixed(2)} + SGST: ${sym(order.currency)} ${s.sgst.toFixed(2)}`}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        <div className="flex justify-between items-center text-sm font-semibold text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-white/5">
                                                            <span>Total GST:</span>
                                                            <span>{sym(order.currency)} {modalGst.totalTax.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            } else if (modalGst.slabs.length === 1) {
                                                const s = modalGst.slabs[0];
                                                if (interState) {
                                                    return (
                                                        <div className="flex justify-between items-center text-sm text-slate-500">
                                                            <span>IGST ({s.rateStr}):</span>
                                                            <span>{sym(order.currency)} {s.igst.toFixed(2)}</span>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <>
                                                            <div className="flex justify-between items-center text-sm text-slate-500">
                                                                <span>CGST ({s.rate / 2}%):</span>
                                                                <span>{sym(order.currency)} {s.cgst.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm text-slate-500">
                                                                <span>SGST ({s.rate / 2}%):</span>
                                                                <span>{sym(order.currency)} {s.sgst.toFixed(2)}</span>
                                                            </div>
                                                        </>
                                                    );
                                                }
                                            }
                                        }
                                        return (
                                            <div className="flex justify-between items-center text-sm text-slate-500">
                                                <span>Tax ({order.taxName || 'Estimated'}):</span>
                                                <span>{sym(order.currency)} {taxAmt.toFixed(2)}</span>
                                            </div>
                                        );
                                    })()}
                                    {/* Shipping: total - subtotal - taxAmount */}
                                    {(() => {
                                        const shipping = Number(order.total || order.subtotal) - Number(order.subtotal) - Number(order.taxAmount || 0);
                                        return shipping > 0.01 ? (
                                            <div className="flex justify-between items-center text-sm text-slate-500">
                                                <span>Shipping:</span>
                                                <span>{sym(order.currency)} {shipping.toFixed(2)}</span>
                                            </div>
                                        ) : null;
                                    })()}
                                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200 dark:border-white/10">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">Order Total:</span>
                                        <span className="font-black text-xl text-indigo-600 dark:text-indigo-400">{sym(order.currency)} {Number(order.total || order.subtotal).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Customer Note */}
                                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <StickyNote className="w-4 h-4 text-amber-500" /> Customer Provided Note
                                    </h3>
                                    {order.customerNote ? (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 italic bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                            "{order.customerNote}"
                                        </p>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">No notes provided by the customer.</p>
                                    )}
                                </div>

                                {/* Internal Notes */}
                                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col">
                                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <StickyNote className="w-4 h-4 text-indigo-500" /> Internal Notes
                                    </h3>
                                    <textarea
                                        rows={3}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Add private notes (only visible to you)..."
                                        className="w-full flex-1 px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-900 dark:text-white placeholder-slate-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column (Status, Logistics) */}
                        <div className="space-y-6">

                            {/* Order Status & Actions */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">Order Action</h3>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500">Order Status</label>
                                        <select
                                            value={status}
                                            onChange={e => setStatus(e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button onClick={handleSave} disabled={saving}
                                        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> {saving ? 'Saving…' : 'Update Status'}
                                    </button>
                                </div>
                            </div>

                            {/* Logistics / Fulfillment */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-slate-500" /> Logistics
                                    </h3>
                                </div>
                                <div className="p-4">
                                    {order.status === 'shipped' || order.status === 'delivered' ? (
                                        <div className="space-y-3 text-sm bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold mb-1">
                                                <Package className="w-4 h-4" /> Package Shipped
                                            </div>
                                            <p className="text-blue-900 dark:text-blue-200"><strong>Provider:</strong> {order.trackingProvider || 'Not specified'}</p>
                                            {order.trackingUrl && (
                                                <p className="text-blue-900 dark:text-blue-200"><strong>Tracking:</strong> <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all">{order.trackingUrl}</a></p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Shipping Provider</label>
                                                <input
                                                    type="text"
                                                    value={trackingProvider}
                                                    onChange={e => setTrackingProvider(e.target.value)}
                                                    placeholder="e.g. FedEx, UPS"
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Tracking URL</label>
                                                <input
                                                    type="url"
                                                    value={trackingUrl}
                                                    onChange={e => setTrackingUrl(e.target.value)}
                                                    placeholder="https://..."
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <button
                                                onClick={handleFulfill}
                                                disabled={fulfilling}
                                                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 disabled:opacity-60 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm mt-2"
                                            >
                                                <Truck className="w-4 h-4" />
                                                {fulfilling ? 'Fulfilling...' : 'Fulfill & Notify Customer'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Shipping Label Preview & Print Modal */}
            {showLabelModal && (
                <ShippingLabelModal
                    order={order}
                    store={store}
                    onClose={() => setShowLabelModal(false)}
                />
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WaStoreOrders() {
    const { storeId } = useOutletContext();
    const [orders, setOrders] = useState([]);
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Multi-select & Quick Action states
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [pendingBulkStatus, setPendingBulkStatus] = useState(null);
    const [quickUpdatingId, setQuickUpdatingId] = useState(null);
    const [openStatusMenuId, setOpenStatusMenuId] = useState(null);
    const [labelModalOrders, setLabelModalOrders] = useState(null); // null means closed

    // Close in-row status dropdown on outside click
    useEffect(() => {
        const handleClickOutside = () => setOpenStatusMenuId(null);
        if (openStatusMenuId) {
            window.addEventListener('click', handleClickOutside);
            return () => window.removeEventListener('click', handleClickOutside);
        }
    }, [openStatusMenuId]);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: 200 });
            if (statusFilter !== 'all') params.set('status', statusFilter);

            const [ordersRes, storeRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders?${params}`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/by-slug/${storeId}`)
            ]);
            const data = ordersRes.data;
            setOrders(Array.isArray(data) ? data : (data.orders || []));
            setStore(storeRes.data);
        } catch {
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, [storeId, statusFilter]);

    useEffect(() => { 
        fetchOrders(); 
        // Update last viewed timestamp so badges disappear
        if (storeId) {
            axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, { lastViewedOrdersAt: new Date() }).catch(() => {});
        }
    }, [fetchOrders, storeId]);

    const handleUpdate = (updated) => {
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    };

    const filtered = orders.filter(o => {
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        const q = search.toLowerCase();
        const matchesSearch = !q ||
            o.orderNumber.toLowerCase().includes(q) ||
            (o.customerName || '').toLowerCase().includes(q) ||
            (o.customerPhone || '').toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
    });

    // Stats
    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        revenue: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total || o.subtotal), 0)
    };
    const currency = store?.currency || orders[0]?.currency || 'USD';

    // ── Selection helpers ──────────────────────────────────────────────────────
    const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;
    const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filtered.length;

    const toggleSelectAll = (e) => {
        if (e) e.stopPropagation();
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(o => o.id));
        }
    };

    const toggleSelectOrder = (orderId, e) => {
        if (e) e.stopPropagation();
        setSelectedIds(prev =>
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    // ── Quick Status Update (Single Order) ────────────────────────────────────
    const handleQuickStatusUpdate = async (orderId, newStatus, e) => {
        if (e) e.stopPropagation();
        setOpenStatusMenuId(null);
        setQuickUpdatingId(orderId);

        // Optimistic UI update
        const prevOrders = [...orders];
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

        try {
            const res = await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders/${orderId}`,
                { status: newStatus }
            );
            setOrders(prev => prev.map(o => o.id === orderId ? res.data : o));
            toast.success(`Order moved to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        } catch (err) {
            console.error('Quick status update error:', err);
            setOrders(prevOrders);
            toast.error('Failed to update order status');
        } finally {
            setQuickUpdatingId(null);
        }
    };

    // ── Bulk Status Update (Multiple Orders) ──────────────────────────────────
    const handleBulkStatusUpdate = async (newStatus) => {
        if (selectedIds.length === 0) return;
        setBulkUpdating(true);
        const toastId = toast.loading(`Updating ${selectedIds.length} orders to ${STATUS_CONFIG[newStatus]?.label || newStatus}...`);

        // Optimistic UI update
        const prevOrders = [...orders];
        setOrders(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, status: newStatus } : o));

        try {
            const res = await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders/bulk-status`,
                { orderIds: selectedIds, status: newStatus }
            );
            if (res.data?.orders) {
                const updatedMap = new Map(res.data.orders.map(o => [o.id, o]));
                setOrders(prev => prev.map(o => updatedMap.get(o.id) || o));
            }
            toast.success(`Updated ${selectedIds.length} orders!`, { id: toastId });
            setSelectedIds([]);
        } catch (err) {
            console.error('Bulk status update error:', err);
            setOrders(prevOrders);
            toast.error('Failed to bulk update orders', { id: toastId });
        } finally {
            setBulkUpdating(false);
        }
    };

    // ── Quick Print Single Shipping Label ─────────────────────────────────────
    const handleQuickPrint = async (order, e) => {
        if (e) e.stopPropagation();
        setLabelModalOrders([order]);
    };

    // ── Bulk Print Shipping Labels ────────────────────────────────────────────
    const handleBulkPrintLabels = async () => {
        const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
        if (selectedOrders.length === 0) return;
        setLabelModalOrders(selectedOrders);
    };

    // ── Quick Download Order Details / Receipt PDF ────────────────────────────
    const handleQuickDownloadReceipt = (order, e) => {
        if (e) e.stopPropagation();
        const ok = downloadOrderReceiptPdf(order, store);
        if (ok) toast.success(`Order receipt downloaded for ${order.orderNumber}`);
    };

    // ── Bulk Download Order Details / Receipts ────────────────────────────────
    const handleBulkDownloadReceipts = async () => {
        const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
        if (selectedOrders.length === 0) return;
        const toastId = toast.loading(`Generating ${selectedOrders.length} order receipts...`);
        try {
            for (const ord of selectedOrders) {
                downloadOrderReceiptPdf(ord, store);
            }
            toast.success(`Downloaded ${selectedOrders.length} order receipts!`, { id: toastId });
        } catch (err) {
            console.error('Bulk receipt generation error:', err);
            toast.error('Error generating some order receipts', { id: toastId });
        }
    };

    // ── Quick WhatsApp Chat with Customer ────────────────────────────────────
    const openWhatsAppChat = (order, e) => {
        if (e) e.stopPropagation();
        if (!order.customerPhone) {
            toast.error('No phone number recorded for this customer');
            return;
        }
        const phone = order.customerPhone.replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(`Hi ${order.customerName || 'there'}, regarding your order ${order.orderNumber} at ${store?.name || 'our store'}: `);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };

    // Status Tabs definition
    const STATUS_TABS = [
        { key: 'all', label: 'All Orders', count: stats.total },
        { key: 'pending', label: 'Pending', count: stats.pending, dot: 'bg-amber-500' },
        { key: 'confirmed', label: 'Confirmed', count: stats.confirmed, dot: 'bg-blue-500' },
        { key: 'processing', label: 'Processing', count: stats.processing, dot: 'bg-violet-500' },
        { key: 'shipped', label: 'Shipped', count: stats.shipped, dot: 'bg-indigo-500' },
        { key: 'delivered', label: 'Delivered', count: stats.delivered, dot: 'bg-emerald-500' },
        { key: 'cancelled', label: 'Cancelled', count: stats.cancelled, dot: 'bg-rose-500' },
    ];

    return (
        <div className="space-y-6 pb-20 sm:pb-24 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-indigo-500" /> Orders
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Track and manage all customer orders placed through your store.</p>
                </div>
                <button
                    onClick={fetchOrders}
                    disabled={loading}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                    title="Refresh orders"
                >
                    <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Orders', value: stats.total, color: 'text-indigo-600 dark:text-indigo-400' },
                    { label: 'Pending', value: stats.pending, color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Delivered', value: stats.delivered, color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Revenue', value: `${sym(currency)} ${stats.revenue.toFixed(2)}`, color: 'text-slate-900 dark:text-white' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                        <div className={`text-2xl font-black ${color}`}>{value}</div>
                        <div className="text-xs text-slate-500 font-medium mt-1">{label}</div>
                    </div>
                ))}
            </div>

            {/* DotPe / Digital Showroom Style: Interactive Status Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                {STATUS_TABS.map(tab => {
                    const isActive = statusFilter === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setStatusFilter(tab.key);
                                setSelectedIds([]);
                            }}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                                    : 'bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
                            }`}
                        >
                            {tab.dot && <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : tab.dot}`} />}
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                isActive ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Search and Secondary Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by order #, customer name or phone…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                </div>
                <div className="relative w-full sm:w-auto">
                    <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={e => {
                            setStatusFilter(e.target.value);
                            setSelectedIds([]);
                        }}
                        className="w-full sm:w-auto pl-11 pr-8 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white appearance-none cursor-pointer min-w-[160px] max-w-full"
                    >
                        <option value="all">All Statuses</option>
                        {Object.entries(STATUS_CONFIG).map(([k, { label }]) => (
                            <option key={k} value={k}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Orders Table Container */}
            {loading ? (
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex flex-col md:flex-row md:items-center gap-3 px-4 md:px-6 py-4 animate-pulse">
                                <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
                                <div className="min-w-[100px]">
                                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                                    <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                                    <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
                                </div>
                                <div className="hidden md:block w-28">
                                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                </div>
                                <div className="text-right min-w-[90px]">
                                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl">
                    <ShoppingBag className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                        {orders.length === 0 ? 'No orders yet' : 'No orders match your filter'}
                    </p>
                    <p className="text-slate-400 text-sm mt-2">
                        {orders.length === 0 ? 'Orders placed through your storefront will appear here.' : 'Try clearing your search or status filter.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-visible shadow-sm">
                    {/* Desktop Header Bar with Aligned Column Titles */}
                    <div className="hidden md:flex items-center px-4 md:px-6 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03] text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider rounded-t-2xl select-none">
                        {/* Col 1: Checkbox & Order ID */}
                        <div className="w-48 shrink-0 flex items-center gap-3">
                            <div
                                onClick={toggleSelectAll}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                    isAllSelected
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                        : isSomeSelected
                                        ? 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-600 text-indigo-600'
                                        : 'border-slate-300 dark:border-white/20 hover:border-indigo-400 bg-white dark:bg-zinc-800'
                                }`}
                                title={isAllSelected ? "Deselect all" : "Select all visible"}
                            >
                                {isAllSelected ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                ) : isSomeSelected ? (
                                    <span className="w-2 h-0.5 bg-indigo-600 rounded-full" />
                                ) : null}
                            </div>
                            <span>ORDER ID</span>
                        </div>

                        {/* Col 2: Customer */}
                        <div className="flex-1 min-w-[180px] px-2">
                            <span>CUSTOMER</span>
                        </div>

                        {/* Col 3: Items */}
                        <div className="w-20 shrink-0 text-center">
                            <span>ITEMS</span>
                        </div>

                        {/* Col 4: Amount */}
                        <div className="w-28 shrink-0 text-right pr-4">
                            <span>AMOUNT</span>
                        </div>

                        {/* Col 5: Status */}
                        <div className="w-36 shrink-0 text-left pl-2">
                            <span>STATUS</span>
                        </div>

                        {/* Col 6: Actions */}
                        <div className="w-28 shrink-0 text-right pr-2">
                            <span>ACTIONS</span>
                        </div>
                    </div>

                    {/* Mobile Header Bar */}
                    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03] text-xs font-bold text-slate-500 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div
                                onClick={toggleSelectAll}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                    isAllSelected
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                        : isSomeSelected
                                        ? 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-600 text-indigo-600'
                                        : 'border-slate-300 dark:border-white/20 hover:border-indigo-400 bg-white dark:bg-zinc-800'
                                }`}
                            >
                                {isAllSelected ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                ) : isSomeSelected ? (
                                    <span className="w-2 h-0.5 bg-indigo-600 rounded-full" />
                                ) : null}
                            </div>
                            <span className="uppercase tracking-wider font-extrabold text-slate-700 dark:text-slate-300">
                                {selectedIds.length > 0 ? `${selectedIds.length} Selected` : `Select All (${filtered.length})`}
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400">Total {filtered.length} orders</span>
                    </div>

                    {/* Orders List */}
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.map(order => {
                            const isSelected = selectedIds.includes(order.id);
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => setSelected(order)}
                                    className={`cursor-pointer transition-colors group relative ${
                                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                                    }`}
                                >
                                    {/* Desktop Row */}
                                    <div className="hidden md:flex items-center px-4 md:px-6 py-3.5">
                                        {/* Col 1: Checkbox & Order ID */}
                                        <div className="w-48 shrink-0 flex items-center gap-3">
                                            <div
                                                onClick={(e) => toggleSelectOrder(order.id, e)}
                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                                                    isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                                        : 'border-slate-300 dark:border-white/20 hover:border-indigo-400 bg-white dark:bg-zinc-800'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-indigo-600 dark:text-indigo-400 group-hover:underline">
                                                    {order.orderNumber}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
                                            </div>
                                        </div>

                                        {/* Col 2: Customer */}
                                        <div className="flex-1 min-w-[180px] px-2 min-w-0">
                                            <p className="font-bold text-sm truncate text-slate-900 dark:text-white">
                                                {order.customerName || <span className="italic text-slate-400 font-normal">Anonymous</span>}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">{order.customerPhone || 'No phone'}</p>
                                        </div>

                                        {/* Col 3: Items */}
                                        <div className="w-20 shrink-0 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                                                {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                                            </span>
                                        </div>

                                        {/* Col 4: Amount */}
                                        <div className="w-28 shrink-0 text-right pr-4">
                                            <p className="font-black text-sm text-slate-900 dark:text-white">
                                                {sym(order.currency)} {Number(order.total || order.subtotal).toFixed(2)}
                                            </p>
                                        </div>

                                        {/* Col 5: Status Dropdown */}
                                        <div className="w-36 shrink-0 pl-2" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative inline-block w-full max-w-[136px]">
                                                <select
                                                    value={order.status}
                                                    disabled={quickUpdatingId === order.id}
                                                    onChange={(e) => handleQuickStatusUpdate(order.id, e.target.value, e)}
                                                    className={`w-full text-xs font-bold rounded-xl pl-2.5 pr-7 py-1.5 border appearance-none cursor-pointer outline-none transition-all shadow-2xs hover:brightness-95 ${
                                                        STATUS_CONFIG[order.status]?.color || STATUS_CONFIG.pending.color
                                                    }`}
                                                    title="Change order status"
                                                >
                                                    {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                                                        <option key={k} value={k} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold">
                                                            {cfg.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
                                                    {quickUpdatingId === order.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Col 6: Actions */}
                                        <div className="w-28 shrink-0 flex items-center justify-end gap-1.5 pr-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => handleQuickDownloadReceipt(order, e)}
                                                title="Download Order Details (Receipt PDF)"
                                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleQuickPrint(order, e)}
                                                title="Download Shipping Label"
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setSelected(order)}
                                                title="View Details"
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mobile Card Row */}
                                    <div className="md:hidden p-4 space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    onClick={(e) => toggleSelectOrder(order.id, e)}
                                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                                                        isSelected
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                                            : 'border-slate-300 dark:border-white/20 hover:border-indigo-400 bg-white dark:bg-zinc-800'
                                                    }`}
                                                >
                                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm text-indigo-600 dark:text-indigo-400">{order.orderNumber}</p>
                                                    <p className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</p>
                                                </div>
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <div className="relative inline-block">
                                                    <select
                                                        value={order.status}
                                                        disabled={quickUpdatingId === order.id}
                                                        onChange={(e) => handleQuickStatusUpdate(order.id, e.target.value, e)}
                                                        className={`text-xs font-bold rounded-xl pl-2.5 pr-6 py-1 border appearance-none cursor-pointer outline-none shadow-2xs ${
                                                            STATUS_CONFIG[order.status]?.color || STATUS_CONFIG.pending.color
                                                        }`}
                                                    >
                                                        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                                                            <option key={k} value={k} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold">
                                                                {cfg.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer & Amount */}
                                        <div className="flex items-start justify-between gap-2 text-xs">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{order.customerName || 'Anonymous'}</p>
                                                <p className="text-slate-400 text-[11px]">{order.customerPhone || 'No phone'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-sm text-slate-900 dark:text-white">
                                                    {sym(order.currency)} {Number(order.total || order.subtotal).toFixed(2)}
                                                </p>
                                                <p className="text-[11px] text-slate-400">{order.items?.length || 0} items</p>
                                            </div>
                                        </div>

                                        {/* Mobile Actions */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setSelected(order)}
                                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                                            >
                                                View Details <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleQuickDownloadReceipt(order, e)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                                                    title="Download Order Details"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleQuickPrint(order, e)}
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                                                    title="Print Label"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Floating Bulk Action Bar (Docked at Bottom when orders are selected) */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
                    <div className="bg-white/95 dark:bg-zinc-800/95 text-slate-900 dark:text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-2xl border border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-3 sm:gap-4 max-w-[95vw] sm:max-w-fit">
                        {/* Selected counter */}
                        <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-white/20">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            <span className="text-xs sm:text-sm font-black whitespace-nowrap">{selectedIds.length} Selected</span>
                        </div>

                        {/* Bulk Status Select Menu */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold hidden sm:inline">Change Status:</span>
                            <div className="relative inline-block">
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) setPendingBulkStatus(e.target.value);
                                        e.target.value = '';
                                    }}
                                    disabled={bulkUpdating}
                                    defaultValue=""
                                    className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/20 rounded-xl text-xs font-bold pl-3 pr-7 py-1.5 text-slate-900 dark:text-white outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors appearance-none"
                                >
                                    <option value="" disabled>Move status to...</option>
                                    <option value="pending">⏳ Pending</option>
                                    <option value="confirmed">✓ Confirmed</option>
                                    <option value="processing">📦 Processing</option>
                                    <option value="shipped">🚚 Shipped</option>
                                    <option value="delivered">✅ Delivered</option>
                                    <option value="cancelled">✕ Cancelled</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>

                        {/* Bulk Download Order Details / Receipts */}
                        <button
                            onClick={handleBulkDownloadReceipts}
                            disabled={bulkUpdating}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
                            title="Download Order Details / Receipts for all selected orders"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Order Receipts</span>
                            <span className="sm:hidden">Receipts</span>
                        </button>

                        {/* Bulk Print Labels */}
                        <button
                            onClick={handleBulkPrintLabels}
                            disabled={bulkUpdating}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
                            title="Download Shipping Labels for all selected orders"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Print Labels</span>
                            <span className="sm:hidden">Labels</span>
                        </button>

                        {/* Clear Selection */}
                        <button
                            onClick={() => setSelectedIds([])}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ml-1"
                            title="Clear selection"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal (Preserved 100%) */}
            {selected && (
                <OrderDetailModal
                    order={selected}
                    storeId={storeId}
                    store={store}
                    onClose={() => setSelected(null)}
                    onUpdate={handleUpdate}
                />
            )}

            {/* Shipping Label Modal for List & Bulk Actions */}
            {labelModalOrders && (
                <ShippingLabelModal
                    orders={labelModalOrders}
                    store={store}
                    onClose={() => setLabelModalOrders(null)}
                />
            )}

            {/* Bulk Status Confirmation Modal */}
            {pendingBulkStatus && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPendingBulkStatus(null)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 mx-auto flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Change Status</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Are you sure you want to change the status of <strong>{selectedIds.length}</strong> selected orders to <strong className="text-indigo-600 dark:text-indigo-400 capitalize">{STATUS_CONFIG[pendingBulkStatus]?.label || pendingBulkStatus}</strong>?
                        </p>
                        <div className="flex items-center gap-3 w-full">
                            <button
                                onClick={() => setPendingBulkStatus(null)}
                                className="flex-1 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleBulkStatusUpdate(pendingBulkStatus);
                                    setPendingBulkStatus(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
