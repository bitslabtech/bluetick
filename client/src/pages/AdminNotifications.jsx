import { useState, useEffect, useRef } from 'react';
import TrialBanner from '../components/TrialBanner';
import axios from 'axios';
import {
    CheckCircle2, AlertTriangle, XCircle, Info,
    CheckCheck, Bell, Send, Trash2, Users, Layers, User, Eye, History,
    Clock, RefreshCw, Zap, Play, Calendar, ShieldCheck, FileCode, Check, X,
    ChevronDown, ChevronRight, AlertCircle, Smartphone, ExternalLink, Filter, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';

const AdminNotifications = () => {
    const { user } = useAuth();
    const { showToast } = useUI();
    const [searchTerm, setSearchTerm] = useState('');

    // Active Top Navigation Tab
    const [activeMainTab, setActiveMainTab] = useState('inactivity'); // 'inactivity' | 'broadcasts'

    // ── Broadcast Data States ────────────────────────────────────────────────
    const [broadcasts, setBroadcasts] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [plansList, setPlansList] = useState([]);

    // UI States
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const historyRef = useRef(null);

    // Broadcast Form State
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        buttonName: '',
        buttonUrl: '',
        type: 'Info', // Info, Success, Warning, Error
        targetType: 'All Users', // All Users, Specific User, Plan Subscribers
        targetValue: ''
    });

    // ── Inactivity Alert Automation States ────────────────────────────────────
    const [inactivityConfig, setInactivityConfig] = useState({
        enabled: false,
        days: 7,
        targetType: 'all', // 'all' | 'plans'
        targetPlans: [],
        templateName: '',
        languageCode: 'en_US',
        hasButtonUrl: true,
        buttonUrl: 'login',
        lastRunAt: null,
        totalSent: 0
    });
    const [inactivityStats, setInactivityStats] = useState({
        currentInactiveCount: 0,
        alreadyAlertedCount: 0,
        pendingAlertCount: 0
    });
    const [systemTemplates, setSystemTemplates] = useState([]);
    const [inactivityLogs, setInactivityLogs] = useState([]);
    const [previewUsers, setPreviewUsers] = useState([]);
    const [loadingInactivity, setLoadingInactivity] = useState(false);
    const [savingInactivity, setSavingInactivity] = useState(false);
    const [triggeringNow, setTriggeringNow] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showTriggerConfirmModal, setShowTriggerConfirmModal] = useState(false);
    const [triggerResult, setTriggerResult] = useState(null);

    useEffect(() => {
        fetchBroadcasts();
        fetchMetadata();
        fetchInactivityData();
    }, []);

    const fetchBroadcasts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications`);
            setBroadcasts(res.data);
        } catch (err) {
            console.error("Error fetching broadcasts:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const [usersRes, plansRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/plans`)
            ]);
            setUsersList(usersRes.data);
            setPlansList(plansRes.data);
        } catch (err) {
            console.error("Error fetching metadata:", err);
        }
    };

    const fetchInactivityData = async () => {
        setLoadingInactivity(true);
        try {
            const [configRes, templatesRes, logsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/inactivity/config`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/templates/system`).catch(() => ({ data: [] })),
                axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/inactivity/logs`).catch(() => ({ data: [] }))
            ]);

            if (configRes.data?.config) {
                setInactivityConfig(configRes.data.config);
                setInactivityStats({
                    currentInactiveCount: configRes.data.currentInactiveCount || 0,
                    alreadyAlertedCount: configRes.data.alreadyAlertedCount || 0,
                    pendingAlertCount: configRes.data.pendingAlertCount || 0
                });
            }
            setSystemTemplates(templatesRes.data || []);
            setInactivityLogs(logsRes.data || []);
        } catch (err) {
            console.error("Error fetching inactivity data:", err);
        } finally {
            setLoadingInactivity(false);
        }
    };

    const handleSaveInactivityConfig = async (overrideConfig) => {
        setSavingInactivity(true);
        try {
            const payload = overrideConfig || inactivityConfig;
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/inactivity/config`, payload);
            setInactivityConfig(res.data.config);
            showToast({ type: 'success', title: 'Settings Saved', message: 'Inactivity alert configuration updated successfully.' });
            // Refresh stats
            const statsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/inactivity/config`);
            if (statsRes.data) {
                setInactivityStats({
                    currentInactiveCount: statsRes.data.currentInactiveCount || 0,
                    alreadyAlertedCount: statsRes.data.alreadyAlertedCount || 0,
                    pendingAlertCount: statsRes.data.pendingAlertCount || 0
                });
            }
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Save Failed', message: err.response?.data?.error || 'Failed to save configuration.' });
        } finally {
            setSavingInactivity(false);
        }
    };

    const handleToggleInactivity = async () => {
        const updated = { ...inactivityConfig, enabled: !inactivityConfig.enabled };
        setInactivityConfig(updated);
        await handleSaveInactivityConfig(updated);
    };

    const refreshMatchingCount = async (days = inactivityConfig.days, targetType = inactivityConfig.targetType, targetPlans = inactivityConfig.targetPlans) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/inactivity/preview`, {
                params: {
                    days,
                    targetType,
                    targetPlans: Array.isArray(targetPlans) ? targetPlans.join(',') : targetPlans
                }
            });
            if (res.data) {
                setInactivityStats(prev => ({
                    ...prev,
                    currentInactiveCount: res.data.count || 0
                }));
            }
        } catch (e) {
            console.error("Failed to refresh matching count:", e);
        }
    };

    const handleDaysChange = (newDays) => {
        const val = Math.max(1, parseInt(newDays) || 1);
        setInactivityConfig(prev => ({ ...prev, days: val }));
        refreshMatchingCount(val, inactivityConfig.targetType, inactivityConfig.targetPlans);
    };

    const handleSelectPresetDays = (d) => {
        setInactivityConfig(prev => ({ ...prev, days: d }));
        refreshMatchingCount(d, inactivityConfig.targetType, inactivityConfig.targetPlans);
    };

    const handleTargetTypeChange = (type) => {
        setInactivityConfig(prev => ({ ...prev, targetType: type }));
        refreshMatchingCount(inactivityConfig.days, type, inactivityConfig.targetPlans);
    };

    const togglePlanSelection = (planName) => {
        setInactivityConfig(prev => {
            const current = prev.targetPlans || [];
            const exists = current.includes(planName);
            const updated = exists ? current.filter(p => p !== planName) : [...current, planName];
            refreshMatchingCount(prev.days, prev.targetType, updated);
            return { ...prev, targetPlans: updated };
        });
    };

    const handlePreviewInactiveUsers = async () => {
        setPreviewLoading(true);
        setShowPreviewModal(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/inactivity/preview`, {
                params: {
                    days: inactivityConfig.days,
                    targetType: inactivityConfig.targetType,
                    targetPlans: (inactivityConfig.targetPlans || []).join(',')
                }
            });
            setPreviewUsers(res.data.users || []);
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Preview Error', message: 'Failed to preview inactive users.' });
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleTriggerInactivityNow = async () => {
        if (!inactivityConfig.templateName) {
            showToast({ type: 'error', title: 'Template Required', message: 'Please select or enter a WhatsApp Template before triggering.' });
            return;
        }

        setTriggeringNow(true);
        setShowTriggerConfirmModal(false);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/notifications/inactivity/trigger`, {
                force: true,
                days: inactivityConfig.days,
                targetType: inactivityConfig.targetType,
                targetPlans: inactivityConfig.targetPlans,
                templateName: inactivityConfig.templateName,
                languageCode: inactivityConfig.languageCode,
                hasButtonUrl: inactivityConfig.hasButtonUrl,
                buttonUrl: inactivityConfig.buttonUrl
            });

            setTriggerResult(res.data);
            showToast({
                type: 'success',
                title: 'Check Completed',
                message: `Sent to ${res.data.sentCount || 0} user(s). Skipped: ${res.data.skippedCount || 0}, Failed: ${res.data.failedCount || 0}`
            });

            // Refresh logs and stats
            fetchInactivityData();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Execution Failed', message: err.response?.data?.error || 'Failed to trigger notifications.' });
        } finally {
            setTriggeringNow(false);
        }
    };

    // ── Broadcast Handlers ───────────────────────────────────────────────────
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this broadcast?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/notifications/${id}`);
            setBroadcasts(prev => prev.filter(b => b.id !== id));
            showToast({ type: 'success', title: 'Deleted', message: 'Broadcast deleted successfully.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Delete Failed', message: 'Failed to delete broadcast.' });
        }
    };

    const handleSend = async () => {
        setSending(true);
        try {
            const payload = { ...formData };
            await axios.post(`${import.meta.env.VITE_API_URL}/api/notifications`, payload);
            showToast({ type: 'success', title: 'Sent', message: 'Broadcast sent successfully!' });
            setShowPreview(false);
            setFormData({
                title: '',
                message: '',
                buttonName: '',
                buttonUrl: '',
                type: 'Info',
                targetType: 'All Users',
                targetValue: ''
            });
            await fetchBroadcasts();
            if (historyRef.current) historyRef.current.scrollTop = 0;
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Send Failed', message: 'Failed to send broadcast.' });
        } finally {
            setSending(false);
        }
    };

    const getTypeStyles = (type) => {
        switch (type) {
            case 'Success': return {
                color: 'text-green-700 dark:text-green-300',
                bg: 'bg-green-100 dark:bg-green-500/20',
                border: 'border-green-200 dark:border-green-500/20',
                icon: <CheckCircle2 className="w-5 h-5" />
            };
            case 'Warning': return {
                color: 'text-amber-700 dark:text-amber-300',
                bg: 'bg-amber-100 dark:bg-amber-500/20',
                border: 'border-amber-200 dark:border-amber-500/20',
                icon: <AlertTriangle className="w-5 h-5" />
            };
            case 'Error': return {
                color: 'text-red-700 dark:text-red-300',
                bg: 'bg-red-100 dark:bg-red-500/20',
                border: 'border-red-200 dark:border-red-500/20',
                icon: <XCircle className="w-5 h-5" />
            };
            default: return {
                color: 'text-indigo-700 dark:text-indigo-300',
                bg: 'bg-indigo-100 dark:bg-indigo-500/20',
                border: 'border-indigo-200 dark:border-indigo-500/20',
                icon: <Info className="w-5 h-5" />
            };
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-hidden">
            <AdminHeader searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)}>
                <TrialBanner />
                <ThemeToggle />
            </AdminHeader>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] max-w-full mx-auto w-full pb-16 sm:pb-24">
                {/* Header & Main Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Bell className="w-7 h-7 text-indigo-500" /> Notifications & Broadcasts
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Manage user inactivity WhatsApp re-engagement and system-wide broadcast notifications.
                        </p>
                    </div>

                    {/* Top Level Feature Tabs */}
                    <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto hide-scrollbar">
                        <button
                            onClick={() => setActiveMainTab('inactivity')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                                activeMainTab === 'inactivity'
                                    ? 'bg-white dark:bg-surface-dark text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Clock className="w-4 h-4 text-amber-500" /> User Inactivity Automation
                            {inactivityConfig.enabled && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveMainTab('broadcasts')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                                activeMainTab === 'broadcasts'
                                    ? 'bg-white dark:bg-surface-dark text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Send className="w-4 h-4 text-indigo-500" /> In-App Broadcasts ({broadcasts.length})
                        </button>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════════════ */}
                {/* TAB 1: USER INACTIVITY NOTIFICATION AUTOMATION                         */}
                {/* ══════════════════════════════════════════════════════════════════════ */}
                {activeMainTab === 'inactivity' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* Live Status & Quick Action Hero Card */}
                        <div className="bg-gradient-to-br from-indigo-900/10 via-white to-amber-500/5 dark:from-slate-900 dark:via-surface-dark dark:to-indigo-950/20 border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                <div className="space-y-2 max-w-2xl">
                                    <div className="flex items-center gap-2.5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                            inactivityConfig.enabled
                                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}>
                                            <span className={`w-2 h-2 rounded-full ${inactivityConfig.enabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                                            {inactivityConfig.enabled ? 'Automation Active' : 'Automation Paused'}
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">Runs automatically every 1 hour via background scheduler</span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                                        Last Login Inactivity Check & WhatsApp Template Trigger
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Monitors registered users whose last login date is older than your configured threshold (e.g. 7 days).
                                        When triggered, automatically dispatches an approved Meta WhatsApp template to re-engage them.
                                    </p>
                                </div>

                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
                                    {/* Enable / Disable Toggle Switch */}
                                    <button
                                        type="button"
                                        onClick={handleToggleInactivity}
                                        disabled={savingInactivity}
                                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all border ${
                                            inactivityConfig.enabled
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-500/20'
                                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        {inactivityConfig.enabled ? (
                                            <>
                                                <Check className="w-4 h-4" /> Enabled (Click to Pause)
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 text-emerald-500" /> Click to Activate
                                            </>
                                        )}
                                    </button>

                                    {/* Run Check Now Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowTriggerConfirmModal(true)}
                                        disabled={triggeringNow}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
                                    >
                                        {triggeringNow ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" /> Scanning & Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4 text-amber-300" /> Run Check & Send Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Metrics Strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10">
                                <div className="bg-white/70 dark:bg-black/20 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                                    <p className="text-[11px] font-bold uppercase text-slate-400">Trigger Threshold</p>
                                    <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                        {inactivityConfig.days} Days Inactive
                                    </p>
                                </div>

                                <div className="bg-white/70 dark:bg-black/20 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                                    <p className="text-[11px] font-bold uppercase text-slate-400">Currently Inactive</p>
                                    <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                        {inactivityStats.currentInactiveCount} Users
                                    </p>
                                </div>

                                <div className="bg-white/70 dark:bg-black/20 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                                    <p className="text-[11px] font-bold uppercase text-slate-400">Total Alerts Sent</p>
                                    <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                                        {inactivityConfig.totalSent || 0} Delivered
                                    </p>
                                </div>

                                <div className="bg-white/70 dark:bg-black/20 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                                    <p className="text-[11px] font-bold uppercase text-slate-400">Last Scanned</p>
                                    <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
                                        {inactivityConfig.lastRunAt ? formatDistanceToNow(new Date(inactivityConfig.lastRunAt), { addSuffix: true }) : 'Never'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Main Inactivity Configuration Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* LEFT: Configuration Editor Card */}
                            <div className="lg:col-span-7 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-indigo-500" /> Trigger & Target Configuration
                                    </h3>
                                    <a
                                        href="/swagger"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                    >
                                        <FileCode className="w-3.5 h-3.5" /> API Docs (/swagger)
                                    </a>
                                </div>

                                {/* Step 1: Inactivity Days Threshold (Prominent Editbox) */}
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                            1. Inactivity Days Threshold <span className="text-red-500">*</span>
                                        </label>
                                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/50">
                                            Triggers when lastLogin &ge; {inactivityConfig.days} days ago
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Enter the number of days a user must be inactive before triggering the alert. If you enter <strong className="text-slate-800 dark:text-slate-200">7</strong>, users inactive for 7+ days will be triggered; if you enter <strong className="text-slate-800 dark:text-slate-200">14</strong>, they trigger after 14+ days.
                                    </p>

                                    {/* Direct Editbox + Preset Buttons */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min="1"
                                                max="365"
                                                value={inactivityConfig.days}
                                                onChange={(e) => handleDaysChange(e.target.value)}
                                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-2 border-indigo-500/40 focus:border-indigo-600 dark:border-indigo-500/30 dark:focus:border-indigo-400 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-900 dark:text-white font-black text-xl tracking-tight transition-all"
                                                placeholder="e.g. 7"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                                                Days
                                            </span>
                                        </div>

                                        {/* Quick Select Preset Buttons */}
                                        <div className="flex flex-wrap gap-1.5 shrink-0">
                                            {[3, 7, 14, 21, 30, 60].map(d => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => handleSelectPresetDays(d)}
                                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                                        inactivityConfig.days === d
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 scale-105'
                                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {d}d
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Real-time Matching Users Pill */}
                                    <div className="flex items-center justify-between p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                            <span className="text-slate-700 dark:text-slate-200">
                                                Currently <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{inactivityStats.currentInactiveCount} user(s)</strong> have not logged in for <strong>{inactivityConfig.days}+ days</strong>
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => refreshMatchingCount(inactivityConfig.days, inactivityConfig.targetType, inactivityConfig.targetPlans)}
                                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Refresh Count
                                        </button>
                                    </div>
                                </div>

                                {/* Step 2: WhatsApp Template Live Preview & Variable Structure */}
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                            2. WhatsApp Template Live Preview
                                        </label>
                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                                            2 Body Variables + 1 Button URL
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Bluetick automatically injects <code className="font-bold text-indigo-600 dark:text-indigo-400">{'{{1}}'} User Name</code> and <code className="font-bold text-amber-600 dark:text-amber-400">{'{{2}}'} Inactive Days ({inactivityConfig.days})</code> into your template body, plus dynamic URL on the button.
                                    </p>

                                    {/* Realistic WhatsApp Chat Bubble */}
                                    <div className="bg-[#EFEAE2] dark:bg-[#0b141a] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                                        <div className="max-w-md mx-auto space-y-3">
                                            <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-sm p-4 shadow-sm border border-black/5 dark:border-white/5 space-y-2.5 relative">
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                                                        B
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                                            Bluetick Cloud <CheckCircle2 className="w-3 h-3 text-emerald-500 inline fill-emerald-500/20" />
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Simulated Message Copy with Live Days */}
                                                <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-2">
                                                    <p>
                                                        Hi <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/40">Alex Sharma</span> 👋
                                                    </p>
                                                    <p>
                                                        It's been <span className="font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/50">{inactivityConfig.days} days</span> since your last login.
                                                    </p>
                                                    <p>
                                                        Are you facing any issues or need any assistance? We're here to help you get the most out of your WhatsApp automation!
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                                                    <span>10:30 AM</span>
                                                    <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                                                </div>

                                                {/* Simulated Action Button */}
                                                {inactivityConfig.hasButtonUrl && (
                                                    <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                                                        <div className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-[#111b21] dark:hover:bg-[#182229] rounded-xl text-center font-bold text-xs text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-white/5 flex items-center justify-center gap-1.5 cursor-default transition-colors">
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            <span>Login / Open Dashboard</span>
                                                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                                                ({inactivityConfig.buttonUrl || 'login'})
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Variable Breakdown Grid */}
                                            <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 shadow-sm">
                                                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Parameter Structure Dispatched to Meta:
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono">
                                                    <div className="bg-slate-50 dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold block">Body {'{{1}}'}</span>
                                                        <span className="text-slate-700 dark:text-slate-300 font-sans">User's Full Name</span>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                                                        <span className="text-amber-600 dark:text-amber-400 font-bold block">Body {'{{2}}'}</span>
                                                        <span className="text-slate-700 dark:text-slate-300 font-sans">{inactivityConfig.days} (Days Inactive)</span>
                                                    </div>
                                                    {inactivityConfig.hasButtonUrl && (
                                                        <div className="bg-slate-50 dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700 sm:col-span-2">
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold block">Button {'{{1}}'} (Dynamic URL)</span>
                                                            <span className="text-slate-700 dark:text-slate-300 font-sans">{inactivityConfig.buttonUrl || 'login'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 3: Button Dynamic URL Parameter Editbox */}
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                                                3. Button Dynamic URL Variable
                                            </label>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Injects a redirect path/url into your Meta template button's dynamic URL variable <code>{'{{1}}'}</code>.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setInactivityConfig({ ...inactivityConfig, hasButtonUrl: !inactivityConfig.hasButtonUrl })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                inactivityConfig.hasButtonUrl
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                                            }`}
                                        >
                                            {inactivityConfig.hasButtonUrl ? 'Enabled' : 'Disabled'}
                                        </button>
                                    </div>

                                    {inactivityConfig.hasButtonUrl && (
                                        <div className="space-y-1.5">
                                            <input
                                                type="text"
                                                placeholder="e.g. login or https://app.bluetick.com/login"
                                                value={inactivityConfig.buttonUrl || ''}
                                                onChange={(e) => setInactivityConfig({ ...inactivityConfig, buttonUrl: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm font-mono"
                                            />
                                            <span className="text-[11px] text-slate-400 block">
                                                Enter the URL suffix (e.g. <code className="font-bold">login</code>) or full URL depending on how your Meta template button is defined.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Step 4: Target Audience (All Users or Specific Plans with Multi-Selection) */}
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                                    <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                                        4. Target Audience <span className="text-red-500">*</span>
                                    </label>

                                    {/* Audience Mode Switch */}
                                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => handleTargetTypeChange('all')}
                                            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                                inactivityConfig.targetType === 'all'
                                                    ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <Users className="w-4 h-4 text-indigo-500" /> All Users
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleTargetTypeChange('plans')}
                                            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                                inactivityConfig.targetType === 'plans'
                                                    ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <Layers className="w-4 h-4 text-amber-500" /> Specific Plans (Multi-Select)
                                        </button>
                                    </div>

                                    {/* Multiple Plan Selection Checkbox / Pills */}
                                    {inactivityConfig.targetType === 'plans' && (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3 animate-in fade-in duration-150">
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    Select Subscription Plans:
                                                </p>
                                                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                                    {(inactivityConfig.targetPlans || []).length} selected
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {/* Built-in fallback plans plus dynamic plans */}
                                                {Array.from(new Set(['Free', 'Starter', 'Pro', 'Enterprise', ...plansList.map(p => p.name)])).map(planName => {
                                                    const isSelected = (inactivityConfig.targetPlans || []).includes(planName);
                                                    return (
                                                        <button
                                                            key={planName}
                                                            type="button"
                                                            onClick={() => togglePlanSelection(planName)}
                                                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                                                                isSelected
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                            }`}
                                                        >
                                                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                                                                isSelected ? 'bg-white text-indigo-600 font-black' : 'border border-slate-300 dark:border-slate-600'
                                                            }`}>
                                                                {isSelected && '✓'}
                                                            </span>
                                                            {planName}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {(!inactivityConfig.targetPlans || inactivityConfig.targetPlans.length === 0) && (
                                                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                                                    <AlertTriangle className="w-3.5 h-3.5" /> Please select at least one plan, or switch to "All Users".
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Step 5: Meta WhatsApp Template Selection */}
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                                            5. WhatsApp Template <span className="text-red-500">*</span>
                                        </label>
                                        <span className="text-xs text-slate-400">Must be approved in Meta</span>
                                    </div>

                                    {/* Template Selection Dropdown */}
                                    <div className="space-y-2">
                                        {systemTemplates.length > 0 ? (
                                             <div className="relative">
                                                <select
                                                    value={inactivityConfig.templateName}
                                                    onChange={(e) => {
                                                        const selected = systemTemplates.find(t => t.name === e.target.value);
                                                        setInactivityConfig({
                                                            ...inactivityConfig,
                                                            templateName: e.target.value,
                                                            languageCode: selected?.language || inactivityConfig.languageCode || 'en_US'
                                                        });
                                                    }}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="">Select an approved Meta Template...</option>
                                                    {systemTemplates.map(tpl => (
                                                        <option key={tpl.id || tpl.name} value={tpl.name}>
                                                            {tpl.name} ({tpl.language || 'en'}) — {tpl.status || 'APPROVED'}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Enter Meta template name (e.g. user_inactivity_reminder)"
                                                value={inactivityConfig.templateName}
                                                onChange={(e) => setInactivityConfig({ ...inactivityConfig, templateName: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm font-mono"
                                            />
                                        )}

                                        {/* Fallback Manual Name & Language Inputs */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                                                    Template Name (Custom / Exact)
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. we_miss_you_v1"
                                                    value={inactivityConfig.templateName}
                                                    onChange={(e) => setInactivityConfig({ ...inactivityConfig, templateName: e.target.value })}
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                                                    Language Code
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. en_US or en"
                                                    value={inactivityConfig.languageCode}
                                                    onChange={(e) => setInactivityConfig({ ...inactivityConfig, languageCode: e.target.value })}
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={handlePreviewInactiveUsers}
                                        className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Eye className="w-4 h-4 text-slate-500" /> Preview Inactive Users ({inactivityStats.currentInactiveCount})
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSaveInactivityConfig()}
                                        disabled={savingInactivity}
                                        className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {savingInactivity ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" /> Saving Settings...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" /> Save Configuration
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT: Inactivity Audit Logs & History */}
                            <div className="lg:col-span-5 flex flex-col space-y-4">
                                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col h-full min-h-[480px]">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5 mb-3">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                            <History className="w-4 h-4 text-indigo-500" /> Delivery Audit Logs
                                        </h3>
                                        <button
                                            onClick={fetchInactivityData}
                                            className="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-semibold"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" /> Refresh
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1">
                                        {inactivityLogs.length === 0 ? (
                                            <div className="text-center py-16 text-slate-400">
                                                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                <p className="text-xs font-semibold">No inactivity alerts sent yet</p>
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    When users cross the {inactivityConfig.days}-day inactivity limit, dispatched logs will appear here.
                                                </p>
                                            </div>
                                        ) : (
                                            inactivityLogs.map(log => (
                                                <div
                                                    key={log.id}
                                                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl space-y-1.5 transition-all hover:border-slate-300"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                            {log.userName || 'Unnamed User'}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                            log.status === 'SENT'
                                                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                                                                : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                                                        }`}>
                                                            {log.status}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                                        <span>{log.userPhone} • Plan: {log.userPlan}</span>
                                                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                            {log.daysInactive}d inactive
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-white/5">
                                                        <span className="font-mono truncate max-w-[160px]">
                                                            Tpl: {log.templateName}
                                                        </span>
                                                        <span>
                                                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                                        </span>
                                                    </div>

                                                    {log.error && (
                                                        <p className="text-[10px] text-rose-500 font-mono truncate">
                                                            Err: {log.error}
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════════ */}
                {/* TAB 2: IN-APP BROADCAST MANAGER (EXISTING FEATURE PRESERVED 100%)       */}
                {/* ══════════════════════════════════════════════════════════════════════ */}
                {activeMainTab === 'broadcasts' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-in fade-in duration-200">
                        {/* LEFT PANEL: CREATOR */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-200 dark:border-white/5 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Send className="w-5 h-5 text-indigo-500" /> Create Broadcast
                                </h2>

                                <div className="space-y-5">
                                    {/* Type Selection */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Notification Type</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {['Info', 'Success', 'Warning', 'Error'].map(type => {
                                                const activeStyles = getTypeStyles(type);
                                                const isActive = formData.type === type;
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => setFormData({ ...formData, type })}
                                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive
                                                            ? `${activeStyles.border} ${activeStyles.bg}`
                                                            : 'border-transparent bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <div className={`${isActive ? activeStyles.color : 'text-slate-400'}`}>
                                                            {type === 'Info' && <Info className="w-6 h-6" />}
                                                            {type === 'Success' && <CheckCircle2 className="w-6 h-6" />}
                                                            {type === 'Warning' && <AlertTriangle className="w-6 h-6" />}
                                                            {type === 'Error' && <XCircle className="w-6 h-6" />}
                                                        </div>
                                                        <span className={`text-xs mt-2 font-bold ${isActive ? activeStyles.color : 'text-slate-500'}`}>{type}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Target Selection */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Target Audience</label>
                                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-4">
                                            {['All Users', 'Specific User', 'Plan Subscribers'].map(target => (
                                                <button
                                                    key={target}
                                                    onClick={() => setFormData({ ...formData, targetType: target, targetValue: '' })}
                                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.targetType === target
                                                        ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                        }`}
                                                >
                                                    {target}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Dynamic Inputs Based on Target */}
                                        <AnimatePresence mode='wait'>
                                            {formData.targetType === 'Specific User' && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                                        <select
                                                            value={formData.targetValue}
                                                            onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white appearance-none"
                                                        >
                                                            <option value="" className="bg-white dark:bg-[#1e293b]">Select User...</option>
                                                            {usersList.map(u => (
                                                                <option key={u.id} value={u.id} className="bg-white dark:bg-[#1e293b]">{u.name} ({u.email})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </motion.div>
                                            )}
                                            {formData.targetType === 'Plan Subscribers' && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                    <div className="relative">
                                                        <Layers className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                                        <select
                                                            value={formData.targetValue}
                                                            onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white appearance-none"
                                                        >
                                                            <option value="" className="bg-white dark:bg-[#1e293b]">Select Plan...</option>
                                                            {plansList.map(p => (
                                                                <option key={p.id} value={p.name} className="bg-white dark:bg-[#1e293b]">{p.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Content Inputs */}
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            placeholder="Broadcast Title"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 dark:text-white placeholder-slate-400"
                                        />
                                        <textarea
                                            placeholder="Type your message here..."
                                            rows={4}
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 resize-none"
                                        />
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                placeholder="Button Name (Optional)"
                                                value={formData.buttonName}
                                                onChange={(e) => setFormData({ ...formData, buttonName: e.target.value })}
                                                className="w-1/3 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                            />
                                            <input
                                                type="url"
                                                placeholder="Button URL (Optional)"
                                                value={formData.buttonUrl}
                                                onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                                                className="w-2/3 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        disabled={!formData.title || !formData.message || (formData.targetType !== 'All Users' && !formData.targetValue)}
                                        onClick={() => setShowPreview(true)}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Eye className="w-5 h-5" /> Preview & Send
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANEL: HISTORY */}
                        <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
                            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-dark shadow-sm flex flex-col h-full overflow-hidden">
                                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <History className="w-5 h-5 text-indigo-500" /> Broadcast History
                                    </h2>
                                    <span className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                                        {broadcasts.length} Sent
                                    </span>
                                </div>

                                <div ref={historyRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                                    {loading ? (
                                        <div className="flex justify-center py-20">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                        </div>
                                    ) : broadcasts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-10 opacity-60">
                                            <Bell className="w-16 h-16 text-slate-300 mb-4" />
                                            <p className="text-slate-500 font-medium">No broadcasts sent yet.</p>
                                        </div>
                                    ) : (
                                        <AnimatePresence>
                                            {broadcasts.map((b) => {
                                                const styles = getTypeStyles(b.type);
                                                return (
                                                    <motion.div
                                                        key={b.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="group relative bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all"
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className={`p-3 rounded-xl ${styles.bg} ${styles.color} shrink-0`}>
                                                                {styles.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{b.title}</h3>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                                                                            {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => handleDelete(b.id)}
                                                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">{b.message}</p>

                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                                        Target: {b.target}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── MODAL: PREVIEW INACTIVE USERS ────────────────────────────────────── */}
            <AnimatePresence>
                {showPreviewModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col"
                        >
                            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-indigo-500" /> Inactive Users Preview
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Showing users inactive for ≥ {inactivityConfig.days} days ({inactivityConfig.targetType === 'all' ? 'All Plans' : (inactivityConfig.targetPlans || []).join(', ')})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
                                {previewLoading ? (
                                    <div className="py-16 text-center text-slate-400 flex flex-col items-center">
                                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                                        <p className="text-xs font-semibold">Scanning user login records...</p>
                                    </div>
                                ) : previewUsers.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400">
                                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
                                        <p className="font-bold text-sm text-slate-700 dark:text-slate-200">No inactive users found!</p>
                                        <p className="text-xs text-slate-400 mt-1">All users have logged in within the last {inactivityConfig.days} days.</p>
                                    </div>
                                ) : (
                                    previewUsers.map((u, i) => (
                                        <div
                                            key={u.id}
                                            className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                                    {i + 1}. {u.name || 'Unnamed'}
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                    {u.phone} • {u.email}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    Last Login: {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never logged in'}
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0 space-y-1">
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                                                    {u.daysInactive} days inactive
                                                </span>
                                                <p className="text-[10px] text-slate-400">
                                                    Plan: <span className="font-semibold text-slate-700 dark:text-slate-300">{u.plan}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-600 dark:text-slate-400">
                                    Total Matching: {previewUsers.length} user(s)
                                </span>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── MODAL: CONFIRM MANUAL TRIGGER NOW ─────────────────────────────────── */}
            <AnimatePresence>
                {showTriggerConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 dark:border-white/10"
                        >
                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                                <Zap className="w-6 h-6" />
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                Trigger Inactivity Template Alert Now?
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                                This will scan user records immediately and dispatch WhatsApp template <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">"{inactivityConfig.templateName}"</span> to all users whose last login was more than <span className="font-bold">{inactivityConfig.days} days ago</span>.
                            </p>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 mb-5">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Threshold:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{inactivityConfig.days} days inactive</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Target Audience:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {inactivityConfig.targetType === 'all' ? 'All Users' : `${(inactivityConfig.targetPlans || []).length} Plans Selected`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">WhatsApp Template:</span>
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{inactivityConfig.templateName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Button Dynamic URL:</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {inactivityConfig.hasButtonUrl ? (inactivityConfig.buttonUrl || 'login') : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 font-semibold">Matching Recipients:</span>
                                    <span className="font-black text-amber-600 dark:text-amber-400">{inactivityStats.currentInactiveCount} User(s)</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowTriggerConfirmModal(false)}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleTriggerInactivityNow}
                                    disabled={triggeringNow}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-1.5"
                                >
                                    {triggeringNow ? 'Sending...' : 'Confirm & Send Now'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── MODAL: BROADCAST CONFIRMATION (EXISTING) ─────────────────────────── */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
                        onClick={() => setShowPreview(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-white/10 cursor-pointer"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 md:p-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Broadcast</h3>
                                <p className="text-slate-500 text-sm mb-6">Review your message before sending. This will be visible to users immediately.</p>

                                {/* Preview Card */}
                                <div className={`p-5 rounded-xl border ${getTypeStyles(formData.type).border} ${getTypeStyles(formData.type).bg} bg-opacity-50 mb-6`}>
                                    <div className="flex gap-3">
                                        <div className={getTypeStyles(formData.type).color}>{getTypeStyles(formData.type).icon}</div>
                                        <div>
                                            <h4 className={`font-bold ${getTypeStyles(formData.type).color} mb-1`}>{formData.title}</h4>
                                            <p className="text-sm text-slate-700 dark:text-slate-200">{formData.message}</p>
                                            {formData.buttonName && formData.buttonUrl && (
                                                <div className="mt-3">
                                                    <a
                                                        href={formData.buttonUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
                                                    >
                                                        {formData.buttonName}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Target Audience:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{formData.targetType}</span>
                                    </div>
                                    {formData.targetValue && (
                                        <div className="flex justify-between gap-4">
                                            <span className="text-slate-500 shrink-0">Specific Target:</span>
                                            <span className="font-bold text-slate-900 dark:text-white truncate text-right">
                                                {formData.targetType === 'Specific User' 
                                                    ? usersList.find(u => u.id === formData.targetValue)?.name + ' (' + usersList.find(u => u.id === formData.targetValue)?.email + ')'
                                                    : formData.targetValue
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleSend}
                                        disabled={sending}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                                        Confirm Send
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminNotifications;
