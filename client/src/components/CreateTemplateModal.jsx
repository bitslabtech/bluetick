import React, { useState, useEffect } from 'react';
import {
    X, ArrowLeft, ArrowRight, Check, Image as ImageIcon,
    MessageSquare, Link, MousePointerClick, ShieldCheck,
    Smartphone, CheckCircle2, AlertCircle, Plus, Trash2, Phone
} from 'lucide-react';
import axios from 'axios';

// The predefined archetypes to pick from
const TEMPLATE_ARCHETYPES = [
    {
        id: 'simple_text',
        title: 'Simple Text Message',
        description: 'A direct text message without any media or buttons. Great for quick alerts or text-only promotions.',
        icon: MessageSquare,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        defaultCategory: 'MARKETING'
    },
    {
        id: 'media_message',
        title: 'Media Message',
        description: 'Include an Image, Video, or Document at the top of your message to grab attention immediately.',
        icon: ImageIcon,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        defaultCategory: 'MARKETING'
    },
    {
        id: 'call_to_action',
        title: 'Call-To-Action (CTA)',
        description: 'Add a button that redirects users to your website or initiates a phone call.',
        icon: Link,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        defaultCategory: 'MARKETING'
    },
    {
        id: 'quick_replies',
        title: 'Interactive Quick Replies',
        description: 'Provide up to 3 preset buttons users can tap to instantly reply to your message.',
        icon: MousePointerClick,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        defaultCategory: 'MARKETING'
    },
    {
        id: 'authentication',
        title: 'Authentication (OTP)',
        description: 'Send strict, secure One-Time Passwords. Cannot contain media or custom promotional links.',
        icon: ShieldCheck,
        color: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/20',
        defaultCategory: 'AUTHENTICATION'
    },
    {
        id: 'carousel',
        title: 'Marketing Carousel',
        description: 'A horizontally scrollable list of up to 10 cards. Great for product catalogs.',
        icon: ArrowRight, // Using ArrowRight as a makeshift carousel icon
        color: 'text-pink-500',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
        defaultCategory: 'MARKETING'
    }
];

