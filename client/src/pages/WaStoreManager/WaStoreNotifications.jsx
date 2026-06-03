import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Bell, ChevronDown, ChevronUp, CheckCircle, Clock, Truck, Package, XCircle, CreditCard, Save, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Trigger definitions ──────────────────────────────────────────────────────
const TRIGGERS = [
    {
        key: 'order_placed',
        label: 'Order Placed',
        description: 'Sent to customer when they place a new order.',
        icon: Clock,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800/40',
        variables: [
            { key: '{{customer_name}}', label: 'Customer Name' },
            { key: '{{order_number}}', label: 'Order Number' },
            { key: '{{store_name}}', label: 'Store Name' },
            { key: '{{order_total}}', label: 'Order Total' },
        ],
    },
    {
        key: 'order_confirmed',
        label: 'Order Confirmed',
        description: 'Sent when you mark an order as Confirmed.',
        icon: CheckCircle,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800/40',
        variables: [
            { key: '{{customer_name}}', label: 'Customer Name' },
            { key: '{{order_number}}', label: 'Order Number' },
            { key: '{{store_name}}', label: 'Store Name' },
        ],
    },
    {
        key: 'order_processing',
        label: 'Order Processing',
        description: 'Sent when order status changes to Processing.',
        icon: Package,
        color: 'text-violet-500',
        bg: 'bg-violet-50 dark:bg-violet-900/20',
        border: 'border-violet-200 dark:border-violet-800/40',
        variables: [
            { key: '{{customer_name}}', label: 'Customer Name' },
            { key: '{{order_number}}', label: 'Order Number' },
            { key: '{{store_name}}', label: 'Store Name' },
        ],
    },
    {
        key: 'order_shipped',
        label: 'Order Shipped / Dispatched',
        description: 'Sent when you fulfill an order with tracking info.',
        icon: Truck,
        color: 'text-indigo-500',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-800/40',
        variables: [
            { key: '{{customer_name}}', label: 'Customer Name' },
            { key: '{{order_number}}', label: 'Order Number' },
            { key: '{{store_name}}', label: 'Store Name' },
            { key: '{{tracking_provider}}', label: 'Tracking Provider' },
            { key: '{{tracking_url}}', label: 'Tracking URL' },
        ],
    },
    {
        key: 'order_delivered',
        label: 'Order Delivered',
        description: 'Sent when you mark an order as Delivered.',
        icon: CheckCircle,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800/40',
        variables: [
            { key: '{{customer_name}}', label: 'Customer Name' },
            { key: '{{order_number}}', label: 'Order Number' },
            { key: '{{store_name}}', label: 'Store Name' },
        ],
    },
    {
        key: 'order_cancelled',
        label: 'Order Cancelled',
        description: 'Sent when an order is marked as Cancelled.',
        icon: XCircle,
        color: 'text-rose-500',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-rose-200 dark:border-rose-800/40',
        variables: [
            { key: '{{customer_name}}', label: 'Customer Name' },
            { key: '{{order_number}}', label: 'Order Number' },
            { key: '{{store_name}}', label: 'Store Name' },
        ],
    },
    {
        key: 'payment_received',
        label: 'Payment Received',
        description: 'Sent after a successful payment gateway payment.',
        icon: CreditCard,
        color: 'text-teal-500',
        bg: 'bg-teal-50 dark:bg-teal-900/20',
        border: 'border-teal-200 dark:border-teal-800/40',
        variables: [
            { key: '{{customer_name}}', label: 'Customer Name' },
            { key: '{{order_number}}', label: 'Order Number' },
            { key: '{{store_name}}', label: 'Store Name' },
            { key: '{{order_total}}', label: 'Order Total' },
        ],
    },
];

