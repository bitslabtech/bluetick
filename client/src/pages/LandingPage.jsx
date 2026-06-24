// @refresh reset
import React, { useState, useEffect, useRef } from 'react';
import { m as motion, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Zap, MessageSquare, BarChart, Shield, Send, Server, Users,
    ArrowRight, Check, Star, Menu, X, Smartphone, Calendar,
    ArrowUpRight, Play, Globe, Code, Layers, Mail, Plus, Minus,
    ShoppingCart, Briefcase, GraduationCap, HeartPulse, Building,
    HeadphonesIcon, MessageCircle, User, Plane, Landmark, Car, Store, TrendingUp,
    Twitter, Facebook, Linkedin, Instagram,
    CreditCard, Truck, LayoutTemplate, Repeat, QrCode,
    Megaphone, Activity, Target, SplitSquareHorizontal, Wand2,
    LayoutGrid, ListOrdered, Tag, FileText, LineChart, Wifi, Search, Filter, Info
} from 'lucide-react';
import PublicHeader from '../components/landing/PublicHeader';
import FloatingChatbot from '../components/landing/FloatingChatbot';

// Icon Map for dynamic rendering
const IconMap = {
    Zap, MessageSquare, BarChart, Shield, Send, Server, Users, Star,
    ArrowRight, Check, Smartphone, Calendar, ArrowUpRight, Play, Globe, Code, Layers,
    ShoppingCart, Briefcase, GraduationCap, HeartPulse, Building, HeadphonesIcon, MessageCircle,
    UserPlus: Users, Mail, Plane, Landmark, Car, Store, CreditCard, Truck, LayoutTemplate, Repeat, QrCode,
    Megaphone, Activity, Target, SplitSquareHorizontal, Wand2,
    LayoutGrid, ListOrdered, Tag, FileText, LineChart, Wifi
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

export const industries = [
    { id: 'ecommerce', icon: ShoppingCart, title: 'E-Commerce', desc: 'Recover abandoned carts, send shipping updates, and run flash sales directly on WhatsApp.', metrics: ['80% higher cart recovery', '3x repeat purchase rate'], imagePattern: 'bg-indigo-500' },
    { id: 'education', icon: GraduationCap, title: 'Education (Edtech)', desc: 'Send fee reminders, zoom links, and automated course updates to students and parents instantly.', metrics: ['99% communication delivery', 'Cut admin time by 60%'], imagePattern: 'bg-emerald-500' },
    { id: 'realestate', icon: Building, title: 'Real Estate', desc: 'Share property brochures, schedule site visits, and qualify leads 24/7 with an AI Agent.', metrics: ['5x more leads qualified', 'Instant prospect engagement'], imagePattern: 'bg-amber-500' },
    { id: 'healthcare', icon: HeartPulse, title: 'Healthcare', desc: 'Automate appointment booking, send prescription reminders, and handle basic triage automatically.', metrics: ['Reduce no-shows by 40%', 'HIPAA-compliant secure chats'], imagePattern: 'bg-cyan-500' },
    { id: 'travel', icon: Plane, title: 'Travel & Tours', desc: 'Send booking confirmations, flight updates, and offer 24/7 concierge services efficiently.', metrics: ['24/7 instant support', '95% faster query resolution'], imagePattern: 'bg-sky-500' },
    { id: 'finance', icon: Landmark, title: 'Fintech & Banking', desc: 'Share real-time transaction alerts, automate loan queries, and provide secure account updates.', metrics: ['End-to-end encryption', '2x faster document collection'], imagePattern: 'bg-purple-500' },
    { id: 'automotive', icon: Car, title: 'Automotive', desc: 'Schedule test drives, automate service reminders, and share interactive vehicle brochures.', metrics: ['3x test drives booked', 'Higher service retention'], imagePattern: 'bg-rose-500' },
    { id: 'retail', icon: Store, title: 'Retail & FMCG', desc: 'Run localized promotional campaigns, build loyal customer communities, and handle store inquiries.', metrics: ['Boost footfall by 40%', 'Higher coupon redemption'], imagePattern: 'bg-orange-500' },
    { id: 'logistics', icon: Truck, title: 'Logistics & Delivery', desc: 'Send real-time delivery status, route updates, and collect proof of delivery via WhatsApp.', metrics: ['Zero missed deliveries', '70% fewer support calls'], imagePattern: 'bg-blue-500' },
    { id: 'hospitality', icon: Building, title: 'Hotels & Hospitality', desc: 'Automate check-in confirmations, upsell services, and gather instant guest feedback on WhatsApp.', metrics: ['Higher upsell revenue', '4.8★ avg guest rating'], imagePattern: 'bg-amber-600' },
    { id: 'insurance', icon: Shield, title: 'Insurance', desc: 'Simplify policy renewals, claim updates, and lead qualification with smart WhatsApp chatbots.', metrics: ['2x faster claim updates', '50% lower acquisition cost'], imagePattern: 'bg-teal-500' },
    { id: 'fmcg', icon: Tag, title: 'D2C & FMCG Brands', desc: 'Build a branded WhatsApp storefront, run loyalty programs, and collect post-purchase reviews.', metrics: ['40% higher LTV', 'Zero third-party fees'], imagePattern: 'bg-pink-500' },
    { id: 'recruitment', icon: Users, title: 'Recruitment & HR', desc: 'Automate candidate screening, interview scheduling, and onboarding workflows over WhatsApp.', metrics: ['3x faster shortlisting', '80% candidate response rate'], imagePattern: 'bg-violet-500' },
    { id: 'govt', icon: Landmark, title: 'Government & NGOs', desc: 'Broadcast citizen alerts, collect feedback, and deliver public services at massive scale on WhatsApp.', metrics: ['99% message delivery', 'Millions reached instantly'], imagePattern: 'bg-emerald-600' },
    { id: 'media', icon: Megaphone, title: 'Media & Publishing', desc: 'Deliver breaking news alerts, personalized content digests, and subscription renewals via WhatsApp.', metrics: ['5x subscriber engagement', '3x content click-through'], imagePattern: 'bg-red-500' },
    { id: 'beauty', icon: Star, title: 'Beauty & Wellness', desc: 'Handle appointment bookings, send aftercare tips, and run exclusive member-only flash sales.', metrics: ['60% fewer no-shows', '2x repeat bookings'], imagePattern: 'bg-fuchsia-500' },
];

// Icon map keyed by id — keeps visual tokens hardcoded on frontend
const INDUSTRY_DEFAULTS = {
    ecommerce: { icon: ShoppingCart, imagePattern: 'bg-indigo-500' },
    education: { icon: GraduationCap, imagePattern: 'bg-emerald-500' },
    realestate: { icon: Building, imagePattern: 'bg-amber-500' },
    healthcare: { icon: HeartPulse, imagePattern: 'bg-cyan-500' },
    travel: { icon: Plane, imagePattern: 'bg-sky-500' },
    finance: { icon: Landmark, imagePattern: 'bg-purple-500' },
    automotive: { icon: Car, imagePattern: 'bg-rose-500' },
    retail: { icon: Store, imagePattern: 'bg-orange-500' },
    logistics: { icon: Truck, imagePattern: 'bg-blue-500' },
    hospitality: { icon: Building, imagePattern: 'bg-amber-600' },
    insurance: { icon: Shield, imagePattern: 'bg-teal-500' },
    fmcg: { icon: Tag, imagePattern: 'bg-pink-500' },
    recruitment: { icon: Users, imagePattern: 'bg-violet-500' },
    govt: { icon: Landmark, imagePattern: 'bg-emerald-600' },
    media: { icon: Megaphone, imagePattern: 'bg-red-500' },
    beauty: { icon: Star, imagePattern: 'bg-fuchsia-500' },
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
            { id: 'marketing', title: 'Click-to-WhatsApp\nMeta Ads', desc: 'Launch CTWA campaigns on Facebook & Instagram. Capture leads instantly into your WhatsApp inbox.', tag: 'Meta Marketing' },
            { id: 'support', title: 'Shared Team Inbox', desc: 'Collaborate with multiple agents on a single WhatsApp number to resolve queries lightning fast.', tag: 'Support' },
            { id: 'automation', title: 'No-Code AI Chatbots', tag: 'Automation' },
            { id: 'commerce', title: 'Native WhatsApp\nStore', desc: 'Sell directly in-chat with rich product catalogs and native checkout flows.', tag: 'Commerce' },
            { id: 'vcard', title: 'Premium Digital\nvCards', desc: 'Create stunning interactive business cards. Capture leads instantly via QR.', tag: 'Networking' }
        ]
    };
    const data = config || defaultData;
    const cards = data.cards || defaultData.cards;

    const marketingCard = cards.find(c => c.id === 'marketing') || cards[0] || defaultData.cards[0];
    const supportCard = cards.find(c => c.id === 'support') || cards[1] || defaultData.cards[1];
    const automationCard = cards.find(c => c.id === 'automation') || cards[2] || defaultData.cards[2];
    const commerceCard = cards.find(c => c.id === 'commerce') || cards[3] || defaultData.cards[3];
    // 5th card: try 'vcard' id first, then 'crm' (old id), then positional fallback so admin data always wins
    const vcardCard = cards.find(c => c.id === 'vcard') || cards.find(c => c.id === 'crm') || cards[4] || defaultData.cards[4];

    return (
        <section className="py-24 bg-white dark:bg-[#05050A] transition-colors relative overflow-hidden">
            {/* Subtle background glow (reduced blur for GPU perf) */}
            <div className="absolute top-0 right-0 w-1/2 h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3" style={{ transform: 'translateZ(0) translate(33%, -50%)' }} />
            <div className="absolute bottom-0 left-0 w-1/2 h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none translate-y-1/3 -translate-x-1/3" style={{ transform: 'translateZ(0) translate(-33%, 33%)' }} />

            <div className="max-w-7xl mx-auto px-4 md:px-6">
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
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        className="md:col-span-7 rounded-[32px] bg-[#FFF5F3] dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 overflow-hidden relative group flex flex-col min-h-[380px] md:min-h-[400px]">
                        <div className="p-8 md:p-4 md:p-10 relative z-10 w-full md:w-[55%] lg:w-[50%] mb-auto">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-400 mb-4">{marketingCard.tag}</div>
                            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mb-3 leading-tight whitespace-pre-line">{marketingCard.title}</h3>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium mb-6 md:mb-8 whitespace-pre-line">{marketingCard.desc}</p>
                            <a href="#" className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 hover:gap-3 transition-all">Learn More <ArrowRight className="w-4 h-4" /></a>
                        </div>
                        {marketingCard.image ? (
                            <div className="relative md:absolute md:right-0 md:bottom-0 w-[90%] md:w-[50%] lg:w-[45%] h-56 md:h-[85%] self-end rounded-tl-[32px] border-t border-l border-rose-100 dark:border-rose-800/30 shadow-2xl overflow-hidden md:translate-x-4 md:translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500">
                                <img loading="lazy" src={marketingCard.image} className="w-full h-full object-cover" alt={marketingCard.title} />
                            </div>
                        ) : (
                            <div className="relative md:absolute md:right-0 md:bottom-0 w-[90%] md:w-[50%] lg:w-[45%] h-64 md:h-[85%] self-end bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-tl-[32px] border-t border-l border-rose-100 dark:border-rose-800/30 shadow-[0_-10px_40px_-15px_rgba(244,63,94,0.15)] max-w-full flex flex-col p-4 md:p-4 md:p-6 md:translate-x-4 md:translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500 overflow-hidden">
                                {/* FB/IG Ad Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Sponsored Ad</div>
                                        <div className="text-[8px] text-slate-500">Active Campaign</div>
                                    </div>
                                    <div className="ml-auto px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[8px] font-bold rounded-full">
                                        High Converting
                                    </div>
                                </div>

                                {/* Ad Body mockup */}
                                <div className="w-full bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3 flex-1 mb-4 border border-slate-100 dark:border-white/5 relative overflow-hidden group/ad">
                                    <div className="w-full h-full absolute inset-0 bg-gradient-to-br from-rose-500/5 to-orange-500/5"></div>
                                    <div className="w-3/4 h-2 bg-slate-200 dark:bg-slate-600 rounded-full mb-2"></div>
                                    <div className="w-1/2 h-2 bg-slate-200 dark:bg-slate-600 rounded-full mb-4"></div>

                                    {/* Stats overlay */}
                                    <div className="absolute bottom-3 left-3 right-3 flex justify-between gap-2">
                                        <div className="flex-1 bg-white/80 dark:bg-zinc-900/80 backdrop-blur shadow-sm p-2 rounded-lg border border-slate-100 dark:border-white/5">
                                            <div className="text-[8px] text-slate-500 mb-0.5">Reach</div>
                                            <div className="text-xs font-black text-slate-800 dark:text-slate-200">45.2K</div>
                                        </div>
                                        <div className="flex-1 bg-white/80 dark:bg-zinc-900/80 backdrop-blur shadow-sm p-2 rounded-lg border border-slate-100 dark:border-white/5">
                                            <div className="text-[8px] text-slate-500 mb-0.5">Leads</div>
                                            <div className="text-xs font-black text-rose-600 dark:text-rose-400">1,240</div>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <div className="w-full bg-[#25D366] rounded-xl py-2.5 flex items-center justify-center text-white text-[11px] font-bold gap-2 shadow-lg shadow-green-500/20">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" /></svg>
                                    WhatsApp Us
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* CARD 2: SUPPORT (Large Right) */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                        className="md:col-span-5 rounded-[32px] bg-[#F0FDF4] dark:bg-emerald-950/5 border border-emerald-100 dark:border-emerald-900/30 overflow-hidden relative group flex flex-col min-h-[380px] md:min-h-[400px]">
                        <div className="p-8 md:p-4 md:p-10 relative z-10 w-full">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-4">{supportCard.tag}</div>
                            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mb-3 leading-tight whitespace-pre-line">{supportCard.title}</h3>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium mb-6 md:mb-8 whitespace-pre-line">{supportCard.desc}</p>
                            <a href="#" className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 hover:gap-3 transition-all">Learn More <ArrowRight className="w-4 h-4" /></a>
                        </div>
                        {supportCard.image ? (
                            <div className="absolute bottom-0 inset-x-8 bg-white dark:bg-zinc-900 rounded-t-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] max-w-full dark:shadow-emerald-900/20 border-t border-x border-slate-100 dark:border-white/10 overflow-hidden translate-y-6 group-hover:translate-y-0 transition-transform duration-500 h-48">
                                <img loading="lazy" src={supportCard.image} className="w-full h-full object-cover" alt={supportCard.title} />
                            </div>
                        ) : (
                            <div className="absolute bottom-0 inset-x-4 bg-white dark:bg-zinc-900 rounded-t-2xl shadow-[0_-20px_50px_-15px_rgba(16,185,129,0.15)] max-w-full border-t border-x border-slate-100 dark:border-white/10 overflow-hidden translate-y-8 group-hover:translate-y-0 transition-transform duration-500 flex h-52">
                                {/* Sidebar (Agents/Chats) */}
                                <div className="w-1/3 bg-slate-50 dark:bg-zinc-950 border-r border-slate-100 dark:border-white/5 p-3 flex flex-col gap-2">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Open Chats</div>
                                    {[
                                        { name: 'Jassi', active: true, msg: 'Order status?' },
                                        { name: 'Manish', active: false, msg: 'Thanks for help!' }
                                    ].map((chat, i) => (
                                        <div key={i} className={`p-2 rounded-xl flex items-center gap-2 transition-all ${chat.active ? 'bg-white dark:bg-zinc-800 shadow-sm border border-slate-200 dark:border-white/10 ring-1 ring-emerald-500/20' : 'opacity-60 grayscale hover:grayscale-0'}`}>
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 relative">
                                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{chat.name[0]}</span>
                                                {chat.active && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-800 rounded-full"></span>}
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">{chat.name}</div>
                                                <div className="text-[8px] text-slate-500 truncate">{chat.msg}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Chat Area */}
                                <div className="w-2/3 flex flex-col bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03),transparent)] relative">
                                    {/* Chat Header */}
                                    <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="text-[10px] font-bold dark:text-white">Jassi</div>
                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-[8px] font-bold uppercase tracking-wide">Waiting</span>
                                        </div>
                                        <div className="flex -space-x-1">
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white font-bold border border-white dark:border-zinc-900 z-20">You</div>
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold border border-white dark:border-zinc-900 z-10">M</div>
                                        </div>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="p-3 flex-1 flex flex-col gap-3 relative">
                                        {/* Floating Badge */}
                                        <div className="absolute top-2 right-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full text-[8px] font-bold flex items-center gap-1 backdrop-blur-md z-10">
                                            <Check className="w-2.5 h-2.5" /> Assigned to You
                                        </div>

                                        <div className="flex gap-2 items-end mt-4">
                                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-[8px] font-bold text-slate-500">S</div>
                                            <div className="bg-slate-100 dark:bg-white/5 p-2 rounded-xl rounded-bl-sm text-[9px] dark:text-slate-300 max-w-[80%] border border-slate-200 dark:border-white/5 shadow-sm">Can you check my order status?</div>
                                        </div>

                                        <div className="flex gap-2 items-end justify-end mt-1">
                                            <div className="bg-emerald-500 text-white p-2 rounded-xl rounded-br-sm text-[9px] max-w-[85%] shadow-md">
                                                Checking that for you right now, Jassi! 📦
                                            </div>
                                        </div>

                                        {/* Typing indicator */}
                                        <div className="flex gap-1 items-center mt-auto opacity-50 px-2">
                                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* CARD 3: AUTOMATION */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
                        className="md:col-span-4 rounded-[32px] bg-[#EEF2FF] dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 overflow-hidden relative group flex flex-col min-h-[360px]">
                        <div className="p-4 md:p-10 relative z-10 w-full mb-auto text-center">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400 mb-4">{automationCard.tag}</div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 whitespace-pre-line">{automationCard.title}</h3>
                            {automationCard.desc && <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line">{automationCard.desc}</p>}
                        </div>
                        {automationCard.image ? (
                            <div className="relative h-56 w-full mt-auto flex items-center justify-center overflow-hidden">
                                <img loading="lazy" src={automationCard.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={automationCard.title} />
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
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                        className="md:col-span-4 rounded-[32px] bg-[#FFFBEB] dark:bg-amber-950/5 border border-amber-100 dark:border-amber-900/30 overflow-hidden relative group flex flex-col min-h-[360px]">
                        <div className="p-4 md:p-10 relative z-10 w-full mb-auto text-center">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 mb-4">{commerceCard.tag}</div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 whitespace-pre-line">{commerceCard.title}</h3>
                            {commerceCard.desc && <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line">{commerceCard.desc}</p>}
                        </div>
                        {commerceCard.image ? (
                            <div className="relative h-56 w-full mt-auto flex flex-col items-center justify-end px-4 md:px-8 pb-8">
                                <img loading="lazy" src={commerceCard.image} className="w-full h-full object-cover rounded-2xl shadow-xl border border-amber-100 dark:border-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500" alt={commerceCard.title} />
                            </div>
                        ) : (
                            <div className="relative flex-1 w-full mt-auto overflow-hidden px-5 pb-5 flex items-end">
                                {/* Ambient glow */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-50/40 to-amber-100/60 dark:via-amber-950/20 dark:to-amber-950/40 pointer-events-none" />

                                <div className="relative w-full translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    {/* Store header bar */}
                                    <div className="w-full bg-green-600 rounded-t-2xl px-4 py-2.5 flex items-center gap-2.5 shadow-md">
                                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" /></svg>
                                        </div>
                                        <span className="text-white font-bold text-xs flex-1">My Online Store</span>
                                        <span className="text-white/70 text-[10px] font-semibold">🛒 3 items</span>
                                    </div>

                                    {/* Product grid */}
                                    <div className="bg-white dark:bg-zinc-900 border border-t-0 border-amber-100 dark:border-white/10 rounded-b-2xl p-3 shadow-xl">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                                            {[
                                                { name: 'Sneakers', price: '₹1,299', color: 'bg-blue-100', dot: 'bg-blue-400' },
                                                { name: 'Watch', price: '₹2,999', color: 'bg-amber-100', dot: 'bg-amber-400' },
                                                { name: 'Bag', price: '₹899', color: 'bg-rose-100', dot: 'bg-rose-400' },
                                            ].map((p, i) => (
                                                <motion.div key={p.name}
                                                    initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.12 }}
                                                    className="bg-slate-50 dark:bg-zinc-800 rounded-xl p-2 relative overflow-hidden">
                                                    <div className={`w-full h-10 ${p.color} dark:opacity-40 rounded-lg mb-1.5 flex items-center justify-center`}>
                                                        <ShoppingCart className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                                    </div>
                                                    <div className="text-[9px] font-bold text-slate-700 dark:text-slate-200 truncate">{p.name}</div>
                                                    <div className="text-[9px] font-black text-green-600 dark:text-green-400">{p.price}</div>
                                                    <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${p.dot}`} />
                                                </motion.div>
                                            ))}
                                        </div>
                                        {/* Checkout button */}
                                        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
                                            className="w-full bg-green-500 text-white text-center text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-green-500/30">
                                            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" /></svg>
                                            Checkout
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* CARD 5: vCards */}
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 }}
                        className="md:col-span-4 rounded-[32px] bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-white/10 overflow-hidden relative group flex flex-col min-h-[360px]">
                        <div className="p-4 md:p-10 relative z-10 w-full mb-auto text-center">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400 mb-4">{vcardCard.tag}</div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 whitespace-pre-line">{vcardCard.title}</h3>
                            {vcardCard.desc && <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-pre-line">{vcardCard.desc}</p>}
                        </div>
                        {vcardCard.image ? (
                            <div className="relative h-56 w-full mt-auto px-4 md:px-6 overflow-hidden flex items-end">
                                <img loading="lazy" src={vcardCard.image} className="w-full h-full object-cover rounded-t-xl translate-y-8 group-hover:translate-y-4 transition-transform duration-500" alt={vcardCard.title} />
                            </div>
                        ) : (
                            <div className="relative h-56 w-full mt-auto flex items-end justify-center px-4 md:px-6 overflow-hidden pb-0">
                                {/* Ambient glow */}
                                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent dark:from-cyan-500/20 pointer-events-none" />

                                <div className="relative w-52 h-52 bg-white dark:bg-zinc-900 shadow-[0_-10px_40px_-15px_rgba(6,182,212,0.3)] max-w-full border-t border-x border-slate-200 dark:border-white/10 rounded-t-[32px] p-5 flex flex-col items-center translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                                    {/* Phone notch mockup */}
                                    <div className="absolute top-0 inset-x-0 h-4 flex justify-center">
                                        <div className="w-16 h-3 bg-slate-100 dark:bg-zinc-800 rounded-b-xl border-x border-b border-slate-200 dark:border-white/5"></div>
                                    </div>

                                    {/* Profile Avatar with glow */}
                                    <div className="relative mt-3 mb-4">
                                        <div className="absolute inset-0 bg-cyan-400 rounded-full blur-md opacity-40 animate-pulse"></div>
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 p-[3px] relative z-10">
                                            <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center">
                                                <User className="w-7 h-7 text-cyan-500" />
                                            </div>
                                        </div>
                                        {/* Verification Badge */}
                                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center z-20">
                                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                        </div>
                                    </div>

                                    {/* Name & Role */}
                                    <div className="text-center w-full mb-5">
                                        <div className="h-2.5 w-24 bg-slate-800 dark:bg-slate-200 rounded-full mx-auto mb-2.5"></div>
                                        <div className="h-1.5 w-16 bg-cyan-600/50 dark:bg-cyan-400/50 rounded-full mx-auto"></div>
                                    </div>

                                    {/* Action Buttons Mockup */}
                                    <div className="flex gap-3 w-full mb-4">
                                        <div className="flex-1 h-8 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-center">
                                            <div className="w-4 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full"></div>
                                        </div>
                                        <div className="flex-1 h-8 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-center">
                                            <div className="w-4 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full"></div>
                                        </div>
                                        <div className="flex-1 h-8 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-center">
                                            <div className="w-4 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Save Contact CTA */}
                                    <div className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-1.5 mt-auto">
                                        <User className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold">Save Contact</span>
                                    </div>
                                </div>

                                {/* Floating QR Code Modal (Offset) */}
                                <div className="absolute right-4 md:right-8 top-4 w-20 h-24 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 dark:border-white/10 p-2 flex flex-col items-center translate-y-4 group-hover:-translate-y-2 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-100">
                                    <div className="w-full bg-cyan-50 dark:bg-cyan-900/30 rounded-xl p-1.5 mb-1.5 aspect-square flex items-center justify-center relative overflow-hidden">
                                        {/* Scanner line animation */}
                                        <div className="absolute top-0 inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] max-w-full animate-[scan_2s_ease-in-out_infinite]"></div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px] opacity-70 w-full h-full p-1 bg-white dark:bg-transparent rounded">
                                            <div className="bg-slate-800 dark:bg-white rounded-[2px]"></div><div className="bg-slate-800 dark:bg-white rounded-[2px]"></div><div className="bg-slate-800 dark:bg-white rounded-[2px]"></div>
                                            <div className="bg-slate-800 dark:bg-white rounded-[2px]"></div><div className="bg-transparent"></div><div className="bg-slate-800 dark:bg-white rounded-[2px]"></div>
                                            <div className="bg-slate-800 dark:bg-white rounded-[2px]"></div><div className="bg-slate-800 dark:bg-white rounded-[2px]"></div><div className="bg-slate-800 dark:bg-white rounded-[2px]"></div>
                                        </div>
                                    </div>
                                    <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Scan Me</div>
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
export const advancedFeatures = [
    // WHATSAPP AUTOMATION
    {
        id: 'chatbot', label: 'No-Code Flow Bots', icon: Layers,
        bg: 'bg-violet-50 dark:bg-violet-950/20', previewBg: 'bg-violet-100/70',
        barColor: 'bg-violet-500', pillColor: 'bg-violet-50 text-violet-700 border-violet-100',
        iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-violet-600 dark:text-violet-400',
        gradientIcon: 'from-violet-500 to-purple-500',
        tagText: 'Automation',
        title: 'Build No-Code Chatbot in Minutes',
        desc: 'Visual drag-and-drop flow builder for WhatsApp chatbots & product catalog journeys — no code, no complexity.',
        stats: ['80% Auto-resolved', '24/7 Running', '5 min Setup'], preview: 'chatbot', category: 'whatsapp'
    },
    {
        id: 'livechat', label: 'Multi-Agent Inbox', icon: HeadphonesIcon,
        bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70',
        barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400',
        gradientIcon: 'from-emerald-500 to-teal-500',
        tagText: 'Support',
        title: 'Shared Team Inbox for WhatsApp',
        desc: 'Let multiple agents handle conversations from one WhatsApp number. Smart routing, labels, quick replies, and internal notes included.',
        stats: ['60% Faster Support', 'Smart Routing', 'Team Collab'], preview: 'livechat', category: 'whatsapp'
    },
    {
        id: 'aibot', label: 'Generative AI Bot', icon: Zap,
        bg: 'bg-purple-50 dark:bg-purple-950/5', previewBg: 'bg-purple-100/70',
        barColor: 'bg-purple-500', pillColor: 'bg-purple-50 text-purple-700 border-purple-100',
        iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400',
        gradientIcon: 'from-purple-500 to-indigo-600',
        tagText: 'AI-Powered',
        title: 'Generative AI that Sells & Supports',
        desc: 'Train your own GPT-powered bot on product knowledge, FAQs, pricing and policies. It answers, qualifies and converts leads — 24/7, autonomously.',
        stats: ['GPT-4 Powered', 'Custom Training', 'Zero Hallucination'], preview: 'aibot', category: 'whatsapp'
    },
    {
        id: 'analytics_wa', label: 'WhatsApp Reports', icon: BarChart,
        bg: 'bg-blue-50 dark:bg-blue-950/5', previewBg: 'bg-blue-100/70',
        barColor: 'bg-blue-500', pillColor: 'bg-blue-50 text-blue-700 border-blue-100',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400',
        gradientIcon: 'from-blue-500 to-cyan-500',
        tagText: 'Insights',
        title: 'Message Delivery & Read Rates',
        desc: 'Monitor exactly how many messages are sent, delivered, and read in real-time. Understand agent performance and customer engagement.',
        stats: ['Read Rates', 'Agent Performance', 'Engagement KPIs'], preview: 'analytics_wa', category: 'whatsapp'
    },
    // META MARKETING
    {
        id: 'broadcast', label: 'Meta Ads & Broadcasts', icon: Send,
        bg: 'bg-indigo-50 dark:bg-indigo-950/20', previewBg: 'bg-indigo-100/70',
        barColor: 'bg-indigo-500', pillColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400',
        gradientIcon: 'from-indigo-500 to-violet-500',
        tagText: 'Marketing',
        title: 'Click-to-WhatsApp (CTWA) & Bulk Broadcasts',
        desc: 'Launch Meta Ads that drive traffic straight to your WhatsApp inbox, and broadcast personalized campaigns to thousands instantly.',
        stats: ['98% Open Rate', '5x Lead Gen', '3x ROI'], preview: 'broadcast', category: 'whatsapp'
    },
    {
        id: 'audience_sync', label: 'CRM Audience Sync', icon: Repeat,
        bg: 'bg-pink-50 dark:bg-pink-950/20', previewBg: 'bg-pink-100/70',
        barColor: 'bg-pink-500', pillColor: 'bg-pink-50 text-pink-700 border-pink-100',
        iconBg: 'bg-pink-100 dark:bg-pink-900/40', iconColor: 'text-pink-600 dark:text-pink-400',
        gradientIcon: 'from-pink-500 to-rose-500',
        tagText: 'Integration',
        title: 'Auto-Sync Contacts to Meta',
        desc: 'Seamlessly sync your WhatsApp contacts and segmented CRM lists directly to Meta Custom Audiences for highly targeted Facebook & Instagram ads.',
        stats: ['Lookalike Sync', 'Zero Manual Export', 'High Match Rate'], preview: 'audience_sync', category: 'whatsapp'
    },
    {
        id: 'retarget', label: 'Smart Retargeting', icon: ArrowUpRight,
        bg: 'bg-sky-50 dark:bg-sky-950/20', previewBg: 'bg-sky-100/70',
        barColor: 'bg-sky-500', pillColor: 'bg-sky-50 text-sky-700 border-sky-100',
        iconBg: 'bg-sky-100 dark:bg-sky-900/40', iconColor: 'text-sky-600 dark:text-sky-400',
        gradientIcon: 'from-sky-500 to-blue-500',
        tagText: 'Re-engagement',
        title: 'Retarget to 3X Conversions',
        desc: "Re-engage customers who didn't respond or purchase with hyper-personalized automated follow-up campaigns and smart audience segments.",
        stats: ['3x Conversions', 'Auto Follow-up', 'Smart Segments'], preview: 'retarget', category: 'whatsapp'
    },
    {
        id: 'analytics_meta', label: 'Ad Performance', icon: BarChart,
        bg: 'bg-amber-50 dark:bg-amber-950/5', previewBg: 'bg-amber-100/70',
        barColor: 'bg-amber-500', pillColor: 'bg-amber-50 text-amber-700 border-amber-100',
        iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400',
        gradientIcon: 'from-amber-500 to-orange-500',
        tagText: 'Insights',
        title: 'Real-Time Meta Campaign Analytics',
        desc: 'Monitor Ad Spend, Click-to-WhatsApp conversions, and ROAS live. Track exactly which ads drive the most engaged conversations.',
        stats: ['Live Dashboard', 'Campaign ROI', 'Ad Spend Tracking'], preview: 'analytics_meta', category: 'meta'
    },
    {
        id: 'meta_lead_ads', label: 'Click-to-WhatsApp Ads', icon: Megaphone,
        bg: 'bg-indigo-50 dark:bg-indigo-950/20', previewBg: 'bg-indigo-100/70',
        barColor: 'bg-indigo-500', pillColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400',
        gradientIcon: 'from-indigo-500 to-blue-500',
        tagText: 'Advertising',
        title: 'Launch CTWA Ads in 1-Click',
        desc: 'Connect your Meta Business Manager to launch high-converting Click-to-WhatsApp ads directly from our dashboard without ever logging into Ads Manager.',
        stats: ['1-Click Ads', 'Auto-Sync', 'Lowest CPA'], preview: 'meta_lead_ads', category: 'meta'
    },
    {
        id: 'meta_pixel_sync', label: 'Meta Pixel Sync', icon: Activity,
        bg: 'bg-blue-50 dark:bg-blue-950/5', previewBg: 'bg-blue-100/70',
        barColor: 'bg-blue-500', pillColor: 'bg-blue-50 text-blue-700 border-blue-100',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400',
        gradientIcon: 'from-blue-500 to-cyan-500',
        tagText: 'Tracking',
        title: 'Send Conversions to Meta Pixel',
        desc: 'Automatically send WhatsApp purchases, leads, and custom events back to your Meta Pixel via Conversion API to optimize your ad delivery engine.',
        stats: ['CAPI Integration', 'Zero Data Loss', 'Smart Optimization'], preview: 'meta_pixel_sync', category: 'meta'
    },
    {
        id: 'meta_custom_audience', label: 'Dynamic Audiences', icon: Target,
        bg: 'bg-purple-50 dark:bg-purple-950/5', previewBg: 'bg-purple-100/70',
        barColor: 'bg-purple-500', pillColor: 'bg-purple-50 text-purple-700 border-purple-100',
        iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400',
        gradientIcon: 'from-purple-500 to-pink-500',
        tagText: 'Targeting',
        title: 'Sync WhatsApp Segments to Meta',
        desc: 'Automatically build highly targeted Facebook Custom Audiences by syncing WhatsApp segments (like VIP customers or abandoned carts) in real-time.',
        stats: ['Lookalike Sync', 'Real-time Updates', 'Higher ROAS'], preview: 'meta_custom_audience', category: 'meta'
    },
    {
        id: 'meta_catalog_sales', label: 'Advantage+ Catalog Sales', icon: Store,
        bg: 'bg-rose-50 dark:bg-rose-950/20', previewBg: 'bg-rose-100/70',
        barColor: 'bg-rose-500', pillColor: 'bg-rose-50 text-rose-700 border-rose-100',
        iconBg: 'bg-rose-100 dark:bg-rose-900/40', iconColor: 'text-rose-600 dark:text-rose-400',
        gradientIcon: 'from-rose-500 to-orange-500',
        tagText: 'Commerce',
        title: 'Sync Store Inventory with Meta',
        desc: 'Keep your native WhatsApp Store catalog perfectly synced with your Meta Commerce Manager to run dynamic Advantage+ catalog sales campaigns seamlessly.',
        stats: ['2-Way Sync', 'Dynamic Ads', 'Auto-Updates'], preview: 'meta_catalog_sales', category: 'meta'
    },
    {
        id: 'meta_ab_testing', label: 'A/B Testing', icon: SplitSquareHorizontal,
        bg: 'bg-amber-50 dark:bg-amber-950/5', previewBg: 'bg-amber-100/70',
        barColor: 'bg-amber-500', pillColor: 'bg-amber-50 text-amber-700 border-amber-100',
        iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400',
        gradientIcon: 'from-amber-500 to-yellow-500',
        tagText: 'Optimization',
        title: 'A/B Test Ad Creatives & Messages',
        desc: 'Split-test different Facebook ad creatives against varying WhatsApp welcome messages to scientifically discover the highest converting funnel.',
        stats: ['Split Testing', 'Winner Selection', 'Funnel Optimization'], preview: 'meta_ab_testing', category: 'meta'
    },
    {
        id: 'meta_campaign_builder', label: 'Unified Campaign Builder', icon: Wand2,
        bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70',
        barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400',
        gradientIcon: 'from-emerald-500 to-teal-500',
        tagText: 'Strategy',
        title: 'AI-Powered Campaign Architect',
        desc: 'Generate end-to-end campaigns—from Facebook ad copy to the WhatsApp chatbot flow—using our built-in Generative AI Campaign Builder.',
        stats: ['AI Copywriting', 'Flow Generation', 'Instant Launch'], preview: 'meta_campaign_builder', category: 'meta'
    },
    // ONLINE STORE
    {
        id: 'catalog', label: 'Native Online Store', icon: ShoppingCart,
        bg: 'bg-rose-50 dark:bg-rose-950/20', previewBg: 'bg-rose-100/70',
        barColor: 'bg-rose-500', pillColor: 'bg-rose-50 text-rose-700 border-rose-100',
        iconBg: 'bg-rose-100 dark:bg-rose-900/40', iconColor: 'text-rose-600 dark:text-rose-400',
        gradientIcon: 'from-rose-500 to-pink-500',
        tagText: 'Commerce',
        title: 'Sell Products Inside WhatsApp',
        desc: 'Share your full product catalog, collect orders and receive payments natively within WhatsApp. Zero-friction in-chat checkout.',
        stats: ['In-chat Checkout', 'UPI & Cards', '2x Orders'], preview: 'catalog', category: 'store'
    },
    {
        id: 'cart_payment', label: 'Cart & Payments', icon: CreditCard,
        bg: 'bg-orange-50 dark:bg-orange-950/20', previewBg: 'bg-orange-100/70',
        barColor: 'bg-orange-500', pillColor: 'bg-orange-50 text-orange-700 border-orange-100',
        iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconColor: 'text-orange-600 dark:text-orange-400',
        gradientIcon: 'from-orange-400 to-amber-500',
        tagText: 'Checkout',
        title: 'Seamless In-Chat Checkout',
        desc: 'Allow customers to build their cart and complete payments using UPI, credit cards, or net banking without ever leaving WhatsApp.',
        stats: ['UPI Supported', 'One-Click Pay', 'Zero Drops'], preview: 'cart_payment', category: 'store'
    },
    {
        id: 'order_track', label: 'Order Tracking', icon: Truck,
        bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70',
        barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400',
        gradientIcon: 'from-emerald-400 to-teal-500',
        tagText: 'Post-Purchase',
        title: 'Automated Shipping Updates',
        desc: 'Send proactive notifications for order confirmations, shipping dispatch, and live tracking updates directly to the customer\'s inbox.',
        stats: ['Live Tracking', 'Auto Updates', 'High Trust'], preview: 'order_track', category: 'store'
    },
    {
        id: 'store_categories', label: 'Smart Categories', icon: LayoutGrid,
        bg: 'bg-pink-50 dark:bg-pink-950/20', previewBg: 'bg-pink-100/70',
        barColor: 'bg-pink-500', pillColor: 'bg-pink-50 text-pink-700 border-pink-100',
        iconBg: 'bg-pink-100 dark:bg-pink-900/40', iconColor: 'text-pink-600 dark:text-pink-400',
        gradientIcon: 'from-pink-500 to-rose-500',
        tagText: 'Navigation',
        title: 'Intelligent Product Categories',
        desc: 'Organize thousands of products into smart categories and collections, allowing customers to seamlessly browse your entire catalog directly inside WhatsApp.',
        stats: ['Nested Categories', 'Smart Search', 'Easy Browsing'], preview: 'store_categories', category: 'store'
    },
    {
        id: 'store_orders', label: 'Order Management', icon: ListOrdered,
        bg: 'bg-blue-50 dark:bg-blue-950/5', previewBg: 'bg-blue-100/70',
        barColor: 'bg-blue-500', pillColor: 'bg-blue-50 text-blue-700 border-blue-100',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400',
        gradientIcon: 'from-blue-500 to-indigo-500',
        tagText: 'Fulfillment',
        title: 'Kanban Order Dashboard',
        desc: 'Manage your entire fulfillment workflow with a powerful drag-and-drop Kanban dashboard. Track every order from "Placed" to "Delivered" with automatic customer notifications.',
        stats: ['Kanban Board', 'Auto-Updates', 'Team Access'], preview: 'store_orders', category: 'store'
    },
    {
        id: 'store_coupons', label: 'Dynamic Coupons', icon: Tag,
        bg: 'bg-amber-50 dark:bg-amber-950/5', previewBg: 'bg-amber-100/70',
        barColor: 'bg-amber-500', pillColor: 'bg-amber-50 text-amber-700 border-amber-100',
        iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400',
        gradientIcon: 'from-amber-500 to-orange-500',
        tagText: 'Promotions',
        title: 'Native WhatsApp Promo Codes',
        desc: 'Create dynamic discount codes, flash sales, and BOGO offers that customers can natively apply to their cart during the seamless in-chat checkout process.',
        stats: ['Flash Sales', 'BOGO Offers', 'Usage Limits'], preview: 'store_coupons', category: 'store'
    },
    {
        id: 'store_invoices', label: 'Automated Invoices', icon: FileText,
        bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70',
        barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400',
        gradientIcon: 'from-emerald-500 to-teal-500',
        tagText: 'Accounting',
        title: 'Instant PDF Receipts',
        desc: 'Automatically generate and instantly send beautiful PDF invoices and payment receipts to the customer’s WhatsApp inbox the moment a payment is confirmed.',
        stats: ['Tax Compliant', 'PDF Generation', 'Instant Delivery'], preview: 'store_invoices', category: 'store'
    },
    // vCARD
    {
        id: 'vcard', label: 'Interactive vCards', icon: Briefcase,
        bg: 'bg-cyan-50 dark:bg-cyan-950/20', previewBg: 'bg-cyan-100/70',
        barColor: 'bg-cyan-500', pillColor: 'bg-cyan-50 text-cyan-700 border-cyan-100',
        iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconColor: 'text-cyan-600 dark:text-cyan-400',
        gradientIcon: 'from-cyan-400 to-blue-500',
        tagText: 'Networking',
        title: 'Premium Digital Business Cards',
        desc: 'Share stunning, mobile-first interactive business cards with custom QR codes to capture leads straight into your WhatsApp CRM.',
        stats: ['10+ Themes', 'Custom QR', 'Direct Save'], preview: 'vcard', category: 'vcard'
    },
    {
        id: 'vcard_lead', label: 'Instant Lead Capture', icon: Users,
        bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20', previewBg: 'bg-fuchsia-100/70',
        barColor: 'bg-fuchsia-500', pillColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
        iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
        gradientIcon: 'from-fuchsia-500 to-pink-500',
        tagText: 'CRM Sync',
        title: 'Turn Scans into WhatsApp Leads',
        desc: 'When someone scans your vCard QR code, their details are instantly captured and they are redirected to your WhatsApp inbox to start a conversation.',
        stats: ['Auto-Save Contacts', 'CRM Integration', '1-Click Connect'], preview: 'vcard_lead', category: 'vcard'
    },
    {
        id: 'vcard_theme', label: 'Premium Themes', icon: LayoutTemplate,
        bg: 'bg-slate-50 dark:bg-zinc-800/50', previewBg: 'bg-slate-200/70 dark:bg-zinc-800',
        barColor: 'bg-slate-800 dark:bg-slate-200', pillColor: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-slate-200 dark:border-white/10',
        iconBg: 'bg-slate-200 dark:bg-zinc-700', iconColor: 'text-slate-800 dark:text-slate-200',
        gradientIcon: 'from-slate-700 to-slate-900 dark:from-slate-400 dark:to-slate-200',
        tagText: 'Customization',
        title: 'Stunning Designer Layouts',
        desc: 'Choose from 10+ gorgeous, mobile-optimized business card templates. Completely customize colors, fonts, and layouts to match your brand.',
        stats: ['10+ Themes', 'Color Customizer', 'CSS Editing'], preview: 'vcard_theme', category: 'vcard'
    },
    {
        id: 'vcard_analytics', label: 'Profile Analytics', icon: LineChart,
        bg: 'bg-blue-50 dark:bg-blue-950/5', previewBg: 'bg-blue-100/70',
        barColor: 'bg-blue-500', pillColor: 'bg-blue-50 text-blue-700 border-blue-100',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400',
        gradientIcon: 'from-blue-500 to-cyan-500',
        tagText: 'Insights',
        title: 'Track Scans & Link Clicks',
        desc: 'Get deep insights into your networking performance. Monitor total QR scans, unique profile views, and see exactly which links are getting the most engagement.',
        stats: ['Scan Tracking', 'Link Analytics', 'Lead Sources'], preview: 'vcard_analytics', category: 'vcard'
    },
    {
        id: 'vcard_appointments', label: 'Appointment Booking', icon: Calendar,
        bg: 'bg-purple-50 dark:bg-purple-950/5', previewBg: 'bg-purple-100/70',
        barColor: 'bg-purple-500', pillColor: 'bg-purple-50 text-purple-700 border-purple-100',
        iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400',
        gradientIcon: 'from-purple-500 to-pink-500',
        tagText: 'Scheduling',
        title: 'Built-in Scheduling Calendar',
        desc: 'Eliminate back-and-forth emails. Let clients book appointments directly from your vCard, and receive instant booking notifications and reminders via WhatsApp.',
        stats: ['Time Slots', 'Auto-Reminders', 'WhatsApp Sync'], preview: 'vcard_appointments', category: 'vcard'
    },
    {
        id: 'vcard_nfc', label: 'NFC Integration', icon: Wifi,
        bg: 'bg-indigo-50 dark:bg-indigo-950/20', previewBg: 'bg-indigo-100/70',
        barColor: 'bg-indigo-500', pillColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400',
        gradientIcon: 'from-indigo-500 to-violet-500',
        tagText: 'Hardware',
        title: 'Tap-to-Share NFC Compatibility',
        desc: 'Connect your digital profile to a physical NFC card. Share your details instantly by simply tapping your card against any modern smartphone—no app required.',
        stats: ['Tap-to-Share', 'No App Needed', 'Write to NFC'], preview: 'vcard_nfc', category: 'vcard'
    },
    {
        id: 'vcard_domain', label: 'Custom Domains', icon: Globe,
        bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70',
        barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400',
        gradientIcon: 'from-emerald-500 to-teal-500',
        tagText: 'Branding',
        title: 'White-Label Custom Domains',
        desc: 'Elevate your personal brand by hosting your vCard on your own custom domain (e.g., card.yourbrand.com) rather than a generic platform URL.',
        stats: ['SSL Included', 'White-Label', 'DNS Mapping'], preview: 'vcard_domain', category: 'vcard'
    }
];

const ImageMockup = ({ imageUrl, badgeText, BadgeIcon, colorClass }) => (
    <div className="w-full h-full rounded-2xl overflow-hidden relative shadow-xl group">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent z-10" />
        <img loading="lazy" src={imageUrl} alt="Feature Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
            <div className="px-3 py-1.5 backdrop-blur-md bg-white/20 border border-white/30 rounded-xl flex items-center gap-2 shadow-lg">
                <div className="p-1 rounded-md bg-white/20">
                    <BadgeIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white tracking-wide">{badgeText}</span>
            </div>

            <div className="flex gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse delay-75" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse delay-150" />
            </div>
        </motion.div>
    </div>
);

function FeaturePreview({ feature }) {
    // If admin uploaded a custom image, show it instead of the animated mockup
    if (feature.image) {
        return (
            <AnimatePresence mode="wait">
                <motion.div key={feature.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}
                    className={`w-full h-full rounded-2xl ${feature.previewBg} overflow-hidden`}>
                    <img loading="lazy" src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                </motion.div>
            </AnimatePresence>
        );
    }
    const preview = feature.preview || 'broadcast';
    const previewBg = feature.previewBg || 'bg-slate-100/70';
    const barColor = feature.barColor || 'bg-slate-500';
    const mockups = {
        broadcast: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="flex items-center gap-3 pb-3 border-b border-black/10">
                    <div className={`w-8 h-8 rounded-full ${barColor} flex items-center justify-center`}><Send className="w-4 h-4 text-white" /></div>
                    <div><div className="w-28 h-2.5 bg-black/15 rounded-full mb-1" /><div className="w-16 h-2 bg-black/10 rounded-full" /></div>
                    <div className={`ml-auto px-3 py-1 ${barColor} text-white rounded-full text-[10px] font-bold`}>LIVE</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    {[['Sent', '17.8K'], ['Delivered', '17.2K'], ['Read', '16.9K'], ['Clicked', '8.1K']].map(([l, v]) => (
                        <div key={l} className="bg-white/60 rounded-xl p-2 text-center"><div className="font-black text-xs text-slate-700">{v}</div><div className="text-[9px] text-slate-400 font-medium">{l}</div></div>
                    ))}
                </div>
                <div className="bg-white/70 rounded-xl p-3 flex-1">
                    <div className="flex gap-2 items-start">
                        <div className={`w-5 h-5 rounded-full ${barColor} shrink-0 mt-0.5`} />
                        <div className="space-y-1 flex-1">
                            <div className="w-3/4 h-2 bg-slate-300 rounded-full" /><div className="w-full h-2 bg-slate-200 rounded-full" />
                            <div className={`mt-2 px-3 py-1 ${barColor} text-white text-[10px] font-bold rounded-full w-fit`}>Shop Now →</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white/50 rounded-xl p-2 flex items-end gap-1 h-16">
                    {[30, 55, 40, 75, 60, 90, 70, 85].map((h, i) => (
                        <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.1, duration: 0.5 }} className={`flex-1 ${barColor} opacity-70 rounded-t-sm`} />
                    ))}
                </div>
            </div>
        ),
        chatbot: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="flex-1 flex flex-col items-center gap-0 justify-center">
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/70 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">🟢 Trigger: Keyword Match</motion.div>
                    <div className={`w-0.5 h-5 ${barColor}`} />
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white/70 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">💬 Send Welcome Message</motion.div>
                    <div className={`w-0.5 h-5 ${barColor}`} />
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center"><div className={`w-0.5 h-4 ${barColor}`} /><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className={`px-3 py-1.5 ${barColor} text-white text-[10px] font-bold rounded-xl`}>Show Catalog</motion.div></div>
                        <div className="flex flex-col items-center"><div className="w-0.5 h-4 bg-gray-300" /><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="px-3 py-1.5 bg-gray-200 text-gray-600 text-[10px] font-bold rounded-xl">Talk to Agent</motion.div></div>
                    </div>
                </div>
                <div className="bg-white/60 rounded-xl p-3 space-y-2">
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="bg-white rounded-xl rounded-tl-sm px-3 py-1.5 text-[10px] font-medium w-3/4">Hi! Which product are you looking for?</motion.div>
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }} className={`${barColor} text-white text-[10px] font-medium rounded-xl rounded-tr-sm px-3 py-1.5 w-2/3 ml-auto`}>Show me headphones</motion.div>
                </div>
            </div>
        ),
        livechat: (
            <div className="w-full h-full flex gap-2">
                <div className="w-2/5 flex flex-col gap-2">
                    {[{ name: 'Arjun S.', msg: 'Need help...', unread: 2 }, { name: 'Priya M.', msg: 'Order #1234', unread: 0 }, { name: 'Rahul K.', msg: 'Refund?', unread: 1 }].map((c2, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }}
                            className={`bg-white/70 rounded-xl p-2 flex gap-2 items-center ${i === 0 ? 'ring-2 ring-emerald-300' : ''}`}>
                            <div className={`w-7 h-7 rounded-full ${barColor} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>{c2.name[0]}</div>
                            <div className="min-w-0 flex-1"><div className="text-[10px] font-bold text-slate-700 truncate">{c2.name}</div><div className="text-[9px] text-slate-400 truncate">{c2.msg}</div></div>
                            {c2.unread > 0 && <div className={`w-4 h-4 ${barColor} text-white rounded-full text-[8px] font-bold flex items-center justify-center shrink-0`}>{c2.unread}</div>}
                        </motion.div>
                    ))}
                </div>
                <div className="flex-1 bg-white/50 rounded-xl flex flex-col p-2 gap-2">
                    <div className="flex items-center gap-2 border-b border-white/50 pb-2">
                        <div className={`w-6 h-6 rounded-full ${barColor}`} /><div className="text-[10px] font-bold">Arjun S.</div>
                        <div className={`ml-auto px-2 py-0.5 ${barColor} text-white text-[8px] rounded-full font-bold`}>Agent: You</div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white rounded-lg px-2 py-1 text-[9px] w-3/4">Need help with my order 🙏</motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className={`${barColor} text-white rounded-lg px-2 py-1 text-[9px] w-2/3 ml-auto`}>Sure! Order ID?</motion.div>
                    </div>
                    <div className="h-6 rounded-lg border border-white/60 bg-white/60 flex items-center px-2 gap-1">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full" />
                        <div className={`w-5 h-5 rounded-full ${barColor} flex items-center justify-center`}><Send className="w-2.5 h-2.5 text-white" /></div>
                    </div>
                </div>
            </div>
        ),
        analytics_meta: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[['45%', 'CTR'], ['98%', 'Open Rate'], ['12K', 'Replies']].map(([v, l]) => (
                        <div key={l} className="bg-white/70 rounded-xl p-2 text-center"><div className="font-black text-sm text-slate-800">{v}</div><div className="text-[9px] text-slate-400 font-bold">{l}</div></div>
                    ))}
                </div>
                <div className="flex-1 bg-white/50 rounded-xl p-3 relative overflow-hidden">
                    <div className="text-[9px] font-bold text-slate-500 mb-2">CLICKED PER DAY</div>
                    <svg viewBox="0 0 200 55" className="w-full h-3/4" preserveAspectRatio="none">
                        <defs><linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" /></linearGradient></defs>
                        <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5 }} d="M 0 50 C 20 45, 40 20, 60 30 S 100 10, 120 20 S 160 5, 200 15" stroke="#f59e0b" strokeWidth="2" fill="none" />
                        <path d="M 0 50 C 20 45, 40 20, 60 30 S 100 10, 120 20 S 160 5, 200 15 L 200 60 L 0 60 Z" fill="url(#cg2)" />
                    </svg>
                </div>
                <div className="bg-white/60 rounded-xl p-2 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${barColor}`} /><div className="text-[10px] font-bold text-slate-700 flex-1">Republic Day Sale</div>
                    <div className={`px-2 py-0.5 ${barColor} text-white text-[9px] rounded-full font-bold`}>Active</div>
                </div>
            </div>
        ),
        analytics_wa: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[['99%', 'Delivered'], ['94%', 'Read'], ['65%', 'Replied']].map(([v, l]) => (
                        <div key={l} className="bg-white/70 rounded-xl p-2 text-center"><div className="font-black text-sm text-slate-800">{v}</div><div className="text-[9px] text-slate-400 font-bold">{l}</div></div>
                    ))}
                </div>
                <div className="flex-1 bg-white/50 rounded-xl p-3 flex flex-col">
                    <div className="text-[10px] font-bold text-slate-500 mb-2">Message Volume (Today)</div>
                    <div className="flex-1 flex items-end gap-2 px-2">
                        {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.1, duration: 0.5 }}
                                className={`flex-1 bg-gradient-to-t ${feature.gradientIcon || 'from-blue-500 to-cyan-500'} rounded-t-sm opacity-80`} />
                        ))}
                    </div>
                </div>
            </div>
        ),
        catalog: (
            <div className="w-full h-full flex flex-col gap-3">
                <div className="bg-white/70 rounded-xl p-3 flex-1 overflow-hidden">
                    <div className="text-[10px] font-bold text-slate-600 mb-2">🛍️ Our Products</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[{ name: 'Headphones', price: '₹1,499' }, { name: 'Smart Watch', price: '₹3,299' }, { name: 'Phone Case', price: '₹299' }, { name: 'Earbuds', price: '₹899' }].map((p, i) => (
                            <motion.div key={p.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.15 }} className="bg-white rounded-lg p-2">
                                <div className={`h-10 ${barColor} opacity-20 rounded-md mb-1`} />
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
                    {[{ label: 'Opened, not replied', count: '4.2K', pct: 78 }, { label: 'Clicked, no purchase', count: '1.8K', pct: 45 }, { label: 'Cart abandoned', count: '892', pct: 23 }].map((s, i) => (
                        <div key={s.label} className="mb-2">
                            <div className="flex justify-between text-[9px] font-bold text-slate-600 mb-1"><span>{s.label}</span><span>{s.count}</span></div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ delay: i * 0.2, duration: 0.8 }} className={`h-full ${barColor} rounded-full`} />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 bg-white/60 rounded-xl p-2 text-center"><div className="font-black text-lg text-slate-800">3.1x</div><div className="text-[9px] text-slate-400 font-bold">Conversion Lift</div></div>
                    <div className="flex-1 bg-white/60 rounded-xl p-2 text-center"><div className="font-black text-lg text-slate-800">Auto</div><div className="text-[9px] text-slate-400 font-bold">Follow-up</div></div>
                </div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className={`${barColor} text-white text-[10px] font-bold py-2 rounded-xl text-center`}>🚀 Launch Retarget Campaign</motion.div>
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
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl rounded-tl-sm px-3 py-1.5 text-[9px] font-medium text-slate-700 w-4/5">What are your pricing plans?</motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-end gap-1 justify-end">
                        <div className={`${barColor} text-white rounded-xl rounded-tr-sm px-3 py-1.5 text-[9px] font-medium w-4/5`}>We have 3 plans — Starter ₹999/mo, Pro ₹2,499/mo and Enterprise (custom). All include unlimited contacts. Want me to compare them? 🚀</div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }} className="bg-white rounded-xl rounded-tl-sm px-3 py-1.5 text-[9px] font-medium text-slate-700 w-3/5">Yes please! Also do you have a free trial?</motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="flex justify-end">
                        <div className={`${barColor} text-white rounded-xl rounded-tr-sm px-3 py-1.5 text-[9px] font-medium w-4/5 flex items-center gap-1`}>
                            <span className="animate-pulse">●</span> Typing...
                        </div>
                    </motion.div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                    {[['🧠', 'GPT-4'], ['⚡', '< 1s reply'], ['🔒', 'No Halluc.']].map(([ic, lb]) => (
                        <div key={lb} className="bg-white/60 rounded-lg p-1.5 text-center"><div className="text-base">{ic}</div><div className="text-[8px] font-bold text-slate-500">{lb}</div></div>
                    ))}
                </div>
            </div>
        ),
        cart_payment: (
            <div className="w-full h-full flex flex-col gap-2">
                <div className="bg-white/70 rounded-xl p-3 flex-1 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="text-[10px] font-bold text-slate-600 border-b border-black/5 pb-2 mb-2">🛒 Cart Summary</div>
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-bold text-slate-800">1x Smart Watch</div>
                            <div className="text-[10px] text-slate-600 font-medium">₹3,299</div>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-bold text-slate-800">2x Phone Case</div>
                            <div className="text-[10px] text-slate-600 font-medium">₹598</div>
                        </div>
                    </div>
                    <div className="border-t border-black/10 pt-2 flex justify-between items-center mt-2">
                        <div className="text-[10px] font-black text-slate-500 uppercase">Total</div>
                        <div className="text-sm font-black text-slate-800">₹3,897</div>
                    </div>
                </div>
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }} className="bg-emerald-500 text-white text-center text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20">
                    <Check className="w-4 h-4" /> <span>Pay with UPI</span>
                </motion.div>
            </div>
        ),
        order_track: (
            <div className="w-full h-full flex flex-col gap-2 relative">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/80 rounded-xl p-3 shadow-sm text-[10px]">
                    <div className="font-bold text-slate-800 mb-1 flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Order Confirmed!</div>
                    <div className="text-slate-600 leading-tight">Your order #ORD-8923 for <span className="font-bold text-slate-800">Smart Watch</span> is processed.</div>
                </motion.div>
                <div className="flex-1 flex flex-col gap-1 ml-4 border-l-2 border-emerald-200 pl-4 py-2 mt-2">
                    <div className="relative">
                        <div className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                        <div className="text-[10px] font-bold text-slate-800">Order Placed</div>
                        <div className="text-[8px] text-slate-400">10:45 AM</div>
                    </div>
                    <div className="relative mt-4">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }} className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                            <div className="text-[10px] font-bold text-slate-800">Shipped</div>
                            <div className="text-[8px] text-slate-500 font-medium">Tracking: BLR-442 <span className="text-blue-500">Track</span></div>
                        </motion.div>
                    </div>
                    <div className="relative mt-4 opacity-40">
                        <div className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 bg-slate-300 rounded-full border-2 border-white"></div>
                        <div className="text-[10px] font-bold text-slate-800">Out for Delivery</div>
                    </div>
                </div>
            </div>
        ),
        vcard_lead: (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-500 p-1 shadow-lg shadow-fuchsia-500/20">
                        <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                            <QrCode className="w-10 h-10 text-slate-800" />
                        </div>
                    </div>
                    <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-0.5 bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)] max-w-full z-10" />
                </div>
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} className="bg-white/90 backdrop-blur-sm rounded-xl p-2.5 w-full max-w-[180px] max-w-full shadow-sm border border-fuchsia-100">
                    <div className="flex items-center gap-1 text-[8px] font-bold text-fuchsia-600 uppercase mb-1.5"><Users className="w-3 h-3" /> New Lead Captured</div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold text-[10px]">RS</div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 truncate">Rahul Sharma</div>
                            <div className="text-[9px] text-slate-500 font-medium truncate">+91 98765 43210</div>
                        </div>
                    </div>
                </motion.div>
            </div>
        ),
        vcard_theme: (
            <div className="w-full h-full flex items-center justify-center gap-3 relative">
                {/* Background blurred cards */}
                <motion.div initial={{ x: 20, rotate: 10 }} animate={{ x: -30, rotate: -15 }} transition={{ duration: 1 }} className="absolute w-24 h-36 bg-zinc-800 rounded-xl shadow-lg border border-white/10 p-2 flex flex-col items-center justify-center opacity-60">
                    <div className="w-8 h-8 rounded-full bg-zinc-600 mb-2"></div>
                    <div className="w-12 h-1.5 bg-zinc-600 rounded-full mb-1"></div>
                    <div className="w-8 h-1 bg-zinc-700 rounded-full"></div>
                </motion.div>

                {/* Foreground active card */}
                <motion.div initial={{ scale: 0.8, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="w-32 h-44 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-slate-100 z-10 overflow-hidden flex flex-col">
                    <div className="h-12 bg-gradient-to-r from-slate-800 to-slate-900 relative">
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white p-1">
                            <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden"><img loading="lazy" src="https://ui-avatars.com/api/?name=JS&background=random" alt="avatar" className="w-full h-full object-cover" /></div>
                        </div>
                    </div>
                    <div className="mt-6 flex-1 flex flex-col items-center px-3 text-center">
                        <div className="w-20 h-2 bg-slate-800 rounded-full mb-1.5"></div>
                        <div className="w-12 h-1.5 bg-slate-400 rounded-full mb-3"></div>
                        <div className="w-full flex justify-center gap-1.5 mb-3">
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200"></div>
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200"></div>
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200"></div>
                        </div>
                        <div className="w-full h-7 rounded-lg bg-slate-800 mt-auto mb-3 flex items-center justify-center"><div className="w-12 h-1.5 bg-white/50 rounded-full"></div></div>
                    </div>
                </motion.div>
            </div>
        ),
        audience_sync: (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-4 w-full px-4">
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex-1 bg-white/80 rounded-xl p-3 flex flex-col items-center shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mb-1"><MessageCircle className="w-4 h-4 text-emerald-600" /></div>
                        <div className="text-[9px] font-bold text-slate-800">WhatsApp</div>
                        <div className="text-[8px] text-slate-500">12.5k Contacts</div>
                    </motion.div>

                    <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center shrink-0 z-10 relative animate-spin" style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}>
                        <Repeat className={`w-4 h-4 ${barColor.replace('bg-', 'text-')}`} />
                    </div>

                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex-1 bg-white/80 rounded-xl p-3 flex flex-col items-center shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-1"><Facebook className="w-4 h-4 text-blue-600" /></div>
                        <div className="text-[9px] font-bold text-slate-800">Meta Ads</div>
                        <div className="text-[8px] text-slate-500">Custom Audience</div>
                    </motion.div>
                </div>
                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "80%" }} transition={{ delay: 1, duration: 1 }} className="h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] max-w-full mt-2 relative overflow-hidden">
                    <div className="absolute inset-0 w-1/2 bg-white/50 -skew-x-12" style={{ animation: 'shimmer-slide 1.5s linear infinite' }}></div>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Live Sync Active</motion.div>
            </div>
        ),
        vcard: (
            <div className="w-full h-full flex items-center justify-center relative">
                <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl"></div>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-44 bg-white shadow-2xl rounded-2xl border border-cyan-100 overflow-hidden relative z-10 flex flex-col">
                    <div className={`h-16 ${barColor} relative`}>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full p-1 shadow-md">
                            <div className={`w-full h-full rounded-full ${barColor} text-white flex items-center justify-center`}>
                                <User className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 pb-3 px-4 text-center flex-1">
                        <div className="w-20 h-2.5 bg-slate-200 rounded-full mx-auto mb-2"></div>
                        <div className="w-12 h-2 bg-slate-100 rounded-full mx-auto mb-4"></div>
                        <div className="flex gap-2 justify-center mb-4">
                            <div className="w-6 h-6 rounded-full bg-cyan-50 flex items-center justify-center"><Mail className="w-3 h-3 text-cyan-600" /></div>
                            <div className="w-6 h-6 rounded-full bg-cyan-50 flex items-center justify-center"><Smartphone className="w-3 h-3 text-cyan-600" /></div>
                            <div className="w-6 h-6 rounded-full bg-cyan-50 flex items-center justify-center"><Globe className="w-3 h-3 text-cyan-600" /></div>
                        </div>
                        <div className={`w-full py-1.5 ${barColor} text-white text-[9px] font-bold rounded-lg shadow-sm`}>Save to Contacts</div>
                    </div>
                </motion.div>
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-lg border border-slate-100 z-20">
                    <div className="w-12 h-12 border-2 border-cyan-500/20 rounded-md flex items-center justify-center p-1 relative overflow-hidden">
                        <div className="absolute inset-0 bg-cyan-500/5"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5 w-full h-full opacity-80">
                            <div className="bg-slate-800 rounded-[1px]"></div><div className="bg-slate-800 rounded-[1px]"></div><div className="bg-slate-800 rounded-[1px]"></div>
                            <div className="bg-slate-800 rounded-[1px]"></div><div className="bg-transparent"></div><div className="bg-slate-800 rounded-[1px]"></div>
                            <div className="bg-slate-800 rounded-[1px]"></div><div className="bg-slate-800 rounded-[1px]"></div><div className="bg-slate-800 rounded-[1px]"></div>
                        </div>
                    </div>
                    <div className="text-[8px] font-bold text-center mt-1 text-slate-500">Scan Me</div>
                </motion.div>
            </div>
        ),
        meta_lead_ads: <ImageMockup imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800" badgeText="CTWA Ad Active" BadgeIcon={Megaphone} colorClass={barColor} />,
        meta_pixel_sync: <ImageMockup imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" badgeText="Pixel Synced" BadgeIcon={Activity} colorClass={barColor} />,
        meta_custom_audience: <ImageMockup imageUrl="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800" badgeText="Audience Match: High" BadgeIcon={Target} colorClass={barColor} />,
        meta_catalog_sales: <ImageMockup imageUrl="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800" badgeText="Catalog Connected" BadgeIcon={Store} colorClass={barColor} />,
        meta_ab_testing: <ImageMockup imageUrl="https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&q=80&w=800" badgeText="Variant B Winning" BadgeIcon={SplitSquareHorizontal} colorClass={barColor} />,
        meta_campaign_builder: <ImageMockup imageUrl="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800" badgeText="Campaign Generated" BadgeIcon={Wand2} colorClass={barColor} />,

        store_categories: <ImageMockup imageUrl="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800" badgeText="Browse Collection" BadgeIcon={LayoutGrid} colorClass={barColor} />,
        store_orders: <ImageMockup imageUrl="https://images.unsplash.com/photo-1586880244406-556ebe35f282?auto=format&fit=crop&q=80&w=800" badgeText="Processing Order" BadgeIcon={ListOrdered} colorClass={barColor} />,
        store_coupons: <ImageMockup imageUrl="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800" badgeText="Discount Applied" BadgeIcon={Tag} colorClass={barColor} />,
        store_invoices: <ImageMockup imageUrl="https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&q=80&w=800" badgeText="Receipt Generated" BadgeIcon={FileText} colorClass={barColor} />,

        vcard_analytics: <ImageMockup imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" badgeText="Live Scan Tracking" BadgeIcon={LineChart} colorClass={barColor} />,
        vcard_appointments: <ImageMockup imageUrl="https://images.unsplash.com/photo-1506784951206-39b15802353a?auto=format&fit=crop&q=80&w=800" badgeText="Meeting Scheduled" BadgeIcon={Calendar} colorClass={barColor} />,
        vcard_nfc: <ImageMockup imageUrl="https://images.unsplash.com/photo-1563986768494-4dee2763ff0f?auto=format&fit=crop&q=80&w=800" badgeText="NFC Card Ready" BadgeIcon={Wifi} colorClass={barColor} />,
        vcard_domain: <ImageMockup imageUrl="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800" badgeText="Domain Active" BadgeIcon={Globe} colorClass={barColor} />
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div key={feature.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}
                className={`w-full h-full rounded-2xl ${previewBg} p-4`}>
                {mockups[preview]}
            </motion.div>
        </AnimatePresence>
    );
}

