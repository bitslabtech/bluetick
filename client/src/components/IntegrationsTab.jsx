import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Terminal, Webhook, Box, Plus, Key, Copy, 
    Trash2, ExternalLink, Lock, CheckCircle2,
    RefreshCw, AlertCircle, Search, BookOpen,
    BarChart2, Activity, TrendingUp, Zap, CheckCircle, XCircle, MessageSquare
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import ApiDocs from './ApiDocs';

const IntegrationsTab = () => {
    const { showToast, showModal } = useUI();
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('connectors'); // 'connectors', 'keys', 'webhooks'
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [apiKeys, setApiKeys] = useState([]);
    const [webhooks, setWebhooks] = useState([]);
    const [addons, setAddons] = useState([]);
    const [userAddons, setUserAddons] = useState([]);
    const [planError, setPlanError] = useState(null);
    const [usageData, setUsageData] = useState(null);
    const [loadingUsage, setLoadingUsage] = useState(false);

    // Form States
    const [newKeyLabel, setNewKeyLabel] = useState('');
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState(['message.received']);
    const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
    
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setPlanError(null);
        try {
            // Fetch Market Data (which should be public or accessible by all logged-in users)
            const addonsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/addons`);
            setAddons(addonsRes.data.addons || []);
            setUserAddons(addonsRes.data.userAddons || []);

            // Attempt to fetch secure Developer Data
            const keysRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/integrations/keys`);
            setApiKeys(keysRes.data);

            const webhooksRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/integrations/webhooks`);
            setWebhooks(webhooksRes.data);

        } catch (error) {
            if (error.response?.status === 403) {
                setPlanError(error.response.data.error || 'Upgrade required.');
            } else {
                showToast({ type: 'error', message: 'Failed to load integration data.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchUsageData = async () => {
        setLoadingUsage(true);
        try {
            // NOTE: This calls /v1/usage authenticated via session token passed as x-api-key
            // In the real flow, a client would use their sk_live_ key. Here in the dashboard
            // we use a special dashboard proxy endpoint that resolves usage for the logged-in user.
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/integrations/usage`);
            setUsageData(res.data);
        } catch (err) {
            console.error('Failed to fetch usage data:', err);
        } finally {
            setLoadingUsage(false);
        }
    };

    // ===================================
    // API KEY HANDLERS
    // ===================================
    const handleGenerateKey = async () => {
        if (!newKeyLabel.trim()) return showToast({ type: 'error', message: 'Please provide a label for the key.' });
        
        setIsGeneratingKey(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/integrations/keys`, 
                { label: newKeyLabel }
            );
            
            setApiKeys([{ ...res.data, createdAt: new Date().toISOString() }, ...apiKeys]);
            setNewKeyLabel('');
            
            // Show the raw key in a modal because it's the only time they will see it
            showModal({
                type: 'success',
                title: 'Secret Key Generated!',
                message: (
                    <div className="mt-4 text-left w-full max-w-full">
                        <div className="p-3 mb-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1">Please copy this secret key now.</p>
                            <p className="text-xs text-amber-700 dark:text-amber-500/80">For security reasons, you will not be able to view it again after closing this window.</p>
                        </div>
                        <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/10">
                            <code className="text-base font-mono break-all text-indigo-600 dark:text-indigo-400 font-bold select-all bg-white dark:bg-black/40 p-3 rounded-lg border border-slate-200 dark:border-white/5 shadow-inner">
                                {res.data.rawKey}
                            </code>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(res.data.rawKey);
                                    showToast({ type: 'success', message: 'Secret Key Copied to Clipboard!' });
                                }}
                                className="w-full py-2.5 flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-lg font-bold transition-all shadow-md"
                            >
                                <Copy className="w-4 h-4" /> Copy to Clipboard
                            </button>
                        </div>
                    </div>
                ),
                confirmText: 'I have safely copied it'
            });

        } catch (err) {
            showToast({ type: 'error', message: err.response?.data?.error || 'Failed to generate key.' });
        } finally {
            setIsGeneratingKey(false);
        }
    };

    const handleRevokeKey = async (id) => {
        showModal({
            type: 'warning',
            title: 'Revoke API Key',
            message: 'Are you sure you want to revoke this key? Any integrations using it will immediately stop working.',
            confirmText: 'Yes, Revoke',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL}/api/integrations/keys/${id}`);
                    setApiKeys(apiKeys.filter(k => k.id !== id));
                    showToast({ type: 'success', message: 'Key revoked.' });
                } catch (err) {
                    showToast({ type: 'error', message: 'Failed to revoke key.' });
                }
            }
        });
    };

    // ===================================
    // WEBHOOK HANDLERS
    // ===================================
    const handleCreateWebhook = async () => {
        if (!newWebhookUrl) return showToast({ type: 'error', message: 'Webhook URL is required.' });
        if (!newWebhookUrl.startsWith('https://')) return showToast({ type: 'error', message: 'URL must use HTTPS for security.' });
        
        setIsCreatingWebhook(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/integrations/webhooks`, 
                { url: newWebhookUrl, events: selectedEvents }
            );
            
            setWebhooks([{ ...res.data, createdAt: new Date().toISOString() }, ...webhooks]);
            setNewWebhookUrl('');
            showToast({ type: 'success', message: 'Webhook created successfully.' });
        } catch (err) {
            showToast({ type: 'error', message: err.response?.data?.error || 'Failed to create webhook.' });
        } finally {
            setIsCreatingWebhook(false);
        }
    };

    const handleDeleteWebhook = async (id) => {
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/integrations/webhooks/${id}`);
            setWebhooks(webhooks.filter(w => w.id !== id));
            showToast({ type: 'success', message: 'Webhook deleted.' });
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to delete webhook.' });
        }
    };

    const toggleEvent = (e) => {
        if (selectedEvents.includes(e)) {
            setSelectedEvents(selectedEvents.filter(ev => ev !== e));
        } else {
            setSelectedEvents([...selectedEvents, e]);
        }
    };

    // ===================================
    // RENDER HELPERS
    // ===================================
    if (loading) return <div className="flex justify-center p-4 md:p-12"><RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" /></div>;

    const hasAccess = !planError;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation Pills */}
            <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1.5 bg-slate-100/80 dark:bg-surface-dark/40 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-white/5 w-full md:w-fit">
                {[
            { id: 'connectors', label: 'App Connectors', icon: Box },
                    { id: 'keys', label: 'API Keys', icon: Key },
                    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
                    { id: 'usage', label: 'Usage Analytics', icon: BarChart2 },
                    { id: 'docs', label: 'API Reference', icon: BookOpen }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id)}
                        className={`relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            activeSection === tab.id 
                            ? 'text-indigo-700 dark:text-white' 
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        {activeSection === tab.id && (
                            <motion.div
                                layoutId="activeIntegrationTab"
                                className="absolute inset-0 bg-white dark:bg-indigo-600/20 shadow-sm border border-slate-200/50 dark:border-indigo-500/30 rounded-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* UPGRADE WALL */}
            {!hasAccess && activeSection !== 'connectors' && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 md:p-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-white dark:bg-surface-dark rounded-full shadow-lg flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Developer Access Locked</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
                        {planError} Upgrade your plan to unlock full API capabilities and automated Webhook real-time routing.
                    </p>
                    <button className="px-4 md:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 font-semibold transition-all">
                        View Upgrade Plans
                    </button>
                </div>
            )}

            {/* TAB CONTENT */}
            {hasAccess && (
                <div className="mt-8">
                    {/* APP CONNECTORS (MARKETPLACE) */}
                    {activeSection === 'connectors' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Native / Included Integrations */}
                            <div className="group relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                                    <Terminal className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Custom Integration</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    Build custom integrations into your proprietary app or website using REST API and Webhooks.
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                        Included
                                    </span>
                                    <button onClick={() => setActiveSection('docs')} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                        View Docs →
                                    </button>
                                </div>
                            </div>
                            
                            <div className="group relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                                    <Webhook className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">WooCommerce Plugin</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    Official WordPress plugin to auto-send WhatsApp payment links and order shipment updates.
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                        Free Tools
                                    </span>
                                    <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                        Download .zip
                                    </button>
                                </div>
                            </div>

                            {/* Premium Addons Loop */}
                            {addons.map(addon => {
                                const isOwned = userAddons.some(ua => ua.addonId === addon.id);
                                return (
                                    <div key={addon.id} className="group relative bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                                            {/* Ideally use a dynamic icon or image here based on addon.icon */}
                                            <Box className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{addon.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">
                                            {addon.shortDescription || addon.description}
                                        </p>
                                        
                                        {!isOwned && (
                                            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Lock className="w-6 h-6 text-slate-700 dark:text-white mb-2" />
                                                <button className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-lg shadow-lg">
                                                    Upgrade to Unlock
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between mt-auto">
                                            {isOwned ? (
                                                <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Active
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full">
                                                    Premium Add-on
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* KEYS LIST */}
                    {activeSection === 'keys' && (
                        <div className="space-y-6">
                            {/* Create Key Card */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Generate New API Key</h3>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Flutter App Integration" 
                                        value={newKeyLabel}
                                        onChange={(e) => setNewKeyLabel(e.target.value)}
                                        className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                    <button 
                                        onClick={handleGenerateKey}
                                        disabled={isGeneratingKey}
                                        className="px-4 md:px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        {isGeneratingKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Create Secret Key
                                    </button>
                                </div>
                                <p className="text-sm border-l-2 border-amber-400 pl-3 text-slate-500 dark:text-slate-400 mt-4 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span>Keys give absolute control over your messaging functionality. Do not hardcode them in frontend client code (e.g., Flutter frontend or React code). Only store them in secure backend servers.</span>
                                </p>
                            </div>

                            {/* Keys List */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-medium">
                                            <tr>
                                                <th className="px-4 md:px-6 py-4">Label</th>
                                                <th className="px-4 md:px-6 py-4 text-center">Key Preview</th>
                                                <th className="px-4 md:px-6 py-4">Scopes</th>
                                                <th className="px-4 md:px-6 py-4 text-right">Created</th>
                                                <th className="px-4 md:px-6 py-4 text-center">Status</th>
                                                <th className="px-4 md:px-6 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                                            {apiKeys.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="px-4 md:px-6 py-12 text-center text-slate-400">
                                                        No API keys generated yet.
                                                    </td>
                                                </tr>
                                            )}
                                            {apiKeys.map((key) => (
                                                <tr key={key.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-4 md:px-6 py-4 font-semibold">{key.label}</td>
                                                    <td className="px-4 md:px-6 py-4 text-center">
                                                        <code className="px-2 py-1 bg-slate-100 dark:bg-black/30 rounded text-slate-500 text-xs">
                                                            {key.keyPrefix ? `${key.keyPrefix}...${key.last4}` : `sk_live_....${key.last4}`}
                                                        </code>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(key.scopes || ['messages:send']).map(scope => (
                                                                <span key={scope} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-mono">
                                                                    {scope}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-right text-slate-500">
                                                        {new Date(key.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-center">
                                                        {key.isActive ? (
                                                            <span className="inline-flex w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] max-w-full"></span>
                                                        ) : (
                                                            <span className="inline-flex w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => handleRevokeKey(key.id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Revoke Key"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Mobile Card View */}
                                <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                                    {apiKeys.length === 0 && (
                                        <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                            No API keys generated yet.
                                        </div>
                                    )}
                                    {apiKeys.map((key) => (
                                        <div key={key.id} className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white">{key.label}</h4>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {new Date(key.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRevokeKey(key.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <code className="px-2 py-1 bg-slate-100 dark:bg-black/30 rounded text-slate-500 text-xs font-mono">
                                                        {key.keyPrefix ? `${key.keyPrefix}...${key.last4}` : `sk_live_....${key.last4}`}
                                                    </code>
                                                    {key.isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
                                                            <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                                            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(key.scopes || ['messages:send']).map(scope => (
                                                        <span key={scope} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-mono">
                                                            {scope}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WEBHOOKS SECTION */}
                    {activeSection === 'webhooks' && (
                        <div className="space-y-6">
                            {/* Create Webhook Card */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Register Endpoint</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Payload URL</label>
                                        <input 
                                            type="url" 
                                            placeholder="https://your-server.com/whatsapp-webhook" 
                                            value={newWebhookUrl}
                                            onChange={(e) => setNewWebhookUrl(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Events to send</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {['message.received', 'message.status', 'template.sent'].map(ev => (
                                                <label key={ev} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-black/10 border border-slate-200 dark:border-white/5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedEvents.includes(ev)}
                                                        onChange={() => toggleEvent(ev)}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                                                        {ev}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button 
                                            onClick={handleCreateWebhook}
                                            disabled={isCreatingWebhook}
                                            className="px-4 md:px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 font-semibold transition-all flex items-center justify-center gap-2"
                                        >
                                            {isCreatingWebhook ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            Add Webhook
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Webhooks List */}
                            <div className="grid grid-cols-1 gap-4">
                                {webhooks.length === 0 && (
                                    <div className="text-center py-12 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl text-slate-500">
                                        No webhooks configured.
                                    </div>
                                )}
                                {webhooks.map(wh => (
                                    <div key={wh.id} className="relative bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                                        <div className="flex-1 min-w-0 flex items-start sm:items-center gap-4">
                                            <div className="shrink-0 mt-1 sm:mt-0 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                                <Webhook className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-slate-900 dark:text-white truncate" title={wh.url}>
                                                    {wh.url}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    {wh.events.map(ev => (
                                                        <span key={ev} className="px-2 py-0.5 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                                            {ev}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 sm:pl-4 sm:border-l border-slate-100 dark:border-white/5">
                                            {wh.failureCount > 0 ? (
                                                <span className="text-xs font-semibold text-red-500 px-2 py-1 bg-red-50 dark:bg-red-500/10 rounded-md">
                                                    {wh.failureCount} Failures
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteWebhook(wh.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* USAGE ANALYTICS SECTION */}
                    {activeSection === 'usage' && (
                        <div className="space-y-6">
                            {/* Load Button */}
                            {!usageData && !loadingUsage && (
                                <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-4">
                                        <BarChart2 className="w-8 h-8 text-indigo-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">API Usage Analytics</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm mb-6">
                                        View your API call history, success rates, and monthly message usage in real-time.
                                    </p>
                                    <button
                                        onClick={fetchUsageData}
                                        className="px-4 md:px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 font-semibold transition-all flex items-center gap-2"
                                    >
                                        <Activity className="w-4 h-4" /> Load Usage Stats
                                    </button>
                                </div>
                            )}

                            {loadingUsage && (
                                <div className="flex justify-center py-16">
                                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                                </div>
                            )}

                            {usageData && !loadingUsage && (
                                <>
                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            {
                                                label: 'Messages Used',
                                                value: usageData.plan?.messagesUsedThisMonth ?? 0,
                                                sub: `of ${usageData.plan?.messageLimit ?? '—'} this month`,
                                                icon: Zap,
                                                color: 'indigo'
                                            },
                                            {
                                                label: 'Total API Calls',
                                                value: usageData.apiCalls?.totalThisMonth ?? 0,
                                                sub: 'this month',
                                                icon: Activity,
                                                color: 'blue'
                                            },
                                            {
                                                label: 'Successful Calls',
                                                value: usageData.apiCalls?.successThisMonth ?? 0,
                                                sub: usageData.apiCalls?.successRate || 'N/A',
                                                icon: CheckCircle,
                                                color: 'green'
                                            },
                                            {
                                                label: 'Failed Calls',
                                                value: usageData.apiCalls?.errorsThisMonth ?? 0,
                                                sub: 'errors this month',
                                                icon: XCircle,
                                                color: 'red'
                                            }
                                        ].map(stat => (
                                            <div key={stat.label} className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm">
                                                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 flex items-center justify-center mb-3 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                                                    <stat.icon className="w-5 h-5" />
                                                </div>
                                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value.toLocaleString()}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    <span className="font-medium">{stat.label}</span> · {stat.sub}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Message Limit Progress */}
                                    {usageData.plan?.messageLimit !== 'unlimited' && (
                                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-sm">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-semibold text-slate-900 dark:text-white">Monthly Message Quota</h4>
                                                <span className="text-sm font-mono text-slate-500">
                                                    {usageData.plan?.messagesUsedThisMonth} / {usageData.plan?.messageLimit}
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-slate-100 dark:bg-black/30 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.min(100, (usageData.plan?.messagesUsedThisMonth / usageData.plan?.messageLimit) * 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                                {usageData.plan?.messagesRemaining} messages remaining · Resets on 1st of next month
                                            </p>
                                        </div>
                                    )}

                                    {/* Recent API Calls Table */}
                                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                                        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5">
                                            <h4 className="font-semibold text-slate-900 dark:text-white">Recent API Calls</h4>
                                            <button onClick={fetchUsageData} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors" title="Refresh">
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        {/* Desktop Table View */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-slate-400 font-medium">
                                                    <tr>
                                                        <th className="px-5 py-3 text-left">Endpoint</th>
                                                        <th className="px-5 py-3 text-center">Status</th>
                                                        <th className="px-5 py-3 text-left">Template</th>
                                                        <th className="px-5 py-3 text-right">Response</th>
                                                        <th className="px-5 py-3 text-right">Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                    {(usageData.recentCalls || []).length === 0 && (
                                                        <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">No API calls recorded yet.</td></tr>
                                                    )}
                                                    {(usageData.recentCalls || []).map(call => (
                                                        <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                            <td className="px-5 py-3">
                                                                <code className="text-xs font-mono text-slate-700 dark:text-slate-300">{call.endpoint}</code>
                                                            </td>
                                                            <td className="px-5 py-3 text-center">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                                                    call.statusCode < 300 
                                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                        : call.statusCode < 500
                                                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                                }`}>
                                                                    {call.statusCode}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3 text-slate-500 text-xs">{call.templateName || '—'}</td>
                                                            <td className="px-5 py-3 text-right text-xs text-slate-500">
                                                                {call.responseTimeMs ? `${call.responseTimeMs}ms` : '—'}
                                                            </td>
                                                            <td className="px-5 py-3 text-right text-xs text-slate-400">
                                                                {new Date(call.createdAt).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {/* Mobile Card View */}
                                        <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                                            {(usageData.recentCalls || []).length === 0 && (
                                                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                                    No API calls recorded yet.
                                                </div>
                                            )}
                                            {(usageData.recentCalls || []).map(call => (
                                                <div key={call.id} className="p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <code className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all bg-slate-50 dark:bg-black/20 px-2 py-1 rounded">
                                                            {call.method} {call.endpoint}
                                                        </code>
                                                        <div className="shrink-0 text-right flex flex-col items-end">
                                                            <div className="text-[11px] text-slate-400 font-mono">
                                                                {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 mt-0.5 font-medium bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                                                {call.responseTimeMs}ms
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between pt-1">
                                                        {call.status >= 200 && call.status < 300 ? (
                                                            <span className="inline-flex px-2 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-mono font-bold rounded">
                                                                {call.status} OK
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex px-2 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-mono font-bold rounded">
                                                                {call.status} ERR
                                                            </span>
                                                        )}
                                                        
                                                        {call.templateName ? (
                                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                                <MessageSquare className="w-3.5 h-3.5" /> {call.templateName}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">-</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* API DOCS SECTION */}
                    {activeSection === 'docs' && (
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 shadow-sm">
                            <ApiDocs />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IntegrationsTab;
