import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle,
    Search,
    ChevronDown,
    Plus,
    Minus,
    MessageSquare,
    Mail,
    Phone,
    ArrowRight,
    Sparkles,
    X,
    MessageCircleQuestion,
    CheckCircle2
} from 'lucide-react';
import PublicLayout from '../components/landing/PublicLayout';

const DEFAULT_FAQS = [
    {
        question: 'What is Bluetick and how does it work?',
        answer: 'Bluetick is an enterprise-grade WhatsApp Business API platform that lets you broadcast targeted campaigns, automate chatbots and CRM workflows, manage shared multi-agent team inboxes, and run automated e-commerce stores with official Meta Cloud API compliance.',
        category: 'General'
    },
    {
        question: 'Do I need a verified Meta Business Portfolio (Facebook Business Manager)?',
        answer: 'Yes. To use the official WhatsApp Cloud API, Meta requires a Facebook Business Portfolio. Our integrated Meta Embedded Signup wizard guides you step-by-step through the connection process in under two minutes.',
        category: 'Setup & Connection'
    },
    {
        question: 'Can I keep and use my existing WhatsApp phone number?',
        answer: 'Yes! You can use any mobile or landline number as long as it is currently disconnected from the standard WhatsApp consumer or WhatsApp Business mobile app before connecting to the Cloud API.',
        category: 'Setup & Connection'
    },
    {
        question: 'Is there a free trial available?',
        answer: 'Yes! We offer a 14-day free trial on our plans so you can test broadcasts, chatbot flows, e-commerce stores, and integrations with zero risk or upfront commitment.',
        category: 'Pricing & Billing'
    },
    {
        question: 'Can I cancel or change my plan anytime?',
        answer: 'Absolutely. You can upgrade, downgrade, or cancel your subscription at any time directly from your billing dashboard. There are no lock-in contracts or cancellation penalties.',
        category: 'Pricing & Billing'
    },
    {
        question: 'How do Meta conversation charges work?',
        answer: 'Meta charges for 24-hour conversation sessions across four categories: Marketing, Utility, Authentication, and Service. Our platform does not add hidden markups — Meta charges are passed through transparently.',
        category: 'Pricing & Billing'
    },
    {
        question: 'Can I send bulk messages without risking WhatsApp account bans?',
        answer: 'Yes! Because Bluetick uses the official Meta WhatsApp Cloud API (not unauthorized Web automation or modded APKs), your phone number is protected from ban risks when sending approved template broadcasts.',
        category: 'Broadcasts & Messaging'
    },
    {
        question: 'Can multiple team members manage chats on the same number?',
        answer: 'Yes. Our Shared Team Inbox allows multiple agents to reply simultaneously, transfer chats, add internal private notes, and organize conversations with custom tags and statuses.',
        category: 'Features & Automation'
    },
    {
        question: 'Can I integrate Bluetick with my CRM, Shopify, or custom apps?',
        answer: 'Yes! We provide full REST APIs, incoming and outgoing webhooks, and direct integrations for Shopify, WooCommerce, Zapier, and custom software stacks.',
        category: 'Features & Automation'
    }
];

