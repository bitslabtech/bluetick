import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, QrCode, Copy, CheckCircle2 } from 'lucide-react';

export default function WALinksGenerator() {
    const [copied, setCopied] = useState(false);
    
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Link2 className="w-6 h-6 text-pink-500" />
                        WhatsApp Link & QR Generator
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Create pre-filled WhatsApp links for your Instagram bio, websites, or print materials.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Configuration Panel */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-sm"
                >
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Link Details</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp Number</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                                placeholder="+1 (234) 567-8900"
                                defaultValue="+12345678900"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pre-filled Message</label>
                            <textarea 
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500 h-24 resize-none"
                                placeholder="Hi, I'm interested in your services and would like to know more."
                            ></textarea>
                            <p className="text-xs text-slate-400 mt-1">This text will automatically populate in the customer's chat opening.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Preview Panel */}
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-1"
                >
                    <div className="bg-white dark:bg-surface-dark rounded-xl h-full p-4 md:p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-32 h-32 bg-slate-100 dark:bg-white/10 rounded-2xl p-4 flex items-center justify-center mb-6">
                            <QrCode className="w-20 h-20 text-slate-400" />
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Your link is ready!</h3>
                        
                        <div className="w-full flex items-center gap-2 mt-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2">
                            <div className="flex-1 truncate text-sm text-slate-600 dark:text-slate-300 px-2 text-left">
                                https://wa.me/12345678900?text=Hi...
                            </div>
                            <button 
                                onClick={() => {
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="p-2 bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-md hover:bg-pink-200 transition-colors"
                            >
                                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        
                        <button className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <QrCode className="w-4 h-4" /> Download QR Code
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
