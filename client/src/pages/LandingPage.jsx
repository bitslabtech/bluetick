import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
    Zap, MessageSquare, BarChart, Shield, Send, Server, Users, 
    ArrowRight, Check, Star, Menu, X, Smartphone, Calendar, 
    ArrowUpRight, Play, Globe, Code, Layers, Mail, Plus, Minus,
    ShoppingCart, Briefcase, GraduationCap, HeartPulse, Building, 
    HeadphonesIcon, MessageCircle, User, Plane, Landmark, Car, Store, TrendingUp,
    Twitter, Facebook, Linkedin, Instagram
} from 'lucide-react';

// Icon Map for dynamic rendering
const IconMap = { 
    Zap, MessageSquare, BarChart, Shield, Send, Server, Users, Star, 
    ArrowRight, Check, Smartphone, Calendar, ArrowUpRight, Play, Globe, Code, Layers,
    ShoppingCart, Briefcase, GraduationCap, HeartPulse, Building, HeadphonesIcon, MessageCircle,
    UserPlus: Users, Mail, Plane, Landmark, Car, Store
};

// Safely resolve icon – DB may return {name:'Send'} OR plain 'Send' string
const resolveIcon = (iconVal, fallback = BarChart) => {
    if (!iconVal) return fallback;
    if (typeof iconVal === 'string') return IconMap[iconVal] || fallback;
    if (typeof iconVal === 'object' && iconVal.name) return IconMap[iconVal.name] || fallback;
    return fallback;
};

// Safely render primitives – converts objects/null to empty string to avoid React crashes
const str = (v) => (v == null || typeof v === 'object' ? '' : String(v));

// --- DATA CONSTANTS ---

const comparisonData = [
    { metric: 'Open Rate', email: '20%', sms: '45%', whatsapp: '98%' },
    { metric: 'Click-Through Rate', email: '2-5%', sms: '10-15%', whatsapp: '45-60%' },
    { metric: 'Response Rate', email: '6%', sms: '45%', whatsapp: '90%' },
    { metric: 'Format Support', email: 'Rich Text', sms: 'Text Only', whatsapp: 'Images, Videos, Docs, Buttons' },
];

const industries = [
    { id: 'ecommerce', icon: ShoppingCart, title: 'E-Commerce', desc: 'Recover abandoned carts, send shipping updates, and run flash sales directly on WhatsApp.', metrics: ['80% higher cart recovery', '3x repeat purchase rate'], imagePattern: 'bg-indigo-500' },
    { id: 'education', icon: GraduationCap, title: 'Education (Edtech)', desc: 'Send fee reminders, zoom links, and automated course updates to students and parents instantly.', metrics: ['99% communication delivery', 'Cut admin time by 60%'], imagePattern: 'bg-emerald-500' },
    { id: 'realestate', icon: Building, title: 'Real Estate', desc: 'Share property brochures, schedule site visits, and qualify leads 24/7 with an AI Agent.', metrics: ['5x more leads qualified', 'Instant prospect engagement'], imagePattern: 'bg-amber-500' },
    { id: 'healthcare', icon: HeartPulse, title: 'Healthcare', desc: 'Automate appointment booking, send prescription reminders, and handle basic triage automatically.', metrics: ['Reduce no-shows by 40%', 'HIPAA-compliant secure chats'], imagePattern: 'bg-cyan-500' },
    { id: 'travel', icon: Plane, title: 'Travel & Tours', desc: 'Send booking confirmations, flight updates, and offer 24/7 concierge services efficiently.', metrics: ['24/7 instant support', '95% faster query resolution'], imagePattern: 'bg-sky-500' },
    { id: 'finance', icon: Landmark, title: 'Fintech & Banking', desc: 'Share real-time transaction alerts, automate loan queries, and provide secure account updates.', metrics: ['End-to-end encryption', '2x faster document collection'], imagePattern: 'bg-purple-500' },
    { id: 'automotive', icon: Car, title: 'Automotive', desc: 'Schedule test drives, automate service reminders, and share interactive vehicle brochures.', metrics: ['3x test drives booked', 'Higher service retention'], imagePattern: 'bg-rose-500' },
    { id: 'retail', icon: Store, title: 'Retail & FMCG', desc: 'Run localized promotional campaigns, build loyal customer communities, and handle store inquiries.', metrics: ['Boost footfall by 40%', 'Higher coupon redemption'], imagePattern: 'bg-orange-500' }
];

// Icon map keyed by id — keeps visual tokens hardcoded on frontend
const INDUSTRY_DEFAULTS = {
    ecommerce:  { icon: ShoppingCart, imagePattern: 'bg-indigo-500' },
    education:  { icon: GraduationCap, imagePattern: 'bg-emerald-500' },
    realestate: { icon: Building, imagePattern: 'bg-amber-500' },
    healthcare: { icon: HeartPulse, imagePattern: 'bg-cyan-500' },
    travel:     { icon: Plane, imagePattern: 'bg-sky-500' },
    finance:    { icon: Landmark, imagePattern: 'bg-purple-500' },
    automotive: { icon: Car, imagePattern: 'bg-rose-500' },
    retail:     { icon: Store, imagePattern: 'bg-orange-500' },
};

const integrationLogos = [
    { name: 'Shopify', color: 'text-green-500' },
    { name: 'WooCommerce', color: 'text-purple-600' },
    { name: 'Zapier', color: 'text-orange-500' },
    { name: 'HubSpot', color: 'text-orange-600' },
    { name: 'Zoho', color: 'text-blue-500' },
    { name: 'Salesforce', color: 'text-sky-500' },
    { name: 'Make', color: 'text-indigo-500' },
];

