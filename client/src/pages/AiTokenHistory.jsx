import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Zap, ArrowLeft, TrendingDown, TrendingUp, ShoppingCart, BarChart2,
    Calendar, RefreshCw, Bot, FileText, AlertTriangle, Sparkles, Info
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';

const API_BASE = `${import.meta.env.VITE_API_URL}`;

const RANGE_OPTIONS = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
];

const AiTokenHistory = () => {
    const navigate = useNavigate();
    const [range, setRange] = useState('30d');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/api/dashboard/ai-token-history?range=${range}`);
            setData(res.data);
        } catch (err) {
            console.error('Error fetching AI token history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range]);

    const summary = data?.summary || {};
    const dailyData = data?.dailyData || [];
    const featureBreakdown = (data?.featureBreakdown || []).filter(f => f.tokens > 0);
    const weeklySummary = data?.weeklySummary || [];
    const hasHistory = summary.hasHistory;

    // Subsample for >60 days
    const chartData = dailyData.length > 60
        ? dailyData.filter((_, i) => i % 3 === 0)
        : dailyData;

    const usagePercent = summary.usagePercent || 0;
    const balancePercent = summary.totalAllowance > 0
        ? Math.round((summary.currentBalance / summary.totalAllowance) * 100)
        : 0;
    const isLow = (summary.currentBalance ?? 1) < 1000;

    // Custom Tooltips
    const CustomAreaTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-[#1a2a3a] border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-xl text-xs">
                    <p className="font-bold text-slate-700 dark:text-white mb-2">{label}</p>
                    {payload.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1">
                            <div className="size-2 rounded-full" style={{ background: p.color || p.stroke }}></div>
                            <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{Number(p.value).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-[#1a2a3a] border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-xl text-xs">
                    <p className="font-bold text-slate-700 dark:text-white">{payload[0].name}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                        {Number(payload[0].value).toLocaleString()} tokens ({payload[0].payload.percent}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    const SkeletonCard = () => (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 border border-slate-200 dark:border-[#2f455a] animate-pulse">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
            <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3"></div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
    );

    const NoDataState = ({ icon: Icon, label }) => (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300 dark:text-slate-700">
            <Icon className="w-10 h-10" />
            <p className="text-xs font-medium">{label}</p>
            <p className="text-[10px] text-slate-400 text-center max-w-xs">
                Data appears here once you use AI features (chatbot or form generator)
            </p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white overflow-y-auto">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-surface-dark px-4 md:px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300 gap-4 md:gap-0">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex shrink-0 items-center justify-center size-9 sm:size-10 rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-[#2f455a] transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 shrink-0 text-indigo-500 hidden sm:block" />
                            <h1 className="text-lg sm:text-xl font-bold truncate">AI Token Usage</h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs mt-0.5 truncate">Real-time analytics of consumption</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-0 border-slate-100 dark:border-white/5 pt-3 md:pt-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggle />
                        <button
                            onClick={fetchHistory}
                            disabled={loading}
                            className="flex items-center gap-1.5 sm:gap-2 h-9 px-3 bg-slate-100 dark:bg-surface-dark hover:bg-slate-200 dark:hover:bg-[#2f455a] text-slate-700 dark:text-white rounded-xl text-xs sm:text-sm font-medium transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                    <button
                        onClick={() => navigate('/store')}
                        className="flex shrink-0 items-center gap-1.5 sm:gap-2 h-9 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Buy Tokens
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Low Balance Alert */}
                    {!loading && isLow && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Low Token Balance</p>
                                    <p className="text-amber-700 dark:text-amber-400/80 text-xs mt-0.5">
                                        You only have <strong>{(summary.currentBalance ?? 0).toLocaleString()}</strong> tokens left.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/store')}
                                className="w-full sm:w-auto shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors text-center"
                            >
                                Buy More Tokens
                            </button>
                        </motion.div>
                    )}

                    {/* Range filter + section title */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-indigo-500 shrink-0" />
                            Usage Overview
                        </h2>
                        <div className="flex items-center bg-white dark:bg-surface-dark rounded-xl p-1 border border-slate-200 dark:border-[#2f455a] w-full sm:w-auto overflow-x-auto hide-scrollbar">
                            {RANGE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setRange(opt.id)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${range === opt.id
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Stat Cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : (<>
                            {/* Current Balance */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                                className="bg-white dark:bg-surface-dark rounded-2xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500"><Zap className="w-4 h-4" /></div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Balance</p>
                                </div>
                                <p className={`text-xl sm:text-3xl font-black mb-1 ${isLow ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                                    {(summary.currentBalance ?? 0).toLocaleString()}
                                </p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs">of {(summary.totalAllowance ?? 0).toLocaleString()} total • {balancePercent}% left</p>
                                <div className="mt-3 h-1.5 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${isLow ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min(balancePercent, 100)}%` }} />
                                </div>
                            </motion.div>

                            {/* Total Used in period */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                                className="bg-white dark:bg-surface-dark rounded-2xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-500"><TrendingDown className="w-4 h-4" /></div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Used</p>
                                </div>
                                <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">
                                    {(summary.totalUsed ?? 0).toLocaleString()}
                                </p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs">tokens in this period</p>
                                <div className="mt-3 h-1.5 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-purple-500 transition-all"
                                        style={{ width: `${Math.min(100 - balancePercent, 100)}%` }} />
                                </div>
                            </motion.div>

                            {/* Avg Daily */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="bg-white dark:bg-surface-dark rounded-2xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500"><TrendingUp className="w-4 h-4" /></div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg/Day</p>
                                </div>
                                <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">
                                    {(summary.avgDailyUsage ?? 0).toLocaleString()}
                                </p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs">
                                    {hasHistory ? 'tokens on active days' : 'no activity yet'}
                                </p>
                            </motion.div>

                            {/* Peak Day */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                className="bg-white dark:bg-surface-dark rounded-2xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500"><Sparkles className="w-4 h-4" /></div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Peak Day</p>
                                </div>
                                <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">
                                    {(summary.peakDayUsage ?? 0).toLocaleString()}
                                </p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs">
                                    {hasHistory ? 'highest single day' : 'no activity yet'}
                                </p>
                            </motion.div>
                        </>)}
                    </div>

                    {/* ── No activity notice (only show if no history) ── */}
                    {!loading && !hasHistory && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl"
                        >
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                                <strong>No AI usage yet in this period.</strong> Charts and tables will populate automatically as you use the AI chatbot or the form generator.
                            </p>
                        </motion.div>
                    )}

                    {/* ── Daily Consumption Area Chart ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-200 dark:border-[#2f455a] shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Daily Token Consumption</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Tokens consumed per day by feature</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm bg-indigo-500"></div><span className="text-slate-500 dark:text-slate-400">AI Chatbot</span></div>
                                <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm bg-violet-400"></div><span className="text-slate-500 dark:text-slate-400">Form Generator</span></div>
                                <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm bg-amber-400"></div><span className="text-slate-500 dark:text-slate-400">Template Draft</span></div>
                                <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm bg-emerald-400"></div><span className="text-slate-500 dark:text-slate-400">Template Enhancer</span></div>
                            </div>
                        </div>
                        {loading ? (
                            <div className="h-72 bg-slate-100 dark:bg-background-dark rounded-xl animate-pulse" />
                        ) : !hasHistory ? (
                            <div className="h-72"><NoDataState icon={BarChart2} label="No usage data in this period" /></div>
                        ) : (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradChatbot" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradForm" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradTemplateDraft" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradTemplateEnhancer" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2f455a20" vertical={false} />
                                        <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} dy={8}
                                            interval={Math.max(0, Math.floor(chartData.length / 8))} />
                                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomAreaTooltip />} />
                                        <Area type="monotone" dataKey="ai_chatbot" name="AI Chatbot" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#gradChatbot)" stackId="a" />
                                        <Area type="monotone" dataKey="ai_form_generator" name="Form Generator" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#gradForm)" stackId="a" />
                                        <Area type="monotone" dataKey="ai_template_draft" name="Template Draft" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#gradTemplateDraft)" stackId="a" />
                                        <Area type="monotone" dataKey="ai_template_enhancer" name="Template Enhancer" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradTemplateEnhancer)" stackId="a" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </motion.div>

                    {/* ── Charts Row 2: Weekly Bar + Feature Donut ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Weekly Bar */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="lg:col-span-3 bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-200 dark:border-[#2f455a] shadow-sm">
                            <div className="mb-6">
                                <h3 className="font-bold text-slate-900 dark:text-white">Weekly Breakdown</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Token usage grouped by week</p>
                            </div>
                            {loading ? (
                                <div className="h-56 bg-slate-100 dark:bg-background-dark rounded-xl animate-pulse" />
                            ) : !hasHistory ? (
                                <div className="h-56"><NoDataState icon={BarChart2} label="No weekly data yet" /></div>
                            ) : (
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklySummary} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#2f455a20" vertical={false} />
                                            <XAxis dataKey="week" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomAreaTooltip />} />
                                            <Bar dataKey="ai_chatbot" name="AI Chatbot" fill="#6366f1" radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="ai_form_generator" name="Form Generator" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="ai_template_draft" name="Template Draft" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="ai_template_enhancer" name="Template Enhancer" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </motion.div>

                        {/* Feature Donut */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-200 dark:border-[#2f455a] shadow-sm">
                            <div className="mb-4">
                                <h3 className="font-bold text-slate-900 dark:text-white">Feature Usage</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Breakdown by AI feature</p>
                            </div>
                            {loading ? (
                                <div className="h-52 bg-slate-100 dark:bg-background-dark rounded-xl animate-pulse" />
                            ) : featureBreakdown.length === 0 ? (
                                <div className="h-52"><NoDataState icon={Zap} label="No feature data yet" /></div>
                            ) : (
                                <>
                                    <div className="h-36">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={featureBreakdown} cx="50%" cy="50%"
                                                    innerRadius={42} outerRadius={62} paddingAngle={3}
                                                    dataKey="tokens" nameKey="name">
                                                    {featureBreakdown.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomPieTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2 mt-3">
                                        {featureBreakdown.map((f) => (
                                            <div key={f.key} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-3 rounded-full" style={{ background: f.color }}></div>
                                                    <span className="text-xs text-slate-600 dark:text-slate-400">{f.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{f.tokens.toLocaleString()}</span>
                                                    <span className="text-xs text-slate-400 ml-1">({f.percent}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>

                    {/* ── Token Balance Trend ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-200 dark:border-[#2f455a] shadow-sm">
                        <div className="mb-6">
                            <h3 className="font-bold text-slate-900 dark:text-white">Token Balance Trend</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">How your remaining balance changed over time</p>
                        </div>
                        {loading ? (
                            <div className="h-52 bg-slate-100 dark:bg-background-dark rounded-xl animate-pulse" />
                        ) : (
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradBal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2f455a20" vertical={false} />
                                        <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} dy={8}
                                            interval={Math.max(0, Math.floor(chartData.length / 8))} />
                                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomAreaTooltip />} />
                                        <Area type="monotone" dataKey="runningBalance" name="Balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradBal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </motion.div>

                    {/* ── Daily Usage Log Table ── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-[#2f455a] shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-[#2f455a]">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                    Daily Usage Log
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                    {hasHistory ? 'Actual per-day token deductions' : 'No activity recorded yet'}
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[800px]">
                                <thead className="bg-slate-50 dark:bg-background-dark text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3 text-left">Date</th>
                                        <th className="px-4 md:px-6 py-3 text-right">
                                            <span className="flex items-center justify-end gap-1.5">
                                                <Bot className="w-3.5 h-3.5 text-indigo-400" /> AI Chatbot
                                            </span>
                                        </th>
                                        <th className="px-4 md:px-6 py-3 text-right">
                                            <span className="flex items-center justify-end gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-violet-400" /> Form Gen
                                            </span>
                                        </th>
                                        <th className="px-4 md:px-6 py-3 text-right">
                                            <span className="flex items-center justify-end gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Template Draft
                                            </span>
                                        </th>
                                        <th className="px-4 md:px-6 py-3 text-right">
                                            <span className="flex items-center justify-end gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Tmpl Enhancer
                                            </span>
                                        </th>
                                        <th className="px-4 md:px-6 py-3 text-right">Total Used</th>
                                        <th className="px-4 md:px-6 py-3 text-right">Balance After</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-background-dark">
                                    {loading ? (
                                        Array.from({ length: 7 }).map((_, i) => (
                                            <tr key={i}>
                                                {Array.from({ length: 5 }).map((_, j) => (
                                                    <td key={j} className="px-4 md:px-6 py-4">
                                                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"></div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : dailyData.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 md:px-6 py-12 text-center text-slate-400 text-sm">
                                                No token usage recorded yet in this period
                                            </td>
                                        </tr>
                                    ) : (
                                        [...dailyData].reverse().map((day, i) => (
                                            <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-[#1e3345] transition-colors ${day.total === 0 ? 'opacity-40' : ''}`}>
                                                <td className="px-4 md:px-6 py-3.5 font-medium text-slate-900 dark:text-white">
                                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="px-4 md:px-6 py-3.5 text-right">
                                                    {day.ai_chatbot > 0
                                                        ? <span className="inline-flex px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-medium">{day.ai_chatbot.toLocaleString()}</span>
                                                        : <span className="text-slate-300 dark:text-slate-700">—</span>}
                                                </td>
                                                <td className="px-4 md:px-6 py-3.5 text-right">
                                                    {day.ai_form_generator > 0
                                                        ? <span className="inline-flex px-2 py-0.5 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 rounded-lg text-xs font-medium">{day.ai_form_generator.toLocaleString()}</span>
                                                        : <span className="text-slate-300 dark:text-slate-700">—</span>}
                                                </td>
                                                <td className="px-4 md:px-6 py-3.5 text-right">
                                                    {(day.ai_template_draft || 0) > 0
                                                        ? <span className="inline-flex px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium">{day.ai_template_draft.toLocaleString()}</span>
                                                        : <span className="text-slate-300 dark:text-slate-700">—</span>}
                                                </td>
                                                <td className="px-4 md:px-6 py-3.5 text-right">
                                                    {(day.ai_template_enhancer || 0) > 0
                                                        ? <span className="inline-flex px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium">{day.ai_template_enhancer.toLocaleString()}</span>
                                                        : <span className="text-slate-300 dark:text-slate-700">—</span>}
                                                </td>
                                                <td className="px-4 md:px-6 py-3.5 text-right">
                                                    <span className={`font-bold ${day.total > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-700'}`}>
                                                        {day.total > 0 ? day.total.toLocaleString() : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-3.5 text-right">
                                                    <span className={`text-sm font-medium ${day.runningBalance < 1000 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                        {day.runningBalance.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Low balance CTA */}
                        {!loading && isLow && (
                            <div className="p-4 border-t border-slate-100 dark:border-[#2f455a] bg-indigo-50 dark:bg-indigo-900/10 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                                    Running low? Top up your AI tokens to avoid interruptions.
                                </p>
                                <button
                                    onClick={() => navigate('/store')}
                                    className="flex items-center justify-center w-full md:w-auto gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    Power Up Account
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default AiTokenHistory;
