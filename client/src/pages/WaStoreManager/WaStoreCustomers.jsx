import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
    Users, Search, RefreshCw, X, Mail, Phone,
    ShoppingBag, TrendingUp, UserPlus, ChevronLeft, ChevronRight,
    Calendar, MessageCircle, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL;

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
const sym = (code) => CURRENCY_SYMBOLS[code] || code;

function fmt(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">{value}</p>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{label}</p>
                {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Auth Method Badge ────────────────────────────────────────────────────────
function AuthBadge({ customer }) {
    const isWhatsApp = !customer.email && customer.phone;
    return isWhatsApp ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold border border-green-200 dark:border-green-800">
            <MessageCircle className="w-3 h-3" /> WhatsApp OTP
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-800">
            <Mail className="w-3 h-3" /> Email
        </span>
    );
}

// ─── Customer Detail Modal (Advanced UI) ──────────────────────────────────────────
function CustomerDrawer({ customer, currency, onClose }) {
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const orig = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = orig; };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
                onClick={onClose} 
            />

            {/* Modal Content - Fixed Height (h-[600px]) and larger width (max-w-4xl) */}
            <div className="relative w-full max-w-4xl h-[600px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                {/* Header Section */}
                <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-800/50 dark:to-slate-900 shrink-0">
                    <button 
                        onClick={onClose} 
                        className="absolute top-5 right-5 p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-900/20">
                            {customer.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{customer.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Joined {fmt(customer.createdAt)}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                <AuthBadge customer={customer} />
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 mt-6 -mb-4">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`pb-3 px-1 text-sm font-bold transition-colors border-b-2 ${
                                activeTab === 'overview' 
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                            }`}
                        >
                            Overview
                        </button>
                        <button 
                            onClick={() => setActiveTab('addresses')}
                            className={`pb-3 px-1 text-sm font-bold transition-colors border-b-2 ${
                                activeTab === 'addresses' 
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                            }`}
                        >
                            Addresses ({customer.savedAddresses?.length || 0})
                        </button>
                    </div>
                </div>

                {/* Body Section */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900">
                    
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <ShoppingBag className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Total Orders</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">{customer.orderCount}</p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Total Spend</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">{sym(currency)}{(customer.totalSpend || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Card */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-400" /> Contact Information
                                    </h4>
                                </div>
                                <div className="p-4 space-y-3">
                                    {customer.email && (
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                {customer.email}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Email</span>
                                        </div>
                                    )}
                                    {customer.phone && (
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center shrink-0">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                +{customer.phone}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Phone</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'addresses' && (
                        <div className="space-y-4">
                            {(!customer.savedAddresses || customer.savedAddresses.length === 0) ? (
                                <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="font-semibold text-slate-600 dark:text-slate-300">No saved addresses yet</p>
                                    <p className="text-sm text-slate-400 mt-1">Customer hasn't saved any addresses during checkout.</p>
                                </div>
                            ) : (
                                customer.savedAddresses.map((addr, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                                        <div className="pl-3">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <h5 className="font-bold text-slate-900 dark:text-white text-base">{addr.name}</h5>
                                                {addr.label && (
                                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wide">
                                                        {addr.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-1">
                                                {addr.address}
                                            </p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                {addr.city} {addr.pincode}
                                            </p>
                                            {addr.phone && (
                                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> +{addr.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-sm transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}



// ─── Main Component ───────────────────────────────────────────────────────────
export default function WaStoreCustomers() {
    const { store } = useOutletContext();
    const storeId = store?.id;

    const [customers, setCustomers]     = useState([]);
    const [summary, setSummary]         = useState({ totalCustomers: 0, newThisMonth: 0 });
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage]               = useState(1);
    const [totalPages, setTotalPages]   = useState(1);
    const [total, setTotal]             = useState(0);
    const [selected, setSelected]       = useState(null);

    const fetchCustomers = useCallback(async (p = 1, q = search) => {
        if (!storeId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: 25 });
            if (q) params.set('search', q);
            const res = await axios.get(`${API}/api/wastore/${storeId}/customers?${params}`);
            setCustomers(res.data.customers);
            setSummary(res.data.summary);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(res.data.page);
        } catch {
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    }, [storeId, search]);

    useEffect(() => { fetchCustomers(1, ''); }, [storeId]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        fetchCustomers(1, searchInput);
    };

    const handlePageChange = (newPage) => {
        fetchCustomers(newPage, search);
    };

    const currency = store?.currency || 'INR';

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-500" /> Store Customers
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Customers who have registered an account on your store.
                    </p>
                </div>
                <button
                    onClick={() => fetchCustomers(page, search)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard
                    icon={Users}
                    label="Total Registered"
                    value={summary.totalCustomers.toLocaleString()}
                    sub="All-time account registrations"
                    color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                />
                <MetricCard
                    icon={UserPlus}
                    label="New This Month"
                    value={summary.newThisMonth.toLocaleString()}
                    sub="Registered since 1st of this month"
                    color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                />
            </div>

            {/* Search + Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Search bar */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Search by name, email or phone…"
                                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                            Search
                        </button>
                        {search && (
                            <button
                                type="button"
                                onClick={() => { setSearchInput(''); setSearch(''); fetchCustomers(1, ''); }}
                                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </form>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading customers…
                    </div>
                ) : customers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                        <Users className="w-12 h-12 text-slate-200 dark:text-slate-700" />
                        <p className="font-semibold text-slate-400 dark:text-slate-500">
                            {search ? 'No customers match your search.' : 'No customers have registered yet.'}
                        </p>
                        <p className="text-sm text-slate-400 dark:text-slate-600 max-w-xs">
                            Customers appear here once they sign up via your store's login page.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700 text-left">
                                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Customer</th>
                                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Contact</th>
                                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:table-cell">Auth Method</th>
                                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Orders</th>
                                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Total Spend</th>
                                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {customers.map(c => (
                                    <tr
                                        key={c.id}
                                        onClick={() => setSelected(c)}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                                    >
                                        {/* Name */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
                                                    {c.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{c.name}</span>
                                            </div>
                                        </td>
                                        {/* Contact */}
                                        <td className="px-5 py-3.5 hidden md:table-cell">
                                            <div className="space-y-0.5">
                                                {c.email && <p className="text-slate-600 dark:text-slate-300 text-xs truncate max-w-[180px]">{c.email}</p>}
                                                {c.phone && <p className="text-slate-500 dark:text-slate-400 text-xs">+{c.phone}</p>}
                                            </div>
                                        </td>
                                        {/* Auth */}
                                        <td className="px-5 py-3.5 hidden sm:table-cell"><AuthBadge customer={c} /></td>
                                        {/* Orders */}
                                        <td className="px-5 py-3.5">
                                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                                                {c.orderCount}
                                            </span>
                                        </td>
                                        {/* Spend */}
                                        <td className="px-5 py-3.5 hidden lg:table-cell">
                                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                {sym(currency)}{c.totalSpend.toFixed(2)}
                                            </span>
                                        </td>
                                        {/* Joined */}
                                        <td className="px-5 py-3.5 hidden lg:table-cell">
                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                <Calendar className="w-3.5 h-3.5" /> {fmt(c.createdAt)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page <= 1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page >= totalPages}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Customer Drawer */}
            {selected && (
                <CustomerDrawer
                    customer={selected}
                    currency={currency}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
}
