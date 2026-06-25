import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, HelpCircle, Store, ArrowRight } from 'lucide-react';
import PublicLayout from './landing/PublicLayout';

export default function StoreNotFound({ slug }) {
    const navigate = useNavigate();

    return (
        <PublicLayout title="Store Not Found" fullWidth={true}>
            <div className="w-full flex flex-col items-center justify-center p-6 bg-white transition-colors duration-300 relative overflow-hidden select-none pt-6 md:pt-32 pb-16 md:pb-24">

            {/* Ambient Background Glow Blobs */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full filter blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center text-center">

                {/* Visual Graphic Centerpiece: Animated Minimalist storefront */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="relative w-48 h-48 flex items-center justify-center mt-8 md:mt-12 mb-8 group"
                >
                    {/* Glowing circular aura */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-rose-500/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />

                    <svg className="w-full h-full text-slate-800" viewBox="0 0 200 200" fill="none">
                        {/* Floor line */}
                        <line x1="20" y1="170" x2="180" y2="170" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-300" />

                        {/* Store main building outline */}
                        <rect x="40" y="90" width="120" height="80" rx="4" stroke="currentColor" strokeWidth="3" fill="none" className="text-slate-400" />

                        {/* Windows inside store */}
                        <line x1="60" y1="125" x2="85" y2="125" stroke="currentColor" strokeWidth="2" className="text-slate-300" />
                        <line x1="60" y1="145" x2="85" y2="145" stroke="currentColor" strokeWidth="2" className="text-slate-300" />
                        <rect x="110" y="110" width="30" height="60" rx="2" stroke="currentColor" strokeWidth="2" fill="none" className="text-slate-300" />
                        <circle cx="132" cy="140" r="2" fill="currentColor" className="text-slate-400" />

                        {/* Interactive Store Awning (Canopy) */}
                        <motion.g
                            whileHover={{ y: -2 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            {/* Awning structure base */}
                            <path d="M30 90 L170 90 L180 65 L20 65 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" className="text-indigo-600" />

                            {/* Alternating Awning Stripes */}
                            <path d="M40 90 L60 90 L65 65 L45 65 Z" fill="currentColor" className="text-indigo-500" />
                            <path d="M80 90 L100 90 L105 65 L85 65 Z" fill="currentColor" className="text-indigo-500" />
                            <path d="M120 90 L140 90 L145 65 L125 65 Z" fill="currentColor" className="text-indigo-500" />
                            <path d="M160 90 L170 90 L175 65 L165 65 Z" fill="currentColor" className="text-indigo-500" />

                            {/* Scalloped edge details */}
                            <path d="M20 90 Q30 98 40 90 Q50 98 60 90 Q70 98 80 90 Q90 98 100 90 Q110 98 120 90 Q130 98 140 90 Q150 98 160 90 Q170 98 180 90" stroke="currentColor" strokeWidth="2" fill="none" className="text-indigo-600" />
                        </motion.g>

                        {/* Swaying Hanging "CLOSED" Sign */}
                        <motion.g
                            animate={{ rotate: [-6, 6, -6] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                            style={{ transformOrigin: "100px 90px" }}
                        >
                            {/* Hanger strings */}
                            <line x1="75" y1="90" x2="75" y2="115" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
                            <line x1="125" y1="90" x2="125" y2="115" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />

                            {/* Sign card */}
                            <rect x="65" y="112" width="70" height="28" rx="4" fill="white" stroke="currentColor" strokeWidth="2" className="stroke-rose-500 shadow-sm" />

                            {/* Closed text */}
                            <text x="100" y="130" textAnchor="middle" fill="currentColor" className="text-rose-600 font-mono font-black text-[10px] tracking-widest select-none">
                                OFFLINE
                            </text>
                        </motion.g>

                        {/* Blinking Sparkle Stars */}
                        {/* Sparkle 1 */}
                        <motion.path
                            d="M25 45 L28 50 L33 52 L28 54 L25 59 L22 54 L17 52 L22 50 Z"
                            fill="#FBBF24"
                            animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                        {/* Sparkle 2 */}
                        <motion.path
                            d="M170 40 L172 44 L176 46 L172 48 L170 52 L168 48 L164 46 L168 44 Z"
                            fill="#FBBF24"
                            animate={{ scale: [0.5, 1.1, 0.5], opacity: [0.2, 0.9, 0.2] }}
                            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                        />
                        {/* Sparkle 3 (Lower Left) */}
                        <motion.path
                            d="M25 120 L27 123 L30 125 L27 127 L25 130 L23 127 L20 125 L23 123 Z"
                            fill="#FBBF24"
                            animate={{ scale: [0.6, 1, 0.6], opacity: [0.1, 0.8, 0.1] }}
                            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                        />
                    </svg>

                    {/* Shopping Bag falling overlay */}
                    <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute right-4 bottom-8 bg-rose-500 text-white p-2.5 rounded-2xl shadow-lg border border-rose-400/20"
                    >
                        <ShoppingBag size={18} />
                    </motion.div>
                </motion.div>

                {/* Typography and Descriptions */}
                <div className="space-y-4 mb-6">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold uppercase tracking-wider">
                        Store Missing / Disabled
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                        Storefront Offline
                    </h1>

                    <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
                        We couldn't connect to the store at <code className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs">{slug || 'this-address'}</code>.
                    </p>

                    <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 border border-slate-200/50 rounded-2xl p-4 text-left max-w-sm mx-auto space-y-2">
                        <p className="font-semibold text-slate-700">Why are you seeing this?</p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-500">
                            <li>The store link is misspelled or incorrect.</li>
                            <li>The store has been temporarily disabled or deleted by the merchant.</li>
                        </ul>
                    </div>
                </div>


                {/* Growth Hack / Upsell Promotional Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="mt-4 p-5 rounded-3xl bg-gradient-to-tr from-indigo-600/5 to-purple-600/5 border border-indigo-500/15 max-w-sm mx-auto relative overflow-hidden"
                >
                    {/* Background soft glow decoration */}
                    <div className="absolute -right-8 -top-8 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

                    <div className="flex flex-col items-center text-center space-y-3 relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                            <Store size={20} />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-800">
                                Launch Your Online Store Now
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Start selling without writing any code. Go live in under 30 minutes with WhatsApp-integrated order management and zero server setups.
                            </p>
                        </div>

                        <a
                            href="/register"
                            className="group/btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                        >
                            Launch Your Store
                            <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </a>
                    </div>
                </motion.div>

                {/* Subtle Support Help indicator */}
                <div className="mt-8 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors">
                    <HelpCircle size={14} />
                    <span>Need support hosting your store? Contact Us</span>
                </div>

            </div>
        </div>
    </PublicLayout>
    );
}
