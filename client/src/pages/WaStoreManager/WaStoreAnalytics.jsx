import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    ShoppingBag, TrendingUp, Eye, Package, DollarSign,
    Calendar, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight,
    Clock, CheckCircle, Truck, XCircle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = `${import.meta.env.VITE_API_URL}/api/wastore`;
const token = () => localStorage.getItem('token');

function fmtCurrency(val, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val || 0);
}
function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n;
}

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

// ─── Colour palettes ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
    pending:    '#f59e0b',
    confirmed:  '#6366f1',
    processing: '#3b82f6',
    shipped:    '#8b5cf6',
    delivered:  '#10b981',
    cancelled:  '#ef4444',
};
const STATUS_LABELS = {
    pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing',
    shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};
const STATUS_ICONS = {
    pending:    <Clock className="w-3.5 h-3.5" />,
    confirmed:  <CheckCircle className="w-3.5 h-3.5" />,
    processing: <RefreshCw className="w-3.5 h-3.5" />,
    shipped:    <Truck className="w-3.5 h-3.5" />,
    delivered:  <CheckCircle className="w-3.5 h-3.5" />,
    cancelled:  <XCircle className="w-3.5 h-3.5" />,
};

const CHART_GRADIENT_ORDERS  = ['#6366f1', '#a5b4fc'];
const CHART_GRADIENT_REVENUE = ['#10b981', '#6ee7b7'];
const BAR_COLORS = ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b'];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomAreaTooltip({ active, payload, label, currency }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-sm min-w-[160px] max-w-full">
            <p className="text-slate-400 mb-2 font-medium">{fmtDate(label)}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        {p.name}
                    </span>
                    <span className="font-bold text-white">
                        {p.name === 'Revenue' ? fmtCurrency(p.value, currency) : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}
