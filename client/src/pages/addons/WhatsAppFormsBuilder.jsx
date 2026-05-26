import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Plus, Trash2, Edit3, Save, ChevronLeft, LayoutPanelLeft, LayoutList, Layers,
    Smartphone, CheckCircle2, Copy, Share2, Type, List, ToggleRight,
    Settings, Database, Eye, Zap, Loader2, Image as ImageIcon, Play, FileText,
    Calendar, Clock, Star, PenTool, UploadCloud, Link as LinkIcon, AlertCircle, TrendingUp, GripVertical, ShieldAlert, Mail, LogOut, MapPinned, CreditCard, DollarSign, IndianRupee, Euro, PoundSterling,
    X, ArrowLeft, ArrowRight, MessageSquareShare, Users, CalendarDays, ShoppingCart, SquareDashed, Sparkles, Building2
} from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

// Utility elements
const generateId = () => Math.random().toString(36).substring(2, 9);
const ChevronDown = ({ width = 24 }) => <svg width={width} height={width} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
const Send = ({ width = 24 }) => <svg width={width} height={width} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>

const FORM_TEMPLATES = [
    {
        id: 'blank',
        name: 'Blank Canvas',
        description: 'Start entirely from scratch for custom needs.',
        icon: SquareDashed,
        color: 'text-slate-400',
        bg: 'bg-slate-100 dark:bg-slate-800',
        formSetup: {
            name: 'Untitled Form',
            description: '',
            fields: [],
            brandConfig: { primaryColor: '#4f46e5', logoUrl: '' },
            formLogic: { isMultiStep: false }
        }
    },
    {
        id: 'lead-gen',
        name: 'Lead Generation',
        description: 'Capture high-intent leads directly into your database.',
        icon: Users,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        formSetup: {
            name: 'Get Exclusive Access',
            description: 'Provide your details below and our team will reach out instantly.',
            fields: [
                { id: generateId(), type: 'text', label: 'Full Name', required: true },
                { id: generateId(), type: 'phone', label: 'WhatsApp Number', required: true },
                { id: generateId(), type: 'email', label: 'Work Email', required: false },
                { id: generateId(), type: 'text', label: 'Company Name', required: false }
            ],
            brandConfig: { primaryColor: '#3b82f6', logoUrl: '' },
            formLogic: { isMultiStep: true }
        }
    },
    {
        id: 'feedback',
        name: 'Customer Feedback',
        description: 'Measure satisfaction with ratings and open feedback.',
        icon: MessageSquareShare,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        formSetup: {
            name: 'How was your experience?',
            description: 'Your feedback helps us improve our services every day.',
            fields: [
                { id: generateId(), type: 'rating', label: 'Rate your overall experience', required: true },
                { id: generateId(), type: 'yesno', label: 'Would you recommend us?', required: true },
                { id: generateId(), type: 'text', label: 'What could we do better?', required: false }
            ],
            brandConfig: { primaryColor: '#f59e0b', logoUrl: '' },
            formLogic: { isMultiStep: true }
        }
    },
    {
        id: 'registration',
        name: 'Event Registration',
        description: 'Sign up attendees for webinars or physical events.',
        icon: CalendarDays,
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-500/10',
        formSetup: {
            name: 'Event Registration',
            description: 'Secure your spot for our upcoming event.',
            fields: [
                { id: generateId(), type: 'text', label: 'Attendee Name', required: true },
                { id: generateId(), type: 'phone', label: 'Contact Number', required: true },
                { id: generateId(), type: 'select', label: 'Ticket Type', required: true, options: ['General Admission', 'VIP', 'Early Bird'] },
                { id: generateId(), type: 'number', label: 'Number of Guests', required: true, minValue: 1, maxValue: 5 }
            ],
            brandConfig: { primaryColor: '#8b5cf6', logoUrl: '' },
            formLogic: { isMultiStep: false }
        }
    },
    {
        id: 'checkout',
        name: 'E-commerce Checkout',
        description: 'Take orders directly with built-in payments.',
        icon: ShoppingCart,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        formSetup: {
            name: 'Secure Order Checkout',
            description: 'Complete your purchase below.',
            fields: [
                { id: generateId(), type: 'text', label: 'Shipping Name', required: true },
                { id: generateId(), type: 'phone', label: 'WhatsApp Number', required: true },
                { id: generateId(), type: 'address', label: 'Delivery Address', required: true },
                { id: generateId(), type: 'radio', label: 'Select Package', required: true, options: ['Standard', 'Premium'], optionPrices: {'Standard': '99', 'Premium': '199'} }
            ],
            brandConfig: { primaryColor: '#10b981', logoUrl: '' },
            formLogic: { isMultiStep: true },
            paymentConfig: { requirePayment: true }
        }
    }
];

