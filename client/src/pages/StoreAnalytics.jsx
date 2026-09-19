import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    ShoppingBag, TrendingUp, Users, Package, DollarSign,
    Calendar, RefreshCw, ArrowUpRight, ExternalLink, Plus,
    Eye, CheckCircle2, Clock, Truck, XCircle, AlertCircle,
    ShoppingCart, Percent, Store, ArrowRight,
    ChevronDown, CreditCard, ShieldCheck, Sparkles,
    Check, Settings, Palette, Tags
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// ── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
    pending:    '#f59e0b', // amber
    confirmed:  '#6366f1', // indigo
    processing: '#3b82f6', // blue
    shipped:    '#8b5cf6', // purple
    delivered:  '#10b981', // emerald
    cancelled:  '#ef4444', // red
};

const STATUS_CONFIG = {
    pending:    { label: 'Pending', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    confirmed:  { label: 'Confirmed', bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
    processing: { label: 'Processing', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    shipped:    { label: 'Shipped', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    delivered:  { label: 'Delivered', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    cancelled:  { label: 'Cancelled', bg: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

const PRESETS = [
    { label: 'Today', days: 0 },
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
    { label: '90 Days', days: 90 },
];

function getDateRange(days) {
    const to = new Date();
    const from = new Date();
    if (days === 0) {
        from.setHours(0, 0, 0, 0);
    } else {
        from.setDate(from.getDate() - days);
    }
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
    };
}

function formatCurrency(val, currency = 'INR') {
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency || 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    } catch {
        return `${currency || '₹'} ${Number(val || 0).toLocaleString()}`;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return { date: '', time: '', full: '' };
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: '', time: '', full: '' };
        const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return { date, time, full: `${date} • ${time}` };
    } catch {
        return { date: dateStr, time: '', full: dateStr };
    }
}

// ── Custom Tooltip for Recharts ─────────────────────────────────────────────
const CustomChartTooltip = ({ active, payload, label, currency }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 p-3.5 rounded-xl shadow-2xl text-xs min-w-[170px]">
            <p className="text-slate-400 font-medium mb-2 border-b border-white/10 pb-1">{formatDate(label)}</p>
            {payload.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}
                    </span>
                    <span className="font-bold text-white">
                        {entry.dataKey === 'revenue' ? formatCurrency(entry.value, currency) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

const CustomDonutTooltip = ({ active, payload, currency }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl text-xs">
            <div className="flex items-center gap-1.5 mb-1 font-semibold" style={{ color: item.payload.fill }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.payload.fill }} />
                <span>{STATUS_CONFIG[item.name]?.label || item.name}</span>
            </div>
            <p className="text-white font-bold">{item.value} Orders</p>
        </div>
    );
};

// ── Main StoreAnalytics Component ───────────────────────────────────────────
const StoreAnalytics = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Store state
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    // Priority load: skip initial skeleton if we know they have no store
    const [storesLoading, setStoresLoading] = useState(() => localStorage.getItem('hasStore') !== 'false');

    // Data state
    const [analyticsData, setAnalyticsData] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [abandonedData, setAbandonedData] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [activePreset, setActivePreset] = useState(1); // 7 days by default
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [chartMode, setChartMode] = useState('both'); // 'revenue' | 'orders' | 'both'
    const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);

    // 1. Fetch user's stores on initial mount
    const fetchStores = useCallback(async () => {
        try {
            if (localStorage.getItem('hasStore') !== 'false') {
                setStoresLoading(true);
            }
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const list = Array.isArray(res.data) ? res.data : [];
            
            // Cache for instant loading next time
            localStorage.setItem('hasStore', list.length > 0 ? 'true' : 'false');
            
            setStores(list);
            if (list.length > 0) {
                setSelectedStore(list[0]);
            }
        } catch (err) {
            console.error('Error fetching stores:', err);
        } finally {
            setStoresLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    // 2. Fetch Analytics & Orders for the selected store
    const fetchStoreMetrics = useCallback(async (storeId, from, to) => {
        if (!storeId) return;
        setDataLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            // Fetch Analytics
            const analyticsPromise = axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/analytics`, {
                headers,
                params: { from, to }
            });

            // Fetch Recent Orders (limit 25)
            const ordersPromise = axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders`, {
                headers,
                params: { limit: 25 }
            });

            // Fetch Abandoned Cart stats
            const abandonedPromise = axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/abandoned-cart`, {
                headers
            }).catch(() => ({ data: null }));

            const [analyticsRes, ordersRes, abandonedRes] = await Promise.all([
                analyticsPromise,
                ordersPromise,
                abandonedPromise
            ]);

            setAnalyticsData(analyticsRes.data || null);
            setRecentOrders(ordersRes.data?.orders || []);
            setAbandonedData(abandonedRes?.data || null);
        } catch (err) {
            console.error('Error loading store analytics:', err);
            toast.error('Could not load store analytics');
        } finally {
            setDataLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Trigger metrics fetch when selectedStore, preset, or custom dates change
    useEffect(() => {
        if (!selectedStore?.id) return;
        if (!isCustom) {
            const range = getDateRange(PRESETS[activePreset].days);
            fetchStoreMetrics(selectedStore.id, range.from, range.to);
        }
    }, [selectedStore, activePreset, isCustom, fetchStoreMetrics]);

    const handleApplyCustom = () => {
        if (!customFrom || !customTo) {
            return toast.error('Please select both Start and End dates');
        }
        if (customFrom > customTo) {
            return toast.error('Start date cannot be after End date');
        }
        fetchStoreMetrics(selectedStore?.id, customFrom, customTo);
    };

    const handleRefresh = () => {
        if (!selectedStore?.id) return;
        setRefreshing(true);
        if (isCustom) {
            fetchStoreMetrics(selectedStore.id, customFrom, customTo);
        } else {
            const range = getDateRange(PRESETS[activePreset].days);
            fetchStoreMetrics(selectedStore.id, range.from, range.to);
        }
    };

    // Calculate core metrics
    const currency = analyticsData?.currency || selectedStore?.currency || 'INR';
    const totalOrders = analyticsData?.totalOrders || 0;
    const totalRevenue = analyticsData?.totalRevenue || 0;
    const avgOrderValue = analyticsData?.avgOrderValue || (totalOrders > 0 ? totalRevenue / totalOrders : 0);
    const storeViews = analyticsData?.storeViews || selectedStore?.views || 0;
    const totalProducts = analyticsData?.totalProducts || 0;

    // Donut chart pie data
    const pieData = useMemo(() => {
        if (!analyticsData?.statusCounts) return [];
        return Object.entries(analyticsData.statusCounts)
            .filter(([, val]) => val > 0)
            .map(([statusKey, val]) => ({
                name: statusKey,
                value: val,
                fill: STATUS_COLORS[statusKey] || '#94a3b8'
            }));
    }, [analyticsData]);

    // Top Products
    const topProducts = analyticsData?.topProducts || [];
    const maxProductRevenue = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.revenue || 0), 1) : 1;

    // If still checking stores or initially loading data
    if (storesLoading || (stores.length > 0 && !analyticsData && dataLoading)) {
        return (
            <div className="flex flex-col gap-6 animate-pulse">
                {/* Top Bar Skeleton */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-surface-dark p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-48 bg-slate-200 dark:bg-white/10 rounded-xl" />
                        <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded-lg hidden sm:block" />
                        <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-lg hidden sm:block" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-64 bg-slate-200 dark:bg-white/10 rounded-xl" />
                        <div className="h-8 w-32 bg-slate-200 dark:bg-white/10 rounded-xl" />
                        <div className="h-8 w-8 bg-slate-200 dark:bg-white/10 rounded-xl" />
                    </div>
                </div>

                {/* 6 KPI Cards Skeleton */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm h-[104px] flex flex-col justify-between">
                            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10" />
                            <div className="space-y-2 mt-auto pt-2">
                                <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded" />
                                <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Charts Area Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm p-5 h-[400px]">
                        <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded-md mb-6" />
                        <div className="h-full w-full bg-slate-100 dark:bg-white/5 rounded-xl" />
                    </div>
                    <div className="lg:col-span-1 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm p-5 h-[400px]">
                        <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded-md mb-6" />
                        <div className="flex justify-center items-center h-[250px]">
                            <div className="w-48 h-48 rounded-full border-8 border-slate-100 dark:border-white/5" />
                        </div>
                    </div>
                </div>

                {/* Recent Orders Skeleton */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm p-5">
                    <div className="h-6 w-40 bg-slate-200 dark:bg-white/10 rounded-md mb-6" />
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // If user's plan does not allow store creation
    if (user?.planDetails && user.planDetails.allowWaStore === false) {
        return (
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-8 sm:p-12 shadow-sm text-center max-w-3xl mx-auto my-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/20">
                    <Store className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    Upgrade to Unlock Online Store
                </h3>
                <p className="text-slate-500 dark:text-text-secondary text-sm max-w-lg mx-auto mb-8 leading-relaxed">
                    Your current plan does not include the Online Store module. Upgrade your plan to create a beautiful, lightning-fast storefront with instant WhatsApp checkout and deep sales analytics.
                </p>

                <button
                    onClick={() => navigate('/billing')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all text-sm"
                >
                    <ArrowUpRight className="w-4 h-4" />
                    View Upgrade Options
                </button>
            </div>
        );
    }

    // If user has no store created yet
    if (stores.length === 0) {
        return (
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-8 sm:p-12 shadow-sm text-center max-w-3xl mx-auto my-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                    <Store className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    Launch Your Online Store
                </h3>
                <p className="text-slate-500 dark:text-text-secondary text-sm max-w-lg mx-auto mb-8 leading-relaxed">
                    Create a beautiful, lightning-fast storefront with instant WhatsApp checkout, automated payment links, product variants, inventory tracking, and deep sales analytics.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-background-dark border border-slate-100 dark:border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2 font-bold text-xs">
                            <ShoppingCart className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp Checkout</p>
                        <p className="text-[11px] text-slate-500 dark:text-text-secondary mt-0.5">Direct 1-click orders sent straight to your chat</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-background-dark border border-slate-100 dark:border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2 font-bold text-xs">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Payment Gateways</p>
                        <p className="text-[11px] text-slate-500 dark:text-text-secondary mt-0.5">Collect via Razorpay, PhonePe, or Cash on Delivery</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-background-dark border border-slate-100 dark:border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2 font-bold text-xs">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Cart Recovery</p>
                        <p className="text-[11px] text-slate-500 dark:text-text-secondary mt-0.5">Automated WhatsApp recovery for abandoned checkouts</p>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/online-store')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create Your First Online Store
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* ── Top Bar: Store Switcher, Status & Date Controls ── */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-surface-dark p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                {/* Left: Store Selector & Store Links */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Store Selector Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                            className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-100 dark:bg-background-dark hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm text-slate-900 dark:text-white transition-colors"
                        >
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-xs">
                                <Store className="w-3.5 h-3.5" />
                            </div>
                            <span className="max-w-[160px] sm:max-w-[200px] truncate">{selectedStore?.name || 'My Store'}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {storeDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setStoreDropdownOpen(false)} />
                                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-30 py-1.5 overflow-hidden">
                                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Switch Store</div>
                                    {stores.map(st => (
                                        <button
                                            key={st.id}
                                            onClick={() => {
                                                setSelectedStore(st);
                                                setStoreDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-left transition-colors ${
                                                selectedStore?.id === st.id
                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <span className="truncate">{st.name}</span>
                                            {selectedStore?.id === st.id && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-2" />}
                                        </button>
                                    ))}
                                    <div className="border-t border-slate-100 dark:border-white/5 mt-1 pt-1">
                                        <button
                                            onClick={() => {
                                                setStoreDropdownOpen(false);
                                                navigate('/online-store');
                                            }}
                                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Manage All Stores</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>


                </div>

                {/* Right: Quick Access & Date Filters */}
                <div className="flex flex-col 2xl:flex-row items-center gap-3 overflow-x-auto hide-scrollbar-on-mobile max-w-full">
                    {/* Quick Access */}
                    <div className="flex items-center gap-1.5 shrink-0 2xl:pr-3 2xl:border-r border-slate-200 dark:border-white/10">
                        {[
                            { label: 'Orders', icon: ShoppingBag, path: 'orders', color: 'text-primary', bg: 'bg-primary/10' },
                            { label: 'Products', icon: Package, path: 'products', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                            { label: 'POS', icon: CreditCard, path: 'pos', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                            { label: 'Coupons', icon: Tags, path: 'coupons', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                            { label: 'Cart Recovery', icon: ShoppingCart, path: 'abandoned-cart', color: 'text-orange-500', bg: 'bg-orange-500/10' },
                            { label: 'Settings', icon: Settings, path: 'details', color: 'text-slate-500', bg: 'bg-slate-500/10' },
                        ].map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => selectedStore?.slug && navigate(`/online-store/${selectedStore.slug}/${item.path}`)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${item.bg} ${item.color} hover:opacity-80 transition-opacity shrink-0`}
                            >
                                <item.icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[11px] font-bold whitespace-nowrap">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Presets */}
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-background-dark rounded-xl border border-slate-200 dark:border-white/10">
                            {PRESETS.map((p, i) => (
                                <button
                                    key={p.label}
                                    onClick={() => {
                                        setActivePreset(i);
                                        setIsCustom(false);
                                    }}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                        !isCustom && activePreset === i
                                            ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom Range Picker */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-background-dark p-1 rounded-xl border border-slate-200 dark:border-white/10">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                            <input
                                type="date"
                                value={customFrom}
                                onChange={e => {
                                    setCustomFrom(e.target.value);
                                    setIsCustom(true);
                                }}
                                className="text-[11px] px-1 bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none w-[90px]"
                            />
                            <span className="text-slate-400 text-xs">-</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={e => {
                                    setCustomTo(e.target.value);
                                    setIsCustom(true);
                                }}
                                className="text-[11px] px-1 bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none w-[90px]"
                            />
                            {isCustom && (
                                <button
                                    onClick={handleApplyCustom}
                                    className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Apply
                                </button>
                            )}
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing || dataLoading}
                            title="Refresh Analytics"
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-background-dark hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 6 Core KPI Stat Cards in One Single Row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3">
                {/* 1. Total Revenue */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm hover:shadow transition-all group flex flex-col justify-between">
                    <div className="mb-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-text-secondary truncate" title="Total Revenue">
                            Total Revenue
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5 truncate">
                            {dataLoading ? <span className="opacity-40 animate-pulse">...</span> : formatCurrency(totalRevenue, currency)}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate font-medium">
                            {dataLoading ? '...' : `${totalOrders.toLocaleString()} ${totalOrders === 1 ? 'order' : 'orders'}`}
                        </p>
                    </div>
                </div>

                {/* 2. Total Orders */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm hover:shadow transition-all group flex flex-col justify-between">
                    <div className="mb-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-text-secondary truncate" title="Total Orders">
                            Total Orders
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5 truncate">
                            {dataLoading ? <span className="opacity-40 animate-pulse">...</span> : totalOrders.toLocaleString()}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate font-medium">
                            {dataLoading ? '...' : `${analyticsData?.statusCounts?.delivered || 0} delivered`}
                        </p>
                    </div>
                </div>

                {/* 3. Average Order Value (AOV) */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm hover:shadow transition-all group flex flex-col justify-between">
                    <div className="mb-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-text-secondary truncate" title="Avg. Order Value">
                            Avg. Order Value
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5 truncate">
                            {dataLoading ? <span className="opacity-40 animate-pulse">...</span> : formatCurrency(avgOrderValue, currency)}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate font-medium">
                            {dataLoading ? '...' : totalOrders > 0 ? `Across ${totalOrders} orders` : 'No orders yet'}
                        </p>
                    </div>
                </div>

                {/* 4. Store Visits */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm hover:shadow transition-all group flex flex-col justify-between">
                    <div className="mb-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-text-secondary truncate" title="Store Visits">
                            Store Visits
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5 truncate">
                            {dataLoading ? <span className="opacity-40 animate-pulse">...</span> : storeViews.toLocaleString()}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate font-medium">
                            All-time views
                        </p>
                    </div>
                </div>

                {/* 5. Products in Store */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm hover:shadow transition-all group flex flex-col justify-between">
                    <div className="mb-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-text-secondary truncate" title="Active Products">
                            Active Products
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5 truncate">
                            {dataLoading ? <span className="opacity-40 animate-pulse">...</span> : totalProducts.toLocaleString()}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate font-medium">
                            {dataLoading ? '...' : `${totalProducts} in catalog`}
                        </p>
                    </div>
                </div>

                {/* 6. Abandoned Carts */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-sm hover:shadow transition-all group flex flex-col justify-between">
                    <div className="mb-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-text-secondary truncate" title="Abandoned Carts">
                            Abandoned Carts
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5 truncate">
                            {dataLoading ? <span className="opacity-40 animate-pulse">...</span> : (abandonedData?.stats?.totalAbandoned || 0).toLocaleString()}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate font-medium">
                            {dataLoading ? '...' : `${abandonedData?.stats?.recovered || 0} recovered`}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Mid Row: Revenue & Orders Trend (65%) + Recent Orders (35%) ── */}
            <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
                {/* Left: Revenue & Orders Trend (65%) */}
                <div className="w-full lg:w-[calc(65%-12px)] shrink-0 bg-white dark:bg-surface-dark rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                Revenue & Orders Trend
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-0.5">
                                Daily sales velocity and order volume
                            </p>
                        </div>

                        {/* Chart metric toggle */}
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-background-dark rounded-xl border border-slate-200 dark:border-white/10 self-start sm:self-auto shrink-0">
                            <button
                                onClick={() => setChartMode('both')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    chartMode === 'both'
                                        ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setChartMode('revenue')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    chartMode === 'revenue'
                                        ? 'bg-white dark:bg-surface-dark text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Revenue
                            </button>
                            <button
                                onClick={() => setChartMode('orders')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    chartMode === 'orders'
                                        ? 'bg-white dark:bg-surface-dark text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Orders
                            </button>
                        </div>
                    </div>

                    <div className="h-72 sm:h-80 w-full mt-auto">
                        {dataLoading ? (
                            <div className="h-full w-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                            </div>
                        ) : analyticsData?.dailyTrend && analyticsData.dailyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData.dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="storeRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                        <linearGradient id="storeOrdersGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/5" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatDate}
                                        stroke="currentColor"
                                        className="text-slate-400 text-[11px]"
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        stroke="currentColor"
                                        className="text-slate-400 text-[11px]"
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                                    />
                                    {(chartMode === 'both' || chartMode === 'orders') && (
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            stroke="currentColor"
                                            className="text-slate-400 text-[11px]"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                    )}
                                    <Tooltip content={<CustomChartTooltip currency={currency} />} />
                                    {(chartMode === 'both' || chartMode === 'revenue') && (
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="revenue"
                                            name="Revenue"
                                            stroke="#10b981"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#storeRevenueGrad)"
                                        />
                                    )}
                                    {(chartMode === 'both' || chartMode === 'orders') && (
                                        <Area
                                            yAxisId={chartMode === 'both' ? 'right' : 'left'}
                                            type="monotone"
                                            dataKey="orders"
                                            name="Orders"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#storeOrdersGrad)"
                                        />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 text-sm">
                                <Package className="w-10 h-10 mb-2 stroke-[1.5] text-slate-300 dark:text-slate-600" />
                                <p>No sales activity recorded in this period</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Recent Orders (35%) */}
                <div className="w-full lg:w-[calc(35%-12px)] shrink-0 bg-white dark:bg-surface-dark rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                                Recent Orders
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-0.5">
                                Live storefront purchase activity
                            </p>
                        </div>
                        {selectedStore?.slug && (
                            <button
                                onClick={() => navigate(`/online-store/${selectedStore.slug}/orders`)}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                            >
                                <span>View All</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {recentOrders.length > 0 ? (
                        <div className="overflow-y-auto max-h-[380px] sm:max-h-[420px] pr-1 space-y-2 flex-1">
                            {recentOrders.map(ord => {
                                const stConfig = STATUS_CONFIG[ord.status] || { label: ord.status, bg: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
                                const items = Array.isArray(ord.items) ? ord.items : [];
                                const itemsSummary = items.map(i => `${i.name || 'Item'} (x${i.qty || 1})`).join(', ') || '1 item';
                                const { date, time } = formatDateTime(ord.createdAt);

                                return (
                                    <div
                                        key={ord.id}
                                        className="p-2.5 rounded-xl bg-slate-50/75 dark:bg-background-dark/50 border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 transition-all flex flex-col gap-1.5"
                                    >
                                        {/* Top Row: Order #, Status Pill, Total Amount */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-bold text-slate-900 dark:text-white text-xs tracking-tight">
                                                    {ord.orderNumber || `#${ord.id}`}
                                                </span>
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${stConfig.bg}`}>
                                                    {stConfig.label}
                                                </span>
                                            </div>
                                            <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm shrink-0">
                                                {formatCurrency(ord.total || ord.subtotal || 0, ord.currency || currency)}
                                            </span>
                                        </div>

                                        {/* Middle Row: Customer Info */}
                                        <div className="text-xs">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                {ord.customerName || 'Guest'}
                                                {ord.customerPhone && (
                                                    <span className="text-slate-400 font-normal text-[11px] ml-1.5">
                                                        ({ord.customerPhone})
                                                    </span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Bottom Row: Date & Time Kept Together + Items */}
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/5 text-[11px] text-slate-400 dark:text-slate-500 font-medium gap-2">
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                <span>{date}, {time}</span>
                                            </div>
                                            <span className="truncate text-right max-w-[140px]" title={itemsSummary}>
                                                {itemsSummary}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-72 sm:h-80 w-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                            <ShoppingBag className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                            <p className="font-semibold text-slate-600 dark:text-slate-300">No recent orders recorded</p>
                            <p className="text-slate-400 text-[11px] mt-0.5 max-w-xs">New orders placed by customers will stream directly into this feed.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Secondary Row: Status Donut Chart, Top Products Leaderboard & Abandoned Carts ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Order Status Breakdown (Donut) */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Order Fulfillment</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                            {totalOrders} Total
                        </span>
                    </div>

                    <div className="h-52 relative flex items-center justify-center">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={78}
                                        paddingAngle={3}
                                    >
                                        {pieData.map((entry, idx) => (
                                            <Cell key={`cell-${idx}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomDonutTooltip currency={currency} />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-slate-400 text-xs">
                                <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                No orders in this date range
                            </div>
                        )}

                        {/* Central counter */}
                        {pieData.length > 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{totalOrders}</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Orders</p>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-slate-100 dark:border-white/5 mt-auto">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                            const count = analyticsData?.statusCounts?.[key] || 0;
                            return (
                                <div key={key} className="flex items-center justify-between text-xs py-0.5 px-1.5 rounded hover:bg-slate-50 dark:hover:bg-white/5">
                                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[key] }} />
                                        <span className="truncate">{config.label}</span>
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-white ml-1">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Top Selling Products Leaderboard */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Top Products</h3>
                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-0.5">Ranked by revenue & volume</p>
                        </div>
                        {selectedStore?.slug && (
                            <button
                                onClick={() => navigate(`/online-store/${selectedStore.slug}/products`)}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                            >
                                <span>Catalog</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {topProducts.length > 0 ? (
                        <div className="flex-1 flex flex-col justify-center space-y-3.5">
                            {topProducts.slice(0, 5).map((prod, idx) => (
                                <div key={idx} className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <div className="flex items-center gap-1.5 max-w-[60%]">
                                            <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                                idx === 0 ? 'bg-amber-500 text-white' :
                                                idx === 1 ? 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-white' :
                                                idx === 2 ? 'bg-amber-700 text-white' :
                                                'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                                            }`}>
                                                #{idx + 1}
                                            </span>
                                            <span className="text-slate-900 dark:text-white truncate font-bold">{prod.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-slate-500 dark:text-text-secondary text-[11px] font-medium">
                                                {prod.orders} sold
                                            </span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                {formatCurrency(prod.revenue, currency)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-background-dark h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                                            style={{ width: `${Math.min(((prod.revenue || 0) / maxProductRevenue) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                            <Package className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-600" />
                            <p className="font-semibold text-slate-600 dark:text-slate-300">No product sales yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Top items will automatically appear here once customers order.</p>
                        </div>
                    )}
                </div>

                {/* 3. Abandoned Cart Details */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-orange-500" />
                                Abandoned Carts
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-0.5">Drop-offs & automated recovery</p>
                        </div>
                        {selectedStore?.slug && (
                            <button
                                onClick={() => navigate(`/online-store/${selectedStore.slug}/abandoned-cart`)}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                            >
                                <span>Manage</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20 text-center">
                            <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 block tracking-wider">Dropped</span>
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                                {abandonedData?.stats?.totalAbandoned ?? 0}
                            </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 text-center">
                            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block tracking-wider">Sent</span>
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                                {abandonedData?.stats?.reminderSent ?? 0}
                            </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-center">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block tracking-wider">Recovered</span>
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                                {abandonedData?.stats?.recovered ?? 0}
                            </span>
                        </div>
                    </div>

                    {/* Recent Pending Carts */}
                    <div className="flex flex-col gap-1.5 mb-3 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Recent Pending Carts
                        </div>
                        {abandonedData?.recentAbandoned?.length > 0 ? (
                            abandonedData.recentAbandoned.slice(0, 3).map((cart, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {cart.customerName || cart.customerPhone || 'Guest'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {new Date(cart.createdAt).toLocaleDateString()} • {cart.items?.length || 0} item{cart.items?.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="text-xs font-black text-slate-900 dark:text-white whitespace-nowrap ml-2">
                                        {currency} {cart.total?.toLocaleString()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-3 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5 border-dashed">
                                No pending carts
                            </div>
                        )}
                    </div>

                    {/* Footer Automation Status */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs mt-auto">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${abandonedData?.config?.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                                {abandonedData?.config?.enabled
                                    ? `Auto WhatsApp (${abandonedData.config.delayHours || 2}h delay)`
                                    : 'Auto WhatsApp Disabled'}
                            </span>
                        </div>
                        <button
                            onClick={() => selectedStore?.slug && navigate(`/online-store/${selectedStore.slug}/abandoned-cart`)}
                            className="text-[11px] font-bold text-primary hover:underline"
                        >
                            {abandonedData?.config?.enabled ? 'Configure' : 'Enable'}
                        </button>
                    </div>
                </div>
            </div>






        </div>
    );
};

export default StoreAnalytics;
