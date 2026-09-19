import React from 'react';
import {
    X, Facebook, ArrowRight, Globe, Phone, Building2,
    ShieldCheck, FileText, Wifi, Smartphone, CheckCircle,
    AlertCircle, Info, CreditCard, Mail, Hash, Lock
} from 'lucide-react';

export default function EmbeddedSignupChecklist({ isOpen, onClose, onProceed, fbLoading }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="bg-white w-full max-w-xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ animation: 'slChkScaleIn 0.2s ease both' }}
            >
                <style>{`
                    @keyframes slChkScaleIn {
                        from { opacity: 0; transform: scale(0.96) translateY(10px); }
                        to   { opacity: 1; transform: scale(1)    translateY(0);    }
                    }
                `}</style>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="relative px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-black text-gray-900 leading-tight">
                        WhatsApp Business API — Setup Requirements
                    </h2>
                </div>

                {/* ── Scrollable Requirements ────────────────────────────── */}
                <div className="overflow-y-auto flex-1 px-6 py-6 space-y-4">
                    {/* Card 1: Facebook Account */}
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-[#1877F2] flex items-center justify-center shrink-0">
                            <Facebook className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-1">1. Facebook Account</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Log in with your standard Facebook account.<br />
                                A Meta Business Portfolio can be created during setup if needed.
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Your Business */}
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-1">2. Your Business</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Have your business details and registration documents ready.<br />
                                Meta may ask for verification.
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Your Website */}
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-1">3. Your Website</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Have a live website on your own domain.<br />
                                <span className="text-indigo-600 font-medium">Don't have one yet? We can help you set it up—just bring your own domain to get started</span>
                            </p>
                        </div>
                    </div>

                    {/* Card 4: Your WhatsApp Number */}
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-1">4. Your WhatsApp Number</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Use a new phone number or any number that is not currently active on WhatsApp. Make sure that the number can receive SMS/call verification.<br />

                            </p>
                        </div>
                    </div>

                    <p className="text-center text-sm text-gray-500 pt-2 font-medium">
                        That’s all you need to get started. We will guide you through the Meta setup.
                    </p>
                </div>

                {/* ── Footer / CTA ───────────────────────────────────────── */}
                <div className="shrink-0 px-6 py-5 border-t border-gray-100 bg-white flex justify-end">
                    <button
                        onClick={onProceed}
                        disabled={fbLoading}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1465D8] text-white text-base font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {fbLoading ? (
                            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                            <Facebook className="w-5 h-5" />
                        )}
                        <span>{fbLoading ? 'Connecting…' : 'Connect WhatsApp Business'}</span>
                        {!fbLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}


