import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
    ShoppingCart, ToggleLeft, ToggleRight, Clock,
    CheckCircle2, AlertCircle, RefreshCw, Save, Info, TrendingUp,
    Phone, User, Send, Tag, X, MessageCircle
} from "lucide-react";


const API = import.meta.env.VITE_API_URL;

function StatCard({ icon: Icon, label, value, color, sublabel }) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-100 dark:border-white/10 flex items-start gap-4 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
                {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
            </div>
        </div>
    );
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h >= 24) return `${Math.floor(h / 24)}d ago`;
    if (h > 0) return `${h}h ${m}m ago`;
    return `${m}m ago`;
}

export default function WaStoreAbandonedCart() {
    const { storeId } = useOutletContext();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [enabled, setEnabled] = useState(false);
    const [delayHours, setDelayHours] = useState(2);
    const [templateName, setTemplateName] = useState("");
    const [couponCode, setCouponCode] = useState("");
    const [templates, setTemplates] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [selectedCart, setSelectedCart] = useState(null);


    const fetchData = async () => {
        setLoading(true);
        try {
            const cartRes = await axios.get(`${API}/api/wastore/${storeId}/abandoned-cart`);
            setData(cartRes.data);
            const cfg = cartRes.data.config || {};
            setEnabled(cfg.enabled || false);
            setDelayHours(cfg.delayHours || 2);
            setTemplateName(cfg.templateName || "");
            setCouponCode(cfg.couponCode || "");

            try {
                const tmplRes = await axios.get(`${API}/api/templates`);
                setTemplates(tmplRes.data || []);
            } catch {}

            try {
                const couponRes = await axios.get(`${API}/api/wastore/${storeId}/coupons`);
                setCoupons(couponRes.data || []);
            } catch {}
        } catch {
            toast.error("Failed to load abandoned cart data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [storeId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${API}/api/wastore/${storeId}/abandoned-cart`, {
                enabled, delayHours, templateName: templateName || null, couponCode: couponCode || null,
            });

            toast.success("Abandoned cart settings saved!");
            fetchData();
        } catch {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
    );

    const { stats, recentAbandoned } = data || {};
    const recoveryRate = stats?.reminderSent > 0
        ? Math.round((stats.recovered / stats.reminderSent) * 100)
        : 0;

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
            {selectedCart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cart Details #{selectedCart.orderNumber}</h2>
                            <button onClick={() => setSelectedCart(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/10">
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><User className="w-4 h-4 text-indigo-500"/> Customer Info</h3>
                                    <div className="space-y-1.5">
                                        <p className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-white">Name:</strong> {selectedCart.customerName || 'Guest'}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-white">Phone:</strong> {selectedCart.customerPhone}</p>
                                        {selectedCart.customerEmail && <p className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-white">Email:</strong> {selectedCart.customerEmail}</p>}
                                        {selectedCart.customerAddress && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2"><strong className="text-slate-800 dark:text-white block mb-1">Shipping Address:</strong>{selectedCart.customerAddress}</p>}
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/10">
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-indigo-500"/> Cart Summary</h3>
                                    <div className="space-y-1.5">
                                        <p className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-white">Total:</strong> {selectedCart.currency} {selectedCart.total}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-white">Status:</strong> {selectedCart.abandonedReminderSent ? <span className="text-green-600">Reminder Sent</span> : <span className="text-amber-500">Pending</span>}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-white">Created:</strong> {new Date(selectedCart.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Abandoned Items</h3>
                                <div className="space-y-3">
                                    {(!selectedCart.items || selectedCart.items.length === 0) ? (
                                        <p className="text-sm text-slate-500">No items found in this cart.</p>
                                    ) : (
                                        selectedCart.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/10">
                                                {item.imageUrls && item.imageUrls[0] ? (
                                                    <img src={item.imageUrls[0]} className="w-12 h-12 rounded-lg object-cover" alt={item.name} />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                                        <ShoppingCart className="w-5 h-5 text-slate-400"/>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{item.name}</p>
                                                    <p className="text-xs text-slate-500">Qty: {item.qty} × {selectedCart.currency} {item.price}</p>
                                                </div>
                                                <p className="font-bold text-slate-900 dark:text-white">{selectedCart.currency} {(item.qty * item.price).toFixed(2)}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-white/5">
                            <button onClick={() => {
                                const msg = encodeURIComponent(`Hi ${selectedCart.customerName || 'there'},\n\nWe noticed you left some items in your cart at our store. Would you like to complete your purchase?\n\nLet us know if you have any questions!`);
                                window.open(`https://wa.me/${selectedCart.customerPhone?.replace(/\D/g, '')}?text=${msg}`, '_blank');
                            }} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-semibold text-sm transition-colors shadow-sm">
                                <MessageCircle className="w-4 h-4"/> Message on WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Abandoned Cart Recovery</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Automatically message customers who added items to cart but did not complete checkout.
                    </p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold transition-all text-sm shrink-0 shadow-sm">
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={ShoppingCart} label="Pending Carts" value={stats?.totalAbandoned ?? 0}
                    color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" sublabel="Waiting for reminder" />
                <StatCard icon={Send} label="Reminders Sent" value={stats?.reminderSent ?? 0}
                    color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" sublabel="Via WhatsApp" />
                <StatCard icon={CheckCircle2} label="Recovered" value={stats?.recovered ?? 0}
                    color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" sublabel="Completed after reminder" />
                <StatCard icon={TrendingUp} label="Recovery Rate" value={`${recoveryRate}%`}
                    color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" sublabel="Of reminders sent" />
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900 dark:text-white">Recovery Settings</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Configure when and how the WhatsApp reminder is sent</p>
                    </div>
                    <button onClick={() => setEnabled(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                            enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"}`}>
                        {enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {enabled ? "Enabled" : "Disabled"}
                    </button>
                </div>

                <div className={`p-5 space-y-5 transition-opacity ${!enabled ? "opacity-40 pointer-events-none" : ""}`}>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            <Clock className="w-4 h-4 text-indigo-500" /> Send reminder after
                        </label>
                        <div className="flex items-center gap-3">
                            <select value={delayHours} onChange={e => setDelayHours(parseInt(e.target.value))}
                                className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                {[1, 2, 3, 4, 6, 12, 24, 48, 72].map(h => (
                                    <option key={h} value={h}>{h} hour{h !== 1 ? "s" : ""}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-400">of the order being placed without payment</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                <Send className="w-4 h-4 text-indigo-500" /> WhatsApp Template
                            </label>
                            <select value={templateName} onChange={e => setTemplateName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">- Select a template -</option>
                                {templates.map(t => (
                                    <option key={t.id || t.name} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl flex gap-2">
                                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">
                                    Template must be <strong>Meta-approved</strong> and should have 3 body variables: <strong>customer name</strong>, <strong>store name</strong>, and <strong>store URL</strong>.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                <Tag className="w-4 h-4 text-indigo-500" /> Attach Coupon (Optional)
                            </label>
                            <select value={couponCode} onChange={e => setCouponCode(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">- No automated coupon -</option>
                                {coupons.map(c => (
                                    <option key={c.id} value={c.code}>{c.code} ({c.discountType === 'percentage' ? c.discountValue + '%' : '₹' + c.discountValue})</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                                If selected, the reminder link will automatically apply this coupon at checkout to incentivize completion.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10">
                    <h2 className="font-bold text-slate-900 dark:text-white">Recent Pending Carts</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Orders placed but not yet paid (Click a row to view details)</p>
                </div>
                {!recentAbandoned || recentAbandoned.length === 0 ? (
                    <div className="p-10 text-center">
                        <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No abandoned carts found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {recentAbandoned.map(order => (
                            <div key={order.id} onClick={() => setSelectedCart(order)} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                                    <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {order.customerName || "Guest"} <span className="font-normal text-slate-400">#{order.orderNumber}</span>
                                    </p>
                                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                        <Phone className="w-3 h-3" /> {order.customerPhone}
                                        <span className="mx-1">|</span>
                                        <Clock className="w-3 h-3" /> {timeAgo(order.createdAt)}
                                        {order.items && order.items.length > 0 && (
                                            <>
                                                <span className="mx-1">|</span>
                                                <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        {order.currency || '₹'} {parseFloat(order.total || order.subtotal || 0).toFixed(2)}
                                    </p>
                                    {order.abandonedReminderSent ? (
                                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 justify-end">
                                            <CheckCircle2 className="w-3 h-3" /> Reminded
                                        </span>
                                    ) : (
                                        <span className="text-xs text-amber-500 flex items-center gap-1 justify-end">
                                            <AlertCircle className="w-3 h-3" /> Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
