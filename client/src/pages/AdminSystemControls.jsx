import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity, Shield, Server, Zap, Terminal,
    RefreshCw, Power, AlertTriangle, Users, Database, Globe, Bell
} from 'lucide-react';
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




    const fetchData = async () => {
        try {
            setLoading(true);
            const [configRes, diagRes] = await Promise.all([
                axios.get('http://localhost:5000/api/system'),
                axios.get('http://localhost:5000/api/system/diagnostics')
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
            const res = await axios.get('http://localhost:5000/api/system/diagnostics');
            setDiagnostics(res.data);
            setLogs(res.data.logs);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchDiagnostics, 10000); // Poll health every 10s
        return () => clearInterval(interval);
    }, []);

    const handleSave = async (newConfig = config) => {
        setSaving(true);
        try {
            await axios.put('http://localhost:5000/api/system/settings', newConfig);
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
                    const res = await axios.post(`http://localhost:5000/api/system/actions/${action}`, {});
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

            <main className="p-8 max-w-7xl mx-auto w-full pb-32">

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

                    </div>
                </div>
            </main>
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

export default AdminSystemControls;
