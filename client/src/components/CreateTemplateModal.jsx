import React, { useState, useEffect, useRef } from 'react';
import {
    X, ArrowLeft, ArrowRight, Check, Image as ImageIcon,
    MessageSquare, Link, MousePointerClick, ShieldCheck,
    Smartphone, CheckCircle2, AlertCircle, Plus, Trash2, Phone, Zap, Sparkles
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

const CreateTemplateModal = ({ isOpen, onClose, onSuccess, showToast, initialDraft }) => {
    const [step, setStep] = useState(1);
    const [selectedArchetype, setSelectedArchetype] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhancingSection, setEnhancingSection] = useState(null);
    const [enhancedSuccess, setEnhancedSuccess] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

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

    // Object URL management for live preview — auto revoke on change/unmount
    const [headerPreviewUrl, setHeaderPreviewUrl] = useState(null);
    const headerUrlRef = useRef(null);
    useEffect(() => {
        if (formData.headerFile) {
            const url = URL.createObjectURL(formData.headerFile);
            setHeaderPreviewUrl(url);
            headerUrlRef.current = url;
            return () => URL.revokeObjectURL(url);
        } else {
            setHeaderPreviewUrl(null);
        }
    }, [formData.headerFile]);

    // Card preview URLs — one per card
    const [cardPreviewUrls, setCardPreviewUrls] = useState([]);
    useEffect(() => {
        const urls = formData.cards.map(card => card.mediaFile ? URL.createObjectURL(card.mediaFile) : null);
        setCardPreviewUrls(urls);
        return () => urls.forEach(u => u && URL.revokeObjectURL(u));
    }, [formData.cards.map(c => c.mediaFile).join(',')]);

    const handleEnhanceAI = async (textToEnhance, type = 'content', cardIndex = -1) => {
        const sectionId = type === 'content' ? 'content' : `card-content-${cardIndex}`;
        if (!textToEnhance?.trim()) return showToast({ type: 'error', title: 'Error', message: 'Please enter some text to enhance first.' });
        
        setIsEnhancing(true);
        setEnhancingSection(sectionId);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/templates/enhance-ai`, 
                { text: textToEnhance }
            );
            
            const enhancedText = res.data.enhancedText;
            showToast({ type: 'success', title: 'AI Enhancement', message: `Text optimized! Used ${res.data.tokensDeducted} AI Tokens.` });
            
            if (type === 'content') {
                setFormData(prev => ({ ...prev, content: enhancedText }));
                // update body variables
                const vars = extractVariables(enhancedText);
                setBodyVariables(prev => {
                    const next = {};
                    vars.forEach(v => { next[v] = prev[v] || ''; });
                    return next;
                });
            } else if (type === 'card-content' && cardIndex >= 0) {
                const newCards = [...formData.cards];
                newCards[cardIndex].content = enhancedText;
                setFormData(prev => ({ ...prev, cards: newCards }));
            }
            
            setEnhancedSuccess(sectionId);
            setTimeout(() => setEnhancedSuccess(null), 2500);

        } catch (err) {
            console.error("AI Enhance Error:", err);
            showToast({ type: 'error', title: 'AI Error', message: err.response?.data?.error || 'Failed to enhance text.' });
        } finally {
            setIsEnhancing(false);
            setEnhancingSection(null);
        }
    };

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsSubmitting(false);
            setValidationErrors({}); // Always clear errors when modal opens
            if (initialDraft) {
                // Set the mapped archetype
                const matchingArchetype = TEMPLATE_ARCHETYPES.find(a => a.id === initialDraft.archetype) || TEMPLATE_ARCHETYPES[0];
                setSelectedArchetype(matchingArchetype);
                
                // Hydrate Form Data
                setFormData({
                    name: initialDraft.name || '',
                    category: initialDraft.category || 'MARKETING',
                    language: initialDraft.language || 'en_US',
                    content: initialDraft.content || '',
                    footer: initialDraft.footer || '',
                    headerType: initialDraft.headerType || 'NONE',
                    headerContent: initialDraft.headerContent || '',
                    buttons: initialDraft.buttons || [],
                    cards: initialDraft.cards || []
                });
                
                // Hydrate Body Variables
                setBodyVariables(initialDraft.bodyVariables || {});
                setHeaderVariables({});
                setActiveCardIndex(0);
                
                // Auto-advance to Step 2
                setStep(2);
            } else {
                setStep(1);
                setSelectedArchetype(null);
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
        }
    }, [isOpen, initialDraft]);

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
        // Meta limits: Max 3 Quick Replies, Max 1 Phone, Max 2 URL, Max 1 COPY_CODE
        const currentQRs = formData.buttons.filter(b => b.type === 'QUICK_REPLY').length;
        const currentURLs = formData.buttons.filter(b => b.type === 'URL').length;
        const currentPhones = formData.buttons.filter(b => b.type === 'PHONE_NUMBER').length;
        const currentCopyCodes = formData.buttons.filter(b => b.type === 'COPY_CODE').length;

        if (type === 'QUICK_REPLY' && currentQRs >= 10) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 10 Quick Replies allowed.' });
        if (type === 'URL' && currentURLs >= 2) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 2 URL buttons allowed.' });
        if (type === 'PHONE_NUMBER' && currentPhones >= 1) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 1 Phone button allowed.' });
        if (type === 'COPY_CODE' && currentCopyCodes >= 1) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 1 Copy Code button allowed.' });

        const newBtn = { type, text: type === 'COPY_CODE' ? 'Copy offer code' : '', url: '', phoneNumber: '', couponCode: '' };
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
        const currentCopyCodes = cardClass.buttons.filter(b => b.type === 'COPY_CODE').length;

        if (type === 'QUICK_REPLY' && currentQRs >= 3) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 3 Quick Replies allowed.' });
        if (type === 'URL' && currentURLs >= 2) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 2 URL buttons allowed.' });
        if (type === 'PHONE_NUMBER' && currentPhones >= 1) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 1 Phone button allowed.' });
        if (type === 'COPY_CODE' && currentCopyCodes >= 1) return showToast({ type: 'error', title: 'Limit Reached', message: 'Max 1 Copy Code button allowed.' });

        const newBtn = { type, text: type === 'COPY_CODE' ? 'Copy offer code' : '', url: '', phoneNumber: '', couponCode: '' };
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
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/templates/upload`, fd, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            }
        });
        return res.data.handle;
    };

    const validateForm = () => {
        const errors = {};
        const isCarousel = selectedArchetype?.id === 'carousel';

        // 1. Template Name
        if (!formData.name.trim()) errors.name = 'Template name is required.';

        // 2. Body text (not required for carousel since each card has its own)
        if (!isCarousel && !formData.content.trim()) errors.content = 'Message body text is required.';

        // 3. Body Variables - all sample values must be filled
        const unfilledVars = Object.entries(bodyVariables).filter(([, v]) => !v.trim());
        if (unfilledVars.length > 0) errors.bodyVariables = `Please fill in sample values for: ${unfilledVars.map(([k]) => `{{${k}}}`).join(', ')}`;

        // 4. Header media upload required
        if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.headerType) && !formData.headerFile) {
            const typeLabel = formData.headerType === 'IMAGE' ? 'image (JPG/PNG)' : formData.headerType === 'VIDEO' ? 'video (MP4)' : 'document (PDF)';
            errors.headerMedia = `Please upload a ${typeLabel} for the header. Meta requires a real media file.`;
        }

        // 5. Header TEXT content required
        if (formData.headerType === 'TEXT' && !formData.headerContent.trim()) {
            errors.headerContent = 'Header text cannot be empty.';
        }

        // 6. Button validation
        const btnErrors = [];
        formData.buttons.forEach((btn, i) => {
            if (!btn.text.trim()) btnErrors.push(`Button ${i + 1}: Label text is required.`);
            if (btn.type === 'URL' && !btn.url.trim()) btnErrors.push(`Button ${i + 1}: URL is required.`);
            if (btn.type === 'PHONE_NUMBER' && !btn.phoneNumber.trim()) btnErrors.push(`Button ${i + 1}: Phone number is required.`);
            if (btn.type === 'COPY_CODE' && !btn.couponCode?.trim()) btnErrors.push(`Button ${i + 1}: Coupon code is required.`);
        });
        if (btnErrors.length > 0) errors.buttons = btnErrors.join(' ');

        // 7. Carousel card validation
        if (isCarousel) {
            const cardErrors = [];
            formData.cards.forEach((card, i) => {
                if (!card.content.trim()) cardErrors.push(`Card ${i + 1}: Body text is required.`);
                if (['IMAGE', 'VIDEO'].includes(card.headerType) && !card.mediaFile) {
                    cardErrors.push(`Card ${i + 1}: Media upload is required.`);
                }
                card.buttons.forEach((btn, bi) => {
                    if (!btn.text.trim()) cardErrors.push(`Card ${i + 1}, Button ${bi + 1}: Label is required.`);
                    if (btn.type === 'URL' && !btn.url.trim()) cardErrors.push(`Card ${i + 1}, Button ${bi + 1}: URL is required.`);
                    if (btn.type === 'PHONE_NUMBER' && !btn.phoneNumber.trim()) cardErrors.push(`Card ${i + 1}, Button ${bi + 1}: Phone number is required.`);
                    if (btn.type === 'COPY_CODE' && !btn.couponCode?.trim()) cardErrors.push(`Card ${i + 1}, Button ${bi + 1}: Coupon code is required.`);
                });
            });
            if (cardErrors.length > 0) errors.cards = cardErrors;
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Run inline validation first
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            // Scroll to top of the form to show first error
            document.querySelector('#template-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        setValidationErrors({});
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

            await axios.post(`${import.meta.env.VITE_API_URL}/api/templates`, payload);
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
                        style={{ width: step === 1 ? '50%' : '100%' }}
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
                                                <h4 className={`font-bold text-base mb-2 ${isSelected ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
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
                                {/* Global Validation Error Summary */}
                                {Object.keys(validationErrors).length > 0 && (
                                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/50 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                                        <div className="p-1.5 bg-red-100 dark:bg-red-500/20 rounded-lg shrink-0">
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-red-700 dark:text-red-400">
                                                {Object.keys(validationErrors).length} issue{Object.keys(validationErrors).length > 1 ? 's' : ''} need your attention
                                            </p>
                                            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                                                Review the highlighted sections below and fill in all required fields before submitting.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {/* Basic Info Section */}
                                <div className={`bg-white dark:bg-surface-dark rounded-2xl p-5 md:p-6 border shadow-sm space-y-5 transition-colors ${validationErrors.name ? 'border-red-400 dark:border-red-500/60' : 'border-slate-200 dark:border-white/5'}`}>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        1. Basic Details
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Template Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => { setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }); if (validationErrors.name) setValidationErrors(p => ({ ...p, name: undefined })); }}
                                            className={`w-full bg-slate-50 dark:bg-background-dark border rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 outline-none transition-all ${validationErrors.name ? 'border-red-400 dark:border-red-500 focus:border-red-400 focus:ring-red-400/30' : 'border-slate-200 dark:border-white/10 focus:border-primary focus:ring-primary'}`}
                                            placeholder="e.g. summer_sale_promo"
                                        />
                                        {validationErrors.name && (
                                            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {validationErrors.name}
                                            </p>
                                        )}
                                        {!validationErrors.name && (
                                        <p className="text-xs text-slate-500 dark:text-text-secondary mt-1.5 flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> Lowercase letters, numbers, and underscores only.
                                        </p>
                                        )}
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
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleEnhanceAI(formData.content, 'content')} disabled={isEnhancing && enhancingSection !== 'content'} className={`relative flex items-center gap-1.5 text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-2 py-1 rounded-md font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all duration-300 disabled:opacity-50 ${enhancingSection === 'content' ? 'shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105 border-indigo-400 dark:border-indigo-400 overflow-hidden' : ''}`} type="button">
                                                        {enhancingSection === 'content' && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_1.5s_infinite]"></div>}
                                                        <Sparkles className={`w-3 h-3 ${enhancingSection === 'content' ? 'animate-spin text-amber-500' : ''}`} /> 
                                                        {enhancingSection === 'content' ? 'Enhancing...' : 'Enhance with AI'}
                                                    </button>
                                                    <span className="text-xs text-slate-400 font-mono">{formData.content.length}/1024</span>
                                                </div>
                                            </div>
                                            <div className={`transition-all duration-500 ${enhancedSuccess === 'content' ? 'ring-4 ring-indigo-500/50 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]' : ''}`}>
                                                <textarea
                                                    required
                                                    value={formData.content}
                                                    onChange={handleContentChange}
                                                    rows={3}
                                                    maxLength={1024}
                                                    className={`w-full bg-slate-50 dark:bg-background-dark border ${enhancedSuccess === 'content' ? 'border-transparent' : 'border-slate-200 dark:border-white/10'} rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-all`}
                                                    placeholder="Swipe through our latest collection below!"
                                                />
                                            </div>
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
                                    <div className={`bg-white dark:bg-surface-dark rounded-2xl p-5 md:p-6 border shadow-sm space-y-5 transition-colors ${(validationErrors.headerMedia || validationErrors.headerContent) ? 'border-red-400 dark:border-red-500/60' : 'border-slate-200 dark:border-white/5'}`}>
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
                                                {validationErrors.headerContent && (
                                                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {validationErrors.headerContent}
                                                    </p>
                                                )}

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
                                                        if (!file) return;

                                                        let valid = true;
                                                        let allowedExts = [];
                                                        let maxSizeMB = 0;

                                                        if (formData.headerType === 'IMAGE') {
                                                            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) valid = false;
                                                            allowedExts = ['JPG', 'PNG'];
                                                            maxSizeMB = 5;
                                                        } else if (formData.headerType === 'VIDEO') {
                                                            if (file.type !== 'video/mp4') valid = false;
                                                            allowedExts = ['MP4'];
                                                            maxSizeMB = 16;
                                                        } else if (formData.headerType === 'DOCUMENT') {
                                                            if (file.type !== 'application/pdf') valid = false;
                                                            allowedExts = ['PDF'];
                                                            maxSizeMB = 100;
                                                        }

                                                        if (!valid) {
                                                            showToast({ type: 'error', title: 'Invalid File Type', message: `Meta only allows ${allowedExts.join(', ')} files for this header type.` });
                                                            e.target.value = '';
                                                            return;
                                                        }

                                                        if (file.size > maxSizeMB * 1024 * 1024) {
                                                            showToast({ type: 'error', title: 'File Too Large', message: `Maximum allowed size is ${maxSizeMB}MB.` });
                                                            e.target.value = '';
                                                            return;
                                                        }

                                                        setFormData({ ...formData, headerFile: file });
                                                    }}
                                                />
                                                <label
                                                    htmlFor="header-media-upload"
                                                    className="mt-4 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm font-semibold hover:border-primary transition-colors cursor-pointer inline-block"
                                                >
                                                    {formData.headerFile ? 'Change File' : 'Select File'}
                                                </label>
                                                {validationErrors.headerMedia && (
                                                    <div className="w-full mt-3 flex items-start gap-2 text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
                                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                        <p className="text-xs font-medium">{validationErrors.headerMedia}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Message Content Section (Standard) */}
                                {selectedArchetype?.id !== 'carousel' && (
                                    <div className={`bg-white dark:bg-surface-dark rounded-2xl p-5 md:p-6 border shadow-sm space-y-6 flex-1 transition-colors ${(validationErrors.content || validationErrors.bodyVariables) ? 'border-red-400 dark:border-red-500/60' : 'border-slate-200 dark:border-white/5'}`}>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            2. Message Content
                                        </h3>

                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Body Text *</label>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleEnhanceAI(formData.content, 'content')} disabled={isEnhancing && enhancingSection !== 'content'} className={`relative flex items-center gap-1.5 text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-2 py-1 rounded-md font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all duration-300 disabled:opacity-50 ${enhancingSection === 'content' ? 'shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105 border-indigo-400 dark:border-indigo-400 overflow-hidden' : ''}`} type="button">
                                                        {enhancingSection === 'content' && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_1.5s_infinite]"></div>}
                                                        <Sparkles className={`w-3 h-3 ${enhancingSection === 'content' ? 'animate-spin text-amber-500' : ''}`} /> 
                                                        {enhancingSection === 'content' ? 'Enhancing...' : 'Enhance with AI'}
                                                    </button>
                                                    <span className="text-xs text-slate-400 font-mono">{formData.content.length}/1024</span>
                                                </div>
                                            </div>

                                            <div className={`relative transition-all duration-500 ${enhancedSuccess === 'content' ? 'ring-4 ring-indigo-500/50 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]' : ''}`}>
                                                <textarea
                                                    required
                                                    value={formData.content}
                                                    onChange={(e) => { handleContentChange(e); if (validationErrors.content) setValidationErrors(p => ({ ...p, content: undefined })); }}
                                                    rows={5}
                                                    maxLength={1024}
                                                    className={`w-full bg-slate-50 dark:bg-background-dark border rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 outline-none resize-none transition-all ${enhancedSuccess === 'content' ? 'border-transparent' : validationErrors.content ? 'border-red-400 dark:border-red-500 focus:border-red-400 focus:ring-red-400/30' : 'border-slate-200 dark:border-white/10 focus:border-primary focus:ring-primary'}`}
                                                    placeholder={selectedArchetype?.id === 'authentication'
                                                        ? 'Your verification code is {{1}}.'
                                                        : 'Hello {{1}}, check out our new offers!'}
                                                />
                                            </div>
                                            {validationErrors.content && (
                                                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {validationErrors.content}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-2">
                                                Use <code className="bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-primary">{'{{1}}'}</code>, <code className="bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-primary">{'{{2}}'}</code> to insert dynamic variables. Variables support bold (*text*), italic (_text_), and strikethrough (~text~).
                                            </p>

                                            {/* Dynamic Body Variables Inputs */}
                                            {Object.keys(bodyVariables).length > 0 && (
                                                <div className={`mt-4 p-4 rounded-xl border animate-in fade-in duration-300 ${validationErrors.bodyVariables ? 'bg-red-50 dark:bg-red-500/5 border-red-300 dark:border-red-500/40' : 'bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Sample Values for Meta Approval</h4>
                                                    <p className="text-xs text-slate-500 mb-4">Meta requires realistic sample data for every variable you use.</p>
                                                    {validationErrors.bodyVariables && (
                                                        <div className="flex items-start gap-2 mb-3 text-red-600 dark:text-red-400 text-xs font-semibold">
                                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                            <span>{validationErrors.bodyVariables}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-3">
                                                        {Object.keys(bodyVariables).map((num) => (
                                                            <div key={`body-var-${num}`} className="flex items-center gap-3">
                                                                <span className="bg-primary/10 text-primary font-mono px-3 py-2 rounded-lg text-sm font-bold shrink-0">{`{{${num}}}`}</span>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    placeholder={`Sample for {{${num}}}`}
                                                                    value={bodyVariables[num]}
                                                                    onChange={(e) => { setBodyVariables({ ...bodyVariables, [num]: e.target.value }); if (validationErrors.bodyVariables) setValidationErrors(p => ({ ...p, bodyVariables: undefined })); }}
                                                                    className={`w-full bg-white dark:bg-background-dark border rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all shadow-sm ${!bodyVariables[num]?.trim() && validationErrors.bodyVariables ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-white/10'}`}
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
                                                <p className="text-xs text-slate-500 mt-0.5">Cannot mix Quick Replies with CTA buttons.</p>
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
                                                            disabled={formData.buttons.filter(b => b.type === 'QUICK_REPLY').length >= 10 || formData.buttons.some(b => b.type !== 'QUICK_REPLY')}
                                                        >
                                                            Custom Quick Reply
                                                        </option>
                                                    </optgroup>

                                                    <optgroup label="Call to Action">
                                                        <option
                                                            value="URL"
                                                            disabled={formData.buttons.some(b => b.type === 'QUICK_REPLY') || formData.buttons.filter(b => b.type === 'URL').length >= 2}
                                                        >
                                                            Visit Website
                                                        </option>
                                                        <option
                                                            value="PHONE_NUMBER"
                                                            disabled={formData.buttons.some(b => b.type === 'QUICK_REPLY') || formData.buttons.some(b => b.type === 'PHONE_NUMBER')}
                                                        >
                                                            Call Phone Number
                                                        </option>
                                                        <option
                                                            value="COPY_CODE"
                                                            disabled={formData.buttons.some(b => b.type === 'QUICK_REPLY') || formData.buttons.some(b => b.type === 'COPY_CODE')}
                                                        >
                                                            Copy Code (Coupon)
                                                        </option>
                                                    </optgroup>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Render active buttons */}
                                        <div className="space-y-4">
                                            {formData.buttons.map((btn, idx) => (
                                                <div key={`btn-${idx}`} className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark relative animate-in slide-in-from-top-2 shadow-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveButton(idx)}
                                                        className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                                        <div className={`p-1.5 rounded-md ${btn.type === 'COPY_CODE' ? 'bg-amber-100 dark:bg-amber-500/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                                                            {btn.type === 'QUICK_REPLY' && <MousePointerClick className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                                                            {btn.type === 'URL' && <Link className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                                                            {btn.type === 'PHONE_NUMBER' && <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                                                            {btn.type === 'COPY_CODE' && <Zap className="w-4 h-4 text-amber-500" />}
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                            {btn.type === 'QUICK_REPLY' ? 'Quick Reply Button'
                                                                : btn.type === 'URL' ? 'Visit Website Button'
                                                                : btn.type === 'COPY_CODE' ? '🎟 Copy Code Button'
                                                                : 'Call Phone Button'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Button Label</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder={btn.type === 'QUICK_REPLY' ? 'e.g. Yes, please!' : btn.type === 'URL' ? 'e.g. Visit Website' : btn.type === 'COPY_CODE' ? 'e.g. Copy Offer Code' : 'e.g. Call Us'}
                                                                value={btn.text}
                                                                disabled={btn.type === 'COPY_CODE'}
                                                                onChange={(e) => { handleButtonChange(idx, 'text', e.target.value); if (validationErrors.buttons) setValidationErrors(p => ({ ...p, buttons: undefined })); }}
                                                                maxLength={25}
                                                                className={`w-full bg-slate-50 dark:bg-background-dark border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all ${btn.type === 'COPY_CODE' ? 'opacity-50 cursor-not-allowed' : ''} ${!btn.text.trim() && validationErrors.buttons ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-white/10'}`}
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
                                                                        onChange={(e) => { handleButtonChange(idx, 'url', e.target.value); if (validationErrors.buttons) setValidationErrors(p => ({ ...p, buttons: undefined })); }}
                                                                        className={`w-full bg-slate-50 dark:bg-background-dark border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all ${!btn.url.trim() && validationErrors.buttons ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-white/10'}`}
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
                                                                    onChange={(e) => { handleButtonChange(idx, 'phoneNumber', e.target.value); if (validationErrors.buttons) setValidationErrors(p => ({ ...p, buttons: undefined })); }}
                                                                    className={`w-full bg-slate-50 dark:bg-background-dark border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all ${!btn.phoneNumber.trim() && validationErrors.buttons ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-white/10'}`}
                                                                />
                                                            </div>
                                                        )}
                                                        {btn.type === 'COPY_CODE' && (
                                                            <div>
                                                                <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5 uppercase tracking-wide">Coupon Code</label>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    placeholder="e.g. LAUNCH50"
                                                                    value={btn.couponCode || ''}
                                                                    onChange={(e) => { handleButtonChange(idx, 'couponCode', e.target.value.toUpperCase()); if (validationErrors.buttons) setValidationErrors(p => ({ ...p, buttons: undefined })); }}
                                                                    className={`w-full font-mono font-bold tracking-widest bg-amber-50 dark:bg-amber-900/10 border rounded-lg px-3 py-2 text-sm text-amber-900 dark:text-amber-300 outline-none focus:border-amber-400 transition-all ${!btn.couponCode?.trim() && validationErrors.buttons ? 'border-red-400 dark:border-red-500' : 'border-amber-200 dark:border-amber-700/40'}`}
                                                                />
                                                                <p className="text-[10px] text-amber-600/70 dark:text-amber-500/60 mt-1">This code will be copied to clipboard when user taps the button.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {validationErrors.buttons && (
                                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400">
                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                <p className="text-xs font-medium">{validationErrors.buttons}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Carousel Cards Section */}
                                {selectedArchetype?.id === 'carousel' && (
                                    <div className={`bg-white dark:bg-surface-dark rounded-2xl p-5 md:p-6 border shadow-sm space-y-5 transition-colors ${validationErrors.cards ? 'border-red-400 dark:border-red-500/60' : 'border-slate-200 dark:border-white/5'}`}>
                                        {validationErrors.cards && (
                                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                                                <div>
                                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">Please fix these issues in your carousel cards:</p>
                                                    <ul className="text-xs text-red-500 dark:text-red-400 space-y-0.5 list-disc list-inside">
                                                        {validationErrors.cards.map((e, i) => <li key={i}>{e}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
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
                                                                if (!file) return;

                                                                if (!['image/jpeg', 'image/png', 'image/jpg', 'video/mp4'].includes(file.type)) {
                                                                    showToast({ type: 'error', title: 'Invalid File Type', message: 'Meta only allows JPG, PNG, or MP4 files for carousel cards.' });
                                                                    e.target.value = '';
                                                                    return;
                                                                }

                                                                const isVid = file.type === 'video/mp4';
                                                                const maxSize = isVid ? 16 : 5;
                                                                
                                                                if (file.size > maxSize * 1024 * 1024) {
                                                                    showToast({ type: 'error', title: 'File Too Large', message: `Maximum allowed size is ${maxSize}MB.` });
                                                                    e.target.value = '';
                                                                    return;
                                                                }

                                                                const newCards = [...formData.cards];
                                                                newCards[activeCardIndex].mediaFile = file;
                                                                newCards[activeCardIndex].headerType = isVid ? 'VIDEO' : 'IMAGE'; // Automatically sync the internal type
                                                                setFormData({ ...formData, cards: newCards });
                                                            }}
                                                        />
                                                    </label>
                                                </div>

                                                {/* Card Body */}
                                                <div className="mb-4">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Card Body Text</label>
                                                        <div className="flex items-center gap-3">
                                                            <button onClick={() => handleEnhanceAI(formData.cards[activeCardIndex].content, 'card-content', activeCardIndex)} disabled={isEnhancing && enhancingSection !== `card-content-${activeCardIndex}`} className={`relative flex items-center gap-1.5 text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-2 py-1 rounded-md font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all duration-300 disabled:opacity-50 ${enhancingSection === `card-content-${activeCardIndex}` ? 'shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105 border-indigo-400 dark:border-indigo-400 overflow-hidden' : ''}`} type="button">
                                                                {enhancingSection === `card-content-${activeCardIndex}` && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_1.5s_infinite]"></div>}
                                                                <Sparkles className={`w-3 h-3 ${enhancingSection === `card-content-${activeCardIndex}` ? 'animate-spin text-amber-500' : ''}`} /> 
                                                                {enhancingSection === `card-content-${activeCardIndex}` ? 'Enhancing...' : 'Enhance'}
                                                            </button>
                                                            <span className="text-[10px] text-slate-400 font-mono">{(formData.cards[activeCardIndex].content || '').length}/160</span>
                                                        </div>
                                                    </div>
                                                    <div className={`transition-all duration-500 ${enhancedSuccess === `card-content-${activeCardIndex}` ? 'ring-4 ring-indigo-500/50 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.3)]' : ''}`}>
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
                                                            className={`w-full bg-white dark:bg-background-dark border ${enhancedSuccess === `card-content-${activeCardIndex}` ? 'border-transparent' : 'border-slate-200 dark:border-white/10'} rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary outline-none resize-none transition-all`}
                                                        />
                                                    </div>
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
                                                                            disabled={btn.type === 'COPY_CODE'}
                                                                            onChange={(e) => handleCardButtonChange(activeCardIndex, idx, 'text', e.target.value)}
                                                                            maxLength={25}
                                                                            className={`w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary transition-all ${btn.type === 'COPY_CODE' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                                    {(formData.headerType === 'IMAGE') && (
                                                        <div className="w-full aspect-video rounded-lg mb-2 overflow-hidden bg-slate-200 dark:bg-white/5 flex items-center justify-center">
                                                            {headerPreviewUrl ? (
                                                                <img src={headerPreviewUrl} alt="Header preview" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="w-6 h-6 text-slate-400" />
                                                            )}
                                                        </div>
                                                    )}
                                                    {formData.headerType === 'VIDEO' && (
                                                        <div className="w-full aspect-video rounded-lg mb-2 overflow-hidden bg-slate-900 flex items-center justify-center relative">
                                                            {headerPreviewUrl ? (
                                                                <video src={headerPreviewUrl} className="w-full h-full object-cover" muted playsInline />
                                                            ) : (
                                                                <ImageIcon className="w-6 h-6 text-slate-400" />
                                                            )}
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="bg-black/40 rounded-full p-2">
                                                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {formData.headerType === 'DOCUMENT' && (
                                                        <div className="w-full h-12 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-2 flex items-center px-3 gap-2">
                                                            <div className="bg-rose-500 text-white p-1 rounded"><ShieldCheck className="w-3 h-3" /></div>
                                                            <span className="text-xs text-rose-500 font-semibold truncate">
                                                                {formData.headerFile ? formData.headerFile.name : 'Document.pdf'}
                                                            </span>
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
                                                                <div key={`prev-btn-${i}`} className={`py-2.5 flex justify-center items-center gap-1.5 text-[#00a884] text-[14px] font-medium ${i < formData.buttons.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                                                                    {btn.type === 'URL' && <Link className="w-4 h-4" />}
                                                                    {btn.type === 'PHONE_NUMBER' && <Phone className="w-4 h-4" />}
                                                                    {btn.type === 'COPY_CODE' && <Zap className="w-4 h-4 text-amber-500" />}
                                                                    <span className="truncate max-w-[80%]">{btn.text || <span className="text-[#00a884]/50 italic">Button Text</span>}</span>
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
                                                                <div className="w-full aspect-[1.91/1] bg-slate-200 dark:bg-white/5 flex items-center justify-center border-b border-slate-100 dark:border-white/5 overflow-hidden">
                                                                    {cardPreviewUrls[i] && card.headerType === 'IMAGE' ? (
                                                                        <img src={cardPreviewUrls[i]} alt={`Card ${i + 1}`} className="w-full h-full object-cover" />
                                                                    ) : cardPreviewUrls[i] && card.headerType === 'VIDEO' ? (
                                                                        <div className="relative w-full h-full">
                                                                            <video src={cardPreviewUrls[i]} className="w-full h-full object-cover" muted playsInline />
                                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                                <div className="bg-black/40 rounded-full p-1.5">
                                                                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <ImageIcon className="w-6 h-6 text-slate-400" />
                                                                    )}
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
                                                                                {btn.type === 'COPY_CODE' && <Zap className="w-3.5 h-3.5 text-amber-500" />}
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
