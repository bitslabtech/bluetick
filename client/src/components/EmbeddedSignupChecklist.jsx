import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    X, Facebook, ArrowRight, Globe, Phone, Building2,
    ShieldCheck, FileText, Wifi, Smartphone, CheckCircle,
    AlertCircle, Info, CreditCard, Mail, Hash, Lock,
    Store, Sparkles, ArrowUpRight
} from 'lucide-react';

export default function EmbeddedSignupChecklist({ isOpen, onClose, onProceed, fbLoading }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasOnlineStore = Boolean(user?.planDetails?.allowWaStore);

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

                    {/* Card 2: Business Registration */}
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 mb-1">2. Business Registration (GST / MSME)</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Keep your official business proof handy (such as a <strong>GST certificate</strong> or <strong>MSME / Udyam registration</strong>), as Meta may require document verification to verify your business.
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Active Website */}
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 mb-1">3. Active Website</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Have an active, functional website or online store representing your business.
                            </p>

                            {hasOnlineStore ? (
                                <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                                            <Store className="w-4 h-4" />
                                        </div>
                                        <div className="leading-snug">
                                            <p className="text-xs font-bold text-emerald-900">Your plan includes Online Store</p>
                                            <p className="text-[11px] text-emerald-700 mt-0.5">
                                                Create your store, add basic details, and add a minimum of 5 products so Meta can verify your business catalog.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            navigate('/online-store?action=create', { state: { openCreateModal: true } });
                                        }}
                                        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors text-xs whitespace-nowrap"
                                    >
                                        <span>Create Store</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div className="leading-snug">
                                            <p className="text-xs font-bold text-amber-900">Need an active website?</p>
                                            <p className="text-[11px] text-amber-800 mt-0.5">
                                                Upgrade your plan to get Online Store and launch your online store in 15 mins.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            navigate('/billing?feature=online-store', { state: { requiredFeature: 'online-store' } });
                                        }}
                                        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors text-xs whitespace-nowrap"
                                    >
                                        <span>Upgrade Plan</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
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
                                Use a new phone number or any number that is not currently active on WhatsApp & WhatsApp Business. Make sure that the number can receive SMS/call verification.<br />

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


