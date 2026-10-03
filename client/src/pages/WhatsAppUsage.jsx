import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    TrendingUp, DollarSign, MessageSquare, Zap, Globe, RefreshCw,
    ExternalLink, AlertCircle, CheckCircle, Clock, Phone, ShieldCheck,
    BarChart2, Activity, Info, ChevronDown
} from 'lucide-react';
import { format, fromUnixTime } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL;

// ── Color palette by conversation type ───────────────────────────────────────
const TYPE_COLORS = {
    MARKETING:     { bg: 'bg-purple-500',  text: 'text-purple-500',  hex: '#a855f7', light: '#f3e8ff' },
    UTILITY:       { bg: 'bg-blue-500',    text: 'text-blue-500',    hex: '#3b82f6', light: '#eff6ff' },
    AUTHENTICATION:{ bg: 'bg-amber-500',   text: 'text-amber-500',   hex: '#f59e0b', light: '#fffbeb' },
    SERVICE:       { bg: 'bg-emerald-500', text: 'text-emerald-500', hex: '#10b981', light: '#ecfdf5' },
    UNKNOWN:       { bg: 'bg-slate-400',   text: 'text-slate-400',   hex: '#94a3b8', light: '#f8fafc' },
};

const TIER_LABELS = {
    TIER_50:   '1K msg/day',
    TIER_250:  '10K msg/day',
    TIER_1K:   '100K msg/day',
    TIER_10K:  '1M msg/day',
    TIER_100K: 'Unlimited',
};

const QUALITY_COLOR = {
    GREEN:  'text-emerald-500',
    YELLOW: 'text-amber-500',
    RED:    'text-red-500',
    UNKNOWN:'text-slate-400',
};

