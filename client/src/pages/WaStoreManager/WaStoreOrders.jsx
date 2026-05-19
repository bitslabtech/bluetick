import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders/${order.id}`,
                { status, notes },
                { headers: { 'x-auth-token': localStorage.getItem('token') } }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl text-slate-900 dark:text-white">
                
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-zinc-900 rounded-t-3xl">
                    <div>
                        <h2 className="text-xl font-black">{order.orderNumber}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(order.createdAt)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status & Actions row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Update Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 mt-4 sm:mt-6">
                            {order.customerPhone && (
                                <button onClick={openWhatsApp} title="Message on WhatsApp"
                                    className="p-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#1DA851] transition-colors">
                                    <MessageCircle className="w-5 h-5" />
                                </button>
                            )}
                            <button onClick={handleSave} disabled={saving}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors">
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                            <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Customer Info</h3>
                            {order.customerName && (
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    <span className="font-medium">{order.customerName}</span>
                                </div>
                            )}
                            {order.customerPhone && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    <span>{order.customerPhone}</span>
                                </div>
                            )}
                            {order.customerEmail && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    <span>{order.customerEmail}</span>
                                </div>
                            )}
                            {order.customerAddress && (
                                <div className="flex items-start gap-3 text-sm">
                                    <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                    <span className="whitespace-pre-line">{order.customerAddress}</span>
                                </div>
                            )}
                            {!order.customerName && !order.customerPhone && !order.customerEmail && (
                                <p className="text-slate-400 text-sm italic">No customer details provided</p>
                            )}
                        </div>

                        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                            <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Order Summary</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Items</span>
                                <span className="font-bold">{order.items?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Total Qty</span>
                                <span className="font-bold">{order.items?.reduce((s, i) => s + i.qty, 0) || 0}</span>
                            </div>

                            {/* Discount breakdown — only shown if a coupon was applied */}
                            {order.couponCode && parseFloat(order.discountAmount) > 0 ? (
                                <>
                                    <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/10 pt-2 mt-1">
                                        <span className="text-sm text-slate-500">Original Total</span>
                                        <span className="font-medium line-through text-slate-400">
                                            {sym(order.currency)} {Number(order.originalTotal).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                                            Coupon: <strong>{order.couponCode}</strong>
                                        </span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            − {sym(order.currency)} {Number(order.discountAmount).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/10 pt-2">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Amount Paid</span>
                                        <span className="font-black text-lg text-indigo-600 dark:text-indigo-400">
                                            {sym(order.currency)} {Number(order.subtotal).toFixed(2)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/10 pt-2 mt-1">
                                    <span className="text-sm text-slate-500">Total</span>
                                    <span className="font-black text-lg text-indigo-600 dark:text-indigo-400">
                                        {sym(order.currency)} {Number(order.subtotal).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Items */}
                    <div>
                        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-3">Ordered Items</h3>
                        <div className="space-y-3">
                            {(order.items || []).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]">
                                    {item.imageUrls?.[0] ? (
                                        <img src={item.imageUrls[0]} alt={item.name} className="w-14 h-14 object-cover rounded-xl" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                            <ShoppingBag className="w-6 h-6 opacity-30" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate">{item.name}</p>
                                        <p className="text-sm text-slate-500">Qty: {item.qty}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black">{sym(order.currency)} {Number(item.price).toFixed(2)}</p>
                                        <p className="text-xs text-slate-500">each</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Customer note */}
                    {order.customerNote && (
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <h3 className="font-bold text-sm text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <StickyNote className="w-4 h-4" /> Customer Note
                            </h3>
                            <p className="text-sm text-amber-800 dark:text-amber-200">{order.customerNote}</p>
                        </div>
                    )}

                    {/* Internal notes */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-2">
                            <StickyNote className="w-3.5 h-3.5" /> Internal Notes (only visible to you)
                        </label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Add private notes about this order…"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-y text-slate-900 dark:text-white placeholder-slate-400"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WaStoreOrders() {
    const { id: storeId } = useParams();
    const [orders, setOrders]       = useState([]);
    const [store, setStore]         = useState(null);
    const [loading, setLoading]     = useState(true);
    const [selected, setSelected]   = useState(null);
    const [search, setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, storesRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                }),
                axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                })
            ]);
            setOrders(ordersRes.data);
            const myStore = storesRes.data.find(s => s.id === storeId);
            if (myStore) setStore(myStore);
        } catch {
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

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
        revenue: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.subtotal), 0)
    };
    const currency = store?.currency || orders[0]?.currency || 'USD';

    return (
        <div className="space-y-6 pb-20">
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
                <div className="relative">
                    <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="pl-11 pr-8 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white appearance-none cursor-pointer min-w-[160px]"
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
                <div className="space-y-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
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
                                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group"
                            >
                                {/* Order # */}
                                <div className="min-w-[100px]">
                                    <p className="font-black text-sm text-indigo-600 dark:text-indigo-400">{order.orderNumber}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
                                </div>

                                {/* Customer */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                                        {order.customerName || <span className="italic text-slate-400">Anonymous</span>}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">{order.customerPhone || 'No phone'}</p>
                                </div>

                                {/* Items count */}
                                <div className="hidden md:block text-center min-w-[60px]">
                                    <p className="font-bold text-sm">{order.items?.length || 0}</p>
                                    <p className="text-xs text-slate-400">items</p>
                                </div>

                                {/* Amount */}
                                <div className="text-right min-w-[90px]">
                                    <p className="font-black text-base text-slate-900 dark:text-white">
                                        {sym(order.currency)} {Number(order.subtotal).toFixed(2)}
                                    </p>
                                </div>

                                {/* Status */}
                                <div className="hidden sm:block min-w-[110px] text-right">
                                    <StatusBadge status={order.status} />
                                </div>

                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
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
