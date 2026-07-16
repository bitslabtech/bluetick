import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wand2, Info, Phone, Plus, X, RefreshCw, Check } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';

const ADMIN_EVENTS = [
    { key: 'user_registered',        label: 'User Registered',        desc: 'New user signs up',                           vars: ['name', 'email', 'plan'],      templateName: 'admin_alert_user_registered' },
    { key: 'purchase_made',          label: 'Purchase Made',          desc: 'User completes a payment',                    vars: ['name', 'plan', 'amount'],      templateName: 'admin_alert_purchase_made' },
    { key: 'payment_failed',         label: 'Payment Failed',         desc: 'A payment attempt fails',                     vars: ['name', 'plan'],                templateName: 'admin_alert_payment_failed' },
    { key: 'support_ticket_raised',  label: 'Support Ticket Raised',  desc: 'User opens a new support ticket',             vars: ['name', 'subject'],             templateName: 'admin_alert_ticket_raised' },
    { key: 'support_ticket_replied', label: 'Ticket Reply',           desc: 'User replies to a support ticket',            vars: ['name', 'subject'],             templateName: 'admin_alert_ticket_replied' },
    { key: 'feature_suggestion',     label: 'Feature Suggestion',     desc: 'User submits a feature idea',                 vars: ['name', 'suggestion'],          templateName: 'admin_alert_feature_suggestion' },
    { key: 'tech_partner_request',   label: 'Tech Partner Request',   desc: 'Someone applies for tech partner program',    vars: ['name', 'company'],             templateName: 'admin_alert_tech_partner' },
    { key: 'contact_inquiry',        label: 'Contact Inquiry',        desc: 'Contact form submission received',            vars: ['name', 'message'],             templateName: 'admin_alert_contact_inquiry' },
    { key: 'system_error',           label: 'System Error',           desc: 'A frontend or backend crash is detected',     vars: ['error'],                        templateName: 'admin_alert_system_error' },
    { key: 'trial_expiring',         label: 'Trial Expiring',         desc: "A user's trial period is about to end",       vars: ['name', 'days'],                templateName: 'admin_alert_trial_expiring' },
    { key: 'nfc_order',              label: 'NFC Order',              desc: 'A new NFC card order is placed',              vars: ['name', 'orderId'],             templateName: 'admin_alert_nfc_order' },
    { key: 'payout_request',         label: 'Payout Request',         desc: 'Tech partner requests a payout',              vars: ['name', 'amount'],              templateName: 'admin_alert_payout_request' },
    { key: 'ai_tokens_depleted',     label: 'AI Tokens Depleted',     desc: "A user's AI token balance hits zero",         vars: ['name'],                        templateName: 'admin_alert_ai_depleted' },
    { key: 'addon_installed',        label: 'Add-on Installed',       desc: 'A user installs a paid add-on',               vars: ['name', 'addonName'],           templateName: 'admin_alert_addon_installed' },
];

