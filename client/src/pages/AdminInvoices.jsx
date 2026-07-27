import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = '/api/invoices';

const INDIAN_STATES = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
    'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
    'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal'
];

const WA_STATUS_COLORS = {
    sent: { bg: '#d1fae5', color: '#065f46', label: 'Sent' },
    failed: { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    skipped_no_phone: { bg: '#f3f4f6', color: '#6b7280', label: 'No Phone' },
    skipped: { bg: '#f3f4f6', color: '#6b7280', label: 'Skipped' }
};

const INV_TYPE_COLORS = {
    tax_invoice: { bg: '#dbeafe', color: '#1e40af', label: 'Tax Invoice' },
    quotation: { bg: '#fce7f3', color: '#9d174d', label: 'Quotation' }
};

function formatCurrency(amount, currency = 'INR') {
    if (currency === 'INR') {
        return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    }
    return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Badge({ type, value }) {
    const map = type === 'wa' ? WA_STATUS_COLORS : INV_TYPE_COLORS;
    const style = map[value] || { bg: '#f3f4f6', color: '#374151', label: value };
    return (
        <span style={{
            background: style.bg, color: style.color, padding: '2px 10px',
            borderRadius: '999px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap'
        }}>
            {style.label}
        </span>
    );
}

export function StatCard({ icon, label, value, sub, color }) {
    return (
        <div style={{
            background: '#fff', borderRadius: '14px', padding: '20px 22px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '180px'
        }}>
            <div style={{
                width: 42, height: 42, borderRadius: '10px', background: color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 2 }}>{label}</div>
                {sub && <div style={{ fontSize: '11px', color: color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
            </div>
        </div>
    );

    return content;
}

export function InvoiceDetailModal({ invoice, onClose, onResend, isUser = false }) {
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState('');
    const LOCAL_API = isUser 
        ? `${import.meta.env.VITE_API_URL}/api/invoices/my`
        : `${import.meta.env.VITE_API_URL}/api/invoices`;

    if (!invoice) return null;

    const handleResend = async () => {
        setResending(true);
        setResendMsg('');
        try {
            await axios.post(`${LOCAL_API}/${invoice.id}/resend`);
            setResendMsg('✅ Invoice re-sent via WhatsApp!');
            onResend && onResend(invoice.id);
        } catch (err) {
            setResendMsg('❌ ' + (err.response?.data?.error || 'Re-send failed'));
        } finally {
            setResending(false);
        }
    };

    const Row = ({ label, value }) => (
        <div style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ width: '160px', color: '#6b7280', fontSize: '12px', flexShrink: 0, fontWeight: 500 }}>{label}</div>
            <div style={{ color: '#111827', fontSize: '13px', wordBreak: 'break-all' }}>{value || '—'}</div>
        </div>
    );

    const Section = ({ title, children }) => (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #e5e7eb' }}>
                {title}
            </div>
            {children}
        </div>
    );

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
            <div style={{
                background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px',
                maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>{invoice.invoiceNumber}</h2>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <Badge type="type" value={invoice.invoiceType} />
                            <Badge type="wa" value={invoice.whatsappStatus} />
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>

                <div style={{ padding: '24px' }}>
                    {/* Action buttons at the top for both admin and users */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                        <a
                            href={`${LOCAL_API}/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                padding: '10px 18px', background: '#1a56db', color: '#fff',
                                borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600
                            }}
                        >
                            ⬇️ Download PDF
                        </a>
                        <button
                            onClick={handleResend}
                            disabled={resending}
                            style={{
                                padding: '10px 18px', background: resending ? '#9ca3af' : '#059669', color: '#fff',
                                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            {resending ? 'Sending…' : '📤 Re-Send via WhatsApp'}
                        </button>
                        {resendMsg && (
                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '10px', fontSize: '13px', color: resendMsg.startsWith('✅') ? '#059669' : '#dc2626', fontWeight: 500 }}>
                                {resendMsg}
                            </div>
                        )}
                    </div>

                    <Section title="📋 Invoice Details">
                        <Row label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
                        <Row label="Invoice Type" value={invoice.invoiceType === 'tax_invoice' ? 'Tax Invoice' : 'Quotation'} />
                        {!isUser && <Row label="Place of Supply" value={invoice.placeOfSupply} />}
                        <Row label="Item Description" value={invoice.itemDescription} />
                        {!isUser && <Row label="HSN/SAC Code" value={invoice.itemHsnSac} />}
                        {!isUser && <Row label="Reverse Charge" value={invoice.reverseCharge ? 'Yes' : 'No'} />}
                    </Section>

                    {!isUser && (
                        <>
                            <Section title="👤 Buyer Details">
                                <Row label="Name" value={invoice.buyerName} />
                                <Row label="Company" value={invoice.buyerCompany} />
                                <Row label="Email" value={invoice.buyerEmail} />
                                <Row label="Phone" value={invoice.buyerPhone} />
                                <Row label="GSTIN" value={invoice.buyerGstin} />
                                <Row label="Address" value={invoice.buyerAddress} />
                                <Row label="State" value={`${invoice.buyerState || '—'}${invoice.buyerStateCode ? ` (${invoice.buyerStateCode})` : ''}`} />
                                <Row label="Country" value={invoice.buyerCountry} />
                                <Row label="Pincode" value={invoice.buyerPincode} />
                            </Section>

                            <Section title="🏢 Seller Details">
                                <Row label="Name" value={invoice.sellerName} />
                                <Row label="GSTIN" value={invoice.sellerGstin} />
                                <Row label="CIN" value={invoice.sellerCin} />
                                <Row label="State" value={invoice.sellerState} />
                                <Row label="Address" value={invoice.sellerAddress} />
                            </Section>
                        </>
                    )}

                    <Section title="🧾 Amount Breakdown">
                        <Row label="Unit Price" value={formatCurrency(invoice.unitPrice, invoice.currency)} />
                        {invoice.discountAmount > 0 && <Row label="Discount" value={`-${formatCurrency(invoice.discountAmount, invoice.currency)}`} />}
                        <Row label="Taxable Amount" value={formatCurrency(invoice.taxableAmount, invoice.currency)} />
                        {!isUser && invoice.gstRate > 0 && <Row label="GST Rate" value={`${invoice.gstRate}%`} />}
                        {!isUser && <Row label="Tax Scheme" value={invoice.taxScheme === 'cgst_sgst' ? 'CGST + SGST' : invoice.taxScheme === 'igst' ? 'IGST' : 'None'} />}
                        {!isUser && invoice.taxScheme === 'cgst_sgst' && <>
                            <Row label={`CGST (${invoice.gstRate / 2}%)`} value={formatCurrency(invoice.cgstAmount, invoice.currency)} />
                            <Row label={`SGST (${invoice.gstRate / 2}%)`} value={formatCurrency(invoice.sgstAmount, invoice.currency)} />
                        </>}
                        {!isUser && invoice.taxScheme === 'igst' && <Row label={`IGST (${invoice.gstRate}%)`} value={formatCurrency(invoice.igstAmount, invoice.currency)} />}
                        {!isUser && <Row label="Total Tax" value={formatCurrency(invoice.totalTaxAmount, invoice.currency)} />}
                        <div style={{ display: 'flex', gap: '12px', padding: '10px 0', background: '#f0fdf4', borderRadius: '8px', marginTop: '4px' }}>
                            <div style={{ width: '160px', color: '#15803d', fontSize: '13px', flexShrink: 0, fontWeight: 700, paddingLeft: '4px' }}>Grand Total</div>
                            <div style={{ color: '#15803d', fontSize: '15px', fontWeight: 700 }}>{formatCurrency(invoice.grandTotal, invoice.currency)}</div>
                        </div>
                    </Section>

                    {!isUser && (
                        <>
                            <Section title="📲 WhatsApp Delivery">
                                <Row label="User WA Status" value={invoice.whatsappStatus} />
                                <Row label="Sent At" value={invoice.whatsappSentAt ? formatDate(invoice.whatsappSentAt) : '—'} />
                                <Row label="Error" value={invoice.whatsappError} />
                                <Row label="CC Status" value={invoice.adminCcStatus} />
                                <Row label="CC Sent At" value={invoice.adminCcSentAt ? formatDate(invoice.adminCcSentAt) : '—'} />
                                <Row label="Download Count" value={invoice.downloadCount} />
                            </Section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return content;
}

export default function AdminInvoices({ isComponent = false, parentSearchTerm }) {
    const [invoices, setInvoices] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [selected, setSelected] = useState(null);
    const [filters, setFilters] = useState({ search: '', invoiceType: '', whatsappStatus: '', from: '', to: '' });
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (parentSearchTerm !== undefined) {
            setFilters(f => ({ ...f, search: parentSearchTerm }));
        }
    }, [parentSearchTerm]);

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}/stats`);
            setStats(data);
        } catch (err) {
            console.error('Stats error:', err);
        }
    }, []);

    const fetchInvoices = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const params = { page: p, limit: 25, ...filters };
            const { data } = await axios.get(API, { params });
            setInvoices(data.invoices || []);
            setTotal(data.total || 0);
            setPage(data.page || 1);
            setPages(data.pages || 1);
        } catch (err) {
            console.error('Invoices fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchInvoices(1); }, [fetchInvoices]);

    const handleFilterChange = (key, val) => {
        setFilters(f => ({ ...f, [key]: val }));
    };

    const handleExportCsv = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ ...filters });
            window.open(`${API}/export/csv?${params}`, '_blank');
        } finally {
            setExporting(false);
        }
    };

    const handleViewDetail = async (inv) => {
        try {
            const { data } = await axios.get(`${API}/${inv.id}`);
            setSelected(data);
        } catch (err) {
            console.error(err);
        }
    };

    const inputStyle = {
        padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
        fontSize: '13px', outline: 'none', background: '#fff', color: '#111827'
    };

    const thStyle = {
        padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
        color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em',
        background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap'
    };

    const tdStyle = {
        padding: '12px 14px', fontSize: '13px', color: '#111827',
        borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle'
    };

    const content = (
        <div style={{ padding: isComponent ? '0' : '24px', fontFamily: "'Inter', system-ui, sans-serif", background: isComponent ? 'transparent' : '#f8fafc', minHeight: isComponent ? 'auto' : '100vh' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>Invoice Manager</h1>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                    {total} invoices · View, download, and re-send GST invoices for all purchases
                </p>
            </div>

            {/* Stats */}
            {stats && (
                <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <StatCard icon="🧾" label="Total Invoices" value={stats.totalInvoices} color="#1a56db" />
                    <StatCard icon="💰" label="Total Revenue" value={`₹${parseFloat(stats.totalRevenue).toLocaleString('en-IN')}`} color="#059669" />
                    <StatCard icon="🏛️" label="GST Collected" value={`₹${parseFloat(stats.totalGst).toLocaleString('en-IN')}`} color="#7c3aed" />
                    <StatCard icon="📲" label="WA Pending" value={stats.pendingWaDelivery} sub={stats.pendingWaDelivery > 0 ? 'Needs attention' : 'All clear!'} color="#d97706" />
                </div>
            )}

            {/* Filters Bar */}
            <div style={{
                background: '#fff', borderRadius: '12px', padding: '16px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb',
                display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px'
            }}>
                {!isComponent && (
                    <input
                        style={{ ...inputStyle, minWidth: '200px', flex: 1 }}
                        placeholder="🔍 Search name, email, invoice#, plan…"
                        value={filters.search}
                        onChange={e => handleFilterChange('search', e.target.value)}
                        id="invoice-search"
                    />
                )}
                <select style={inputStyle} value={filters.invoiceType} onChange={e => handleFilterChange('invoiceType', e.target.value)} id="filter-type">
                    <option value="">All Types</option>
                    <option value="tax_invoice">Tax Invoice</option>
                    <option value="quotation">Quotation</option>
                </select>
                <select style={inputStyle} value={filters.whatsappStatus} onChange={e => handleFilterChange('whatsappStatus', e.target.value)} id="filter-wa-status">
                    <option value="">All WA Status</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                    <option value="skipped_no_phone">No Phone</option>
                </select>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>From</span>
                    <input type="date" style={inputStyle} value={filters.from} onChange={e => handleFilterChange('from', e.target.value)} id="filter-from" />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>To</span>
                    <input type="date" style={inputStyle} value={filters.to} onChange={e => handleFilterChange('to', e.target.value)} id="filter-to" />
                </div>
                <button
                    onClick={handleExportCsv}
                    disabled={exporting}
                    style={{
                        padding: '8px 16px', background: '#1a56db', color: '#fff',
                        border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                    }}
                    id="export-csv-btn"
                >
                    📥 Export CSV
                </button>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Loading invoices…</div>
                ) : invoices.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧾</div>
                        <div style={{ fontSize: '14px' }}>No invoices found</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Invoice #</th>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Customer</th>
                                    <th style={thStyle}>Item</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={thStyle}>Subtotal</th>
                                    <th style={thStyle}>GST</th>
                                    <th style={thStyle}>Total</th>
                                    <th style={thStyle}>WA Status</th>
                                    <th style={thStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv, i) => (
                                    <tr key={inv.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ ...tdStyle, fontWeight: 600, color: '#1a56db', whiteSpace: 'nowrap' }}>{inv.invoiceNumber}</td>
                                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(inv.invoiceDate)}</td>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{inv.buyerName || '—'}</div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{inv.buyerEmail || ''}</div>
                                            {inv.buyerPhone && <div style={{ fontSize: '11px', color: '#6b7280' }}>{inv.buyerPhone}</div>}
                                        </td>
                                        <td style={{ ...tdStyle, maxWidth: '200px' }}>
                                            <div style={{ fontSize: '12px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {inv.itemDescription}
                                            </div>
                                        </td>
                                        <td style={tdStyle}><Badge type="type" value={inv.invoiceType} /></td>
                                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatCurrency(inv.taxableAmount, inv.currency)}</td>
                                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#7c3aed' }}>{formatCurrency(inv.totalTaxAmount, inv.currency)}</td>
                                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontWeight: 700, color: '#111827' }}>{formatCurrency(inv.grandTotal, inv.currency)}</td>
                                        <td style={tdStyle}><Badge type="wa" value={inv.whatsappStatus} /></td>
                                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    onClick={() => handleViewDetail(inv)}
                                                    style={{ padding: '5px 10px', background: '#eff6ff', color: '#1a56db', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                                                    title="View Details"
                                                >
                                                    👁 View
                                                </button>
                                                <a
                                                    href={`${API}/${inv.id}/pdf`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ padding: '5px 10px', background: '#f0fdf4', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}
                                                    title="Download PDF"
                                                >
                                                    ⬇️ PDF
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pages > 1 && (
                    <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            Page {page} of {pages} · {total} invoices
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                onClick={() => fetchInvoices(page - 1)}
                                disabled={page <= 1}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: page <= 1 ? '#f9fafb' : '#fff', cursor: page <= 1 ? 'default' : 'pointer', fontSize: '13px' }}
                            >← Prev</button>
                            <button
                                onClick={() => fetchInvoices(page + 1)}
                                disabled={page >= pages}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: page >= pages ? '#f9fafb' : '#fff', cursor: page >= pages ? 'default' : 'pointer', fontSize: '13px' }}
                            >Next →</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selected && (
                <InvoiceDetailModal
                    invoice={selected}
                    onClose={() => setSelected(null)}
                    onResend={() => {
                        setSelected(null);
                        fetchInvoices(page);
                        fetchStats();
                    }}
                />
            )}
        </div>
    );

    return content;
}
