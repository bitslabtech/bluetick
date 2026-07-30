import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Store, Target, QrCode, ArrowUpRight, CheckCircle2, TrendingUp, Sparkles, Send, Phone, Mail, ShoppingCart, ChevronRight, Zap } from 'lucide-react';

const TABS = [
    {
        id: 'whatsapp',
        label: 'WhatsApp API',
        icon: MessageSquare,
        color: 'from-emerald-500 to-teal-600',
        activeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        badge: '98% Open Rate',
    },
    {
        id: 'store',
        label: 'Online Store',
        icon: Store,
        color: 'from-indigo-500 to-purple-600',
        activeColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
        badge: 'Instant Setup',
    },
    {
        id: 'meta',
        label: 'Meta Ads',
        icon: Target,
        color: 'from-blue-500 to-cyan-600',
        activeColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
        badge: '3.8x ROI',
    },
    {
        id: 'vcard',
        label: 'Digital vCards',
        icon: QrCode,
        color: 'from-violet-500 to-fuchsia-600',
        activeColor: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
        badge: 'Smart QR',
    },
];

export default function HeroShowcase() {
    const [activeTab, setActiveTab] = useState(0);
    const [progress, setProgress] = useState(0);

    // Auto-advance tabs every 4 seconds sequentially (0 -> 1 -> 2 -> 3)
    useEffect(() => {
        setProgress(0);
        const startTime = Date.now();
        const duration = 4000; // 4 seconds per tab

        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, (elapsed / duration) * 100);
            setProgress(pct);

            if (elapsed >= duration) {
                clearInterval(timer);
                setActiveTab((prev) => (prev + 1) % TABS.length);
            }
        }, 40);

        return () => clearInterval(timer);
    }, [activeTab]);

    const handleTabClick = (index) => {
        setActiveTab(index);
        setProgress(0);
    };

    return (
        <div className="w-full max-w-xl mx-auto lg:max-w-none">


            {/* Main Blended Showcase Container */}
            <div className="relative rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl shadow-xl overflow-hidden h-[480px] sm:h-[540px]">
                {/* Animated Body Content */}
                <div className="relative w-full h-full p-4 sm:p-6 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {activeTab === 0 && (
                            <motion.div
                                key="whatsapp"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="h-full grid grid-cols-1 sm:grid-cols-12 gap-4 items-center"
                            >
                                {/* Left stats */}
                                <div className="sm:col-span-5 space-y-3 text-left">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                        <Sparkles className="w-3 h-3" /> WhatsApp Business API
                                    </span>
                                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                                        Automate Sales & Support 24/7
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Broadcast promotions, trigger abandoned cart recovery, and handle customer queries automatically.
                                    </p>
                                    <div className="pt-1 flex items-center gap-3">
                                        <div className="text-center bg-slate-100 dark:bg-white/5 p-2 rounded-lg flex-1">
                                            <div className="text-base font-extrabold text-emerald-500">98%</div>
                                            <div className="text-[9px] text-slate-500 font-medium">Open Rate</div>
                                        </div>
                                        <div className="text-center bg-slate-100 dark:bg-white/5 p-2 rounded-lg flex-1">
                                            <div className="text-base font-extrabold text-indigo-500">3x</div>
                                            <div className="text-[9px] text-slate-500 font-medium">Conversions</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Phone Chat Window */}
                                <div className="sm:col-span-7 h-full flex items-center justify-center">
                                    <div className="w-full max-w-[280px] bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden border border-white/10 text-xs">
                                        <div className="bg-[#128C7E] p-3 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">AI</div>
                                            <div>
                                                <div className="font-bold text-[12px]">Bluetick Assistant</div>
                                                <div className="text-[10px] text-emerald-100">Official Business Account</div>
                                            </div>
                                        </div>
                                        <div className="p-3.5 space-y-3 bg-[#0b141a] h-[320px] overflow-y-auto flex flex-col justify-end">
                                            <div className="bg-[#202c33] text-slate-200 p-2.5 rounded-lg rounded-tl-none max-w-[85%] text-[11px]">
                                                Hi Alex! 🛍️ Items in your cart are selling out fast. Use code <span className="text-emerald-400 font-bold">SAVE15</span> for 15% off!
                                            </div>
                                            <div className="bg-[#005c4b] text-white p-2.5 rounded-lg rounded-tr-none max-w-[75%] ml-auto text-[11px]">
                                                Awesome! Claiming my discount now.
                                            </div>
                                            <div className="bg-[#202c33] text-emerald-400 font-bold p-2.5 rounded-lg text-center cursor-pointer text-[11px] border border-emerald-500/30 flex items-center justify-center gap-1">
                                                <span>Complete Order on WhatsApp</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 1 && (
                            <motion.div
                                key="store"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="h-full grid grid-cols-1 sm:grid-cols-12 gap-4 items-center"
                            >
                                <div className="sm:col-span-5 space-y-3 text-left">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                                        <Store className="w-3 h-3" /> Digital Storefront
                                    </span>
                                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                                        Your Brand's Online Store
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Create a high-converting mobile store, sync inventory seamlessly, and collect direct payments.
                                    </p>
                                    <div className="pt-1 flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Zero Commission
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Custom Domain
                                        </div>
                                    </div>
                                </div>

                                <div className="sm:col-span-7 h-full flex items-center justify-center relative">
                                    <div className="w-full max-w-[210px] sm:max-w-[230px] aspect-[792/1708] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-800 dark:border-zinc-700 relative group bg-transparent">
                                        <video
                                            src="/online-store-demo.mp4"
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover rounded-[1.6rem]"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 2 && (
                            <motion.div
                                key="meta"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="h-full grid grid-cols-1 sm:grid-cols-12 gap-4 items-center"
                            >
                                <div className="sm:col-span-5 space-y-3 text-left">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                                        <Target className="w-3 h-3" /> Meta Marketing Ads
                                    </span>
                                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                                        Run FB & Instagram Ads
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Target high-intent shoppers on Meta and direct them straight into WhatsApp or your Storefront.
                                    </p>
                                    <div className="pt-1 flex items-center gap-2">
                                        <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded">
                                            Click-to-WhatsApp Ads
                                        </span>
                                    </div>
                                </div>

                                <div className="sm:col-span-7 h-full flex items-center justify-center relative">
                                    <div className="w-full max-w-[210px] sm:max-w-[230px] aspect-[720/1280] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-800 dark:border-zinc-700 relative group bg-transparent">
                                        <video
                                            src="/ctwa-demo.mp4"
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover rounded-[1.6rem]"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 3 && (
                            <motion.div
                                key="vcard"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="h-full grid grid-cols-1 sm:grid-cols-12 gap-4 items-center"
                            >
                                <div className="sm:col-span-5 space-y-3 text-left">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20">
                                        <QrCode className="w-3 h-3" /> Digital Business Cards
                                    </span>
                                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                                        Smart Digital vCards
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Share your contact info, social handles, and business links instantly via NFC or QR code scan.
                                    </p>
                                    <div className="pt-1 flex items-center gap-2">
                                        <span className="text-xs font-bold text-violet-500 bg-violet-500/10 px-2 py-1 rounded">
                                            Instant Contact Save
                                        </span>
                                    </div>
                                </div>

                                <div className="sm:col-span-7 h-full flex items-center justify-center">
                                    <div className="w-full max-w-[260px] bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-white/10 shadow-xl text-center space-y-3">
                                        <div className="w-16 h-16 rounded-full border-2 border-indigo-400 p-0.5 mx-auto">
                                            <img src="https://i.pravatar.cc/150?img=32" alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-base">Sarah Jenkins</div>
                                            <div className="text-xs text-indigo-300">Founder & CEO</div>
                                        </div>
                                        <div className="flex justify-center gap-2.5 py-1">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Phone className="w-4 h-4 text-white" /></div>
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Mail className="w-4 h-4 text-white" /></div>
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Send className="w-4 h-4 text-white" /></div>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-xl w-20 h-20 mx-auto shadow-md">
                                            <QrCode className="w-full h-full text-slate-900" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Slider Progress Bar & Navigation Dots */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200/50 dark:bg-zinc-800/50 z-20">
                    <div
                        className={`h-full bg-gradient-to-r ${TABS[activeTab].color} transition-all duration-75`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20">
                    {TABS.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleTabClick(idx)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${activeTab === idx ? 'bg-indigo-600 scale-125' : 'bg-slate-300 dark:bg-zinc-600 hover:bg-slate-400 dark:hover:bg-zinc-500'}`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