function CustomBarTooltip({ active, payload, currency }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
        <div className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-sm">
            <p className="text-white font-semibold mb-1 truncate max-w-[180px] max-w-full">{d?.name}</p>
            <p className="text-indigo-400">{d?.orders} orders</p>
            <p className="text-emerald-400">{fmtCurrency(d?.revenue, currency)}</p>
        </div>
    );
}
function CustomPieTooltip({ active, payload, currency }) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-sm">
            <span style={{ color: d.payload.fill }} className="font-semibold">{STATUS_LABELS[d.name] || d.name}</span>
            <p className="text-white mt-1">{d.value} orders</p>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-white/5 ${className}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, loading }) {
    const colors = {
        indigo:  { bg: 'bg-indigo-500/10',  icon: 'text-indigo-500',  ring: 'ring-indigo-500/20' },
        emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-500', ring: 'ring-emerald-500/20' },
        violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-500',  ring: 'ring-violet-500/20' },
        amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-500',   ring: 'ring-amber-500/20' },
        sky:     { bg: 'bg-sky-500/10',     icon: 'text-sky-500',     ring: 'ring-sky-500/20' },
    };
    const c = colors[color] || colors.indigo;
    return (
        <div className="relative bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-5 overflow-hidden group hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
            {/* Gradient glow */}
            <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-30 ${c.bg}`} />
            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-8 w-24 mt-3" />
                    <Skeleton className="h-4 w-32" />
                </div>
            ) : (
                <>
                    <div className={`inline-flex p-2.5 rounded-xl ${c.bg} ring-1 ${c.ring} mb-3`}>
                        <span className={c.icon}>{icon}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
                    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
                </>
            )}
        </div>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, loading, height = 260, action }) {
    return (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm">
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{title}</h3>
                    {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
                {action}
            </div>
            {loading ? (
                <Skeleton className={`w-full`} style={{ height }} />
            ) : (
                <div style={{ height }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WaStoreAnalytics() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [preset, setPreset] = useState(1); // 7 days default
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [chartMode, setChartMode] = useState('orders'); // 'orders' | 'revenue'

    const fetchAnalytics = useCallback(async (from, to) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/${id}/analytics`, {
                headers: { 'x-auth-token': token() },
                params: { from, to }
            });
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!isCustom) {
            const r = getDateRange(PRESETS[preset].days);
            fetchAnalytics(r.from, r.to);
        }
    }, [preset, isCustom, fetchAnalytics]);

    function applyCustom() {
        if (!customFrom || !customTo) return toast.error('Select both dates');
        if (customFrom > customTo) return toast.error('Start date must be before end date');
        fetchAnalytics(customFrom, customTo);
    }

    // Build pie chart data
    const pieData = data ? Object.entries(data.statusCounts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k, value: v, fill: STATUS_COLORS[k] }))
        : [];

    const currency = data?.currency || 'USD';

    // Compute total orders label for donut centre
    const totalInPie = pieData.reduce((s, d) => s + d.value, 0);

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Store Analytics</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {data ? `${fmtDate(data.dateRange.from)} – ${fmtDate(data.dateRange.to)}` : 'Loading...'}
                    </p>
                </div>

                {/* Date Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {PRESETS.map((p, i) => (
                        <button
                            key={p.label}
                            onClick={() => { setPreset(i); setIsCustom(false); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                !isCustom && preset === i
                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}

                    {/* Custom range */}
                    <div className="flex items-center gap-1.5 ml-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="date"
                            value={customFrom}
                            onChange={e => { setCustomFrom(e.target.value); setIsCustom(true); }}
                            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-slate-400 text-xs">–</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={e => { setCustomTo(e.target.value); setIsCustom(true); }}
                            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {isCustom && (
                            <button
                                onClick={applyCustom}
                                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
                            >
                                Apply
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (isCustom) applyCustom();
                            else { const r = getDateRange(PRESETS[preset].days); fetchAnalytics(r.from, r.to); }
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                        title="Refresh"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard
                    loading={loading}
                    icon={<ShoppingBag className="w-5 h-5" />}
                    label="Total Orders"
                    value={loading ? '—' : fmtNum(data?.totalOrders)}
                    color="indigo"
                />
                <KpiCard
                    loading={loading}
                    icon={<DollarSign className="w-5 h-5" />}
                    label="Total Revenue"
                    value={loading ? '—' : fmtCurrency(data?.totalRevenue, currency)}
                    color="emerald"
                />
                <KpiCard
                    loading={loading}
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Avg Order Value"
                    value={loading ? '—' : fmtCurrency(data?.avgOrderValue, currency)}
                    color="violet"
                />
                <KpiCard
                    loading={loading}
                    icon={<Eye className="w-5 h-5" />}
                    label="Store Visits"
                    value={loading ? '—' : fmtNum(data?.storeViews)}
                    sub="All-time total"
                    color="sky"
                />
                <KpiCard
                    loading={loading}
                    icon={<Package className="w-5 h-5" />}
                    label="Products"
                    value={loading ? '—' : fmtNum(data?.totalProducts)}
                    sub="In catalogue"
                    color="amber"
                />
            </div>

            {/* ── Trend Chart (full width) ── */}
            <ChartCard
                title="Performance Over Time"
                subtitle="Daily orders and revenue for the selected period"
                loading={loading}
                height={300}
                action={
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                        <button
                            onClick={() => setChartMode('orders')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                chartMode === 'orders' ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >Orders</button>
                        <button
                            onClick={() => setChartMode('revenue')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                chartMode === 'revenue' ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >Revenue</button>
                        <button
                            onClick={() => setChartMode('both')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                chartMode === 'both' ? 'bg-white dark:bg-white/10 text-slate-700 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >Both</button>
                    </div>
                }
            >
                {data?.dailyTrend && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.dailyTrend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={fmtDate}
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                yAxisId="orders"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                hide={chartMode === 'revenue'}
                            />
                            <YAxis
                                yAxisId="revenue"
                                orientation="right"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => fmtCurrency(v, currency)}
                                hide={chartMode === 'orders'}
                            />
                            <Tooltip content={<CustomAreaTooltip currency={currency} />} />
                            {(chartMode === 'orders' || chartMode === 'both') && (
                                <Area
                                    yAxisId="orders"
                                    type="monotone"
                                    dataKey="orders"
                                    name="Orders"
                                    stroke="#6366f1"
                                    strokeWidth={2.5}
                                    fill="url(#gradOrders)"
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                                />
                            )}
                            {(chartMode === 'revenue' || chartMode === 'both') && (
                                <Area
                                    yAxisId="revenue"
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Revenue"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fill="url(#gradRevenue)"
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            {/* ── Bottom Row: Status Donut + Top Products Bar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Donut — Status Breakdown */}
                <ChartCard
                    title="Order Status Breakdown"
                    subtitle="Distribution of orders by current status"
                    loading={loading}
                    height={280}
                >
                    {data && (
                        pieData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <AlertCircle className="w-10 h-10 mb-3 opacity-40" />
                                <p className="text-sm font-medium">No orders in this period</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 h-full">
                                <ResponsiveContainer width="55%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="58%"
                                            outerRadius="80%"
                                            paddingAngle={3}
                                            dataKey="value"
                                            strokeWidth={0}
                                        >
                                            {pieData.map((entry, i) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip currency={currency} />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Legend */}
                                <div className="flex-1 space-y-2.5">
                                    {pieData.map(item => (
                                        <div key={item.name} className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.fill }} />
                                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                                                    {STATUS_LABELS[item.name]}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">{item.value}</span>
                                                <span className="text-xs text-slate-400">
                                                    {totalInPie > 0 ? Math.round((item.value / totalInPie) * 100) : 0}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </ChartCard>

                {/* Bar — Top Products */}
                <ChartCard
                    title="Top Products"
                    subtitle="Best-selling products by quantity ordered"
                    loading={loading}
                    height={280}
                >
                    {data && (
                        data.topProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Package className="w-10 h-10 mb-3 opacity-40" />
                                <p className="text-sm font-medium">No product orders yet</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={data.topProducts}
                                    layout="vertical"
                                    margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
                                    barSize={14}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={100}
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={v => v.length > 13 ? v.slice(0, 13) + '…' : v}
                                    />
                                    <Tooltip content={<CustomBarTooltip currency={currency} />} />
                                    <Bar dataKey="orders" name="Orders" radius={[0, 6, 6, 0]}>
                                        {data.topProducts.map((_, i) => (
                                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )
                    )}
                </ChartCard>
            </div>

            {/* ── Status Detail Cards ── */}
            {!loading && data && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Object.entries(data.statusCounts).map(([key, count]) => (
                        <div
                            key={key}
                            className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                        >
                            <div
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2"
                                style={{ background: STATUS_COLORS[key] + '20', color: STATUS_COLORS[key] }}
                            >
                                {STATUS_ICONS[key]}
                            </div>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{count}</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">{key}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