const DraggableFieldItem = ({ field, editingFieldId, setEditingFieldId, deleteField, updateField, isPaymentDynamicField, paymentCurrencySymbol }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        position: 'relative'
    };

    return (
        <div
            ref={setNodeRef} style={style}
            className={`p-5 rounded-2xl border transition-all group flex gap-4 ${isDragging ? 'shadow-2xl shadow-indigo-500/10 border-indigo-500 bg-white dark:bg-surface-dark scale-[1.02] opacity-90' : editingFieldId === field.id ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-500 shadow-lg shadow-indigo-500/5' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm cursor-pointer'}`}
            onClick={() => setEditingFieldId(field.id)}
        >
            <div className="pt-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-500 shrink-0 outline-none" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
                <GripVertical className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                {editingFieldId === field.id ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-white dark:bg-black/30 rounded border border-slate-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">{field.type} Endpoint</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); deleteField(field.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setEditingFieldId(null); }} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-white/10 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Data Target Label</label>
                            <input type="text" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                        </div>

                        {['select', 'radio'].includes(field.type) && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Available Parameters</label>
                                <div className="space-y-2">
                                    {(field.options || []).map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input type="text" value={opt} onChange={(e) => {
                                                const newOpt = [...field.options];
                                                const oldVal = newOpt[i];
                                                const newVal = e.target.value;
                                                newOpt[i] = newVal;
                                                
                                                const newPrices = { ...(field.optionPrices || {}) };
                                                if (newPrices[oldVal] !== undefined) {
                                                    newPrices[newVal] = newPrices[oldVal];
                                                    delete newPrices[oldVal];
                                                }
                                                updateField(field.id, { options: newOpt, optionPrices: newPrices });
                                            }} className="flex-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg focus:border-indigo-500 outline-none px-3 text-sm py-2" />

                                            {isPaymentDynamicField && (
                                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-0.5 focus-within:border-indigo-400 transition-colors shrink-0 w-24">
                                                    <span className="text-slate-400 font-bold">{paymentCurrencySymbol || '₹'}</span>
                                                    <input 
                                                        type="number" 
                                                        value={field.optionPrices?.[opt] || ''} 
                                                        onChange={e => {
                                                            const newPrices = { ...(field.optionPrices || {}) };
                                                            newPrices[opt] = e.target.value;
                                                            updateField(field.id, { optionPrices: newPrices });
                                                        }}
                                                        className="bg-transparent border-none outline-none font-mono text-[11px] w-full placeholder:text-slate-300" 
                                                        placeholder="Price" 
                                                    />
                                                </div>
                                            )}

                                            <button type="button" onClick={() => {
                                                const newOpt = field.options.filter((_, fi) => fi !== i);
                                                const newPrices = { ...(field.optionPrices || {}) };
                                                delete newPrices[opt];
                                                updateField(field.id, { options: newOpt, optionPrices: newPrices });
                                            }} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg"><X className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => updateField(field.id, { options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })} className="text-xs font-bold text-indigo-500 flex items-center gap-1 mt-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-2 rounded-lg"><Plus className="w-3 h-3" /> Add Option</button>
                                </div>
                            </div>
                        )}

                        {/* Radio: selection mode toggle */}
                        {field.type === 'radio' && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Selection Mode</label>
                                <div className="flex gap-2">
                                    {[{ v: 'single', l: 'Single Choice' }, { v: 'multiple', l: 'Multi Select' }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => updateField(field.id, { selectionMode: v })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${(field.selectionMode || 'single') === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500'}`}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Phone: digit count validation */}
                        {field.type === 'phone' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Min Digits</label>
                                        <input type="number" min="1" max="20" value={field.minDigits || ''} onChange={e => updateField(field.id, { minDigits: e.target.value })} placeholder="e.g. 10" className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 text-sm font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Max Digits</label>
                                        <input type="number" min="1" max="20" value={field.maxDigits || ''} onChange={e => updateField(field.id, { maxDigits: e.target.value })} placeholder="e.g. 15" className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 text-sm font-mono" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">Quick Presets:</label>
                                    {[
                                        { label: '🇮🇳 India (10)', min: 10, max: 10 },
                                        { label: '🌍 Intl (7–15)', min: 7, max: 15 },
                                    ].map(p => (
                                        <button key={p.label} type="button"
                                            onClick={() => updateField(field.id, { minDigits: p.min, maxDigits: p.max })}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                                Number(field.minDigits) === p.min && Number(field.maxDigits) === p.max
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500 hover:border-indigo-400'
                                            }`}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Number: min/max value */}
                        {field.type === 'number' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Min Value</label>
                                    <input type="number" value={field.minValue ?? ''} onChange={e => updateField(field.id, { minValue: e.target.value })} placeholder="e.g. 0" className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 text-sm font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Max Value</label>
                                    <input type="number" value={field.maxValue ?? ''} onChange={e => updateField(field.id, { maxValue: e.target.value })} placeholder="e.g. 100" className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 text-sm font-mono" />
                                </div>
                            </div>
                        )}

                        {/* File / Image: accepted types helper */}
                        {['file', 'image'].includes(field.type) && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Accepted Types</label>
                                <input type="text" value={field.acceptTypes || ''} onChange={e => updateField(field.id, { acceptTypes: e.target.value })} placeholder={field.type === 'image' ? 'image/png, image/jpeg' : '.pdf, .docx, .xlsx'} className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 text-sm font-mono" />
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                Mandatory Requirement
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                                {field.type === 'text' && <Type className="w-4 h-4" />}
                                {field.type === 'phone' && <Smartphone className="w-4 h-4" />}
                                {field.type === 'select' && <List className="w-4 h-4" />}
                                {field.type === 'radio' && <ToggleRight className="w-4 h-4" />}
                                {field.type === 'date' && <Calendar className="w-4 h-4" />}
                                {field.type === 'time' && <Clock className="w-4 h-4" />}
                                {field.type === 'rating' && <Star className="w-4 h-4" />}
                                {field.type === 'file' && <UploadCloud className="w-4 h-4" />}
                                {field.type === 'signature' && <PenTool className="w-4 h-4" />}
                                {field.type === 'email' && <Mail className="w-4 h-4 text-blue-500" />}
                                {field.type === 'number' && <span className="text-xs font-bold">#</span>}
                                {field.type === 'image' && <ImageIcon className="w-4 h-4" />}
                                {field.type === 'address' && <MapPinned className="w-4 h-4" />}
                                {field.type === 'yesno' && <ToggleRight className="w-4 h-4 text-green-500" />}
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                    {field.label} {field.required && <span className="text-red-500 shrink-0">*</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono tracking-wider">{field.id}</div>
                            </div>
                        </div>
                        <Edit3 className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}
            </div>
        </div>
    );
};

const WhatsAppFormsBuilder = () => {
    const { showToast } = useUI();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            setActiveForm((prev) => {
                const oldIndex = prev.fields.findIndex(f => f.id === active.id);
                const newIndex = prev.fields.findIndex(f => f.id === over.id);
                const newFields = [...prev.fields];
                const [moved] = newFields.splice(oldIndex, 1);
                newFields.splice(newIndex, 0, moved);
                return { ...prev, fields: newFields };
            });
        }
    };

    const [viewMode, setViewMode] = useState('builder'); // 'builder', 'responses'

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allForms, setAllForms] = useState([]);
    const [hasAddon, setHasAddon] = useState(true);
    const [addonExpiry, setAddonExpiry] = useState(null);

    const [activeForm, setActiveForm] = useState(null);
    const [editingFieldId, setEditingFieldId] = useState(null);
    const [previewStep, setPreviewStep] = useState(0);
    const [responses, setResponses] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templatesFetched, setTemplatesFetched] = useState(false);
    const [responsesLoading, setResponsesLoading] = useState(false);
    const [mediaUploading, setMediaUploading] = useState(false);
    const [pgConfigured, setPgConfigured] = useState(false);

    // AI Form State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);

    const handleTemplateMediaUpload = async (file) => {
        if (!file) return;
        setMediaUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await axios.post('/api/templates/upload-message-media', fd, {
                headers: { 'Content-Type': 'multipart/form-data',  }
            });
            updateNestedState('automation', 'whatsappTemplate', {
                ...activeForm.automation?.whatsappTemplate,
                headerMediaId: res.data.mediaId,
                headerLocalUrl: res.data.localUrl,
                headerFileName: file.name
            });
        } catch (err) {
            console.error('Media upload failed:', err);
            showToast({ type: 'error', title: 'Upload Failed', message: 'Could not upload media.' });
        } finally {
            setMediaUploading(false);
        }
    };

    const handleCardMediaUpload = async (cardIdx, file) => {
        if (!file) return;
        setMediaUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await axios.post('/api/templates/upload-message-media', fd, {
                headers: { 'Content-Type': 'multipart/form-data',  }
            });
            const autoTmpl = activeForm.automation?.whatsappTemplate || {};
            const cardsList = [...(autoTmpl.cards || [])];
            while (cardsList.length <= cardIdx) cardsList.push({});
            
            cardsList[cardIdx] = {
                ...cardsList[cardIdx],
                headerMediaId: res.data.mediaId,
                headerLocalUrl: res.data.localUrl,
                headerFileName: file.name
            };
            updateNestedState('automation', 'whatsappTemplate', { ...autoTmpl, cards: cardsList });
        } catch (err) {
            console.error('Card media upload failed:', err);
            showToast({ type: 'error', title: 'Upload Failed', message: 'Could not upload media for card.' });
        } finally {
            setMediaUploading(false);
        }
    };

    // Fetch responses whenever the Database Hub tab is opened
    useEffect(() => {
        if (viewMode === 'responses' && activeForm?.id) {
            setResponsesLoading(true);
            axios.get(`/api/forms/admin/${activeForm.id}`).then(res => {
                setResponses(res.data?.FormResponses || []);
            }).catch(err => {
                console.error('Responses fetch error', err);
                showToast({ type: 'error', title: 'Error', message: 'Could not load responses.' });
            }).finally(() => setResponsesLoading(false));
        }
    }, [viewMode, activeForm?.id]);

    useEffect(() => {
        if (viewMode === 'automations' && !templatesFetched && !templatesLoading) {
            setTemplatesLoading(true);
            axios.get('/api/templates')
                .then(res => {
                    setTemplates(res.data?.data || res.data || []);
                    setTemplatesFetched(true);
                })
                .catch(err => console.error("Could not fetch templates", err))
                .finally(() => setTemplatesLoading(false));
        }
    }, [viewMode, templatesFetched, templatesLoading]);

    useEffect(() => {
        const verifyAndLoad = async () => {
            try {
                try {
                    const settingsRes = await axios.get('/api/settings');
                    const pg = settingsRes.data?.paymentGateways || {};
                    setPgConfigured(!!pg.razorpay?.keyId || !!pg.stripe?.publishableKey);
                } catch(e) { console.error('Error fetching settings for PG check', e); }

                const confRes = await axios.get('/api/addons/my/forms/config', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHasAddon(true);
                if (confRes.data && confRes.data.currentPeriodEnd) {
                    setAddonExpiry(confRes.data.currentPeriodEnd);
                }
                await fetchForms();
            } catch (err) {
                if (err.response?.status === 403 || err.response?.status === 404) {
                    setHasAddon(false);
                } else {
                    console.error("Error verifying addon:", err);
                }
            } finally {
                setLoading(false);
            }
        };
        verifyAndLoad();
    }, []);

    const fetchForms = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/forms');
            setAllForms(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
            showToast({ type: 'error', title: 'Error', message: 'Failed to load forms' });
        }
    };

    useEffect(() => {
        const formId = searchParams.get('form');
        if (!formId) {
            setActiveForm(null);
            setViewMode('builder');
            return;
        }
        if (formId === 'templates') {
            setActiveForm(null);
            setViewMode('templates');
            return;
        }

        if (formId === 'new') {
            if (!activeForm || activeForm.id) {
                setActiveForm({
                    id: null,
                    name: 'Special Offer Form',
                    description: 'Provide an incentive for your users...',
                    theme: 'apple',
                    isPublished: false,
                    fields: [
                        { id: generateId(), type: 'text', label: 'Full Name', required: true },
                        { id: generateId(), type: 'phone', label: 'WhatsApp Number', required: true }
                    ],
                    brandConfig: { primaryColor: '#4f46e5', logoUrl: '' },
                    formLogic: { isMultiStep: false },
                    automation: { webhookUrl: '' },
                    restrictions: { closeDate: '', maxSubmissions: '', preventDuplicates: false },
                    views: 0,
                    FormResponses: []
                });
                setViewMode('builder');
            }
        } else {
            if (!activeForm || String(activeForm.id) !== String(formId)) {
                const existing = allForms.find(f => String(f.id) === String(formId));
                if (existing) {
                    setActiveForm({
                        ...existing,
                        fields: Array.isArray(existing.fields) ? existing.fields : [],
                        brandConfig: existing.brandConfig || { primaryColor: '#4f46e5', logoUrl: '' },
                        formLogic: existing.formLogic || { isMultiStep: false },
                        automation: existing.automation || { webhookUrl: '' },
                        restrictions: existing.restrictions || { closeDate: '', maxSubmissions: '', preventDuplicates: false }
                    });
                }

                axios.get(`/api/forms/admin/${formId}`)
                    .then(res => {
                        const data = res.data;
                        setActiveForm({
                            ...data,
                            fields: Array.isArray(data.fields) ? data.fields : [],
                            brandConfig: data.brandConfig || { primaryColor: '#4f46e5', logoUrl: '' },
                            formLogic: data.formLogic || { isMultiStep: false },
                            automation: data.automation || { webhookUrl: '' },
                            restrictions: data.restrictions || { closeDate: '', maxSubmissions: '', preventDuplicates: false }
                        });
                        setViewMode('builder');
                    })
                    .catch(err => {
                        console.error(err);
                        showToast({ type: 'error', title: 'Load Failed', message: 'Could not fetch full form data.' });
                        setSearchParams({});
                    });
            }
        }
    }, [searchParams.get('form')]);

    const handleCreateNewForm = () => {
        setSearchParams({ form: 'templates' });
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return showToast({ type: 'error', title: 'Empty Prompt', message: 'Please describe the form you need.' });
        setAiGenerating(true);
        try {
            const res = await axios.post('/api/forms/generate-ai', { prompt: aiPrompt });
            
            const newForm = res.data.formSetup;
            // Map JSON to activeForm format
            setActiveForm({
                id: null,
                name: newForm.name || 'AI Generated Form',
                description: newForm.description || '',
                theme: 'light',
                isPublished: false,
                fields: newForm.fields || [],
                brandConfig: { primaryColor: '#10b981', logoUrl: '' },
                formLogic: { isMultiStep: false },
                automation: { webhookUrl: '' },
                restrictions: { closeDate: '', maxSubmissions: '', preventDuplicates: false },
                paymentConfig: newForm.checkout || { requirePayment: false, currency: 'INR', amount: 0, paymentType: 'fixed' },
                views: 0,
                FormResponses: []
            });
            setShowAiModal(false);
            setAiPrompt('');
            setSearchParams({ form: 'new' });
            setViewMode('builder');
            showToast({ type: 'success', title: 'AI Form Ready', message: `Form generated! ${res.data.tokensDeducted} tokens used.` });

            // Fire event to update token balance in top header
            window.dispatchEvent(new Event('dashboard-stats-update'));
        } catch (err) {
            console.error('AI Generation error:', err);
            showToast({ type: 'error', title: 'Generation Failed', message: err.response?.data?.error || 'Could not generate form.' });
        } finally {
            setAiGenerating(false);
        }
    };

    const handleTemplateSelect = (template) => {
        setActiveForm({
            ...template.formSetup,
            id: null,
            isPublished: false,
            views: 0,
            FormResponses: [],
            // Ensure any arrays/objects from template are deep-copied or safely inherited
            fields: [...template.formSetup.fields],
            brandConfig: { ...template.formSetup.brandConfig },
            formLogic: { ...template.formSetup.formLogic },
            paymentConfig: { ...(template.formSetup.paymentConfig || {}) }
        });
        setSearchParams({ form: 'new' });
        setViewMode('builder');
    };

    const handleLoadForm = async (selectedForm) => {
        setSearchParams({ form: selectedForm.id });
    };

    const handleSaveForm = async () => {
        if (!activeForm.name) {
            showToast({ type: 'error', title: 'Missing Title', message: 'Please give your form a name.' });
            return;
        }

        setSaving(true);
        try {
            const hdrs = { };
            // Ensure numbers are null if empty string
            const payload = {
                ...activeForm,
                restrictions: {
                    ...activeForm.restrictions,
                    maxSubmissions: activeForm.restrictions.maxSubmissions || null,
                    closeDate: activeForm.restrictions.closeDate || null
                }
            };

            if (activeForm.id) {
                await axios.put(`/api/forms/${activeForm.id}`, payload, hdrs);
                showToast({ type: 'success', title: 'Saved', message: 'Form configuration updated!' });
            } else {
                const res = await axios.post('/api/forms', payload, hdrs);
                setActiveForm({ ...payload, id: res.data.id });
                setSearchParams({ form: res.data.id }, { replace: true });
                showToast({ type: 'success', title: 'Created', message: 'Forms engine deployed!' });
            }
            fetchForms();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Save Failed', message: 'Could not save form.' });
        } finally {
            setSaving(false);
        }
    };

    const updateNestedState = (category, key, value) => {
        setActiveForm(prev => ({
            ...prev,
            [category]: {
                ...(prev[category] || {}),
                [key]: value
            }
        }));
    };

    const addField = (type) => {
        const defaultLabels = {
            text: 'Full Name',
            phone: 'Phone Number',
            email: 'Email Address',
            number: 'Enter a Number',
            select: 'Select an Option',
            radio: 'Choose an Option',
            yesno: 'Yes or No?',
            date: 'Date',
            time: 'Time',
            rating: 'Rate Your Experience',
            file: 'Upload a File',
            image: 'Upload an Image',
            address: 'Your Address',
            signature: 'Your Signature',
        };
        const newField = {
            id: generateId(),
            type,
            label: defaultLabels[type] || 'New Field',
            required: false,
            options: ['select', 'radio'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
            selectionMode: type === 'radio' ? 'single' : undefined,
        };
        setActiveForm({ ...activeForm, fields: [...activeForm.fields, newField] });
        setEditingFieldId(newField.id);
    };

    const updateField = (id, updates) => {
        setActiveForm({ ...activeForm, fields: activeForm.fields.map(f => f.id === id ? { ...f, ...updates } : f) });
    };

    const deleteField = (id) => {
        setActiveForm({ ...activeForm, fields: activeForm.fields.filter(f => f.id !== id) });
        if (editingFieldId === id) setEditingFieldId(null);
    };

    const isPremiumFeature = (feature) => {
        // Mock premium check against user plan. For MVP, assuming "Pro" and "Premium" have access.
        // if (user?.plan?.name?.toLowerCase().includes('pro') || user?.plan?.name?.toLowerCase().includes('premium')) return true;
        // Basic plans or undefined plan means no access
        return true;
    };


    // ================= VIEWS ================= //

    if (viewMode === 'templates') {
        return <TemplateGalleryView handleTemplateSelect={handleTemplateSelect} setSearchParams={setSearchParams} />;
    }

    if (!activeForm) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
                <div className="flex items-center justify-between mb-10 border-b border-slate-200 dark:border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                            <LayoutPanelLeft className="w-8 h-8 text-indigo-500" /> Web Forms Manager
                            {addonExpiry && (
                                <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full uppercase tracking-wider ml-2 flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-800 animate-pulse-slow">
                                    <Clock className="w-3.5 h-3.5" />
                                    Expiring in {Math.max(0, Math.ceil((new Date(addonExpiry) - new Date()) / (1000 * 60 * 60 * 24)))} Days
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Design premium, highest-converting data collection endpoints bound natively to your operations.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => setShowAiModal(true)} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5" /> Create Form with AI
                        </button>
                        <button onClick={handleCreateNewForm} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" /> Create Form
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : !hasAddon ? (
                    <div className="flex flex-col justify-center items-center py-20 px-4 text-center bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl">
                        <Zap className="w-12 h-12 text-slate-400 mb-6" />
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Build Forms Like Magic</h2>
                        <p className="text-slate-500 mb-8 max-w-md">Purchase the Web Forms Add-on from the marketplace to unlock advanced routing and landing page components.</p>
                        <Link to="/marketplace" className="px-4 md:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">Browse Marketplace</Link>
                    </div>
                ) : allForms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-white dark:bg-surface-dark border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                            <Zap className="w-10 h-10 text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">You haven't built any forms yet</h3>
                        <p className="text-slate-500 max-w-md mb-8">Deploy zero-code surveys, file collections, and lead generation links tied strictly to your databases.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowAiModal(true)} className="px-4 md:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Create with AI
                            </button>
                            <button onClick={handleCreateNewForm} className="px-4 md:px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold rounded-xl transition-all">
                                Start Blank Form
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allForms.map(form => {
                            const isExpired = form.restrictions?.closeDate && new Date(form.restrictions.closeDate) < new Date();
                            const submittedCount = parseInt(form.submissionCount || form.FormResponses?.length || 0);
                            const dropoffCount = Math.max(0, (form.views || 0) - submittedCount);
                            
                            return (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={form.id} onClick={() => handleLoadForm(form)} className="group cursor-pointer bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl p-4 md:p-6 hover:shadow-2xl hover:border-indigo-500/30 transition-all flex flex-col h-64 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 md:p-6 flex gap-2">
                                        {isExpired ? (
                                            <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase py-1 px-2 rounded-md flex items-center gap-1"><Clock className="w-3 h-3" /> Expired</span>
                                        ) : form.isPublished ? (
                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase py-1 px-2 rounded-md flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Live</span>
                                        ) : (
                                            <span className="bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase py-1 px-2 rounded-md flex items-center gap-1"><Edit3 className="w-3 h-3" /> Draft</span>
                                        )}
                                    </div>
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                    <List className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-2 line-clamp-1">{form.name}</h3>
                                <div className="flex items-center flex-wrap gap-2 mb-4">
                                    <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded">{form.views || 0} Views</span>
                                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded">{submittedCount} Submitted</span>
                                    <span className="text-xs font-bold px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded">{dropoffCount} Drop-offs</span>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                        <Calendar className="w-4 h-4" /> {form.createdAt ? new Date(form.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleLoadForm(form); setTimeout(() => { const el = document.getElementById('responses-tab'); if(el) el.click(); }, 300); }}
                                            className="text-xs font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                                        >
                                            <List className="w-3 h-3" /> Responses
                                        </button>
                                        <span className="flex items-center gap-1 text-indigo-600 text-sm font-bold">
                                            Configure <ChevronLeft className="w-4 h-4 rotate-180" />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )})}
                    </div>
                )}

                <AnimatePresence>
                    {showAiModal && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl shadow-emerald-500/10 max-w-xl w-full flex flex-col overflow-hidden">
                                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-transparent">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-emerald-500" /> Generate Form with AI
                                    </h3>
                                    <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-4 md:p-6 space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">What kind of form do you need?</label>
                                        <textarea 
                                            value={aiPrompt}
                                            onChange={e => setAiPrompt(e.target.value)}
                                            placeholder="e.g. A lead generation form for my real estate agency, asking for name, email, budget, and preferred locations."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-emerald-500 resize-none font-medium text-slate-900 dark:text-white"
                                            disabled={aiGenerating}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Or choose a quick prompt:</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Lead Generation', 'Customer Feedback', 'Event Registration', 'Ecommerce Order Checkout'].map(pt => (
                                                <button 
                                                    key={pt} 
                                                    type="button"
                                                    onClick={() => setAiPrompt(`Create a highly effective ${pt} form.`)}
                                                    className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                                                    disabled={aiGenerating}
                                                >
                                                    {pt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 md:p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex justify-end gap-3">
                                    <button onClick={() => setShowAiModal(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all" disabled={aiGenerating}>Cancel</button>
                                    <button onClick={handleGenerateAI} disabled={aiGenerating || !aiPrompt.trim()} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] max-w-full">
                                        {aiGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Generate Magic</>}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        );

    }

    const viewProps = {
        activeForm, setActiveForm, updateNestedState, templates, setTemplates, templatesLoading, setTemplatesLoading,
        loading, saving, handleSaveForm, mediaUploading, handleTemplateMediaUpload, handleCardMediaUpload,
        responses, responsesLoading, previewStep, setPreviewStep, editingFieldId, setEditingFieldId,
        sensors, closestCenter, handleDragEnd, verticalListSortingStrategy, deleteField, updateField, addField,
        showToast, baseUrl: window.location.origin, isPremiumFeature, hasAddon, allForms, fetchForms, handleCreateNewForm, handleLoadForm,
        viewMode, setViewMode, pgConfigured
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#F5F5F7] dark:bg-[#0B1120] flex flex-col overflow-hidden font-sans">
            <nav className="h-16 bg-white dark:bg-surface-dark border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0 relative z-20 shadow-sm">
                <div className="flex items-center gap-4 flex-1">
                    <button onClick={() => { setSearchParams({}); fetchForms(); }} className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-white/5">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
                </div>

                <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-lg shrink-0 overflow-x-auto scrollbar-hide gap-1">
                    <button onClick={() => setViewMode('builder')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all whitespace-nowrap ${viewMode === 'builder' ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Form Designing</button>
                    <button onClick={() => setViewMode('automations')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all whitespace-nowrap flex items-center gap-2 ${viewMode === 'automations' ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><Zap className="w-4 h-4" /> Automations</button>
                    <button id="responses-tab" onClick={() => setViewMode('responses')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'responses' ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        Received Responses
                    </button>
                </div>

                <div className="flex items-center gap-3 flex-1 justify-end">
                    {activeForm.id && (
                        <button onClick={() => {
                            const baseUrl = window.location.origin;
                            navigator.clipboard.writeText(`${baseUrl}/f/${activeForm.id}`);
                            showToast({ type: 'success', title: 'Copied!', message: 'Production endpoint copied.' });
                        }} className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:border-indigo-300 transition-colors">
                            <Share2 className="w-4 h-4" /> Export Link
                        </button>
                    )}

                    <div className="flex items-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 gap-3 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={activeForm.isPublished || false} onChange={e => setActiveForm({ ...activeForm, isPublished: e.target.checked })} />
                            <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500 dark:peer-checked:bg-green-500"></div>
                            <span className={`ml-2 text-[10px] font-bold uppercase tracking-widest ${activeForm.isPublished ? 'text-green-600' : 'text-slate-500 dark:text-slate-300'}`}>{activeForm.isPublished ? 'Live' : 'Draft'}</span>
                        </label>
                    </div>

                    <button onClick={handleSaveForm} disabled={saving} className="px-4 md:px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-75">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Synchronizing...' : 'Save Changes'}
                    </button>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden bg-[#F5F5F7] dark:bg-[#0B1120]">

                {viewMode === 'templates' && <TemplateGalleryView handleTemplateSelect={handleTemplateSelect} setSearchParams={setSearchParams} />}
                {viewMode === 'builder' && <BuilderView {...viewProps} />}
                {viewMode === 'automations' && <AutomationsView {...viewProps} />}
                {viewMode === 'responses' && <ResponsesView {...viewProps} />}
          </div>
        </div>
    );
};



// ================= VIEWS ================= //
const TemplateGalleryView = ({ handleTemplateSelect, setSearchParams }) => {
    return (
        <div className="min-h-screen flex flex-col bg-[#F5F5F7] dark:bg-[#0B1120] overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full p-4 md:p-8 py-12">
                <div className="flex items-center gap-4 mb-2">
                    <button onClick={() => setSearchParams({})} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Template Gallery</h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-12 pl-14 max-w-2xl">
                    Deploy heavily-optimized forms natively bound to WhatsApp automations. Start from scratch or select an industry standard below.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                    {FORM_TEMPLATES.map((tpl) => {
                        const Icon = tpl.icon;
                        return (
                            <div 
                                key={tpl.id}
                                onClick={() => handleTemplateSelect(tpl)}
                                className="group cursor-pointer bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl p-4 md:p-6 hover:shadow-2xl hover:border-indigo-500/30 transition-all flex flex-col relative overflow-hidden h-full"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shrink-0 transition-transform group-hover:scale-110 ${tpl.bg} ${tpl.color}`}>
                                    <Icon className="w-7 h-7" />
                                </div>
                                
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{tpl.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium flex-1">
                                    {tpl.description}
                                </p>
                                
                                <div className="mt-8 flex items-center justify-between text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-indigo-600 dark:text-indigo-400">Use Template</span>
                                    <ArrowRight className="w-4 h-4 text-indigo-500 translate-x-0 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const BuilderView = (props) => {
    const {
        activeForm, setActiveForm, updateNestedState, templates, setTemplates, templatesLoading, setTemplatesLoading,
        loading, saving, handleSaveForm, mediaUploading, handleTemplateMediaUpload, handleCardMediaUpload,
        responses, responsesLoading, previewStep, setPreviewStep, editingFieldId, setEditingFieldId,
        sensors, closestCenter, handleDragEnd, verticalListSortingStrategy, deleteField, updateField, addField,
        showToast, baseUrl, isPremiumFeature, hasAddon, allForms, fetchForms, handleCreateNewForm, handleLoadForm,
        viewMode, setViewMode, pgConfigured
    } = props;
    return (
<>
                        <div className="flex-1 flex flex-col bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-white/5 relative z-10 overflow-hidden shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)] max-w-full">
                            <div className="flex-1 flex overflow-hidden">
                                {/* Left Sidebar for Nodes */}
                                <div className="w-64 bg-slate-50 dark:bg-black/20 border-r border-slate-200 dark:border-white/10 overflow-y-auto p-5 hidden md:block shrink-0">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Form Elements</h3>

                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2"><LayoutList className="w-4 h-4" /> Basic Fields</h4>
                                            <div className="space-y-2">
                                                <button onClick={() => addField('text')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-indigo-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><Type className="w-4 h-4 text-indigo-500" /> Short Text</button>
                                                <button onClick={() => addField('phone')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-green-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><Smartphone className="w-4 h-4 text-green-500" /> Phone Number</button>
                                                <button onClick={() => addField('email')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-blue-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><Mail className="w-4 h-4 text-blue-500" /> Email Address</button>
                                                <button onClick={() => addField('select')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-purple-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><List className="w-4 h-4 text-purple-500" /> Dropdown / Select</button>
                                                <button onClick={() => addField('radio')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-blue-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><ToggleRight className="w-4 h-4 text-blue-500" /> Multiple Choice</button>
                                                <button onClick={() => addField('number')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-orange-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><span className="w-4 h-4 font-bold text-orange-500 text-sm flex items-center">#</span> Number</button>
                                                <button onClick={() => addField('yesno')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-green-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><ToggleRight className="w-4 h-4 text-green-500" /> Yes / No Toggle</button>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2"><Layers className="w-4 h-4" /> Advanced Fields</h4>
                                            <div className="space-y-2">
                                                <button onClick={() => addField('date')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-amber-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><Calendar className="w-4 h-4 text-amber-500" /> Date Picker</button>
                                                <button onClick={() => addField('time')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-amber-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><Clock className="w-4 h-4 text-amber-500" /> Time Picker</button>
                                                <button onClick={() => addField('rating')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-amber-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><Star className="w-4 h-4 text-amber-500" /> Star Rating</button>
                                                <button onClick={() => addField('signature')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-amber-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><PenTool className="w-4 h-4 text-amber-500" /> Signature Pad</button>
                                                <button onClick={() => addField('file')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-rose-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><UploadCloud className="w-4 h-4 text-rose-500" /> File Upload</button>
                                                <button onClick={() => addField('image')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-rose-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><ImageIcon className="w-4 h-4 text-rose-500" /> Image Upload</button>
                                                <button onClick={() => addField('address')} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-dark hover:border-teal-500 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs transition-colors shadow-sm text-left"><MapPinned className="w-4 h-4 text-teal-500" /> Address Block</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Center Canvas */}
                                <div className="flex-1 flex flex-col bg-slate-100/50 dark:bg-[#0B1120] relative overflow-hidden">

                                    {/* TOP SETTINGS BAR (EDGE-TO-EDGE) */}
                                    <div className="shrink-0 bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-white/10 px-4 md:px-6 py-2.5 flex items-stretch gap-0 z-30 overflow-x-auto scrollbar-hide shadow-sm relative">

                                        {/* Layout / Multi-step */}
                                        <div className="flex flex-col items-start justify-center gap-1 pr-6 shrink-0">
                                            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Layout</span>
                                            <div className="flex items-center gap-2">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={activeForm.formLogic?.isMultiStep || false} onChange={e => updateNestedState('formLogic', 'isMultiStep', e.target.checked)} />
                                                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{activeForm.formLogic?.isMultiStep ? 'Multi-Page' : 'Single'}</span>
                                                </label>
                                                {activeForm.formLogic?.isMultiStep && (
                                                    <input type="number" min="1" value={activeForm.formLogic?.fieldsPerPage || 3} onChange={e => updateNestedState('formLogic', 'fieldsPerPage', parseInt(e.target.value) || 1)} className="w-9 h-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded text-center text-[11px] font-mono font-bold outline-none focus:border-indigo-500 text-indigo-600" title="Items per page" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Block Duplicates */}
                                        <div className="flex flex-col items-start justify-center gap-1 px-4 md:px-6 border-l border-slate-200 dark:border-white/10 shrink-0">
                                            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Duplicates</span>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={activeForm.restrictions?.preventDuplicates || false} onChange={e => updateNestedState('restrictions', 'preventDuplicates', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Block</span>
                                            </label>
                                        </div>

                                        {/* Submission Limit */}
                                        <div className="flex flex-col items-start justify-center gap-1 px-4 md:px-6 border-l border-slate-200 dark:border-white/10 shrink-0">
                                            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Max Submissions</span>
                                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded px-2 py-0.5 focus-within:border-indigo-400 transition-colors">
                                                <ShieldAlert className="w-3 h-3 text-slate-400 shrink-0" />
                                                <input type="number" min="1" value={activeForm.restrictions?.maxSubmissions || ''} onChange={e => updateNestedState('restrictions', 'maxSubmissions', e.target.value)} className="bg-transparent border-none outline-none font-mono text-[11px] w-16 placeholder:text-slate-300" placeholder="Unlimited" />
                                            </div>
                                        </div>

                                        {/* Expiry Date */}
                                        <div className="flex flex-col items-start justify-center gap-1 px-4 md:px-6 border-l border-slate-200 dark:border-white/10 shrink-0">
                                            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Expires At</span>
                                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded px-2 py-0.5 focus-within:border-indigo-400 transition-colors">
                                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                <input type="datetime-local" value={activeForm.restrictions?.closeDate || ''} onChange={e => updateNestedState('restrictions', 'closeDate', e.target.value)} className="bg-transparent border-none outline-none font-mono text-[11px] text-slate-600 dark:text-slate-300 w-36" />
                                            </div>
                                        </div>

                                    </div>

                                    {/* SCROLLING CANVAS */}
                                    <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide flex flex-col relative w-full">
                                        <div className="max-w-3xl mx-auto w-full space-y-6 flex-1 pb-16">
                                            <div className="p-4 md:p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 mb-6 flex flex-col md:flex-row gap-6 md:items-center">
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Brand Logo</label>
                                                    <div className="flex gap-2">
                                                        {activeForm.brandConfig?.logoUrl?.startsWith('data:image') ? (
                                                            <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 px-4 py-2 rounded-xl flex items-center justify-between min-w-0">
                                                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-2" title={activeForm.brandConfig?.logoName || 'Local Image Uploaded'}><ImageIcon className="w-4 h-4 shrink-0" /> {activeForm.brandConfig?.logoName || 'Local Image Uploaded'}</span>
                                                                <button onClick={() => { updateNestedState('brandConfig', 'logoUrl', ''); updateNestedState('brandConfig', 'logoName', ''); }} className="text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-black p-1 rounded-full shadow-sm"><Trash2 className="w-3 h-3" /></button>
                                                            </div>
                                                        ) : (
                                                            <input type="text" value={activeForm.brandConfig?.logoUrl || ''} onChange={e => updateNestedState('brandConfig', 'logoUrl', e.target.value)} className="flex-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl focus:border-indigo-500 outline-none text-sm font-mono min-w-0" placeholder="https://... or upload" />
                                                        )}
                                                        <label className="flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border border-indigo-100 dark:border-indigo-800 px-4 py-2 rounded-xl cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors flex items-center gap-2">
                                                            <UploadCloud className="w-4 h-4" />
                                                            <span className="text-sm font-bold hidden sm:inline">Upload</span>
                                                            <input type="file" className="hidden" accept="image/*" onClick={(e) => { e.target.value = null; }} onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    if (file.size > 2 * 1024 * 1024) return showToast('Image must be less than 2MB', 'error');
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        updateNestedState('brandConfig', 'logoUrl', reader.result);
                                                                        updateNestedState('brandConfig', 'logoName', file.name);
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }} />
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="w-full md:w-32">
                                                    <label className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2 block">Theme Color</label>
                                                    <div className="flex gap-3 items-center bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl">
                                                        <input type="color" value={activeForm.brandConfig?.primaryColor || '#4f46e5'} onChange={e => updateNestedState('brandConfig', 'primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0 bg-transparent" />
                                                        <span className="text-xs font-bold uppercase text-slate-500 font-mono">{activeForm.brandConfig?.primaryColor || '#4f46e5'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 focus-within:border-indigo-500 focus-within:ring-4 ring-indigo-500/10 mb-8 shadow-sm">
                                                <input
                                                    type="text"
                                                    value={activeForm.name}
                                                    onChange={e => setActiveForm({ ...activeForm, name: e.target.value })}
                                                    className="w-full bg-transparent text-2xl font-extrabold text-slate-900 dark:text-white outline-none mb-2 placeholder:text-slate-300"
                                                    placeholder="Form Title"
                                                />
                                                <textarea
                                                    value={activeForm.description}
                                                    onChange={e => setActiveForm({ ...activeForm, description: e.target.value })}
                                                    className="w-full bg-transparent text-sm text-slate-500 dark:text-slate-400 outline-none resize-none leading-relaxed"
                                                    placeholder="Enter description criteria..."
                                                    rows={2}
                                                />
                                            </div>

                                            {/* MONETIZATION / PAYMENT CONFIG */}
                                            <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 mb-8 shadow-sm transition-all focus-within:ring-4 ring-green-500/10 focus-within:border-green-500">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <CreditCard className="w-5 h-5 text-green-500" /> Payments & Checkout
                                                    </h3>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked={activeForm.paymentConfig?.requirePayment || false} onChange={e => updateNestedState('paymentConfig', 'requirePayment', e.target.checked)} />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 dark:peer-checked:bg-green-500"></div>
                                                    </label>
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Collect payments before accepting form submissions. Only paid responses will be saved.</p>

                                                {activeForm.paymentConfig?.requirePayment && !pgConfigured && (
                                                    <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-500/20 flex gap-2 items-start">
                                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                        <span>You haven't configured a Payment Gateway (Razorpay/Stripe) in your global Settings. Submissions on this form will be rejected until a Gateway is correctly bound.</span>
                                                    </div>
                                                )}

                                                {activeForm.paymentConfig?.requirePayment && (
                                                    <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-2">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div>
                                                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Payment Gateway</label>
                                                                <select
                                                                    value={activeForm.paymentConfig?.gatewayUsed || 'razorpay'}
                                                                    onChange={e => updateNestedState('paymentConfig', 'gatewayUsed', e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-green-500 text-sm font-bold text-slate-700 dark:text-slate-300"
                                                                >
                                                                    <option value="razorpay">Razorpay</option>
                                                                    <option value="stripe">Stripe</option>
                                                                    <option value="phonepe">PhonePe</option>
                                                                    <option value="cashfree">Cashfree</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Currency</label>
                                                                <select
                                                                    value={activeForm.paymentConfig?.currency || 'INR'}
                                                                    onChange={e => updateNestedState('paymentConfig', 'currency', e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-green-500 text-sm font-bold text-slate-700 dark:text-slate-300"
                                                                >
                                                                    <option value="INR">₹ INR (Indian Rupee)</option>
                                                                    <option value="USD">$ USD (US Dollar)</option>
                                                                    <option value="EUR">€ EUR (Euro)</option>
                                                                    <option value="GBP">£ GBP (British Pound)</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Checkout Amount Type</label>
                                                            <div className="flex gap-3">
                                                                <button
                                                                    onClick={() => updateNestedState('paymentConfig', 'amountType', 'fixed')}
                                                                    className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${(!activeForm.paymentConfig?.amountType || activeForm.paymentConfig?.amountType === 'fixed') ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 shadow-sm' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                                                                >
                                                                    {(!activeForm.paymentConfig?.currency || activeForm.paymentConfig?.currency === 'INR') ? <IndianRupee className="w-4 h-4" /> : activeForm.paymentConfig?.currency === 'EUR' ? <Euro className="w-4 h-4" /> : activeForm.paymentConfig?.currency === 'GBP' ? <PoundSterling className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />} Fixed Amount
                                                                </button>
                                                                <button
                                                                    onClick={() => updateNestedState('paymentConfig', 'amountType', 'dynamic')}
                                                                    className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeForm.paymentConfig?.amountType === 'dynamic' ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 shadow-sm' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                                                                >
                                                                    <TrendingUp className="w-4 h-4" /> Dynamic (Based on Field)
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {(!activeForm.paymentConfig?.amountType || activeForm.paymentConfig?.amountType === 'fixed') ? (
                                                            <div>
                                                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Amount to Charge</label>
                                                                <div className="relative">
                                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                                                                        {(!activeForm.paymentConfig?.currency || activeForm.paymentConfig?.currency === 'INR') ? '₹' : activeForm.paymentConfig?.currency === 'EUR' ? '€' : activeForm.paymentConfig?.currency === 'GBP' ? '£' : '$'}
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={activeForm.paymentConfig?.fixedAmount || ''}
                                                                        onChange={e => updateNestedState('paymentConfig', 'fixedAmount', e.target.value)}
                                                                        placeholder="100.00"
                                                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 outline-none focus:border-green-500 text-sm font-mono text-slate-900 dark:text-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Map Amount to Field</label>
                                                                <select
                                                                    value={activeForm.paymentConfig?.dynamicFieldId || ''}
                                                                    onChange={e => updateNestedState('paymentConfig', 'dynamicFieldId', e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-green-500 text-sm font-bold text-slate-700 dark:text-slate-300"
                                                                >
                                                                    <option value="" disabled>Select a field...</option>
                                                                    {(activeForm.fields || []).filter(f => ['select', 'radio', 'number'].includes(f.type)).map(field => (
                                                                        <option key={field.id} value={field.id}>{field.label || `Unnamed ${field.type}`}</option>
                                                                    ))}
                                                                </select>
                                                                <p className="text-xs text-slate-500 mt-2">
                                                                    Select a dropdown or radio field. You can set explicit prices for each option in the field's editor. For number inputs, the user's input will be charged directly.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setEditingFieldId(null)} onDragEnd={handleDragEnd}>
                                                    <SortableContext items={(activeForm.fields || []).map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                        <div className="space-y-4 relative pb-32">
                                                            {(activeForm.fields || []).map((field) => (
                                                                <DraggableFieldItem
                                                                    key={field.id}
                                                                    field={field}
                                                                    editingFieldId={editingFieldId}
                                                                    setEditingFieldId={setEditingFieldId}
                                                                    deleteField={deleteField}
                                                                    updateField={updateField}
                                                                    isPaymentDynamicField={activeForm.paymentConfig?.amountType === 'dynamic' && activeForm.paymentConfig?.dynamicFieldId === field.id}
                                                                    paymentCurrencySymbol={(!activeForm.paymentConfig?.currency || activeForm.paymentConfig?.currency === 'INR') ? '₹' : activeForm.paymentConfig?.currency === 'EUR' ? '€' : activeForm.paymentConfig?.currency === 'GBP' ? '£' : '$'}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </DndContext>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="hidden lg:flex flex-col w-[450px] max-w-full bg-[#F5F5F7] dark:bg-[#0B1120] relative z-0 items-center justify-center p-4 md:p-8 overflow-y-auto border-l border-slate-300 dark:border-slate-800">
                                    <div className="absolute top-10 flex flex-col items-center">
                                        <div className="px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 border border-green-200 dark:border-green-500/20 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Dynamic Mapping UI
                                        </div>
                                    </div>

                                    <div className="w-[320px] max-w-full h-[650px] bg-black rounded-[3rem] p-3 shadow-2xl relative border-4 border-slate-400 dark:border-slate-800 shadow-slate-900/40">
                                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20 flex justify-center">
                                            <div className="w-12 h-1 bg-[#1C1C1E] mt-2 rounded-full"></div>
                                        </div>

                                        <div className="w-full h-full rounded-[2.5rem] overflow-x-hidden overflow-y-auto scrollbar-hide flex flex-col pt-10 relative bg-[#F2F2F7] text-black">

                                            {activeForm.brandConfig?.logoUrl && (
                                                <div className="px-4 md:px-6 pt-3 flex justify-center pb-0">
                                                    <img src={activeForm.brandConfig.logoUrl} alt="Logo" className="h-14 object-contain" />
                                                </div>
                                            )}

                                            <div className="shrink-0 px-4 md:px-6 py-4 border-b border-black/5 mt-2">
                                                <h1 className="text-xl font-bold tracking-tight" style={{ color: activeForm.brandConfig?.primaryColor || '#000' }}>{activeForm.name || 'Untitled Endpoint'}</h1>
                                            </div>

                                            <div className="p-4 md:p-6 flex-1 space-y-6">
                                                {activeForm.description && (
                                                    <p className="text-sm leading-relaxed text-slate-500">
                                                        {activeForm.description}
                                                    </p>
                                                )}

                                                {/* Multi-step step dots */}
                                                {activeForm.formLogic?.isMultiStep && (() => {
                                                    const perPage = activeForm.formLogic?.fieldsPerPage || 3;
                                                    const totalSteps = Math.ceil((activeForm.fields || []).length / perPage) || 1;
                                                    return (
                                                        <div className="flex items-center justify-center gap-2 py-1">
                                                            {Array.from({ length: totalSteps }).map((_, i) => (
                                                                <button key={i} onClick={() => setPreviewStep(i)}
                                                                    className={`rounded-full transition-all ${i === previewStep ? 'w-5 h-2' : 'w-2 h-2'}`}
                                                                    style={{ backgroundColor: i === previewStep ? (activeForm.brandConfig?.primaryColor || '#4f46e5') : '#d1d5db' }}
                                                                />
                                                            ))}
                                                        </div>
                                                    );
                                                })()}

                                                <div className="space-y-5">
                                                    {(() => {
                                                        const allFields = activeForm.fields || [];
                                                        const isMulti = activeForm.formLogic?.isMultiStep;
                                                        const perPage = activeForm.formLogic?.fieldsPerPage || 3;
                                                        const step = Math.min(previewStep, Math.max(0, Math.ceil(allFields.length / perPage) - 1));
                                                        const visibleFields = isMulti
                                                            ? allFields.slice(step * perPage, step * perPage + perPage)
                                                            : allFields;
                                                            
                                                        const needsExplicitContact = !allFields.some(f => f.type === 'phone' || f.type === 'email') && activeForm.restrictions?.preventDuplicates;

                                                        return (
                                                            <>
                                                                {needsExplicitContact && step === 0 && (
                                                                    <div className="space-y-2 mb-5">
                                                                        <label className="block text-xs font-bold uppercase tracking-widest px-1 text-slate-500">
                                                                            WhatsApp / Contact Number <span className="text-red-500">*</span>
                                                                        </label>
                                                                        <div className="flex w-full rounded-xl bg-white border border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.03)] max-w-full overflow-hidden text-sm font-medium">
                                                                            <div className="bg-slate-50 border-r border-slate-100 px-3 py-3 flex items-center justify-center text-slate-600 font-bold tracking-tight">+91</div>
                                                                            <div className="px-3 py-3 text-slate-400 w-full">+15551234567</div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {visibleFields.map((field) => (
                                                            <div key={field.id} className="space-y-2">
                                                                <label className="block text-xs font-bold uppercase tracking-widest px-1 text-slate-500">
                                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                                </label>
                                                                {field.type === 'text' && (
                                                                    <div className="w-full px-4 py-3 rounded-xl bg-white border border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.03)] max-w-full text-sm text-slate-400 font-medium">Input mapped area</div>
                                                                )}
                                                                {field.type === 'phone' && (
                                                                    <div className="flex w-full rounded-xl bg-white border border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.03)] max-w-full overflow-hidden text-sm font-medium">
                                                                        <div className="bg-slate-50 border-r border-slate-100 px-3 py-3 flex items-center justify-center text-slate-600 font-bold tracking-tight">+91</div>
                                                                        <div className="px-3 py-3 text-slate-400 w-full">1234567890</div>
                                                                    </div>
                                                                )}
                                                                {field.type === 'email' && (
                                                                    <div className="w-full px-4 py-3 rounded-xl bg-white border border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.03)] max-w-full text-sm text-slate-400 font-medium">name@example.com</div>
                                                                )}
                                                                {field.type === 'number' && (
                                                                    <div className="w-full px-4 py-3 rounded-xl bg-white border border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.03)] max-w-full text-sm text-slate-400 font-medium font-mono">0 {field.minValue !== undefined && field.maxValue !== undefined ? `(${field.minValue}-${field.maxValue})` : ''}</div>
                                                                )}
                                                                {field.type === 'yesno' && (
                                                                    <div className="flex gap-3">
                                                                        <div className="flex-1 py-3 rounded-xl bg-white border-2 border-transparent shadow-sm text-sm font-bold text-slate-400 flex justify-center items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Yes</div>
                                                                        <div className="flex-1 py-3 rounded-xl bg-white border-2 border-transparent shadow-sm text-sm font-bold text-slate-400 flex justify-center items-center gap-1.5"><X className="w-4 h-4 text-red-500" /> No</div>
                                                                    </div>
                                                                )}
                                                                {field.type === 'image' && (
                                                                    <div className="w-full py-6 rounded-xl border-2 border-dashed border-slate-200 bg-white/50 text-slate-400 flex flex-col items-center justify-center gap-2 shadow-sm">
                                                                        <ImageIcon className="w-5 h-5" />
                                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload Image {field.acceptTypes ? `(${field.acceptTypes})` : '(PNG, JPG)'}</span>
                                                                    </div>
                                                                )}
                                                                {field.type === 'address' && (
                                                                    <div className="space-y-2">
                                                                        <div className="w-full px-4 py-2.5 rounded-xl bg-white shadow-sm text-xs text-slate-400">Street Address</div>
                                                                        <div className="flex gap-2">
                                                                            <div className="flex-[7] px-4 py-2.5 rounded-xl bg-white shadow-sm text-xs text-slate-400">City</div>
                                                                            <div className="flex-[3] px-4 py-2.5 rounded-xl bg-white shadow-sm text-xs text-slate-400">ZIP</div>
                                                                        </div>
                                                                        <div className="w-full px-4 py-2.5 rounded-xl bg-white shadow-sm text-xs text-slate-400">State / Country</div>
                                                                    </div>
                                                                )}
                                                                {field.type === 'select' && (
                                                                    <div className="w-full px-4 py-3 rounded-xl bg-white border border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.03)] max-w-full text-sm flex items-center justify-between text-slate-400 font-medium">
                                                                        Dropdown Array UI <ChevronDown width={16} />
                                                                    </div>
                                                                )}
                                                                {field.type === 'radio' && (
                                                                    <div className="space-y-3 pt-1">
                                                                        {(field.options || ['Option 1']).map((opt, i) => (
                                                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.03)] max-w-full">
                                                                                <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                                                                                <span className="text-sm font-medium">{opt}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {field.type === 'date' && (
                                                                    <div className="w-full px-4 py-3 rounded-xl bg-white shadow-sm text-sm text-slate-400 flex gap-2"><Calendar className="w-4 h-4" /> YYYY-MM-DD</div>
                                                                )}
                                                                {field.type === 'time' && (
                                                                    <input type="time" disabled defaultValue="10:30" className="w-full px-4 py-3 rounded-xl bg-white shadow-sm text-sm text-slate-400 opacity-80 pointer-events-none" />
                                                                )}
                                                                {field.type === 'file' && (
                                                                    <div className="w-full py-6 rounded-xl border-2 border-dashed border-slate-200 bg-white/50 text-slate-400 flex flex-col items-center justify-center gap-2 shadow-sm">
                                                                        <UploadCloud className="w-5 h-5" />
                                                                        <span className="text-[10px] font-bold uppercase tracking-widest">File Upload Base</span>
                                                                    </div>
                                                                )}
                                                                {field.type === 'rating' && (
                                                                    <div className="flex gap-1 p-2 bg-white rounded-xl shadow-sm justify-center">
                                                                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-6 h-6 text-slate-200" />)}
                                                                    </div>
                                                                )}
                                                                {field.type === 'signature' && (
                                                                    <div className="w-full h-24 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-300 flex-col gap-2">
                                                                        <PenTool className="w-6 h-6" /> <span className="text-xs font-bold uppercase">Sign Canvas</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            <div className="p-4 md:p-6 pt-0 mt-auto shrink-0 pb-10">
                                                {activeForm.formLogic?.isMultiStep ? (() => {
                                                    const perPage = activeForm.formLogic?.fieldsPerPage || 3;
                                                    const totalSteps = Math.ceil((activeForm.fields || []).length / perPage) || 1;
                                                    const isLast = previewStep >= totalSteps - 1;
                                                    return (
                                                        <div className="flex gap-2">
                                                            {previewStep > 0 && (
                                                                <button onClick={() => setPreviewStep(s => s - 1)} className="flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all flex justify-center items-center gap-2" style={{ borderColor: activeForm.brandConfig?.primaryColor || '#4f46e5', color: activeForm.brandConfig?.primaryColor || '#4f46e5' }}>
                                                                    <ArrowLeft className="w-4 h-4" /> Back
                                                                </button>
                                                            )}
                                                            <button onClick={() => !isLast && setPreviewStep(s => s + 1)} className="flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-xl flex justify-center items-center gap-2" style={{ backgroundColor: activeForm.brandConfig?.primaryColor || '#4f46e5' }}>
                                                                {isLast ? <><Send width={14} /> Submit</> : <>Next <ArrowRight className="w-4 h-4" /></>}
                                                            </button>
                                                        </div>
                                                    );
                                                })() : (
                                                    <button disabled className="w-full py-4 rounded-xl text-white font-bold text-sm shadow-xl flex justify-center items-center gap-2 transition-transform" style={{ backgroundColor: activeForm.brandConfig?.primaryColor || '#4f46e5', boxShadow: `0 10px 25px -5px ${activeForm.brandConfig?.primaryColor}60` }}>
                                                        <Send width={16} /> Submit
                                                    </button>
                                                )}

                                                <div className="text-center mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                                                    <Zap className="w-3 h-3" /> Powered by App
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                
    );
};


const AutomationsView = (props) => {
    const {
        activeForm, setActiveForm, updateNestedState, templates, setTemplates, templatesLoading, setTemplatesLoading,
        loading, saving, handleSaveForm, mediaUploading, handleTemplateMediaUpload, handleCardMediaUpload,
        responses, responsesLoading, previewStep, setPreviewStep, editingFieldId, setEditingFieldId,
        sensors, closestCenter, handleDragEnd, verticalListSortingStrategy, deleteField, updateField, addField,
        showToast, baseUrl, isPremiumFeature, hasAddon, allForms, fetchForms, handleCreateNewForm, handleLoadForm,
        viewMode, setViewMode
    } = props;
    const selTmplName = activeForm.automation?.whatsappTemplate?.name;
    const selTmpl = templates.find(t => t.name === selTmplName);
    
    const vars = [];
    if (selTmpl) {
        if (selTmpl.components) {
            selTmpl.components.forEach(c => {
                if (c.text) {
                    const matches = c.text.match(new RegExp('\\{\\{(\\d+)\\}\\}', 'g'));
                    if (matches) matches.forEach(m => {
                        const num = m.replace(new RegExp('[{}]', 'g'), '');
                        if (!vars.includes(num)) vars.push(num);
                    });
                }
            });
        } else if (selTmpl.content) {
            const matches = selTmpl.content.match(new RegExp('\\{\\{(\\d+)\\}\\}', 'g'));
            if (matches) matches.forEach(m => {
                const num = m.replace(new RegExp('[{}]', 'g'), '');
                if (!vars.includes(num)) vars.push(num);
            });
        }
        vars.sort((a,b) => parseInt(a) - parseInt(b));
    }

    let previewText = selTmpl ? (selTmpl.content || selTmpl.components?.find(c => c.type === 'BODY')?.text || '') : '';
    if (selTmpl && activeForm.automation?.whatsappTemplate?.mappings) {
        const mappings = activeForm.automation.whatsappTemplate.mappings;
        Object.keys(mappings).forEach(key => {
            if (!key.startsWith('body_')) return;
            const varNum = key.replace('body_', '');
            const mapData = mappings[key];
            const mapObj = mapData && typeof mapData === 'object' ? mapData : { type: 'form_field', value: mapData };
            
            let replacement = '';
            if (mapObj.type === 'custom') {
                replacement = mapObj.value || `[Custom ${varNum}]`;
            } else {
                const field = activeForm.fields?.find(f => f.id === mapObj.value);
                replacement = field ? `[${field.label}]` : '';
            }
            if (replacement) {
                previewText = previewText.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), replacement);
            }
        });
    }
    
    const headerComp = selTmpl?.components?.find(c => c.type === 'HEADER' && ['IMAGE','VIDEO','DOCUMENT'].includes(c.format));
    const hasMediaHeader = !!headerComp;
    const btnComp = selTmpl?.components?.find(c => c.type === 'BUTTONS');
    const dynamicButtons = btnComp?.buttons?.map((b, i) => ({...b, index: i})).filter(b => b.type === 'URL' || b.type === 'QUICK_REPLY') || [];
    const hasDynamicButtons = dynamicButtons.length > 0;
    
    const carouselComp = selTmpl?.components?.find(c => c.type === 'CAROUSEL');
    const isCarousel = selTmpl?.archetype === 'carousel' || !!carouselComp;
    const cardsArr = selTmpl?.cards || carouselComp?.cards || [];

    return (
<>
<div className="flex-1 flex overflow-hidden bg-[#F5F5F7] dark:bg-[#0B1120]">
                            
                            {/* Left Pane - Configuration */}
                            <div className="flex-1 border-r border-slate-200 dark:border-white/10 overflow-y-auto p-4 md:p-8 bg-white dark:bg-surface-dark shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)] max-w-full relative z-10">
                                <div className="space-y-6 max-w-3xl mx-auto">
                                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-6 mb-6">
                                        <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 text-green-500 flex justify-center items-center rounded-2xl shadow-sm">
                                            <Zap className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold dark:text-white">WhatsApp Auto-Responder</h2>
                                            <p className="text-sm text-slate-500">Trigger a Meta-approved template immediately upon submission.</p>
                                        </div>
                                        <div className="ml-auto">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={activeForm.automation?.whatsappEnabled || false} onChange={e => {
                                                    const auto = activeForm.automation || {};
                                                    updateNestedState('automation', 'whatsappEnabled', e.target.checked);
                                                }} />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {activeForm.automation?.whatsappEnabled && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Select Meta Template</label>
                                                {templatesLoading ? (
                                                    <div className="p-4 border border-slate-200 dark:border-white/10 rounded-xl flex gap-3 text-slate-400 items-center"><Loader2 className="w-5 h-5 animate-spin" /> Fetching workspace templates...</div>
                                                ) : templates.length === 0 ? (
                                                    <div className="p-4 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-bold flex items-center justify-between">
                                                        <span>No Approved Templates Found in your workspace.</span>
                                                        <a href="/templates" className="px-3 py-1.5 bg-amber-200 dark:bg-amber-700/50 rounded-lg text-xs font-bold hover:bg-amber-300 transition-colors">Create Template</a>
                                                    </div>
                                                ) : (
                                                    <select 
                                                        value={selTmplName || ''} 
                                                        onChange={e => {
                                                            const tname = e.target.value;
                                                            const tmpl = templates.find(t => t.name === tname);
                                                            updateNestedState('automation', 'whatsappTemplate', {
                                                                name: tname,
                                                                language: tmpl?.language || 'en_US',
                                                                mappings: {}
                                                            });
                                                        }} 
                                                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 dark:bg-white/5 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 font-bold"
                                                    >
                                                        <option value="">-- Choose an approved template --</option>
                                                        {templates.map(t => (
                                                            <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>

                                            {selTmplName && (hasMediaHeader || vars.length > 0 || hasDynamicButtons || isCarousel) && (
                                                <div className="border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 rounded-2xl p-4 md:p-6">
                                                    
                                                    {hasMediaHeader && (
                                                        <div className="mb-8">
                                                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2 flex gap-2 items-center"><ImageIcon className="w-4 h-4 text-sky-500" /> Header Media Upload</h3>
                                                            <p className="text-xs text-slate-500 mb-4">This template requires a {headerComp?.format || 'media'} file to be attached to the header.</p>
                                                            <label className="flex items-center gap-4 bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 cursor-pointer hover:border-sky-400 hover:shadow-sky-500/10 transition-all border-dashed">
                                                                <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/20 text-sky-500 rounded-xl flex items-center justify-center">
                                                                    {mediaUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                                                                </div>
                                                                <div className="flex-1">
                                                                    {activeForm.automation?.whatsappTemplate?.headerFileName ? (
                                                                        <p className="font-bold text-sm text-sky-600 dark:text-sky-400">✓ {activeForm.automation.whatsappTemplate.headerFileName}</p>
                                                                    ) : (
                                                                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Choose {headerComp?.format?.toLowerCase() || 'file'}...</p>
                                                                    )}
                                                                </div>
                                                                <input type="file" className="hidden" accept={headerComp?.format === 'VIDEO' ? 'video/*' : 'image/*'} onChange={e => handleTemplateMediaUpload(e.target.files[0])} />
                                                            </label>
                                                        </div>
                                                    )}

                                                    {vars.length > 0 && (
                                                        <div className={hasMediaHeader ? "pt-6 border-t border-slate-100 dark:border-white/5" : ""}>
                                                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex gap-2 items-center"><List className="w-4 h-4 text-indigo-500" /> Variable Bindings</h3>
                                                            <p className="text-xs text-slate-500 mb-6">Map the dynamic <code>{`{{variables}}`}</code> from your WhatsApp template to specific answers from this form.</p>
                                                            
                                                            <div className="space-y-4">
                                                                {vars.map(v => (
                                                                    <div key={v} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-white dark:bg-surface-dark p-3 rounded-xl shadow-sm border border-slate-200 dark:border-white/10">
                                                                        <div className="shrink-0 w-12 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-mono font-bold rounded-lg flex items-center justify-center">
                                                                            {`{${v}}`}
                                                                        </div>
                                                                        <div className="hidden sm:block font-bold text-slate-400 dark:text-slate-500">→</div>
                                                                        <div className="flex-1 flex gap-2">
                                                                            {(() => {
                                                                                const mappingVal = activeForm.automation?.whatsappTemplate?.mappings?.[`body_${v}`];
                                                                                const mapObj = mappingVal && typeof mappingVal === 'object' ? mappingVal : { type: 'form_field', value: mappingVal || '' };
                                                                                return (
                                                                                    <>
                                                                                        <select
                                                                                            value={mapObj.type}
                                                                                            onChange={e => {
                                                                                                const mappings = { ...(activeForm.automation?.whatsappTemplate?.mappings || {}) };
                                                                                                mappings[`body_${v}`] = { type: e.target.value, value: '' };
                                                                                                updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, mappings });
                                                                                            }}
                                                                                            className="w-1/3 p-2 outline-none dark:bg-surface-dark text-slate-700 dark:text-slate-300 text-xs font-bold border-r border-slate-200 dark:border-white/10"
                                                                                        >
                                                                                            <option value="form_field">Form Field</option>
                                                                                            <option value="custom">Custom Text</option>
                                                                                        </select>
                                                                                        {mapObj.type === 'custom' ? (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={mapObj.value}
                                                                                                onChange={e => {
                                                                                                    const mappings = { ...(activeForm.automation?.whatsappTemplate?.mappings || {}) };
                                                                                                    mappings[`body_${v}`] = { type: 'custom', value: e.target.value };
                                                                                                    updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, mappings });
                                                                                                }}
                                                                                                placeholder="Static text value..."
                                                                                                className="flex-1 p-2 bg-transparent outline-none dark:text-white text-sm border border-slate-200 dark:border-white/10 rounded-lg"
                                                                                            />
                                                                                        ) : (
                                                                                            <select
                                                                                                value={mapObj.value}
                                                                                                onChange={e => {
                                                                                                    const mappings = { ...(activeForm.automation?.whatsappTemplate?.mappings || {}) };
                                                                                                    mappings[`body_${v}`] = { type: 'form_field', value: e.target.value };
                                                                                                    updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, mappings });
                                                                                                }}
                                                                                                className="flex-1 p-2 outline-none dark:bg-surface-dark text-slate-700 dark:text-slate-300 text-sm font-bold cursor-pointer rounded-lg border border-slate-200 dark:border-white/10"
                                                                                            >
                                                                                                <option value="">-- Select form field --</option>
                                                                                                {(activeForm.fields || []).filter(f => !['file', 'image', 'signature'].includes(f.type)).map(f => (
                                                                                                    <option key={f.id} value={f.id}>{f.label} ({f.type})</option>
                                                                                                ))}
                                                                                            </select>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {hasDynamicButtons && (
                                                        <div className={(hasMediaHeader || vars.length > 0) ? "pt-6 border-t border-slate-100 dark:border-white/5 mt-8" : ""}>
                                                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex gap-2 items-center"><LinkIcon className="w-4 h-4 text-violet-500" /> Button Bindings</h3>
                                                            <p className="text-xs text-slate-500 mb-6">Bind dynamic URL parameters or payload text for interactive WhatsApp buttons.</p>
                                                            
                                                            <div className="space-y-4">
                                                                {dynamicButtons.map(btn => (
                                                                    <div key={btn.index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-white dark:bg-surface-dark p-3 rounded-xl shadow-sm border border-slate-200 dark:border-white/10">
                                                                        <div className="shrink-0 px-3 h-10 bg-violet-50 dark:bg-violet-900/20 text-violet-600 font-bold rounded-lg flex space-x-2 items-center justify-center text-[10px] uppercase">
                                                                            <span>{btn.type === 'URL' ? '🔗' : '⚡'}</span>
                                                                            <span className="truncate max-w-[80px] max-w-full">{btn.text}</span>
                                                                        </div>
                                                                        <div className="hidden sm:block font-bold text-slate-400 dark:text-slate-500">→</div>
                                                                        <div className="flex-1 flex gap-2">
                                                                            {(() => {
                                                                                const mappingVal = activeForm.automation?.whatsappTemplate?.mappings?.[`button_${btn.index}`];
                                                                                const mapObj = mappingVal && typeof mappingVal === 'object' ? mappingVal : { type: 'form_field', value: mappingVal || '' };
                                                                                return (
                                                                                    <>
                                                                                        <select
                                                                                            value={mapObj.type}
                                                                                            onChange={e => {
                                                                                                const mappings = { ...(activeForm.automation?.whatsappTemplate?.mappings || {}) };
                                                                                                mappings[`button_${btn.index}`] = { type: e.target.value, value: '' };
                                                                                                updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, mappings });
                                                                                            }}
                                                                                            className="w-1/3 p-2 outline-none dark:bg-surface-dark text-slate-700 dark:text-slate-300 text-xs font-bold border-r border-slate-200 dark:border-white/10"
                                                                                        >
                                                                                            <option value="form_field">Form Field</option>
                                                                                            <option value="custom">Custom Text</option>
                                                                                        </select>
                                                                                        {mapObj.type === 'custom' ? (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={mapObj.value}
                                                                                                onChange={e => {
                                                                                                    const mappings = { ...(activeForm.automation?.whatsappTemplate?.mappings || {}) };
                                                                                                    mappings[`button_${btn.index}`] = { type: 'custom', value: e.target.value };
                                                                                                    updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, mappings });
                                                                                                }}
                                                                                                placeholder={btn.type === 'URL' ? (btn.url || "https://...") : "Payload text..."}
                                                                                                className="flex-1 p-2 bg-transparent outline-none dark:text-white text-sm border border-slate-200 dark:border-white/10 rounded-lg"
                                                                                            />
                                                                                        ) : (
                                                                                            <select
                                                                                                value={mapObj.value}
                                                                                                onChange={e => {
                                                                                                    const mappings = { ...(activeForm.automation?.whatsappTemplate?.mappings || {}) };
                                                                                                    mappings[`button_${btn.index}`] = { type: 'form_field', value: e.target.value };
                                                                                                    updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, mappings });
                                                                                                }}
                                                                                                className="flex-1 p-2 outline-none dark:bg-surface-dark text-slate-700 dark:text-slate-300 text-sm font-bold cursor-pointer rounded-lg border border-slate-200 dark:border-white/10"
                                                                                            >
                                                                                                <option value="">-- Select form field --</option>
                                                                                                {(activeForm.fields || []).filter(f => !['file', 'image', 'signature'].includes(f.type)).map(f => (
                                                                                                    <option key={f.id} value={f.id}>{f.label} ({f.type})</option>
                                                                                                ))}
                                                                                            </select>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isCarousel && cardsArr.length > 0 && (
                                                        <div className={(hasMediaHeader || vars.length > 0 || hasDynamicButtons) ? "pt-6 border-t border-slate-100 dark:border-white/5 mt-8" : ""}>
                                                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex gap-2 items-center"><List className="w-4 h-4 text-emerald-500" /> Carousel Cards Integration</h3>
                                                            <p className="text-xs text-slate-500 mb-6">Bind images, variables, and buttons exclusively for each card iterating through the carousel.</p>
                                                            
                                                            <div
                                                                className="flex gap-4 overflow-x-auto pb-6 carousel-scrollbar"
                                                                onWheel={e => { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; }}
                                                            >
                                                                {cardsArr.map((card, cIdx) => {
                                                                    const cardHasMedia = card.headerType && ['IMAGE','VIDEO'].includes(card.headerType);
                                                                    const cardBodyVars = [...new Set((card.content?.match(new RegExp('\\{\\{(\\d+)\\}\\}', 'g')) || []))].sort();
                                                                    const cardBtns = (card.buttons || []).map((b, i) => ({...b, index: i})).filter(b => b.type === 'URL' || b.type === 'QUICK_REPLY');
                                                                    
                                                                    return (
                                                                        <div key={cIdx} className="w-[320px] max-w-full shrink-0 border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-black/20 overflow-hidden flex flex-col shadow-sm">
                                                                            <div className="p-3 bg-slate-50 dark:bg-white/5 font-bold text-xs text-slate-500 border-b border-slate-100 dark:border-white/5">
                                                                                Card {cIdx + 1}
                                                                            </div>
                                                                            <div className="p-4 space-y-6 flex-1 max-h-[450px] overflow-y-auto custom-scrollbar">
                                                                                
                                                                                {cardHasMedia && (
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">{card.headerType === 'VIDEO' ? '🎬 Card Video' : 'ðŸ–¼ï¸ Card Image'}<span className="text-red-400 ml-1">*</span></label>
                                                                                        <label className="flex items-center justify-center h-24 bg-slate-50 dark:bg-black/20 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all group">
                                                                                            {mediaUploading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> : (
                                                                                                activeForm.automation?.whatsappTemplate?.cards?.[cIdx]?.headerFileName ? (
                                                                                                    <div className="flex flex-col items-center p-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                                                                        <UploadCloud className="w-5 h-5 mb-1" />
                                                                                                        <span className="truncate max-w-[200px] max-w-full">{activeForm.automation.whatsappTemplate.cards[cIdx].headerFileName}</span>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="flex flex-col items-center gap-1.5 text-slate-400 group-hover:text-emerald-500 transition-colors">
                                                                                                        <UploadCloud className="w-5 h-5" />
                                                                                                        <span className="text-xs font-bold tracking-wide">Upload {card.headerType?.toLowerCase()}</span>
                                                                                                    </div>
                                                                                                )
                                                                                            )}
                                                                                            <input type="file" className="hidden" accept={card.headerType === 'VIDEO' ? 'video/*' : 'image/*'} onChange={e => handleCardMediaUpload(cIdx, e.target.files[0])} />
                                                                                        </label>
                                                                                    </div>
                                                                                )}

                                                                                {cardBodyVars.length > 0 && (
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Card Variables</label>
                                                                                        <div className="space-y-3">
                                                                                            {cardBodyVars.map(v => {
                                                                                                const mappingVal = activeForm.automation?.whatsappTemplate?.cards?.[cIdx]?.[`body_${v}`];
                                                                                                const mapObj = mappingVal && typeof mappingVal === 'object' ? mappingVal : { type: 'form_field', value: mappingVal || '' };
                                                                                                return (
                                                                                                    <div key={v} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                                                                                                        <span className="text-[10px] text-indigo-500 font-mono font-bold">{`{{${v}}}`} Binding</span>
                                                                                                        <div className="flex gap-2">
                                                                                                            <select value={mapObj.type} onChange={e => {
                                                                                                                const cardsList = [...(activeForm.automation?.whatsappTemplate?.cards || [])];
                                                                                                                while(cardsList.length <= cIdx) cardsList.push({});
                                                                                                                cardsList[cIdx] = { ...cardsList[cIdx], [`body_${v}`]: { type: e.target.value, value: '' } };
                                                                                                                updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, cards: cardsList });
                                                                                                            }} className="w-1/3 p-1.5 text-[11px] bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg outline-none font-bold text-slate-600 dark:text-slate-300">
                                                                                                                <option value="form_field">Field</option>
                                                                                                                <option value="custom">Static</option>
                                                                                                            </select>
                                                                                                            {mapObj.type === 'custom' ? (
                                                                                                                <input type="text" value={mapObj.value} onChange={e => {
                                                                                                                    const cardsList = [...(activeForm.automation?.whatsappTemplate?.cards || [])];
                                                                                                                    while(cardsList.length <= cIdx) cardsList.push({});
                                                                                                                    cardsList[cIdx] = { ...cardsList[cIdx], [`body_${v}`]: { type: 'custom', value: e.target.value } };
                                                                                                                    updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, cards: cardsList });
                                                                                                                }} placeholder="Value..." className="flex-1 p-1.5 text-[11px] bg-transparent border border-slate-200 dark:border-white/10 rounded-lg outline-none dark:text-white focus:border-indigo-500" />
                                                                                                            ) : (
                                                                                                                <select value={mapObj.value} onChange={e => {
                                                                                                                    const cardsList = [...(activeForm.automation?.whatsappTemplate?.cards || [])];
                                                                                                                    while(cardsList.length <= cIdx) cardsList.push({});
                                                                                                                    cardsList[cIdx] = { ...cardsList[cIdx], [`body_${v}`]: { type: 'form_field', value: e.target.value } };
                                                                                                                    updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, cards: cardsList });
                                                                                                                }} className="flex-1 p-1.5 text-[11px] bg-transparent border border-slate-200 dark:border-white/10 rounded-lg outline-none dark:text-white truncate focus:border-indigo-500 font-bold">
                                                                                                                    <option value="">-- Dropdown --</option>
                                                                                                                    {(activeForm.fields || []).filter(f => !['file', 'image', 'signature'].includes(f.type)).map(f => (
                                                                                                                        <option key={f.id} value={f.id}>{f.label}</option>
                                                                                                                    ))}
                                                                                                                </select>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {cardBtns.length > 0 && (
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Card Buttons</label>
                                                                                        <div className="space-y-3">
                                                                                            {cardBtns.map(btn => {
                                                                                                const currentVal = activeForm.automation?.whatsappTemplate?.cards?.[cIdx]?.[`button_${btn.index}`];
                                                                                                const storedValue = typeof currentVal === 'object' ? currentVal?.value : (currentVal || '');
                                                                                                return (
                                                                                                    <div key={btn.index} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                                                                                                        <span className="text-[10px] text-violet-500 font-bold truncate block">⚡ {btn.text} <span className="text-slate-400 font-normal">({btn.type})</span></span>
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            value={storedValue}
                                                                                                            onChange={e => {
                                                                                                                const cardsList = [...(activeForm.automation?.whatsappTemplate?.cards || [])];
                                                                                                                while (cardsList.length <= cIdx) cardsList.push({});
                                                                                                                cardsList[cIdx] = { ...cardsList[cIdx], [`button_${btn.index}`]: { type: 'custom', value: e.target.value } };
                                                                                                                updateNestedState('automation', 'whatsappTemplate', { ...activeForm.automation?.whatsappTemplate, cards: cardsList });
                                                                                                            }}
                                                                                                            placeholder={btn.type === 'URL' ? 'URL suffix / override...' : 'Payload text...'}
                                                                                                            className="w-full p-1.5 text-[11px] bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg outline-none dark:text-white focus:border-violet-500"
                                                                                                        />
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-black/20 p-4 md:p-6 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0">
                                                <LinkIcon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Webhook URL</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">We POST the submission payload to this URL when someone completes the form.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/60 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
                                            <LinkIcon className="w-4 h-4 text-blue-400 shrink-0" />
                                            <input
                                                type="text"
                                                value={activeForm.automation?.webhookUrl || ''}
                                                onChange={e => updateNestedState('automation', 'webhookUrl', e.target.value)}
                                                className="bg-transparent border-none outline-none font-mono text-sm w-full text-blue-800 dark:text-blue-300 placeholder:text-blue-400/50"
                                                placeholder="https://hooks.zapier.com/..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Pane - Phone Mockup Preview (same style as Form Designing tab) */}
                            <div className="hidden lg:flex flex-col w-[450px] max-w-full bg-[#F5F5F7] dark:bg-[#0B1120] relative z-0 items-center justify-center p-4 md:p-8 overflow-y-auto border-l border-slate-300 dark:border-slate-800 shrink-0">
                                <div className="absolute top-10 flex flex-col items-center">
                                    <div className="px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 border border-green-200 dark:border-green-500/20 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Live Preview
                                    </div>
                                </div>

                                {/* Phone frame — identical to form design tab */}
                                <div className="w-[320px] max-w-full h-[650px] bg-black rounded-[3rem] p-3 shadow-2xl relative border-4 border-slate-400 dark:border-slate-800 shadow-slate-900/40">
                                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20 flex justify-center">
                                        <div className="w-12 h-1 bg-[#1C1C1E] mt-2 rounded-full"></div>
                                    </div>

                                    {/* Screen */}
                                    <div className="w-full h-full rounded-[2.5rem] overflow-hidden flex flex-col bg-[#EFEAE2] dark:bg-[#0B141A]">
                                        {activeForm.automation?.whatsappEnabled && selTmpl ? (
                                            <>
                                                {/* Status bar */}
                                                <div className="h-14 bg-[#075e54] dark:bg-[#1f2c34] flex items-center px-3 gap-2 text-white shrink-0 pt-3 shadow-sm">
                                                    <ChevronLeft className="w-4 h-4 opacity-80 shrink-0" />
                                                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                                                        {activeForm.brandConfig?.logoUrl ? <img src={activeForm.brandConfig.logoUrl} className="w-full h-full object-cover" alt="" /> : <span className="font-bold text-[9px]">{activeForm.name?.substring(0,2).toUpperCase() || 'CX'}</span>}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-[11px] truncate">{activeForm.name || 'Business'}</span>
                                                        <span className="text-[9px] opacity-70">Official Business Account</span>
                                                    </div>
                                                </div>

                                                {/* Chat canvas */}
                                                <div className="flex-1 p-3 overflow-y-auto bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center flex flex-col">
                                                    <div className="flex justify-center mb-3 mt-2">
                                                        <span className="bg-[#E1F3FB] dark:bg-[#1f2c34] text-slate-600 dark:text-slate-300 text-[9px] px-2 py-1 rounded-lg shadow-sm">Today</span>
                                                    </div>

                                                    {/* Bubble */}
                                                    <div className="bg-white dark:bg-[#202c33] rounded-xl rounded-tl-sm shadow-sm relative mr-auto overflow-hidden mb-2" style={{ maxWidth: isCarousel ? '98%' : '88%' }}>
                                                        <div className="absolute top-0 -left-1.5 w-2 h-3 bg-white dark:bg-[#202c33]" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>

                                                        {!isCarousel && hasMediaHeader && (() => {
                                                            const fmt = headerComp.format;
                                                            const localUrl = activeForm.automation?.whatsappTemplate?.headerLocalUrl;
                                                            const fileName = activeForm.automation?.whatsappTemplate?.headerFileName;
                                                            if (fmt === 'IMAGE') return <div className="w-full h-28 bg-slate-200 overflow-hidden">{localUrl ? <img src={localUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-30 text-2xl"><ImageIcon className="w-8 h-8" /></div>}</div>;
                                                            if (fmt === 'VIDEO') return <div className="w-full h-28 bg-black overflow-hidden flex items-center justify-center">{localUrl ? <video src={localUrl} className="w-full h-full object-cover" muted /> : <div className="opacity-30 text-2xl"><Play className="w-8 h-8" /></div>}</div>;
                                                            if (fmt === 'DOCUMENT') return <div className="mx-2 mt-2 bg-slate-100 rounded-lg p-2 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500 mr-1" /><span className="text-[10px] truncate">{fileName || 'document.pdf'}</span></div>;
                                                            return null;
                                                        })()}

                                                        {!isCarousel && (
                                                            <div className="text-[11px] text-slate-800 dark:text-gray-100 px-2 py-1.5 leading-relaxed whitespace-pre-wrap">
                                                                {(() => {
                                                                    const raw = selTmpl?.components?.find(c => c.type === 'BODY')?.text || selTmpl?.content || '';
                                                                    const mappings = activeForm.automation?.whatsappTemplate?.mappings || {};
                                                                    let text = raw;
                                                                    Object.keys(mappings).filter(k => k.startsWith('body_')).forEach(key => {
                                                                        const varNum = key.replace('body_', '');
                                                                        const mapData = mappings[key];
                                                                        const mapObj = mapData && typeof mapData === 'object' ? mapData : { type: 'form_field', value: mapData };
                                                                        const repl = mapObj.type === 'custom' ? (mapObj.value || `{{${varNum}}}`) : (activeForm.fields?.find(f => f.id === mapObj.value)?.label ? `[${activeForm.fields.find(f => f.id === mapObj.value).label}]` : `{{${varNum}}}`);
                                                                        text = text.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), repl);
                                                                    });
                                                                    return text || <span className="opacity-30 italic text-[10px]">No body text</span>;
                                                                })()}
                                                            </div>
                                                        )}

                                                        {isCarousel && (
                                                            <>
                                                                {(selTmpl?.content || selTmpl?.components?.find(c => c.type === 'BODY')?.text) && (
                                                                    <div className="text-[11px] px-2 pt-2 pb-1 text-slate-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                                                                        {selTmpl?.content || selTmpl?.components?.find(c => c.type === 'BODY')?.text}
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-1.5 overflow-x-auto px-2 pb-2 pt-1 carousel-scrollbar" onWheel={e => { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; }}>
                                                                    {cardsArr.map((card, ci) => {
                                                                        const url = activeForm.automation?.whatsappTemplate?.cards?.[ci]?.headerLocalUrl;
                                                                        return (
                                                                            <div key={ci} className="shrink-0 w-[120px] max-w-full bg-slate-50 dark:bg-[#2a3942] rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col">
                                                                                {card.headerType === 'IMAGE' && <div className="w-full h-[70px] bg-slate-200 dark:bg-slate-700 overflow-hidden">{url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-30 text-xl"><ImageIcon className="w-6 h-6" /></div>}</div>}
                                                                                {card.headerType === 'VIDEO' && <div className="w-full h-[70px] bg-black overflow-hidden flex items-center justify-center">{url ? <video src={url} className="w-full h-full object-cover" muted /> : <div className="opacity-30 text-xl"><Play className="w-6 h-6" /></div>}</div>}
                                                                                {card.content && <div className="text-[9px] px-1.5 py-1 leading-snug text-slate-700 dark:text-slate-300" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{card.content}</div>}
                                                                                {card.buttons?.length > 0 && <div className="mt-auto border-t border-slate-200 dark:border-white/10">{card.buttons.map((btn, bi) => <div key={bi} className="px-1 py-1 text-[9px] text-[#00a884] font-bold text-center border-b border-slate-100 dark:border-white/5 last:border-0 truncate flex items-center justify-center gap-0.5">{btn.type === 'URL' && '↗'}{btn.text}</div>)}</div>}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </>
                                                        )}

                                                        <div className="flex justify-end px-2 pb-1.5 opacity-50">
                                                            <span className="text-[9px] text-slate-500 dark:text-slate-400">{new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span>
                                                        </div>
                                                        {!isCarousel && selTmpl.components?.find(c => c.type === 'BUTTONS')?.buttons?.map((btn, i) => (
                                                            <div key={i} className="border-t border-slate-100 dark:border-white/5 py-1.5 flex items-center justify-center gap-1 text-[#00a884] font-bold text-[10px]">
                                                                {btn.type === 'URL' && '↗'}{btn.text}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-auto h-2"></div>
                                                </div>

                                                {/* Fake input footer */}
                                                <div className="h-12 bg-[#F0F2F5] dark:bg-[#202c33] shrink-0 flex items-center px-3 gap-2">
                                                    <span className="text-sm opacity-60">😊</span>
                                                    <div className="flex-1 h-8 bg-white dark:bg-[#2a3942] rounded-full flex items-center px-3"><span className="text-[10px] text-slate-400">Message</span></div>
                                                    <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center"><Send className="w-3 h-3 text-white ml-0.5" /></div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-35 p-4 md:p-6">
                                                <Zap className="w-10 h-10 text-slate-400" />
                                                <p className="text-[10px] text-slate-500 text-center font-bold leading-relaxed">Enable WhatsApp Auto-Responder &amp; select a template to preview</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    
</>
    );
};


const ResponsesView = (props) => {
    const {
        activeForm, setActiveForm, updateNestedState, templates, setTemplates, templatesLoading, setTemplatesLoading,
        loading, saving, handleSaveForm, mediaUploading, handleTemplateMediaUpload, handleCardMediaUpload,
        responses, responsesLoading, previewStep, setPreviewStep, editingFieldId, setEditingFieldId,
        sensors, closestCenter, handleDragEnd, verticalListSortingStrategy, deleteField, updateField, addField,
        showToast, baseUrl, isPremiumFeature, hasAddon, allForms, fetchForms, handleCreateNewForm, handleLoadForm,
        viewMode, setViewMode
    } = props;
    return (
<div className="flex-1 p-4 md:p-8 overflow-y-auto w-full items-start justify-start flex flex-col relative">
                        <div className="max-w-7xl mx-auto w-full space-y-8">

                            {/* Rich Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm">
                                    <div className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Total Views</div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Eye className="w-6 h-6 text-indigo-500" /> {activeForm.views || 0}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm">
                                    <div className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Total Submitted</div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Database className="w-6 h-6 text-green-500" /> {responses.length}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm">
                                    <div className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Conversion Rate</div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <TrendingUp className="w-6 h-6 text-amber-500" />
                                        {activeForm.views > 0 ? Math.round(responses.length / activeForm.views * 100) : 0}%
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm">
                                    <div className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Drop-offs</div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <LogOut className="w-6 h-6 text-red-500" />
                                        {Math.max(0, (activeForm.views || 0) - responses.length)}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm">
                                    <div className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Today's Leads</div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Clock className="w-6 h-6 text-blue-500" />
                                        {responses.filter(r => new Date(r.createdAt) >= new Date().setHours(0, 0, 0, 0)).length}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Submissions Table */}
                            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px]">
                                {/* Responses toolbar */}
                                <div className="shrink-0 px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4 bg-slate-50 dark:bg-black/30">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Database className="w-4 h-4 text-indigo-500" />
                                            Submissions Database
                                            <span className="ml-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold">{responses.length}</span>
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1">All responses collected for this form</p>
                                    </div>
                                    <button onClick={() => {
                                        if (!responses.length) return;
                                        const fields = activeForm.fields || [];
                                        const headers = ['#', 'Contact', ...fields.map(f => f.label), 'Submitted At', 'Status'];
                                        const rows = responses.map((r, i) => [
                                            i + 1,
                                            r.contactNumber || '—',
                                            ...fields.map(f => {
                                                const v = r.answers?.[f.id];
                                                return Array.isArray(v) ? v.join(', ') : (typeof v === 'object' && v !== null ? Object.values(v).join(', ') : (v || '—'));
                                            }),
                                            new Date(r.createdAt).toLocaleString(),
                                            r.status || 'new'
                                        ]);
                                        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).split('"').join('""')}"`).join(',')).join('\n');
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                                        a.download = `${activeForm.name || 'responses'}.csv`; a.click();
                                    }} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                                        <TrendingUp className="w-4 h-4" /> Export CSV
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="flex-1 overflow-auto">
                                    {responsesLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                        </div>
                                    ) : responses.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-12">
                                            <Database className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                                            <h3 className="font-bold text-slate-500 dark:text-slate-400 mb-1">No submissions yet</h3>
                                            <p className="text-sm text-slate-400">Once users submit your form, entries will appear here.</p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm border-collapse">
                                            <thead className="sticky top-0 z-10">
                                                <tr className="bg-slate-50 dark:bg-black/30">
                                                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-white/10 w-10">#</th>
                                                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-white/10">Contact</th>
                                                    {(activeForm.fields || []).map(f => (
                                                        <th key={f.id} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-white/10">{f.label}</th>
                                                    ))}
                                                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-white/10 whitespace-nowrap">Submitted At</th>
                                                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-white/10">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {responses.map((r, i) => (
                                                    <tr key={r.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                                                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{r.contactNumber || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                                                        {(activeForm.fields || []).map(f => {
                                                            const v = r.answers?.[f.id];
                                                            let display = '—';
                                                            if (Array.isArray(v)) display = v.join(', ');
                                                            else if (typeof v === 'object' && v !== null) display = Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(' · ');
                                                            else if (v) display = String(v);
                                                            const isImg = typeof v === 'string' && v.startsWith('data:image');
                                                            return (
                                                                <td key={f.id} className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[180px] max-w-full truncate">
                                                                    {isImg ? <img src={v} alt="upload" className="h-8 w-14 object-cover rounded" /> : display}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${r.status === 'new' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                                : r.status === 'contacted' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                                                    : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                                }`}>{r.status || 'new'}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                
    );
};

export default WhatsAppFormsBuilder;
