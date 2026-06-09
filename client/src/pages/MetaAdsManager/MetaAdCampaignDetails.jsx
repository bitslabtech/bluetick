import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, RefreshCw, BarChart2, MousePointerClick, 
    Eye, Target, CreditCard, Clock, CheckCircle2, AlertCircle, XCircle, Trash2, PauseCircle, PlayCircle
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { useUI } from '../../context/UIContext';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function MetaAdCampaignDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useUI();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchCampaign = async (forceSync = false) => {
        try {
            if (forceSync) setSyncing(true);
            const res = await axios.get(`/api/meta-ads/${id}${forceSync ? '?sync=true' : ''}`, { withCredentials: true });
            setCampaign(res.data);
        } catch (err) {
            showToast?.error(err.response?.data?.error || 'Failed to load campaign details');
            if (!campaign) navigate('/growth-hub');
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchCampaign(true); // Auto-sync on initial load
    }, [id]);

    const handleToggleStatus = async () => {
        if (!campaign) return;
        const isRunning = campaign.status === 'Active' || campaign.status === 'Published';
        const action = isRunning ? 'pause' : 'resume';
        setActionLoading(true);
        try {
            const res = await axios.patch(`/api/meta-ads/${campaign.id}/status`, { action }, { withCredentials: true });
            setCampaign(prev => ({ ...prev, status: res.data.status }));
            showToast?.success(`Campaign ${action === 'pause' ? 'paused' : 'resumed'} successfully`);
        } catch (err) {
            showToast?.error(err.response?.data?.error || `Failed to ${action} campaign`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!campaign || !window.confirm(`Delete "${campaign.campaignName}"? This will also archive it on Meta.`)) return;
        setActionLoading(true);
        try {
            await axios.delete(`/api/meta-ads/${campaign.id}`, { withCredentials: true });
            showToast?.success('Campaign deleted');
            navigate('/growth-hub');
        } catch (err) {
            showToast?.error(err.response?.data?.error || 'Failed to delete campaign');
            setActionLoading(false);
        }
    };

    if (loading && !campaign) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton height={60} className="rounded-2xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton height={100} count={4} className="rounded-2xl" /></div>
                <Skeleton height={300} className="rounded-2xl" />
            </div>
        );
    }

    if (!campaign) return null;

    const insights = campaign.insights || {};
    const metrics = [
        { label: 'Total Spend', value: `₹${parseFloat(insights.spend || 0).toLocaleString()}`, icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        { label: 'Impressions', value: parseInt(insights.impressions || 0).toLocaleString(), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
        { label: 'Link Clicks', value: parseInt(insights.clicks || 0).toLocaleString(), icon: MousePointerClick, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
        { label: 'Reach', value: parseInt(insights.reach || 0).toLocaleString(), icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    ];

    const targeting = campaign.targeting || {};
    const isRunning = campaign.status === 'Active' || campaign.status === 'Published';

    // Mock chart data for now since we don't store time-series insights yet.
    // Ideally, we'd fetch historical insights from Meta, but this shows the structure.
    const chartData = [
        { name: 'Day 1', impressions: Math.floor(parseInt(insights.impressions||0)*0.1), clicks: Math.floor(parseInt(insights.clicks||0)*0.1) },
        { name: 'Day 2', impressions: Math.floor(parseInt(insights.impressions||0)*0.3), clicks: Math.floor(parseInt(insights.clicks||0)*0.2) },
        { name: 'Day 3', impressions: Math.floor(parseInt(insights.impressions||0)*0.6), clicks: Math.floor(parseInt(insights.clicks||0)*0.7) },
        { name: 'Today', impressions: parseInt(insights.impressions||0), clicks: parseInt(insights.clicks||0) },
    ];

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark font-display overflow-y-auto">
            {/* Header */}
            <div className="px-4 md:px-8 py-6 border-b border-slate-200 dark:border-white/5 bg-white/90 dark:bg-surface-dark/90 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/growth-hub" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{campaign.campaignName}</h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${isRunning ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'}`}>
                                    {isRunning && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
                                    {campaign.status}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                <span className="font-mono text-xs">{campaign.metaCampaignId || 'Draft'}</span>
                                • Created {new Date(campaign.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => fetchCampaign(true)} 
                            disabled={syncing}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-primary' : ''}`} />
                            Sync Data
                        </button>
                        {campaign.metaCampaignId && (
                            <button 
                                onClick={handleToggleStatus}
                                disabled={actionLoading}
                                className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm font-semibold transition-colors ${isRunning ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/20' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/20'}`}
                            >
                                {isRunning ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                                {isRunning ? 'Pause' : 'Resume'}
                            </button>
                        )}
                        <button 
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metrics.map((m, i) => {
                        const Icon = m.icon;
                        return (
                            <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg ${m.bg} ${m.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.label}</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{m.value}</h3>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-primary" /> Performance Overview
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} stroke="#64748b" />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} stroke="#64748b" />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="impressions" name="Impressions" stroke="#3b82f6" strokeWidth={3} fill="url(#colorImp)" />
                                    <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#a855f7" strokeWidth={3} fill="url(#colorClick)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Targeting & Config */}
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary" /> Configuration
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Budget</label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-lg">
                                        ₹{campaign.dailyBudget || (campaign.targeting?.lifetime_budget ? (campaign.targeting.lifetime_budget/100) + ' (Fixed)' : 0)} 
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Objective</label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-lg capitalize">
                                        {campaign.objective?.replace(/_/g, ' ') || 'Engagement'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Targeting</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Age Range</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{targeting.age_min || 18} - {targeting.age_max || 65}+</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block mb-1.5">Locations</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(targeting.locations || ['India']).map(loc => (
                                            <span key={loc} className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded text-xs font-semibold">{loc}</span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block mb-1.5">Interests</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(targeting.interests || ['General']).map(int => (
                                            <span key={int} className="px-2 py-1 bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 rounded text-xs font-medium">{int}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
