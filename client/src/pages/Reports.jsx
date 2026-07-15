import { useState, useEffect, useRef } from 'react';
import TrialBanner from '../components/TrialBanner';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserDropdown from '../components/UserDropdown';
import {
    Calendar, Download, ChevronDown, Send, CheckCircle2, Eye, AlertCircle,
    BarChart3, X, Loader2, Search, Check, Menu, TrendingUp, TrendingDown,
    Clock, Users, FileText, Target, Zap, Activity, Award, Filter,
    Sparkles, Megaphone, GitMerge, MousePointerClick, DollarSign,
    Play, Pause, ArrowRight, Bot, Hash, Layers, BarChart2
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, RadialBarChart, RadialBar, Legend
} from 'recharts';

const API = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

// ─── Searchable Dropdown ─────────────────────────────────────────────────────
const SearchableDropdown = ({ options, value, onChange, placeholder = 'Select...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const ref = useRef(null);
    const filtered = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
    const selected = options.find(o => o.value === value);
    useEffect(() => {
        const handler = e => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    return (
        <div className="relative" ref={ref}>
            <button onClick={() => { setIsOpen(!isOpen); setSearchTerm(''); }}
                className="flex items-center justify-between w-full md:min-w-[220px] max-w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none hover:border-indigo-400 transition-colors shadow-sm">
                <span className="truncate max-w-[160px] max-w-full">{selected ? selected.label : placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full md:min-w-[220px] max-w-full bg-white dark:bg-surface-dark rounded-xl shadow-2xl border border-slate-100 dark:border-white/10 z-50 overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-white/5">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                autoFocus className="w-full bg-slate-50 dark:bg-background-dark border-none rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none" />
                        </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1">
                        {filtered.length > 0 ? filtered.map(opt => (
                            <button key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg text-left transition-colors ${value === opt.value ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                <span className="truncate">{opt.label}</span>
                                {value === opt.value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                            </button>
                        )) : (
                            <div className="px-3 py-4 text-center text-xs text-slate-400">No results found.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── KPI Metric Card ─────────────────────────────────────────────────────────
const MetricCard = ({ icon, label, value, sub, color, trend, trendUp }) => {
    const Icon = icon;
    return (
        <div className={`relative bg-white dark:bg-surface-dark rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300`}>
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${color} rounded-2xl`} />
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
                    <Icon className={`w-4.5 h-4.5 ${color.replace('bg-', 'text-')}`} />
                </div>
                {trend !== undefined && (
                    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${trendUp ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'}`}>
                        {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {trend}%
                    </span>
                )}
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
        </div>
    );
};

// ─── Hour Heatmap ────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => {
    const h = i % 12 || 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    return i === 0 ? '12 AM' : i === 12 ? '12 PM' : `${h} ${ampm}`;
});

const HourHeatmap = ({ data: rawData }) => {
    const data = (rawData && rawData.length > 0) ? rawData : [];
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Best Send Hours</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hourly message volume — darker = more active</p>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
            </div>
            <div className="flex gap-1 flex-wrap">
                {data.map((d, i) => {
                    const intensity = d.count / max;
                    const bg = intensity > 0.8 ? 'bg-indigo-600' : intensity > 0.6 ? 'bg-indigo-500' : intensity > 0.4 ? 'bg-indigo-400' : intensity > 0.2 ? 'bg-indigo-200 dark:bg-indigo-800' : 'bg-slate-100 dark:bg-white/5';
                    return (
                        <div key={i} className="group relative flex flex-col items-center gap-1" style={{ width: 'calc(100% / 24 - 4px)' }}>
                            <div className={`w-full h-10 rounded-lg ${bg} transition-all duration-200 group-hover:scale-110 cursor-default`} />
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 hidden lg:block whitespace-nowrap overflow-hidden" style={{ maxWidth: '100%', fontSize: '7px' }}>
                                {i % 3 === 0 ? (i === 0 ? '12A' : i === 12 ? '12P' : `${(i % 12) || 12}${i < 12 ? 'A' : 'P'}`) : ''}
                            </span>
                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-slate-900 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10 flex-col items-center shadow-xl">
                                <span className="font-bold">{HOURS[i]}</span>
                                <span>{d.count} msgs</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-[10px] text-slate-400">Low</span>
                {['bg-slate-100 dark:bg-white/5', 'bg-indigo-200 dark:bg-indigo-800', 'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-600'].map((c, i) => (
                    <div key={i} className={`w-4 h-3 rounded ${c}`} />
                ))}
                <span className="text-[10px] text-slate-400">High</span>
            </div>
        </div>
    );
};

// ─── Template Breakdown ──────────────────────────────────────────────────────
const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'];

const TemplateBreakdown = ({ reports }) => {
    const templateMap = {};
    (reports || []).forEach(c => {
        const name = c.templateName || c.template || 'Untagged';
        if (!templateMap[name]) templateMap[name] = { name, sent: 0, delivered: 0, read: 0, failed: 0 };
        templateMap[name].sent += c.audience || 0;
        templateMap[name].delivered += c.delivered || 0;
        templateMap[name].read += c.read || 0;
        templateMap[name].failed += c.failed || 0;
    });
    const data = Object.values(templateMap).slice(0, 6).map(t => ({
        ...t,
        readRate: t.sent > 0 ? Math.round((t.read / t.sent) * 100) : 0
    })).sort((a, b) => b.readRate - a.readRate);

    if (data.length === 0) return null;

    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Top Templates by Read Rate</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Which message templates get read the most</p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
            </div>
            <div className="space-y-3">
                {data.map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: COLORS[i % COLORS.length] }}>
                            {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{t.name}</span>
                                <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: COLORS[i % COLORS.length] }}>{t.readRate}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${t.readRate}%`, background: COLORS[i % COLORS.length] }} />
                            </div>
                            <div className="flex gap-3 mt-1">
                                <span className="text-[10px] text-slate-400">{t.sent.toLocaleString()} sent</span>
                                <span className="text-[10px] text-green-500">{t.delivered.toLocaleString()} delivered</span>
                                {t.failed > 0 && <span className="text-[10px] text-red-400">{t.failed.toLocaleString()} failed</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Engagement Score Ring ────────────────────────────────────────────────────
const EngagementScore = ({ stats }) => {
    const score = stats ? Math.round((parseFloat(stats.deliveryRate || 0) * 0.5) + (parseFloat(stats.readRate || 0) * 0.5)) : 0;
    const clr = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
    const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Good' : 'Needs Work';
    const radialData = [{ name: 'Score', value: score, fill: clr }];
    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-4">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Engagement Score</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Combined delivery & read metric</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
            </div>
            <div className="relative w-44 h-44">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={225} endAngle={-45} data={[{ value: 100, fill: '#f1f5f9' }, ...radialData]}>
                        <RadialBar dataKey="value" cornerRadius={8} background={false} />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black" style={{ color: clr }}>{score}</span>
                    <span className="text-xs font-bold" style={{ color: clr }}>{label}</span>
                </div>
            </div>
            <div className="w-full mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="text-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Delivery</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{stats?.deliveryRate || 0}%</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Read</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{stats?.readRate || 0}%</p>
                </div>
            </div>
        </div>
    );
};

// ─── Message Status Donut ─────────────────────────────────────────────────────
const StatusDonut = ({ stats }) => {
    if (!stats) return null;
    const total = stats.totalMessages || 1;
    const delivered = stats.deliveredCount || 0;
    const read = stats.readCount || 0;
    const failed = stats.failedCount || 0;
    const pending = Math.max(0, total - delivered - failed);
    const data = [
        { name: 'Read', value: read, color: '#6366f1' },
        { name: 'Delivered', value: Math.max(0, delivered - read), color: '#22c55e' },
        { name: 'Failed', value: failed, color: '#ef4444' },
        { name: 'Pending', value: pending, color: '#e2e8f0' },
    ].filter(d => d.value > 0);
    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Status Breakdown</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All messages distribution</p>
                </div>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="w-32 h-32 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="value">
                                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                    {data.map((d, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                                <span className="text-xs text-slate-600 dark:text-slate-400">{d.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{d.value.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 ml-1">({Math.round((d.value / total) * 100)}%)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── AI Analytics Tab ────────────────────────────────────────────────────────
const AiAnalyticsTab = ({ stats }) => {
    if (!stats) return <div className="p-8 text-center text-slate-500">Loading AI stats...</div>;
    if (!stats.hasHistory) return <div className="p-8 text-center text-slate-500">No AI usage history found.</div>;
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={Sparkles} label="Tokens Used" value={stats.summary.totalUsed.toLocaleString()} color="bg-violet-500" />
                <MetricCard icon={Activity} label="Balance Remaining" value={stats.summary.currentBalance.toLocaleString()} color="bg-indigo-500" />
                <MetricCard icon={TrendingUp} label="Peak Daily Usage" value={stats.summary.peakDayUsage.toLocaleString()} color="bg-emerald-500" />
                <MetricCard icon={Activity} label="Usage Ratio" value={`${stats.summary.usagePercent}%`} color="bg-blue-500" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4">Feature Breakdown</h3>
                    <div className="space-y-3">
                        {stats.featureBreakdown.map(f => (
                            <div key={f.key}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{f.name}</span>
                                    <span className="font-bold" style={{ color: f.color }}>{f.tokens.toLocaleString()} tokens ({f.percent}%)</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.percent}%`, background: f.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Meta Ads Tab (Rich Analytics) ─────────────────────────────────────────
const MetaAdsTab = ({ ads }) => {
    if (!ads) return <div className="p-8 text-center text-slate-500">Loading Ads...</div>;

    const { summary = {}, campaigns = [] } = ads;

    if (campaigns.length === 0 && !summary.totalCampaigns) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No Meta Ad campaigns found.</p>
        </div>
    );

    const fmtNum = (n) => n !== null && n !== undefined ? Number(n).toLocaleString() : '—';
    const fmtCurrency = (n) => n !== null && n !== undefined ? `$${Number(n).toFixed(2)}` : '—';

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[{
                    icon: Eye, label: 'Total Impressions', value: fmtNum(summary.totalImpressions), color: 'indigo',
                    bgClass: 'bg-indigo-50 dark:bg-indigo-500/10', iconClass: 'text-indigo-500'
                }, {
                    icon: MousePointerClick, label: 'Total Clicks', value: fmtNum(summary.totalClicks), color: 'emerald',
                    bgClass: 'bg-emerald-50 dark:bg-emerald-500/10', iconClass: 'text-emerald-500'
                }, {
                    icon: DollarSign, label: 'Total Spend', value: fmtCurrency(summary.totalSpend), color: 'rose',
                    bgClass: 'bg-rose-50 dark:bg-rose-500/10', iconClass: 'text-rose-500'
                }, {
                    icon: Target, label: 'Avg CTR', value: summary.avgCtr ? `${summary.avgCtr}%` : '—', color: 'amber',
                    bgClass: 'bg-amber-50 dark:bg-amber-500/10', iconClass: 'text-amber-500'
                }].map((kpi, i) => (
                    <div key={i} className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-5 border border-slate-100 dark:border-white/5 shadow-sm">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${kpi.bgClass}`}>
                            <kpi.icon className={`w-4 h-4 ${kpi.iconClass}`} />
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{kpi.value}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</div>
                    </div>
                ))}
            </div>

            {/* Connection status */}
            {!summary.hasLiveConnection && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Showing cached data. Connect your Facebook Ads account in CTWA Analytics for live metrics.
                </div>
            )}

            {/* Campaign Performance Table */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Campaign Performance</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-background-dark/60 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-5 py-3">Campaign Name</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Budget/day</th>
                                <th className="px-4 py-3 text-right">Impressions</th>
                                <th className="px-4 py-3 text-right">Reach</th>
                                <th className="px-4 py-3 text-right">Clicks</th>
                                <th className="px-4 py-3 text-right">Spend</th>
                                <th className="px-4 py-3 text-right">CTR</th>
                                <th className="px-4 py-3 text-right">CPC</th>
                                <th className="px-4 py-3 text-right">Freq.</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                            {campaigns.map(ad => (
                                <tr key={ad.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-semibold text-slate-900 dark:text-white">{ad.campaignName}</div>
                                        {ad.metaCampaignId && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{ad.metaCampaignId}</div>}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                                            ad.status?.includes('Active') || ad.status === 'Published'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : ad.status === 'Draft'
                                                    ? 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                            {(ad.status?.includes('Active') || ad.status === 'Published') && <Play className="w-2.5 h-2.5" />}
                                            {ad.status === 'Draft' && <Pause className="w-2.5 h-2.5" />}
                                            {ad.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">${ad.dailyBudget}</td>
                                    <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-200 font-medium">{fmtNum(ad.impressions)}</td>
                                    <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-200 font-medium">{fmtNum(ad.reach)}</td>
                                    <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-200 font-medium">{fmtNum(ad.clicks)}</td>
                                    <td className="px-4 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">{fmtCurrency(ad.spend)}</td>
                                    <td className="px-4 py-4 text-right">
                                        {ad.ctr ? (
                                            <span className={`font-medium ${parseFloat(ad.ctr) >= 1 ? 'text-emerald-500' : 'text-slate-500'}`}>{ad.ctr}%</span>
                                        ) : <span className="text-slate-400">—</span>}
                                    </td>
                                    <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{fmtCurrency(ad.cpc)}</td>
                                    <td className="px-4 py-4 text-right text-slate-500 dark:text-slate-400">{ad.frequency ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── FlowBots Tab (Rich Analytics) ─────────────────────────────────────────
const FlowBotsTab = ({ flows }) => {
    if (!flows) return <div className="p-8 text-center text-slate-500">Loading FlowBots...</div>;

    const { summary = {}, flows: flowList = [], dailyData = [] } = flows;

    if (flowList.length === 0 && !summary.totalFlows) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <GitMerge className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No FlowBots found. Create your first flow to see analytics here.</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[{
                    icon: Zap, label: 'Total Triggers', value: (summary.totalTriggers || 0).toLocaleString(),
                    bgClass: 'bg-indigo-50 dark:bg-indigo-500/10', iconClass: 'text-indigo-500'
                }, {
                    icon: Users, label: 'Unique Contacts', value: (summary.totalUniqueContacts || 0).toLocaleString(),
                    bgClass: 'bg-emerald-50 dark:bg-emerald-500/10', iconClass: 'text-emerald-500'
                }, {
                    icon: CheckCircle2, label: 'Completion Rate', value: `${summary.overallCompletionRate || 0}%`,
                    bgClass: 'bg-amber-50 dark:bg-amber-500/10', iconClass: 'text-amber-500'
                }, {
                    icon: Activity, label: 'Active Flows', value: `${summary.activeFlowsCount || 0} / ${summary.totalFlows || 0}`,
                    bgClass: 'bg-violet-50 dark:bg-violet-500/10', iconClass: 'text-violet-500'
                }].map((kpi, i) => (
                    <div key={i} className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-5 border border-slate-100 dark:border-white/5 shadow-sm">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${kpi.bgClass}`}>
                            <kpi.icon className={`w-4 h-4 ${kpi.iconClass}`} />
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{kpi.value}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</div>
                    </div>
                ))}
            </div>

            {/* Daily Trigger Volume Chart */}
            {dailyData.length > 1 && (
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Daily Trigger Volume</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Flow triggers & completions over time</p>
                        </div>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                            <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData} margin={{ top: 0, right: 5, left: -30, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="flowTriggersGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="flowCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-white/10" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="triggers" name="Triggers" stroke="#6366f1" fill="url(#flowTriggersGrad)" strokeWidth={2} />
                                <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="url(#flowCompletedGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Per-Flow Performance Table */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Per-Flow Performance</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{flowList.length} flow{flowList.length !== 1 ? 's' : ''} configured</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-background-dark/60 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-5 py-3">Flow Name</th>
                                <th className="px-4 py-3">Trigger</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Triggers</th>
                                <th className="px-4 py-3 text-right">Contacts</th>
                                <th className="px-4 py-3 text-right">Completion</th>
                                <th className="px-4 py-3 text-right">Last Triggered</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                            {flowList.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-semibold text-slate-900 dark:text-white">{f.name}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{f.nodeCount || 0} nodes</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="inline-flex items-center gap-1 font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                                            <Hash className="w-3 h-3" />
                                            {f.isAny ? 'Any Message' : (f.triggerKeyword || '—')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${f.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'}`}>
                                            {f.isActive ? <><Play className="w-2.5 h-2.5" /> Active</> : <><Pause className="w-2.5 h-2.5" /> Draft</>}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right font-bold text-slate-800 dark:text-white">{(f.triggered || 0).toLocaleString()}</td>
                                    <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{(f.uniqueContacts || 0).toLocaleString()}</td>
                                    <td className="px-4 py-4 text-right">
                                        {f.triggered > 0 ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="h-1.5 w-14 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${f.completionRate}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{f.completionRate}%</span>
                                            </div>
                                        ) : <span className="text-slate-400 text-xs">—</span>}
                                    </td>
                                    <td className="px-4 py-4 text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {f.lastTriggered ? new Date(f.lastTriggered).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── Main Reports Page ────────────────────────────────────────────────────────
const Reports = () => {
    const [timeRange, setTimeRange] = useState('30d');
    const [displayRange, setDisplayRange] = useState('Last 30 Days');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeLines, setActiveLines] = useState({ sent: true, read: true, failed: true });
    const [campaignsList, setCampaignsList] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState('all');
    
    // New Tabs State
    const [activeTab, setActiveTab] = useState('messaging');
    const [aiStats, setAiStats] = useState(null);
    const [metaAds, setMetaAds] = useState(null);
    const [flowBots, setFlowBots] = useState(null);
    const [loadingExtras, setLoadingExtras] = useState(false);

    useEffect(() => {
        axios.get(`${API}/api/messages`, { headers: { } })
            .then(res => {
                setCampaignsList([
                    { value: 'all', label: 'All Campaigns' },
                    ...res.data.map(c => ({ value: c.id, label: c.campaignName || c.Template?.name || 'Untitled Campaign' }))
                ]);
            }).catch(() => { });
    }, []);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const params = { range: timeRange, campaignId: selectedCampaignId };
                if (timeRange === 'custom') {
                    if (!customStart || !customEnd) { setLoading(false); return; }
                    params.startDate = customStart;
                    params.endDate = customEnd;
                }
                const headers = { 'Authorization': `Bearer ${token}` };
                const [s, c, r] = await Promise.all([
                    axios.get(`${API}/api/dashboard/stats`, { params, headers }),
                    axios.get(`${API}/api/dashboard/chart`, { params, headers }),
                    axios.get(`${API}/api/dashboard/campaign-reports`, { params, headers }),
                ]);
                setStats(s.data); setChartData(c.data); setReports(r.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch();
    }, [timeRange, customStart, customEnd, selectedCampaignId]);

    const handleRangeChange = e => {
        const val = e.target.value;
        setTimeRange(val);
        if (val === 'custom') { setDisplayRange('Custom Range'); setShowCustomPicker(true); }
        else { setDisplayRange(e.target.options[e.target.selectedIndex].text); setShowCustomPicker(false); }
    };

    const formatDate = d => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

    // Hour heatmap from backend stats
    const hourData = stats?.hourlyDistribution || [];

    // Day-of-week breakdown from chart
    const dowMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    chartData.forEach(d => {
        const day = new Date(d.name).toLocaleDateString('en-US', { weekday: 'short' });
        if (day in dowMap) dowMap[day] = (dowMap[day] || 0) + (d.messages || 0);
    });
    const dowData = Object.entries(dowMap).map(([day, count]) => ({ day, count }));

    useEffect(() => {
        const fetchExtras = async () => {
            if (activeTab === 'messaging') return;
            setLoadingExtras(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };
                
                if (activeTab === 'ai' && !aiStats) {
                    const res = await axios.get(`${API}/api/dashboard/ai-token-history?range=${timeRange}`, { headers });
                    setAiStats(res.data);
                } else if (activeTab === 'meta-ads') {
                    const rangeMap = { '1d': '1d', '7d': '7d', '30d': '30d', '3m': '3m', 'custom': '30d' };
                    const res = await axios.get(`${API}/api/meta-ads/insights?range=${rangeMap[timeRange] || '30d'}`, { headers });
                    setMetaAds(res.data);
                } else if (activeTab === 'flowbots') {
                    const res = await axios.get(`${API}/api/flows/stats?range=${timeRange}`, { headers });
                    setFlowBots(res.data);
                }
            } catch (err) {
                console.error('Error fetching extra tab data:', err);
            } finally {
                setLoadingExtras(false);
            }
        };
        fetchExtras();
    }, [activeTab, timeRange]);

    const TABS = [
        { id: 'messaging', label: 'Messaging', icon: Send },
        { id: 'ai', label: 'AI Analytics', icon: Sparkles },
        { id: 'meta-ads', label: 'Meta Ads', icon: Megaphone },
        { id: 'flowbots', label: 'FlowBots', icon: GitMerge }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark overflow-hidden transition-colors duration-300 relative">

            {/* Custom Date Picker */}
            {showCustomPicker && (
                <div className="absolute top-20 right-6 z-50 bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col gap-3 w-72">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Custom Date Range</h4>
                        <button onClick={() => setShowCustomPicker(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    {['Start Date', 'End Date'].map((lbl, i) => (
                        <div key={lbl} className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{lbl}</label>
                            <input type="date"
                                className="bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                value={i === 0 ? customStart : customEnd}
                                onChange={e => i === 0 ? setCustomStart(e.target.value) : setCustomEnd(e.target.value)} />
                        </div>
                    ))}
                </div>
            )}

            {/* Header */}
            <header className="hidden md:flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-4 md:px-6 py-4 bg-white dark:bg-background-dark shrink-0">
                <div className="flex items-center gap-6 w-full">
                    <div className="flex items-center rounded-xl bg-slate-100 dark:bg-surface-dark h-10 w-full max-w-md px-3 border border-transparent focus-within:border-indigo-500 transition-colors">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search reports..." className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none ml-2" />
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                    <TrialBanner />
                    <ThemeToggle /><NotificationBell /><UserDropdown />
                </div>
            </header>

            {/* Sub-header with Filters */}
            <div className="px-4 md:px-6 py-5 border-b border-slate-200 dark:border-surface-dark bg-white dark:bg-background-dark/80 shrink-0">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Analytics & Reports</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Deep insights across all your active channels</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {activeTab === 'messaging' && (
                            <SearchableDropdown options={campaignsList} value={selectedCampaignId} onChange={setSelectedCampaignId} placeholder="All Campaigns" />
                        )}
                        <div className="relative">
                            <select onChange={handleRangeChange} value={timeRange}
                                className="appearance-none bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-sm rounded-xl pl-4 pr-8 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                                <option value="1d">Last 24H</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="3m">Last 3 Months</option>
                                <option value="custom">Custom Range</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl px-5 py-2.5 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                            <Download className="w-4 h-4" />Export CSV
                        </button>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex overflow-x-auto hide-scrollbar gap-2 mt-6 pb-1 border-b border-slate-200 dark:border-white/10">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap ${
                                    isActive 
                                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
                {activeTab === 'messaging' && (
                    <>
                        {loading && !stats ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">Loading analytics...</p>
                            </div>
                        ) : (
                            <div className="space-y-8 pb-10">

                        {/* ── Row 1: KPI Strip ────────────────────────────── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard icon={Send} label="Total Sent" value={(stats?.totalMessages || 0).toLocaleString()} sub={displayRange} color="bg-indigo-500" />
                            <MetricCard icon={CheckCircle2} label="Delivered" value={(stats?.deliveredCount || 0).toLocaleString()} sub={`${stats?.deliveryRate || 0}% delivery rate`} color="bg-green-500" />
                            <MetricCard icon={Eye} label="Messages Read" value={(stats?.readCount || 0).toLocaleString()} sub={`${stats?.readRate || 0}% read rate`} color="bg-blue-500" />
                            <MetricCard icon={AlertCircle} label="Failed" value={(stats?.failedCount || 0).toLocaleString()} sub="Undelivered messages" color="bg-red-500" />
                        </div>

                        {/* ── Row 2: Area Chart + Engagement Score ────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Traffic Chart */}
                            <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Message Traffic</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Volume over {displayRange}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {[
                                            { key: 'sent', color: '#22c55e', label: 'Sent' },
                                            { key: 'read', color: '#6366f1', label: 'Read' },
                                            { key: 'failed', color: '#ef4444', label: 'Failed' }
                                        ].map(({ key, color, label }) => (
                                            <button key={key} onClick={() => setActiveLines(p => ({ ...p, [key]: !p[key] }))}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${activeLines[key] ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                                                <span className="text-slate-600 dark:text-slate-400">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-60 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                            <defs>
                                                {[{ id: 'Sent', c: '#22c55e' }, { id: 'Read', c: '#6366f1' }, { id: 'Failed', c: '#ef4444' }].map(({ id, c }) => (
                                                    <linearGradient key={id} id={`clr${id}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={c} stopOpacity={0.25} />
                                                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                                                    </linearGradient>
                                                ))}
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-white/10" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={8} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', fontSize: '12px' }} />
                                            {activeLines.sent && <Area type="monotone" dataKey="messages" name="Sent" stroke="#22c55e" strokeWidth={2.5} fill="url(#clrSent)" activeDot={{ r: 5 }} />}
                                            {activeLines.read && <Area type="monotone" dataKey="read" name="Read" stroke="#6366f1" strokeWidth={2.5} fill="url(#clrRead)" activeDot={{ r: 5 }} />}
                                            {activeLines.failed && <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" strokeWidth={2.5} fill="url(#clrFailed)" activeDot={{ r: 5 }} />}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Engagement Score */}
                            <EngagementScore stats={stats} />
                        </div>

                        {/* ── Row 3: Status Donut + Best Send Hours + Template Breakdown ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <StatusDonut stats={stats} />
                            <div className="lg:col-span-2">
                                <HourHeatmap data={hourData} />
                            </div>
                        </div>

                        {/* ── Row 4: Day-of-Week Bar + Template Breakdown ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Day of Week */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Messages by Day</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Which days you send the most</p>
                                    </div>
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <div className="h-44">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dowData} margin={{ top: 0, right: 5, left: -30, bottom: 0 }} barSize={28}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-white/10" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                            <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                            <Bar dataKey="count" name="Messages" radius={[6, 6, 0, 0]}>
                                                {dowData.map((_, i) => <Cell key={i} fill={i === 4 || i === 5 ? '#e2e8f0' : '#6366f1'} fillOpacity={0.85} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center mt-2">Weekends shown in grey</p>
                            </div>

                            {/* Template Breakdown */}
                            {reports.length > 0 ? (
                                <TemplateBreakdown reports={reports} />
                            ) : (
                                <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-center">
                                    <div className="text-center">
                                        <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No template data for this period</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Row 5: Campaign Performance Table (KEPT AS-IS) ── */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Campaign Performance</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{reports.length} campaign{reports.length !== 1 ? 's' : ''} in this period</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl">
                                    <Filter className="w-3 h-3" /> Showing {selectedCampaignId === 'all' ? 'all' : '1'}
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <table className="w-full text-left border-collapse bg-white dark:bg-surface-dark">
                                    <thead className="bg-slate-50 dark:bg-background-dark/60 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="px-5 py-4">Campaign</th>
                                            <th className="px-5 py-4">Date</th>
                                            <th className="px-5 py-4">Audience</th>
                                            <th className="px-5 py-4">Delivered</th>
                                            <th className="px-5 py-4">Failed</th>
                                            <th className="px-5 py-4">Read Rate</th>
                                            <th className="px-5 py-4">Status</th>
                                            <th className="px-5 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                                        {reports.length > 0 ? reports.map(campaign => {
                                            const delPct = campaign.audience > 0 ? Math.round((campaign.delivered / campaign.audience) * 100) : 0;
                                            const readPct = campaign.audience > 0 ? Math.round((campaign.read / campaign.audience) * 100) : 0;
                                            return (
                                                <tr key={campaign.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors group">
                                                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white max-w-[180px] max-w-full truncate">{campaign.name}</td>
                                                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{formatDate(campaign.sentDate)}</td>
                                                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{campaign.audience.toLocaleString()}</td>
                                                    <td className="px-5 py-4">
                                                        <span className="text-slate-900 dark:text-white">{campaign.delivered.toLocaleString()}</span>
                                                        <span className="text-[10px] text-slate-400 ml-1">({delPct}%)</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-red-500 dark:text-red-400 font-medium">{(campaign.failed || 0).toLocaleString()}</td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-16 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${readPct}%` }} />
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{readPct}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${campaign.status === 'COMPLETED' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40' :
                                                            campaign.status === 'SENDING' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40' :
                                                                'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                                                            }`}>
                                                            {campaign.status === 'COMPLETED' && <Award className="w-2.5 h-2.5" />}
                                                            {campaign.status === 'SENDING' && <Zap className="w-2.5 h-2.5" />}
                                                            {campaign.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <button onClick={() => { setSelectedCampaignId(campaign.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                            className="text-slate-400 hover:text-indigo-500 p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
                                                            <BarChart3 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan="8" className="px-4 md:px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">No campaigns in this period</p>
                                                </div>
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                        )}
                    </>
                )}

                {/* NEW TABS CONTENT */}
                {loadingExtras && activeTab !== 'messaging' && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading {activeTab} data...</p>
                    </div>
                )}
                
                {!loadingExtras && activeTab === 'ai' && <AiAnalyticsTab stats={aiStats} />}
                {!loadingExtras && activeTab === 'meta-ads' && <MetaAdsTab ads={metaAds} />}
                {!loadingExtras && activeTab === 'flowbots' && <FlowBotsTab flows={flowBots} />}

            </div>
        </div>
    );
};

export default Reports;
