import { useState, useEffect } from 'react';
import axios from 'axios';
import { useUI } from '../../context/UIContext';
import {
    FileText, User, ChevronDown, Clock, Send, Signal, Wifi, Battery,
    CheckCheck, Check, ArrowLeft, Calendar, Zap, Sparkles,
    Image as ImageIcon, Link2, Phone, CreditCard, Layers
} from 'lucide-react';

// ─── Carousel Card Config Panel ───────────────────────────────────────────────
const CarouselCardConfig = ({ card, cardIndex, cardParams, onCardParamChange, onCardImageChange }) => {
    const variables = card.content ? (card.content.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')) : [];

    return (
        <div className="bg-slate-50 dark:bg-background-dark/60 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            {/* Card Header */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-3 bg-white dark:bg-surface-dark">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                    <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="text-slate-900 dark:text-white font-bold text-sm">Card {cardIndex + 1}</h4>
                {card.content && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs">— {card.content.substring(0, 60)}</p>
                )}
            </div>

            <div className="p-5 space-y-5">
                {/* Image Upload for card header */}
                {(card.headerType === 'IMAGE' || card.headerType === 'VIDEO') && (
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-white mb-2 uppercase tracking-wider">
                            {card.headerType === 'IMAGE' ? '🖼️ Card Image' : '🎬 Card Video'}
                            <span className="text-red-400 ml-1">*</span>
                        </label>
                        <div className="relative flex items-center gap-3">
                            <label
                                htmlFor={`card-img-${cardIndex}`}
                                className="flex-1 flex items-center gap-3 bg-white dark:bg-background-dark border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-3 cursor-pointer hover:border-primary/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-all group"
                            >
                                <div className="bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                    <ImageIcon className="w-4 h-4 text-blue-500" />
                                </div>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {cardParams[`__file_${cardIndex}`]?.name
                                        ? <span className="text-green-600 dark:text-green-400 font-medium">✓ {cardParams[`__file_${cardIndex}`].name}</span>
                                        : 'Click to upload image / video'}
                                </span>
                                <input
                                    id={`card-img-${cardIndex}`}
                                    type="file"
                                    accept={card.headerType === 'IMAGE' ? 'image/*' : 'video/*'}
                                    className="hidden"
                                    onChange={(e) => onCardImageChange(cardIndex, e.target.files[0])}
                                />
                            </label>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">This media will be uploaded to Meta before sending.</p>
                    </div>
                )}

                {/* Body Variables */}
                {variables.length > 0 && (
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-white mb-3 uppercase tracking-wider">📝 Body Variables</label>
                        <div className="space-y-3">
                            {variables.map((varName, vIdx) => (
                                <div key={vIdx} className="flex items-center gap-3">
                                    <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 whitespace-nowrap">{`{{${varName}}}`}</span>
                                    <input
                                        className="flex-1 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        placeholder={`Value for {{${varName}}}`}
                                        value={cardParams[`card_${cardIndex}_var_${varName}`] || ''}
                                        onChange={(e) => onCardParamChange(cardIndex, `var_${varName}`, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Button URL overrides */}
                {card.buttons && card.buttons.filter(b => b.type === 'URL').length > 0 && (
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-white mb-3 uppercase tracking-wider">🔗 Button URLs</label>
                        <div className="space-y-3">
                            {card.buttons.filter(b => b.type === 'URL').map((btn, bIdx) => (
                                <div key={bIdx} className="flex items-center gap-3">
                                    <div className="bg-green-500/10 p-2 rounded-lg flex-shrink-0">
                                        <Link2 className="w-4 h-4 text-green-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">"{btn.text}" URL</p>
                                        <input
                                            className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                            placeholder={btn.url || 'https://...'}
                                            value={cardParams[`card_${cardIndex}_btn_${bIdx}_url`] || btn.url || ''}
                                            onChange={(e) => onCardParamChange(cardIndex, `btn_${bIdx}_url`, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {variables.length === 0 && (!card.buttons || card.buttons.filter(b => b.type === 'URL').length === 0) && (!card.headerType || card.headerType === 'NONE') && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">No configurable inputs for this card.</p>
                )}
            </div>
        </div>
    );
};

// ─── Main CampaignStep3 ────────────────────────────────────────────────────────
const CampaignStep3 = ({ data, updateData, onBack, onSubmit }) => {
    const { showModal, settings, publicSettings } = useUI();
    const businessName = settings?.appName || "Business Name";
    const profilePicUrl = settings?.whatsappProfile?.profilePictureUrl || null;
    const initial = businessName.charAt(0).toUpperCase();
    const [sending, setSending] = useState(false);

    const [scheduleType, setScheduleType] = useState('now');
    const [scheduledDate, setScheduledDate] = useState('');

    // For carousel card images & params (keyed by `card_${i}_var_x` or `card_${i}_btn_x_url`)
    const [cardParams, setCardParams] = useState({});
    // Actual File objects for upload, keyed by card index
    const [cardFiles, setCardFiles] = useState({});

    const selectedTemplate = data.template || {};
    const isCarousel = selectedTemplate.archetype === 'carousel' && Array.isArray(selectedTemplate.cards) && selectedTemplate.cards.length > 0;

    // Extract variables from template content
    const variables = selectedTemplate.content ? (selectedTemplate.content.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')) : [];

    // --- Dynamic Cost Calculation State ---
    const [totalRecipientsCount, setTotalRecipientsCount] = useState(0);
    const [calculatingCost, setCalculatingCost] = useState(false);
    const manualCount = (data.manualRecipients || []).length;

    // Meta WhatsApp Business API Approximate Pricing (Per Message, by Currency - Updated for 2025/2026)
    const PRICING_RATES = {
        INR: {
            MARKETING: 0.88,
            UTILITY: 0.11,
            AUTHENTICATION: 0.11,
            SERVICE: 0.00,
            DEFAULT: 0.88
        },
        USD: {
            MARKETING: 0.025,
            UTILITY: 0.015,
            AUTHENTICATION: 0.0135,
            SERVICE: 0.00,
            DEFAULT: 0.025
        },
        EUR: {
            MARKETING: 0.06,
            UTILITY: 0.01,
            AUTHENTICATION: 0.01,
            SERVICE: 0.00,
            DEFAULT: 0.06
        },
        GBP: {
            MARKETING: 0.038,
            UTILITY: 0.01,
            AUTHENTICATION: 0.01,
            SERVICE: 0.00,
            DEFAULT: 0.038
        }
    };

    // Use effect to precisely count targets instead of guestimating
    useEffect(() => {
        const calculateRecipients = async () => {
            setCalculatingCost(true);
            try {
                let dbCount = 0;
                if (data.recipients?.includes('all')) {
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/contacts/campaign-summary`, {
                        headers: { }
                    });
                    dbCount = parseInt(res.data.totalContacts, 10) || 0;
                } else if (data.recipients?.length > 0) {
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/contacts/campaign-summary`, {
                        headers: { }
                    });
                    let sum = 0;
                    for (const groupId of data.recipients) {
                        const group = res.data.groups?.find(g => g.id === groupId);
                        if (group) sum += parseInt(group.count, 10);
                    }
                    dbCount = sum;
                }

                setTotalRecipientsCount(dbCount + manualCount);
            } catch (err) {
                console.error("Failed to calculate recipients count:", err);
            } finally {
                setCalculatingCost(false);
            }
        };

        calculateRecipients();
    }, [data.recipients, manualCount]);

    // Determine Global Currency
    const currencyCode = publicSettings?.currency || settings?.currency || 'USD';
    const currencyMap = { USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$' };
    const currencySymbol = currencyMap[currencyCode] || currencyCode || '$';

    const activeRates = PRICING_RATES[currencyCode] || PRICING_RATES.USD;
    const templateCategory = selectedTemplate?.category?.toUpperCase() || 'DEFAULT';
    // Meta default varies by category, default to MARKETING if unknown since it is the most common.
    const costPerMessage = activeRates[templateCategory] || activeRates.MARKETING || activeRates.DEFAULT;
    const estCostNum = totalRecipientsCount * costPerMessage;

    const estCost = `~ ${currencySymbol}${estCostNum.toFixed(2)}`;
    const totalEst = `${totalRecipientsCount} Contact${totalRecipientsCount !== 1 ? 's' : ''}`;

    const handleParamChange = (variable, value) => {
        const newParams = { ...data.params, [variable]: value };
        updateData({ params: newParams });
    };

    const handleCardParamChange = (cardIndex, key, value) => {
        setCardParams(prev => ({ ...prev, [`card_${cardIndex}_${key}`]: value }));
    };

    const handleCardImageChange = (cardIndex, file) => {
        if (file) {
            setCardFiles(prev => ({ ...prev, [cardIndex]: file }));
            setCardParams(prev => ({ ...prev, [`__file_${cardIndex}`]: { name: file.name } }));
        }
    };

    const getPreviewText = () => {
        let text = selectedTemplate.content || '';
        variables.forEach(v => {
            const val = data.params?.[v] || `{{${v}}}`;
            text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), val);
        });
        return text;
    };

    const uploadMedia = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/templates/upload-message-media`, fd, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            }
        });
        // Return both mediaId (for Meta API) and localUrl (for inbox image display)
        return { mediaId: res.data.mediaId, localUrl: res.data.localUrl };
    };

    const handleSend = async () => {
        setSending(true);
        try {
            if (scheduleType === 'later') {
                if (!scheduledDate) throw new Error('Please select a date and time for the scheduled campaign.');
                if (new Date(scheduledDate) <= new Date()) throw new Error('Scheduled date must be in the future.');
            }

            let contactIds = [];
            let targetGroups = [];
            if (data.recipients?.includes('all')) {
                contactIds = 'all';
            } else if (data.recipients?.length > 0) {
                targetGroups = data.recipients;
            }

            const manualRecipients = data.manualRecipients || [];
            if (contactIds.length === 0 && contactIds !== 'all' && targetGroups.length === 0 && manualRecipients.length === 0) {
                throw new Error('Please select at least one recipient group or enter manual recipients.');
            }

            // --- Handle Carousel card media uploads ---
            let resolvedCardParams = { ...cardParams };
            if (isCarousel) {
                // Validation: Ensure all required media for cards are uploaded before proceeding
                for (let i = 0; i < selectedTemplate.cards.length; i++) {
                    const card = selectedTemplate.cards[i];
                    if (card.headerType === 'IMAGE' || card.headerType === 'VIDEO') {
                        if (!cardFiles[i]) {
                            throw new Error(`Media is missing for Card ${i + 1}. Please upload all required images/videos for the carousel before sending.`);
                        }
                    }
                }

                for (let i = 0; i < selectedTemplate.cards.length; i++) {
                    const file = cardFiles[i];
                    if (file) {
                        showModal({ type: 'info', title: 'Uploading', message: `Uploading media for Card ${i + 1}...` });
                        const { mediaId, localUrl } = await uploadMedia(file);
                        resolvedCardParams[`card_${i}_headerMediaId`] = mediaId;
                        if (localUrl) resolvedCardParams[`card_${i}_headerLocalUrl`] = localUrl;
                    }
                }
            }

            const payload = {
                templateId: data.templateId,
                contactIds,
                targetGroups,
                manualRecipients,
                params: { ...data.params, ...resolvedCardParams },
                campaignName: data.name,
                description: data.description,
                tag: data.tag,
                scheduledFor: scheduleType === 'later' ? scheduledDate : null
            };
            await onSubmit(payload);
        } catch (err) {
            console.error('Campaign send error:', err);
            showModal({
                type: 'error',
                title: 'Error',
                message: err.response?.data?.error || err.message || 'Failed to prepare campaign.',
                confirmText: 'Close'
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 h-full fade-in pb-24 xl:pb-0">
            {/* Step Header */}
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 dark:border-surface-dark pb-6 transition-colors duration-300">
                <div className="w-full md:w-auto z-10">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Customize &amp; Schedule</h1>
                    <p className="text-slate-500 dark:text-text-secondary mt-1">Fill in dynamic parameters and schedule your message.</p>
                </div>

                {/* Stepper */}
                <div className="w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 flex justify-center z-0">
                    <div className="bg-white/80 dark:bg-surface-dark/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl flex items-center gap-1 shadow-sm dark:shadow-2xl ring-1 ring-slate-100 dark:ring-white/5 transition-colors duration-300">
                        {['Info', 'Template', 'Schedule'].map((label, i) => (
                            <div key={i} className="flex items-center">
                                {i > 0 && <div className="w-8 h-[2px] bg-primary/50 rounded-full mx-1" />}
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${i < 2 ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-primary shadow-lg shadow-primary/20 ring-1 ring-primary/50'}`}>
                                    <span className={`flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${i < 2 ? 'bg-primary text-white' : 'bg-white text-primary'}`}>
                                        {i < 2 ? <Check className="w-3 h-3 stroke-[3]" /> : '3'}
                                    </span>
                                    <span className={`text-xs font-bold hidden sm:block ${i === 2 ? 'text-white' : ''}`}>{label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 flex flex-col gap-8">
                    {/* Selected Template Info */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm transition-colors duration-300">
                        <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg">Selected Template</h3>
                                    <p className="text-xs text-slate-500 dark:text-text-secondary">
                                        {selectedTemplate.name || 'No Template Selected'}
                                        {isCarousel && <span className="ml-2 text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium border border-purple-500/20">Carousel</span>}
                                        {selectedTemplate.status === 'APPROVED' && <span className="ml-2 text-green-500 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium border border-green-500/20">Approved</span>}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onBack} className="text-xs font-bold text-primary hover:text-blue-400 underline decoration-primary/30 underline-offset-4 transition-colors">
                                Change Template
                            </button>
                        </div>
                        <div className="p-4 md:p-6 bg-slate-50 dark:bg-background-dark/50">
                            <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed font-mono bg-white dark:bg-background-dark p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 whitespace-pre-wrap">
                                {selectedTemplate.content || 'Please select a template in the previous step.'}
                            </p>
                        </div>
                    </div>

                    {/* ── Standard Body Parameters (non-carousel or master body) ── */}
                    {variables.length > 0 && (
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm transition-colors duration-300">
                            <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                    <User className="w-5 h-5" />
                                </div>
                                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Body Parameters</h3>
                            </div>
                            <div className="p-4 md:p-6 space-y-6">
                                {variables.map((variable, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-slate-100 dark:border-white/5 pb-5 last:border-0 last:pb-0">
                                        <div className="md:col-span-4">
                                            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">Variable {'{{'}{variable}{'}}'}</label>
                                            <span className="text-xs text-slate-500 dark:text-text-secondary block">Replace with...</span>
                                        </div>
                                        <div className="md:col-span-8 flex gap-3">
                                            <select className="bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-3 text-slate-900 dark:text-white text-sm focus:border-primary outline-none w-1/3 cursor-pointer">
                                                <option value="static">Static Text</option>
                                                <option value="column">Contact Column</option>
                                            </select>
                                            <input
                                                className="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                type="text"
                                                placeholder={`Value for {{${variable}}}`}
                                                value={data.params?.[variable] || ''}
                                                onChange={(e) => handleParamChange(variable, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Carousel Card Configuration ── */}
                    {isCarousel && (
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm transition-colors duration-300">
                            <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                                <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 p-2 rounded-lg">
                                    <CreditCard className="w-5 h-5 text-pink-400" />
                                </div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg">Carousel Cards</h3>
                                    <p className="text-xs text-slate-500 dark:text-text-secondary">Configure each card's image, variables, and buttons</p>
                                </div>
                                <span className="ml-auto text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-full">
                                    {selectedTemplate.cards.length} Cards
                                </span>
                            </div>
                            <div className="p-4 md:p-6 space-y-5">
                                {selectedTemplate.cards.map((card, idx) => (
                                    <CarouselCardConfig
                                        key={idx}
                                        card={card}
                                        cardIndex={idx}
                                        cardParams={cardParams}
                                        onCardParamChange={handleCardParamChange}
                                        onCardImageChange={handleCardImageChange}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Standard template — show "no variables" placeholder */}
                    {!isCarousel && variables.length === 0 && (
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm transition-colors duration-300">
                            <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><User className="w-5 h-5" /></div>
                                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Template Parameters</h3>
                            </div>
                            <div className="p-4 md:p-8 text-center text-slate-500 dark:text-text-secondary">
                                No dynamic variables found in this template.
                            </div>
                        </div>
                    )}

                    {/* Scheduling */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-visible shadow-sm transition-colors duration-300 ring-1 ring-slate-100 dark:ring-white/5">
                        <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-orange-400 to-red-500 p-2 rounded-lg text-white shadow-lg shadow-orange-500/20">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg">Scheduling</h3>
                                    <p className="text-xs text-slate-500 dark:text-text-secondary">When should this campaign be sent?</p>
                                </div>
                            </div>
                            <div className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-1 rounded-md">
                                UTC {new Date().getTimezoneOffset() / -60 > 0 ? '+' : ''}{new Date().getTimezoneOffset() / -60}
                            </div>
                        </div>

                        <div className="p-4 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <label
                                    className={`relative flex items-center gap-4 cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 ${scheduleType === 'now' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-xl shadow-indigo-500/10' : 'border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 bg-slate-50 dark:bg-white/5'}`}
                                    onClick={() => setScheduleType('now')}
                                >
                                    <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-colors ${scheduleType === 'now' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {scheduleType === 'now' && <div className="size-2.5 rounded-full bg-indigo-500 animate-in zoom-in duration-200" />}
                                    </div>
                                    <div>
                                        <span className={`block text-lg font-bold transition-colors ${scheduleType === 'now' ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>Send Immediately</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Start processing campaign right now</span>
                                    </div>
                                    {scheduleType === 'now' && <div className="absolute top-4 right-4 text-indigo-500 animate-in fade-in"><Zap className="w-5 h-5" /></div>}
                                </label>

                                <label
                                    className={`relative flex items-center gap-4 cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 ${scheduleType === 'later' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-xl shadow-indigo-500/10' : 'border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 bg-slate-50 dark:bg-white/5'}`}
                                    onClick={() => setScheduleType('later')}
                                >
                                    <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-colors ${scheduleType === 'later' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {scheduleType === 'later' && <div className="size-2.5 rounded-full bg-indigo-500 animate-in zoom-in duration-200" />}
                                    </div>
                                    <div>
                                        <span className={`block text-lg font-bold transition-colors ${scheduleType === 'later' ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>Schedule for Later</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Pick a future date &amp; time</span>
                                    </div>
                                    {scheduleType === 'later' && <div className="absolute top-4 right-4 text-indigo-500 animate-in fade-in"><Calendar className="w-5 h-5" /></div>}
                                </label>
                            </div>

                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${scheduleType === 'later' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 md:p-6 border border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-1 w-full">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Select Date &amp; Time</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                                            <input
                                                type="datetime-local"
                                                value={scheduledDate}
                                                onChange={(e) => setScheduledDate(e.target.value)}
                                                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                                className="w-full bg-white dark:bg-background-dark border-2 border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 md:max-w-xs leading-relaxed bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-center md:text-left">
                                        <p className="font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1.5 justify-center md:justify-start">
                                            <Sparkles className="w-3 h-3" /> Note
                                        </p>
                                        Campaign will be queued and automatically processed at the selected time.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Preview & Actions */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4 md:p-6 sticky top-6 shadow-lg transition-colors duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider text-slate-500 dark:text-text-secondary">Message Preview</h3>
                        </div>

                        <div className="bg-slate-50 dark:bg-[#0b141a] rounded-[2.5rem] border-[8px] border-slate-800 dark:border-[#1f2c34] p-0 relative h-[500px] overflow-hidden shadow-2xl flex flex-col mx-auto w-[260px] shrink-0 ring-1 ring-slate-900/10 dark:ring-white/10 transition-colors duration-300">
                            {/* Dynamic Island */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 dark:bg-[#1f2c34] rounded-b-2xl z-20"></div>
                            
                            {/* StatusBar */}
                            <div className="flex justify-between items-center text-[10px] text-slate-800 dark:text-gray-400 mb-2 px-4 shrink-0 pt-3 z-10 bg-[#f0f2f5] dark:bg-[#202c33]">
                                <span className="font-semibold">9:41</span>
                                <div className="flex gap-1.5 items-center">
                                    <Signal className="w-3 h-3" />
                                    <Wifi className="w-3 h-3" />
                                    <Battery className="w-3 h-3" />
                                </div>
                            </div>

                            {/* Chat Header */}
                            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-2 flex items-center gap-2.5 mb-0 shrink-0 shadow-sm z-10">
                                <ArrowLeft className="w-4 h-4 text-[#00a884]" />
                                <div className="size-8 rounded-full bg-[#00a884] flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden">
                                    {profilePicUrl ? <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" /> : initial}
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-slate-900 dark:text-white text-[13px] font-semibold leading-none">{businessName}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-text-secondary leading-none mt-1">Official Business</p>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="space-y-3 px-3 py-4 overflow-y-auto flex-1 custom-scrollbar relative bg-[#efeae2] dark:bg-[#0b141a]">
                                <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                                
                                <div className="flex justify-center relative z-10">
                                    <span className="bg-white/90 dark:bg-[#182229]/90 backdrop-blur-sm text-slate-500 dark:text-gray-400 text-[10px] px-3 py-1 rounded-lg shadow-sm">Today</span>
                                </div>

                                {isCarousel ? (
                                    <div className="relative z-10 mt-3">
                                        {/* Carousel preview card */}
                                        <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-none p-2 w-[90%] shadow-sm mb-3 relative">
                                            <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-2 text-white dark:text-[#202c33] fill-current">
                                                <path d="M1.533,3.568L8,12.193V1H2.812C1.042,1,0.474,2.156,1.533,3.568z"></path>
                                            </svg>
                                            <p className="text-slate-800 dark:text-[#e9edef] text-[12px] leading-snug">{selectedTemplate.content}</p>
                                            <span className="text-[9px] text-slate-400 dark:text-gray-400 block text-right mt-1 font-medium">10:30 AM</span>
                                        </div>
                                        {/* Carousel cards strip */}
                                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                            {selectedTemplate.cards.map((card, idx) => (
                                                <div key={idx} className="flex-shrink-0 w-36 bg-white dark:bg-[#202c33] rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col">
                                                    <div className="h-20 bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center relative">
                                                        <ImageIcon className="w-6 h-6 text-white/50" />
                                                    </div>
                                                    <div className="p-2 flex flex-col flex-1">
                                                        <p className="text-[11px] font-medium text-slate-800 dark:text-[#e9edef] leading-snug line-clamp-2">{card.content}</p>
                                                        {card.buttons?.[0] && (
                                                            <div className="mt-auto pt-2">
                                                                <div className="bg-[#f0f2f5] dark:bg-[#2a3942] text-[#00a884] dark:text-[#53bdeb] text-[10px] font-bold text-center px-2 py-1.5 rounded-lg">
                                                                    {card.buttons[0].text}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-none p-1.5 w-[90%] relative shadow-sm mt-3">
                                        <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-2 text-white dark:text-[#202c33] fill-current">
                                            <path d="M1.533,3.568L8,12.193V1H2.812C1.042,1,0.474,2.156,1.533,3.568z"></path>
                                        </svg>
                                        {(selectedTemplate.type === 'IMAGE' || selectedTemplate.headerType === 'IMAGE') && (
                                            <div className="w-full aspect-video bg-black/5 rounded-xl overflow-hidden mb-2">
                                                <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400" alt="Header" />
                                            </div>
                                        )}
                                        <div className="px-1.5 pb-1 pt-0.5">
                                            <p className="text-slate-800 dark:text-[#e9edef] text-[13px] leading-snug whitespace-pre-wrap">
                                                {getPreviewText() || 'No content'}
                                            </p>
                                            <div className="flex justify-end items-center gap-1 mt-1">
                                                <span className="text-[9px] text-slate-400 dark:text-[#8696a0] font-medium">10:30 AM</span>
                                                <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                                            </div>
                                        </div>
                                        
                                        {/* Standard Buttons Preview */}
                                        {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                                            <div className="border-t border-slate-100 dark:border-white/5 mt-1.5 mx-1.5">
                                                {selectedTemplate.buttons.map((btn, idx) => (
                                                    <div key={idx} className="py-2 text-[#00a884] dark:text-[#53bdeb] font-semibold text-[12px] flex justify-center items-center gap-1.5 border-b last:border-0 border-slate-100 dark:border-white/5">
                                                        {btn.type === 'URL' ? <Link2 className="w-3.5 h-3.5 opacity-70" /> 
                                                        : btn.type === 'PHONE_NUMBER' ? <Phone className="w-3.5 h-3.5 opacity-70" /> 
                                                        : btn.type === 'COPY_CODE' ? <Zap className="w-3.5 h-3.5 opacity-70 text-amber-500" />
                                                        : <span className="opacity-70 font-bold scale-[1.2]">↲</span>}
                                                        {btn.text || btn.type}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-text-secondary bg-slate-50 dark:bg-background-dark p-4 rounded-xl border border-slate-200 dark:border-white/5">
                                <div className="flex flex-col">
                                    <span>Target Audience</span>
                                    <strong className="text-slate-900 dark:text-white text-sm">
                                        {calculatingCost ? 'Calculating...' : totalEst}
                                    </strong>
                                </div>
                                <div className="text-right">
                                    <span>Est. Cost ({selectedTemplate?.category || 'MIXED'})</span>
                                    <div className="text-slate-900 dark:text-white font-bold text-sm">
                                        {calculatingCost ? '...' : estCost}
                                    </div>
                                    <span className="text-[9px] text-slate-400">@ {currencySymbol}{costPerMessage}/msg</span>
                                </div>
                            </div>
                            <div className="hidden xl:flex flex-col gap-4">
                                <button
                                    onClick={handleSend}
                                    disabled={sending}
                                    className="w-full py-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" />
                                    {sending ? 'Processing...' : 'Send Campaign'}
                                </button>
                                <button
                                    onClick={onBack}
                                    className="w-full py-3 bg-transparent border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Action Bar */}
            <div className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-white/10 p-4 pb-safe flex items-center justify-between gap-3 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                <button
                    onClick={onBack}
                    className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-[2] py-3 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <Send className="w-4 h-4" />
                    {sending ? 'Processing...' : 'Send'}
                </button>
            </div>
        </div>
    );
};

export default CampaignStep3;