// ─── Single Trigger Card ──────────────────────────────────────────────────────
function TriggerCard({ trigger, config, templates, onChange }) {
    const [expanded, setExpanded] = useState(false);
    const Icon = trigger.icon;

    const enabled = config?.enabled ?? false;
    const templateId = config?.templateId ?? '';
    const customMessage = config?.customMessage ?? '';
    const mode = config?.mode ?? 'template'; // 'template' | 'text'

    const selectedTemplate = templates.find(t => t.id === templateId);

    const update = (patch) => onChange(trigger.key, { ...config, ...patch });

    return (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${trigger.border} bg-white dark:bg-surface-dark`}>
            {/* Header row */}
            <div className="flex items-center gap-4 px-4 md:px-5 py-4">
                <div className={`p-2 rounded-xl ${trigger.bg}`}>
                    <Icon className={`w-5 h-5 ${trigger.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{trigger.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{trigger.description}</p>
                </div>
                {/* Toggle */}
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={enabled}
                        onChange={e => update({ enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                </label>
                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400"
                >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Expanded config */}
            {expanded && (
                <div className={`px-4 md:px-5 pb-5 pt-2 border-t space-y-4 ${trigger.border}`}>
                    {/* Mode selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message Mode</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => update({ mode: 'template' })}
                                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode === 'template' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                            >
                                Approved Template
                            </button>
                            <button
                                type="button"
                                onClick={() => update({ mode: 'text' })}
                                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode === 'text' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                            >
                                Custom Text Message
                            </button>
                        </div>
                    </div>

                    {mode === 'template' ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select WhatsApp Template</label>
                            {templates.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No approved templates found. Go to <strong>Templates</strong> to create and approve one first.</p>
                            ) : (
                                <select
                                    value={templateId}
                                    onChange={e => update({ templateId: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                                >
                                    <option value="">-- Select a template --</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.language}) {t.status !== 'APPROVED' ? `[${t.status}]` : '✓'}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {selectedTemplate && (
                                <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                    {selectedTemplate.content}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Custom Message Body</label>
                            <textarea
                                rows={4}
                                value={customMessage}
                                onChange={e => update({ customMessage: e.target.value })}
                                placeholder={`Hi {{customer_name}}, your order {{order_number}} from {{store_name}} has been updated!`}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 resize-y"
                            />
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-start gap-1">
                                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                Custom text messages can only be sent to users who have messaged you first within 24 hours (Meta policy). Use Approved Templates for proactive notifications.
                            </p>
                        </div>
                    )}

                    {/* Available variables */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Available Variables</p>
                        <div className="flex flex-wrap gap-1.5">
                            {trigger.variables.map(v => (
                                <span key={v.key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-mono border border-indigo-100 dark:border-indigo-800/40">
                                    {v.key}
                                    <span className="text-indigo-400 font-sans">({v.label})</span>
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">These variables are automatically replaced with real order data when the message is sent.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WaStoreNotifications() {
    const { storeId } = useOutletContext();
    const [templates, setTemplates] = useState([]);
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [storesRes, templatesRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/templates`),
                ]);
                const myStore = storesRes.data.find(s => s.id === storeId);
                if (myStore?.notificationTemplates) {
                    setConfigs(myStore.notificationTemplates);
                }
                // Only show APPROVED templates
                setTemplates((templatesRes.data || []).filter(t => t.status === 'APPROVED'));
            } catch {
                toast.error('Failed to load notification settings');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [storeId]);

    const handleChange = (key, value) => {
        setConfigs(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                notificationTemplates: configs,
            });
            toast.success('Notification settings saved!');
        } catch {
            toast.error('Failed to save notification settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
    );

    const enabledCount = Object.values(configs).filter(c => c?.enabled).length;

    return (
        <div className="max-w-2xl space-y-6 pb-7 sm:pb-20">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-indigo-500" />
                        Order Notifications
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure which WhatsApp template or message is sent to customers for each order event.
                    </p>
                </div>
                {enabledCount > 0 && (
                    <span className="shrink-0 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800/40">
                        {enabledCount} Active
                    </span>
                )}
            </div>

            {/* Info banner */}
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 text-sm text-indigo-700 dark:text-indigo-300 flex items-start gap-3">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                    <strong>How it works:</strong> When an order status changes, the system will automatically send the configured WhatsApp message to the customer's phone number. Use <strong>Approved Templates</strong> for best deliverability — they work even if the customer hasn't messaged you recently.
                </div>
            </div>

            {/* Trigger cards */}
            <div className="space-y-3">
                {TRIGGERS.map(trigger => (
                    <TriggerCard
                        key={trigger.key}
                        trigger={trigger}
                        config={configs[trigger.key]}
                        templates={templates}
                        onChange={handleChange}
                    />
                ))}
            </div>

            {/* Save button */}
            <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all text-sm shadow-sm"
            >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Notification Settings'}
            </button>
        </div>
    );
}