const Toggle = ({ enabled, onChange, danger }) => (
    <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center shrink-0 ${enabled
            ? (danger ? 'bg-red-500' : 'bg-emerald-500')
            : 'bg-slate-200 dark:bg-slate-700'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);

const WhatsAppAdminNotifPanel = () => {
    const { user } = useAuth();
    const { showToast } = useUI();
    
    const [config, setConfig] = useState(null);
    const [notifEvents, setNotifEvents] = useState({});
    const [notifNumbers, setNotifNumbers] = useState([]);
    const [templateModeEnabled, setTemplateModeEnabled] = useState(false);
    const [systemTemplates, setSystemTemplates] = useState([]);
    
    const [savingNotif, setSavingNotif] = useState(false);
    const [autoCreating, setAutoCreating] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchSystemTemplates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates/system`);
            setSystemTemplates(res.data || []);
        } catch (err) {
            console.warn('Could not fetch system templates:', err.message);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const configRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/system`);
            setConfig(configRes.data);
            
            const evConf = configRes.data?.settings?.adminNotificationEvents || {};
            setTemplateModeEnabled(evConf.templateModeEnabled === true);
            setNotifNumbers(configRes.data?.settings?.adminNotificationNumbers || []);
            
            const { templateModeEnabled: _tmpl, ...perEventConf } = evConf;
            setNotifEvents(perEventConf);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.isAdmin) {
            fetchData();
            fetchSystemTemplates();
        }
    }, [user]);

    const saveNotifSettings = async () => {
        setSavingNotif(true);
        try {
            const updatedEvents = { templateModeEnabled, ...notifEvents };
            await axios.put(`${import.meta.env.VITE_API_URL}/api/system/settings`, {
                settings: {
                    ...config?.settings,
                    adminNotificationEvents: updatedEvents,
                    adminNotificationNumbers: notifNumbers
                }
            });
            setConfig(prev => ({
                ...prev,
                settings: {
                    ...prev?.settings,
                    adminNotificationEvents: updatedEvents,
                    adminNotificationNumbers: notifNumbers
                }
            }));
            showToast({ type: 'success', title: 'Saved', message: 'WhatsApp notification settings saved.' });
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Error', message: 'Failed to save notification settings.' });
        } finally {
            setSavingNotif(false);
        }
    };

    const handleAutoCreateTemplates = async () => {
        setAutoCreating(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/system/actions/auto-create-admin-templates`, {});
            const { created = [], skipped = [], failed = [] } = res.data;
            showToast({
                type: created.length > 0 ? 'success' : 'warning',
                title: 'AI Template Creation',
                message: `${created.length} created, ${skipped.length} already existed, ${failed.length} failed.`
            });
            await fetchSystemTemplates();
            await fetchData();
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.msg || 'Failed to auto-create templates.';
            showToast({ type: 'error', title: 'Auto-Create Failed', message: msg });
        } finally {
            setAutoCreating(false);
        }
    };

    const addPhoneNumber = () => {
        const cleaned = newPhone.replace(/\D/g, '');
        if (!cleaned || notifNumbers.includes(cleaned)) {
            showToast({ type: 'warning', title: 'Invalid', message: 'Enter a valid unique phone number with country code (digits only).' });
            return;
        }
        setNotifNumbers(prev => [...prev, cleaned]);
        setNewPhone('');
    };

    const removePhoneNumber = (num) => {
        setNotifNumbers(prev => prev.filter(n => n !== num));
    };

    const toggleEvent = (key) => {
        setNotifEvents(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                enabled: prev[key]?.enabled === false ? true : false
            }
        }));
    };

    const getTemplateStatus = (templateName) => {
        if (!templateName) return null;
        const tpl = systemTemplates.find(t => t.name === templateName);
        if (!tpl) return 'missing';
        return tpl.status?.toUpperCase() || 'PENDING';
    };

    const statusBadge = (status) => {
        if (!status || status === 'missing') return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500" />
                Missing
            </span>
        );
        if (status === 'APPROVED') return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Approved
            </span>
        );
        if (status === 'REJECTED') return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Rejected
            </span>
        );
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Pending
            </span>
        );
    };

    if (loading) {
        return <div className="p-6 text-center text-slate-400 font-medium">Loading settings...</div>;
    }

    return (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-4 md:p-6 shadow-sm">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <Phone className="w-5 h-5 text-emerald-500" />
                        WhatsApp Admin Notifications
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Configure global WhatsApp alerts for administrative and billing events.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={handleAutoCreateTemplates}
                        disabled={autoCreating}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60 flex-1 md:flex-auto"
                    >
                        {autoCreating
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating...</>
                            : <><Wand2 className="w-3.5 h-3.5" /> AI Auto-Create Templates</>}
                    </button>
                    <button
                        onClick={saveNotifSettings}
                        disabled={savingNotif}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60 flex-1 md:flex-auto"
                    >
                        {savingNotif
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                            : <><Check className="w-3.5 h-3.5" /> Save Settings</>}
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="mb-5 p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl flex gap-3">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    <strong>Template Mode</strong> sends approved Meta WhatsApp templates with structured variables — required for cold outbound messages.
                    <strong> Text Mode</strong> sends free-form text (only works within a 24-hour conversation window).
                    Click <strong>AI Auto-Create Templates</strong> to generate all 14 event templates using AI.
                </p>
            </div>

            {/* Template Mode Toggle */}
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 mb-5">
                <div>
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-emerald-500" />
                        Template Mode
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                        {templateModeEnabled
                            ? 'Using approved WhatsApp templates with variables (recommended)'
                            : 'Using plain text messages (24h session window required)'}
                    </div>
                </div>
                <Toggle
                    enabled={templateModeEnabled}
                    onChange={setTemplateModeEnabled}
                />
            </div>

            {/* Admin Phone Numbers */}
            <div className="mb-5">
                <label className="text-xs font-bold uppercase text-slate-400 block mb-2">
                    Admin Alert Recipients <span className="font-normal normal-case text-slate-400">(with country code, digits only)</span>
                </label>
                <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="tel"
                            value={newPhone}
                            onChange={e => setNewPhone(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addPhoneNumber()}
                            placeholder="e.g. 919876543210"
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-emerald-500/40 outline-none"
                        />
                    </div>
                    <button
                        onClick={addPhoneNumber}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Add
                    </button>
                </div>
                {notifNumbers.length === 0 ? (
                    <div className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                        No phone numbers configured. Add at least one recipient to receive alerts.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {notifNumbers.map(num => (
                            <div key={num} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-full text-sm font-mono text-emerald-700 dark:text-emerald-400">
                                <Phone className="w-3.5 h-3.5" />
                                +{num}
                                <button
                                    onClick={() => removePhoneNumber(num)}
                                    className="text-emerald-400 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Per-Event Table */}
            <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-3">Event Notification Configuration</label>
                <div className="rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                        <div className="col-span-4 text-[10px] font-bold uppercase text-slate-400">Event</div>
                        <div className="col-span-3 text-[10px] font-bold uppercase text-slate-400 hidden md:block">Template</div>
                        <div className="col-span-2 text-[10px] font-bold uppercase text-slate-400 hidden md:block">Variables</div>
                        <div className="col-span-2 text-[10px] font-bold uppercase text-slate-400 hidden md:block">Status</div>
                        <div className="col-span-1 text-[10px] font-bold uppercase text-slate-400 text-right">Enable</div>
                    </div>
                    {/* Rows */}
                    <div className="divide-y divide-slate-50 dark:divide-white/5">
                        {ADMIN_EVENTS.map((evt) => {
                            const eventCfg = notifEvents[evt.key] || {};
                            const isEnabled = eventCfg.enabled !== false; // default true
                            const tplName = eventCfg.templateName || evt.templateName;
                            const tplStatus = getTemplateStatus(tplName);

                            return (
                                <div
                                    key={evt.key}
                                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors ${isEnabled ? '' : 'opacity-50'} hover:bg-slate-50/50 dark:hover:bg-white/2`}
                                >
                                    <div className="col-span-4">
                                        <div className="text-sm font-bold text-slate-800 dark:text-white">{evt.label}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{evt.desc}</div>
                                    </div>
                                    <div className="col-span-3 hidden md:block">
                                        <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-500/20">
                                            {tplName}
                                        </span>
                                    </div>
                                    <div className="col-span-2 hidden md:block">
                                        <div className="flex flex-wrap gap-1">
                                            {evt.vars.map((v, i) => (
                                                <span key={v} className="text-[9px] font-mono bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                                    {`{{${i+1}}}`}={v}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-2 hidden md:block">
                                        {templateModeEnabled ? statusBadge(tplStatus) : (
                                            <span className="text-[10px] text-slate-400">Text mode</span>
                                        )}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <Toggle
                                            enabled={isEnabled}
                                            onChange={() => toggleEvent(evt.key)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppAdminNotifPanel;
