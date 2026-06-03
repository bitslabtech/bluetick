import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Rocket, BarChart3, Plus, TrendingUp, Users, DollarSign,
    MousePointerClick, MessageCircle, Target, Zap, ArrowRight,
    Loader2, RefreshCw, Clock, AlertTriangle, ChevronRight, ChevronLeft,
    Megaphone, Eye, Activity, ExternalLink, Sparkles, LayoutGrid,
    Filter, Search, Calendar, CheckCircle2, XCircle, Timer,
    Image as ImageIcon, LogOut, BarChart2, CreditCard, Phone, Mail,
    Tag, UserCheck, AlertCircle, Inbox, Send, Shield, Settings,
    Radio, Copy, X, Hash, Calculator, IndianRupee, PieChart
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { formatDistanceToNow } from 'date-fns';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// ── Helpers ─────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) => {
    if (n === null || n === undefined) return '—';
    return Number(n).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};
const fmtCurrency = (n, currency = '₹') => {
    if (n === null || n === undefined) return '—';
    return `${currency}${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ── Tab definitions ─────────────────────────────────────────────────
const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'leads', label: 'Smart Leads', icon: UserCheck },
    { id: 'analytics', label: 'Ad Analytics', icon: BarChart3 },
    { id: 'capi', label: 'CAPI', icon: Shield },
    { id: 'roi', label: 'ROI Calculator', icon: Calculator },
];

const FunnelCard = ({ icon: Icon, label, value, subLabel, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative overflow-hidden bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 group"
    >
        {/* Subtle accent line on top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10 flex flex-col h-full justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <p className="text-[11px] sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">{label}</p>
            </div>
            
            <div>
                <p className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight truncate">{value}</p>
                {subLabel && (
                    <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
                        {subLabel}
                    </div>
                )}
            </div>
        </div>
    </motion.div>
);

// ── Overview Tab ─────────────────────────────────────────────────────
const OverviewTab = ({ campaigns, ctwaData, loading, navigate, metaConnected }) => {
    const activeCampaigns = campaigns.filter(c => c.status === 'Active' || c.status === 'Published');
    const totalLeads = ctwaData?.totalLeads || 0;
    const totalSpend = ctwaData?.totalSpend || 0;
    const cpl = totalLeads > 0 && totalSpend > 0 ? (totalSpend / totalLeads) : null;

    return (
        <div className="space-y-8">
            {/* Meta Connection Banner */}
            {metaConnected === false && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl"
                >
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 mt-0.5">
                            <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">Meta Ads Account Not Connected</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                Connect your Facebook Ad Account to publish live campaigns and track real-time analytics.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/ctwa-analytics')}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/40 hover:bg-amber-200 dark:hover:bg-amber-700/40 px-4 py-2.5 sm:py-2 rounded-xl transition-colors whitespace-nowrap w-full sm:w-auto mt-1 sm:mt-0"
                    >
                        Connect <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                </motion.div>
            )}

            {/* Funnel Visualization */}
            <div>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-500" />
                            Performance Funnel
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">End-to-end view of your ad performance</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                    <FunnelCard
                        icon={DollarSign}
                        label="Total Spend"
                        value={fmtCurrency(totalSpend)}
                        subLabel="Across all campaigns"
                        delay={0.1}
                    />
                    <FunnelCard
                        icon={Eye}
                        label="Impressions"
                        value={fmt(ctwaData?.ads?.reduce((s, a) => s + (a.impressions || 0), 0))}
                        subLabel="Total ad views"
                        delay={0.2}
                    />
                    <FunnelCard
                        icon={Users}
                        label="CTWA Leads"
                        value={fmt(totalLeads)}
                        subLabel="Conversations started"
                        delay={0.3}
                    />
                    <FunnelCard
                        icon={Target}
                        label="Cost Per Lead"
                        value={cpl ? fmtCurrency(cpl) : '—'}
                        subLabel={totalLeads > 0 ? `From ${fmt(totalLeads)} leads` : 'No data yet'}
                        delay={0.4}
                    />
                </div>
            </div>

            {/* Quick Actions + Recent Campaigns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Launch Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-1 relative overflow-hidden bg-primary rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl shadow-primary/20 group hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
                >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 mix-blend-overlay" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity" />
                    
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20 shadow-inner">
                                <Sparkles className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">Create AI Campaign</h3>
                            <p className="text-[15px] font-medium text-white/80 mb-8 leading-relaxed">
                                Launch a high-converting WhatsApp ad in under 2 minutes. Our AI handles targeting, copy & creatives perfectly.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/meta-ads/wizard')}
                            className="w-full bg-white text-indigo-600 hover:bg-slate-50 font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl group-hover:scale-[1.02]"
                        >
                            <Plus className="w-5 h-5" /> Launch AI Wizard
                        </button>
                    </div>
                </motion.div>

                {/* Recent Campaigns */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-2 bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col"
                >
                    <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                            <Megaphone className="w-4 h-4 text-primary" /> Recent Campaigns
                        </h3>
                        <span className="text-xs text-slate-400">{campaigns.length} total</span>
                    </div>

                    {loading ? (
                        <div className="p-5 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton width={40} height={40} borderRadius={12} />
                                    <div className="flex-1">
                                        <Skeleton width="60%" height={14} />
                                        <Skeleton width="40%" height={10} className="mt-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Megaphone className="w-7 h-7 text-primary" />
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">No campaigns yet</h4>
                            <p className="text-sm text-slate-500 mb-4">Create your first AI-powered campaign to start generating leads.</p>
                            <button
                                onClick={() => navigate('/meta-ads/wizard')}
                                className="inline-flex items-center gap-2 text-primary font-bold hover:text-secondary transition-colors text-sm"
                            >
                                Create first campaign <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {campaigns.slice(0, 5).map((campaign) => {
                                const statusColors = {
                                    Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
                                    Paused: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
                                    Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
                                    Published: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
                                };
                                return (
                                    <div key={campaign.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors gap-3 sm:gap-0">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{campaign.campaignName}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 w-full sm:w-auto border-t sm:border-0 border-slate-100 dark:border-white/5 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                ₹{parseFloat(campaign.dailyBudget || 0).toFixed(0)}/day
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusColors[campaign.status] || statusColors.Draft}`}>
                                                {campaign.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                                {campaign.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* 72-Hour Window Alert Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border border-orange-200/60 dark:border-orange-700/30 rounded-2xl p-5"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                        <Timer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">72-Hour Free Window</h4>
                        <p className="text-[11px] text-slate-500">Leads from ads get a free 72-hour messaging window — engage them before it expires!</p>
                    </div>
                </div>
                <div className="bg-white/60 dark:bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {totalLeads > 0
                            ? `You have ${totalLeads} total leads captured. Check the inbox to engage leads within their free windows.`
                            : 'No CTWA leads captured yet. Run your first ad campaign to start generating leads!'
                        }
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

// ── Campaigns Tab ─────────────────────────────────────────────────────
const CampaignsTab = ({ campaigns, loading, navigate, isDarkMode }) => {
    const statusColors = {
        Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
        Paused: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
        Published: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-primary" /> All Campaigns
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Manage your AI-generated ad campaigns</p>
                </div>
                <button
                    onClick={() => navigate('/meta-ads/wizard')}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-bold shadow-md shadow-primary/20 transition-all text-sm"
                >
                    <Plus className="w-4 h-4" /> New Campaign
                </button>
            </div>

            <div className="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} height={72} baseColor={isDarkMode ? '#1e293b' : '#f8fafc'} highlightColor={isDarkMode ? '#334155' : '#ffffff'} className="rounded-xl" />
                        ))}
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="p-8 sm:p-16 text-center">
                        <div className="w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Megaphone className="w-9 h-9 text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No campaigns yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-6 text-sm">Use our AI wizard to create your first high-converting WhatsApp ad campaign.</p>
                        <button
                            onClick={() => navigate('/meta-ads/wizard')}
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all"
                        >
                            <Sparkles className="w-5 h-5" /> Create Your First Campaign
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto sm:overflow-visible">
                        <table className="w-full text-left border-collapse block sm:table">
                            <thead className="hidden sm:table-header-group">
                                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02]">
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Campaign</th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3.5">Status</th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3.5">Budget</th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3.5">Objective</th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3.5 text-right">Created</th>
                                </tr>
                            </thead>
                            <tbody className="block sm:table-row-group divide-y divide-slate-100 dark:divide-white/5">
                                {campaigns.map((campaign) => (
                                    <tr key={campaign.id} className="block sm:table-row hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group p-4 sm:p-0">
                                        <td className="block sm:table-cell px-0 sm:px-5 py-3 sm:py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary transition-colors">
                                                        {campaign.campaignName}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {campaign.targeting?.locations?.[0]} • Age {campaign.targeting?.age_min}-{campaign.targeting?.age_max}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-start px-0 sm:px-4 py-2 sm:py-4 border-t border-slate-100/50 sm:border-0 dark:border-white/5">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusColors[campaign.status] || statusColors.Draft}`}>
                                                {campaign.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                                {campaign.status}
                                            </span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-start px-0 sm:px-4 py-2 sm:py-4 border-t border-slate-100/50 sm:border-0 dark:border-white/5">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Budget</span>
                                            <span className="font-semibold text-slate-900 dark:text-slate-200 text-sm">
                                                ₹{parseFloat(campaign.dailyBudget || 0).toFixed(0)}/day
                                            </span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-start px-0 sm:px-4 py-2 sm:py-4 text-xs font-medium text-slate-600 dark:text-slate-400 border-t border-slate-100/50 sm:border-0 dark:border-white/5">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Objective</span>
                                            <span>{campaign.objective?.replace('_', ' ')}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-end px-0 sm:px-4 py-2 sm:py-4 text-sm text-slate-500 border-t border-slate-100/50 sm:border-0 dark:border-white/5">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Created</span>
                                            <span>{formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Analytics Tab ─────────────────────────────────────────────────────
const AnalyticsTab = ({ ctwaData, loading, dateRange, setDateRange, onRefresh, isDarkMode, onRetarget }) => {
    const totalLeads = ctwaData?.totalLeads || 0;
    const totalSpend = ctwaData?.totalSpend || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" /> CTWA Ad Analytics
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Leads from Click-to-WhatsApp campaigns
                        {ctwaData?.adAccountId && <> · Account: <span className="font-mono font-bold">{ctwaData.adAccountId}</span></>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                        className="text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark text-slate-700 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                        <option value="last_7d">Last 7 Days</option>
                        <option value="last_14d">Last 14 Days</option>
                        <option value="last_30d">Last 30 Days</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                    </select>
                    <button onClick={onRefresh} disabled={loading} className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <FunnelCard icon={Users} label="Total Leads" value={loading ? '—' : fmt(totalLeads)} />
                <FunnelCard icon={DollarSign} label="Total Spend" value={loading ? '—' : fmtCurrency(totalSpend)} delay={0.05} />
                <FunnelCard
                    icon={Target}
                    label="Avg. Cost Per Lead"
                    value={loading ? '—' : (totalLeads > 0 && totalSpend > 0 ? fmtCurrency(totalSpend / totalLeads) : '—')}
                    delay={0.1}
                />
                <FunnelCard icon={Activity} label="Active Ads" value={loading ? '—' : fmt(ctwaData?.ads?.length)} delay={0.15} />
            </div>

            {/* Ads Table */}
            <div className="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Ad Performance Breakdown</h3>
                    <span className="text-xs text-slate-400">Spend data from Meta · Leads from your inbox</span>
                </div>

                {loading ? (
                    <div className="p-6 space-y-3">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} height={60} baseColor={isDarkMode ? '#1e293b' : '#f8fafc'} highlightColor={isDarkMode ? '#334155' : '#ffffff'} className="rounded-xl" />
                        ))}
                    </div>
                ) : !ctwaData?.ads?.length ? (
                    <div className="text-center py-16 px-6">
                        <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">No CTWA Leads Yet</h4>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            When customers click your WhatsApp Ads and message you, their data will appear here automatically.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5">
                                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Ad</th>
                                    <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Leads</th>
                                    <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Spend</th>
                                    <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">CPL</th>
                                    <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Impressions</th>
                                    <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Clicks</th>
                                    <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">CTR</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {ctwaData.ads.map(ad => (
                                    <tr key={ad.adId} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {ad.imageUrl ? (
                                                    <img src={ad.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4 text-primary" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[200px]">{ad.adName}</div>
                                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{ad.adId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="font-bold text-primary text-base">{fmt(ad.leads)}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                                            {fmtCurrency(ad.spend)}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {ad.costPerLead !== null ? (
                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(ad.costPerLead)}</span>
                                            ) : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{fmt(ad.impressions)}</td>
                                        <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{fmt(ad.clicks)}</td>
                                        <td className="px-4 py-4 text-right">
                                            {ad.ctr !== null ? (
                                                <span className={`font-medium ${parseFloat(ad.ctr) >= 1 ? 'text-emerald-500' : 'text-slate-500'}`}>{ad.ctr}%</span>
                                            ) : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {ad.leads > 0 && (
                                                    <button
                                                        onClick={() => onRetarget && onRetarget(ad)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors"
                                                        title="Retarget leads from this ad"
                                                    >
                                                        <Send className="w-3 h-3" /> Retarget
                                                    </button>
                                                )}
                                                {ad.sourceUrl && (
                                                    <a href={ad.sourceUrl} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-primary transition-colors inline-flex">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};


// ── Smart Leads Tab (Phase 3) ───────────────────────────────────────────
const LeadsTab = ({ isDarkMode, navigate }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAdId, setFilterAdId] = useState('');
    const [filterWindow, setFilterWindow] = useState('all'); // 'all' | 'active' | 'expired'
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [uniqueAds, setUniqueAds] = useState([]);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 30 });
            if (searchQuery) params.append('search', searchQuery);
            if (filterAdId) params.append('ad_id', filterAdId);

            const res = await axios.get(`/api/ctwa/leads?${params.toString()}`, { withCredentials: true });
            let fetchedLeads = res.data.leads || [];

            // Client-side window filter
            if (filterWindow === 'active') {
                fetchedLeads = fetchedLeads.filter(l => l.windowStatus === 'active');
            } else if (filterWindow === 'expired') {
                fetchedLeads = fetchedLeads.filter(l => l.windowStatus === 'expired');
            }

            setLeads(fetchedLeads);
            setTotalPages(res.data.totalPages || 1);
            setTotalCount(res.data.total || 0);

            // Build unique ad list for filter dropdown
            const adMap = {};
            (res.data.leads || []).forEach(l => {
                if (l.adId && !adMap[l.adId]) {
                    adMap[l.adId] = l.adName;
                }
            });
            setUniqueAds(Object.entries(adMap).map(([id, name]) => ({ id, name })));
        } catch {
            setLeads([]);
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, filterAdId, filterWindow]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Debounced search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const activeLeads = leads.filter(l => l.windowStatus === 'active').length;
    const expiredLeads = leads.filter(l => l.windowStatus === 'expired').length;

    const getWindowBadge = (lead) => {
        if (lead.windowStatus === 'expired') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                    <XCircle className="w-3 h-3" /> Expired
                </span>
            );
        }
        const hrs = lead.windowHoursLeft;
        const isUrgent = hrs <= 12;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isUrgent
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 animate-pulse'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
            }`}>
                <Clock className="w-3 h-3" />
                {hrs >= 1 ? `${Math.floor(hrs)}h left` : `${Math.round(hrs * 60)}m left`}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-primary" /> Smart Lead Manager
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {totalCount} total CTWA leads · {activeLeads > 0 ? `${activeLeads} with active window` : 'No active windows'}
                    </p>
                </div>
                <button
                    onClick={fetchLeads}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div
                    onClick={() => { setFilterWindow('all'); setPage(1); }}
                    className={`cursor-pointer bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border rounded-2xl p-4 transition-all ${
                        filterWindow === 'all' ? 'border-primary ring-2 ring-primary/10' : 'border-white/60 dark:border-white/10'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase">All Leads</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</p>
                </div>
                <div
                    onClick={() => { setFilterWindow('active'); setPage(1); }}
                    className={`cursor-pointer bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border rounded-2xl p-4 transition-all ${
                        filterWindow === 'active' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-white/60 dark:border-white/10'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-4 h-4 text-emerald-500" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Window Active</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeLeads}</p>
                </div>
                <div
                    onClick={() => { setFilterWindow('expired'); setPage(1); }}
                    className={`cursor-pointer bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border rounded-2xl p-4 transition-all ${
                        filterWindow === 'expired' ? 'border-red-500 ring-2 ring-red-500/10' : 'border-white/60 dark:border-white/10'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Expired</span>
                    </div>
                    <p className="text-2xl font-black text-red-600 dark:text-red-400">{expiredLeads}</p>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <select
                    value={filterAdId}
                    onChange={(e) => { setFilterAdId(e.target.value); setPage(1); }}
                    className="text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark text-slate-700 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none"
                >
                    <option value="">All Ads</option>
                    {uniqueAds.map(ad => (
                        <option key={ad.id} value={ad.id}>{ad.name}</option>
                    ))}
                </select>
            </div>

            {/* Leads Table */}
            <div className="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} height={56} baseColor={isDarkMode ? '#1e293b' : '#f8fafc'} highlightColor={isDarkMode ? '#334155' : '#ffffff'} className="rounded-xl" />
                        ))}
                    </div>
                ) : leads.length === 0 ? (
                    <div className="text-center py-16 px-6">
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Inbox className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                            {searchQuery || filterAdId ? 'No leads match your filters' : 'No CTWA Leads Yet'}
                        </h4>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            {searchQuery || filterAdId
                                ? 'Try adjusting your search or filter criteria.'
                                : 'When someone clicks your WhatsApp Ad and messages you, they\'ll appear here as a lead with their ad source and 72-hour window status.'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto sm:overflow-visible">
                        <table className="w-full text-sm block sm:table border-collapse">
                            <thead className="hidden sm:table-header-group">
                                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02]">
                                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Lead</th>
                                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Source Ad</th>
                                    <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">72h Window</th>
                                    <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Tags</th>
                                    <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Captured</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="block sm:table-row-group divide-y divide-slate-100 dark:divide-white/5">
                                {leads.map(lead => (
                                    <tr key={lead.id} className="block sm:table-row hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group p-4 sm:p-0">
                                        <td className="block sm:table-cell px-0 sm:px-5 py-3 sm:py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                    {lead.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{lead.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                        <Phone className="w-3 h-3" />
                                                        <span className="font-mono">{lead.phone}</span>
                                                        {lead.email && (
                                                            <>
                                                                <span className="text-slate-300 dark:text-slate-600">·</span>
                                                                <Mail className="w-3 h-3" />
                                                                <span className="truncate max-w-[120px]">{lead.email}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-start px-0 sm:px-4 py-2 sm:py-3.5 border-t border-slate-100/50 sm:border-0 dark:border-white/5">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Source Ad</span>
                                            <div className="flex items-center gap-2 text-right sm:text-left">
                                                <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                    <Megaphone className="w-3.5 h-3.5 text-primary" />
                                                </div>
                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                                    {lead.adName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:text-center px-0 sm:px-4 py-2 sm:py-3.5 border-t border-slate-100/50 sm:border-0 dark:border-white/5">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">72h Window</span>
                                            {getWindowBadge(lead)}
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-start px-0 sm:px-4 py-2 sm:py-3.5 border-t border-slate-100/50 sm:border-0 dark:border-white/5">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tags</span>
                                            <div className="flex flex-wrap justify-end sm:justify-start gap-1">
                                                {(lead.tags || []).slice(0, 3).map((tag, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-md text-[10px] font-medium">
                                                        <Tag className="w-2.5 h-2.5" /> {tag}
                                                    </span>
                                                ))}
                                                {(lead.tags || []).length > 3 && (
                                                    <span className="text-[10px] text-slate-400">+{lead.tags.length - 3}</span>
                                                )}
                                                {(!lead.tags || lead.tags.length === 0) && (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-end px-0 sm:px-4 py-2 sm:py-3.5 border-t border-slate-100/50 sm:border-0 dark:border-white/5 text-xs text-slate-500 sm:text-right">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Captured</span>
                                            <span>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
                                        </td>
                                        <td className="block sm:table-cell px-0 sm:px-4 py-3 sm:py-3.5 mt-2 sm:mt-0 border-t border-slate-100/50 sm:border-0 dark:border-white/5 sm:text-right">
                                            <button
                                                onClick={() => navigate(`/inbox?phone=${lead.phone}`)}
                                                className="w-full sm:w-auto opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center gap-1.5 text-sm sm:text-xs font-bold text-white sm:text-primary bg-primary hover:bg-primary/90 sm:bg-primary/5 sm:hover:bg-primary/10 px-4 sm:px-3 py-2.5 sm:py-1.5 rounded-xl sm:rounded-lg shadow-sm sm:shadow-none"
                                            >
                                                <MessageCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Chat
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-4 sm:px-5 py-4 sm:py-3 border-t border-slate-100 dark:border-white/5">
                        <p className="text-xs text-slate-500">
                            Page {page} of {totalPages} · {totalCount} leads total
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── ROI Calculator Tab (Phase 6) ────────────────────────────────────────
const RoiCalculatorTab = ({ ctwaData }) => {
    const [dealValue, setDealValue] = useState(5000);
    const [conversionRate, setConversionRate] = useState(15);
    const [dailyBudget, setDailyBudget] = useState(1000);

    const totalLeads = ctwaData?.totalLeads || 0;
    const totalSpend = ctwaData?.totalSpend || 0;
    const currentCpl = totalLeads > 0 && totalSpend > 0 ? totalSpend / totalLeads : 0;

    // Calculations
    const dailyLeads = dailyBudget > 0 && currentCpl > 0 ? Math.floor(dailyBudget / currentCpl) : 0;
    const dailyConversions = dailyLeads * (conversionRate / 100);
    const dailyRevenue = dailyConversions * dealValue;
    const monthlyRevenue = dailyRevenue * 30;
    const monthlySpend = dailyBudget * 30;
    const roi = monthlySpend > 0 ? ((monthlyRevenue - monthlySpend) / monthlySpend * 100) : 0;
    const breakEvenCr = dailyLeads > 0 && dealValue > 0 ? (dailyBudget / (dailyLeads * dealValue) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" /> ROI Calculator
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                    Estimate your return on ad spend based on actual campaign performance.
                </p>
            </div>

            {/* Current Performance Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Your Current Performance</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {totalLeads > 0
                                ? `Based on ${totalLeads} leads at ₹${currentCpl.toFixed(2)} CPL from ₹${totalSpend.toFixed(0)} total spend.`
                                : 'No campaign data yet. Enter manual values below to estimate ROI.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* Input Panel */}
                <div className="lg:col-span-5 bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 mb-2">
                        <Settings className="w-5 h-5 text-primary" /> Your Business Metrics
                    </h3>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Average Deal / Order Value (₹)
                        </label>
                        <div className="relative">
                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="number"
                                value={dealValue}
                                onChange={e => setDealValue(Number(e.target.value))}
                                className="w-full bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 font-mono text-xl font-bold transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
                            <span>Conversion Rate</span>
                            <span className="text-primary font-black">{conversionRate}%</span>
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={conversionRate}
                            onChange={e => setConversionRate(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Daily Ad Budget (₹)
                        </label>
                        <div className="relative">
                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="number"
                                value={dailyBudget}
                                onChange={e => setDailyBudget(Number(e.target.value))}
                                className="w-full bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 font-mono text-xl font-bold transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Main ROI Card */}
                    <div className={`relative overflow-hidden rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 ${
                        roi > 0
                            ? 'bg-primary text-white shadow-2xl shadow-primary/30'
                            : roi === 0
                            ? 'bg-slate-600 text-white shadow-xl'
                            : 'bg-red-600 text-white shadow-2xl shadow-red-500/30'
                    }`}>
                        <div className="absolute -top-10 -right-10 opacity-20 mix-blend-overlay">
                            <TrendingUp className="w-48 h-48" />
                        </div>
                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">Estimated Monthly ROI</p>
                                <p className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter drop-shadow-md">{roi > 0 ? '+' : ''}{roi.toFixed(0)}%</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 w-full sm:w-auto text-center">
                                <p className="text-sm font-bold text-white">
                                    {roi > 100 ? '🔥 Exceptional!' : roi > 50 ? '✅ Strong!' : roi > 0 ? '📊 Positive' : '⚠️ Adjust inputs'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Daily Leads</span>
                            </div>
                            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{dailyLeads}</p>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-medium">@ ₹{(currentCpl || 50).toFixed(0)} CPL</p>
                        </div>
                        <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Daily Sales</span>
                            </div>
                            <p className="text-2xl sm:text-3xl font-black text-primary tracking-tight">{dailyConversions.toFixed(1)}</p>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-medium">@ {conversionRate}% conv.</p>
                        </div>
                        <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Daily Rev</span>
                            </div>
                            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">₹{dailyRevenue.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Rev</span>
                            </div>
                            <p className="text-xl sm:text-2xl font-black text-primary tracking-tight truncate">₹{monthlyRevenue.toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    {/* Break-even */}
                    <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-primary" /> Break-Even Analysis
                        </h4>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            Need <span className="font-black text-primary">{breakEvenCr.toFixed(1)}%</span> conversion rate 
                            to break even at ₹{dailyBudget}/day spend.
                        </p>
                        <div className="mt-4 w-full bg-slate-200 dark:bg-white/10 rounded-full h-4 overflow-hidden relative shadow-inner">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ease-out ${conversionRate >= breakEvenCr ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, breakEvenCr > 0 ? (conversionRate / breakEvenCr) * 50 : 0)}%` }}
                            />
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50 dark:bg-white/20" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════
//  MAIN GROWTH HUB COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function GrowthHub() {
    const navigate = useNavigate();
    const { isDarkMode } = useUI();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState([]);
    const [ctwaData, setCtwaData] = useState(null);
    const [metaConnected, setMetaConnected] = useState(null);
    const [dateRange, setDateRange] = useState('last_30d');

    // Phase 4: Retarget modal state
    const [retargetAd, setRetargetAd] = useState(null);
    const [retargetTemplates, setRetargetTemplates] = useState([]);
    const [retargetSelectedTpl, setRetargetSelectedTpl] = useState('');
    const [retargetSending, setRetargetSending] = useState(false);
    const [retargetLeadCount, setRetargetLeadCount] = useState(0);

    // Phase 5: CAPI state
    const [capiConfig, setCapiConfig] = useState({ pixelId: '', accessToken: '', testEventCode: '' });
    const [capiSaving, setCapiSaving] = useState(false);
    const [capiTesting, setCapiTesting] = useState(false);

    // ── Fetch all data on mount ─────────────────────────────
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [statusRes, campaignsRes] = await Promise.allSettled([
                    axios.get('/api/ctwa/status', { withCredentials: true }),
                    axios.get('/api/meta-ads', { withCredentials: true }),
                ]);

                if (statusRes.status === 'fulfilled') {
                    setMetaConnected(statusRes.value.data.connected);
                } else {
                    setMetaConnected(false);
                }

                if (campaignsRes.status === 'fulfilled') {
                    setCampaigns(campaignsRes.value.data || []);
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // ── Fetch CTWA dashboard data ─────────────────────────────
    const fetchCtwaData = useCallback(async () => {
        try {
            const res = await axios.get(`/api/ctwa/dashboard?dateRange=${dateRange}`, { withCredentials: true });
            setCtwaData(res.data);
        } catch {
            // Non-fatal: user might not have connected yet
            setCtwaData({ ads: [], totalLeads: 0, totalSpend: 0 });
        }
    }, [dateRange]);

    useEffect(() => {
        fetchCtwaData();
    }, [fetchCtwaData]);

    // ── Phase 4: Open retarget modal ─────────────────────────
    const handleRetarget = async (ad) => {
        setRetargetAd(ad);
        try {
            const [tplRes, leadsRes] = await Promise.allSettled([
                axios.get('/api/templates', { withCredentials: true }),
                axios.get(`/api/ctwa/leads?ad_id=${ad.adId}&limit=1`, { withCredentials: true })
            ]);
            if (tplRes.status === 'fulfilled') {
                const approved = (tplRes.value.data?.templates || tplRes.value.data || [])
                    .filter(t => t.status === 'APPROVED');
                setRetargetTemplates(approved);
            }
            if (leadsRes.status === 'fulfilled') {
                setRetargetLeadCount(leadsRes.value.data?.total || 0);
            }
        } catch { /* ignore */ }
    };

    const handleRetargetSend = async () => {
        if (!retargetSelectedTpl || !retargetAd) return;
        setRetargetSending(true);
        try {
            const res = await axios.post('/api/ctwa/retarget', {
                adId: retargetAd.adId,
                templateName: retargetSelectedTpl,
            }, { withCredentials: true });
            toast.success(`Retarget campaign sent to ${res.data?.sentCount || 0} leads!`);
            setRetargetAd(null);
            setRetargetSelectedTpl('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send retarget campaign');
        } finally {
            setRetargetSending(false);
        }
    };

    // ── Phase 5: CAPI handlers ─────────────────────────────
    const handleCapiSave = async () => {
        setCapiSaving(true);
        try {
            await axios.post('/api/ctwa/capi-config', capiConfig, { withCredentials: true });
            toast.success('CAPI configuration saved!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save CAPI config');
        } finally {
            setCapiSaving(false);
        }
    };

    const handleCapiTest = async () => {
        setCapiTesting(true);
        try {
            const res = await axios.post('/api/ctwa/capi-test', {}, { withCredentials: true });
            if (res.data?.success) {
                toast.success('Test event sent successfully! Check your Events Manager.');
            } else {
                toast.error(res.data?.error || 'Test event failed');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send test event');
        } finally {
            setCapiTesting(false);
        }
    };

    // Load CAPI config on mount
    useEffect(() => {
        if (activeTab === 'capi') {
            axios.get('/api/ctwa/capi-config', { withCredentials: true })
                .then(res => {
                    if (res.data) setCapiConfig(prev => ({ ...prev, ...res.data }));
                }).catch(() => { /* not configured yet */ });
        }
    }, [activeTab]);

    return (
        <div className="min-h-screen max-w-[1500px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-10">
            
            {/* ── Left Sidebar: Navigation ───────────────────────────────── */}
            <div className="lg:w-80 flex-shrink-0 space-y-6 lg:sticky lg:top-8 h-fit">
                {/* Hub Header */}
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md shadow-primary/30 border border-white/20">
                            <Rocket className="w-6 h-6 text-white" />
                        </div>
                        Growth Hub
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
                        Your AI-powered command center. Create campaigns, track leads, and maximize ROI effortlessly.
                    </p>
                </div>

                <button
                    onClick={() => navigate('/meta-ads/wizard')}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-4 rounded-xl font-black shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    Create AI Campaign
                </button>

                {/* Vertical Tabs */}
                <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-[2rem] p-3 shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col gap-1.5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 w-full text-left overflow-hidden group ${
                                    isActive
                                        ? 'text-primary'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabBg"
                                        className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-2xl border border-primary/10"
                                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                    />
                                )}
                                <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/30 scale-105' : 'bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/10'}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="relative z-10 tracking-tight text-[15px]">{tab.label}</span>
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto relative z-10 text-primary" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Main Content Area ──────────────────────────────────── */}
            <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="bg-white/60 dark:bg-surface-dark/60 backdrop-blur-3xl border border-white/80 dark:border-white/10 rounded-[2.5rem] p-6 lg:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none min-h-[calc(100vh-8rem)] relative overflow-hidden"
                    >
                        {/* Subtle background glow in main content area */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

                    {activeTab === 'overview' && (
                        <OverviewTab
                            campaigns={campaigns}
                            ctwaData={ctwaData}
                            loading={loading}
                            navigate={navigate}
                            metaConnected={metaConnected}
                        />
                    )}
                    {activeTab === 'campaigns' && (
                        <CampaignsTab
                            campaigns={campaigns}
                            loading={loading}
                            navigate={navigate}
                            isDarkMode={isDarkMode}
                        />
                    )}
                    {activeTab === 'leads' && (
                        <LeadsTab
                            isDarkMode={isDarkMode}
                            navigate={navigate}
                        />
                    )}
                    {activeTab === 'analytics' && (
                        <AnalyticsTab
                            ctwaData={ctwaData}
                            loading={loading}
                            dateRange={dateRange}
                            setDateRange={setDateRange}
                            onRefresh={fetchCtwaData}
                            isDarkMode={isDarkMode}
                            onRetarget={handleRetarget}
                        />
                    )}
                    {activeTab === 'capi' && (
                        <div className="space-y-8">
                            {/* CAPI Header */}
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-primary" />
                                    </div>
                                    Meta Conversions API (CAPI)
                                </h2>
                                <p className="text-sm text-slate-500 font-medium mt-2 max-w-2xl">
                                    Server-side event tracking for perfect attribution, lower CPA, and iOS 14+ privacy compliance.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-7 space-y-6">
                                    {/* CAPI Config Form */}
                                    <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 mb-2">
                                            <Settings className="w-5 h-5 text-primary" /> API Configuration
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                                                    <Hash className="w-4 h-4 text-slate-400" /> Pixel ID
                                                </label>
                                                <input
                                                    type="text"
                                                    value={capiConfig.pixelId}
                                                    onChange={e => setCapiConfig({ ...capiConfig, pixelId: e.target.value })}
                                                    placeholder="e.g. 123456789012345"
                                                    className="w-full bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 font-mono text-lg transition-all"
                                                />
                                                <p className="text-[11px] font-medium text-slate-400 mt-1.5">Find in Meta Events Manager → Data Sources</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                                                    <Shield className="w-4 h-4 text-slate-400" /> Access Token
                                                </label>
                                                <input
                                                    type="password"
                                                    value={capiConfig.accessToken}
                                                    onChange={e => setCapiConfig({ ...capiConfig, accessToken: e.target.value })}
                                                    placeholder="System User Access Token"
                                                    className="w-full bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 font-mono text-lg transition-all"
                                                />
                                                <p className="text-[11px] font-medium text-slate-400 mt-1.5">Generate in Events Manager → Settings → Generate Access Token</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Test Event Code <span className="text-slate-400 font-normal">(optional)</span></label>
                                            <input
                                                type="text"
                                                value={capiConfig.testEventCode}
                                                onChange={e => setCapiConfig({ ...capiConfig, testEventCode: e.target.value })}
                                                placeholder="e.g. TEST12345"
                                                className="w-full bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 font-mono text-lg transition-all"
                                            />
                                            <p className="text-[11px] font-medium text-slate-400 mt-1.5">Use this for testing events in Meta Events Manager before going live</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
                                            <button
                                                onClick={handleCapiSave}
                                                disabled={capiSaving || !capiConfig.pixelId || !capiConfig.accessToken}
                                                className="w-full sm:w-auto flex-1 flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-4 rounded-xl font-bold shadow-md shadow-primary/20 transition-all text-sm disabled:opacity-50"
                                            >
                                                {capiSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                                                Save Configuration
                                            </button>
                                            <button
                                                onClick={handleCapiTest}
                                                disabled={capiTesting || !capiConfig.pixelId || !capiConfig.accessToken}
                                                className="w-full sm:w-auto flex-1 flex justify-center items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-surface-dark border-2 border-slate-200 dark:border-white/10 px-6 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                                            >
                                                {capiTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
                                                Send Test Event
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-5 space-y-6">
                                    {/* Info Banner */}
                                    <div className="bg-primary rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                        <div className="relative z-10">
                                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20">
                                                <Target className="w-6 h-6 text-white" />
                                            </div>
                                            <h4 className="text-xl font-black mb-3">Why CAPI is Crucial</h4>
                                            <p className="text-sm text-blue-50 leading-relaxed">
                                                The Conversions API sends events directly from your server to Meta, completely bypassing browser limitations like ad blockers and iOS 14+ tracking preventions.
                                            </p>
                                            <div className="mt-6 bg-white/10 rounded-xl p-4 border border-white/20">
                                                <p className="text-xs font-bold uppercase tracking-wider text-blue-100 mb-1">Impact</p>
                                                <p className="text-2xl font-black">15-30%</p>
                                                <p className="text-[11px] text-blue-50 mt-1">Improvement in ad optimization & CPA reduction.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Events Auto-Fired */}
                                    <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl sm:rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-4">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Events Auto-Fired Server-Side</h3>
                                        <div className="flex flex-col gap-3">
                                            {[
                                                { event: 'Lead', desc: 'When a CTWA lead sends first message', color: 'emerald' },
                                                { event: 'InitiateCheckout', desc: 'When a cart is created in WA Store', color: 'blue' },
                                                { event: 'Purchase', desc: 'When a WA Store order is confirmed', color: 'purple' },
                                            ].map(ev => (
                                                <div key={ev.event} className="flex items-center gap-4 border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 rounded-2xl p-4 transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900 dark:text-white">{ev.event}</p>
                                                        <p className="text-[11px] text-slate-500 font-medium">{ev.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'roi' && (
                        <div className="relative z-10">
                            <RoiCalculatorTab ctwaData={ctwaData} />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
            </div>

            {/* ── Phase 4: Retarget Modal ──────────────────────── */}
            <AnimatePresence>
                {retargetAd && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setRetargetAd(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                                        <Send className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Retarget Leads</h3>
                                        <p className="text-xs text-slate-500">Send a template to all leads from this ad</p>
                                    </div>
                                </div>
                                <button onClick={() => setRetargetAd(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 space-y-4">
                                {/* Ad Info */}
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 flex items-center gap-3">
                                    {retargetAd.imageUrl ? (
                                        <img src={retargetAd.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
                                            <Megaphone className="w-5 h-5 text-indigo-500" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-sm text-slate-900 dark:text-white">{retargetAd.adName}</p>
                                        <p className="text-xs text-slate-500">{retargetAd.leads} leads · {retargetLeadCount} contacts found</p>
                                    </div>
                                </div>

                                {/* Template Selector */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Template to Send</label>
                                    {retargetTemplates.length === 0 ? (
                                        <div className="text-center py-4">
                                            <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm text-slate-500">No approved templates found.</p>
                                        </div>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto space-y-2">
                                            {retargetTemplates.map(tpl => (
                                                <div
                                                    key={tpl.name}
                                                    onClick={() => setRetargetSelectedTpl(tpl.name)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                        retargetSelectedTpl === tpl.name
                                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                                                            : 'border-slate-100 dark:border-white/5 hover:border-purple-200'
                                                    }`}
                                                >
                                                    <Mail className={`w-4 h-4 flex-shrink-0 ${retargetSelectedTpl === tpl.name ? 'text-purple-500' : 'text-slate-400'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{tpl.name}</p>
                                                        <p className="text-[11px] text-slate-400">{tpl.category} · {tpl.language}</p>
                                                    </div>
                                                    {retargetSelectedTpl === tpl.name && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3">
                                <button
                                    onClick={() => setRetargetAd(null)}
                                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRetargetSend}
                                    disabled={retargetSending || !retargetSelectedTpl}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-bold shadow-md shadow-primary/20 transition-all text-sm disabled:opacity-50"
                                >
                                    {retargetSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Send to {retargetLeadCount} Leads
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
