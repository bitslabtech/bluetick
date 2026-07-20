import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useUI } from '../../context/UIContext';
import {
    FileText, User, ChevronDown, Clock, Send, Signal, Wifi, Battery,
    CheckCheck, Check, ArrowLeft, Calendar, Zap, Sparkles,
    Image as ImageIcon, Link2, ExternalLink, Phone, CreditCard, Layers, AlertTriangle, Users, Type, Film, FileIcon, XCircle
} from 'lucide-react';
import MediaPickerModal, { MIME_PRESETS } from '../MediaPickerModal';

// ─── Carousel Card Config Panel ───────────────────────────────────────────────
const CarouselCardConfig = ({ card, cardIndex, cardParams, onCardParamChange, onCardImageChange, hasMediaError, validationErrors = {}, cardRef }) => {
    const variables = card.content ? (card.content.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')) : [];

    return (
        <div ref={cardRef} className={`rounded-2xl border-2 overflow-hidden transition-colors ${
            hasMediaError
                ? 'border-red-400 dark:border-red-500 shadow-lg shadow-red-500/10'
                : 'border-slate-200 dark:border-white/10'
        } bg-slate-50 dark:bg-background-dark/60`}>
            {/* Card Header */}
            <div className={`px-5 py-3 border-b flex items-center gap-3 ${
                hasMediaError
                    ? 'border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/10'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark'
            }`}>
                <div className={`p-2 rounded-lg ${ hasMediaError ? 'bg-red-500/20' : 'bg-purple-500/20' }`}>
                    <Layers className={`w-4 h-4 ${ hasMediaError ? 'text-red-400' : 'text-purple-400' }`} />
                </div>
                <h4 className="text-slate-900 dark:text-white font-bold text-sm">Card {cardIndex + 1}</h4>
                {validationErrors[`card_${cardIndex}`] && (
                    <span className="ml-auto flex items-center gap-1 text-xs font-bold text-red-500 dark:text-red-400">
                        <XCircle className="w-3.5 h-3.5" /> Action required
                    </span>
                )}
                {card.content && !validationErrors[`card_${cardIndex}`] && (
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
                            <button
                                type="button"
                                onClick={() => onCardImageChange(cardIndex, card.headerType)}
                                className={`flex-1 flex items-center gap-3 border-2 rounded-xl p-3 cursor-pointer transition-all group text-left ${
                                    hasMediaError
                                        ? 'bg-red-50 dark:bg-red-900/10 border-red-400 dark:border-red-500 hover:border-red-500'
                                        : 'bg-white dark:bg-background-dark border-dashed border-slate-200 dark:border-white/10 hover:border-primary/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/10'
                                }`}
                            >
                                <div className={`p-2 rounded-lg transition-colors ${
                                    hasMediaError ? 'bg-red-500/10 group-hover:bg-red-500/20' : 'bg-blue-500/10 group-hover:bg-blue-500/20'
                                }`}>
                                    <ImageIcon className={`w-4 h-4 ${ hasMediaError ? 'text-red-400' : 'text-blue-500' }`} />
                                </div>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {cardParams[`__file_${cardIndex}`]?.name
                                        ? <span className="text-green-600 dark:text-green-400 font-medium">✓ {cardParams[`__file_${cardIndex}`].name}</span>
                                        : hasMediaError
                                            ? <span className="text-red-500 dark:text-red-400 font-medium">⚠ Select {card.headerType === 'IMAGE' ? 'an image' : 'a video'} — required!</span>
                                            : 'Select media from library'}
                                </span>
                            </button>
                        </div>
                        {hasMediaError && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> This card requires a {card.headerType === 'IMAGE' ? 'image' : 'video'} before sending.
                            </p>
                        )}
                        {!hasMediaError && (
                            <p className="text-xs text-slate-400 mt-1.5">This media will be uploaded to Meta before sending.</p>
                        )}
                    </div>
                )}

                {/* Body Variables */}
                {variables.length > 0 && (
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-white mb-3 uppercase tracking-wider">📝 Body Variables</label>
                        <div className="space-y-3">
                            {variables.map((varName, vIdx) => {
                                const errKey = `card_${cardIndex}_var_${varName}`;
                                const hasError = validationErrors[errKey];
                                return (
                                    <div key={vIdx} className="flex items-start gap-3">
                                        <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 whitespace-nowrap mt-1">{`{{${varName}}}`}</span>
                                        <div className="flex-1">
                                            <input
                                                className={`w-full bg-white dark:bg-background-dark border-2 rounded-xl px-3 py-2 text-sm outline-none transition-colors ${
                                                    hasError
                                                        ? 'border-red-400 text-red-900 focus:border-red-500 focus:ring-red-400 placeholder-red-300 dark:text-red-100'
                                                        : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-primary focus:ring-primary'
                                                }`}
                                                placeholder={`Value for {{${varName}}}`}
                                                value={cardParams[errKey] || ''}
                                                onChange={(e) => onCardParamChange(cardIndex, `var_${varName}`, e.target.value)}
                                            />
                                            {hasError && <p className="text-xs text-red-500 mt-1"><XCircle className="w-3 h-3 inline mr-1" />Required</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Button URL overrides */}
                {card.buttons && card.buttons.filter(b => b.type === 'URL').length > 0 && (
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-white mb-3 uppercase tracking-wider">🔗 Button URLs</label>
                        <div className="space-y-3">
                            {card.buttons.filter(b => b.type === 'URL').map((btn, bIdx) => {
                                const errKey = `card_${cardIndex}_btn_${bIdx}`;
                                const hasError = validationErrors[errKey];
                                return (
                                    <div key={bIdx} className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg flex-shrink-0 mt-1 ${hasError ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                                            <Link2 className={`w-4 h-4 ${hasError ? 'text-red-500' : 'text-green-500'}`} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">"{btn.text}" URL</p>
                                            <input
                                                className={`w-full bg-white dark:bg-background-dark border-2 rounded-xl px-3 py-2 text-sm outline-none transition-colors ${
                                                    hasError
                                                        ? 'border-red-400 text-red-900 focus:border-red-500 focus:ring-red-400 placeholder-red-300 dark:text-red-100'
                                                        : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-primary focus:ring-primary'
                                                }`}
                                                placeholder={btn.url || 'https://...'}
                                                value={cardParams[`${errKey}_url`] || btn.url || ''}
                                                onChange={(e) => onCardParamChange(cardIndex, `btn_${bIdx}_url`, e.target.value)}
                                            />
                                            {hasError && <p className="text-xs text-red-500 mt-1"><XCircle className="w-3 h-3 inline mr-1" />URL is required</p>}
                                        </div>
                                    </div>
                                );
                            })}
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
    // Object URL/Media URL previews for carousel card images, keyed by card index
    const [cardPreviewUrls, setCardPreviewUrls] = useState({});
    // Header media for standard (non-carousel) image/video templates
    const [headerPreviewUrl, setHeaderPreviewUrl] = useState(null);
    // MediaPicker configuration
    const [mediaPickerConfig, setMediaPickerConfig] = useState({ isOpen: false, type: null, index: null, mimeConstraints: [] });
    // Body parameter personalisation state
    const [paramModes, setParamModes] = useState({});      // 'static' | 'contact_column'
    const [paramFallbacks, setParamFallbacks] = useState({});
    const [fieldCoverage, setFieldCoverage] = useState({});

    // ── Validation ──────────────────────────────────────────────────────────
    // { header: true, card_0: true, card_2: true, ... }
    const [validationErrors, setValidationErrors] = useState({});

    // Refs for scroll-to-error
    const headerSectionRef = useRef(null);
    const paramsSectionRef = useRef(null);
    const cardRefs = useRef([]);  // array of refs per carousel card
    const carouselSectionRef = useRef(null);

    const selectedTemplate = data.template || {};
    const isCarousel = selectedTemplate.archetype === 'carousel' && Array.isArray(selectedTemplate.cards) && selectedTemplate.cards.length > 0;

    // Extract variables from template content
    const variables = selectedTemplate.content ? (selectedTemplate.content.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')) : [];

    const headerMediaType = (selectedTemplate.headerType || selectedTemplate.type || '').toUpperCase();
    const needsStandardMedia = !isCarousel && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerMediaType);

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
                // Retarget mode: the count comes from CampaignStep1's retargetCount which is passed via data.
                // data.retargetCount is set by the parent Campaigns.jsx when in retarget mode.
                if (data.retargetCampaignId) {
                    setTotalRecipientsCount((data.retargetCount || 0) + manualCount);
                    return;
                }

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
    }, [data.recipients, data.retargetCampaignId, data.retargetCount, manualCount]);

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

    const CONTACT_COLUMNS = [
        { colKey: 'name',       label: '👤 Contact Name',   desc: 'Full name saved in this app' },
        { colKey: 'first_name', label: '✨ First Name Only', desc: 'Auto first word of name' },
        { colKey: 'phone',      label: '📱 Phone Number',   desc: 'Always available for everyone' },
        { colKey: 'email',      label: '✉️ Email Address',   desc: 'May be missing for some contacts' },
        { colKey: 'tags',       label: '🏷️ First Group/Tag', desc: 'First tag on the contact' },
    ];

    const handleParamChange = (variable, value) => {
        const newParams = { ...data.params, [variable]: value };
        updateData({ params: newParams });
    };

    const fetchFieldCoverage = async (varName, colKey) => {
        if (!colKey || colKey === 'phone') {
            setFieldCoverage(prev => ({ ...prev, [varName]: { total: 0, missing: 0, loading: false } }));
            return;
        }
        setFieldCoverage(prev => ({ ...prev, [varName]: { ...(prev[varName] || {}), loading: true } }));
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/contacts/field-coverage`, {
                recipients: data.recipients || [],
                field: colKey
            });
            setFieldCoverage(prev => ({ ...prev, [varName]: { ...res.data, loading: false } }));
        } catch {
            setFieldCoverage(prev => ({ ...prev, [varName]: { total: 0, missing: 0, loading: false } }));
        }
    };

    const handleParamModeChange = (varName, mode) => {
        setParamModes(prev => ({ ...prev, [varName]: mode }));
        if (mode === 'static') {
            handleParamChange(varName, '');
            setFieldCoverage(prev => ({ ...prev, [varName]: null }));
        } else {
            handleParamChange(varName, '__col__name');
            fetchFieldCoverage(varName, 'name');
        }
    };

    const handleColumnChange = (varName, colKey) => {
        handleParamChange(varName, `__col__${colKey}`);
        fetchFieldCoverage(varName, colKey);
    };

    const handleFallbackChange = (varName, value) => {
        setParamFallbacks(prev => ({ ...prev, [varName]: value }));
        const newParams = { ...data.params, [`__fallback__${varName}`]: value };
        updateData({ params: newParams });
    };



    const handleCardParamChange = (cardIndex, key, value) => {
        setCardParams(prev => ({ ...prev, [`card_${cardIndex}_${key}`]: value }));
    };

    const handleCardImageChange = (cardIndex, headerType) => {
        setMediaPickerConfig({
            isOpen: true,
            type: 'card',
            index: cardIndex,
            mimeConstraints: headerType === 'VIDEO' ? ["video/mp4", "video/3gpp"] : MIME_PRESETS.whatsapp_image
        });
    };

    const handleHeaderFileChange = (headerType) => {
        let mimeConstraints = MIME_PRESETS.whatsapp_image;
        if (headerType === 'VIDEO') mimeConstraints = ["video/mp4", "video/3gpp"];
        else if (headerType === 'DOCUMENT') mimeConstraints = ["application/pdf", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
        
        setMediaPickerConfig({
            isOpen: true,
            type: 'header',
            index: null,
            mimeConstraints
        });
    };

    const handleMediaSelect = (url) => {
        if (mediaPickerConfig.type === 'header') {
            setHeaderPreviewUrl(url);
            // Clear header validation error when user picks media
            if (validationErrors.header) {
                setValidationErrors(prev => { const n = {...prev}; delete n.header; return n; });
            }
        } else if (mediaPickerConfig.type === 'card' && mediaPickerConfig.index !== null) {
            setCardPreviewUrls(prev => ({ ...prev, [mediaPickerConfig.index]: url }));
            setCardParams(prev => ({ ...prev, [`__file_${mediaPickerConfig.index}`]: { name: url.split('/').pop().split('?')[0] || 'media' } }));
        }
        setMediaPickerConfig({ isOpen: false, type: null, index: null, mimeConstraints: [] });
    };

    const getPreviewText = () => {
        let text = selectedTemplate.content || '';
        variables.forEach(v => {
            const raw = data.params?.[v] || '';
            let display;
            if (raw.startsWith('__col__')) {
                const colKey = raw.replace('__col__', '');
                const col = CONTACT_COLUMNS.find(c => c.colKey === colKey);
                const fallback = paramFallbacks[v] || 'Customer';
                display = col ? `[${col.colKey === 'first_name' ? 'First Name' : col.label.replace(/^\S+\s/, '')} or "${fallback}"]` : `[${colKey}]`;
            } else {
                display = raw || `{{${v}}}`;
            }
            text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), display);
        });
        return text;
    };

    const uploadMedia = async (url) => {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/templates/upload-message-media-url`, { url });
        return { mediaId: res.data.mediaId, localUrl: res.data.localUrl };
    };

    /**
     * Validates all required fields before sending.
     * Returns true if valid, false if there are errors (also sets state + scrolls).
     */
    const validateBeforeSend = useCallback(() => {
        const errors = {};
        let firstErrorRef = null;

        // ── 1. Standard template ────────────
        if (!isCarousel) {
            // Header
            const hType = (selectedTemplate.headerType || selectedTemplate.type || '').toUpperCase();
            const needsMedia = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(hType);
            if (needsMedia && !headerPreviewUrl) {
                errors.header = true;
                if (!firstErrorRef) firstErrorRef = headerSectionRef;
            }

            // Body Variables
            variables.forEach((variable) => {
                const rawVal = data.params?.[variable] || '';
                const mode = paramModes[variable] || 'static';
                // If static text is selected, it must not be empty.
                if (mode === 'static' && (!rawVal || !rawVal.trim())) {
                    errors[`var_${variable}`] = true;
                    if (!firstErrorRef) firstErrorRef = paramsSectionRef;
                }
            });
        }

        // ── 2. Carousel cards ─────────────────────────────────────────────────
        if (isCarousel && Array.isArray(selectedTemplate.cards)) {
            selectedTemplate.cards.forEach((card, i) => {
                let cardHasError = false;

                // Media
                if (card.headerType === 'IMAGE' || card.headerType === 'VIDEO') {
                    if (!cardPreviewUrls[i]) {
                        errors[`card_${i}_media`] = true;
                        cardHasError = true;
                    }
                }

                // Variables
                const cardVars = card.content ? (card.content.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')) : [];
                cardVars.forEach(varName => {
                    const val = cardParams[`card_${i}_var_${varName}`] || '';
                    if (!val.trim()) {
                        errors[`card_${i}_var_${varName}`] = true;
                        cardHasError = true;
                    }
                });

                // Button URLs
                if (card.buttons) {
                    card.buttons.forEach((btn, bIdx) => {
                        if (btn.type === 'URL') {
                            const val = cardParams[`card_${i}_btn_${bIdx}_url`] || btn.url || '';
                            if (!val.trim()) {
                                errors[`card_${i}_btn_${bIdx}`] = true;
                                cardHasError = true;
                            }
                        }
                    });
                }

                if (cardHasError) {
                    errors[`card_${i}`] = true;
                    if (!firstErrorRef && cardRefs.current[i]) {
                        firstErrorRef = { current: cardRefs.current[i] };
                    }
                }
            });
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            // Scroll to first error after state update
            setTimeout(() => {
                const el = firstErrorRef?.current;
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 80);
            return false;
        }

        setValidationErrors({});
        return true;
    }, [isCarousel, selectedTemplate, headerPreviewUrl, cardPreviewUrls, data.params, paramModes, variables, cardParams]);

    const handleSend = async () => {
        // Clear old errors and run full validation first
        if (!validateBeforeSend()) return;

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
            // In retarget mode, recipients are resolved server-side from retargetCampaignId.
            // Skip the empty-recipients guard only when retargeting.
            if (!data.retargetCampaignId && contactIds.length === 0 && contactIds !== 'all' && targetGroups.length === 0 && manualRecipients.length === 0) {
                throw new Error('Please select at least one recipient group or enter manual recipients.');
            }

            // --- Handle standard header media upload (non-carousel IMAGE/VIDEO/DOCUMENT) ---
            let resolvedCardParams = { ...cardParams };
            if (!isCarousel && headerPreviewUrl) {
                showModal({ type: 'info', title: 'Uploading', message: 'Uploading header media to Meta...' });
                const { mediaId, localUrl } = await uploadMedia(headerPreviewUrl);
                resolvedCardParams['headerMediaId'] = mediaId;
                if (localUrl) resolvedCardParams['headerLocalUrl'] = localUrl;
            }

            // --- Handle Carousel card media uploads ---
            if (isCarousel) {
                for (let i = 0; i < selectedTemplate.cards.length; i++) {
                    const url = cardPreviewUrls[i];
                    if (url) {
                        showModal({ type: 'info', title: 'Uploading', message: `Uploading media for Card ${i + 1} to Meta...` });
                        const { mediaId, localUrl } = await uploadMedia(url);
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
                scheduledFor: scheduleType === 'later' ? scheduledDate : null,
                // Retarget fields — required by server/routes/messages.js to resolve contacts
                retargetCampaignId: data.retargetCampaignId || null,
                retargetStatus: data.retargetStatus || null,
                retargetLogIds: data.retargetLogIds || null,
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

                    {/* ── Header Media Upload (Standard Template) ── */}
                    {needsStandardMedia && (
                        <div ref={headerSectionRef} className={`bg-white dark:bg-surface-dark rounded-2xl border-2 overflow-hidden shadow-sm transition-colors duration-300 ${
                            validationErrors.header ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-white/5'
                        }`}>
                            <div className={`px-4 md:px-6 py-4 border-b flex items-center gap-3 ${
                                validationErrors.header ? 'border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5'
                            }`}>
                                <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><Layers className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight">Header Media</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Upload a {headerMediaType === 'VIDEO' ? 'video' : headerMediaType === 'DOCUMENT' ? 'document' : 'image'} to include at the top of your message</p>
                                </div>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <label className="block text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">
                                    {headerMediaType === 'IMAGE' ? '🖼️ Header Image' : headerMediaType === 'VIDEO' ? '🎬 Header Video' : '📄 Header Document'}
                                    <span className="text-red-400 ml-1">*</span>
                                </label>
                                
                                <div className="relative flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleHeaderFileChange(headerMediaType)}
                                        className={`flex-1 flex items-center gap-3 border-2 rounded-xl p-3 cursor-pointer transition-all group text-left ${
                                            validationErrors.header
                                                ? 'bg-red-50 dark:bg-red-900/10 border-red-400 dark:border-red-500 hover:border-red-500'
                                                : 'bg-white dark:bg-background-dark border-dashed border-slate-200 dark:border-white/10 hover:border-primary/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/10'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg transition-colors ${
                                            validationErrors.header ? 'bg-red-500/10 group-hover:bg-red-500/20' : 'bg-blue-500/10 group-hover:bg-blue-500/20'
                                        }`}>
                                            {headerMediaType === 'VIDEO' ? (
                                                <Film className={`w-4 h-4 ${ validationErrors.header ? 'text-red-400' : 'text-blue-500' }`} />
                                            ) : headerMediaType === 'DOCUMENT' ? (
                                                <FileIcon className={`w-4 h-4 ${ validationErrors.header ? 'text-red-400' : 'text-blue-500' }`} />
                                            ) : (
                                                <ImageIcon className={`w-4 h-4 ${ validationErrors.header ? 'text-red-400' : 'text-blue-500' }`} />
                                            )}
                                        </div>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">
                                            {headerPreviewUrl
                                                ? <span className="text-green-600 dark:text-green-400 font-medium">✓ {headerPreviewUrl.split('/').pop().split('?')[0]}</span>
                                                : validationErrors.header
                                                    ? <span className="text-red-500 dark:text-red-400 font-medium">⚠ Select a {headerMediaType.toLowerCase()} — required!</span>
                                                    : 'Select media from library'}
                                        </span>
                                    </button>
                                </div>
                                {validationErrors.header && (
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
                                        <XCircle className="w-3 h-3" /> This template requires a {headerMediaType.toLowerCase()} header before sending.
                                    </p>
                                )}
                                {!validationErrors.header && (
                                    <p className="text-xs text-slate-400 mt-1.5">This media will be uploaded to Meta before sending.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Body Parameters (fully dynamic) ── */}
                    {variables.length > 0 && (
                        <div ref={paramsSectionRef} className={`bg-white dark:bg-surface-dark rounded-2xl border-2 overflow-hidden shadow-sm transition-colors duration-300 ${
                            variables.some(v => validationErrors[`var_${v}`]) ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-white/5'
                        }`}>
                            <div className={`px-4 md:px-6 py-4 border-b flex items-center gap-3 ${
                                variables.some(v => validationErrors[`var_${v}`]) ? 'border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5'
                            }`}>
                                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><User className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight">Body Parameters</h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Send the same text to everyone, or personalise each variable from contact data</p>
                                </div>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                {variables.map((variable, idx) => {
                                    const mode = paramModes[variable] || 'static';
                                    const rawVal = data.params?.[variable] || '';
                                    const selectedColKey = rawVal.startsWith('__col__') ? rawVal.replace('__col__', '') : 'name';
                                    const coverage = fieldCoverage[variable];
                                    const fallback = paramFallbacks[variable] || '';
                                    const hasError = validationErrors[`var_${variable}`];
                                    return (
                                        <div key={idx} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                                            hasError ? 'border-red-300 dark:border-red-500/60 shadow-sm shadow-red-500/10' : 'border-slate-100 dark:border-white/8'
                                        }`}>
                                            {/* Row header: var badge + mode toggle */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">{`{{${variable}}}`}</span>
                                                    <span className="text-xs text-slate-400">replace with →</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-slate-200 dark:bg-background-dark rounded-xl p-1">
                                                    <button onClick={() => handleParamModeChange(variable, 'static')}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                            mode === 'static' ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                                        }`}>
                                                        <Type className="w-3 h-3" />Fixed Text
                                                    </button>
                                                    <button onClick={() => handleParamModeChange(variable, 'contact_column')}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                            mode === 'contact_column' ? 'bg-white dark:bg-surface-dark text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                                        }`}>
                                                        <Users className="w-3 h-3" />From Contact
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                {mode === 'static' ? (
                                                    <div>
                                                        <input
                                                            className={`w-full bg-slate-50 dark:bg-background-dark border-2 rounded-xl px-4 py-3 text-sm outline-none transition-colors ${
                                                                hasError
                                                                    ? 'border-red-400 text-red-900 focus:border-red-500 focus:ring-red-400 placeholder-red-300 dark:text-red-100'
                                                                    : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-primary focus:ring-primary placeholder-slate-400'
                                                            }`}
                                                            type="text"
                                                            placeholder={`E.g. "Dear Customer", "Sale ends today!"`}
                                                            value={rawVal.startsWith('__col__') ? '' : rawVal}
                                                            onChange={(e) => {
                                                                if (hasError) setValidationErrors(prev => { const n = {...prev}; delete n[`var_${variable}`]; return n; });
                                                                handleParamChange(variable, e.target.value);
                                                            }}
                                                        />
                                                        {hasError && (
                                                            <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> This parameter cannot be empty.</p>
                                                        )}
                                                        {!hasError && (
                                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">This exact text will be sent to <strong>every</strong> recipient.</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {/* Column picker */}
                                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Pick a contact field</label>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                                            {CONTACT_COLUMNS.map(col => (
                                                                <button key={col.colKey}
                                                                    onClick={() => handleColumnChange(variable, col.colKey)}
                                                                    className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all ${
                                                                        selectedColKey === col.colKey
                                                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 ring-1 ring-blue-400/60'
                                                                            : 'bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-white/10 hover:border-blue-300'
                                                                    }`}>
                                                                    <span className={`text-xs font-bold leading-tight ${ selectedColKey === col.colKey ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-white' }`}>{col.label}</span>
                                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug mt-0.5">{col.desc}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {/* Coverage badge */}
                                                        {coverage?.loading && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400"><div className="w-3 h-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />Checking coverage across your audience...</div>
                                                        )}
                                                        {coverage && !coverage.loading && coverage.total > 0 && (
                                                            <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-xs ${
                                                                coverage.missing === 0
                                                                    ? 'bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-700/40'
                                                                    : 'bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40'
                                                            }`}>
                                                                {coverage.missing === 0 ? (
                                                                    <><span className="text-green-500 font-bold mt-0.5">✓</span><span className="text-green-700 dark:text-green-300">All <strong>{coverage.total}</strong> contacts have this field — no fallback needed.</span></>
                                                                ) : (
                                                                    <><AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" /><span className="text-amber-700 dark:text-amber-300"><strong>{coverage.missing}</strong> of <strong>{coverage.total}</strong> contacts are missing this field — they will receive your fallback text instead.</span></>
                                                                )}
                                                            </div>
                                                        )}
                                                        {/* Fallback input */}
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                                Fallback — if field is empty
                                                                {coverage?.missing > 0 && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-bold">{coverage.missing} contacts affected</span>}
                                                            </label>
                                                            <input
                                                                className="w-full bg-slate-50 dark:bg-background-dark border border-amber-200 dark:border-amber-700/40 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 outline-none transition-colors placeholder-slate-400"
                                                                type="text"
                                                                placeholder='E.g. "Customer", "Friend", "there"'
                                                                value={fallback}
                                                                onChange={(e) => handleFallbackChange(variable, e.target.value)}
                                                            />
                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                                                Used when a contact has no {CONTACT_COLUMNS.find(c => c.colKey === selectedColKey)?.label?.replace(/^\S+\s/, '') || 'value'} saved.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Carousel Card Configuration ── */}
                    {isCarousel && (
                        <div ref={carouselSectionRef} className={`bg-white dark:bg-surface-dark rounded-2xl border-2 overflow-hidden shadow-sm transition-all duration-300 ${
                            Object.keys(validationErrors).some(k => k.startsWith('card_'))
                                ? 'border-red-400 dark:border-red-500'
                                : 'border-slate-200 dark:border-white/5'
                        }`}>
                            <div className={`px-4 md:px-6 py-4 border-b flex items-center gap-3 ${
                                Object.keys(validationErrors).some(k => k.startsWith('card_'))
                                    ? 'border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-900/10'
                                    : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5'
                            }`}>
                                <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 p-2 rounded-lg">
                                    <CreditCard className="w-5 h-5 text-pink-400" />
                                </div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg">Carousel Cards</h3>
                                    <p className="text-xs text-slate-500 dark:text-text-secondary">Configure each card's image, variables, and buttons</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    {Object.keys(validationErrors).some(k => k.startsWith('card_')) && (
                                        <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full border border-red-200 dark:border-red-700/50">
                                            <XCircle className="w-3.5 h-3.5" />
                                            {Object.keys(validationErrors).filter(k => k.startsWith('card_')).length} missing
                                        </span>
                                    )}
                                    <span className="text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-full">
                                        {selectedTemplate.cards.length} Cards
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 md:p-6 space-y-5">
                                {selectedTemplate.cards.map((card, idx) => (
                                    <CarouselCardConfig
                                        key={idx}
                                        card={card}
                                        cardIndex={idx}
                                        cardParams={cardParams}
                                        onCardParamChange={(cIdx, key, val) => {
                                            if (validationErrors[`card_${cIdx}_${key}`]) {
                                                setValidationErrors(prev => { const n = {...prev}; delete n[`card_${cIdx}_${key}`]; return n; });
                                            }
                                            // btn_x_url -> btn_x error mapping
                                            if (key.includes('_url')) {
                                                const btnKey = key.replace('_url', '');
                                                if (validationErrors[`card_${cIdx}_${btnKey}`]) {
                                                    setValidationErrors(prev => { const n = {...prev}; delete n[`card_${cIdx}_${btnKey}`]; return n; });
                                                }
                                            }
                                            handleCardParamChange(cIdx, key, val);
                                        }}
                                        onCardImageChange={(i, t) => {
                                            // Clear error on interaction
                                            if (validationErrors[`card_${i}_media`]) {
                                                setValidationErrors(prev => { const n = {...prev}; delete n[`card_${i}_media`]; return n; });
                                            }
                                            handleCardImageChange(i, t);
                                        }}
                                        hasMediaError={!!validationErrors[`card_${idx}_media`]}
                                        validationErrors={validationErrors}
                                        cardRef={el => { cardRefs.current[idx] = el; }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Standard template: Dynamic URL Button overrides ── */}
                    {!isCarousel && Array.isArray(selectedTemplate.buttons) && selectedTemplate.buttons.some(b => b.type === 'URL' && b.url && b.url.includes('{{')) && (
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm transition-colors duration-300">
                            <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                                <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
                                    <ExternalLink className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg">Dynamic Button URLs</h3>
                                    <p className="text-xs text-slate-500 dark:text-text-secondary">These buttons have dynamic parts — enter the value to complete the URL</p>
                                </div>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                {selectedTemplate.buttons
                                    .map((btn, idx) => ({ btn, idx }))
                                    .filter(({ btn }) => btn.type === 'URL' && btn.url && btn.url.includes('{{'))
                                    .map(({ btn, idx }) => {
                                        const paramKey = `btn_${idx}_url`;
                                        const currentVal = (data.params || {})[paramKey] || '';
                                        const urlDisplay = btn.url.replace(/\{\{[^}]+\}\}/g, '[dynamic-value]');
                                        return (
                                            <div key={idx} className="flex items-start gap-3">
                                                <div className="bg-emerald-500/10 p-2 rounded-lg flex-shrink-0 mt-1">
                                                    <ExternalLink className="w-4 h-4 text-emerald-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">"{btn.text}"</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 font-mono break-all">{urlDisplay}</p>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-slate-50 dark:bg-background-dark border-2 border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                                                        placeholder="Enter the dynamic value for this URL…"
                                                        value={currentVal}
                                                        onChange={e => updateData({ params: { ...(data.params || {}), [paramKey]: e.target.value } })}
                                                    />
                                                    <p className="text-xs text-slate-400 mt-1">This value replaces the {'{{...}}'} placeholder in the button URL at send time.</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    )}

                    {/* Standard template — show "no variables" placeholder */}
                    {!isCarousel && variables.length === 0 && !(Array.isArray(selectedTemplate.buttons) && selectedTemplate.buttons.some(b => b.type === 'URL' && b.url && b.url.includes('{{'))) && (
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

                    {/* ── Validation Error Summary Banner ── */}
                    {Object.keys(validationErrors).length > 0 && (
                        <div ref={headerSectionRef} className="bg-red-50 dark:bg-red-900/15 border-2 border-red-400 dark:border-red-500 rounded-2xl px-5 py-4 space-y-3 shadow-lg shadow-red-500/10">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                    <XCircle className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-red-700 dark:text-red-300">Required fields are missing</p>
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Please complete all required fields before sending the campaign.</p>
                                </div>
                            </div>
                            <ul className="space-y-1.5 pl-11">
                                {Object.keys(validationErrors).map(key => {
                                    if (key === 'header') {
                                        return (
                                            <li key={key} className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                                Header {['VIDEO'].includes((selectedTemplate.headerType || selectedTemplate.type || '').toUpperCase()) ? 'Video' : (selectedTemplate.headerType || selectedTemplate.type || '').toUpperCase() === 'DOCUMENT' ? 'Document' : 'Image'} is required — click the placeholder in the Message Preview on the right.
                                            </li>
                                        );
                                    }
                                    if (key.startsWith('var_')) {
                                        const varName = key.replace('var_', '');
                                        return (
                                            <li key={key} className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                                Body Parameter <strong>{`{{${varName}}}`}</strong> is empty.
                                                <button
                                                    type="button"
                                                    onClick={() => { paramsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                                                    className="ml-auto underline text-red-500 hover:text-red-700 dark:hover:text-red-300 font-semibold"
                                                >Fix parameter →</button>
                                            </li>
                                        );
                                    }
                                    if (key.startsWith('card_')) {
                                        if (key.match(/^card_\d+$/)) return null; // skip the general card marker
                                        const parts = key.split('_');
                                        const idx = parseInt(parts[1]);
                                        
                                        let message = '';
                                        if (key.endsWith('_media')) message = 'Media is required';
                                        else if (key.includes('_var_')) message = `Variable {{${parts.slice(3).join('_')}}} is required`;
                                        else if (key.includes('_btn_')) message = `Button ${parseInt(parts[3]) + 1} URL is required`;
                                        
                                        return (
                                            <li key={key} className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                                Card {idx + 1}: {message}
                                                <button
                                                    type="button"
                                                    onClick={() => { cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                                                    className="ml-auto underline text-red-500 hover:text-red-700 dark:hover:text-red-300 font-semibold"
                                                >Jump to Card {idx + 1} →</button>
                                            </li>
                                        );
                                    }
                                    return null;
                                })}
                            </ul>
                        </div>
                    )}

                    {/* Soft warning removed since we now show an explicit media upload field above */}

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
                                    className={`relative flex items-center gap-4 cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 ${scheduleType === 'now' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-xl shadow-indigo-500/10' : 'border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 bg-slate-50 dark:bg-white/5'} cursor-pointer`}
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
                                    className={`relative flex items-center gap-4 cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 ${scheduleType === 'later' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-xl shadow-indigo-500/10' : 'border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 bg-slate-50 dark:bg-white/5'} cursor-pointer`}
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
                                                    <div className="h-20 relative overflow-hidden flex-shrink-0">
                                                        {cardPreviewUrls[idx] ? (
                                                            card.headerType === 'VIDEO' ? (
                                                                <video
                                                                    src={cardPreviewUrls[idx]}
                                                                    className="w-full h-full object-cover"
                                                                    muted
                                                                    playsInline
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={cardPreviewUrls[idx]}
                                                                    alt={`Card ${idx + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            )
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center">
                                                                <ImageIcon className="w-6 h-6 text-white/50" />
                                                            </div>
                                                        )}
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
                                        {((selectedTemplate.headerType || selectedTemplate.type || '').toUpperCase() === 'IMAGE') && (
                                            <div className={`w-full aspect-video bg-black/5 rounded-xl overflow-hidden mb-2 relative ring-2 transition-all ${
                                                validationErrors.header ? 'ring-red-400' : 'ring-transparent'
                                            }`}>
                                                {headerPreviewUrl ? (
                                                    <img className="w-full h-full object-cover" src={headerPreviewUrl} alt="Header" />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleHeaderFileChange('IMAGE')}
                                                        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group ${
                                                            validationErrors.header
                                                                ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                                                                : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-950/30 dark:hover:to-blue-900/20'
                                                        }`}
                                                    >
                                                        <ImageIcon className={`w-6 h-6 transition-colors ${ validationErrors.header ? 'text-red-400 group-hover:text-red-500' : 'text-slate-400 group-hover:text-primary' }`} />
                                                        <span className={`text-[9px] font-medium transition-colors ${ validationErrors.header ? 'text-red-400 group-hover:text-red-500' : 'text-slate-400 group-hover:text-primary' }`}>
                                                            {validationErrors.header ? '⚠ Required — select image' : 'Select image from library'}
                                                        </span>
                                                    </button>
                                                )}
                                                {headerPreviewUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleHeaderFileChange('IMAGE')}
                                                        className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded cursor-pointer hover:bg-black/80 transition-colors"
                                                    >
                                                        Change
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {((selectedTemplate.headerType || selectedTemplate.type || '').toUpperCase() === 'VIDEO') && (
                                            <div className={`w-full aspect-video bg-black/5 rounded-xl overflow-hidden mb-2 relative ring-2 transition-all ${
                                                validationErrors.header ? 'ring-red-400' : 'ring-transparent'
                                            }`}>
                                                {headerPreviewUrl ? (
                                                    <video className="w-full h-full object-cover" src={headerPreviewUrl} muted playsInline />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleHeaderFileChange('VIDEO')}
                                                        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group ${
                                                            validationErrors.header
                                                                ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                                                                : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-950/30 dark:hover:to-blue-900/20'
                                                        }`}
                                                    >
                                                        <ImageIcon className={`w-6 h-6 transition-colors ${ validationErrors.header ? 'text-red-400 group-hover:text-red-500' : 'text-slate-400 group-hover:text-primary' }`} />
                                                        <span className={`text-[9px] font-medium transition-colors ${ validationErrors.header ? 'text-red-400 group-hover:text-red-500' : 'text-slate-400 group-hover:text-primary' }`}>
                                                            {validationErrors.header ? '⚠ Required — select video' : 'Select video from library'}
                                                        </span>
                                                    </button>
                                                )}
                                                {headerPreviewUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleHeaderFileChange('VIDEO')}
                                                        className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded cursor-pointer hover:bg-black/80 transition-colors"
                                                    >
                                                        Change
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {((selectedTemplate.headerType || selectedTemplate.type || '').toUpperCase() === 'DOCUMENT') && (
                                            <div className={`w-full aspect-video bg-black/5 rounded-xl overflow-hidden mb-2 relative ring-2 transition-all ${
                                                validationErrors.header ? 'ring-red-400' : 'ring-transparent'
                                            }`}>
                                                {headerPreviewUrl ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                                                        <FileIcon className="w-8 h-8 text-blue-500 mb-2" />
                                                        <span className="text-[10px] text-blue-700 dark:text-blue-300 font-medium px-2 text-center truncate w-full">{headerPreviewUrl.split('/').pop().split('?')[0]}</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleHeaderFileChange('DOCUMENT')}
                                                        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group ${
                                                            validationErrors.header
                                                                ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                                                                : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-950/30 dark:hover:to-blue-900/20'
                                                        }`}
                                                    >
                                                        <FileIcon className={`w-6 h-6 transition-colors ${ validationErrors.header ? 'text-red-400 group-hover:text-red-500' : 'text-slate-400 group-hover:text-primary' }`} />
                                                        <span className={`text-[9px] font-medium transition-colors ${ validationErrors.header ? 'text-red-400 group-hover:text-red-500' : 'text-slate-400 group-hover:text-primary' }`}>
                                                            {validationErrors.header ? '⚠ Required — select document' : 'Select document'}
                                                        </span>
                                                    </button>
                                                )}
                                                {headerPreviewUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleHeaderFileChange('DOCUMENT')}
                                                        className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded cursor-pointer hover:bg-black/80 transition-colors"
                                                    >
                                                        Change
                                                    </button>
                                                )}
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
            <MediaPickerModal
                isOpen={mediaPickerConfig.isOpen}
                onClose={() => setMediaPickerConfig({ isOpen: false, type: null, index: null, mimeConstraints: [] })}
                onSelect={handleMediaSelect}
                mimeConstraints={mediaPickerConfig.mimeConstraints}
                multiple={false}
            />
        </div>
    );
};

export default CampaignStep3;