// ── Small stat card ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'indigo', loading }) {
    const colorMap = {
        indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',  icon: 'text-indigo-600 dark:text-indigo-400',  border: 'border-indigo-100 dark:border-indigo-800/40' },
        purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20',  icon: 'text-purple-600 dark:text-purple-400',  border: 'border-purple-100 dark:border-purple-800/40' },
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20',icon: 'text-emerald-600 dark:text-emerald-400',border: 'border-emerald-100 dark:border-emerald-800/40' },
        amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',    icon: 'text-amber-600 dark:text-amber-400',    border: 'border-amber-100 dark:border-amber-800/40' },
        blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',      icon: 'text-blue-600 dark:text-blue-400',      border: 'border-blue-100 dark:border-blue-800/40' },
    };
    const c = colorMap[color] || colorMap.indigo;
    return (
        <div className={`rounded-2xl border ${c.border} bg-white dark:bg-[#1a2332] p-5 flex flex-col gap-3 shadow-sm`}>
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${c.icon}`} />
            </div>
            <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                {loading ? (
                    <div className="h-7 w-24 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
                ) : (
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value ?? '—'}</p>
                )}
                {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Custom tooltip for charts ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, currency }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-3 min-w-[160px]">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                        {p.dataKey === 'cost' ? `${currency} ${Number(p.value).toFixed(4)}` : Number(p.value).toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WhatsAppUsage() {
    const [period, setPeriod] = useState('30d');
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // overview | breakdown | messages

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE}/api/whatsapp/meta-analytics`, { params: { period } });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Derived metrics ───────────────────────────────────────────────────────
    const dataPoints = data?.conversationAnalytics?.data?.[0]?.data_points || [];
    const currency   = data?.currency || 'USD';

    // Aggregate totals
    const totals = dataPoints.reduce((acc, dp) => {
        acc.conversations += (dp.conversation_count || 0);
        acc.cost          += (dp.estimated_cost   || 0);
        return acc;
    }, { conversations: 0, cost: 0 });

    // By conversation type (for pie chart + breakdown table)
    const byType = {};
    dataPoints.forEach(dp => {
        const t = dp.conversation_type || 'UNKNOWN';
        if (!byType[t]) byType[t] = { conversations: 0, cost: 0 };
        byType[t].conversations += (dp.conversation_count || 0);
        byType[t].cost          += (dp.estimated_cost   || 0);
    });

    // Daily time-series for line chart
    const dailyMap = {};
    dataPoints.forEach(dp => {
        const day = dp.start ? format(fromUnixTime(dp.start), 'MMM d') : 'Unknown';
        if (!dailyMap[day]) dailyMap[day] = { day, conversations: 0, cost: 0 };
        dailyMap[day].conversations += (dp.conversation_count || 0);
        dailyMap[day].cost          += (dp.estimated_cost   || 0);
    });
    const dailyData = Object.values(dailyMap);

    // By country (top 5)
    const byCountry = {};
    dataPoints.forEach(dp => {
        if (!dp.country) return;
        if (!byCountry[dp.country]) byCountry[dp.country] = { country: dp.country, conversations: 0, cost: 0 };
        byCountry[dp.country].conversations += (dp.conversation_count || 0);
        byCountry[dp.country].cost          += (dp.estimated_cost   || 0);
    });
    const topCountries = Object.values(byCountry).sort((a, b) => b.conversations - a.conversations).slice(0, 5);

    // Pie data
    const pieData = Object.entries(byType).map(([type, d]) => ({
        name: type,
        value: d.conversations,
        cost: d.cost,
        color: TYPE_COLORS[type]?.hex || TYPE_COLORS.UNKNOWN.hex,
    }));

    // Messaging analytics (sent/delivered/read)
    const msgPoints = data?.messagingAnalytics?.data?.[0]?.data_points || [];
    const msgTotals = msgPoints.reduce((acc, dp) => {
        acc.sent      += (dp.sent      || 0);
        acc.delivered += (dp.delivered || 0);
        acc.read      += (dp.read      || 0);
        return acc;
    }, { sent: 0, delivered: 0, read: 0 });

    const wabaInfo  = data?.wabaInfo  || {};
    const phoneInfo = data?.phoneInfo || {};

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0b1117] p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-indigo-500" />
                        Usage & Spend
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Live data from Meta's WhatsApp Business API
                        <a
                            href="https://developers.facebook.com/docs/whatsapp/business-management-api/analytics"
                            target="_blank" rel="noopener noreferrer"
                            className="ml-1.5 inline-flex items-center gap-0.5 text-indigo-500 hover:underline text-xs"
                        >
                            <Info className="w-3 h-3" /> Meta Docs
                        </a>
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Period picker */}
                    <div className="relative">
                        <select
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <a
                        href="https://business.facebook.com/billing"
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a2332] text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Meta Billing
                    </a>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-4 mb-6">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Could not load analytics</p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Account info banner */}
            {!loading && !error && (wabaInfo.id || phoneInfo.id) && (
                <div className="bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 flex flex-wrap gap-x-8 gap-y-3 items-center shadow-sm">
                    {wabaInfo.name && (
                        <div className="flex items-center gap-2 text-sm">
                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                            <span className="text-slate-500 dark:text-slate-400">WABA:</span>
                            <span className="font-semibold text-slate-800 dark:text-white">{wabaInfo.name}</span>
                        </div>
                    )}
                    {wabaInfo.currency && (
                        <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            <span className="text-slate-500 dark:text-slate-400">Billing Currency:</span>
                            <span className="font-semibold text-slate-800 dark:text-white">{wabaInfo.currency}</span>
                        </div>
                    )}
                    {phoneInfo.display_phone_number && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-blue-500" />
                            <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                            <span className="font-semibold text-slate-800 dark:text-white">{phoneInfo.display_phone_number}</span>
                        </div>
                    )}
                    {phoneInfo.quality_rating && (
                        <div className="flex items-center gap-2 text-sm">
                            <ShieldCheck className={`w-4 h-4 ${QUALITY_COLOR[phoneInfo.quality_rating] || 'text-slate-400'}`} />
                            <span className="text-slate-500 dark:text-slate-400">Quality:</span>
                            <span className={`font-semibold ${QUALITY_COLOR[phoneInfo.quality_rating] || 'text-slate-400'}`}>{phoneInfo.quality_rating}</span>
                        </div>
                    )}
                    {phoneInfo.messaging_limit_tier && (
                        <div className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span className="text-slate-500 dark:text-slate-400">Limit Tier:</span>
                            <span className="font-semibold text-slate-800 dark:text-white">{TIER_LABELS[phoneInfo.messaging_limit_tier] || phoneInfo.messaging_limit_tier}</span>
                        </div>
                    )}
                    {wabaInfo.account_review_status && (
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className={`w-4 h-4 ${wabaInfo.account_review_status === 'APPROVED' ? 'text-emerald-500' : 'text-amber-500'}`} />
                            <span className="text-slate-500 dark:text-slate-400">Account Status:</span>
                            <span className={`font-semibold ${wabaInfo.account_review_status === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{wabaInfo.account_review_status}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Top stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    icon={MessageSquare} label="Total Conversations" color="indigo" loading={loading}
                    value={loading ? null : totals.conversations.toLocaleString()}
                    sub={`in last ${period}`}
                />
                <StatCard
                    icon={DollarSign} label="Estimated Spend" color="emerald" loading={loading}
                    value={loading ? null : `${currency} ${totals.cost.toFixed(4)}`}
                    sub="Approx, from Meta analytics"
                />
                <StatCard
                    icon={Activity} label="Messages Sent" color="blue" loading={loading}
                    value={loading ? null : msgTotals.sent.toLocaleString()}
                    sub={`Delivered: ${msgTotals.delivered.toLocaleString()}`}
                />
                <StatCard
                    icon={BarChart2} label="Read Rate" color="purple" loading={loading}
                    value={loading ? null : (msgTotals.delivered > 0 ? `${((msgTotals.read / msgTotals.delivered) * 100).toFixed(1)}%` : '—')}
                    sub={`${msgTotals.read.toLocaleString()} reads`}
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 rounded-2xl p-1 mb-6 w-fit shadow-sm">
                {[
                    { id: 'overview',   label: 'Daily Trend' },
                    { id: 'breakdown',  label: 'By Category' },
                    { id: 'countries',  label: 'By Country' },
                    { id: 'messages',   label: 'Messaging' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm mb-6">

                {/* Daily Trend */}
                {activeTab === 'overview' && (
                    <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5">Daily Conversations & Estimated Cost</h2>
                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : dailyData.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                <BarChart2 className="w-10 h-10 mb-2 opacity-40" />
                                <p>No conversation data for this period</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <Tooltip content={<ChartTooltip currency={currency} />} />
                                    <Legend />
                                    <Line yAxisId="left"  type="monotone" dataKey="conversations" stroke="#6366f1" strokeWidth={2} dot={false} name="Conversations" />
                                    <Line yAxisId="right" type="monotone" dataKey="cost"          stroke="#10b981" strokeWidth={2} dot={false} name="cost" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                )}

                {/* By Category */}
                {activeTab === 'breakdown' && (
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Pie */}
                        <div className="flex-shrink-0">
                            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">Conversations by Type</h2>
                            {loading ? (
                                <div className="w-56 h-56 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse mx-auto" />
                            ) : pieData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-56 text-slate-400">
                                    <AlertCircle className="w-8 h-8 mb-2" />
                                    <p className="text-sm">No data</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width={240} height={240}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
                                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        {/* Table */}
                        <div className="flex-1 overflow-x-auto">
                            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">Cost Breakdown</h2>
                            {loading ? (
                                <div className="space-y-3">
                                    {[1,2,3,4].map(i => <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />)}
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-slate-100 dark:border-white/10">
                                            <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400">Type</th>
                                            <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Conversations</th>
                                            <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Est. Cost</th>
                                            <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400 text-right">% of Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                        {Object.entries(byType).map(([type, d]) => {
                                            const c = TYPE_COLORS[type] || TYPE_COLORS.UNKNOWN;
                                            const pct = totals.conversations > 0 ? ((d.conversations / totals.conversations) * 100).toFixed(1) : '0.0';
                                            return (
                                                <tr key={type} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="py-3 flex items-center gap-2">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                                                        <span className="font-medium text-slate-700 dark:text-slate-200">{type}</span>
                                                    </td>
                                                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{d.conversations.toLocaleString()}</td>
                                                    <td className="py-3 text-right font-mono text-slate-700 dark:text-slate-200">{currency} {d.cost.toFixed(4)}</td>
                                                    <td className="py-3 text-right">
                                                        <span className="text-slate-500 dark:text-slate-400">{pct}%</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {Object.keys(byType).length === 0 && (
                                            <tr><td colSpan={4} className="py-8 text-center text-slate-400">No data for this period</td></tr>
                                        )}
                                    </tbody>
                                    {Object.keys(byType).length > 0 && (
                                        <tfoot>
                                            <tr className="border-t border-slate-200 dark:border-white/10 font-bold">
                                                <td className="pt-3 text-slate-800 dark:text-white">Total</td>
                                                <td className="pt-3 text-right text-slate-800 dark:text-white">{totals.conversations.toLocaleString()}</td>
                                                <td className="pt-3 text-right font-mono text-slate-800 dark:text-white">{currency} {totals.cost.toFixed(4)}</td>
                                                <td className="pt-3 text-right text-slate-800 dark:text-white">100%</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* By Country */}
                {activeTab === 'countries' && (
                    <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5">Top Countries by Conversations</h2>
                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : topCountries.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                                <Globe className="w-10 h-10 mb-2 opacity-40" />
                                <p>No country data available</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topCountries.map((c, i) => {
                                    const pct = totals.conversations > 0 ? (c.conversations / totals.conversations) * 100 : 0;
                                    return (
                                        <div key={c.country} className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 w-5">{i+1}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                                                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                                                        {c.country}
                                                    </span>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                        <span>{c.conversations.toLocaleString()} convs</span>
                                                        <span className="font-mono">{currency} {c.cost.toFixed(4)}</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-xs text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Messaging Analytics */}
                {activeTab === 'messages' && (
                    <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5">Message Delivery Funnel</h2>
                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Funnel stats */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {[
                                        { label: 'Sent',      value: msgTotals.sent,      color: '#6366f1', pct: 100 },
                                        { label: 'Delivered', value: msgTotals.delivered, color: '#10b981', pct: msgTotals.sent > 0 ? ((msgTotals.delivered / msgTotals.sent) * 100).toFixed(1) : 0 },
                                        { label: 'Read',      value: msgTotals.read,      color: '#3b82f6', pct: msgTotals.delivered > 0 ? ((msgTotals.read / msgTotals.delivered) * 100).toFixed(1) : 0 },
                                    ].map(m => (
                                        <div key={m.label} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 text-center border border-slate-100 dark:border-white/10">
                                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{m.value.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.label}</p>
                                            <div className="mt-2 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                                            </div>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{m.pct}%</p>
                                        </div>
                                    ))}
                                </div>
                                {/* Bar chart */}
                                {msgPoints.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={msgPoints.map(dp => ({
                                            day: dp.start ? format(fromUnixTime(dp.start), 'MMM d') : '—',
                                            Sent: dp.sent || 0,
                                            Delivered: dp.delivered || 0,
                                            Read: dp.read || 0,
                                        }))}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                            <Tooltip content={<ChartTooltip currency={currency} />} />
                                            <Legend />
                                            <Bar dataKey="Sent"      fill="#6366f1" radius={[4,4,0,0]} />
                                            <Bar dataKey="Delivered" fill="#10b981" radius={[4,4,0,0]} />
                                            <Bar dataKey="Read"      fill="#3b82f6" radius={[4,4,0,0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                        <Activity className="w-8 h-8 mb-2 opacity-40" />
                                        <p className="text-sm">Daily message data not available</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 text-xs text-amber-700 dark:text-amber-300">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                    <strong>Note:</strong> Costs shown are <em>estimated figures</em> from Meta's <code>conversation_analytics</code> and <code>pricing_analytics</code> APIs and may differ from your actual invoice.
                    For official invoices and payment management, please visit{' '}
                    <a href="https://business.facebook.com/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900 dark:hover:text-amber-100">
                        Meta Business Suite → Billing
                    </a>.
                </div>
            </div>
        </div>
    );
}