const FAQ = () => {
    const [config, setConfig] = useState(null);
    const [publicSettings, setPublicSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [openIndex, setOpenIndex] = useState(null);

    useEffect(() => {
        const fetchLandingConfig = async () => {
            try {
                const [landingRes, settingsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/landing`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/settings/public`).catch(() => ({ data: null }))
                ]);
                setConfig(landingRes.data);
                if (settingsRes?.data) setPublicSettings(settingsRes.data);
            } catch (err) {
                console.error('Failed to load FAQ config', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLandingConfig();
    }, []);

    const brandName = publicSettings?.appName || config?.brand?.name || 'Bluetick';

    useEffect(() => {
        document.title = `Frequently Asked Questions - ${brandName}`;
    }, [brandName]);

    // Consolidate FAQs from backend config or use comprehensive defaults
    const rawFaqs = useMemo(() => {
        if (config?.faqs && Array.isArray(config.faqs) && config.faqs.length > 0) {
            return config.faqs.map((f, idx) => ({
                question: f.question || '',
                answer: f.answer || '',
                category: f.category || (idx % 2 === 0 ? 'General' : 'Product & Features')
            }));
        }
        return DEFAULT_FAQS;
    }, [config]);

    // Extract unique categories
    const categories = useMemo(() => {
        const set = new Set();
        rawFaqs.forEach(faq => {
            if (faq.category) set.add(faq.category);
        });
        const list = Array.from(set);
        return list.length > 1 ? ['All', ...list] : ['All'];
    }, [rawFaqs]);

    // Filter FAQs by category & search query
    const filteredFaqs = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return rawFaqs.filter(faq => {
            const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
            const matchesSearch = !q ||
                faq.question.toLowerCase().includes(q) ||
                faq.answer.toLowerCase().includes(q);
            return matchesCategory && matchesSearch;
        });
    }, [rawFaqs, selectedCategory, searchQuery]);

    const toggleAccordion = (index) => {
        setOpenIndex(prev => prev === index ? null : index);
    };

    return (
        <PublicLayout fullWidth={true}>
            <div className="bg-[#F8FAFC] dark:bg-[#07070E] text-slate-900 dark:text-slate-100 min-h-screen selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-indigo-200 transition-colors duration-300">
                {/* ─── Hero Section ────────────────────────────────────────── */}
                <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden border-b border-slate-200/80 dark:border-white/5 bg-gradient-to-b from-white via-indigo-50/20 to-[#F8FAFC] dark:from-[#0B0C15] dark:via-[#090A12] dark:to-[#07070E]">
                    {/* Ambient Glow */}
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-full h-[320px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

                    <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-5 shadow-sm"
                        >
                            <MessageCircleQuestion className="w-3.5 h-3.5" />
                            Help & Knowledge Center
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-5"
                        >
                            Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500">Questions</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.16 }}
                            className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"
                        >
                            Quick answers to everything you need to know about getting started, WhatsApp Cloud API setup, pricing, and automated features.
                        </motion.p>

                        {/* Search Input Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.22 }}
                            className="max-w-xl mx-auto relative group"
                        >
                            <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                                <Search className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search questions, topics, pricing, API..."
                                className="w-full pl-12 sm:pl-13 pr-10 sm:pr-12 py-3.5 sm:py-4 bg-white dark:bg-[#12131F] border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none text-sm sm:text-base transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    aria-label="Clear search"
                                >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            )}
                        </motion.div>
                    </div>
                </section>

                {/* ─── Main FAQ Content Area ───────────────────────────────── */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                    {/* Category Tabs (if more than 1 category) */}
                    {categories.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 sm:mb-10 scrollbar-none no-scrollbar">
                            {categories.map((cat) => {
                                const isActive = selectedCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setOpenIndex(null);
                                        }}
                                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${isActive
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                                            : 'bg-white dark:bg-[#141523] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-700/60'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Results Counter */}
                    <div className="flex items-center justify-between mb-6 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                        <span>
                            {filteredFaqs.length} {filteredFaqs.length === 1 ? 'question' : 'questions'} {searchQuery ? `matching "${searchQuery}"` : ''}
                        </span>
                        {filteredFaqs.length > 0 && (
                            <button
                                onClick={() => setOpenIndex(prev => prev === null ? 0 : null)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {openIndex !== null ? 'Collapse all' : 'Expand first'}
                            </button>
                        )}
                    </div>

                    {/* FAQ Accordion List */}
                    {filteredFaqs.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                            {filteredFaqs.map((faq, index) => {
                                const isOpen = openIndex === index;
                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                        className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isOpen
                                            ? 'bg-white dark:bg-[#131422] border-indigo-200 dark:border-indigo-800/60 shadow-lg shadow-indigo-500/5'
                                            : 'bg-white dark:bg-[#11121E] border-slate-200/90 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
                                            }`}
                                    >
                                        <button
                                            onClick={() => toggleAccordion(index)}
                                            className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 md:p-6 text-left focus:outline-none"
                                            aria-expanded={isOpen}
                                        >
                                            <div className="flex items-start gap-3 sm:gap-4 pr-2">
                                                <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isOpen
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                    Q
                                                </div>
                                                <span className={`text-sm sm:text-base md:text-lg font-bold leading-snug transition-colors ${isOpen
                                                    ? 'text-indigo-600 dark:text-indigo-400'
                                                    : 'text-slate-900 dark:text-white'
                                                    }`}>
                                                    {faq.question}
                                                </span>
                                            </div>
                                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 ${isOpen
                                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rotate-180'
                                                : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                                }`}>
                                                <ChevronDown className="w-4 h-4" />
                                            </div>
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-1 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed pl-13 sm:pl-16 border-t border-slate-100 dark:border-white/5 mt-1">
                                                        <p className="whitespace-pre-line">
                                                            {faq.answer}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="text-center py-16 px-4 bg-white dark:bg-[#11121E] rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Search className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No matching questions found</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                                We couldn't find any questions matching "{searchQuery}". Try searching for something else or reach out to our team.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('All');
                                }}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Clear Search
                            </button>
                        </div>
                    )}

                    {/* ─── Still Have Questions CTA Card ────────────────────── */}
                    <div className="mt-14 sm:mt-20 p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden shadow-xl border border-indigo-700/30">
                        {/* Decorative background circle */}
                        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="space-y-2 max-w-xl">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Need extra help?
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                    Can’t find what you’re looking for?
                                </h3>
                                <p className="text-sm sm:text-base text-indigo-200/80 leading-relaxed">
                                    Our dedicated product team is here to assist you with onboarding, technical integrations, custom enterprise plans, and troubleshooting.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                <Link
                                    to="/contact"
                                    className="w-full sm:w-auto px-6 py-3.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl font-bold text-sm transition-all shadow-lg text-center flex items-center justify-center gap-2 group"
                                >
                                    <Mail className="w-4 h-4 text-indigo-600" />
                                    Contact Support
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                                <Link
                                    to="/register"
                                    className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600/60 hover:bg-indigo-600 text-white border border-indigo-400/30 rounded-xl font-bold text-sm transition-all text-center"
                                >
                                    Get Started Free
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </PublicLayout>
    );
};

export default FAQ;
