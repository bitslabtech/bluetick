import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity, Shield, Server, Zap, Terminal,
    RefreshCw, Power, AlertTriangle, Users, Database, Globe, Bell,
    Tag, Plus, Edit2, Trash2, Check, X, Calendar, Star, Briefcase, TrendingUp, ExternalLink
} from 'lucide-react';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import ThemeToggle from '../components/ThemeToggle';
import AdminHeader from '../components/AdminHeader';

const AdminSystemControls = () => {
    const { user } = useAuth();
    const { showModal, showToast } = useUI();
    const [config, setConfig] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState('');
    const [saving, setSaving] = useState(false);

    // Config Form States
    const [ipBlacklistInput, setIpBlacklistInput] = useState('');

    // Versioning States
    const [versions, setVersions] = useState([]);
    const [versionsLoading, setVersionsLoading] = useState(false);
    const [versionModalOpen, setVersionModalOpen] = useState(false);
    const [editingVersion, setEditingVersion] = useState(null);
    const [versionForm, setVersionForm] = useState({ version: '', title: '', changelog: '', isCurrent: false, releasedAt: '' });
    const [versionSaving, setVersionSaving] = useState(false);




    const fetchData = async () => {
        try {
            setLoading(true);
            const [configRes, diagRes] = await Promise.all([
                axios.get('http://127.0.0.1:5000/api/system'),
                axios.get('http://127.0.0.1:5000/api/system/diagnostics')
            ]);
            setConfig(configRes.data);
            setDiagnostics(diagRes.data);
            setLogs(diagRes.data.logs);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchDiagnostics = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/system/diagnostics');
            setDiagnostics(res.data);
            setLogs(res.data.logs);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchData();
        fetchVersions();
        const interval = setInterval(fetchDiagnostics, 10000);
        return () => clearInterval(interval);
    }, []);

    // ── Versioning Handlers ──
    const fetchVersions = async () => {
        setVersionsLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/versioning');
            setVersions(res.data);
        } catch (err) {
            console.error('Error fetching versions:', err);
        } finally {
            setVersionsLoading(false);
        }
    };

    const openCreateVersion = () => {
        setEditingVersion(null);
        setVersionForm({ version: '', title: '', changelog: '', isCurrent: true, releasedAt: new Date().toISOString().split('T')[0] });
        setVersionModalOpen(true);
    };

    const openEditVersion = (v) => {
        setEditingVersion(v);
        setVersionForm({
            version: v.version,
            title: v.title,
            changelog: v.changelog || '',
            isCurrent: v.isCurrent,
            releasedAt: v.releasedAt ? new Date(v.releasedAt).toISOString().split('T')[0] : ''
        });
        setVersionModalOpen(true);
    };

    const handleVersionSave = async () => {
        if (!versionForm.version.trim() || !versionForm.title.trim()) {
            showToast({ type: 'error', message: 'Version and title are required.' });
            return;
        }

        // Client-side validation: version must be higher than latest (only for new versions)
        if (!editingVersion && versions.length > 0) {
            const latest = versions[0]; // versions are sorted newest first
            const compareSemver = (a, b) => {
                const pa = a.split('.').map(Number);
                const pb = b.split('.').map(Number);
                for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
                    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
                }
                return 0;
            };
            if (compareSemver(versionForm.version, latest.version) <= 0) {
                showToast({ type: 'error', message: `Version must be higher than v${latest.version}.` });
                return;
            }
            // Date validation
            if (versionForm.releasedAt && latest.releasedAt) {
                const newDate = versionForm.releasedAt;
                const latestDate = new Date(latest.releasedAt).toISOString().split('T')[0];
                if (newDate < latestDate) {
                    showToast({ type: 'error', message: `Release date cannot be before ${latestDate}.` });
                    return;
                }
            }
        }

        setVersionSaving(true);
        try {
            const payload = { ...versionForm, releasedAt: versionForm.releasedAt ? new Date(versionForm.releasedAt).toISOString() : undefined };
            if (editingVersion) {
                await axios.put(`http://127.0.0.1:5000/api/versioning/${editingVersion.id}`, payload);
                showToast({ type: 'success', message: 'Version updated.' });
            } else {
                await axios.post('http://127.0.0.1:5000/api/versioning', payload);
                showToast({ type: 'success', message: 'Version created.' });
            }
            setVersionModalOpen(false);
            fetchVersions();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || 'Failed to save version.';
            showToast({ type: 'error', message: msg });
        } finally {
            setVersionSaving(false);
        }
    };

    const handleVersionDelete = (v) => {
        showModal({
            type: 'error',
            title: 'Delete Version?',
            message: `Are you sure you want to delete version ${v.version}?`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await axios.delete(`http://127.0.0.1:5000/api/versioning/${v.id}`);
                    showToast({ type: 'success', message: 'Version deleted.' });
                    fetchVersions();
                } catch (err) {
                    showToast({ type: 'error', message: 'Failed to delete.' });
                }
            }
        });
    };

    const handleSave = async (newConfig = config) => {
        setSaving(true);
        try {
            await axios.put('http://127.0.0.1:5000/api/system/settings', newConfig);
            setConfig(newConfig);
            showModal({
                type: 'success',
                title: 'Success',
                message: 'System settings have been updated successfully.',
                confirmText: 'OK'
            });
        } catch (err) {
            console.error(err);
            showModal({
                type: 'error',
                title: 'Error',
                message: 'Failed to update system settings. Please try again.',
                confirmText: 'Close'
            });
        } finally {
            setSaving(false);
        }
    };

    const triggerAction = async (action) => {
        showModal({
            type: 'warning',
            title: 'System Action',
            message: `Are you sure you want to ${action}?`,
            confirmText: 'Execute',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const res = await axios.post(`http://127.0.0.1:5000/api/system/actions/${action}`, {});
                    showToast({
                        type: 'success',
                        title: 'Action Executed',
                        message: res.data.message
                    });
                } catch (err) {
                    console.error('Action Error:', err);
                    const errorMessage = err.response?.data?.msg
                        || err.response?.data?.message
                        || err.response?.data?.error
                        || 'Failed to execute action. Check console for details.';

                    // Check if it's a configuration error
                    const isConfigError = errorMessage.toLowerCase().includes('not configured')
                        || errorMessage.toLowerCase().includes('config not found')
                        || errorMessage.toLowerCase().includes('credentials not');

                    if (isConfigError) {
                        // Determine which settings tab to go to
                        let settingsTab = 'general';
                        let settingsLabel = 'Settings';

                        if (action === 'test-smtp') {
                            settingsTab = 'smtp';
                            settingsLabel = 'Email SMTP Settings';
                        } else if (action === 'test-whatsapp') {
                            settingsTab = 'whatsapp_gateway';
                            settingsLabel = 'WhatsApp Gateway Settings';
                        }

                        showModal({
                            type: 'warning',
                            title: 'Configuration Required',
                            message: errorMessage + '\n\nWould you like to configure it now?',
                            confirmText: `Go to ${settingsLabel}`,
                            cancelText: 'Close',
                            onConfirm: () => window.location.href = `/settings?tab=${settingsTab}`
                        });
                    } else {
                        // Show regular error modal
                        showModal({
                            type: 'error',
                            title: 'Action Failed',
                            message: errorMessage,
                            confirmText: 'Close'
                        });
                    }
                }
            }
        });
    };

    if (loading) return <div className="p-8 text-center">Loading Mission Control...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            {/* Top Bar */}
            {/* Top Bar */}
            <AdminHeader>
                <ThemeToggle />
            </AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-32">

                {/* Header Section */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Activity className="w-8 h-8 text-indigo-500" /> System Control Center
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time monitoring and global platform configuration.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchData} className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg hover:rotate-180 transition-all">
                            <RefreshCw className="w-5 h-5 text-slate-600 dark:text-white" />
                        </button>
                    </div>
                </div>

                {/* TOP ROW: Vital Signs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatusCard
                        label="System Status"
                        value={config.maintenanceMode ? "Maintenance" : "Operational"}
                        color={config.maintenanceMode ? "text-amber-500" : "text-emerald-500"}
                        icon={Server}
                    />
                    <StatusCard
                        label="Queue Pending"
                        value={diagnostics?.queue?.pending || 0}
                        color="text-indigo-500"
                        icon={Zap}
                    />
                    <StatusCard
                        label="Uptime"
                        value={`${Math.floor(diagnostics?.uptime / 60)}m`}
                        color="text-blue-500"
                        icon={Activity}
                    />
                    <StatusCard
                        label="Database"
                        value={diagnostics?.health?.database || 'Unknown'}
                        color={diagnostics?.health?.database === 'connected' ? "text-emerald-500" : "text-red-500"}
                        icon={Database}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

                    {/* LEFT COLUMN: Controls */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. OPERATIONS PANEL */}
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                <Zap className="w-5 h-5 text-amber-500" /> Global Operations
                            </h3>

                            <div className="space-y-6">
                                {/* Maintenance Mode Toggle */}
                                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white">Maintenance Mode</div>
                                        <div className="text-xs text-slate-500">Redirects all non-admin traffic to "Under Maintenance" page</div>
                                    </div>
                                    <Toggle
                                        enabled={config.maintenanceMode}
                                        onChange={(val) => handleSave({ ...config, maintenanceMode: val })}
                                        danger
                                    />
                                </div>

                                {/* Throughput Slider */}
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <div className="flex justify-between mb-2">
                                        <div className="font-bold text-slate-800 dark:text-white">Global Throughput Cap</div>
                                        <div className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{config.throughputLimit} msg/sec</div>
                                    </div>
                                    <input
                                        type="range"
                                        min="1" max="1000"
                                        value={config.throughputLimit}
                                        onChange={(e) => setConfig({ ...config, throughputLimit: parseInt(e.target.value) })}
                                        onMouseUp={() => handleSave()}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <div className="text-xs text-slate-500 mt-2 flex justify-between">
                                        <span>1 msg/s</span>
                                        <span>Safe Limit: 500</span>
                                        <span>Max: 1000 msg/s</span>
                                    </div>
                                </div>

                                {/* Global Rate Limit Config */}
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 mt-4">
                                    <div className="font-bold text-slate-800 dark:text-white mb-4">API Rate Limits</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Max Requests</label>
                                            <input
                                                type="number"
                                                value={config.settings?.rateLimit?.maxRequests || 1000}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    settings: {
                                                        ...config.settings,
                                                        rateLimit: { ...config.settings?.rateLimit, maxRequests: parseInt(e.target.value) }
                                                    }
                                                })}
                                                onBlur={() => handleSave()}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-black/20 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Time Window (Minutes)</label>
                                            <input
                                                type="number"
                                                value={(config.settings?.rateLimit?.windowMs || 900000) / 60000}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    settings: {
                                                        ...config.settings,
                                                        rateLimit: { ...config.settings?.rateLimit, windowMs: parseInt(e.target.value) * 60000 }
                                                    }
                                                })}
                                                onBlur={() => handleSave()}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-black/20 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. SECURITY PANEL */}
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                <Shield className="w-5 h-5 text-red-500" /> Security & Access
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Blacklist */}
                                <div className="col-span-2">
                                    <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">IP Blacklist (Comma Separated)</label>
                                    <textarea
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 dark:text-white font-mono text-sm"
                                        rows="3"
                                        placeholder="192.168.1.1, 10.0.0.5"
                                        value={Array.isArray(config.ipBlacklist) ? config.ipBlacklist.join(', ') : config.ipBlacklist}
                                        onChange={(e) => setConfig({ ...config, ipBlacklist: e.target.value.split(',').map(s => s.trim()) })}
                                        onBlur={() => handleSave()}
                                    />
                                </div>

                                <button
                                    onClick={() => triggerAction('kill-sessions')}
                                    className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center gap-3 font-bold"
                                >
                                    <Power className="w-5 h-5" /> Kill All Active Sessions
                                </button>

                                <button
                                    onClick={() => triggerAction('purge-cache')}
                                    className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-3 font-bold"
                                >
                                    <RefreshCw className="w-5 h-5" /> Purge System Cache
                                </button>
                            </div>
                        </div>

                        {/* 3. COMMUNICATION PANEL */}
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                <Bell className="w-5 h-5 text-blue-500" /> Global Announcement
                            </h3>

                            <div className="flex gap-4 items-start">
                                <div className="flex-1 space-y-3">
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-black/20 dark:text-white"
                                        placeholder="Announcement Message (e.g. Server maintenance at 2 AM)"
                                        value={config.globalAnnouncement?.message || ''}
                                        onChange={(e) => setConfig({ ...config, globalAnnouncement: { ...config.globalAnnouncement, message: e.target.value } })}
                                    />
                                    <div className="flex gap-4">
                                        <select
                                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-black/20 dark:text-white"
                                            value={config.globalAnnouncement?.type || 'info'}
                                            onChange={(e) => setConfig({ ...config, globalAnnouncement: { ...config.globalAnnouncement, type: e.target.value } })}
                                        >
                                            <option value="info">Info (Blue)</option>
                                            <option value="warning">Warning (Amber)</option>
                                            <option value="error">Critical (Red)</option>
                                        </select>
                                        <button
                                            onClick={() => handleSave()}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm"
                                        >
                                            Update
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Active</span>
                                    <Toggle
                                        enabled={config.globalAnnouncement?.active}
                                        onChange={(val) => handleSave({ ...config, globalAnnouncement: { ...config.globalAnnouncement, active: val } })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. VERSIONING PANEL */}
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                                    <Tag className="w-5 h-5 text-purple-500" /> App Versioning
                                </h3>
                                <button onClick={openCreateVersion} className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20">
                                    <Plus className="w-3.5 h-3.5" /> Add Version
                                </button>
                            </div>

                            {versionsLoading ? (
                                <div className="space-y-3">
                                    {[...Array(2)].map((_, i) => (
                                        <div key={i} className="animate-pulse p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                                            <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-32 mb-2"></div>
                                            <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-48"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : versions.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No versions yet. Click "Add Version" to start.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                    {versions.map((v) => (
                                        <div key={v.id} className="group flex items-start justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[10px] font-mono font-bold border border-purple-200 dark:border-purple-500/20">
                                                        v{v.version}
                                                    </span>
                                                    {v.isCurrent && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[9px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-500/20">
                                                            <Star className="w-2.5 h-2.5" /> Current
                                                        </span>
                                                    )}
                                                    {v.releasedAt && (
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(v.releasedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="font-medium text-sm text-slate-900 dark:text-white">{v.title}</div>
                                                {v.changelog && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{v.changelog}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button onClick={() => openEditVersion(v)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleVersionDelete(v)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>



                    </div>

                    {/* RIGHT COLUMN: Diagnostics */}
                    <div className="space-y-8">

                        {/* CONSOLE */}
                        <div className="bg-slate-900 rounded-2xl p-6 shadow-lg text-slate-300 font-mono text-sm h-[500px] flex flex-col">
                            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Terminal className="w-4 h-4" /> System Logs (Tail)
                                </h3>
                                <div className="flex gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto whitespace-pre-wrap break-all text-xs opacity-90 leading-relaxed scrollbar-thin scrollbar-thumb-white/20">
                                {logs || "No logs available..."}
                            </div>
                        </div>

                        {/* Quick Diagnostics */}
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Diagnostics</h3>
                            <ul className="space-y-4">
                                <DiagItem
                                    label="SMTP Server"
                                    status={diagnostics?.health?.smtp || 'unknown'}
                                    onRun={() => showModal({
                                        type: 'info',
                                        title: 'SMTP Configuration',
                                        message: 'SMTP needs to be configured before testing.\n\nGo to Settings > Email SMTP to configure:\n• Host & Port\n• Username & Password\n• From Email & Name\n\nOnce configured, click "Run Test" to send a test email.',
                                        confirmText: 'Configure Now',
                                        cancelText: 'Close',
                                        onConfirm: () => window.location.href = '/settings?tab=smtp'
                                    })}
                                />
                                <DiagItem
                                    label="WhatsApp API"
                                    status={diagnostics?.health?.whatsappApi || 'unknown'}
                                    onRun={() => showModal({
                                        type: 'info',
                                        title: 'WhatsApp API Configuration',
                                        message: 'WhatsApp API needs to be configured before testing.\n\nGo to Settings > WhatsApp Gateway to configure:\n• Meta Phone Number ID\n• Meta Access Token\n• Meta Business Account ID\n\nOnce configured, click "Run Test" to verify the connection.',
                                        confirmText: 'Configure Now',
                                        cancelText: 'Close',
                                        onConfirm: () => window.location.href = '/settings?tab=whatsapp_gateway'
                                    })}
                                />
                                <DiagItem
                                    label="Payment Gateway"
                                    status="ready"
                                    onRun={() => showModal({
                                        type: 'info',
                                        title: 'Payment Gateway Configuration',
                                        message: 'Payment gateways need to be configured before testing.\n\nGo to Settings > Payment Gateway to set up:\n• Razorpay\n• Stripe\n• PhonePe\n• Cashfree\n\nOnce configured, the status will update automatically.',
                                        confirmText: 'Configure Now',
                                        cancelText: 'Close',
                                        onConfirm: () => window.location.href = '/settings?tab=payment_gateway'
                                    })}
                                />
                            </ul>
                        </div>

                        {/* Menu Ordering Panel */}
                        <MenuOrderPanel config={config} onSave={handleSave} />

                    </div>
                </div>
            </main>

            {/* Version Modal */}
            <VersionModal
                open={versionModalOpen}
                onClose={() => setVersionModalOpen(false)}
                form={versionForm}
                setForm={setVersionForm}
                onSave={handleVersionSave}
                saving={versionSaving}
                editing={editingVersion}
            />
        </div>
    );
};

// ── Version Create/Edit Modal (rendered inside AdminSystemControls) ──
const VersionModal = ({ open, onClose, form, setForm, onSave, saving, editing }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Tag className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editing ? 'Edit Version' : 'Add New Version'}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Version *</label>
                            <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="e.g. 1.2.0" className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Release Date</label>
                            <input type="date" value={form.releasedAt} onChange={(e) => setForm({ ...form, releasedAt: e.target.value })} className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Title *</label>
                        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Bug Fixes & New Features" className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Changelog</label>
                        <textarea value={form.changelog} onChange={(e) => setForm({ ...form, changelog: e.target.value })} placeholder={"Enter changelog details...\n\n- Added new feature X\n- Fixed bug Y"} rows={5} className="px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed" />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} className="sr-only peer" />
                            <div className="w-10 h-6 rounded-full bg-slate-200 dark:bg-white/10 peer-checked:bg-green-500 transition-colors"></div>
                            <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-4"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mark as Current Version</span>
                    </label>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                    <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-60">
                        {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : <Check className="w-4 h-4" />}
                        {editing ? 'Save Changes' : 'Create Version'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// UI Components
const StatusCard = ({ label, value, color, icon: Icon }) => (
    <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-slate-50 dark:bg-white/5 ${color}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">{label}</div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
        </div>
    </div>
);

const Toggle = ({ enabled, onChange, danger }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-6 rounded-full p-1 transition-colors relative ${enabled
            ? (danger ? 'bg-red-500' : 'bg-green-500')
            : 'bg-slate-200 dark:bg-slate-700'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);

const DiagItem = ({ label, status, onRun }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'ready':
            case 'connected':
                return 'bg-emerald-500';
            case 'error':
            case 'disconnected':
                return 'bg-red-500';
            case 'unknown':
            default:
                return 'bg-amber-500';
        }
    };

    return (
        <li className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{label}</span>
            </div>
            {onRun && (
                <button onClick={onRun} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Run Test
                </button>
            )}
        </li>
    );
};

// ── Menu Reordering Components ──

const SortableMenuItem = ({ id, label }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`flex items-center justify-between p-3 mb-2 rounded-xl border border-slate-200 dark:border-white/10 ${isDragging ? 'bg-indigo-50 dark:bg-indigo-900/20 shadow-lg border-indigo-200' : 'bg-slate-50 dark:bg-white/5'} cursor-grab active:cursor-grabbing`}>
            <div className="flex items-center gap-3">
                <div className="text-slate-400">☰</div>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{label}</span>
            </div>
        </div>
    );
};

const MenuOrderPanel = ({ config, onSave }) => {
    // List of base items that can be reordered (excludes dynamic/admin menus)
    const baseMenuLabels = [
        'Dashboard', 'WhatsApp', 'Send Message', 'Campaigns', 
        'FlowBot Builder', 'Contacts', 'Templates', 'Add-ons Market', 'Reports',
        'Support', 'Settings'
    ];

    const [items, setItems] = useState([]);

    useEffect(() => {
        if (!config) return;
        // Merge the saved menuOrder with any base items that aren't in the saved order yet
        const savedOrder = Array.isArray(config.menuOrder) ? config.menuOrder : [];
        const missingItems = baseMenuLabels.filter(label => !savedOrder.includes(label));
        const combined = [...savedOrder.filter(l => baseMenuLabels.includes(l)), ...missingItems];
        setItems(combined);
    }, [config]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                const newOrder = arrayMove(items, oldIndex, newIndex);
                // Call instant save
                onSave({ ...config, menuOrder: newOrder });
                return newOrder;
            });
        }
    };

    if (!config) return null;

    return (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Sidebar Menu Order</h3>
            <p className="text-sm text-slate-500 mb-6">Drag and drop the items below to change the order of the main navigation menu for all users. Changes are saved instantly.</p>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {items.map(id => <SortableMenuItem key={id} id={id} label={id} />)}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};




export default AdminSystemControls;