const SHOWCASE_INTERVAL = 4500;

// Style defaults per feature id — these stay hardcoded on the frontend
export const FEATURE_STYLE_DEFAULTS = {
    broadcast: { icon: Send, bg: 'bg-indigo-50 dark:bg-indigo-950/20', previewBg: 'bg-indigo-100/70', barColor: 'bg-indigo-500', pillColor: 'bg-indigo-50 text-indigo-700 border-indigo-100', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400', gradientIcon: 'from-indigo-500 to-violet-500', preview: 'broadcast' },
    chatbot: { icon: Layers, bg: 'bg-violet-50 dark:bg-violet-950/20', previewBg: 'bg-violet-100/70', barColor: 'bg-violet-500', pillColor: 'bg-violet-50 text-violet-700 border-violet-100', iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-violet-600 dark:text-violet-400', gradientIcon: 'from-violet-500 to-purple-500', preview: 'chatbot' },
    livechat: { icon: HeadphonesIcon, bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70', barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400', gradientIcon: 'from-emerald-500 to-teal-500', preview: 'livechat' },
    analytics_meta: { icon: BarChart, bg: 'bg-amber-50 dark:bg-amber-950/5', previewBg: 'bg-amber-100/70', barColor: 'bg-amber-500', pillColor: 'bg-amber-50 text-amber-700 border-amber-100', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400', gradientIcon: 'from-amber-500 to-orange-500', preview: 'analytics_meta' },
    analytics_wa: { icon: BarChart, bg: 'bg-blue-50 dark:bg-blue-950/5', previewBg: 'bg-blue-100/70', barColor: 'bg-blue-500', pillColor: 'bg-blue-50 text-blue-700 border-blue-100', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400', gradientIcon: 'from-blue-500 to-cyan-500', preview: 'analytics_wa' },
    catalog: { icon: ShoppingCart, bg: 'bg-rose-50 dark:bg-rose-950/20', previewBg: 'bg-rose-100/70', barColor: 'bg-rose-500', pillColor: 'bg-rose-50 text-rose-700 border-rose-100', iconBg: 'bg-rose-100 dark:bg-rose-900/40', iconColor: 'text-rose-600 dark:text-rose-400', gradientIcon: 'from-rose-500 to-pink-500', preview: 'catalog' },
    retarget: { icon: ArrowUpRight, bg: 'bg-cyan-50 dark:bg-cyan-950/20', previewBg: 'bg-cyan-100/70', barColor: 'bg-cyan-500', pillColor: 'bg-cyan-50 text-cyan-700 border-cyan-100', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconColor: 'text-cyan-600 dark:text-cyan-400', gradientIcon: 'from-cyan-500 to-sky-500', preview: 'retarget' },
    aibot: { icon: Zap, bg: 'bg-purple-50 dark:bg-purple-950/5', previewBg: 'bg-purple-100/70', barColor: 'bg-purple-500', pillColor: 'bg-purple-50 text-purple-700 border-purple-100', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400', gradientIcon: 'from-purple-500 to-indigo-600', preview: 'aibot' },
    cart_payment: { icon: CreditCard, bg: 'bg-orange-50 dark:bg-orange-950/20', previewBg: 'bg-orange-100/70', barColor: 'bg-orange-500', pillColor: 'bg-orange-50 text-orange-700 border-orange-100', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconColor: 'text-orange-600 dark:text-orange-400', gradientIcon: 'from-orange-400 to-amber-500', preview: 'cart_payment' },
    order_track: { icon: Truck, bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70', barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400', gradientIcon: 'from-emerald-400 to-teal-500', preview: 'order_track' },
    vcard: { icon: Briefcase, bg: 'bg-cyan-50 dark:bg-cyan-950/20', previewBg: 'bg-cyan-100/70', barColor: 'bg-cyan-500', pillColor: 'bg-cyan-50 text-cyan-700 border-cyan-100', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconColor: 'text-cyan-600 dark:text-cyan-400', gradientIcon: 'from-cyan-400 to-blue-500', preview: 'vcard' },
    vcard_lead: { icon: Users, bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20', previewBg: 'bg-fuchsia-100/70', barColor: 'bg-fuchsia-500', pillColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100', iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', iconColor: 'text-fuchsia-600 dark:text-fuchsia-400', gradientIcon: 'from-fuchsia-500 to-pink-500', preview: 'vcard_lead' },
    vcard_theme: { icon: LayoutTemplate, bg: 'bg-slate-50 dark:bg-zinc-800/50', previewBg: 'bg-slate-200/70 dark:bg-zinc-800', barColor: 'bg-slate-800 dark:bg-slate-200', pillColor: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-slate-200 dark:border-white/10', iconBg: 'bg-slate-200 dark:bg-zinc-700', iconColor: 'text-slate-800 dark:text-slate-200', gradientIcon: 'from-slate-700 to-slate-900 dark:from-slate-400 dark:to-slate-200', preview: 'vcard_theme' },
    audience_sync: { icon: Repeat, bg: 'bg-pink-50 dark:bg-pink-950/20', previewBg: 'bg-pink-100/70', barColor: 'bg-pink-500', pillColor: 'bg-pink-50 text-pink-700 border-pink-100', iconBg: 'bg-pink-100 dark:bg-pink-900/40', iconColor: 'text-pink-600 dark:text-pink-400', gradientIcon: 'from-pink-500 to-rose-500', preview: 'audience_sync' },

    meta_lead_ads: { icon: Megaphone, bg: 'bg-indigo-50 dark:bg-indigo-950/20', previewBg: 'bg-indigo-100/70', barColor: 'bg-indigo-500', pillColor: 'bg-indigo-50 text-indigo-700 border-indigo-100', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400', gradientIcon: 'from-indigo-500 to-blue-500', preview: 'meta_lead_ads' },
    meta_pixel_sync: { icon: Activity, bg: 'bg-blue-50 dark:bg-blue-950/5', previewBg: 'bg-blue-100/70', barColor: 'bg-blue-500', pillColor: 'bg-blue-50 text-blue-700 border-blue-100', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400', gradientIcon: 'from-blue-500 to-cyan-500', preview: 'meta_pixel_sync' },
    meta_custom_audience: { icon: Target, bg: 'bg-purple-50 dark:bg-purple-950/5', previewBg: 'bg-purple-100/70', barColor: 'bg-purple-500', pillColor: 'bg-purple-50 text-purple-700 border-purple-100', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400', gradientIcon: 'from-purple-500 to-pink-500', preview: 'meta_custom_audience' },
    meta_catalog_sales: { icon: Store, bg: 'bg-rose-50 dark:bg-rose-950/20', previewBg: 'bg-rose-100/70', barColor: 'bg-rose-500', pillColor: 'bg-rose-50 text-rose-700 border-rose-100', iconBg: 'bg-rose-100 dark:bg-rose-900/40', iconColor: 'text-rose-600 dark:text-rose-400', gradientIcon: 'from-rose-500 to-orange-500', preview: 'meta_catalog_sales' },
    meta_ab_testing: { icon: SplitSquareHorizontal, bg: 'bg-amber-50 dark:bg-amber-950/5', previewBg: 'bg-amber-100/70', barColor: 'bg-amber-500', pillColor: 'bg-amber-50 text-amber-700 border-amber-100', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400', gradientIcon: 'from-amber-500 to-yellow-500', preview: 'meta_ab_testing' },
    meta_campaign_builder: { icon: Wand2, bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70', barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400', gradientIcon: 'from-emerald-500 to-teal-500', preview: 'meta_campaign_builder' },

    store_categories: { icon: LayoutGrid, bg: 'bg-pink-50 dark:bg-pink-950/20', previewBg: 'bg-pink-100/70', barColor: 'bg-pink-500', pillColor: 'bg-pink-50 text-pink-700 border-pink-100', iconBg: 'bg-pink-100 dark:bg-pink-900/40', iconColor: 'text-pink-600 dark:text-pink-400', gradientIcon: 'from-pink-500 to-rose-500', preview: 'store_categories' },
    store_orders: { icon: ListOrdered, bg: 'bg-blue-50 dark:bg-blue-950/5', previewBg: 'bg-blue-100/70', barColor: 'bg-blue-500', pillColor: 'bg-blue-50 text-blue-700 border-blue-100', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400', gradientIcon: 'from-blue-500 to-indigo-500', preview: 'store_orders' },
    store_coupons: { icon: Tag, bg: 'bg-amber-50 dark:bg-amber-950/5', previewBg: 'bg-amber-100/70', barColor: 'bg-amber-500', pillColor: 'bg-amber-50 text-amber-700 border-amber-100', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400', gradientIcon: 'from-amber-500 to-orange-500', preview: 'store_coupons' },
    store_invoices: { icon: FileText, bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70', barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400', gradientIcon: 'from-emerald-500 to-teal-500', preview: 'store_invoices' },

    vcard_analytics: { icon: LineChart, bg: 'bg-blue-50 dark:bg-blue-950/5', previewBg: 'bg-blue-100/70', barColor: 'bg-blue-500', pillColor: 'bg-blue-50 text-blue-700 border-blue-100', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400', gradientIcon: 'from-blue-500 to-cyan-500', preview: 'vcard_analytics' },
    vcard_appointments: { icon: Calendar, bg: 'bg-purple-50 dark:bg-purple-950/5', previewBg: 'bg-purple-100/70', barColor: 'bg-purple-500', pillColor: 'bg-purple-50 text-purple-700 border-purple-100', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400', gradientIcon: 'from-purple-500 to-pink-500', preview: 'vcard_appointments' },
    vcard_nfc: { icon: Wifi, bg: 'bg-indigo-50 dark:bg-indigo-950/20', previewBg: 'bg-indigo-100/70', barColor: 'bg-indigo-500', pillColor: 'bg-indigo-50 text-indigo-700 border-indigo-100', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400', gradientIcon: 'from-indigo-500 to-violet-500', preview: 'vcard_nfc' },
    vcard_domain: { icon: Globe, bg: 'bg-emerald-50 dark:bg-emerald-950/5', previewBg: 'bg-emerald-100/70', barColor: 'bg-emerald-500', pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400', gradientIcon: 'from-emerald-500 to-teal-500', preview: 'vcard_domain' }
};

export const FEATURE_CATEGORIES = [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'meta', label: 'Meta Marketing', icon: TrendingUp },
    { id: 'store', label: 'WA Store', icon: ShoppingCart },
    { id: 'vcard', label: 'vCards', icon: Briefcase },
];

function AdvancedFeaturesShowcase({ config }) {
    // Ensure we always have the complete 14 features list, even if DB has an old 7-item array.
    // We map over the hardcoded advancedFeatures and merge any custom text/stats from the DB config.
    let baseList = [];
    if (config?.features && config.features.length > 0) {
        // Use DB order and merge with hardcoded properties
        baseList = config.features.map(dbFeat => {
            const baseFeat = advancedFeatures.find(af => af.id === dbFeat.id || (af.id === 'analytics_wa' && dbFeat.id === 'analytics'));
            return baseFeat ? { ...baseFeat, ...dbFeat, id: baseFeat.id, category: baseFeat.category, preview: baseFeat.preview } : null;
        }).filter(Boolean);

        // Append any missing features from hardcoded list
        advancedFeatures.forEach(af => {
            if (!baseList.find(f => f.id === af.id || (f.id === 'analytics' && af.id === 'analytics_wa'))) {
                baseList.push(af);
            }
        });
    } else {
        baseList = [...advancedFeatures];
    }

    // Group by category to ensure autoplay doesn't jump
    const groupedBaseList = [];
    ['whatsapp', 'meta', 'store', 'vcard'].forEach(cat => {
        groupedBaseList.push(...baseList.filter(f => f.category === cat));
    });

    const allFeatures = groupedBaseList.map(f => ({
        ...(FEATURE_STYLE_DEFAULTS[f.id] || {}),
        ...f,
        stats: Array.isArray(f.stats) ? f.stats : (f.stats || '').split(',').map(s => s.trim()).filter(Boolean),
    }));

    const [active, setActive] = useState(0);
    const [progress, setProgress] = useState(0);
    const scrollContainerRef = useRef(null);

    const feature = allFeatures[active] || allFeatures[0];
    const activeCategory = feature.category || 'whatsapp';

    useEffect(() => {
        setProgress(0);
        const start = Date.now();
        // Slowed to 200ms intervals to prevent 20 React re-renders/sec during scroll
        const tick = setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.min((elapsed / SHOWCASE_INTERVAL) * 100, 100);
            setProgress(pct);

            if (elapsed >= SHOWCASE_INTERVAL) {
                setActive(prev => (prev + 1) % allFeatures.length);
            }
        }, 200);
        return () => clearInterval(tick);
    }, [active, allFeatures.length]);

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

    const handleCategoryClick = (catId) => {
        const index = allFeatures.findIndex(f => f.category === catId);
        if (index !== -1) {
            setActive(index);
        }
    };

    const TabIcon = resolveIcon(feature.icon, Zap);

    return (
        <div className="flex flex-col gap-8">
            {/* Category Tab Bar (Quick Navigation) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                {FEATURE_CATEGORIES.map(cat => {
                    const isActive = cat.id === activeCategory;
                    const CatIcon = cat.icon;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105'
                                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                            <CatIcon className="w-4 h-4" />
                            {cat.label}
                        </button>
                    )
                })}
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-5 gap-8 items-start">
                {/* TOP/LEFT: Feature Tab list (All Features) */}
                <div
                    ref={scrollContainerRef}
                    className="lg:col-span-2 flex lg:flex-col flex-row gap-2 w-full overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 hide-scrollbar scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {allFeatures.map((f, i) => {
                        if (f.category !== activeCategory) return null;

                        const Icon = resolveIcon(f.icon, Zap);
                        const isActive = i === active;
                        return (
                            <button
                                key={f.id}
                                onClick={() => setActive(i)}
                                className={`relative flex-shrink-0 lg:w-full text-left px-4 py-3.5 rounded-2xl transition-all border ${isActive
                                    ? `bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 shadow-md`
                                    : 'bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Gradient icon badge */}
                                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${f.gradientIcon || 'from-slate-400 to-slate-500'} flex items-center justify-center shrink-0 shadow-sm transition-transform ${isActive ? 'scale-110' : 'opacity-50 scale-95'
                                        }`}>
                                        <Icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        {f.tagText && isActive && (
                                            <div className={`text-[9px] font-black uppercase tracking-widest ${f.iconColor} mb-0.5`}>{f.tagText}</div>
                                        )}
                                        <span className={`font-bold text-sm whitespace-nowrap lg:whitespace-normal block leading-tight ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
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

                            <div className="p-6 md:p-4 md:p-7">
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
        </div>
    );
}


// ──────────────────────────────────────────────────────────
// FAQ SECTION
// ──────────────────────────────────────────────────────────
function FAQSection({ faqs }) {
    const [openIdx, setOpenIdx] = useState(null);
    const [showAll, setShowAll] = useState(false);

    const displayedFaqs = showAll ? faqs : (faqs || []).slice(0, 4);

    return (
        <section id="faq" className="py-24 bg-white dark:bg-[#05050A] transition-colors relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] max-w-full h-[400px] bg-indigo-400/5 dark:bg-indigo-500/8 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10">
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
                    {displayedFaqs.map((faq, i) => {
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
                                    className="w-full flex items-center justify-between gap-4 px-4 md:px-6 py-5 text-left"
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
                                            <p className="px-4 md:px-6 pb-6 text-slate-600 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">
                                                {faq.answer}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>

                {!showAll && faqs && faqs.length > 4 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="mt-10 flex justify-center"
                    >
                        <button
                            onClick={() => setShowAll(true)}
                            className="px-8 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full font-bold text-slate-700 dark:text-slate-300 transition-all shadow-sm flex items-center gap-2"
                        >
                            Load More
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </motion.div>
                )}
            </div>
        </section>
    );
}

// ──────────────────────────────────────────────────────────
// ADDON MARKETPLACE SHOWCASE
// ──────────────────────────────────────────────────────────
const AddonMarketplaceShowcase = () => {
    const marketplaceBenefits = [
        { id: 'instant', name: 'One-Click Installs', category: 'Speed', icon: Zap, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.6)]', desc: 'Instantly add new capabilities to your workspace without touching a single line of code. Just click and deploy.' },
        { id: 'tailored', name: 'Tailor-Made Workspace', category: 'Efficiency', icon: Layers, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.6)]', desc: 'Keep your dashboard clean. Only install the exact tools and features your business actually needs to operate.' },
        { id: 'scale', name: 'Scale on Demand', category: 'Growth', icon: TrendingUp, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.6)]', desc: 'As your business grows, your platform grows with it. Seamlessly upgrade your toolkit to handle new challenges.' },
        { id: 'community', name: 'Expanding Ecosystem', category: 'Innovation', icon: Globe, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.6)]', desc: 'Benefit from a continuously evolving ecosystem with new tools and integrations added by our team and community.' },
        { id: 'integrations', name: 'Native Integrations', category: 'Connectivity', icon: Repeat, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.6)]', desc: 'Seamlessly connect with your favorite CRM, support, and marketing tools via our native ecosystem bridges.' },
        { id: 'analytics', name: 'Real-Time Insights', category: 'Data', icon: Activity, color: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-500/10', border: 'border-cyan-200 dark:border-cyan-500/20', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.6)]', desc: 'Unlock powerful reporting addons to visualize your message performance and agent productivity.' },
    ];

    return (
        <section className="py-24 relative bg-slate-50 dark:bg-[#05050A] transition-colors overflow-hidden border-t border-slate-200 dark:border-white/5">
            {/* Ambient Backgrounds (reduced blur for GPU perf) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] max-w-full h-[600px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none" style={{ transform: 'translateX(-50%) translateZ(0)' }} />
            <div className="absolute bottom-0 right-0 w-[500px] max-w-full h-[500px] bg-violet-500/10 dark:bg-violet-500/15 rounded-full blur-[60px] pointer-events-none" style={{ transform: 'translateZ(0)' }} />

            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgxNTAsMTUwLDE1MCwwLjE1KSIvPjwvc3ZnPg==')] opacity-40 dark:opacity-[0.15] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
                <div className="text-center mb-16 relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/40 rounded-full text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-widest mb-5 shadow-sm"
                    >
                        <Layers className="w-3.5 h-3.5" /> Infinite Possibilities
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-slate-900 dark:text-white tracking-tight leading-[1.1]"
                    >
                        The Power of <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Marketplace</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed"
                    >
                        Transform your platform into exactly what you need. Our addon architecture ensures you have unlimited scalability without the bloat.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 perspective-1000">
                    {marketplaceBenefits.map((benefit, i) => {
                        const Icon = benefit.icon;
                        return (
                            <motion.div
                                key={benefit.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: i * 0.08 }}
                                whileHover={{ y: -6, scale: 1.01 }}
                                className="group relative rounded-3xl p-4 md:p-6 bg-white dark:bg-[#0c0c14] border border-slate-200 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl transition-all duration-300 cursor-pointer overflow-visible"
                                style={{ willChange: 'transform' }}
                            >
                                {/* Glowing backdrop that appears on hover */}
                                <div className={`absolute -inset-1 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-15 blur-lg transition-opacity duration-500 -z-10`} />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${benefit.bg} ${benefit.border} border shadow-sm group-hover:${benefit.glow} transition-all duration-500 relative`}>
                                            <Icon className={`w-6 h-6 ${benefit.color} relative z-10`} />
                                            <div className="absolute inset-0 bg-white/50 dark:bg-white/0 rounded-xl group-hover:bg-transparent transition-colors" />
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-sm">
                                            {benefit.category}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-purple-500 transition-all duration-300">
                                        {benefit.name}
                                    </h3>

                                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed flex-1">
                                        {benefit.desc}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
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

const TestimonialCard = ({ t, str }) => (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-4 md:p-8 rounded-3xl shadow-sm hover:shadow-xl transition-shadow h-full flex flex-col">
        <div className="flex gap-1 mb-6">
            {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
        </div>
        <p className="text-lg text-slate-700 dark:text-slate-300 font-medium mb-8">"{str(t.quote)}"</p>
        <div className="flex items-center gap-4 mt-auto">
            {t.avatar ? (
                <img loading="lazy" src={str(t.avatar)} className="w-12 h-12 rounded-full object-cover bg-slate-100" alt={str(t.name)} />
            ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                    {str(t.name).substring(0, 1)}
                </div>
            )}
            <div>
                <div className="font-bold text-slate-900 dark:text-white">{str(t.name)}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{str(t.role)}</div>
            </div>
        </div>
    </div>
);

function TestimonialSlider({ testimonials }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(true);
    const [visibleCount, setVisibleCount] = useState(3);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) setVisibleCount(1);
            else if (window.innerWidth < 1024) setVisibleCount(2);
            else setVisibleCount(3);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (testimonials.length <= visibleCount) return;
        const timer = setInterval(() => {
            setIsTransitioning(true);
            setCurrentIndex((prev) => prev + 1);
        }, 3000);
        return () => clearInterval(timer);
    }, [testimonials.length, visibleCount]);

    useEffect(() => {
        if (currentIndex === testimonials.length) {
            const timer = setTimeout(() => {
                setIsTransitioning(false);
                setCurrentIndex(0);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, testimonials.length]);

    const str = (v) => v || '';

    if (testimonials.length <= visibleCount) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map((t, i) => <TestimonialCard key={i} t={t} str={str} />)}
            </div>
        );
    }

    const extendedTestimonials = [...testimonials, ...testimonials.slice(0, visibleCount)];

    return (
        <div className="overflow-hidden relative -mx-4 px-4 sm:mx-0 sm:px-0">
            <div
                className={`flex gap-6 ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
                style={{ transform: `translateX(calc(-${currentIndex} * (100% + 24px) / ${visibleCount}))` }}
            >
                {extendedTestimonials.map((t, i) => (
                    <div
                        key={i}
                        className="flex-shrink-0"
                        style={{ width: `calc((100% - ${(visibleCount - 1) * 24}px) / ${visibleCount})` }}
                    >
                        <TestimonialCard t={t} str={str} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LandingPage() {
    const [config, setConfig] = useState(null);
    const [publicSettings, setPublicSettings] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [error, setError] = useState(false);
    const [plans, setPlans] = useState([]);
    const [metaRates, setMetaRates] = useState(null);
    const [billingInterval, setBillingInterval] = useState('monthly');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [activeIndustry, setActiveIndustry] = useState(industries[0].id);

    const industryScrollRef = useRef(null);

    // Merge DB items over hardcoded industries — always ensure all 16 are present
    const allIndustries = React.useMemo(() => {
        const dbItems = config?.industries?.items;
        if (!dbItems || dbItems.length === 0) return industries;
        // Start with DB items (merged with hardcoded data)
        const merged = dbItems.map(dbInd => {
            const base = industries.find(i => i.id === dbInd.id);
            return base ? { ...base, ...dbInd } : dbInd;
        });
        // Append any hardcoded industries missing from DB
        industries.forEach(ind => {
            if (!merged.find(m => m.id === ind.id)) merged.push(ind);
        });
        return merged;
    }, [config]);

    // Auto-scroll logic for industry tabs
    useEffect(() => {
        if (industryScrollRef.current && window.innerWidth < 1024) {
            const activeTab = Array.from(industryScrollRef.current.children).find(
                child => allIndustries.find(ind => ind.id === activeIndustry)?.title === child.textContent
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

    // Auto-autoplay loop for industry tabs (all screen sizes, no progress bar)
    useEffect(() => {
        const duration = 4000;
        const timer = setTimeout(() => {
            setActiveIndustry(prev => {
                const currentIndex = allIndustries.findIndex(ind => ind.id === prev);
                const nextIndex = (currentIndex + 1) % allIndustries.length;
                return allIndustries[nextIndex].id;
            });
        }, duration);
        return () => clearTimeout(timer);
    }, [activeIndustry, allIndustries]);

    useEffect(() => {
        fetchConfig();
        fetchPlans();
        fetchPublicSettings();
        fetchMetaRates();
    }, []);

    // Update SEO Meta
    useEffect(() => {
        if (config?.seo) {
            document.title = config.seo.title || publicSettings?.appName || config?.brand?.name || 'Bluetick';
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
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/landing`);
            setConfig(res.data);
        } catch (err) {
            console.error(err);
            setError(true);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/plans/public`);
            setPlans(res.data);
        } catch (err) {
            console.error('Failed to fetch plans', err);
        }
    };

    const fetchMetaRates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/plans/meta-rates`);
            setMetaRates(res.data);
        } catch (err) {
            console.error('Failed to fetch meta rates', err);
        }
    };

    const fetchPublicSettings = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings/public`);
            setPublicSettings(res.data);
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

                <LazyMotion features={domAnimation}>
                    {/* 1. NAVBAR */}
                    <PublicHeader />

                    {/* 2. HERO SECTION */}
                    <section className="relative pt-24 pb-7 sm:pb-20 md:pt-32 md:pb-24 px-4 md:px-6 overflow-hidden">

                        <div className="max-w-7xl mx-auto">
                            {config.hero.layout === 'type2' ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
                                        <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20 mb-6 flex items-center gap-2">
                                            <Star className="w-3.5 h-3.5" />  Next-Gen AI  Powered Platform
                                        </span>
                                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900 dark:text-white whitespace-pre-line">
                                            {config.hero.title}
                                        </h1>
                                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 leading-relaxed font-medium">
                                            {config.hero.subtitle}
                                        </p>

                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                                            <Link to={config.hero.ctaLink || '/register'} className="w-full sm:w-auto px-4 md:px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2">
                                                {config.hero.ctaText || 'Start Free Trial'} <ArrowRight className="w-5 h-5" />
                                            </Link>
                                            <a href="#platform" className="w-full sm:w-auto px-4 md:px-10 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                <Play className="w-5 h-5 fill-current" /> See how it works
                                            </a>
                                        </div>
                                    </motion.div>

                                    {(config.hero.imageType2 || config.hero.image) && (
                                        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 1 }} className="mt-16 w-full relative z-10">
                                            <div className={`relative ${(config.hero.imageType2 || config.hero.image).toLowerCase().includes('.png') ? '' : 'rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl shadow-indigo-500/10'}`}>
                                                <img loading="lazy" src={config.hero.imageType2 || config.hero.image} alt="Platform Preview" className={`w-full h-auto block ${(config.hero.imageType2 || config.hero.image).toLowerCase().includes('.png') ? 'object-contain' : 'object-cover'}`} />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                                    {/* Left Content */}
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center lg:text-left z-10 lg:col-span-6">
                                        <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20 mb-6 flex items-center gap-2 max-w-fit mx-auto lg:mx-0">
                                            <Star className="w-3.5 h-3.5" /> Next-Gen AI    Powered Platform
                                        </span>
                                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900 dark:text-white whitespace-pre-line">
                                            {config.hero.title}
                                        </h1>
                                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium">
                                            {config.hero.subtitle}
                                        </p>

                                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                            <Link to={config.hero.ctaLink || '/register'} className="w-full sm:w-auto px-4 md:px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2">
                                                {config.hero.ctaText || 'Start Free Trial'} <ArrowRight className="w-5 h-5" />
                                            </Link>
                                            <a href="#platform" className="w-full sm:w-auto px-4 md:px-8 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                <Play className="w-5 h-5 fill-current" /> See how it works
                                            </a>
                                        </div>
                                    </motion.div>

                                    {/* Right Mock UI */}
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 1 }} className="relative hidden lg:block lg:col-span-6">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-2xl rounded-full" />
                                        {(config.hero.imageType1 || config.hero.image) ? (
                                            <div className={`relative ml-auto mr-0 xl:mr-10 ${(config.hero.imageType1 || config.hero.image).toLowerCase().includes('.png') ? '' : 'rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl shadow-indigo-500/10'}`}>
                                                <img loading="lazy" src={config.hero.imageType1 || config.hero.image} alt="Platform Preview" className={`w-full h-auto block ${(config.hero.imageType1 || config.hero.image).toLowerCase().includes('.png') ? 'object-contain' : 'object-cover'}`} />
                                            </div>
                                        ) : (
                                            <div className="relative mx-auto w-[340px] max-w-full h-[680px] bg-slate-900 dark:bg-[#0A0A0A] rounded-[3rem] border-[8px] border-slate-800 shadow-2xl p-4 overflow-hidden flex flex-col transition-colors ml-auto mr-0 xl:mr-10">
                                                {/* Phone Header */}
                                                <div className="flex items-center gap-3 pb-4 border-b border-white/10 px-2 mt-4">
                                                    {(publicSettings?.logoUrl || config.brand?.logo) ? (
                                                        <img loading="lazy" src={publicSettings?.logoUrl || config.brand.logo} alt={publicSettings?.appName || config.brand.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-white p-1" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                                            <MessageSquare className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}
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
                                        )}
                                    </motion.div>
                                </div>
                            )}
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
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
                                        <div className="font-extrabold text-lg md:text-xl text-slate-900 dark:text-white leading-tight md:whitespace-nowrap">Meta Business Tech Provider</div>
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
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] max-w-full h-[400px] bg-indigo-400/5 dark:bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" style={{ transform: 'translateX(-50%) translateZ(0)' }} />

                        <div className="max-w-7xl mx-auto px-4 md:px-6">
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

                            {/* Two-column layout: Feature tabs left, Live preview right */}
                            <AdvancedFeaturesShowcase config={config?.advancedFeatures} />
                        </div>
                    </section>


                    <section id="solutions" className="py-24 bg-slate-50 dark:bg-[#05050A] transition-colors overflow-hidden">
                        <div className="max-w-7xl mx-auto px-4 md:px-6">
                            <div className="text-center mb-12 md:mb-16">
                                <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold mb-4 text-slate-900 dark:text-white tracking-tight leading-tight">{config.industries?.title || 'Built for every industry'}</h2>
                                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">{config.industries?.subtitle || 'See how leading verticals leverage WhatsApp to cut costs and drive unprecedented revenue.'}</p>
                            </div>

                            {/* Desktop: 3-col grid (left tabs 1-8 | detail panel | right tabs 9-16). Mobile: single horizontal scroll + detail panel */}
                            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">

                                {/* LEFT: Industries 1-8 — vertical tab list on desktop, part of horizontal scroll on mobile */}
                                <div
                                    ref={industryScrollRef}
                                    className="lg:col-span-3 w-full flex lg:flex-col flex-row gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 hide-scrollbar scroll-smooth"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {allIndustries.slice(0, 8).map((ind) => {
                                        const defaults = INDUSTRY_DEFAULTS[ind.id] || {};
                                        const Icon = defaults.icon || ind.icon || ShoppingCart;
                                        const isActive = activeIndustry === ind.id;
                                        return (
                                            <button
                                                key={ind.id}
                                                onClick={() => setActiveIndustry(ind.id)}
                                                className={`relative p-3 rounded-2xl flex items-center gap-2.5 text-left font-semibold text-sm shrink-0 lg:shrink-1 whitespace-nowrap lg:whitespace-normal border overflow-hidden transition-colors duration-200 ${isActive
                                                    ? 'text-white border-transparent shadow-lg shadow-indigo-500/25'
                                                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-100 dark:border-white/5'
                                                    }`}
                                            >
                                                {isActive && (
                                                    <motion.span
                                                        layoutId="industryActivePill"
                                                        className="absolute inset-0 bg-indigo-600 rounded-2xl z-0"
                                                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                                    />
                                                )}
                                                <Icon className={`relative z-10 w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                                <span className="relative z-10">{ind.title}</span>
                                            </button>
                                        );
                                    })}
                                    {/* Mobile only: industries 9-16 in the same horizontal scroll row */}
                                    {allIndustries.slice(8).map((ind) => {
                                        const defaults = INDUSTRY_DEFAULTS[ind.id] || {};
                                        const Icon = defaults.icon || ind.icon || ShoppingCart;
                                        const isActive = activeIndustry === ind.id;
                                        return (
                                            <button
                                                key={`mob-${ind.id}`}
                                                onClick={() => setActiveIndustry(ind.id)}
                                                className={`lg:hidden relative p-3 rounded-2xl flex items-center gap-2.5 text-left font-semibold text-sm shrink-0 whitespace-nowrap border overflow-hidden transition-colors duration-200 ${isActive
                                                    ? 'text-white border-transparent shadow-lg shadow-indigo-500/25'
                                                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-100 dark:border-white/5'
                                                    }`}
                                            >
                                                {isActive && (
                                                    <motion.span
                                                        layoutId="industryActivePill"
                                                        className="absolute inset-0 bg-indigo-600 rounded-2xl z-0"
                                                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                                    />
                                                )}
                                                <Icon className={`relative z-10 w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                                <span className="relative z-10">{ind.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* CENTER: Detail panel */}
                                <div className="lg:col-span-6">
                                    <AnimatePresence mode="wait">
                                        {allIndustries.map(ind => {
                                            const defaults = INDUSTRY_DEFAULTS[ind.id] || {};
                                            return ind.id === activeIndustry && (
                                                <motion.div
                                                    key={ind.id}
                                                    initial={{ opacity: 0, y: 16 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -16 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-4 md:p-8 shadow-xl flex flex-col"
                                                >
                                                    <div className="flex items-center gap-3 mb-4">
                                                        {(() => { const DIcon = (INDUSTRY_DEFAULTS[ind.id] || {}).icon || ind.icon || ShoppingCart; return <div className={`w-10 h-10 rounded-2xl ${(INDUSTRY_DEFAULTS[ind.id] || {}).imagePattern || 'bg-indigo-500'} flex items-center justify-center`}><DIcon className="w-5 h-5 text-white" /></div>; })()}
                                                        <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">{ind.title}</h3>
                                                    </div>
                                                    <p className="text-base text-slate-600 dark:text-slate-400 font-medium mb-6 leading-relaxed">
                                                        {ind.desc}
                                                    </p>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                                        {(Array.isArray(ind.metrics) ? ind.metrics : []).map((m, i) => (
                                                            <div key={i} className="bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-2">
                                                                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{m}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {ind.image ? (
                                                        <div className="w-full rounded-2xl overflow-hidden">
                                                            <img loading="lazy" src={ind.image} alt={ind.title} className="w-full h-auto object-contain rounded-2xl" />
                                                        </div>
                                                    ) : (
                                                        <div className={`w-full h-36 md:h-48 rounded-2xl ${(INDUSTRY_DEFAULTS[ind.id] || {}).imagePattern || 'bg-indigo-500'} opacity-15 dark:opacity-10`} />
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>

                                {/* RIGHT: Industries 9-16 — same vertical tab list, desktop only */}
                                <div className="hidden lg:flex lg:col-span-3 flex-col gap-2">
                                    {allIndustries.slice(8).map((ind) => {
                                        const defaults = INDUSTRY_DEFAULTS[ind.id] || {};
                                        const Icon = defaults.icon || ind.icon || ShoppingCart;
                                        const isActive = activeIndustry === ind.id;
                                        return (
                                            <button
                                                key={`right-${ind.id}`}
                                                onClick={() => setActiveIndustry(ind.id)}
                                                className={`relative p-3 rounded-2xl flex items-center gap-2.5 text-left font-semibold text-sm border overflow-hidden transition-colors duration-200 ${isActive
                                                    ? 'text-white border-transparent shadow-lg shadow-indigo-500/25'
                                                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-100 dark:border-white/5'
                                                    }`}
                                            >
                                                {isActive && (
                                                    <motion.span
                                                        layoutId="industryActivePillR"
                                                        className="absolute inset-0 bg-indigo-600 rounded-2xl z-0"
                                                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                                    />
                                                )}
                                                <Icon className={`relative z-10 w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                                <span className="relative z-10">{ind.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </section>



                    <AddonMarketplaceShowcase />

                    {/* 8. INTEGRATIONS */}
                    <section id="integrations" className="py-20 bg-white dark:bg-zinc-950 relative overflow-hidden">
                        {/* Subtle bg texture */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(99,102,241,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(99,102,241,0.12),transparent)] pointer-events-none" />

                        <div className="max-w-7xl mx-auto px-4 md:px-6">
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

                                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
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

                            <div className="max-w-6xl mx-auto px-4 md:px-6">
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
                                                    className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/8 rounded-2xl p-4 md:p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
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
                            <div className="max-w-7xl mx-auto px-4 md:px-6">
                                <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center mb-16">Loved by go-to-market teams</h2>
                                <TestimonialSlider testimonials={config.testimonials} />
                            </div>
                        </section>
                    )}


                    {/* 11. PRICING */}
                    {plans.length > 0 && (
                        <section id="pricing" className="py-24 relative bg-white dark:bg-zinc-950 transition-colors">
                            <div className="max-w-[100rem] mx-auto px-4 md:px-6">
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
                                                className={`relative flex items-center justify-center px-6 sm:px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 min-w-[90px] sm:min-w-[110px] ${billingInterval === 'monthly'
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                <span className="font-extrabold text-[14px] sm:text-[15px] tracking-tight">Monthly</span>
                                            </button>
                                        )}
                                        {hasHalfYearly && (
                                            <button
                                                onClick={() => setBillingInterval('half-yearly')}
                                                className={`relative flex items-center justify-center px-6 sm:px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 min-w-[90px] sm:min-w-[110px] ${billingInterval === 'half-yearly'
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                <span className="font-extrabold text-[14px] sm:text-[15px] tracking-tight">Half-Yearly</span>
                                                {maxHalfYearlySavings > 0 && (
                                                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] whitespace-nowrap font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/20 shadow-sm ${billingInterval === 'half-yearly'
                                                        ? 'bg-indigo-200 text-indigo-900'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800/50'
                                                        }`}>
                                                        Save {maxHalfYearlySavings}%
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                        {hasYearly && (
                                            <button
                                                onClick={() => setBillingInterval('yearly')}
                                                className={`relative flex items-center justify-center px-6 sm:px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 min-w-[90px] sm:min-w-[110px] ${billingInterval === 'yearly'
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                <span className="font-extrabold text-[14px] sm:text-[15px] tracking-tight">Yearly</span>
                                                {maxYearlySavings > 0 && (
                                                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] whitespace-nowrap font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/20 shadow-md ${billingInterval === 'yearly'
                                                        ? 'bg-indigo-200 text-indigo-900'
                                                        : 'bg-emerald-500 text-white dark:bg-emerald-600 shadow-emerald-500/30 dark:border-emerald-500/30'
                                                        }`}>
                                                        Save {maxYearlySavings}%
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>


                                {/* Mobile Swipe Hint */}
                                {plans.length > 1 && (
                                    <div className="md:hidden flex items-center justify-center mb-4 px-2">
                                        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <ArrowRight className="w-4 h-4 animate-pulse text-indigo-500" /> Swipe to view other plans
                                        </div>
                                    </div>
                                )}

                                {/* Slider Wrapper */}
                                <div className="relative w-full mx-auto">
                                    {/* Sticky Vertical Center Arrows for Mobile */}
                                    {plans.length > 1 && (
                                        <div className="absolute inset-x-0 top-[10%] bottom-[10%] pointer-events-none z-30">
                                            <div className="md:hidden sticky top-[50vh] flex justify-between w-full -translate-y-1/2">
                                                <button
                                                    onClick={() => document.getElementById('pricing-slider').scrollBy({ left: -300, behavior: 'smooth' })}
                                                    className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(0,0,0,0.5)] max-w-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-200/50 dark:border-white/10 -ml-5 active:scale-95 transition-transform"
                                                >
                                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => document.getElementById('pricing-slider').scrollBy({ left: 300, behavior: 'smooth' })}
                                                    className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(0,0,0,0.5)] max-w-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-200/50 dark:border-white/10 -mr-5 active:scale-95 transition-transform"
                                                >
                                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        id="pricing-slider"
                                        className="flex md:flex-wrap md:justify-center gap-6 md:gap-8 items-stretch overflow-x-auto pt-8 pb-6 snap-x snap-mandatory"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    >
                                        <style>{`#pricing-slider::-webkit-scrollbar { display: none; }`}</style>
                                        {plans.map((plan, i) => {
                                            const isPopular = plan.isPopular;

                                            const themeColors = {
                                                blue: {
                                                    bgPop: 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 shadow-xl shadow-blue-500/10 text-slate-900 dark:text-white transform md:-translate-y-4',
                                                    bgReg: 'bg-blue-50/10 dark:bg-blue-950/5 border-blue-200/90 dark:border-blue-900/60 text-slate-900 dark:text-white hover:shadow-xl hover:border-blue-500/40',
                                                    badgePop: 'bg-blue-500 text-white',
                                                    textSubtlePop: 'text-slate-500 dark:text-slate-400',
                                                    lineThroughPop: 'text-slate-400 dark:text-slate-500',
                                                    checkPop: 'bg-emerald-500 text-white',
                                                    checkSubtle: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
                                                    btnSubtlePop: 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
                                                    btnSubtleReg: 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
                                                    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                                                },
                                                green: {
                                                    bgPop: 'bg-green-50 dark:bg-green-900/20 border-green-400 shadow-xl shadow-green-500/10 text-slate-900 dark:text-white transform md:-translate-y-4',
                                                    bgReg: 'bg-green-50/10 dark:bg-green-950/5 border-green-200/90 dark:border-green-900/60 text-slate-900 dark:text-white hover:shadow-xl hover:border-green-500/40',
                                                    badgePop: 'bg-green-500 text-white',
                                                    textSubtlePop: 'text-slate-500 dark:text-slate-400',
                                                    lineThroughPop: 'text-slate-400 dark:text-slate-500',
                                                    checkPop: 'bg-emerald-500 text-white',
                                                    checkSubtle: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
                                                    btnSubtlePop: 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
                                                    btnSubtleReg: 'bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/50',
                                                    btnPrimary: 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25'
                                                },
                                                amber: {
                                                    bgPop: 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 shadow-xl shadow-amber-500/10 text-slate-900 dark:text-white transform md:-translate-y-4',
                                                    bgReg: 'bg-amber-50/10 dark:bg-amber-950/5 border-amber-200/90 dark:border-amber-900/60 text-slate-900 dark:text-white hover:shadow-xl hover:border-amber-500/40',
                                                    badgePop: 'bg-amber-500 text-white',
                                                    textSubtlePop: 'text-slate-500 dark:text-slate-400',
                                                    lineThroughPop: 'text-slate-400 dark:text-slate-500',
                                                    checkPop: 'bg-emerald-500 text-white',
                                                    checkSubtle: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
                                                    btnSubtlePop: 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
                                                    btnSubtleReg: 'bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50',
                                                    btnPrimary: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25'
                                                },
                                                emerald: {
                                                    bgPop: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 shadow-xl shadow-emerald-500/10 text-slate-900 dark:text-white transform md:-translate-y-4',
                                                    bgReg: 'bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-200/90 dark:border-emerald-900/60 text-slate-900 dark:text-white hover:shadow-xl hover:border-emerald-500/40',
                                                    badgePop: 'bg-emerald-500 text-white',
                                                    textSubtlePop: 'text-slate-500 dark:text-slate-400',
                                                    lineThroughPop: 'text-slate-400 dark:text-slate-500',
                                                    checkPop: 'bg-emerald-500 text-white',
                                                    checkSubtle: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
                                                    btnSubtlePop: 'bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
                                                    btnSubtleReg: 'bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50',
                                                    btnPrimary: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                },
                                                purple: {
                                                    bgPop: 'bg-purple-50 dark:bg-purple-900/20 border-purple-400 shadow-xl shadow-purple-500/10 text-slate-900 dark:text-white transform md:-translate-y-4',
                                                    bgReg: 'bg-purple-50/10 dark:bg-purple-950/5 border-purple-200/90 dark:border-purple-900/60 text-slate-900 dark:text-white hover:shadow-xl hover:border-purple-500/40',
                                                    badgePop: 'bg-purple-500 text-white',
                                                    textSubtlePop: 'text-slate-500 dark:text-slate-400',
                                                    lineThroughPop: 'text-slate-400 dark:text-slate-500',
                                                    checkPop: 'bg-emerald-500 text-white',
                                                    checkSubtle: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
                                                    btnSubtlePop: 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
                                                    btnSubtleReg: 'bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50',
                                                    btnPrimary: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25'
                                                }
                                            };
                                            const theme = themeColors[plan.color] || themeColors.blue;

                                            // Determine Display Price
                                            let displayPrice = parseFloat(plan.price);
                                            let displayInterval = 'mo';
                                            let internalIntervalCode = 'month';
                                            let originalPrice = null;

                                            if (billingInterval === 'monthly' && parseFloat(plan.monthlyPrice) > 0) {
                                                displayPrice = parseFloat(plan.monthlyPrice);
                                                displayInterval = 'mo';
                                                internalIntervalCode = 'month';
                                            } else if (billingInterval === 'half-yearly' && parseFloat(plan.halfYearlyPrice) > 0) {
                                                displayPrice = parseFloat(plan.halfYearlyPrice);
                                                displayInterval = '6mo';
                                                internalIntervalCode = 'half-year';
                                                originalPrice = (parseFloat(plan.monthlyPrice) || 0) * 6;
                                            } else if (billingInterval === 'yearly' && parseFloat(plan.yearlyPrice) > 0) {
                                                displayPrice = parseFloat(plan.yearlyPrice);
                                                displayInterval = 'yr';
                                                internalIntervalCode = 'year';
                                                originalPrice = (parseFloat(plan.monthlyPrice) || 0) * 12;
                                            }

                                            const planCurrencySymbol = plan.currency ? (CURRENCY_SYMBOLS[plan.currency] || plan.currency) : currencySymbol;

                                            return (
                                                <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                                    className={`relative w-[85vw] sm:w-[300px] lg:w-auto lg:flex-1 lg:min-w-[260px] lg:max-w-[320px] shrink-0 snap-center p-5 lg:p-6 rounded-[2rem] border flex flex-col h-auto min-h-full transition-all ${isPopular ? theme.bgPop : theme.bgReg}`}
                                                >
                                                    {isPopular && (
                                                         <div className="absolute top-0 right-6 px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[9px] uppercase tracking-widest font-bold rounded-b-xl shadow-lg shadow-indigo-500/10 border-b border-x border-indigo-400/30 whitespace-nowrap z-10">
                                                             MOST POPULAR
                                                         </div>
                                                     )}
                                                    {plan.trialDays > 0 && (
                                                         <div className="absolute top-0 left-6 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[9px] uppercase tracking-widest font-bold rounded-b-xl shadow-lg shadow-emerald-500/10 border-b border-x border-emerald-400/30 whitespace-nowrap z-10 flex items-center gap-1.5">
                                                             <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                                                             {plan.trialDays}-Day Trial
                                                         </div>
                                                     )}

                                                    <h3 className="text-xl font-bold mb-2 pt-2">{plan.name}</h3>
                                                    <p className="text-xs mb-6 font-medium text-slate-500 dark:text-slate-400">{plan.description || 'Perfect for growing businesses.'}</p>

                                                    <div className="flex flex-col gap-1 mb-2 pb-10 border-b border-indigo-500/20 dark:border-white/10">
                                                        {originalPrice > displayPrice && (
                                                            <span className="text-lg font-bold line-through text-slate-400 dark:text-slate-500">
                                                                {planCurrencySymbol}{originalPrice.toLocaleString()}
                                                            </span>
                                                        )}
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-4xl font-extrabold">{planCurrencySymbol}{displayPrice.toLocaleString()}</span>
                                                            <span className="font-bold text-slate-500 dark:text-slate-400">
                                                                /{displayInterval}
                                                                {plan.taxEnabled && <span className="text-[10px] ml-1 font-semibold opacity-70">({plan.taxText})</span>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {plan.trialDays > 0 && (
                                                        <p className="text-xs font-semibold mb-6 -mt-7 text-slate-500 dark:text-slate-400">
                                                            🎉 Try free for {plan.trialDays} days — no credit card required
                                                        </p>
                                                    )}

                                                    <div className="space-y-5 mb-8 flex-1">
                                                        {/* Meta Message Pricing Box */}
                                                        {metaRates && (
                                                            <div className="mb-6 relative rounded-xl bg-gradient-to-br from-emerald-50/10 to-green-50/5 dark:from-emerald-950/5 dark:to-green-950/5 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm">
                                                                {/* Decorative subtle glows in a clipped wrapper */}
                                                                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                                                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
                                                                </div>
                                                                
                                                                <div className="relative p-4">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Template Rates</h4>
                                                                        </div>
                                                                        <div className="relative flex items-center justify-center group z-[100]">
                                                                            <Info className="w-4 h-4 text-slate-400 hover:text-[#0088cc] transition-colors cursor-help" />
                                                                            <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] leading-relaxed font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none">
                                                                                These are the official WhatsApp message rates charged directly by Meta. The rates shown are for {metaRates.country} and vary based on your recipient's country.
                                                                                <div className="absolute -bottom-1 right-2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-2 text-xs font-semibold relative z-10">
                                                                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                                                                            <span className="text-slate-500 dark:text-slate-400">Marketing</span>
                                                                            <span className="text-slate-900 dark:text-white">{metaRates.symbol}{metaRates.rates.marketing}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                                                                            <span className="text-slate-500 dark:text-slate-400">Utility</span>
                                                                            <span className="text-slate-900 dark:text-white">{metaRates.symbol}{metaRates.rates.utility}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                                                                            <span className="text-slate-500 dark:text-slate-400">Authentication</span>
                                                                            <span className="text-slate-900 dark:text-white">{metaRates.symbol}{metaRates.rates.authentication}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center pt-0.5">
                                                                            <span className="text-emerald-600 dark:text-emerald-400">Service</span>
                                                                            <span className="text-emerald-500">{metaRates.rates.service}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Core Limits */}
                                                        <div>
                                                            <div className="font-bold text-[10px] tracking-widest uppercase mb-3 text-slate-400">Core</div>
                                                            <ul className="space-y-3">
                                                                <li className="flex items-center gap-3 text-sm font-semibold">
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                    <span>{plan.messageLimit === -1 ? 'Unlimited' : plan.messageLimit.toLocaleString()} Messages/mo</span>
                                                                </li>
                                                                <li className="flex items-center gap-3 text-sm font-semibold">
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                    <span>{plan.contactLimit === -1 ? 'Unlimited' : plan.contactLimit.toLocaleString()} Contacts</span>
                                                                </li>
                                                                {(plan.templateLimit > 0 || plan.templateLimit === -1) && (
                                                                    <li className="flex items-center gap-3 text-sm font-semibold">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                        <span>{plan.templateLimit === -1 ? 'Unlimited' : plan.templateLimit} Message Templates</span>
                                                                    </li>
                                                                )}
                                                                {(plan.teamMemberLimit > 0 || plan.teamMemberLimit === -1) && (
                                                                    <li className="flex items-center gap-3 text-sm font-semibold">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                        <span>{plan.teamMemberLimit === -1 ? 'Unlimited' : plan.teamMemberLimit} Team Members</span>
                                                                    </li>
                                                                )}
                                                                {plan.vcardLimit > 0 || plan.vcardLimit === -1 ? (
                                                                    <li className="flex items-center gap-3 text-sm font-semibold">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                        <span>{plan.vcardLimit === -1 ? 'Unlimited' : plan.vcardLimit} VeCards</span>
                                                                    </li>
                                                                ) : (
                                                                    <li className="flex items-center gap-3 text-sm font-semibold opacity-70">
                                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"><X className="w-3 h-3" /></div>
                                                                        <span className="text-slate-900 dark:text-white">VeCards</span>
                                                                    </li>
                                                                )}
                                                                {plan.waStoreLimit > 0 || plan.waStoreLimit === -1 ? (
                                                                    <li className="flex items-center gap-3 text-sm font-semibold">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                        <span>{plan.waStoreLimit === -1 ? 'Unlimited' : plan.waStoreLimit} Online Stores</span>
                                                                    </li>
                                                                ) : (
                                                                    <li className="flex items-center gap-3 text-sm font-semibold opacity-70">
                                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"><X className="w-3 h-3" /></div>
                                                                        <span className="text-slate-900 dark:text-white">Online Stores</span>
                                                                    </li>
                                                                )}
                                                                <li className={`flex items-center gap-3 text-sm font-semibold ${!plan.flowBotEnabled ? 'opacity-70' : ''}`}>
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.flowBotEnabled ? theme.checkSubtle : 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'}`}>
                                                                        {plan.flowBotEnabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                                    </div>
                                                                    <span className={!plan.flowBotEnabled ? "text-slate-900 dark:text-white" : ""}>AI FlowBot Builder</span>
                                                                </li>
                                                                <li className={`flex items-center gap-3 text-sm font-semibold ${!plan.allowCtwaAnalytics ? 'opacity-70' : ''}`}>
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.allowCtwaAnalytics ? theme.checkSubtle : 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'}`}>
                                                                        {plan.allowCtwaAnalytics ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                                    </div>
                                                                    <span className={!plan.allowCtwaAnalytics ? "text-slate-900 dark:text-white" : ""}>Click to WhatsApp Ads</span>
                                                                </li>
                                                                <li className={`flex items-center gap-3 text-sm font-semibold ${!plan.allowMetaAds ? 'opacity-70' : ''}`}>
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.allowMetaAds ? theme.checkSubtle : 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'}`}>
                                                                        {plan.allowMetaAds ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                                    </div>
                                                                    <span className={!plan.allowMetaAds ? "text-slate-900 dark:text-white" : ""}>Meta Ads Marketing</span>
                                                                </li>
                                                            </ul>
                                                        </div>

                                                        {/* Capabilities */}
                                                        {(plan.allowApiAccess || plan.aiTokensAllowance > 0 || plan.aiTokensAllowance === -1 || (Array.isArray(plan.includedAddons) && plan.includedAddons.length > 0)) && (
                                                            <div>
                                                                <div className="font-bold text-[10px] tracking-widest uppercase mb-3 text-slate-400">Add-ons</div>
                                                                <ul className="space-y-3">
                                                                    <li className={`flex items-center gap-3 text-sm font-semibold ${!plan.allowApiAccess ? 'opacity-70' : ''}`}>
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.allowApiAccess ? theme.checkSubtle : 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'}`}>
                                                                            {plan.allowApiAccess ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                                        </div>
                                                                        <span className={!plan.allowApiAccess ? "text-slate-900 dark:text-white" : ""}>Developer API Access</span>
                                                                    </li>

                                                                    {(plan.aiTokensAllowance > 0 || plan.aiTokensAllowance === -1) && (
                                                                        <li className="flex items-center gap-3 text-sm font-semibold">
                                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                            <span>{plan.aiTokensAllowance === -1 ? 'Unlimited' : plan.aiTokensAllowance.toLocaleString()} AI Tokens Included</span>
                                                                        </li>
                                                                    )}
                                                                    {Array.isArray(plan.includedAddons) && plan.includedAddons.length > 0 && (
                                                                        <li className="flex items-start gap-3 text-sm font-semibold">
                                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                            <div className="flex flex-col">
                                                                                <span>{plan.includedAddons.length} Add-on{plan.includedAddons.length > 1 ? 's' : ''} Included</span>
                                                                                <ul className="mt-2 space-y-1.5">
                                                                                    {plan.includedAddons.map(addonKey => (
                                                                                        <li key={addonKey} className="text-xs font-semibold flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
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
                                                        <div>
                                                            <div className="font-bold text-[10px] tracking-widest uppercase mb-3 text-slate-400">Features</div>
                                                            <ul className="space-y-3">
                                                                {(plan.quickReplyLimit > 0 || plan.quickReplyLimit === -1) && (
                                                                    <li className="flex items-center gap-3 text-sm font-semibold">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                        <span>{plan.quickReplyLimit === -1 ? 'Unlimited' : plan.quickReplyLimit} Quick Replies</span>
                                                                    </li>
                                                                )}
                                                                {(plan.tagLimit > 0 || plan.tagLimit === -1) && (
                                                                    <li className="flex items-center gap-3 text-sm font-semibold">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                        <span>{plan.tagLimit === -1 ? 'Unlimited' : plan.tagLimit} Contact Tags</span>
                                                                    </li>
                                                                )}
                                                                {(plan.groupLimit > 0 || plan.groupLimit === -1) && (
                                                                    <li className="flex items-center gap-3 text-sm font-semibold">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                        <span>{plan.groupLimit === -1 ? 'Unlimited' : plan.groupLimit} Contact Groups</span>
                                                                    </li>
                                                                )}
                                                                {Array.isArray(plan.features) && plan.features.map((feat, fi) => (
                                                                    <li key={fi} className="flex items-start gap-3 text-sm font-semibold">
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${theme.checkSubtle}`}><Check className="w-3 h-3" /></div>
                                                                        <span className="leading-tight">{feat}</span>
                                                                    </li>
                                                                ))}
                                                                {Array.isArray(plan.coreFeatures) && plan.coreFeatures.map((feat, fi) => (
                                                                    <li key={`core-${fi}`} className={`flex items-start gap-3 text-sm font-semibold ${(!feat.qty || feat.qty === '0') ? 'opacity-50 grayscale' : ''}`}>
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${(!feat.qty || feat.qty === '0') ? 'bg-red-500 text-white' : theme.checkSubtle}`}>
                                                                            {(!feat.qty || feat.qty === '0') ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                                        </div>
                                                                        <span className="leading-tight">
                                                                            {feat.qty && feat.qty !== '0' && <span className="font-extrabold mr-1">{feat.qty}</span>}
                                                                            {feat.name}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>


                                                    {plan.trialDays > 0 ? (
                                                        <div className="flex flex-col gap-2 mt-auto">
                                                            <Link
                                                                to={`/register?plan=${plan.id}&interval=${internalIntervalCode}`}
                                                                className={`w-full py-4 rounded-xl font-bold text-center transition-all text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20`}
                                                            >
                                                                Choose {plan.name} — {currencySymbol}{displayPrice.toLocaleString()}/{displayInterval}
                                                            </Link>
                                                            <Link
                                                                to={`/register?plan=${plan.id}&trial=true`}
                                                                className={`w-full py-3 rounded-xl font-bold text-center text-xs transition-all border shadow-sm bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50`}
                                                            >
                                                                🎉 Try {plan.trialDays} days free trial
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        <Link to={`/register?plan=${plan.id}&interval=${internalIntervalCode}`} className={`w-full py-4 rounded-xl font-bold text-center transition-all mt-auto bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20`}>
                                                            Choose {plan.name}
                                                        </Link>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 13. FAQ Section */}
                    {config.faqs && config.faqs.length > 0 && (
                        <FAQSection faqs={config.faqs} />
                    )}

                    {/* 14. CTA & PARTNER ECOSYSTEM */}
                    <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-4 md:px-6 relative z-10 bg-white dark:bg-[#05050A] overflow-hidden">
                        {/* Background Gradients */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] max-w-full h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" style={{ transform: 'translate(-50%, -50%) translateZ(0)' }} />

                        <div className="max-w-7xl mx-auto">

                            {/* Main CTA Block */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                className="rounded-[1.75rem] sm:rounded-[2.5rem] md:rounded-[3rem] overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 relative border border-indigo-500/50 shadow-2xl shadow-indigo-500/20 mb-12"
                            >
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] pointer-events-none" />
                                <div className="absolute -top-24 -right-24 w-96 max-w-full h-96 bg-white/20 rounded-full blur-2xl pointer-events-none" style={{ transform: 'translateZ(0)' }} />
                                <div className="absolute -bottom-24 -left-24 w-96 max-w-full h-96 bg-purple-500/40 rounded-full blur-2xl pointer-events-none" style={{ transform: 'translateZ(0)' }} />

                                <div className="relative py-12 px-4 sm:py-16 sm:px-8 md:py-20 md:px-20 text-center flex flex-col items-center">
                                    <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 tracking-tight text-white max-w-4xl leading-[1.2] sm:leading-[1.1]">
                                        Become a Partner & Grow with Us
                                    </h2>
                                    <p className="text-indigo-100 text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 font-medium leading-relaxed">
                                        Join our ecosystem as an affiliate or tech partner. Leverage our platform's infrastructure to generate new revenue streams and scale your own business.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 mb-12 sm:mb-16 w-full sm:w-auto px-4 sm:px-0">
                                        <Link to="/partner" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 sm:px-4 md:px-10 sm:py-4 bg-white text-indigo-700 rounded-full font-bold text-base sm:text-lg hover:scale-105 transition-transform shadow-xl shadow-indigo-900/50 w-full sm:w-auto">
                                            View Partner Portal <ArrowRight className="w-5 h-5" />
                                        </Link>
                                    </div>

                                    {/* Modern Minimal Partner Details (Moved Inside) */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                                        className="relative w-full max-w-5xl bg-white/10 backdrop-blur-md border border-white/20 rounded-[1.5rem] sm:rounded-[2rem] p-1.5 sm:p-2 shadow-2xl text-left"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                                            {/* Referral */}
                                            <Link to="/partner" className="p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 group cursor-pointer hover:bg-white/10 rounded-t-[1.25rem] rounded-b-none md:rounded-l-[1.5rem] md:rounded-r-none transition-colors">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                                                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                                                </div>
                                                <div className="flex-1 w-full">
                                                    <div className="flex items-center justify-center sm:justify-between mb-2 gap-2">
                                                        <h4 className="text-lg sm:text-xl font-bold text-white">Referral Program</h4>
                                                        <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-200 group-hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 hidden sm:block" />
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-indigo-100 font-medium leading-relaxed">
                                                        Both you and your referral get <span className="text-emerald-400 font-bold">extra subscription months & AI tokens</span> when they sign up. Dual-sided rewards!
                                                    </p>
                                                </div>
                                            </Link>

                                            {/* Tech Partner */}
                                            <Link to="/partner" className="p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 group cursor-pointer hover:bg-white/10 rounded-b-[1.25rem] rounded-t-none md:rounded-r-[1.5rem] md:rounded-l-none transition-colors">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                                                    <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                                                </div>
                                                <div className="flex-1 w-full">
                                                    <div className="flex items-center justify-center sm:justify-between mb-2 gap-2">
                                                        <h4 className="text-lg sm:text-xl font-bold text-white">Tech Partner</h4>
                                                        <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-200 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 hidden sm:block" />
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-indigo-100 font-medium leading-relaxed">
                                                        Join our Tech Partner program and earn <span className="text-blue-400 font-bold">up to 30% commission</span> with unique tracking links, discount coupons, and dedicated marketing assets.
                                                    </p>
                                                </div>
                                            </Link>
                                        </div>
                                    </motion.div>

                                </div>
                            </motion.div>

                        </div>
                    </section>

                    {/* 14. EXPANDED FOOTER */}
                    <footer className="pt-20 pb-10 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 transition-colors">
                        <div className="max-w-7xl mx-auto px-4 md:px-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
                                <div className="col-span-2 lg:col-span-2 space-y-6">
                                    <div className="flex items-center gap-3 font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
                                        {(publicSettings?.logoUrl || config.brand?.logo) ? (
                                            <img loading="lazy" src={publicSettings?.logoUrl || config.brand.logo} alt={publicSettings?.appName || config.brand.name} className="h-10 object-contain" />
                                        ) : (
                                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                                                <MessageSquare className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                        {publicSettings?.appName || config.brand.name}
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs">
                                        {config.brand.footerText
                                            ? config.brand.footerText.replace(config.brand.name, publicSettings?.appName || config.brand.name)
                                            : 'The operating system for official WhatsApp Business API conversations.'}
                                    </p>
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
                                                <li><Link to="/refund-policy" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Cancellation & Refund Policy</Link></li>
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-500 dark:text-slate-500">
                                <div>
                                    {config.footer?.bottomBarLeft
                                        ? config.footer.bottomBarLeft.replace('{year}', new Date().getFullYear()).replace('{brand}', publicSettings?.appName || config.brand.name).replace(config.brand.name, publicSettings?.appName || config.brand.name)
                                        : `© ${new Date().getFullYear()} ${publicSettings?.appName || config.brand.name}. All rights reserved.`}
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

                    {/* Floating Chatbot */}
                    <FloatingChatbot config={config} />
                </LazyMotion>
            </div>
        </div>
    );
}
