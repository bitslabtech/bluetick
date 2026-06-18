import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
    Bell, ChevronDown, ChevronUp, CheckCircle, Clock, Truck,
    Package, XCircle, CreditCard, Save, Info, Sparkles, X,
    Send, Loader2, Eye, AlertTriangle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Trigger definitions ──────────────────────────────────────────────────────
const TRIGGERS = [
    {
        key: 'order_placed',
        label: 'Order Placed',
        description: 'Sent to customer immediately when they place a new order.',
        icon: Clock,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800/40',
        aiPrompt: 'Create a WhatsApp Business message template for confirming a new order was placed. The template should: greet the customer by name ({{1}}), mention the order number ({{2}}), mention the store name ({{3}}), and show the order total ({{4}}). Make it warm, professional, and reassuring. Use UTILITY category. No buttons needed. Template name should start with "order_placed_".',
        variables: [
            { key: '{{1}}', label: 'customer_name' },
            { key: '{{2}}', label: 'order_number' },
            { key: '{{3}}', label: 'store_name' },
            { key: '{{4}}', label: 'order_total' },
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
        aiPrompt: 'Create a WhatsApp Business message template to notify a customer that their order has been confirmed and is being prepared. Use customer name ({{1}}), order number ({{2}}), and store name ({{3}}). Make it enthusiastic and professional. Use UTILITY category. No buttons needed. Template name should start with "order_confirmed_".',
        variables: [
            { key: '{{1}}', label: 'customer_name' },
            { key: '{{2}}', label: 'order_number' },
            { key: '{{3}}', label: 'store_name' },
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
        aiPrompt: 'Create a WhatsApp Business message template to inform a customer that their order is now being processed and packed. Use customer name ({{1}}), order number ({{2}}), and store name ({{3}}). Keep it brief and positive. Use UTILITY category. No buttons needed. Template name should start with "order_processing_".',
        variables: [
            { key: '{{1}}', label: 'customer_name' },
            { key: '{{2}}', label: 'order_number' },
            { key: '{{3}}', label: 'store_name' },
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
        aiPrompt: 'Create a WhatsApp Business message template to tell a customer their order has been shipped. Include customer name ({{1}}), order number ({{2}}), store name ({{3}}), carrier/tracking provider ({{4}}), and a tracking link ({{5}}). Make it exciting and helpful. Use UTILITY category. No buttons needed. Template name should start with "order_shipped_".',
        variables: [
            { key: '{{1}}', label: 'customer_name' },
            { key: '{{2}}', label: 'order_number' },
            { key: '{{3}}', label: 'store_name' },
            { key: '{{4}}', label: 'tracking_provider' },
            { key: '{{5}}', label: 'tracking_url' },
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
        aiPrompt: 'Create a WhatsApp Business message template to congratulate a customer that their order has been delivered. Include customer name ({{1}}), order number ({{2}}), and store name ({{3}}). Ask them to enjoy their purchase and invite them to shop again. Use UTILITY category. No buttons needed. Template name should start with "order_delivered_".',
        variables: [
            { key: '{{1}}', label: 'customer_name' },
            { key: '{{2}}', label: 'order_number' },
            { key: '{{3}}', label: 'store_name' },
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
        aiPrompt: 'Create a WhatsApp Business message template to inform a customer that their order has been cancelled. Include customer name ({{1}}), order number ({{2}}), and store name ({{3}}). Be empathetic and professional, and suggest they contact support if needed. Use UTILITY category. No buttons needed. Template name should start with "order_cancelled_".',
        variables: [
            { key: '{{1}}', label: 'customer_name' },
            { key: '{{2}}', label: 'order_number' },
            { key: '{{3}}', label: 'store_name' },
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
        aiPrompt: 'Create a WhatsApp Business message template to confirm successful payment receipt from a customer. Include customer name ({{1}}), order number ({{2}}), store name ({{3}}), and payment amount ({{4}}). Make it feel secure and reassuring. Use UTILITY category. No buttons needed. Template name should start with "payment_received_".',
        variables: [
            { key: '{{1}}', label: 'customer_name' },
            { key: '{{2}}', label: 'order_number' },
            { key: '{{3}}', label: 'store_name' },
            { key: '{{4}}', label: 'order_total' },
        ],
    },
];

// ─── AI Review Modal ──────────────────────────────────────────────────────────
function AIReviewModal({ trigger, draft, onClose, onSubmit, submitting }) {
    const [editedDraft, setEditedDraft] = useState(draft);

    if (!draft) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                            <Eye className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">Review AI Template</p>
                            <p className="text-xs text-slate-500">{trigger.label}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Info */}
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            Review the generated template. Once submitted it will be sent to Meta for approval (usually takes a few minutes to hours).
                        </p>
                    </div>

                    {/* Template Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Template Name</label>
                        <input
                            type="text"
                            value={editedDraft.name || ''}
                            onChange={e => setEditedDraft(d => ({ ...d, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') }))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-slate-400 mt-1">Lowercase, underscores only. This is permanent once submitted.</p>
                    </div>

                    {/* Category & Language */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                            <select
                                value={editedDraft.category || 'UTILITY'}
                                onChange={e => setEditedDraft(d => ({ ...d, category: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="UTILITY">UTILITY</option>
                                <option value="MARKETING">MARKETING</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Language</label>
                            <select
                                value={editedDraft.language || 'en_US'}
                                onChange={e => setEditedDraft(d => ({ ...d, language: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="en_US">English (US)</option>
                                <option value="en_GB">English (UK)</option>
                                <option value="hi">Hindi</option>
                                <option value="ar">Arabic</option>
                                <option value="es_ES">Spanish</option>
                                <option value="pt_BR">Portuguese (BR)</option>
                                <option value="fr">French</option>
                            </select>
                        </div>
                    </div>

                    {/* Body / Content */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message Body</label>
                        <textarea
                            rows={6}
                            value={editedDraft.content || ''}
                            onChange={e => setEditedDraft(d => ({ ...d, content: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono leading-relaxed"
                        />
                    </div>

                    {/* Footer (if any) */}
                    {editedDraft.footer !== undefined && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Footer (optional)</label>
                            <input
                                type="text"
                                value={editedDraft.footer || ''}
                                onChange={e => setEditedDraft(d => ({ ...d, footer: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {/* Variables legend */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Variable Mapping</p>
                        <div className="flex flex-wrap gap-1.5">
                            {trigger.variables.map(v => (
                                <span key={v.key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-mono border border-indigo-100 dark:border-indigo-800/40">
                                    {v.key}
                                    <span className="text-indigo-400 font-sans">= {v.label}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 px-5 py-4 border-t border-slate-100 dark:border-white/10">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(editedDraft)}
                        disabled={submitting || !editedDraft.name || !editedDraft.content}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                    >
                        {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                        ) : (
                            <><Send className="w-4 h-4" /> Submit to Meta</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Single Trigger Card ──────────────────────────────────────────────────────
function TriggerCard({ trigger, config, templates, onChange, onAICreate }) {
    const [expanded, setExpanded] = useState(false);
    const [generating, setGenerating] = useState(false);
    const Icon = trigger.icon;

    const enabled = config?.enabled ?? false;
    const templateId = config?.templateId ?? '';
    const selectedTemplate = templates.find(t => t.id === templateId);

    const update = (patch) => onChange(trigger.key, { ...config, ...patch });

    const handleAICreate = async () => {
        setGenerating(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/templates/draft-ai`, {
                prompt: trigger.aiPrompt
            });
            onAICreate(trigger, res.data.draft);
        } catch (err) {
            const data = err.response?.data;
            if (data?.code === 'TEMPLATE_LIMIT_REACHED') {
                toast.error(
                    `Template limit reached (${data.used}/${data.limit}). Upgrade your plan to create more.`,
                    { duration: 5000, icon: '🔒' }
                );
            } else if (err.response?.status === 402) {
                toast.error(data?.error || 'Insufficient AI tokens to generate template.', { duration: 5000, icon: '💳' });
            } else {
                toast.error(data?.error || 'Failed to generate template with AI');
            }
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${trigger.border} bg-white dark:bg-surface-dark`}>
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 md:px-5 py-4">
                <div className={`p-2 rounded-xl ${trigger.bg} flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${trigger.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{trigger.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{trigger.description}</p>
                </div>
                {/* Active badge */}
                {enabled && templateId && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800/40 flex-shrink-0">
                        <CheckCircle className="w-3 h-3" /> Active
                    </span>
                )}
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
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 flex-shrink-0"
                >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Expanded config */}
            {expanded && (
                <div className={`px-4 md:px-5 pb-5 pt-2 border-t space-y-4 ${trigger.border}`}>
                    {/* Template selector + AI button */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Approved Template</label>
                            <button
                                type="button"
                                onClick={handleAICreate}
                                disabled={generating}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-sm shadow-violet-200 dark:shadow-none"
                            >
                                {generating ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                                ) : (
                                    <><Sparkles className="w-3 h-3" /> Create with AI</>
                                )}
                            </button>
                        </div>

                        {templates.length === 0 ? (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <p className="text-xs text-slate-400 italic">
                                    No approved templates yet. Use <strong>Create with AI</strong> above to generate and submit one, or go to <strong>Templates</strong> to create manually.
                                </p>
                            </div>
                        ) : (
                            <select
                                value={templateId}
                                onChange={e => update({ templateId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                            >
                                <option value="">-- Select an approved template --</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.language}) ✓
                                    </option>
                                ))}
                            </select>
                        )}

                        {selectedTemplate && (
                            <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">
                                {selectedTemplate.content}
                            </div>
                        )}
                    </div>

                    {/* Variable mapping info */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Variables Auto-Injected into Template</p>
                        <div className="flex flex-wrap gap-1.5">
                            {trigger.variables.map(v => (
                                <span key={v.key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-mono border border-indigo-100 dark:border-indigo-800/40">
                                    {v.key}
                                    <span className="text-indigo-400 font-sans">= {v.label}</span>
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                            Template body variables ({`{{1}}`}, {`{{2}}`}, etc.) are filled with real order data in the order shown above.
                        </p>
                    </div>

                    {/* Warning: enabled but no template */}
                    {enabled && !templateId && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                            <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                This trigger is enabled but no template is selected. Please select a template or disable this trigger.
                            </p>
                        </div>
                    )}
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

    // AI review modal state
    const [reviewModal, setReviewModal] = useState(null); // { trigger, draft }
    const [submittingTemplate, setSubmittingTemplate] = useState(false);

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

    useEffect(() => {
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

    // Called when AI draft is ready — opens review modal
    const handleAICreate = (trigger, draft) => {
        setReviewModal({ trigger, draft });
    };

    // Submit AI-reviewed draft to Meta via existing template creation API
    const handleSubmitTemplate = async (editedDraft) => {
        setSubmittingTemplate(true);
        try {
            // Build bodyVariables for Meta sample values (required for templates with variables)
            const varMatches = (editedDraft.content || '').match(/\{\{\d+\}\}/g) || [];
            const bodyVariables = varMatches.map((_, i) => {
                const varDef = reviewModal.trigger.variables[i];
                return varDef ? varDef.label : `sample_${i + 1}`;
            });

            const payload = {
                name: editedDraft.name,
                content: editedDraft.content,
                category: editedDraft.category || 'UTILITY',
                language: editedDraft.language || 'en_US',
                archetype: 'simple_text',
                headerType: 'NONE',
                footer: editedDraft.footer || null,
                buttons: [],
                bodyVariables: bodyVariables.length > 0 ? bodyVariables : undefined,
            };

            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/templates`, payload);

            toast.success(`Template "${res.data.name}" submitted to Meta for approval!`);
            setReviewModal(null);

            // Refresh templates list so user can immediately see and select it
            const templatesRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`);
            setTemplates((templatesRes.data || []).filter(t => t.status === 'APPROVED'));

        } catch (err) {
            const data = err.response?.data;
            if (data?.code === 'TEMPLATE_LIMIT_REACHED') {
                toast.error(
                    `Template limit reached (${data.used}/${data.limit}). Upgrade your plan to create more.`,
                    { duration: 5000, icon: '🔒' }
                );
            } else {
                toast.error(data?.error || 'Failed to submit template to Meta');
            }
        } finally {
            setSubmittingTemplate(false);
        }
    };

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
    );

    const enabledCount = Object.values(configs).filter(c => c?.enabled && c?.templateId).length;

    return (
        <>
            <div className="max-w-2xl space-y-6 pb-7 sm:pb-20">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Bell className="w-5 h-5 text-indigo-500" />
                            Order Notifications
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Choose which approved WhatsApp template is sent to customers for each order event. Use <span className="font-semibold text-violet-600 dark:text-violet-400">Create with AI</span> to auto-generate templates instantly.
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
                        <strong>How it works:</strong> When an order status changes, the system automatically sends the selected approved WhatsApp template to the customer. Click <strong className="text-violet-700 dark:text-violet-300">✦ Create with AI</strong> on any trigger to auto-generate and submit a correctly structured template — then select it here once approved.
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
                            onAICreate={handleAICreate}
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

            {/* AI Review Modal */}
            {reviewModal && (
                <AIReviewModal
                    trigger={reviewModal.trigger}
                    draft={reviewModal.draft}
                    onClose={() => setReviewModal(null)}
                    onSubmit={handleSubmitTemplate}
                    submitting={submittingTemplate}
                />
            )}
        </>
    );
}