// ──────────────────────────────────────────────────────────
// capabilities Bento Grid (Interakt Style)
// ──────────────────────────────────────────────────────────
const CapabilitiesBento = ({ config }) => {
    const defaultData = {
        title: 'Powerful Capabilities That Maximize Your Reach',
        subtitle: 'Everything you need to market, sell, and support on WhatsApp.',
        cards: [
            { id: 'marketing', title: 'Maximize Leads, \nOptimize Sales', desc: 'Run Click-to-WhatsApp ads to capture leads instantly on Meta platforms and run personalized broadcast campaigns.', tag: 'Marketing' },
            { id: 'support', title: 'Shared Team Inbox', desc: 'Collaborate with multiple agents on a single WhatsApp number to resolve queries lightning fast.', tag: 'Support' },
            { id: 'automation', title: 'No-Code AI Chatbots', tag: 'Automation' },
            { id: 'commerce', title: 'Product Catalogs', tag: 'Commerce' },
            { id: 'crm', title: 'Organize & Track Leads', tag: 'Sales CRM' }
        ]
    };
    const data = config || defaultData;
    const cards = data.cards || defaultData.cards;
    
    const marketingCard = cards.find(c => c.id === 'marketing') || defaultData.cards[0];
    const supportCard = cards.find(c => c.id === 'support') || defaultData.cards[1];
    const automationCard = cards.find(c => c.id === 'automation') || defaultData.cards[2];
    const commerceCard = cards.find(c => c.id === 'commerce') || defaultData.cards[3];
    const crmCard = cards.find(c => c.id === 'crm') || defaultData.cards[4];

    return (
        <section className="py-24 bg-white dark:bg-[#05050A] transition-colors relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-1/2 h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-1/2 h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none translate-y-1/3 -translate-x-1/3" />

            <div className="max-w-7xl mx-auto px-6">
                <div className="mb-12 md:mb-16">
                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight whitespace-pre-line">
                        {data.title}
                    </h2>
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line">
                        {data.subtitle}
                    </p>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* CARD 1: MARKETING (Large Left) */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once:true }}
                                className="md:col-span-7 rounded-[32px] bg-[#FFF5F3] dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 overflow-hidden relative group flex flex-col min-h-[380px] md:min-h-[400px]">
                        <div className="p-8 md:p-10 relative z-10 w-full sm:w-[55%] lg:w-1/2">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-400 mb-4">{marketingCard.tag}</div>
                            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mb-3 leading-tight whitespace-pre-line">{marketingCard.title}</h3>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium mb-6 md:mb-8 whitespace-pre-line">{marketingCard.desc}</p>
                            <a href="#" className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 hover:gap-3 transition-all">Learn More <ArrowRight className="w-4 h-4"/></a>
                        </div>
                        {marketingCard.image ? (
                            <div className="absolute right-0 bottom-0 w-[55%] h-[85%] rounded-tl-[32px] overflow-hidden translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500 border-t border-l border-rose-100 dark:border-rose-800/30 shadow-2xl">
                                <img src={marketingCard.image} className="w-full h-full object-cover" alt={marketingCard.title} />
                            </div>
                        ) : (
                            <div className="absolute right-0 bottom-0 w-[45%] h-[75%] bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-tl-[32px] border-t border-l border-rose-100 dark:border-rose-800/30 shadow-2xl p-6 translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500">
                               <div className="w-full h-32 rounded-xl bg-rose-100 dark:bg-rose-900/50 mb-4 relative overflow-hidden flex items-center justify-center">
                                   <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-orange-400 opacity-20"></div>
                                   <MessageCircle className="w-10 h-10 text-rose-500" />
                               </div>
                               <div className="h-4 w-3/4 bg-slate-200 dark:bg-white/10 rounded-full mb-3"></div>
                               <div className="h-4 w-1/2 bg-slate-200 dark:bg-white/10 rounded-full mb-4"></div>
                               <div className="h-10 w-full bg-[#25D366] rounded-xl flex items-center justify-center text-white text-xs font-bold gap-2">
                                   <MessageCircle className="w-4 h-4"/> Send WhatsApp Message
                               </div>
                            </div>
                        )}
                    </motion.div>

                    {/* CARD 2: SUPPORT (Large Right) */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once:true }} transition={{ delay: 0.1 }}
                                className="md:col-span-5 rounded-[32px] bg-[#F0FDF4] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 overflow-hidden relative group flex flex-col min-h-[380px] md:min-h-[400px]">
                        <div className="p-8 md:p-10 relative z-10 w-full">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-4">{supportCard.tag}</div>
                            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mb-3 leading-tight whitespace-pre-line">{supportCard.title}</h3>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium mb-6 md:mb-8 whitespace-pre-line">{supportCard.desc}</p>
                            <a href="#" className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 hover:gap-3 transition-all">Learn More <ArrowRight className="w-4 h-4"/></a>
                        </div>
                        {supportCard.image ? (
                            <div className="absolute bottom-0 inset-x-8 bg-white dark:bg-zinc-900 rounded-t-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-emerald-900/20 border-t border-x border-slate-100 dark:border-white/10 overflow-hidden translate-y-6 group-hover:translate-y-0 transition-transform duration-500 h-48">
                                <img src={supportCard.image} className="w-full h-full object-cover" alt={supportCard.title} />
                            </div>
                        ) : (
                            <div className="absolute bottom-0 inset-x-8 bg-white dark:bg-zinc-900 rounded-t-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-emerald-900/20 border-t border-x border-slate-100 dark:border-white/10 p-5 translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                                 <div className="flex gap-3 mb-4 items-end">
                                     <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                                         <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/>
                                     </div>
                                     <div className="bg-slate-100 dark:bg-white/5 py-2 px-4 rounded-2xl rounded-bl-sm text-sm dark:text-slate-300">Hi, I need help with my recent order.</div>
                                 </div>
                                 <div className="flex gap-3 items-end justify-end">
                                     <div className="bg-emerald-500 text-white py-2 px-4 rounded-2xl rounded-br-sm text-sm">Sure, I'll check that for you right now! ✨</div>
                                 </div>
                            </div>
                        )}
                    </motion.div>

                    {/* CARD 3: AUTOMATION */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once:true }} transition={{ delay: 0.15 }}
                                className="md:col-span-4 rounded-[32px] bg-[#EEF2FF] dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 overflow-hidden relative group flex flex-col min-h-[360px]">
                        <div className="p-10 relative z-10 w-full mb-auto text-center">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400 mb-4">{automationCard.tag}</div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 whitespace-pre-line">{automationCard.title}</h3>
                            {automationCard.desc && <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line">{automationCard.desc}</p>}
                        </div>
                        {automationCard.image ? (
                            <div className="relative h-56 w-full mt-auto flex items-center justify-center overflow-hidden">
                                <img src={automationCard.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={automationCard.title} />
                            </div>
                        ) : (
                            <div className="relative h-48 w-full mt-auto flex items-center justify-center overflow-hidden">
                                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2)_1px,transparent_1px)] bg-[length:16px_16px]"></div>
                                 
                                 <div className="relative z-10 w-32 bg-white dark:bg-zinc-800 shadow-lg rounded-xl p-3 border border-indigo-100 dark:border-white/10 -translate-y-4 -translate-x-8 group-hover:-translate-y-6 transition-transform duration-500">
                                     <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 border-b border-slate-100 dark:border-white/10 pb-1">Trigger</div>
                                     <div className="text-xs font-semibold dark:text-white">Customer Says "Hi"</div>
                                 </div>
    
                                 <svg className="absolute w-24 h-24 top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40px] text-indigo-300 dark:text-indigo-700" fill="none" viewBox="0 0 100 100">
                                     <path d="M 10 20 Q 50 20 50 50 T 90 80" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
                                 </svg>
    
                                 <div className="relative z-10 w-36 bg-white dark:bg-zinc-800 shadow-lg rounded-xl p-3 border border-indigo-100 dark:border-white/10 translate-y-8 translate-x-8 group-hover:translate-y-6 transition-transform duration-500 delay-75">
                                     <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 border-b border-slate-100 dark:border-white/10 pb-1">AI Action</div>
                                     <div className="text-xs font-semibold dark:text-white mb-2">Send Welcome Msg</div>
                                     <div className="w-full h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded flex items-center justify-center">
                                         <Layers className="w-4 h-4 text-indigo-500" />
                                     </div>
                                 </div>
                            </div>
                        )}
                    </motion.div>

                    {/* CARD 4: COMMERCE */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once:true }} transition={{ delay: 0.2 }}
                                className="md:col-span-4 rounded-[32px] bg-[#FFFBEB] dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 overflow-hidden relative group flex flex-col min-h-[360px]">
                        <div className="p-10 relative z-10 w-full mb-auto text-center">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 mb-4">{commerceCard.tag}</div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 whitespace-pre-line">{commerceCard.title}</h3>
                            {commerceCard.desc && <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line">{commerceCard.desc}</p>}
                        </div>
                        {commerceCard.image ? (
                            <div className="relative h-56 w-full mt-auto flex flex-col items-center justify-end px-8 pb-8">
                                <img src={commerceCard.image} className="w-full h-full object-cover rounded-2xl shadow-xl border border-amber-100 dark:border-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500" alt={commerceCard.title} />
                            </div>
                        ) : (
                            <div className="relative h-48 w-full mt-auto flex flex-col items-center justify-end px-8 pb-8">
                                 <div className="w-full bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-amber-100 dark:border-white/10 p-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                     <div className="flex gap-4 items-center">
                                         <div className="w-16 h-16 rounded-xl bg-amber-100 dark:bg-amber-900/40 shrink-0 flex items-center justify-center">
                                            <ShoppingCart className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                         </div>
                                         <div>
                                             <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">Premium Collection</div>
                                             <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">24 Items Available</div>
                                             <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                 View Catalog
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        )}
                    </motion.div>

                    {/* CARD 5: CRM & SALES */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once:true }} transition={{ delay: 0.25 }}
                                className="md:col-span-4 rounded-[32px] bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-white/10 overflow-hidden relative group flex flex-col min-h-[360px]">
                        <div className="p-10 relative z-10 w-full mb-auto text-center">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400 mb-4">{crmCard.tag}</div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 whitespace-pre-line">{crmCard.title}</h3>
                            {crmCard.desc && <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line">{crmCard.desc}</p>}
                        </div>
                        {crmCard.image ? (
                            <div className="relative h-56 w-full mt-auto px-6 overflow-hidden flex items-end">
                                <img src={crmCard.image} className="w-full h-full object-cover rounded-t-xl translate-y-8 group-hover:translate-y-4 transition-transform duration-500" alt={crmCard.title} />
                            </div>
                        ) : (
                            <div className="relative h-48 w-full mt-auto px-6 overflow-hidden flex items-end">
                                <div className="w-full flex gap-3 translate-y-8 group-hover:translate-y-4 transition-transform duration-500">
                                    <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-t-xl p-3 h-40">
                                        <div className="w-1/2 h-3 bg-slate-200 dark:bg-white/10 rounded-full mb-3"></div>
                                        <div className="bg-white dark:bg-zinc-800 shadow-sm rounded-lg p-3 mb-2 border border-slate-200 dark:border-white/5">
                                            <div className="w-3/4 h-3 bg-slate-200 dark:bg-white/10 rounded-full mb-2"></div>
                                            <div className="flex gap-2">
                                                <div className="w-4 h-4 rounded-full bg-cyan-100 dark:bg-cyan-900/50"></div>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-800 shadow-sm rounded-lg p-3 border border-slate-200 dark:border-white/5">
                                            <div className="w-full h-3 bg-slate-200 dark:bg-white/10 rounded-full mb-2"></div>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-t-xl p-3 h-48">
                                        <div className="w-1/2 h-3 bg-slate-200 dark:bg-white/10 rounded-full mb-3"></div>
                                        <div className="bg-white dark:bg-zinc-800 shadow-sm rounded-lg p-3 border border-slate-200 dark:border-white/5">
                                            <div className="w-full h-3 bg-slate-200 dark:bg-white/10 rounded-full mb-2"></div>
                                            <div className="w-1/2 h-3 bg-slate-200 dark:bg-white/10 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>

                </div>
            </div>
        </section>
    );
}



// ──────────────────────────────────────────────────────────
// ADVANCED FEATURES SHOWCASE — AiSensy Inspired
// ──────────────────────────────────────────────────────────
const advancedFeatures = [
    {
        id: 'broadcast', label: 'Bulk Broadcasts', icon: Send,
        bg: 'bg-indigo-50 dark:bg-indigo-950/20', previewBg: 'bg-indigo-100/70',
        barColor: 'bg-indigo-500', pillColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400',
        gradientIcon: 'from-indigo-500 to-violet-500',
        tagText: 'Marketing',
        title: 'Import & Broadcast Instantly',
        desc: 'Import contacts and broadcast approved WhatsApp messages to thousands in seconds. Track delivery, read, and click rates in real-time.',
        stats: ['98% Open Rate', '45% CTR', '3x Revenue'], preview: 'broadcast'
    },
    {
        id: 'chatbot', label: 'No-Code Flow Bots', icon: Layers,
        bg: 'bg-violet-50 dark:bg-violet-950/20', previewBg: 'bg-violet-100/70',
        barColor: 'bg-violet-500', pillColor: 'bg-violet-50 text-violet-700 border-violet-100',
        iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-violet-600 dark:text-violet-400',
        gradientIcon: 'from-violet-500 to-purple-500',
        tagText: 'Automation',
        title: 'Build No-Code Chatbot in Minutes',
        desc: 'Visual drag-and-drop flow builder for WhatsApp chatbots & product catalog journeys — no code, no complexity.',
        stats: ['80% Auto-resolved', '24/7 Running', '5 min Setup'], preview: 'chatbot'
    },
    {
        id: 'livechat', label: 'Multi-Agent Inbox', icon: HeadphonesIcon,
        bg: 'bg-emerald-50 dark:bg-emerald-950/20', previewBg: 'bg-emerald-100/70',
        barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400',
        gradientIcon: 'from-emerald-500 to-teal-500',
        tagText: 'Support',
        title: 'Shared Team Inbox for WhatsApp',
        desc: 'Let multiple agents handle conversations from one WhatsApp number. Smart routing, labels, quick replies, and internal notes included.',
        stats: ['60% Faster Support', 'Smart Routing', 'Team Collab'], preview: 'livechat'
    },
    {
        id: 'analytics', label: 'Analytics & Reports', icon: BarChart,
        bg: 'bg-amber-50 dark:bg-amber-950/20', previewBg: 'bg-amber-100/70',
        barColor: 'bg-amber-500', pillColor: 'bg-amber-50 text-amber-700 border-amber-100',
        iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400',
        gradientIcon: 'from-amber-500 to-orange-500',
        tagText: 'Insights',
        title: 'Real-Time Campaign Analytics',
        desc: 'Monitor Read, Replied & Clicked rates live. Segment audiences by engagement and auto-retarget cold leads for maximum conversions.',
        stats: ['Live Dashboard', 'Campaign ROI', 'Retargeting'], preview: 'analytics'
    },
    {
        id: 'catalog', label: 'Catalog & Payments', icon: ShoppingCart,
        bg: 'bg-rose-50 dark:bg-rose-950/20', previewBg: 'bg-rose-100/70',
        barColor: 'bg-rose-500', pillColor: 'bg-rose-50 text-rose-700 border-rose-100',
        iconBg: 'bg-rose-100 dark:bg-rose-900/40', iconColor: 'text-rose-600 dark:text-rose-400',
        gradientIcon: 'from-rose-500 to-pink-500',
        tagText: 'Commerce',
        title: 'Sell Products Inside WhatsApp',
        desc: 'Share your full product catalog, collect orders and receive payments — all within WhatsApp. Zero-friction in-chat checkout.',
        stats: ['In-chat Checkout', 'UPI & Cards', '2x Orders'], preview: 'catalog'
    },
    {
        id: 'retarget', label: 'Smart Retargeting', icon: ArrowUpRight,
        bg: 'bg-cyan-50 dark:bg-cyan-950/20', previewBg: 'bg-cyan-100/70',
        barColor: 'bg-cyan-500', pillColor: 'bg-cyan-50 text-cyan-700 border-cyan-100',
        iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconColor: 'text-cyan-600 dark:text-cyan-400',
        gradientIcon: 'from-cyan-500 to-sky-500',
        tagText: 'Re-engagement',
        title: 'Retarget to 3X Conversions',
        desc: "Re-engage customers who didn't respond or purchase with hyper-personalized automated follow-up campaigns and smart audience segments.",
        stats: ['3x Conversions', 'Auto Follow-up', 'Smart Segments'], preview: 'retarget'
    },
    {
        id: 'aibot', label: 'Generative AI Bot', icon: Zap,
        bg: 'bg-purple-50 dark:bg-purple-950/20', previewBg: 'bg-purple-100/70',
        barColor: 'bg-purple-500', pillColor: 'bg-purple-50 text-purple-700 border-purple-100',
        iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400',
        gradientIcon: 'from-purple-500 to-indigo-600',
        tagText: 'AI-Powered',
        title: 'Generative AI that Sells & Supports',
        desc: 'Train your own GPT-powered bot on product knowledge, FAQs, pricing and policies. It answers, qualifies and converts leads — 24/7, autonomously.',
        stats: ['GPT-4 Powered', 'Custom Training', 'Zero Hallucination'], preview: 'aibot'
    },
];

function FeaturePreview({ feature }) {
    // If admin uploaded a custom image, show it instead of the animated mockup
    if (feature.image) {
        return (
            <AnimatePresence mode="wait">
                <motion.div key={feature.id} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.35}}
                    className={`w-full h-full rounded-2xl ${feature.previewBg} overflow-hidden`}>
                    <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                </motion.div>
            </AnimatePresence>
        );
    }
    const { preview, previewBg, barColor } = feature;
    const mockups = {
        broadcast: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="flex items-center gap-3 pb-3 border-b border-black/10">
                    <div className={`w-8 h-8 rounded-full ${barColor} flex items-center justify-center`}><Send className="w-4 h-4 text-white"/></div>
                    <div><div className="w-28 h-2.5 bg-black/15 rounded-full mb-1"/><div className="w-16 h-2 bg-black/10 rounded-full"/></div>
                    <div className={`ml-auto px-3 py-1 ${barColor} text-white rounded-full text-[10px] font-bold`}>LIVE</div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {[['Sent','17.8K'],['Delivered','17.2K'],['Read','16.9K'],['Clicked','8.1K']].map(([l,v])=>(
                        <div key={l} className="bg-white/60 rounded-xl p-2 text-center"><div className="font-black text-xs text-slate-700">{v}</div><div className="text-[9px] text-slate-400 font-medium">{l}</div></div>
                    ))}
                </div>
                <div className="bg-white/70 rounded-xl p-3 flex-1">
                    <div className="flex gap-2 items-start">
                        <div className={`w-5 h-5 rounded-full ${barColor} shrink-0 mt-0.5`}/>
                        <div className="space-y-1 flex-1">
                            <div className="w-3/4 h-2 bg-slate-300 rounded-full"/><div className="w-full h-2 bg-slate-200 rounded-full"/>
                            <div className={`mt-2 px-3 py-1 ${barColor} text-white text-[10px] font-bold rounded-full w-fit`}>Shop Now →</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white/50 rounded-xl p-2 flex items-end gap-1 h-16">
                    {[30,55,40,75,60,90,70,85].map((h,i)=>(
                        <motion.div key={i} initial={{height:0}} animate={{height:`${h}%`}} transition={{delay:i*0.1,duration:0.5}} className={`flex-1 ${barColor} opacity-70 rounded-t-sm`}/>
                    ))}
                </div>
            </div>
        ),
        chatbot: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="flex-1 flex flex-col items-center gap-0 justify-center">
                    <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="bg-white/70 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">🟢 Trigger: Keyword Match</motion.div>
                    <div className={`w-0.5 h-5 ${barColor}`}/>
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} className="bg-white/70 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">💬 Send Welcome Message</motion.div>
                    <div className={`w-0.5 h-5 ${barColor}`}/>
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center"><div className={`w-0.5 h-4 ${barColor}`}/><motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}} className={`px-3 py-1.5 ${barColor} text-white text-[10px] font-bold rounded-xl`}>Show Catalog</motion.div></div>
                        <div className="flex flex-col items-center"><div className="w-0.5 h-4 bg-gray-300"/><motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.6}} className="px-3 py-1.5 bg-gray-200 text-gray-600 text-[10px] font-bold rounded-xl">Talk to Agent</motion.div></div>
                    </div>
                </div>
                <div className="bg-white/60 rounded-xl p-3 space-y-2">
                    <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.8}} className="bg-white rounded-xl rounded-tl-sm px-3 py-1.5 text-[10px] font-medium w-3/4">Hi! Which product are you looking for?</motion.div>
                    <motion.div initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{delay:1.2}} className={`${barColor} text-white text-[10px] font-medium rounded-xl rounded-tr-sm px-3 py-1.5 w-2/3 ml-auto`}>Show me headphones</motion.div>
                </div>
            </div>
        ),
        livechat: (
            <div className="w-full h-full flex gap-2">
                <div className="w-2/5 flex flex-col gap-2">
                    {[{name:'Arjun S.',msg:'Need help...',unread:2},{name:'Priya M.',msg:'Order #1234',unread:0},{name:'Rahul K.',msg:'Refund?',unread:1}].map((c2,i)=>(
                        <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.2}}
                            className={`bg-white/70 rounded-xl p-2 flex gap-2 items-center ${i===0?'ring-2 ring-emerald-300':''}`}>
                            <div className={`w-7 h-7 rounded-full ${barColor} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>{c2.name[0]}</div>
                            <div className="min-w-0 flex-1"><div className="text-[10px] font-bold text-slate-700 truncate">{c2.name}</div><div className="text-[9px] text-slate-400 truncate">{c2.msg}</div></div>
                            {c2.unread>0&&<div className={`w-4 h-4 ${barColor} text-white rounded-full text-[8px] font-bold flex items-center justify-center shrink-0`}>{c2.unread}</div>}
                        </motion.div>
                    ))}
                </div>
                <div className="flex-1 bg-white/50 rounded-xl flex flex-col p-2 gap-2">
                    <div className="flex items-center gap-2 border-b border-white/50 pb-2">
                        <div className={`w-6 h-6 rounded-full ${barColor}`}/><div className="text-[10px] font-bold">Arjun S.</div>
                        <div className={`ml-auto px-2 py-0.5 ${barColor} text-white text-[8px] rounded-full font-bold`}>Agent: You</div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}} className="bg-white rounded-lg px-2 py-1 text-[9px] w-3/4">Need help with my order 🙏</motion.div>
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8}} className={`${barColor} text-white rounded-lg px-2 py-1 text-[9px] w-2/3 ml-auto`}>Sure! Order ID?</motion.div>
                    </div>
                    <div className="h-6 rounded-lg border border-white/60 bg-white/60 flex items-center px-2 gap-1">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full"/>
                        <div className={`w-5 h-5 rounded-full ${barColor} flex items-center justify-center`}><Send className="w-2.5 h-2.5 text-white"/></div>
                    </div>
                </div>
            </div>
        ),
        analytics: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                    {[['45%','CTR'],['98%','Open Rate'],['12K','Replies']].map(([v,l])=>(
                        <div key={l} className="bg-white/70 rounded-xl p-2 text-center"><div className="font-black text-sm text-slate-800">{v}</div><div className="text-[9px] text-slate-400 font-bold">{l}</div></div>
                    ))}
                </div>
                <div className="flex-1 bg-white/50 rounded-xl p-3 relative overflow-hidden">
                    <div className="text-[9px] font-bold text-slate-500 mb-2">CLICKED PER DAY</div>
                    <svg viewBox="0 0 200 55" className="w-full h-3/4" preserveAspectRatio="none">
                        <defs><linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05"/></linearGradient></defs>
                        <motion.path initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1.5}} d="M 0 50 C 20 45, 40 20, 60 30 S 100 10, 120 20 S 160 5, 200 15" stroke="#f59e0b" strokeWidth="2" fill="none"/>
                        <path d="M 0 50 C 20 45, 40 20, 60 30 S 100 10, 120 20 S 160 5, 200 15 L 200 60 L 0 60 Z" fill="url(#cg2)"/>
                    </svg>
                </div>
                <div className="bg-white/60 rounded-xl p-2 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${barColor}`}/><div className="text-[10px] font-bold text-slate-700 flex-1">Republic Day Sale</div>
                    <div className={`px-2 py-0.5 ${barColor} text-white text-[9px] rounded-full font-bold`}>Active</div>
                </div>
            </div>
        ),
        catalog: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="bg-white/70 rounded-xl p-3 flex-1 overflow-hidden">
                    <div className="text-[10px] font-bold text-slate-600 mb-2">🛍️ Our Products</div>
                    <div className="grid grid-cols-2 gap-2">
                        {[{name:'Headphones',price:'₹1,499'},{name:'Smart Watch',price:'₹3,299'},{name:'Phone Case',price:'₹299'},{name:'Earbuds',price:'₹899'}].map((p,i)=>(
                            <motion.div key={p.name} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.15}} className="bg-white rounded-lg p-2">
                                <div className={`h-10 ${barColor} opacity-20 rounded-md mb-1`}/>
                                <div className="text-[9px] font-bold text-slate-700">{p.name}</div>
                                <div className="flex items-center justify-between mt-1">
                                    <div className="text-[9px] font-black text-slate-800">{p.price}</div>
                                    <div className={`px-1.5 py-0.5 ${barColor} text-white text-[8px] rounded font-bold`}>Add</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
                <div className={`${barColor} text-white text-center text-[10px] font-bold py-2 rounded-xl`}>🛒 Checkout via WhatsApp Pay</div>
            </div>
        ),
        retarget: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="bg-white/60 rounded-xl p-2 flex-1">
                    <div className="text-[10px] font-bold text-slate-600 mb-2">Smart Audience Segments</div>
                    {[{label:'Opened, not replied',count:'4.2K',pct:78},{label:'Clicked, no purchase',count:'1.8K',pct:45},{label:'Cart abandoned',count:'892',pct:23}].map((s,i)=>(
                        <div key={s.label} className="mb-2">
                            <div className="flex justify-between text-[9px] font-bold text-slate-600 mb-1"><span>{s.label}</span><span>{s.count}</span></div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div initial={{width:0}} animate={{width:`${s.pct}%`}} transition={{delay:i*0.2,duration:0.8}} className={`h-full ${barColor} rounded-full`}/>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 bg-white/60 rounded-xl p-2 text-center"><div className="font-black text-lg text-slate-800">3.1x</div><div className="text-[9px] text-slate-400 font-bold">Conversion Lift</div></div>
                    <div className="flex-1 bg-white/60 rounded-xl p-2 text-center"><div className="font-black text-lg text-slate-800">Auto</div><div className="text-[9px] text-slate-400 font-bold">Follow-up</div></div>
                </div>
                <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1}} className={`${barColor} text-white text-[10px] font-bold py-2 rounded-xl text-center`}>🚀 Launch Retarget Campaign</motion.div>
            </div>
        ),
        aibot: (
            <div className="w-full h-full flex flex-col gap-2">
                <div className="bg-white/70 rounded-xl p-2 flex items-center gap-2 mb-1">
                    <div className={`w-6 h-6 rounded-full ${barColor} flex items-center justify-center text-white text-[10px] font-bold`}>AI</div>
                    <div className="text-[10px] font-bold text-slate-700">GPT-Powered Bot</div>
                    <div className={`ml-auto px-2 py-0.5 ${barColor} text-white text-[8px] rounded-full font-bold`}>LIVE</div>
                </div>
                <div className="flex-1 space-y-2 overflow-hidden">
                    <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.2}} className="bg-white rounded-xl rounded-tl-sm px-3 py-1.5 text-[9px] font-medium text-slate-700 w-4/5">What are your pricing plans?</motion.div>
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.6}} className="flex items-end gap-1 justify-end">
                        <div className={`${barColor} text-white rounded-xl rounded-tr-sm px-3 py-1.5 text-[9px] font-medium w-4/5`}>We have 3 plans — Starter ₹999/mo, Pro ₹2,499/mo and Enterprise (custom). All include unlimited contacts. Want me to compare them? 🚀</div>
                    </motion.div>
                    <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:1.2}} className="bg-white rounded-xl rounded-tl-sm px-3 py-1.5 text-[9px] font-medium text-slate-700 w-3/5">Yes please! Also do you have a free trial?</motion.div>
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.8}} className="flex justify-end">
                        <div className={`${barColor} text-white rounded-xl rounded-tr-sm px-3 py-1.5 text-[9px] font-medium w-4/5 flex items-center gap-1`}>
                            <span className="animate-pulse">●</span> Typing...
                        </div>
                    </motion.div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {[['🧠','GPT-4'],['⚡','< 1s reply'],['🔒','No Halluc.']].map(([ic,lb])=>(
                        <div key={lb} className="bg-white/60 rounded-lg p-1.5 text-center"><div className="text-base">{ic}</div><div className="text-[8px] font-bold text-slate-500">{lb}</div></div>
                    ))}
                </div>
            </div>
        )
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div key={feature.id} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.35}}
                className={`w-full h-full rounded-2xl ${previewBg} p-4`}>
                {mockups[preview]}
            </motion.div>
        </AnimatePresence>
    );
}

