import React, { useState, useEffect } from 'react';
import TrialBanner from '../components/TrialBanner';
import axios from 'axios';
import { ShoppingBag, Filter, ArrowUpRight, ArrowDownRight, CheckCircle, XCircle, ChevronUp, ChevronDown, UserPlus, Building2, Phone, Mail, Hash, Activity, AlertTriangle } from 'lucide-react';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';

const AdminPurchases = () => {
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({ todayRevenue: 0, totalRevenue: 0, failedTransactions: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetchData();
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases?status=${statusFilter}`);
            setTransactions(res.data);
        } catch (err) {
            console.error("Error fetching transactions:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases/stats`);
            setStats(res.data);
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    };

    const filteredTransactions = transactions.filter(t =>
        t.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.planName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.razorpayPaymentId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currencySymbol = (c) => ({ USD: '$', INR: '₹', EUR: '€', GBP: '£' }[c] || c || '₹');

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            {/* Top Bar */}
            <AdminHeader
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
            >
                <TrialBanner />
                    <ThemeToggle />
            </AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-7 sm:pb-20">

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        title="Total Revenue"
                        value={`₹${stats.totalRevenue.toLocaleString()}`}
                        icon={ArrowUpRight}
                        color="text-emerald-500"
                        bg="bg-emerald-50 dark:bg-emerald-900/20"
                    />
                    <StatCard
                        title="Today's Revenue"
                        value={`₹${stats.todayRevenue.toLocaleString()}`}
                        icon={ShoppingBag}
                        color="text-blue-500"
                        bg="bg-blue-50 dark:bg-blue-900/20"
                    />
                    <StatCard
                        title="Failed Transactions"
                        value={stats.failedTransactions}
                        icon={XCircle}
                        color="text-red-500"
                        bg="bg-red-50 dark:bg-red-900/20"
                    />
                </div>

                {/* Content Card */}
                <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

                    {/* Header: Search & Filter */}
                    <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-indigo-500" />
                            Transaction History
                        </h2>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {/* Search removed from here, now in global header */}

                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-1">
                                {['All', 'COMPLETED', 'FAILED'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${statusFilter === status
                                            ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-500 dark:text-text-secondary hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/5 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-text-secondary sticky top-0">
                                <tr>
                                    <th className="px-4 md:px-6 py-4">Transaction ID</th>
                                    <th className="px-4 md:px-6 py-4">User</th>
                                    <th className="px-4 md:px-6 py-4">Plan</th>
                                    <th className="px-4 md:px-6 py-4">Amount</th>
                                    <th className="px-4 md:px-6 py-4">Razorpay Payment ID</th>
                                    <th className="px-4 md:px-6 py-4">Status</th>
                                    <th className="px-4 md:px-6 py-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                                {loading ? (
                                    <tr><td colSpan="7" className="p-4 md:p-10 text-center text-slate-400">Loading transactions...</td></tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr><td colSpan="7" className="p-4 md:p-10 text-center text-slate-400">No transactions found.</td></tr>
                                ) : (
                                    filteredTransactions.map((t) => (
                                        <React.Fragment key={t.id}>
                                            <tr 
                                                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                                                className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-4 md:px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                    <div className={`p-1 rounded transition-colors ${expandedId === t.id ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600 dark:bg-white/5 dark:group-hover:text-slate-300'}`}>
                                                        {expandedId === t.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    </div>
                                                    {t.id.substring(0, 8)}...
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <div className="font-medium text-slate-900 dark:text-white">{t.user.name}</div>
                                                    <div className="text-xs text-slate-500">{t.user.email}</div>
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <span className="inline-block px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                                        {t.planName}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                    {t.currency === 'INR' ? '₹' : '$'}{parseFloat(t.amount).toLocaleString()}
                                                </td>
                                                <td className="px-4 md:px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                    {t.razorpayPaymentId ? (
                                                        <span
                                                            title={t.razorpayPaymentId}
                                                            className="font-mono text-xs bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 px-2 py-1 rounded cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(t.razorpayPaymentId);
                                                            }}
                                                        >
                                                            {t.razorpayPaymentId.substring(0, 16)}...
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">
                                                            {t.status === 'FAILED' ? '— (abandoned/failed)' : '— (manual)'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    {t.status === 'COMPLETED' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                            <CheckCircle className="w-3 h-3" /> Paid
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                            <XCircle className="w-3 h-3" /> Failed
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 md:px-6 py-4 text-slate-500 dark:text-slate-400">
                                                    {new Date(t.createdAt).toLocaleString()}
                                                </td>
                                            </tr>
                                            {expandedId === t.id && (
                                                <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 shadow-inner">
                                                    <td colSpan="7" className="p-0">
                                                        <div className="p-4 md:p-6 lg:p-8 animate-in slide-in-from-top-2 duration-200">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                                                
                                                                {/* User Details */}
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                        <UserPlus className="w-4 h-4" /> Customer Profile
                                                                    </h4>
                                                                    <div className="space-y-3 bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-white/5">
                                                                        <div className="flex items-center gap-2 text-sm">
                                                                            <Building2 className="w-4 h-4 text-slate-400" />
                                                                            <span className="text-slate-600 dark:text-slate-300 font-medium">Company:</span>
                                                                            <span className="text-slate-900 dark:text-white truncate" title={t.user?.companyName}>{t.user?.companyName || 'N/A'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-sm">
                                                                            <Mail className="w-4 h-4 text-slate-400" />
                                                                            <span className="text-slate-600 dark:text-slate-300 font-medium">Email:</span>
                                                                            <a href={`mailto:${t.user?.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline truncate" title={t.user?.email}>{t.user?.email}</a>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-sm">
                                                                            <Phone className="w-4 h-4 text-slate-400" />
                                                                            <span className="text-slate-600 dark:text-slate-300 font-medium">Phone:</span>
                                                                            <span className="text-slate-900 dark:text-white">{t.user?.phone || 'N/A'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5">
                                                                            <span className="text-xs text-slate-500">System ID</span>
                                                                            <span className="text-xs font-mono text-slate-400 truncate w-32" title={t.user?.id}>{t.user?.id}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Transaction Details */}
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                        <Hash className="w-4 h-4" /> Transaction Info
                                                                    </h4>
                                                                    <div className="space-y-3 bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-white/5">
                                                                        <div className="flex justify-between text-sm">
                                                                            <span className="text-slate-600 dark:text-slate-300">Amount Paid</span>
                                                                            <span className="font-bold text-slate-900 dark:text-white">{t.currency === 'INR' ? '₹' : '$'}{parseFloat(t.amount).toLocaleString()} {t.currency}</span>
                                                                        </div>
                                                                        <div className="flex justify-between text-sm">
                                                                            <span className="text-slate-600 dark:text-slate-300">Discount Applied</span>
                                                                            {t.couponCode ? (
                                                                                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                                                                    {t.couponCode} (-{t.currency === 'INR' ? '₹' : '$'}{t.discountApplied || 0})
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-xs text-slate-400">—</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex justify-between text-sm">
                                                                            <span className="text-slate-600 dark:text-slate-300">Order ID</span>
                                                                            <span className="font-mono text-xs text-slate-500 truncate w-32 text-right" title={t.razorpayOrderId}>{t.razorpayOrderId || 'N/A'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between text-sm">
                                                                            <span className="text-slate-600 dark:text-slate-300">Payment ID</span>
                                                                            <span className="font-mono text-xs text-slate-500 truncate w-32 text-right" title={t.razorpayPaymentId}>{t.razorpayPaymentId || 'N/A'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5">
                                                                            <span className="text-xs text-slate-500">Transaction ID</span>
                                                                            <span className="text-xs font-mono text-slate-400 truncate w-32 text-right" title={t.id}>{t.id}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Status & Error Logs */}
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                        <Activity className="w-4 h-4" /> Audit Log
                                                                    </h4>
                                                                    <div className="space-y-3 bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-white/5 h-full">
                                                                        {t.status === 'FAILED' ? (
                                                                            <div className="flex flex-col gap-2 h-full">
                                                                                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                                                                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                                                    <span>Payment failed or was abandoned by user at checkout.</span>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col gap-3 h-full">
                                                                                <div className="flex gap-3">
                                                                                    <div className="w-6 flex flex-col items-center">
                                                                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                                                        <div className="w-px h-full bg-slate-200 dark:bg-white/10 my-1"></div>
                                                                                    </div>
                                                                                    <div className="pb-3 text-sm">
                                                                                        <p className="font-medium text-slate-900 dark:text-white">Checkout Created</p>
                                                                                        <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleString()}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-3">
                                                                                    <div className="w-6 flex flex-col items-center">
                                                                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                                                    </div>
                                                                                    <div className="text-sm">
                                                                                        <p className="font-medium text-slate-900 dark:text-white">Payment Verified</p>
                                                                                        <p className="text-xs text-slate-500">Webhook received & validated</p>
                                                                                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(t.updatedAt).toLocaleString()}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </main>
        </div>
    );
};

const StatCard = ({ title, value, icon, color, bg }) => {
    const Icon = icon;
    return (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 md:p-6 border border-slate-200 dark:border-white/5 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">{title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${bg} ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
};

export default AdminPurchases;
