import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelpCircle, ArrowRight, User, AlertCircle, Contact } from 'lucide-react';
import PublicLayout from './landing/PublicLayout';

export default function VcardNotFound({ slug }) {
    const navigate = useNavigate();

    return (
        <PublicLayout title="vCard Not Found" fullWidth={true}>
            <div className="w-full flex flex-col items-center justify-center p-6 bg-white text-slate-800 transition-colors duration-300 relative overflow-hidden select-none pt-24 md:pt-32 pb-16 md:pb-24">
            
            {/* Ambient Background Glow Blobs */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full filter blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center text-center">
                
                {/* Visual Graphic Centerpiece: Floating 3D Digital Business Card SVG */}
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="relative w-56 h-36 flex items-center justify-center mb-8 group"
                >
                    {/* Glowing background behind the card */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:scale-110 transition-transform duration-500" />
                    
                    <motion.div
                        animate={{
                            y: [0, -8, 0],
                            rotateX: [0, 5, -5, 0],
                            rotateY: [0, 8, -8, 0],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        className="w-full h-full bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden select-none"
                    >
                        {/* Card pattern overlay */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] pointer-events-none" />

                        {/* Top: Card Header Mock */}
                        <div className="flex justify-between items-start relative z-10">
                            {/* Profile details */}
                            <div className="flex gap-3">
                                {/* Profile Avatar Silhouette */}
                                <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                    <User size={20} />
                                </div>
                                <div className="flex flex-col items-start gap-1.5 justify-center">
                                    {/* Mock Name Line */}
                                    <div className="w-20 h-2.5 rounded-full bg-slate-200" />
                                    {/* Mock Title Line */}
                                    <div className="w-14 h-1.5 rounded-full bg-slate-300" />
                                </div>
                            </div>
                            
                            {/* Red alerting circle representing inactive card */}
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-lg shadow-rose-500/50" />
                        </div>

                        {/* Bottom: Contact Details Mock */}
                        <div className="space-y-2 relative z-10">
                            <div className="w-32 h-1.5 rounded-full bg-slate-300" />
                            <div className="w-24 h-1.5 rounded-full bg-slate-300" />
                        </div>

                        {/* Stamped Red Alert Sign inside card */}
                        <div className="absolute right-3 top-10 rotate-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-widest uppercase select-none">
                            OFFLINE
                        </div>
                    </motion.div>

                    {/* Warning circle float icon */}
                    <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute right-[-10px] bottom-[-5px] bg-rose-500 text-white p-2.5 rounded-2xl shadow-lg border border-rose-400/20"
                    >
                        <AlertCircle size={18} />
                    </motion.div>
                </motion.div>

                {/* Typography and Descriptions */}
                <div className="space-y-4 mb-6">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold uppercase tracking-wider">
                        vCard Missing / Disabled
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                        Card Unresolved
                    </h1>
                    
                    <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
                        We couldn't connect to the digital card at <code className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs">{slug || 'this-address'}</code>.
                    </p>

                    <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 border border-slate-200/50 rounded-2xl p-4 text-left max-w-sm mx-auto space-y-2">
                        <p className="font-semibold text-slate-700">Why are you seeing this?</p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-500">
                            <li>The profile link is misspelled or incorrect.</li>
                            <li>The profile has been deactivated by the card owner.</li>
                            <li>The user's subscription link has expired.</li>
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
                            <Contact size={20} />
                        </div>
                        
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-800">
                                Create Your Digital vCard Now
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Build your premium digital profile in 5 minutes. Share links, professional contact info, and schedule booking appointments instantly.
                            </p>
                        </div>
                        
                        <a
                            href="/register"
                            className="group/btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                        >
                            Create Your vCard
                            <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </a>
                    </div>
                </motion.div>

                {/* Support Help indicator */}
                <div className="mt-8 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors">
                    <HelpCircle size={14} />
                    <span>Need support hosting your digital card? Contact Us</span>
                </div>

            </div>
        </div>
    </PublicLayout>
    );
}
