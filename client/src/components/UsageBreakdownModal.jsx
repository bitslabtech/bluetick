import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, MessageCircle, Zap, Bot, Reply, Megaphone,
    Calendar, ChevronRight, BarChart2, Clock, TrendingUp, Layers
} from 'lucide-react';

const SOURCE_META = {
    broadcast:  { label: 'Broadcast',    icon: Megaphone,       color: 'indigo' },
    live_inbox: { label: 'Live Inbox',   icon: MessageCircle,   color: 'emerald' },
    flowbot:    { label: 'FlowBot',      icon: Zap,             color: 'violet' },
    ai_bot:     { label: 'AI Bot',       icon: Bot,             color: 'blue' },
    auto_reply: { label: 'Auto Reply',   icon: Reply,           color: 'amber' },
};

const COLOR_CLASSES = {
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',  icon: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20',icon: 'text-emerald-500',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',  icon: 'text-violet-500', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',      icon: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',    icon: 'text-amber-500',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Group dailyInbox rows by date, merging sources into one day object
function groupByDate(dailyInbox) {
    const map = {};
    for (const row of dailyInbox) {
        const key = row.date;
        if (!map[key]) map[key] = { date: key, sources: {} };
        map[key].sources[row.source] = parseInt(row.count);
    }
    return Object.values(map).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default function UsageBreakdownModal({ onClose }) {
    const [tab, setTab] = useState('timeline');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/api/billing/usage-breakdown`)
            .then(r => setData(r.data))
            .catch(e => setError(e.response?.data?.error || e.message))
            .finally(() => setLoading(false));
    }, []);

    const days = data ? groupByDate(data.dailyInbox) : [];
    const summary = data?.summary || {};
    const broadcasts = data?.broadcasts || [];

    const totalDayCount = (sources) =>
        Object.values(sources).reduce((s, v) => s + v, 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-indigo-500" /> This Month's Usage Breakdown
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* Vertical Tabs */}
                    <div className="flex flex-col gap-1 p-3 border-r border-slate-100 dark:border-white/5 flex-shrink-0 w-36">
                        <TabBtn id="timeline" active={tab} setTab={setTab} icon={Clock} label="Timeline" />
                        <TabBtn id="summary"  active={tab} setTab={setTab} icon={Layers} label="Summary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5">
                        {loading && (
                            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                                Loading usage data…
                            </div>
                        )}
                        {error && (
                            <div className="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">{error}</div>
                        )}
                        {!loading && !error && data && (
                            <>
                                {tab === 'timeline' && <TimelineTab broadcasts={broadcasts} days={days} totalDayCount={totalDayCount} />}
                                {tab === 'summary'  && <SummaryTab summary={summary} />}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TabBtn({ id, active, setTab, icon: Icon, label }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full text-left
                ${isActive
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 dark:text-slate-400'}`}
        >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
        </button>
    );
}

function TimelineTab({ broadcasts, days }) {
    return (
        <div className="space-y-6">
            {/* Broadcast Campaigns */}
            <section>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-indigo-500" /> Broadcast Campaigns
                </h3>
                {broadcasts.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No campaigns sent this month.</p>
                ) : (
                    <div className="space-y-2">
                        {broadcasts.map(b => (
                            <div
                                key={b.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{b.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{fmtDate(b.date)}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 text-xs font-semibold">
                                    <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                        {b.counted} counted
                                    </span>
                                    {b.delivered > 0 && (
                                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            {b.delivered} delivered
                                        </span>
                                    )}
                                    {b.failed > 0 && (
                                        <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                            {b.failed} failed
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Daily Live / Auto Messages */}
            <section>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Daily Outbound Messages
                </h3>
                {days.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No outbound messages this month.</p>
                ) : (
                    <div className="space-y-2">
                        {days.map(day => {
                            const total = Object.values(day.sources).reduce((s, v) => s + v, 0);
                            return (
                                <div
                                    key={day.date}
                                    className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {fmtDate(day.date)}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{total} total</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(day.sources).map(([src, cnt]) => {
                                            const meta = SOURCE_META[src] || SOURCE_META.live_inbox;
                                            const cls = COLOR_CLASSES[meta.color];
                                            const Icon = meta.icon;
                                            return (
                                                <span key={src} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls.badge}`}>
                                                    <Icon className="w-3 h-3" />
                                                    {meta.label}: {cnt}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

function SummaryTab({ summary }) {
    const total = summary.total || 0;

    const categories = Object.entries(SOURCE_META).map(([key, meta]) => ({
        key,
        ...meta,
        count: summary[key] || 0
    })).filter(c => c.count > 0 || c.key === 'broadcast' || c.key === 'live_inbox');

    return (
        <div className="space-y-4">
            {/* Total pill */}
            <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow">
                <div>
                    <p className="text-xs uppercase font-bold tracking-wide opacity-80">Total This Month</p>
                    <p className="text-4xl font-bold mt-0.5">{total.toLocaleString()}</p>
                </div>
                <BarChart2 className="w-10 h-10 opacity-30" />
            </div>

            {/* Category cards */}
            <div className="grid grid-cols-2 gap-3">
                {categories.map(cat => {
                    const cls = COLOR_CLASSES[cat.color];
                    const Icon = cat.icon;
                    const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                    return (
                        <div key={cat.key} className={`${cls.bg} rounded-xl p-4 border border-slate-100 dark:border-white/5`}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg bg-white/60 dark:bg-white/10 ${cls.icon}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{cat.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{cat.count.toLocaleString()}</p>
                            <div className="mt-2">
                                <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-current rounded-full transition-all duration-700"
                                        style={{ width: `${pct}%`, color: 'currentColor' }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{pct}% of total</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
