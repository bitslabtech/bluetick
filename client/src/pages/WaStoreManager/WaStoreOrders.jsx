import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
    ShoppingBag, X, Search, Filter, RefreshCw, ChevronRight,
    Clock, CheckCircle, Truck, Package, XCircle, AlertCircle,
    Phone, Mail, MapPin, MessageCircle, StickyNote, User
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending:    { label: 'Pending',    color: 'text-amber-700   bg-amber-100   dark:bg-amber-900/30  dark:text-amber-300  border-amber-200   dark:border-amber-800',   icon: Clock        },
    confirmed:  { label: 'Confirmed',  color: 'text-blue-700    bg-blue-100    dark:bg-blue-900/30   dark:text-blue-300   border-blue-200    dark:border-blue-800',    icon: CheckCircle  },
    processing: { label: 'Processing', color: 'text-violet-700  bg-violet-100  dark:bg-violet-900/30 dark:text-violet-300 border-violet-200  dark:border-violet-800', icon: Package      },
    shipped:    { label: 'Shipped',    color: 'text-indigo-700  bg-indigo-100  dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200  dark:border-indigo-800', icon: Truck        },
    delivered:  { label: 'Delivered',  color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', icon: CheckCircle },
    cancelled:  { label: 'Cancelled',  color: 'text-rose-700    bg-rose-100    dark:bg-rose-900/30   dark:text-rose-300   border-rose-200    dark:border-rose-800',   icon: XCircle      },
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

// ─── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetailModal({ order, storeId, onClose, onUpdate }) {
    const [status, setStatus] = useState(order.status);
    const [notes, setNotes]   = useState(order.notes || '');
    const [saving, setSaving] = useState(false);
    
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
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
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
                                                <p className="text-sm text-slate-500">{sym(order.currency)} {Number(item.price).toFixed(2)}</p>
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
                                    {Number(order.taxAmount) > 0 && (
                                        <div className="flex justify-between items-center text-sm text-slate-500">
                                            <span>Tax ({order.taxName || 'Estimated'}):</span>
                                            <span>{sym(order.currency)} {Number(order.taxAmount).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(Number(order.total) || Number(order.subtotal)) > Number(order.subtotal) && (
                                        <div className="flex justify-between items-center text-sm text-slate-500">
                                            <span>Shipping:</span>
                                            <span>{sym(order.currency)} {((Number(order.total) || Number(order.subtotal)) - Number(order.subtotal)).toFixed(2)}</span>
                                        </div>
                                    )}
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
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WaStoreOrders() {
    const { storeId } = useOutletContext();
    const [orders, setOrders]       = useState([]);
    const [store, setStore]         = useState(null);
    const [loading, setLoading]     = useState(true);
    const [selected, setSelected]   = useState(null);
    const [search, setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            // UX-3: API now returns paginated shape { orders, total, page, totalPages, limit }
            // We fetch with a high limit so the UX remains unchanged (all orders visible),
            // while the server is protected from unbounded queries.
            // DATA-5: use /by-slug/:storeId to avoid fetching all stores.
            const params = new URLSearchParams({ limit: 200 });
            if (statusFilter !== 'all') params.set('status', statusFilter);

            const [ordersRes, storeRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders?${params}`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/by-slug/${storeId}`)
            ]);
            // Unwrap paginated response — API returns { orders: [...], total, page, ... }
            const data = ordersRes.data;
            setOrders(Array.isArray(data) ? data : (data.orders || []));
            setStore(storeRes.data);
        } catch {
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, [storeId, statusFilter]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

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

    // Stats — use store.currency as the authoritative source, not orders[0]
    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        revenue: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total || o.subtotal), 0)
    };
    const currency = store?.currency || orders[0]?.currency || 'USD';

    return (
        <div className="space-y-6 pb-7 sm:pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-indigo-500" /> Orders
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Track and manage all customer orders placed through your store.</p>
                </div>
                <button onClick={fetchOrders} disabled={loading}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats */}
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

            {/* Filter bar */}
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
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full sm:w-auto pl-11 pr-8 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white appearance-none cursor-pointer min-w-[160px] max-w-full"
                    >
                        <option value="all">All Status</option>
                        {Object.entries(STATUS_CONFIG).map(([k, { label }]) => (
                            <option key={k} value={k}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-4 md:px-6 py-4 animate-pulse">
                                {/* Order # and Date skeleton */}
                                <div className="min-w-[100px]">
                                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                                    <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                                </div>
                                {/* Customer Info skeleton */}
                                <div className="flex-1 min-w-0 flex flex-col mt-1 md:mt-0">
                                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                                    <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
                                </div>
                                {/* Status skeleton */}
                                <div className="hidden md:block w-32">
                                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                </div>
                                {/* Amount skeleton */}
                                <div className="text-right min-w-[90px] max-w-full">
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
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.map(order => (
                            <div
                                key={order.id}
                                onClick={() => setSelected(order)}
                                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-4 md:px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group relative"
                            >
                                <div className="flex justify-between items-start md:w-auto w-full">
                                    {/* Order # and Date */}
                                    <div className="min-w-[100px]">
                                        <p className="font-black text-sm text-indigo-600 dark:text-indigo-400">{order.orderNumber}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
                                    </div>
                                    {/* Status Mobile */}
                                    <div className="md:hidden">
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="flex-1 min-w-0 flex flex-col mt-1 md:mt-0">
                                    <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                                        {order.customerName || <span className="italic text-slate-400">Anonymous</span>}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">{order.customerPhone || 'No phone'}</p>
                                </div>

                                {/* Bottom row on mobile: Items & Amount */}
                                <div className="flex justify-between items-center w-full md:w-auto mt-2 md:mt-0 border-t border-slate-100 dark:border-white/5 md:border-none pt-2 md:pt-0">
                                    <div className="md:hidden text-slate-500 text-xs font-semibold">
                                        {order.items?.length || 0} items
                                    </div>

                                    {/* Items count Desktop */}
                                    <div className="hidden md:block text-center min-w-[60px] max-w-full">
                                        <p className="font-bold text-sm">{order.items?.length || 0}</p>
                                        <p className="text-xs text-slate-400">items</p>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right min-w-[90px] max-w-full">
                                        <p className="font-black text-base text-slate-900 dark:text-white">
                                            {sym(order.currency)} {Number(order.total || order.subtotal).toFixed(2)}
                                        </p>
                                    </div>

                                    {/* Status Desktop */}
                                    <div className="hidden md:block min-w-[110px] max-w-full text-right">
                                        <StatusBadge status={order.status} />
                                    </div>

                                    <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 ml-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selected && (
                <OrderDetailModal
                    order={selected}
                    storeId={storeId}
                    onClose={() => setSelected(null)}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    );
}