const SHOWCASE_INTERVAL = 4500;

// Style defaults per feature id — these stay hardcoded on the frontend
const FEATURE_STYLE_DEFAULTS = {
    broadcast: { icon: Send, bg: 'bg-indigo-50 dark:bg-indigo-950/20', previewBg: 'bg-indigo-100/70', barColor: 'bg-indigo-500', pillColor: 'bg-indigo-50 text-indigo-700 border-indigo-100', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400', gradientIcon: 'from-indigo-500 to-violet-500', preview: 'broadcast' },
    chatbot:   { icon: Layers, bg: 'bg-violet-50 dark:bg-violet-950/20', previewBg: 'bg-violet-100/70', barColor: 'bg-violet-500', pillColor: 'bg-violet-50 text-violet-700 border-violet-100', iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-violet-600 dark:text-violet-400', gradientIcon: 'from-violet-500 to-purple-500', preview: 'chatbot' },
    livechat:  { icon: HeadphonesIcon, bg: 'bg-emerald-50 dark:bg-emerald-950/20', previewBg: 'bg-emerald-100/70', barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400', gradientIcon: 'from-emerald-500 to-teal-500', preview: 'livechat' },
    analytics: { icon: BarChart, bg: 'bg-amber-50 dark:bg-amber-950/20', previewBg: 'bg-amber-100/70', barColor: 'bg-amber-500', pillColor: 'bg-amber-50 text-amber-700 border-amber-100', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400', gradientIcon: 'from-amber-500 to-orange-500', preview: 'analytics' },
    catalog:   { icon: ShoppingCart, bg: 'bg-rose-50 dark:bg-rose-950/20', previewBg: 'bg-rose-100/70', barColor: 'bg-rose-500', pillColor: 'bg-rose-50 text-rose-700 border-rose-100', iconBg: 'bg-rose-100 dark:bg-rose-900/40', iconColor: 'text-rose-600 dark:text-rose-400', gradientIcon: 'from-rose-500 to-pink-500', preview: 'catalog' },
    retarget:  { icon: ArrowUpRight, bg: 'bg-cyan-50 dark:bg-cyan-950/20', previewBg: 'bg-cyan-100/70', barColor: 'bg-cyan-500', pillColor: 'bg-cyan-50 text-cyan-700 border-cyan-100', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconColor: 'text-cyan-600 dark:text-cyan-400', gradientIcon: 'from-cyan-500 to-sky-500', preview: 'retarget' },
    aibot:     { icon: Zap, bg: 'bg-purple-50 dark:bg-purple-950/20', previewBg: 'bg-purple-100/70', barColor: 'bg-purple-500', pillColor: 'bg-purple-50 text-purple-700 border-purple-100', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400', gradientIcon: 'from-purple-500 to-indigo-600', preview: 'aibot' },
};

function AdvancedFeaturesShowcase({ config }) {
    // Merge DB config text over hardcoded style defaults
    const features = (config?.features || advancedFeatures).map(f => ({
        ...(FEATURE_STYLE_DEFAULTS[f.id] || {}),
        ...f,
        stats: Array.isArray(f.stats) ? f.stats : (f.stats || '').split(',').map(s => s.trim()).filter(Boolean),
    }));

    const [active, setActive] = useState(0);
    const [progress, setProgress] = useState(0);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        setProgress(0);
        const start = Date.now();
        const tick = setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.min((elapsed / SHOWCASE_INTERVAL) * 100, 100);
            setProgress(pct);
            if (elapsed >= SHOWCASE_INTERVAL) {
                setActive(prev => (prev + 1) % features.length);
            }
        }, 50);
        return () => clearInterval(tick);
    }, [active, features.length]);

    // Center active tab on mobile scroll
    useEffect(() => {
        if (scrollContainerRef.current && window.innerWidth < 1024) {
            const activeTab = scrollContainerRef.current.children[active];
            if (activeTab) {
                const scrollLeft = activeTab.offsetLeft - (scrollContainerRef.current.offsetWidth / 2) + (activeTab.offsetWidth / 2);
                scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [active]);

    const feature = features[active];
    const TabIcon = feature.icon;

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-5 gap-8 items-start">
            {/* TOP/LEFT: Feature Tab list */}
            <div 
                ref={scrollContainerRef}
                className="lg:col-span-2 flex lg:flex-col flex-row gap-2 w-full overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 hide-scrollbar scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {features.map((f, i) => {
                    const Icon = f.icon;
                    const isActive = i === active;
                    return (
                        <button 
                            key={f.id} 
                            onClick={() => setActive(i)}
                            className={`relative flex-shrink-0 lg:w-full text-left px-4 py-3.5 rounded-2xl transition-all border ${
                                isActive 
                                    ? `bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 shadow-md` 
                                    : 'bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* Gradient icon badge */}
                                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${f.gradientIcon || 'from-slate-400 to-slate-500'} flex items-center justify-center shrink-0 shadow-sm transition-transform ${
                                    isActive ? 'scale-110' : 'opacity-50 scale-95'
                                }`}>
                                    <Icon className="w-4 h-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                    {f.tagText && isActive && (
                                        <div className={`text-[9px] font-black uppercase tracking-widest ${f.iconColor} mb-0.5`}>{f.tagText}</div>
                                    )}
                                    <span className={`font-bold text-sm whitespace-nowrap lg:whitespace-normal block leading-tight ${
                                        isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {f.label}
                                    </span>
                                </div>
                            </div>
                            {/* Progress bar */}
                            {isActive && (
                                <div className="mt-2.5 h-0.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                    <motion.div 
                                        className={`h-full bg-gradient-to-r ${f.gradientIcon || 'from-indigo-500 to-violet-500'} rounded-full`} 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ ease: "linear" }}
                                    />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* BOTTOM/RIGHT: Info card + Demo */}
            <div className="lg:col-span-3 w-full">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={feature.id} 
                        initial={{ opacity: 0, y: 12 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -12 }} 
                        transition={{ duration: 0.3 }}
                        className="rounded-3xl overflow-hidden border border-slate-200 dark:border-white/8 shadow-2xl bg-white dark:bg-zinc-900"
                    >
                        {/* Gradient top bar */}
                        <div className={`h-1 w-full bg-gradient-to-r ${feature.gradientIcon || 'from-indigo-500 to-violet-500'}`} />

                        <div className="p-6 md:p-7">
                            <div className="flex flex-wrap items-start gap-3 md:gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradientIcon || 'from-indigo-500 to-violet-500'} flex items-center justify-center shrink-0 shadow-lg`}>
                                    <TabIcon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {feature.tagText && (
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${feature.iconColor} mb-0.5`}>{feature.tagText}</div>
                                    )}
                                    <h3 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                        {feature.title}
                                    </h3>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                                {feature.desc}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {feature.stats.map(s => (
                                    <span key={s} className={`px-3 py-1 text-[10px] font-bold rounded-full border whitespace-nowrap ${feature.pillColor}`}>
                                        ✓ {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        <div className={`mx-4 md:mx-6 mb-6 rounded-2xl overflow-hidden h-[260px] md:h-64 ${feature.previewBg} shadow-inner flex items-center justify-center p-4`}>
                            <div className="w-full h-full max-w-sm md:max-w-none">
                                <FeaturePreview feature={feature} />
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────
// PREMIUM HERO BACKGROUND ANIMATION (Aurora + Particles)
// ──────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    duration: 6 + Math.random() * 10,
    delay: Math.random() * 8,
    opacity: 0.15 + Math.random() * 0.4,
}));

const BEAMS = [
    { rotate: -20, left: '15%', color: 'from-indigo-500/30 to-transparent', duration: 8 },
    { rotate: 15, left: '55%', color: 'from-violet-500/20 to-transparent', duration: 12 },
    { rotate: -8, left: '75%', color: 'from-cyan-500/15 to-transparent', duration: 10 },
];

const HeroBackground = () => {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">

            {/* ── Layer 1: Dot Grid ── */}
            <div
                className="absolute inset-0 opacity-30 dark:opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(circle, #6366f150 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)',
                }}
            />

            {/* ── Layer 2: Aurora Beams ── */}
            {BEAMS.map((b, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: [0, 1, 0.6, 1, 0], scaleY: [0.8, 1, 1.05, 1, 0.8] }}
                    transition={{ duration: b.duration, repeat: Infinity, ease: 'easeInOut', delay: i * 3 }}
                    className={`absolute top-[-10%] h-[130vh] w-[120px] bg-gradient-to-b ${b.color} blur-[60px] origin-top`}
                    style={{ left: b.left, rotate: `${b.rotate}deg` }}
                />
            ))}

            {/* ── Layer 3: Central Radial Glow ── */}
            <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo-500/15 dark:bg-indigo-600/25 blur-[100px]"
            />
            <motion.div
                animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                className="absolute top-[20%] left-[60%] w-[500px] h-[500px] rounded-full bg-violet-500/10 dark:bg-violet-600/20 blur-[80px]"
            />
            <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute top-[30%] right-[5%] w-[400px] h-[400px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/15 blur-[80px]"
            />

            {/* ── Layer 4: Floating Star Particles ── */}
            {PARTICLES.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-indigo-400 dark:bg-white"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
                    animate={{
                        y: [0, -24, 0],
                        opacity: [p.opacity, p.opacity * 2, p.opacity],
                        scale: [1, 1.5, 1],
                    }}
                    transition={{ duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
                />
            ))}

            {/* ── Layer 5: Floating WhatsApp Message Chips ── */}
            {[
                { label: '98% Open Rate', icon: '📬', x: '8%', y: '30%', delay: 0 },
                { label: '3x Revenue', icon: '📈', x: '82%', y: '20%', delay: 2 },
                { label: 'AI Chatbot Ready', icon: '🤖', x: '70%', y: '72%', delay: 1.5 },
                { label: '24/7 Live Chat', icon: '💬', x: '5%', y: '68%', delay: 3 },
            ].map((chip, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [20, 0, -5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, delay: chip.delay + 1, ease: 'easeInOut' }}
                    className="absolute hidden md:flex items-center gap-2 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xl px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 dark:text-white"
                    style={{ left: chip.x, top: chip.y }}
                >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                </motion.div>
            ))}

            {/* ── Layer 6: Orbiting Ring (decorative) ── */}
            <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="absolute top-[5%] left-[55%] w-[520px] h-[520px] border border-indigo-300/10 dark:border-indigo-500/10 rounded-full hidden lg:block"
            >
                <div className="absolute -top-1.5 left-1/2 w-3 h-3 rounded-full bg-indigo-400/60 blur-[2px]" />
            </motion.div>
            <motion.div
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
                className="absolute top-[15%] left-[60%] w-[380px] h-[380px] border border-violet-400/10 dark:border-violet-500/10 rounded-full hidden lg:block"
            >
                <div className="absolute -bottom-1.5 right-1/4 w-2 h-2 rounded-full bg-violet-400/60 blur-[2px]" />
            </motion.div>

            {/* ── Radial Edge Fade Mask ── */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50 dark:to-zinc-950" />
        </div>
    );
}



// ──────────────────────────────────────────────────────────
// FAQ SECTION
// ──────────────────────────────────────────────────────────
function FAQSection({ faqs }) {
    const [openIdx, setOpenIdx] = useState(null);

    return (
        <section className="py-24 bg-white dark:bg-[#05050A] transition-colors relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-400/5 dark:bg-indigo-500/8 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 relative z-10">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/40 rounded-full text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-widest mb-5">
                        <MessageCircle className="w-3 h-3" /> FAQ
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
                        Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-600">Questions</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-xl mx-auto">
                        Everything you need to know before you get started.
                    </p>
                </motion.div>

                {/* Accordion */}
                <div className="space-y-3">
                    {faqs.map((faq, i) => {
                        const isOpen = openIdx === i;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06 }}
                                className={`rounded-2xl border transition-all duration-300 ${isOpen
                                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50 shadow-md'
                                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/8 hover:border-indigo-200 dark:hover:border-indigo-800/40 hover:shadow-sm'
                                }`}
                            >
                                <button
                                    onClick={() => setOpenIdx(isOpen ? null : i)}
                                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                                >
                                    <span className={`font-bold text-base leading-snug transition-colors ${isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                                        {faq.question}
                                    </span>
                                    <motion.div
                                        animate={{ rotate: isOpen ? 45 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/8 text-slate-400'}`}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </motion.div>
                                </button>
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            key="answer"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                            <p className="px-6 pb-6 text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                                {faq.answer}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ──────────────────────────────────────────────────────────
// INTERACTIVE ROI CALCULATOR
// ──────────────────────────────────────────────────────────
const ROICalculator = () => {
    const [audience, setAudience] = useState(25000);
    const [aov, setAov] = useState(120);

    const emailConversion = 0.015; // 1.5%
    const waConversion = 0.075; // 7.5% (approx 5x)

    const currentRevenue = audience * aov * emailConversion;
    const projectedRevenue = audience * aov * waConversion;
    const additional = projectedRevenue - currentRevenue;
    const waMultiplier = (waConversion / emailConversion).toFixed(1);

    const formatCurr = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const formatNum = (val) => new Intl.NumberFormat('en-US').format(val);

    return (
        <section className="py-24 relative bg-zinc-950 transition-colors overflow-hidden border-t border-white/5">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-600/10 dark:bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[40%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:24px_24px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <span className="text-emerald-400 font-bold uppercase tracking-widest text-sm mb-4 flex items-center justify-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Discover Your Growth
                    </span>
                    <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-white tracking-tight leading-tight">
                        Calculate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">WhatsApp ROI</span>
                    </h2>
                    <p className="text-zinc-400 text-lg font-medium max-w-2xl mx-auto">
                        Stop leaving money on the table with low-converting emails. See how much extra revenue you could generate by switching to WhatsApp marketing.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    {/* Controls (Sliders) */}
                    <motion.div initial={{ opacity: 0, x:-20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lg:col-span-5 bg-white/5 border border-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-2xl">
                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-4">
                                <label className="text-zinc-300 font-bold text-xs md:text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Users className="w-4 h-4 text-indigo-400" /> Monthly Audience
                                </label>
                                <span className="text-2xl font-black text-white">{formatNum(audience)}</span>
                            </div>
                            <input 
                                type="range" min="1000" max="100000" step="1000" value={audience} onChange={(e) => setAudience(Number(e.target.value))}
                                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 transition-all"
                            />
                            <div className="flex justify-between text-xs text-zinc-500 mt-3 font-semibold">
                                <span>1K</span><span>100K+</span>
                            </div>
                        </div>

                        <div className="mb-2">
                            <div className="flex justify-between items-end mb-4">
                                <label className="text-zinc-300 font-bold text-xs md:text-sm uppercase tracking-wider flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-emerald-400" /> Avg. Order Value
                                </label>
                                <span className="text-2xl font-black text-white">{formatCurr(aov)}</span>
                            </div>
                            <input 
                                type="range" min="10" max="1000" step="10" value={aov} onChange={(e) => setAov(Number(e.target.value))}
                                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 transition-all"
                            />
                            <div className="flex justify-between text-xs text-zinc-500 mt-3 font-semibold">
                                <span>$10</span><span>$1,000+</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Visualization */}
                    <motion.div initial={{ opacity: 0, x:20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lg:col-span-7">
                        <div className="bg-black/40 border border-white/10 rounded-[2rem] p-6 md:p-8 relative overflow-hidden backdrop-blur-sm shadow-2xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                            
                            <div className="flex flex-col gap-6 md:gap-8 relative z-10">
                                {/* Current */}
                                <div>
                                    <div className="text-zinc-400 font-semibold text-xs md:text-sm mb-3 flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> Traditional Channels (Email/SMS) <span className="ml-auto text-zinc-500 text-[10px] uppercase font-bold tracking-widest hidden sm:inline-block">1.5% Conv.</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 bg-zinc-800/50 rounded-full h-8 md:h-10 overflow-hidden relative border border-white/5">
                                            <motion.div 
                                                className="h-full bg-zinc-600 rounded-full"
                                                initial={{ width: 0 }} animate={{ width: `20%` }} transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                        <div className="w-24 md:w-32 text-right text-lg md:text-xl font-bold text-zinc-300">{formatCurr(currentRevenue)}</div>
                                    </div>
                                </div>

                                {/* WhatsApp Projection */}
                                <div>
                                    <div className="text-emerald-400 font-semibold text-xs md:text-sm mb-3 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" /> WhatsApp Cloud Projection <span className="ml-auto text-emerald-500/70 text-[10px] uppercase font-bold tracking-widest hidden sm:inline-block">7.5% Conv.</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 bg-zinc-800/50 rounded-full h-8 md:h-10 overflow-hidden relative border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                            <motion.div 
                                                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full relative"
                                                initial={{ width: 0 }} animate={{ width: `100%` }} transition={{ duration: 0.5 }}
                                            >
                                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] opacity-20" />
                                            </motion.div>
                                        </div>
                                        <div className="w-24 md:w-32 text-right text-lg md:text-xl font-bold text-white">{formatCurr(projectedRevenue)}</div>
                                    </div>
                                </div>

                                <div className="h-px w-full bg-white/10 my-1" />

                                {/* Total Impact */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end p-5 md:p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-2xl relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/20 blur-[40px] rounded-full pointer-events-none" />
                                    <div className="relative z-10 w-full">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-emerald-400 font-bold uppercase tracking-wider text-xs md:text-sm mb-1">Additional Revenue Potential</div>
                                            <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] md:text-xs font-bold rounded-full whitespace-nowrap">
                                                {waMultiplier}x Higher Conversions
                                            </div>
                                        </div>
                                        <div className="text-3xl md:text-5xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
                                            +{formatCurr(additional)}
                                            <span className="text-base md:text-xl text-emerald-400/80 font-semibold">/mo</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

const CURRENCY_SYMBOLS = {
    USD: '$', INR: '₹', EUR: '€', GBP: '£',
    AED: 'د.إ', SAR: 'SR', AUD: 'A$', CAD: 'C$',
    SGD: 'S$', MYR: 'RM'
};

export default function LandingPage() {
    const [config, setConfig] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [error, setError] = useState(false);
    const [plans, setPlans] = useState([]);
    const [billingInterval, setBillingInterval] = useState('monthly');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [activeIndustry, setActiveIndustry] = useState(industries[0].id);

    const industryScrollRef = useRef(null);

    // Auto-scroll logic for industry tabs
    useEffect(() => {
        if (industryScrollRef.current && window.innerWidth < 1024) {
            const activeTab = Array.from(industryScrollRef.current.children).find(
                child => industries.find(ind => ind.id === activeIndustry)?.title === child.textContent
            );
            if (activeTab) {
                const scrollLeft = activeTab.offsetLeft - (industryScrollRef.current.offsetWidth / 2) + (activeTab.offsetWidth / 2);
                industryScrollRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [activeIndustry]);

    const hasMonthly = plans.some(p => parseFloat(p.monthlyPrice) > 0);
    const hasHalfYearly = plans.some(p => parseFloat(p.halfYearlyPrice) > 0);
    const hasYearly = plans.some(p => parseFloat(p.yearlyPrice) > 0);

    const maxHalfYearlySavings = Math.max(0, ...plans.map(p => {
        const m = parseFloat(p.monthlyPrice) || 0;
        const h = parseFloat(p.halfYearlyPrice) || 0;
        return (m > 0 && h > 0) ? Math.round(100 - (h / (m * 6) * 100)) : 0;
    }));

    const maxYearlySavings = Math.max(0, ...plans.map(p => {
        const m = parseFloat(p.monthlyPrice) || 0;
        const y = parseFloat(p.yearlyPrice) || 0;
        return (m > 0 && y > 0) ? Math.round(100 - (y / (m * 12) * 100)) : 0;
    }));

    useEffect(() => {
        if (plans.length > 0) {
            if (hasYearly) setBillingInterval('yearly');
            else if (hasHalfYearly) setBillingInterval('half-yearly');
            else if (hasMonthly) setBillingInterval('monthly');
        }
    }, [plans]);

    const [progressIndustries, setProgressIndustries] = useState(0);

    // Auto-autoplay loop for industry tabs on mobile
    useEffect(() => {
        let start = Date.now();
        const duration = 5000;
        const interval = setInterval(() => {
            if (window.innerWidth < 1024) {
                const elapsed = Date.now() - start;
                const pct = Math.min((elapsed / duration) * 100, 100);
                setProgressIndustries(pct);

                if (elapsed >= duration) {
                    setActiveIndustry(prev => {
                        const currentIndex = industries.findIndex(ind => ind.id === prev);
                        const nextIndex = (currentIndex + 1) % industries.length;
                        return industries[nextIndex].id;
                    });
                    start = Date.now(); // reset timer
                    setProgressIndustries(0);
                }
            } else {
                setProgressIndustries(0);
            }
        }, 50);
        return () => clearInterval(interval);
    }, [activeIndustry]); // Re-run when manually changed

    useEffect(() => {
        fetchConfig();
        fetchPlans();
        fetchPublicSettings();
    }, []);

    // Update SEO Meta
    useEffect(() => {
        if (config?.seo) {
            document.title = config.seo.title || 'WhatsApp Cloud';
            let metaDesc = document.querySelector("meta[name='description']");
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = "description";
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = config.seo.description || '';
        }
    }, [config]);

    const fetchConfig = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/landing');
            setConfig(res.data);
        } catch (err) {
            console.error(err);
            setError(true);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/plans/public');
            setPlans(res.data);
        } catch (err) {
            console.error('Failed to fetch plans', err);
        }
    };

    const fetchPublicSettings = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/settings/public');
            const currency = res.data?.currency || 'USD';
            setCurrencySymbol(CURRENCY_SYMBOLS[currency] || currency);
        } catch (err) {
            // Silently fall back to $ if settings unavailable
            console.warn('Could not fetch public settings, defaulting to USD.');
        }
    };

    if (error) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-800 gap-4">
            <p className="text-red-500 font-bold">Failed to load content.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg">Retry</button>
        </div>
    );

    if (!config) return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const isDark = config.theme === 'dark';

    return (
        <div className={isDark ? 'dark' : ''}>
            <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 font-sans overflow-x-hidden selection:bg-indigo-500/30 transition-colors duration-300">
                
                {/* 1. NAVBAR */}
                <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            {config.brand.name}
                        </div>

                        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
                            <a href="#platform" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Platform</a>
                            <a href="#solutions" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Solutions</a>
                            <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Pricing</a>
                            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-white transition-colors">FAQ</a>
                            <div className="h-4 w-[1px] bg-slate-300 dark:bg-white/10" />
                            <Link to="/login" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Log In</Link>
                            <Link to="/register" className="px-5 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all font-bold">
                                Get Started
                            </Link>
                        </div>

                        <button className="md:hidden text-slate-900 dark:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-white/10 overflow-hidden">
                                <div className="flex flex-col p-6 gap-6 text-center text-slate-600 dark:text-slate-300 font-semibold">
                                    <a href="#platform" onClick={() => setIsMenuOpen(false)}>Platform</a>
                                    <a href="#solutions" onClick={() => setIsMenuOpen(false)}>Solutions</a>
                                    <a href="#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</a>
                                    <div className="h-[1px] w-full bg-slate-200 dark:bg-white/10" />
                                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>Log In</Link>
                                    <Link to="/register" onClick={() => setIsMenuOpen(false)} className="bg-indigo-600 text-white py-3 rounded-full font-bold shadow-lg">Get Started</Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </nav>

                {/* 2. HERO SECTION */}
                <section className="relative pt-32 pb-20 md:pt-48 md:pb-24 px-6 overflow-hidden">
                    <HeroBackground />
                    
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                            
                            {/* Left Content */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center lg:text-left z-10 lg:col-span-6">
                                <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20 mb-6 flex items-center gap-2 max-w-fit mx-auto lg:mx-0">
                                    <Star className="w-3.5 h-3.5" /> Next-Gen Platform
                                </span>
                                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900 dark:text-white whitespace-pre-line">
                                    {config.hero.title}
                                </h1>
                                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium">
                                    {config.hero.subtitle}
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                    <Link to={config.hero.ctaLink || '/register'} className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2">
                                        {config.hero.ctaText || 'Start Free Trial'} <ArrowRight className="w-5 h-5" />
                                    </Link>
                                    <a href="#platform" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                        <Play className="w-5 h-5 fill-current" /> See how it works
                                    </a>
                                </div>
                            </motion.div>

                            {/* Right Mock UI */}
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 1 }} className="relative hidden lg:block lg:col-span-6">
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-2xl rounded-full" />
                                <div className="relative mx-auto w-[340px] h-[680px] bg-slate-900 dark:bg-[#0A0A0A] rounded-[3rem] border-[8px] border-slate-800 shadow-2xl p-4 overflow-hidden flex flex-col transition-colors ml-auto mr-0 xl:mr-10">
                                    {/* Phone Header */}
                                    <div className="flex items-center gap-3 pb-4 border-b border-white/10 px-2 mt-4">
                                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                            <MessageSquare className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm">AI Agent</div>
                                            <div className="text-[10px] text-green-400 font-bold tracking-wider uppercase">• Online</div>
                                        </div>
                                    </div>
                                    {/* Chat UI */}
                                    <div className="flex-1 py-4 space-y-4 text-sm font-medium">
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="bg-white/10 text-white rounded-2xl rounded-tl-sm p-3 max-w-[85%] self-start backdrop-blur-sm">
                                            Hi! 👋 Welcome to {config.brand.name}. How can we help you scale today?
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6 }} className="bg-green-600 text-white rounded-2xl rounded-tr-sm p-3 max-w-[85%] ml-auto">
                                            I need to automate my support and broadcast offers!
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.4 }} className="bg-white/10 text-white rounded-2xl rounded-tl-sm p-3 max-w-[85%] self-start backdrop-blur-sm">
                                            Perfect. Our AI handles 80% of support automatically. Want to see a quick demo?
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="flex gap-2 flex-wrap pt-2">
                                            <div className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-[11px] font-bold cursor-pointer">Yes, show me!</div>
                                            <div className="px-3 py-1.5 bg-white/5 text-white border border-white/10 rounded-full text-[11px] font-bold cursor-pointer">Pricing</div>
                                        </motion.div>
                                    </div>
                                    {/* Bottom Input */}
                                    <div className="w-full h-12 bg-white/5 rounded-full mt-auto flex items-center px-4 justify-between border border-white/10">
                                        <span className="text-white/40 text-sm font-medium">Message...</span>
                                        <Send className="w-4 h-4 text-white/40" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* 3. WHY CHOOSE US — Slim Trust Strip */}
                <section className="border-y border-slate-200 dark:border-white/5 bg-white dark:bg-black/20 transition-colors relative overflow-hidden">
                    <div className="max-w-6xl mx-auto px-4 py-10">
                        <p className="text-center text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-8">Why Choose Us</p>

                        <div className="flex flex-col sm:flex-row items-stretch gap-8 sm:divide-x sm:divide-slate-200 sm:dark:divide-white/10">

                            {/* Badge 1: Official WhatsApp API */}
                            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}
                                className="flex-1 flex flex-col items-center gap-4 px-4 text-center group">
                                <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20 shrink-0 group-hover:scale-110 transition-transform">
                                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                </div>
                                <div className="space-y-1">
                                    <div className="font-extrabold text-lg md:text-xl text-slate-900 dark:text-white leading-tight md:whitespace-nowrap">Official WhatsApp Business API</div>
                                    <div className="text-sm text-green-600 dark:text-green-400 font-bold uppercase tracking-wide md:whitespace-nowrap">✓ Meta Verified & Compliant</div>
                                </div>
                            </motion.div>

                            {/* Badge 2: Meta Business Tech Partner */}
                            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                                className="flex-1 flex flex-col items-center gap-4 px-4 text-center group">
                                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-lg shadow-blue-100/60 dark:shadow-blue-900/20 shrink-0 group-hover:scale-110 transition-transform p-2">
                                    <img
                                        src="/meta-icon.svg"
                                        alt="Meta"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="font-extrabold text-lg md:text-xl text-slate-900 dark:text-white leading-tight md:whitespace-nowrap">Meta Business Tech Partner</div>
                                    <div className="text-sm text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide md:whitespace-nowrap">✓ Officially Recognized by Meta</div>
                                </div>
                            </motion.div>

                            {/* Badge 3: Enterprise Security */}
                            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                                className="flex-1 flex flex-col items-center gap-4 px-4 text-center group">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 group-hover:scale-110 transition-transform">
                                    <Shield className="w-8 h-8 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <div className="font-extrabold text-lg md:text-xl text-slate-900 dark:text-white leading-tight md:whitespace-nowrap">Enterprise Security & 99.9% Uptime</div>
                                    <div className="text-sm text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide md:whitespace-nowrap">✓ GDPR Compliant · End-to-End Encrypted</div>
                                </div>
                            </motion.div>

                        </div>
                    </div>
                </section>

                <CapabilitiesBento config={config?.capabilities} />


                {/* 5. ADVANCED FEATURES */}
                <section id="platform" className="py-20 bg-slate-50 dark:bg-zinc-950 transition-colors overflow-hidden relative">
                    {/* Ambient glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-400/5 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                    <div className="max-w-7xl mx-auto px-6">
                        {/* Premium Header */}
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/40 rounded-full text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-widest mb-5">
                                <Zap className="w-3 h-3" /> Platform Features
                            </div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                                <span className="text-slate-900 dark:text-white">{config.advancedFeatures?.title?.replace(/ drive Conversions$/, ' drive ') || 'Advanced Features that drive '}</span>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600">Conversions</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
                                {config.advancedFeatures?.subtitle || 'Everything you need to market, sell, and support customers — all inside WhatsApp.'}
                            </p>
                        </motion.div>

                        {/* Quick-glance stats strip */}
                        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
                            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mb-12 text-sm font-bold">
                            {[['📣','Bulk Broadcast'],['🤖','AI Chatbots'],['💬','Live Inbox'],['📊','Analytics'],['🛒','Commerce'],['⚡','Quick Replies'],['🎯','Retargeting'],['🔑','API Access']].map(([icon, label], i) => (
                                <div key={i} className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                    <span>{icon}</span><span>{label}</span>
                                    {i < 7 && <span className="ml-8 text-slate-200 dark:text-white/10">·</span>}
                                </div>
                            ))}
                        </motion.div>

                        {/* Two-column layout: Feature tabs left, Live preview right */}
                        <AdvancedFeaturesShowcase config={config?.advancedFeatures} />
                    </div>
                </section>


                <section id="solutions" className="py-24 bg-slate-50 dark:bg-[#05050A] transition-colors overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-12 md:mb-16">
                            <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold mb-4 text-slate-900 dark:text-white tracking-tight leading-tight">{config.industries?.title || 'Built for every industry'}</h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">{config.industries?.subtitle || 'See how leading verticals leverage WhatsApp to cut costs and drive unprecedented revenue.'}</p>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            <div 
                                ref={industryScrollRef}
                                className="w-full lg:w-1/3 flex lg:flex-col flex-row gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 hide-scrollbar scroll-smooth"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {/* Merge DB config over hardcoded visual defaults */}
                                {(config.industries?.items || industries).map(ind => {
                                    const defaults = INDUSTRY_DEFAULTS[ind.id] || {};
                                    const Icon = defaults.icon || ShoppingCart;
                                    const isActive = activeIndustry === ind.id;
                                    return (
                                        <button 
                                            key={ind.id}
                                            onClick={() => setActiveIndustry(ind.id)}
                                            className={`p-4 rounded-2xl flex items-center gap-4 transition-all text-left font-bold text-base md:text-lg shrink-0 lg:shrink-1 whitespace-nowrap lg:whitespace-normal border ${isActive ? 'bg-indigo-600 text-white shadow-lg border-transparent' : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-100 dark:border-white/5 opacity-70 lg:opacity-100'}`}
                                        >
                                            <Icon className={`w-5 h-5 md:w-6 md:h-6 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                            {ind.title}
                                            {isActive && (
                                                <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full lg:hidden overflow-hidden">
                                                    <motion.div 
                                                        className="h-full bg-white" 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progressIndustries}%` }}
                                                        transition={{ ease: "linear" }}
                                                    />
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="md:w-2/3">
                                <AnimatePresence mode="wait">
                                    {(config.industries?.items || industries).map(ind => {
                                        const defaults = INDUSTRY_DEFAULTS[ind.id] || {};
                                        return ind.id === activeIndustry && (
                                        <motion.div 
                                            key={ind.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl min-h-[400px] flex flex-col"
                                        >
                                            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">{ind.title}</h3>
                                            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium mb-8 leading-relaxed max-w-xl">
                                                {ind.desc}
                                            </p>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-auto">
                                                {(Array.isArray(ind.metrics) ? ind.metrics : []).map((m, i) => (
                                                    <div key={i} className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-3">
                                                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{m}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {ind.image ? (
                                                <div className="mt-8 w-full h-40 md:h-64 rounded-2xl overflow-hidden">
                                                    <img src={ind.image} alt={ind.title} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className={`mt-8 w-full h-40 md:h-64 rounded-2xl ${defaults.imagePattern || 'bg-indigo-500'} opacity-20 dark:opacity-10`} />
                                            )}
                                        </motion.div>
                                    )})}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </section>



                <ROICalculator />

                {/* 8. INTEGRATIONS */}
                <section id="integrations" className="py-20 bg-white dark:bg-zinc-950 relative overflow-hidden">
                    {/* Subtle bg texture */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(99,102,241,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(99,102,241,0.12),transparent)] pointer-events-none" />

                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                            {/* LEFT: Text Content */}
                            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/40 rounded-full text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-widest mb-5">
                                    <Zap className="w-3 h-3" /> Integrations
                                </div>
                                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
                                    Connects with apps<br /> you already use
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium text-base mb-8 leading-relaxed">
                                    Plug into your existing tech stack instantly — CRM, e-commerce, helpdesk, and automation tools. No developer, no friction.
                                </p>

                                {/* Feature bullets */}
                                <div className="space-y-3 mb-8">
                                    {[
                                        { icon: '⚡', text: 'One-click native integrations' },
                                        { icon: '🔄', text: 'Real-time bidirectional sync' },
                                        { icon: '🛠️', text: 'Zapier & Make.com support' },
                                        { icon: '📡', text: 'REST API + Webhooks included' },
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -12 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.08 + 0.2 }}
                                            className="flex items-center gap-3"
                                        >
                                            <span className="text-base">{item.icon}</span>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.text}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Mini stats */}
                                <div className="flex gap-6">
                                    {[
                                        { val: '50+', label: 'Integrations' },
                                        { val: '< 5 min', label: 'Setup time' },
                                        { val: '99.9%', label: 'Uptime' },
                                    ].map((s, i) => (
                                        <div key={i}>
                                            <div className="text-xl font-black text-slate-900 dark:text-white">{s.val}</div>
                                            <div className="text-xs text-slate-400 font-semibold">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* RIGHT: Floating Integration Card Grid */}
                            <div className="relative">
                                {/* Glow behind grid */}
                                <div className="absolute inset-0 bg-indigo-400/10 dark:bg-indigo-500/15 rounded-3xl blur-3xl scale-90 pointer-events-none" />

                                <div className="relative grid grid-cols-3 gap-3">
                                    {[
                                        { name: 'Shopify', emoji: '🛒', color: 'bg-green-50 dark:bg-green-950/40 border-green-100 dark:border-green-900/50', dot: 'bg-green-400', delay: 0 },
                                        { name: 'HubSpot', emoji: '🧲', color: 'bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-900/50', dot: 'bg-orange-400', delay: 0.05 },
                                        { name: 'Zapier', emoji: '⚡', color: 'bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/50', dot: 'bg-red-400', delay: 0.1 },
                                        { name: 'Zoho CRM', emoji: '📊', color: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50', dot: 'bg-blue-400', delay: 0.15 },
                                        { name: 'WhatsApp', emoji: '💬', color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-400', delay: 0.2, featured: true },
                                        { name: 'Make.com', emoji: '🔗', color: 'bg-violet-50 dark:bg-violet-950/40 border-violet-100 dark:border-violet-900/50', dot: 'bg-violet-400', delay: 0.25 },
                                        { name: 'Salesforce', emoji: '☁️', color: 'bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900/50', dot: 'bg-sky-400', delay: 0.3 },
                                        { name: 'WooCommerce', emoji: '🏪', color: 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/50', dot: 'bg-purple-400', delay: 0.35 },
                                        { name: 'Google Sheets', emoji: '📋', color: 'bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/50', dot: 'bg-teal-400', delay: 0.4 },
                                    ].map((item, i) => (
                                        <motion.div
                                            key={item.name}
                                            initial={{ opacity: 0, y: 16, scale: 0.95 }}
                                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: item.delay, type: 'spring', stiffness: 180 }}
                                            whileHover={{ y: -4, scale: 1.04, zIndex: 10 }}
                                            className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border ${item.color} ${item.featured ? 'ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20' : 'shadow-sm hover:shadow-md'} transition-shadow cursor-default`}
                                        >
                                            <span className="text-2xl">{item.emoji}</span>
                                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 text-center leading-tight">{item.name}</span>
                                            {/* Live status dot */}
                                            <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${item.dot} animate-pulse`} />
                                        </motion.div>
                                    ))}
                                </div>

                                {/* "All connected" badge */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    All integrations live & syncing
                                </motion.div>
                            </div>
                        </div>

                        {/* Marquee — compact strip */}
                        <div className="relative overflow-hidden mt-16 pt-10 border-t border-slate-100 dark:border-white/5">
                            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
                            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
                            <div className="flex gap-3 animate-[marquee_22s_linear_infinite] w-max">
                                {[...integrationLogos, { name: 'Google Sheets', color: 'text-teal-600' }, { name: 'Freshdesk', color: 'text-cyan-600' }, { name: 'Stripe', color: 'text-indigo-600' }, { name: 'Notion', color: 'text-slate-700' }, ...integrationLogos, { name: 'Google Sheets', color: 'text-teal-600' }, { name: 'Freshdesk', color: 'text-cyan-600' }, { name: 'Stripe', color: 'text-indigo-600' }, { name: 'Notion', color: 'text-slate-700' }].map((logo, i) => (
                                    <div key={i} className={`flex-shrink-0 inline-flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/8 px-4 py-2 rounded-full text-xs font-bold ${logo.color}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                        {logo.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @keyframes marquee {
                            from { transform: translateX(0); }
                            to { transform: translateX(-50%); }
                        }
                    `}</style>
                </section>

                {/* 9. HOW IT WORKS (STEPS) */}
                {config.steps && config.steps.length > 0 && (
                    <section className="py-16 bg-slate-50 dark:bg-[#05050A] relative overflow-hidden">
                        {/* Subtle gradient bg */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,rgba(99,102,241,0.08),transparent)] pointer-events-none" />

                        <div className="max-w-6xl mx-auto px-6">
                            {/* Compact header */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/40 rounded-full text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-widest mb-3">
                                        <Zap className="w-3 h-3" /> Quick Start
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Setup in 5 minutes</h2>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xs sm:text-right">No coding required. Get your first message out in minutes.</p>
                            </div>

                            {/* Steps — horizontal cards with connecting line */}
                            <div className="relative">
                                {/* Animated connector line */}
                                <div className="hidden md:block absolute top-8 left-[calc(100%/6)] right-[calc(100%/6)] h-px bg-indigo-100 dark:bg-white/8 z-0">
                                    <div className="h-full bg-gradient-to-r from-indigo-300 via-violet-400 to-indigo-300 dark:from-indigo-600 dark:via-violet-500 dark:to-indigo-600 animate-[shimmer_3s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
                                </div>

                                <div className={`grid grid-cols-1 md:grid-cols-${Math.min(config.steps.length, 4)} gap-4 relative z-10`}>
                                    {config.steps.map((step, i) => {
                                        const StepIcon = resolveIcon(step.icon, Plus);
                                        const gradients = [
                                            'from-indigo-500 to-violet-500 shadow-indigo-500/30',
                                            'from-violet-500 to-purple-500 shadow-violet-500/30',
                                            'from-purple-500 to-pink-500 shadow-purple-500/30',
                                            'from-pink-500 to-rose-500 shadow-rose-500/30',
                                        ];
                                        const grad = gradients[i % gradients.length];
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 16 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: i * 0.1, duration: 0.4 }}
                                                className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/8 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                                            >
                                                {/* Step number + icon row */}
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform`}>
                                                        <StepIcon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Step {String(i + 1).padStart(2, '0')}</span>
                                                </div>
                                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5 leading-tight">{str(step.title)}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{str(step.description)}</p>

                                                {/* Arrow connector for desktop */}
                                                {i < config.steps.length - 1 && (
                                                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-full items-center justify-center z-20 shadow-sm">
                                                        <ArrowRight className="w-3 h-3 text-indigo-400" />
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <style>{`
                            @keyframes shimmer {
                                0%, 100% { background-position: 200% 0; }
                                50% { background-position: -200% 0; }
                            }
                        `}</style>
                    </section>
                )}


                {/* 10. SOCIAL PROOF / TESTIMONIALS */}
                {config.testimonials && config.testimonials.length > 0 && (
                    <section className="py-24 bg-slate-50 dark:bg-[#05050A]">
                        <div className="max-w-7xl mx-auto px-6">
                            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center mb-16">Loved by go-to-market teams</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {config.testimonials.map((t, i) => (
                                    <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-shadow">
                                        <div className="flex gap-1 mb-6">
                                            {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                                        </div>
                                        <p className="text-lg text-slate-700 dark:text-slate-300 font-medium mb-8">"{str(t.quote)}"</p>
                                        <div className="flex items-center gap-4">
                                            {t.avatar ? (
                                                <img src={str(t.avatar)} className="w-12 h-12 rounded-full object-cover bg-slate-100" alt={str(t.name)}/>
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300">
                                                    {str(t.name).substring(0,1)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">{str(t.name)}</div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{str(t.role)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}


                {/* 11. PRICING */}
                {plans.length > 0 && (
                    <section id="pricing" className="py-24 relative bg-white dark:bg-zinc-950 transition-colors">
                        <div className="max-w-7xl mx-auto px-6">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-slate-900 dark:text-white tracking-tight">Simple, transparent pricing</h2>
                                <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg font-medium">Choose the perfect plan to scale your customer engagement seamlessly. No hidden fees.</p>
                            </div>

                            {/* Interval Toggle */}
                            <div className="flex justify-center mb-16">
                                <div className="inline-flex bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 gap-1 shadow-inner">
                                    {hasMonthly && (
                                        <button
                                            onClick={() => setBillingInterval('monthly')}
                                            className={`relative flex flex-col items-center justify-center px-7 py-3 rounded-xl text-sm font-bold transition-all duration-300 min-w-[100px] ${
                                                billingInterval === 'monthly'
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            <span className="font-extrabold text-[15px] tracking-tight">Monthly</span>
                                        </button>
                                    )}
                                    {hasHalfYearly && (
                                        <button
                                            onClick={() => setBillingInterval('half-yearly')}
                                            className={`relative flex flex-col items-center justify-center px-7 py-3 rounded-xl text-sm font-bold transition-all duration-300 min-w-[100px] ${
                                                billingInterval === 'half-yearly'
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            <span className="font-extrabold text-[15px] tracking-tight">Half-Yearly</span>
                                            {maxHalfYearlySavings > 0 && (
                                                <span className={`mt-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                                    billingInterval === 'half-yearly'
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                }`}>
                                                    Save {maxHalfYearlySavings}%
                                                </span>
                                            )}
                                        </button>
                                    )}
                                    {hasYearly && (
                                        <button
                                            onClick={() => setBillingInterval('yearly')}
                                            className={`relative flex flex-col items-center justify-center px-7 py-3 rounded-xl text-sm font-bold transition-all duration-300 min-w-[100px] ${
                                                billingInterval === 'yearly'
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            <span className="font-extrabold text-[15px] tracking-tight">Yearly</span>
                                            {maxYearlySavings > 0 && (
                                                <span className={`mt-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                                    billingInterval === 'yearly'
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-emerald-500 text-white dark:bg-emerald-600 shadow-sm shadow-emerald-500/30'
                                                }`}>
                                                    Save {maxYearlySavings}%
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>


                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
                                {plans.map((plan, i) => {
                                    const isPopular = plan.name === 'Pro' || plan.name === 'Business';
                                    
                                    // Determine Display Price
                                    let displayPrice = parseFloat(plan.price);
                                    let displayInterval = 'mo';
                                    let internalIntervalCode = 'month';
                                    
                                    if (billingInterval === 'monthly' && parseFloat(plan.monthlyPrice) > 0) {
                                        displayPrice = parseFloat(plan.monthlyPrice);
                                        displayInterval = 'mo';
                                        internalIntervalCode = 'month';
                                    } else if (billingInterval === 'half-yearly' && parseFloat(plan.halfYearlyPrice) > 0) {
                                        displayPrice = parseFloat(plan.halfYearlyPrice);
                                        displayInterval = '6mo';
                                        internalIntervalCode = 'half-year';
                                    } else if (billingInterval === 'yearly' && parseFloat(plan.yearlyPrice) > 0) {
                                        displayPrice = parseFloat(plan.yearlyPrice);
                                        displayInterval = 'yr';
                                        internalIntervalCode = 'year';
                                    }

                                    return (
                                        <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                            className={`p-8 rounded-[2.5rem] border flex flex-col h-full transition-all ${isPopular 
                                                ? 'bg-indigo-600 dark:bg-indigo-900/40 border-indigo-500 text-white transform md:-translate-y-4 shadow-2xl shadow-indigo-600/20 relative' 
                                                : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white hover:shadow-xl hover:border-indigo-500/30'
                                            }`}
                                        >
                                            {isPopular && <div className="absolute top-0 right-1/2 translate-x-1/2 px-4 py-1.5 bg-indigo-500 text-white text-[10px] uppercase tracking-widest font-bold rounded-b-xl shadow-md">MOST POPULAR</div>}

                                            <h3 className="text-2xl font-bold mb-2 pt-2">{plan.name}</h3>
                                            <p className={`text-sm mb-8 font-medium ${isPopular ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>{plan.description || 'Perfect for growing businesses.'}</p>
                                            
                                            <div className="flex items-baseline gap-1 mb-10 pb-10 border-b border-indigo-500/20 dark:border-white/10">
                                                <span className="text-5xl font-extrabold">{currencySymbol}{displayPrice.toLocaleString()}</span>
                                                <span className={`font-bold ${isPopular ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>/{displayInterval}</span>
                                            </div>

                                            <div className="space-y-6 mb-10 flex-1">
                                                {/* Core Limits */}
                                                <div>
                                                    <div className={`font-bold text-[10px] tracking-widest uppercase mb-3 ${isPopular ? 'text-indigo-200' : 'text-slate-400'}`}>Core</div>
                                                    <ul className="space-y-3">
                                                        <li className="flex items-center gap-3 text-sm font-semibold">
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                            <span>{plan.messageLimit.toLocaleString()} Messages/mo</span>
                                                        </li>
                                                        <li className="flex items-center gap-3 text-sm font-semibold">
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                            <span>{plan.contactLimit.toLocaleString()} Contacts</span>
                                                        </li>
                                                        {plan.templateLimit > 0 && (
                                                            <li className="flex items-center gap-3 text-sm font-semibold">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                                <span>{plan.templateLimit} Message Templates</span>
                                                            </li>
                                                        )}
                                                        {plan.teamMemberLimit > 0 && (
                                                            <li className="flex items-center gap-3 text-sm font-semibold">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                                <span>{plan.teamMemberLimit} Team Members</span>
                                                            </li>
                                                        )}
                                                        <li className={`flex items-center gap-3 text-sm font-semibold ${!plan.flowBotEnabled ? 'opacity-70' : ''}`}>
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.flowBotEnabled ? (isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400') : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                {plan.flowBotEnabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                            </div>
                                                            <span>AI FlowBot Builder</span>
                                                        </li>
                                                    </ul>
                                                </div>

                                                {/* Capabilities */}
                                                {(plan.allowApiAccess || plan.aiTokensAllowance > 0 || (Array.isArray(plan.includedAddons) && plan.includedAddons.length > 0)) && (
                                                    <div>
                                                        <div className={`font-bold text-[10px] tracking-widest uppercase mb-3 ${isPopular ? 'text-indigo-200' : 'text-slate-400'}`}>Add-ons</div>
                                                        <ul className="space-y-3">
                                                            <li className={`flex items-center gap-3 text-sm font-semibold ${!plan.allowApiAccess ? 'opacity-70' : ''}`}>
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.allowApiAccess ? (isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400') : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                {plan.allowApiAccess ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                                </div>
                                                                <span>Developer API Access</span>
                                                            </li>

                                                        {plan.aiTokensAllowance > 0 && (
                                                            <li className="flex items-center gap-3 text-sm font-semibold">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                                <span>{plan.aiTokensAllowance.toLocaleString()} AI Tokens Included</span>
                                                            </li>
                                                        )}
                                                        {Array.isArray(plan.includedAddons) && plan.includedAddons.length > 0 && (
                                                            <li className="flex items-start gap-3 text-sm font-semibold">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                                <div className="flex flex-col">
                                                                    <span>{plan.includedAddons.length} Add-on{plan.includedAddons.length > 1 ? 's' : ''} Included</span>
                                                                    <ul className="mt-2 space-y-1.5">
                                                                        {plan.includedAddons.map(addonKey => (
                                                                            <li key={addonKey} className={`text-xs font-semibold flex items-center gap-1.5 ${isPopular ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0"></div>
                                                                                {addonKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </li>
                                                        )}
                                                    </ul>
                                                </div>
                                                )}

                                                {/* Custom Features list */}
                                                {(plan.quickReplyLimit > 0 || plan.tagLimit > 0 || plan.groupLimit > 0 || (Array.isArray(plan.features) && plan.features.length > 0)) && (
                                                    <div>
                                                        <div className={`font-bold text-[10px] tracking-widest uppercase mb-3 ${isPopular ? 'text-indigo-200' : 'text-slate-400'}`}>Features</div>
                                                        <ul className="space-y-3">
                                                            {plan.quickReplyLimit > 0 && (
                                                                <li className="flex items-center gap-3 text-sm font-semibold">
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                                    <span>{plan.quickReplyLimit} Quick Replies</span>
                                                                </li>
                                                            )}
                                                            {plan.tagLimit > 0 && (
                                                                <li className="flex items-center gap-3 text-sm font-semibold">
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                                    <span>{plan.tagLimit} Contact Tags</span>
                                                                </li>
                                                            )}
                                                            {plan.groupLimit > 0 && (
                                                                <li className="flex items-center gap-3 text-sm font-semibold">
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                                    <span>{plan.groupLimit} Contact Groups</span>
                                                                </li>
                                                            )}
                                                            {Array.isArray(plan.features) && plan.features.map((feat, fi) => (
                                                                <li key={fi} className="flex items-start gap-3 text-sm font-semibold">
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}><Check className="w-3 h-3" /></div>
                                                                    <span className="leading-tight">{feat}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>


                                            <Link to={`/register?plan=${plan.id}&interval=${internalIntervalCode}`} className={`w-full py-4 rounded-xl font-bold text-center transition-all ${isPopular ? 'bg-white text-indigo-600 hover:bg-slate-50 shadow-md' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white'}`}>
                                                Choose {plan.name}
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* 13. FAQ Section */}
                {config.faqs && config.faqs.length > 0 && (
                    <FAQSection faqs={config.faqs} />
                )}

                {/* 14. CTA Section */}

                <section className="py-24 px-6 relative z-10 bg-white dark:bg-zinc-950">
                    <div className="max-w-6xl mx-auto rounded-[3rem] overflow-hidden bg-indigo-600 dark:bg-indigo-900 relative border border-indigo-500/50 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/40 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative py-24 px-8 md:px-20 text-center flex flex-col items-center">
                            <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight text-white max-w-3xl leading-[1.1]">
                                {config.cta.title}
                            </h2>
                            <p className="text-indigo-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-bold">
                                {config.cta.subtitle}
                            </p>
                            <Link to="/register" className="inline-flex items-center gap-2 px-10 py-5 bg-white text-indigo-700 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-2xl shadow-indigo-900/50">
                                {config.cta.buttonText} <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* 14. EXPANDED FOOTER */}
                <footer className="pt-20 pb-10 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 transition-colors">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
                            <div className="col-span-2 lg:col-span-2 space-y-6">
                                <div className="flex items-center gap-3 font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                                        <MessageSquare className="w-5 h-5 text-white" />
                                    </div>
                                    {config.brand.name}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs">{config.brand.footerText || 'The operating system for official WhatsApp Business API conversations.'}</p>
                                <div className="flex gap-4">
                                    {[
                                        { id: 'twitter', icon: Twitter, defaultUrl: 'https://twitter.com' },
                                        { id: 'facebook', icon: Facebook, defaultUrl: 'https://facebook.com' },
                                        { id: 'linkedin', icon: Linkedin, defaultUrl: 'https://linkedin.com' },
                                        { id: 'instagram', icon: Instagram, defaultUrl: 'https://instagram.com' }
                                    ].map((soc, index) => {
                                        const url = config.seo?.socialLinks?.[soc.id] || soc.defaultUrl;
                                        const SocIcon = soc.icon;
                                        return (
                                            <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white hover:bg-indigo-600 hover:text-white transition-colors">
                                                <SocIcon className="w-4 h-4" />
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Render Dynamic Footer Columns */}
                            {config.footer?.columns && Array.isArray(config.footer.columns) ? (
                                config.footer.columns.map((col, idx) => (
                                    <div key={idx}>
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">{col.heading}</h4>
                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
                                            {col.links && col.links.map((link, lIdx) => {
                                                const isExternal = link.href.startsWith('http');
                                                const isAnchor = link.href.startsWith('#');
                                                
                                                if (isExternal) {
                                                    return <li key={lIdx}><a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-white transition-colors">{link.label}</a></li>;
                                                } else if (isAnchor) {
                                                    return <li key={lIdx}><a href={link.href} className="hover:text-indigo-600 dark:hover:text-white transition-colors">{link.label}</a></li>;
                                                } else {
                                                    return <li key={lIdx}><Link to={link.href} className="hover:text-indigo-600 dark:hover:text-white transition-colors">{link.label}</Link></li>;
                                                }
                                            })}
                                        </ul>
                                    </div>
                                ))
                            ) : (
                               // Fallback to static columns if footer config is missing
                                <>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Product</h4>
                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
                                            <li><a href="#platform" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Features</a></li>
                                            <li><a href="#pricing" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Pricing</a></li>
                                            <li><Link to="/blog" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Blog</Link></li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Company</h4>
                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
                                            <li><Link to="/about" className="hover:text-indigo-600 dark:hover:text-white transition-colors">About Us</Link></li>
                                            <li><Link to="/partner" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Partner with Us</Link></li>
                                            <li><Link to="/contact" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Contact Support</Link></li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Legal</h4>
                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
                                            <li><Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Privacy Policy</Link></li>
                                            <li><Link to="/terms" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Terms of Service</Link></li>
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-500 dark:text-slate-500">
                            <div>
                                {config.footer?.bottomBarLeft 
                                    ? config.footer.bottomBarLeft.replace('{year}', new Date().getFullYear()).replace('{brand}', config.brand.name)
                                    : `© ${new Date().getFullYear()} ${config.brand.name}. All rights reserved.`}
                            </div>
                            <div className="flex gap-4">
                                {config.footer?.bottomBarRight ? (
                                    config.footer.bottomBarRight.split(/•|\|/).map((part, i) => (
                                        <React.Fragment key={i}>
                                            {i > 0 && <span>•</span>}
                                            <span>{part.trim()}</span>
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <>
                                        <span>Built for Scale</span>
                                        <span>•</span>
                                        <span>99.9% Uptime</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