const CreateTemplateModal = ({ isOpen, onClose, onSuccess, showToast }) => {
    const [step, setStep] = useState(1);
    const [selectedArchetype, setSelectedArchetype] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: 'MARKETING',
        language: 'en_US',
        content: '',
        footer: '',
        headerType: 'NONE', // NONE, TEXT, IMAGE, VIDEO, DOCUMENT
        headerContent: '',
        buttons: [],
        cards: [] // Used for carousel templates
    });

    const [activeCardIndex, setActiveCardIndex] = useState(0);

    const [bodyVariables, setBodyVariables] = useState({});
    const [headerVariables, setHeaderVariables] = useState({});

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedArchetype(null);
            setIsSubmitting(false);
            setFormData({
                name: '',
                category: 'MARKETING',
                language: 'en_US',
                content: '',
                footer: '',
                headerType: 'NONE',
                headerContent: '',
                buttons: [],
                cards: []
            });
            setBodyVariables({});
            setHeaderVariables({});
            setActiveCardIndex(0);
        }
    }, [isOpen]);

    // Helper: extract all variables {{1}}, {{2}} etc from a string
    const extractVariables = (text) => {
        const regex = /\{\{(\d+)\}\}/g;
        let match;
        const vars = [];
        while ((match = regex.exec(text)) !== null) {
            if (!vars.includes(match[1])) {
                vars.push(match[1]);
            }
        }
        return vars.sort((a, b) => parseInt(a) - parseInt(b));
    };

    const handleContentChange = (e) => {
        const text = e.target.value;
        setFormData({ ...formData, content: text });

        const vars = extractVariables(text);
        setBodyVariables(prev => {
            const next = {};
            vars.forEach(v => {
                next[v] = prev[v] || ''; // preserve existing sample data
            });
            return next;
        });
    };

    const handleHeaderContentChange = (e) => {
        const text = e.target.value;
        setFormData({ ...formData, headerContent: text });

        if (formData.headerType === 'TEXT') {
            const vars = extractVariables(text);
            setHeaderVariables(prev => {
                const next = {};
                vars.forEach(v => {
                    next[v] = prev[v] || '';
                });
                return next;
            });
        }
    };

    // Preview helper to inject sample values into the display text
    const getPreviewText = (text, varsDict) => {
        if (!text) return '';
        let preview = text;
        Object.keys(varsDict).forEach(key => {
            const val = varsDict[key] || `[${key}]`;
            // Safe replacement of variables using global regex
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            preview = preview.replace(regex, val);
        });

        // Simple visual formatting replacement for WhatsApp markdown
        // Replace *bold* with basic spans (not raw HTML to avoid dangerouslySetInnerHTML for now)
        const parts = preview.split(/(\*[^*]+\*|_{1}[^_]+_{1}|~[^~]+~)/g);
        if (parts.length === 1) return preview;

        return (
            <>
                {parts.map((chunk, i) => {
                    if (chunk.startsWith('*') && chunk.endsWith('*')) return <strong key={i}>{chunk.slice(1, -1)}</strong>;
                    if (chunk.startsWith('_') && chunk.endsWith('_')) return <em key={i}>{chunk.slice(1, -1)}</em>;
                    if (chunk.startsWith('~') && chunk.endsWith('~')) return <del key={i}>{chunk.slice(1, -1)}</del>;
                    return chunk;
                })}
            </>
        );
    };

    const handleAddButton = (type) => {
        // Meta limits: Max 3 Quick Replies, Max 1 Phone, Max 2 URL
        const currentQRs = formData.buttons.filter(b => b.type === 'QUICK_REPLY').length;
        const currentURLs = formData.buttons.filter(b => b.type === 'URL').length;
        const currentPhones = formData.buttons.filter(b => b.type === 'PHONE_NUMBER').length;

        if (type === 'QUICK_REPLY' && currentQRs >= 3) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 3 Quick Replies allowed.' });
        if (type === 'URL' && currentURLs >= 2) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 2 URL buttons allowed.' });
        if (type === 'PHONE_NUMBER' && currentPhones >= 1) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 1 Phone button allowed.' });

        const newBtn = { type, text: '', url: '', phoneNumber: '' };
        setFormData({ ...formData, buttons: [...formData.buttons, newBtn] });
    };

    const handleRemoveButton = (index) => {
        const newBtns = [...formData.buttons];
        newBtns.splice(index, 1);
        setFormData({ ...formData, buttons: newBtns });
    };

    const handleButtonChange = (index, field, value) => {
        const newBtns = [...formData.buttons];
        newBtns[index][field] = value;
        setFormData({ ...formData, buttons: newBtns });
    };

    const handleAddCardButton = (cardIndex, type) => {
        const cardClass = formData.cards[cardIndex];
        const currentQRs = cardClass.buttons.filter(b => b.type === 'QUICK_REPLY').length;
        const currentURLs = cardClass.buttons.filter(b => b.type === 'URL').length;
        const currentPhones = cardClass.buttons.filter(b => b.type === 'PHONE_NUMBER').length;

        if (type === 'QUICK_REPLY' && currentQRs >= 3) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 3 Quick Replies allowed.' });
        if (type === 'URL' && currentURLs >= 2) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 2 URL buttons allowed.' });
        if (type === 'PHONE_NUMBER' && currentPhones >= 1) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 1 Phone button allowed.' });

        const newBtn = { type, text: '', url: '', phoneNumber: '' };
        const newCards = [...formData.cards];
        newCards.forEach(c => {
            c.buttons.push({ ...newBtn });
        });
        setFormData({ ...formData, cards: newCards });
    };

    const handleRemoveCardButton = (cardIndex, btnIndex) => {
        const newCards = [...formData.cards];
        newCards.forEach(c => {
            c.buttons.splice(btnIndex, 1);
        });
        setFormData({ ...formData, cards: newCards });
    };

    const handleCardButtonChange = (cardIndex, btnIndex, field, value) => {
        const newCards = [...formData.cards];
        newCards[cardIndex].buttons[btnIndex][field] = value;
        setFormData({ ...formData, cards: newCards });
    };

    if (!isOpen) return null;

    const handleSelectArchetype = (archetype) => {
        setSelectedArchetype(archetype);

        let initialHeaderType = 'NONE';
        let initialButtons = [];
        let initialCards = [];

        if (archetype.id === 'media_message') {
            initialHeaderType = 'IMAGE';
        } else if (archetype.id === 'call_to_action') {
            initialButtons = [{ type: 'URL', text: '', url: '', phoneNumber: '' }];
        } else if (archetype.id === 'quick_replies') {
            initialButtons = [{ type: 'QUICK_REPLY', text: '', url: '', phoneNumber: '' }];
        } else if (archetype.id === 'carousel') {
            // Meta requires min 2 cards initially
            initialCards = [
                { headerType: 'IMAGE', headerContent: '', content: '', buttons: [] },
                { headerType: 'IMAGE', headerContent: '', content: '', buttons: [] }
            ];
        }

        setFormData(prev => ({
            ...prev,
            category: archetype.defaultCategory,
            headerType: initialHeaderType,
            buttons: initialButtons,
            cards: initialCards,
            content: '',
            footer: '',
            headerContent: ''
        }));
        setBodyVariables({});
        setHeaderVariables({});
        setActiveCardIndex(0);
    };

    const handleNext = () => {
        if (step === 1 && selectedArchetype) {
            setStep(2);
        }
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        }
    };

    const uploadMedia = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const token = localStorage.getItem('token');
        const res = await axios.post('http://localhost:5000/api/templates/upload', fd, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            }
        });
        return res.data.handle;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // 1. Process Media Uploads to Meta's Resumable API
            let uploadedHeaderHandle = null;
            if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerType) && formData.headerFile) {
                showToast({ type: 'info', title: 'Processing', message: 'Uploading master header media...' });
                uploadedHeaderHandle = await uploadMedia(formData.headerFile);
            }

            const processedCards = [];
            if (selectedArchetype?.id === 'carousel' && formData.cards.length > 0) {
                for (let i = 0; i < formData.cards.length; i++) {
                    const card = formData.cards[i];
                    let cardHeaderHandle = null;
                    if (['IMAGE', 'VIDEO'].includes(card.headerType) && card.mediaFile) {
                        showToast({ type: 'info', title: 'Processing', message: `Uploading media for Card ${i + 1}...` });
                        cardHeaderHandle = await uploadMedia(card.mediaFile);
                    }
                    processedCards.push({
                        ...card,
                        headerHandle: cardHeaderHandle
                    });
                }
            } else {
                processedCards.push(...formData.cards);
            }

            // 2. Submit Final Payload
            showToast({ type: 'info', title: 'Finalizing', message: 'Submitting template to Meta...' });
            const payload = {
                name: formData.name,
                category: formData.category,
                language: formData.language,
                content: formData.content,
                footer: formData.footer || undefined,
                headerType: formData.headerType,
                headerContent: formData.headerContent || undefined,
                headerHandle: uploadedHeaderHandle || undefined,
                bodyVariables: Object.values(bodyVariables),
                headerVariables: Object.values(headerVariables),
                buttons: formData.buttons,
                archetype: selectedArchetype?.id,
                cards: processedCards
            };

            await axios.post('http://localhost:5000/api/templates', payload);
            showToast({ type: 'success', title: 'Template Created', message: 'Template successfully submitted to Meta.' });
            onSuccess();
        } catch (err) {
            console.error("Error creating template:", err);
            const errMsg = err.response?.data?.error || err.message || "Failed to create template";
            showToast({ type: 'error', title: 'Creation Failed', message: errMsg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="bg-white dark:bg-surface-dark w-full sm:w-[95vw] max-w-[1200px] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-white/10 relative">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-transparent shrink-0">
                    <div className="flex items-center gap-4">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-text-secondary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {step === 1 ? 'Choose Template Type' : 'Configure Template'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-0.5">
                                Step {step} of 2
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-text-secondary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-slate-100 dark:bg-background-dark">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: React.createElement("span", {}, step === 1 ? '50%' : '100%').props.children }}
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50 dark:bg-background-dark/30">

                    {/* Left/Middle Pane (Configuration) */}
                    <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-5 md:p-6 lg:p-8">
                        {step === 1 && (
                            <div className="max-w-5xl mx-auto space-y-6">
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-4">What kind of message do you want to send?</h3>
                                    <p className="text-slate-500 dark:text-text-secondary mt-2">Select a starting layout. You can customize the exact content in the next step.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {TEMPLATE_ARCHETYPES.map((arch) => {
                                        const Icon = arch.icon;
                                        const isSelected = selectedArchetype?.id === arch.id;

                                        return (
                                            <button
                                                key={arch.id}
                                                onClick={() => handleSelectArchetype(arch)}
                                                className={`text-left relative p-5 rounded-2xl border-2 transition-all duration-200 group flex flex-col h-full
                                                    ${isSelected
                                                        ? 'bg-blue-50/50 dark:bg-surface-dark border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                                                        : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md'
                                                    }
`}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={`p-3 rounded-xl ${arch.bgColor} ${arch.color}`}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    {isSelected && (
                                                        <div className="bg-primary text-white rounded-full p-1 animate-in zoom-in duration-200">
                                                            <Check className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className={`font - bold text - base mb - 2 ${isSelected ? 'text-primary' : 'text-slate-900 dark:text-white'} `}>
                                                    {arch.title}
                                                </h4>
                                                <p className="text-sm text-slate-500 dark:text-text-secondary leading-relaxed flex-1">
                                                    {arch.description}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <form id="template-form" onSubmit={handleSubmit} className="max-w-3xl mx-auto flex flex-col gap-6 pb-10">
                                {/* Basic Info Section */}
                                <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-white/5 shadow-sm space-y-5">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        1. Basic Details
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Template Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                            placeholder="e.g. summer_sale_promo"
                                        />
                                        <p className="text-xs text-slate-500 dark:text-text-secondary mt-1.5 flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> Lowercase letters, numbers, and underscores only.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Category *</label>
                                            <select
                                                required
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer appearance-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={selectedArchetype?.id === 'authentication' || selectedArchetype?.id === 'carousel'}
                                            >
                                                <option value="MARKETING">Marketing</option>
                                                <option value="UTILITY">Utility</option>
                                                <option value="AUTHENTICATION">Authentication</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Language *</label>
                                            <select
                                                required
                                                value={formData.language}
                                                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer appearance-none transition-all"
                                            >
                                                <option value="en_US">English (US)</option>
                                                <option value="en_GB">English (UK)</option>
                                                <option value="es_ES">Spanish</option>
                                                <option value="pt_BR">Portuguese</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Carousel Master Text */}
                                {selectedArchetype?.id === 'carousel' && (
                                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-white/5 shadow-sm space-y-5">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            2. Master Message Bubble
                                        </h3>
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Body Text *</label>
                                                <span className="text-xs text-slate-400 font-mono">{formData.content.length}/1024</span>
                                            </div>
                                            <textarea
                                                required
                                                value={formData.content}
                                                onChange={handleContentChange}
                                                rows={3}
                                                maxLength={1024}
                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-all"
                                                placeholder="Swipe through our latest collection below!"
                                            />
                                            {Object.keys(bodyVariables).length > 0 && (
                                                <div className="mt-4 p-4 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 animate-in fade-in duration-300">
                                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Sample Values</h4>
                                                    <div className="flex flex-col gap-3">
                                                        {Object.keys(bodyVariables).map((num) => (
                                                            <div key={`body-var-${num}`} className="flex items-center gap-3">
                                                                <span className="bg-primary/10 text-primary font-mono px-3 py-2 rounded-lg text-sm font-bold shrink-0">{`{{${num}}}`}</span>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    placeholder={`Sample for {{${num}}}`}
                                                                    value={bodyVariables[num]}
                                                                    onChange={(e) => setBodyVariables({ ...bodyVariables, [num]: e.target.value })}
                                                                    className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all shadow-sm"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Header Section (Standard - Hidden for Carousel) */}
                                {selectedArchetype?.id !== 'authentication' && selectedArchetype?.id !== 'simple_text' && selectedArchetype?.id !== 'carousel' && (
                                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-white/5 shadow-sm space-y-5">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {selectedArchetype?.id === 'media_message' ? 'Header (Required Media)' : 'Header (Optional)'}
                                        </h3>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Header Type</label>
                                            <div className="flex gap-2">
                                                {(selectedArchetype?.id === 'media_message'
                                                    ? ['IMAGE', 'VIDEO', 'DOCUMENT']
                                                    : ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']
                                                ).map(type => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, headerType: type });
                                                            if (type !== 'TEXT') setHeaderVariables({});
                                                        }}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formData.headerType === type
                                                            ? 'bg-primary text-white'
                                                            : 'bg-slate-100 dark:bg-background-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {formData.headerType === 'TEXT' && (
                                            <div className="animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex justify-between items-end mb-2">
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Header Text</label>
                                                    <span className="text-xs text-slate-400 font-mono">{formData.headerContent.length}/60</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={formData.headerContent}
                                                    onChange={handleHeaderContentChange}
                                                    maxLength={60}
                                                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                                    placeholder="E.g. Summer Sale, Check out {{1}}"
                                                />
                                                <p className="text-xs text-slate-500 dark:text-text-secondary mt-1.5 flex items-center gap-1">
                                                    Header text can only contain exactly ONE variable.
                                                </p>

                                                {/* Header Variables Sample Field */}
                                                {Object.keys(headerVariables).length > 0 && (
                                                    <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Header Sample Values</h4>
                                                        {Object.keys(headerVariables).map(num => (
                                                            <div key={`head-var-${num}`} className="flex items-center gap-3 mb-2 last:mb-0">
                                                                <span className="bg-primary/10 text-primary font-mono px-3 py-2 rounded-lg text-sm font-bold shrink-0">{`{{${num}}}`}</span>
                                                                <input
                                                                    type="text"
                                                                    placeholder={`Sample for {{${num}}}`}
                                                                    value={headerVariables[num]}
                                                                    onChange={(e) => setHeaderVariables({ ...headerVariables, [num]: e.target.value })}
                                                                    className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all shadow-sm"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {(formData.headerType === 'IMAGE' || formData.headerType === 'VIDEO' || formData.headerType === 'DOCUMENT') && (
                                            <div className="animate-in slide-in-from-top-2 duration-200 p-8 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 text-center">
                                                <div className="bg-primary/10 text-primary p-3 rounded-full mb-3">
                                                    <ImageIcon className="w-6 h-6" />
                                                </div>
                                                <h4 className="text-slate-900 dark:text-white font-semibold mb-1">
                                                    {formData.headerFile ? formData.headerFile.name : `Upload ${formData.headerType.toLowerCase()} header`}
                                                </h4>
                                                <p className="text-sm text-slate-500 dark:text-text-secondary">Click or drag a file here to upload to Meta's servers.</p>
                                                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                                    {formData.headerType === 'IMAGE' ? 'Supported: JPG, PNG (Max 5MB)' : formData.headerType === 'VIDEO' ? 'Supported: MP4 (Max 16MB)' : 'Supported: PDF (Max 100MB)'}
                                                </p>

                                                <input
                                                    type="file"
                                                    id="header-media-upload"
                                                    className="hidden"
                                                    accept={formData.headerType === 'IMAGE' ? 'image/jpeg, image/png, image/jpg' : formData.headerType === 'VIDEO' ? 'video/mp4' : 'application/pdf'}
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) setFormData({ ...formData, headerFile: file });
                                                    }}
                                                />
                                                <label
                                                    htmlFor="header-media-upload"
                                                    className="mt-4 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold hover:border-primary transition-colors cursor-pointer inline-block"
                                                >
                                                    {formData.headerFile ? 'Change File' : 'Select File'}
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Message Content Section (Standard) */}
                                {selectedArchetype?.id !== 'carousel' && (
                                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-white/5 shadow-sm space-y-6 flex-1">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            2. Message Content
                                        </h3>

                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Body Text *</label>
                                                <span className="text-xs text-slate-400 font-mono">{formData.content.length}/1024</span>
                                            </div>

                                            <div className="relative">
                                                <textarea
                                                    required
                                                    value={formData.content}
                                                    onChange={handleContentChange}
                                                    rows={5}
                                                    maxLength={1024}

                                                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-all"
                                                    placeholder={selectedArchetype?.id === 'authentication'
                                                        ? 'Your verification code is {{1}}.'
                                                        : 'Hello {{1}}, check out our new offers!'}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-2">
                                                Use <code className="bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-primary">{'{{1}}'}</code>, <code className="bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-primary">{'{{2}}'}</code> to insert dynamic variables. Variables support bold (*text*), italic (_text_), and strikethrough (~text~).
                                            </p>

                                            {/* Dynamic Body Variables Inputs */}
                                            {Object.keys(bodyVariables).length > 0 && (
                                                <div className="mt-4 p-4 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 animate-in fade-in duration-300">
                                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Sample Values for Meta Approval</h4>
                                                    <p className="text-xs text-slate-500 mb-4">Meta requires realistic sample data for every variable you use.</p>

                                                    <div className="flex flex-col gap-3">
                                                        {Object.keys(bodyVariables).map((num) => (
                                                            <div key={`body-var-${num}`} className="flex items-center gap-3">
                                                                <span className="bg-primary/10 text-primary font-mono px-3 py-2 rounded-lg text-sm font-bold shrink-0">{`{{${num}}}`}</span>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    placeholder={`Sample for {{${num}}}`}
                                                                    value={bodyVariables[num]}
                                                                    onChange={(e) => setBodyVariables({ ...bodyVariables, [num]: e.target.value })}
                                                                    className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all shadow-sm"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Section (Optional) */}
                                        <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Footer Text (Optional)</label>
                                                <span className="text-xs text-slate-400 font-mono">{(formData.footer || '').length}/60</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.footer}
                                                onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                                                maxLength={60}
                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                                placeholder="Reply STOP to unsubscribe."
                                            />
                                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1.5 flex items-center gap-1">
                                                Footers appear in small, grey text at the bottom. No variables or links allowed.
                                            </p>
                                        </div>

                                    </div>
                                )}

                                {/* Buttons Section (Optional) */}
                                {selectedArchetype?.id !== 'authentication' && selectedArchetype?.id !== 'carousel' && (
                                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                                        <div className="flex justify-between items-center bg-slate-50 dark:bg-background-dark p-3 rounded-xl border border-slate-200 dark:border-white/10">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Interactive Buttons</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">Add up to 3 buttons. Cannot mix Quick Replies with CTA buttons.</p>
                                            </div>

                                            {/* Button Config Dropdown */}
                                            <div className="flex items-center">
                                                <select
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            handleAddButton(e.target.value);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    className="px-3 py-2 text-sm font-bold bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg hover:border-primary transition-colors outline-none cursor-pointer"
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>+ Add a button</option>

                                                    <optgroup label="Quick Replies">
                                                        <option
                                                            value="QUICK_REPLY"
                                                            disabled={formData.buttons.length >= 3 || formData.buttons.some(b => b.type !== 'QUICK_REPLY')}
                                                        >
                                                            Custom Quick Reply
                                                        </option>
                                                    </optgroup>

                                                    <optgroup label="Call to Action">
                                                        <option
                                                            value="URL"
                                                            disabled={formData.buttons.length >= 3 || formData.buttons.some(b => b.type === 'QUICK_REPLY') || formData.buttons.filter(b => b.type === 'URL').length >= 2}
                                                        >
                                                            Visit Website
                                                        </option>
                                                        <option
                                                            value="PHONE_NUMBER"
                                                            disabled={formData.buttons.length >= 3 || formData.buttons.some(b => b.type === 'QUICK_REPLY') || formData.buttons.some(b => b.type === 'PHONE_NUMBER')}
                                                        >
                                                            Call Phone Number
                                                        </option>
                                                    </optgroup>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Render active buttons */}
                                        <div className="space-y-4">
                                            {formData.buttons.map((btn, idx) => (
                                                <div key={`btn-${idx}`} className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark relative animate-in slide-in-from-top-2 shadow-sm">
                                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                                        <div className="p-1.5 bg-slate-100 dark:bg-white/5 rounded-md">
                                                            {btn.type === 'QUICK_REPLY' && <MousePointerClick className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                                                            {btn.type === 'URL' && <Link className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                                                            {btn.type === 'PHONE_NUMBER' && <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                            {btn.type === 'QUICK_REPLY' ? 'Quick Reply Button' : btn.type === 'URL' ? 'Visit Website Button' : 'Call Phone Button'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Button Text</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder={btn.type === 'QUICK_REPLY' ? 'e.g. Yes, please!' : btn.type === 'URL' ? 'e.g. Visit Website' : 'e.g. Call Us'}
                                                                value={btn.text}
                                                                onChange={(e) => handleButtonChange(idx, 'text', e.target.value)}
                                                                maxLength={25}
                                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                            />
                                                        </div>
                                                        {btn.type === 'URL' && (
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Website URL</label>
                                                                <div className="flex gap-2">
                                                                    <select className="bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-xs text-slate-600 dark:text-slate-300 outline-none w-28 shrink-0">
                                                                        <option value="STATIC">Static URL</option>
                                                                    </select>
                                                                    <input
                                                                        type="url"
                                                                        required
                                                                        placeholder="https://example.com"
                                                                        value={btn.url}
                                                                        onChange={(e) => handleButtonChange(idx, 'url', e.target.value)}
                                                                        className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {btn.type === 'PHONE_NUMBER' && (
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Phone Number</label>
                                                                <input
                                                                    type="tel"
                                                                    required
                                                                    placeholder="+1 (555) 000-0000"
                                                                    value={btn.phoneNumber}
                                                                    onChange={(e) => handleButtonChange(idx, 'phoneNumber', e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Carousel Cards Section */}
                                {selectedArchetype?.id === 'carousel' && (
                                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-white/5 shadow-sm space-y-5">
                                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                3. Carousel Cards ({formData.cards.length}/10)
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (formData.cards.length < 10) {
                                                        const baseButtons = formData.cards[0]?.buttons || [];
                                                        const newBtns = baseButtons.map(b => ({ type: b.type, text: '', url: '', phoneNumber: '' }));
                                                        const newCards = [...formData.cards, { headerType: 'IMAGE', headerContent: '', content: '', buttons: newBtns }];
                                                        setFormData({ ...formData, cards: newCards });
                                                        setActiveCardIndex(newCards.length - 1);
                                                    } else {
                                                        showToast({ type: 'error', title: 'Limit Reached', message: 'Max 10 cards allowed.' });
                                                    }
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg hover:border-primary transition-colors flex items-center gap-1 shrink-0"
                                            >
                                                <Plus className="w-3 h-3" /> Add Card
                                            </button>
                                        </div>

                                        {/* Tabs / Scroller for Cards */}
                                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                            {formData.cards.map((_, idx) => (
                                                <button
                                                    key={`card-tab-${idx}`}
                                                    type="button"
                                                    onClick={() => setActiveCardIndex(idx)}
                                                    className={`px-4 py-2 shrink-0 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeCardIndex === idx
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                                                        }`}
                                                >
                                                    Card {idx + 1}
                                                    {formData.cards.length > 2 && (
                                                        <div
                                                            className={`p-1 rounded-full hover:bg-black/20 ${activeCardIndex === idx ? 'text-white' : 'text-slate-400'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newCards = [...formData.cards];
                                                                newCards.splice(idx, 1);
                                                                setFormData({ ...formData, cards: newCards });
                                                                if (activeCardIndex >= newCards.length) {
                                                                    setActiveCardIndex(newCards.length - 1);
                                                                }
                                                            }}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Configuration for the ACTIVE card */}
                                        {formData.cards[activeCardIndex] && (
                                            <div className="animate-in fade-in slide-in-from-top-2 p-4 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-background-dark">

                                                {/* Card Header (Image/Video) */}
                                                <div className="mb-4">
                                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Card Media</label>
                                                    <label htmlFor={`card-media-upload-${activeCardIndex}`} className="p-6 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl flex flex-col items-center justify-center bg-white dark:bg-white/5 text-center transition-colors hover:border-primary cursor-pointer cursor-pointer">
                                                        <div className="bg-primary/10 text-primary p-2 rounded-full mb-3">
                                                            <ImageIcon className="w-5 h-5" />
                                                        </div>
                                                        <h4 className="text-slate-900 dark:text-white text-sm font-semibold">
                                                            {formData.cards[activeCardIndex].mediaFile ? formData.cards[activeCardIndex].mediaFile.name : 'Upload Card Image/Video'}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Supported: JPG, PNG, MP4</p>
                                                        <input
                                                            type="file"
                                                            id={`card-media-upload-${activeCardIndex}`}
                                                            className="hidden"
                                                            accept="image/jpeg, image/png, image/jpg, video/mp4"
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    const newCards = [...formData.cards];
                                                                    newCards[activeCardIndex].mediaFile = file;
                                                                    setFormData({ ...formData, cards: newCards });
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>

                                                {/* Card Body */}
                                                <div className="mb-4">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Card Body Text</label>
                                                        <span className="text-[10px] text-slate-400 font-mono">{(formData.cards[activeCardIndex].content || '').length}/160</span>
                                                    </div>
                                                    <textarea
                                                        value={formData.cards[activeCardIndex].content}
                                                        onChange={(e) => {
                                                            const newCards = [...formData.cards];
                                                            newCards[activeCardIndex].content = e.target.value;
                                                            setFormData({ ...formData, cards: newCards });
                                                        }}
                                                        rows={2}
                                                        maxLength={160}
                                                        placeholder="Short description for this card..."
                                                        className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary outline-none resize-none transition-all"
                                                    />
                                                </div>

                                                {/* Card Buttons */}
                                                <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                                                    <div className="flex justify-between items-center bg-slate-50 dark:bg-background-dark p-3 rounded-xl border border-slate-200 dark:border-white/10">
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Interactive Buttons</h4>
                                                            <p className="text-xs text-slate-500 mt-0.5">Meta requires button consistency across all cards.</p>
                                                        </div>

                                                        {/* Button Config Dropdown */}
                                                        <div className="flex items-center">
                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        handleAddCardButton(activeCardIndex, e.target.value);
                                                                        e.target.value = '';
                                                                    }
                                                                }}
                                                                className="px-3 py-2 text-sm font-bold bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg hover:border-primary transition-colors outline-none cursor-pointer"
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>+ Add a button</option>

                                                                <optgroup label="Quick Replies">
                                                                    <option
                                                                        value="QUICK_REPLY"
                                                                        disabled={formData.cards[activeCardIndex].buttons.length >= 3 || formData.cards[activeCardIndex].buttons.some(b => b.type !== 'QUICK_REPLY')}
                                                                    >
                                                                        Custom Quick Reply
                                                                    </option>
                                                                </optgroup>

                                                                <optgroup label="Call to Action">
                                                                    <option
                                                                        value="URL"
                                                                        disabled={formData.cards[activeCardIndex].buttons.length >= 3 || formData.cards[activeCardIndex].buttons.some(b => b.type === 'QUICK_REPLY') || formData.cards[activeCardIndex].buttons.filter(b => b.type === 'URL').length >= 2}
                                                                    >
                                                                        Visit Website
                                                                    </option>
                                                                    <option
                                                                        value="PHONE_NUMBER"
                                                                        disabled={formData.cards[activeCardIndex].buttons.length >= 3 || formData.cards[activeCardIndex].buttons.some(b => b.type === 'QUICK_REPLY') || formData.cards[activeCardIndex].buttons.some(b => b.type === 'PHONE_NUMBER')}
                                                                    >
                                                                        Call Phone Number
                                                                    </option>
                                                                </optgroup>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Render active CARD buttons */}
                                                    <div className="space-y-4">
                                                        {formData.cards[activeCardIndex].buttons.map((btn, idx) => (
                                                            <div key={`card-btn-${idx}`} className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark relative animate-in slide-in-from-top-2 shadow-sm">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveCardButton(activeCardIndex, idx)}
                                                                    className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                                                    <div className="p-1.5 bg-slate-100 dark:bg-white/5 rounded-md">
                                                                        {btn.type === 'QUICK_REPLY' && <MousePointerClick className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                                                                        {btn.type === 'URL' && <Link className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                                                                        {btn.type === 'PHONE_NUMBER' && <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                                                                    </div>
                                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                                        {btn.type === 'QUICK_REPLY' ? 'Quick Reply Button' : btn.type === 'URL' ? 'Visit Website Button' : 'Call Phone Button'}
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Button Text</label>
                                                                        <input
                                                                            type="text"
                                                                            required
                                                                            placeholder={btn.type === 'QUICK_REPLY' ? 'e.g. Yes, please!' : btn.type === 'URL' ? 'e.g. Visit Website' : 'e.g. Call Us'}
                                                                            value={btn.text}
                                                                            onChange={(e) => handleCardButtonChange(activeCardIndex, idx, 'text', e.target.value)}
                                                                            maxLength={25}
                                                                            className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                                        />
                                                                    </div>
                                                                    {btn.type === 'URL' && (
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Website URL</label>
                                                                            <div className="flex gap-2">
                                                                                <select className="bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-xs text-slate-600 dark:text-slate-300 outline-none w-28 shrink-0">
                                                                                    <option value="STATIC">Static URL</option>
                                                                                </select>
                                                                                <input
                                                                                    type="url"
                                                                                    required
                                                                                    placeholder="https://example.com"
                                                                                    value={btn.url}
                                                                                    onChange={(e) => handleCardButtonChange(activeCardIndex, idx, 'url', e.target.value)}
                                                                                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {btn.type === 'PHONE_NUMBER' && (
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Phone Number</label>
                                                                            <input
                                                                                type="tel"
                                                                                required
                                                                                placeholder="+1 (555) 000-0000"
                                                                                value={btn.phoneNumber}
                                                                                onChange={(e) => handleCardButtonChange(activeCardIndex, idx, 'phoneNumber', e.target.value)}
                                                                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        )}
                    </div>

                    {/* Right Pane (Live Preview) - Sticky */}
                    {step === 2 && (
                        <div className="w-full md:w-[340px] lg:w-[380px] shrink-0 border-l border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#111B21] flex flex-col items-center py-6 px-4 h-full overflow-y-auto">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
                                Live Preview
                            </h3>

                            {/* WhatsApp Phone Mockup */}
                            <div className="relative w-full max-w-[320px] aspect-[9/19] bg-[#EFEAE2] dark:bg-[#0b141a] rounded-[2.5rem] border-[8px] border-slate-800 dark:border-slate-900 shadow-2xl overflow-hidden flex flex-col">
                                {/* Status Bar Mock */}
                                <div className="h-6 w-full bg-emerald-600 dark:bg-[#202c33] shrink-0 flex justify-center">
                                    <div className="w-32 h-4 bg-slate-800 dark:bg-slate-900 rounded-b-xl"></div>
                                </div>
                                {/* WhatsApp Header Mock */}
                                <div className="h-14 bg-emerald-600 dark:bg-[#202c33] flex items-center px-4 gap-3 shrink-0 shadow-sm z-10">
                                    <div className="w-8 h-8 rounded-full bg-white/20"></div>
                                    <div className="flex-1">
                                        <div className="h-3.5 w-24 bg-white/90 rounded-full mb-1"></div>
                                        <div className="h-2 w-16 bg-white/60 rounded-full"></div>
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div className="flex-1 p-3 overflow-y-auto whatsapp-bg flex flex-col gap-2">
                                    <div className="text-[10px] text-center text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-[#182229]/80 rounded-lg px-2 py-1 mx-auto w-fit mb-2 shadow-sm backdrop-blur-sm">
                                        Today
                                    </div>

                                    {/* Fake Template Message Bubble */}
                                    {formData.content ? (
                                        <div className="bg-white dark:bg-[#202c33] rounded-xl rounded-tl-sm p-1.5 shadow-sm max-w-[85%] self-start relative group">
                                            {/* Standard Preview Bubble */}
                                            {selectedArchetype?.id !== 'carousel' && (
                                                <>
                                                    {/* Preview Header Space (If Any) */}
                                                    {formData.headerType === 'TEXT' && formData.headerContent && (
                                                        <div className="px-2 pt-1 pb-0.5 text-[13.5px] font-bold text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words">
                                                            {getPreviewText(formData.headerContent, headerVariables)}
                                                        </div>
                                                    )}
                                                    {(formData.headerType === 'IMAGE' || formData.headerType === 'VIDEO') && (
                                                        <div className="w-full aspect-video bg-slate-200 dark:bg-white/5 rounded-lg mb-2 flex items-center justify-center">
                                                            <ImageIcon className="w-6 h-6 text-slate-400" />
                                                        </div>
                                                    )}
                                                    {formData.headerType === 'DOCUMENT' && (
                                                        <div className="w-full h-12 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-2 flex items-center px-3 gap-2">
                                                            <div className="bg-rose-500 text-white p-1 rounded"><ShieldCheck className="w-3 h-3" /></div>
                                                            <span className="text-xs text-rose-500 font-semibold truncate">Document.pdf</span>
                                                        </div>
                                                    )}

                                                    {/* Preview Body Text */}
                                                    <div className="px-2 py-1 text-[13.5px] leading-relaxed text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words">
                                                        {formData.content ? (
                                                            getPreviewText(formData.content, bodyVariables)
                                                        ) : (
                                                            <span className="text-slate-400 italic">Your message will appear here...</span>
                                                        )}
                                                        <div className="float-right mt-2 ml-2 -mr-1 flex items-center text-[10px] text-slate-400 dark:text-white/40 group-hover:opacity-100 transition-opacity">
                                                            10:42 AM <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-sky-500" />
                                                        </div>
                                                        <div className="clear-both"></div>
                                                    </div>

                                                    {/* Preview Footer */}
                                                    {formData.footer && (
                                                        <div className="px-2 pb-1 mt-1 text-[11px] text-slate-400 dark:text-white/40">
                                                            {formData.footer}
                                                        </div>
                                                    )}

                                                    {/* Preview Buttons */}
                                                    {formData.buttons && formData.buttons.length > 0 && (
                                                        <div className="border-t border-slate-100 dark:border-white/5 mt-1 flex flex-col w-full relative -left-1.5 w-[calc(100%+12px)]">
                                                            {formData.buttons.map((btn, i) => (
                                                                <div key={`prev-btn-${i}`} className={`py-2.5 flex justify-center items-center text-[#00a884] text-[14px] font-medium ${i < formData.buttons.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                                                                    {btn.type === 'URL' && <Link className="w-4 h-4 mr-1.5" />}
                                                                    {btn.type === 'PHONE_NUMBER' && <Phone className="w-4 h-4 mr-1.5" />}
                                                                    {btn.text || <span className="text-[#00a884]/50 italic">Button Text</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Carousel Preview Structure */}
                                            {selectedArchetype?.id === 'carousel' && (
                                                <div className="flex flex-col gap-2 w-full max-w-full">
                                                    {/* Master Message Bubble */}
                                                    <div className="bg-white dark:bg-[#202c33] rounded-xl rounded-tl-sm p-2 shadow-sm max-w-[85%] self-start relative">
                                                        <div className="px-1 text-[13.5px] leading-relaxed text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words">
                                                            {formData.content ? (
                                                                getPreviewText(formData.content, bodyVariables)
                                                            ) : (
                                                                <span className="text-slate-400 italic">Your master message...</span>
                                                            )}
                                                            <div className="float-right mt-2 ml-2 -mr-1 flex items-center text-[10px] text-slate-400 dark:text-white/40">
                                                                10:42 AM <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-sky-500" />
                                                            </div>
                                                            <div className="clear-both"></div>
                                                        </div>
                                                    </div>

                                                    {/* Scrolling Cards Container */}
                                                    <div className="flex gap-2 overflow-x-auto pb-2 snap-x custom-scrollbar">
                                                        {formData.cards.map((card, i) => (
                                                            <div key={`prev-card-${i}`} className="snap-center shrink-0 w-[80%] bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                                                {/* Card Media Header */}
                                                                <div className="w-full aspect-[1.91/1] bg-slate-200 dark:bg-white/5 flex items-center justify-center border-b border-slate-100 dark:border-white/5">
                                                                    <ImageIcon className="w-6 h-6 text-slate-400" />
                                                                </div>

                                                                {/* Card Body */}
                                                                <div className="p-2.5 text-[13.5px] leading-relaxed text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-all overflow-hidden min-h-[60px]">
                                                                    {card.content || <span className="text-slate-400 italic text-[12px]">Card description...</span>}
                                                                </div>

                                                                {/* Displaying mockup buttons to visualize the card layout */}
                                                                <div className="mt-auto border-t border-slate-100 dark:border-white/5 w-full flex flex-col">
                                                                    {card.buttons?.length > 0 ? (
                                                                        card.buttons.map((btn, btnIdx) => (
                                                                            <div key={btnIdx} className={`py-2.5 flex justify-center items-center gap-1.5 text-[#00a884] text-[13px] font-medium w-full ${btnIdx < card.buttons.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                                                                                {btn.type === 'URL' && <Link className="w-3.5 h-3.5" />}
                                                                                {btn.type === 'PHONE_NUMBER' && <Phone className="w-3.5 h-3.5" />}
                                                                                {btn.type === 'QUICK_REPLY' && <MousePointerClick className="w-3.5 h-3.5 text-[#00a884]/60" />}
                                                                                <span className="truncate max-w-[80%]">{btn.text || <span className="text-[#00a884]/50 italic text-[11px]">Button Text</span>}</span>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="py-2.5 flex justify-center items-center text-[#00a884] text-[13px] font-medium w-full">
                                                                            <span className="text-[#00a884]/40 italic text-[11px]">No buttons added</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {/* Spacer so last card doesn't hug the right edge dangerously */}
                                                        <div className="shrink-0 w-2"></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Fallback empty state */
                                        (!formData.content && !formData.cards?.[0]?.content) && (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm italic py-4">
                                                Start typing to preview
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-transparent shrink-0 flex justify-between items-center backdrop-blur-sm">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-text-secondary font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>

                    {step === 1 ? (
                        <button
                            onClick={handleNext}
                            disabled={!selectedArchetype}
                            className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            Next Step <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            form="template-form"
                            type="submit"
                            disabled={isSubmitting || !formData.content}
                            className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>Submit for Approval <Check className="w-4 h-4" /></>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateTemplateModal;
