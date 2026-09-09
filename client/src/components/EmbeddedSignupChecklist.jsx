import React from 'react';
import {
    X, Facebook, ArrowRight, Globe, Phone, Building2,
    ShieldCheck, FileText, Wifi, Smartphone, CheckCircle,
    AlertCircle, Info, CreditCard, Mail, Hash, Lock
} from 'lucide-react';

// ─── Requirement sections ─────────────────────────────────────────────────────
const SECTIONS = [
    {
        id: 'meta_account',
        title: 'Meta / Facebook Account',
        subtitle: 'The personal Facebook account used to manage the Business Portfolio',
        color: 'blue',
        icon: Facebook,
        requirements: [
            {
                icon: Hash,
                label: 'Account Age',
                detail: 'Your personal Facebook account must be at least 60 days old. Brand-new accounts are automatically flagged and rejected by Meta.',
                critical: true,
            },
            {
                icon: Lock,
                label: 'Two-Factor Authentication (2FA)',
                detail: 'Enable 2FA on your Facebook account under Settings → Security & Login before starting the signup flow.',
                critical: true,
            },
            {
                icon: Wifi,
                label: 'No VPN / Proxy',
                detail: "You must be on a standard trusted internet connection. Using a VPN or proxy causes Meta's fraud system to block the signup.",
                critical: true,
            },
            {
                icon: Mail,
                label: 'Confirmed Email on Account',
                detail: 'Your Facebook account must have a verified email address linked to it.',
                critical: false,
            },
        ],
    },
    {
        id: 'meta_business',
        title: 'Meta Business Portfolio',
        subtitle: 'A verified Meta Business account (formerly Business Manager)',
        color: 'indigo',
        icon: Building2,
        requirements: [
            {
                icon: Building2,
                label: 'Business Name',
                detail: 'The exact legal/trade name of your business. Must match your website, GST certificate, or any document you may submit for verification.',
                critical: true,
            },
            {
                icon: Globe,
                label: 'Business Website',
                detail: 'A live, publicly accessible website for your business (e.g., https://mybrand.com). Meta will check this URL during review.',
                critical: true,
            },
            {
                icon: Mail,
                label: 'Business Email Address',
                detail: 'A professional email at your own domain (e.g., admin@mybrand.com). Free email providers like Gmail or Yahoo are not accepted.',
                critical: true,
            },
            {
                icon: Globe,
                label: 'Business Country & Category',
                detail: 'Know your country of operation and the primary industry/category your business falls under (e.g., Retail, Healthcare, Education).',
                critical: false,
            },
        ],
    },
    {
        id: 'phone',
        title: 'WhatsApp Phone Number',
        subtitle: 'The number that will become your WhatsApp Business API line',
        color: 'green',
        icon: Phone,
        requirements: [
            {
                icon: Smartphone,
                label: 'Unregistered from Consumer Apps',
                detail: 'This number must be fully removed from WhatsApp or WhatsApp Business mobile apps. Go to the app → Settings → Account → Delete my account before proceeding.',
                critical: true,
            },
            {
                icon: Phone,
                label: 'Reachable for OTP',
                detail: 'You must be able to receive an SMS or Voice Call on this number right now to complete verification.',
                critical: true,
            },
            {
                icon: AlertCircle,
                label: 'No Prior Bans',
                detail: 'The number must not have been previously banned, restricted, or used with a suspended WhatsApp Business API account.',
                critical: true,
            },
            {
                icon: Hash,
                label: 'Supports International Format',
                detail: 'Ensure the number works in E.164 format (e.g., +919876543210). Landlines can be used if they support voice OTP.',
                critical: false,
            },
        ],
    },
    {
        id: 'verification',
        title: 'Business Verification Documents',
        subtitle: 'Required later to unlock higher messaging limits & official badge',
        color: 'amber',
        icon: FileText,
        requirements: [
            {
                icon: FileText,
                label: 'Business Registration Proof',
                detail: 'GST Certificate, Certificate of Incorporation, LLP Agreement, Shop & Establishment Act Registration, or equivalent government-issued document.',
                critical: false,
            },
            {
                icon: CheckCircle,
                label: 'Name & Address Match',
                detail: 'The business name and address on your documents must exactly match what you register in Meta Business Portfolio.',
                critical: false,
            },
            {
                icon: CreditCard,
                label: 'Valid Payment Method',
                detail: 'Adding a credit/debit card to your Meta Business account helps unlock higher tiers faster and is required for paid Meta campaigns.',
                critical: false,
            },
        ],
    },
];

const COLOR_MAP = {
    blue:   { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'bg-blue-100 text-blue-600',    badge: 'bg-blue-600',    title: 'text-blue-700'    },
    indigo: { bg: 'bg-indigo-50',  border: 'border-indigo-200',  icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-600', title: 'text-indigo-700'  },
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-600', title: 'text-emerald-700' },
    amber:  { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'bg-amber-100 text-amber-600',   badge: 'bg-amber-500',   title: 'text-amber-700'   },
};

export default function EmbeddedSignupChecklist({ isOpen, onClose, onProceed, fbLoading }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="bg-white w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ animation: 'slChkScaleIn 0.2s ease both' }}
            >
                <style>{`
                    @keyframes slChkScaleIn {
                        from { opacity: 0; transform: scale(0.96) translateY(10px); }
                        to   { opacity: 1; transform: scale(1)    translateY(0);    }
                    }
                `}</style>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="relative px-6 pt-6 pb-5 border-b border-gray-100 bg-gradient-to-br from-[#1877F2]/5 via-white to-white shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center shrink-0">
                            <Facebook className="w-5 h-5 text-[#1877F2]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 leading-tight">
                                WhatsApp Business API — Setup Requirements
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Have everything below ready before you click Connect
                            </p>
                        </div>
                    </div>

                    {/* Alert banner */}
                    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            Meta's review systems are automated and strict. Missing any <strong>required</strong> item will cause an instant rejection. Review each section carefully before proceeding.
                        </p>
                    </div>
                </div>

                {/* ── Scrollable Requirements ────────────────────────────── */}
                <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
                    {SECTIONS.map((section) => {
                        const c     = COLOR_MAP[section.color];
                        const SIcon = section.icon;

                        return (
                            <div
                                key={section.id}
                                className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}
                            >
                                {/* Section header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06]">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.icon}`}>
                                        <SIcon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-bold leading-tight ${c.title}`}>{section.title}</p>
                                        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{section.subtitle}</p>
                                    </div>
                                    <span className={`shrink-0 text-[10px] font-bold text-white ${c.badge} rounded-full px-2 py-0.5`}>
                                        {section.requirements.length} items
                                    </span>
                                </div>

                                {/* Requirement rows */}
                                <div className="px-4 py-3 space-y-3">
                                    {section.requirements.map((req) => {
                                        const RIcon = req.icon;
                                        return (
                                            <div key={req.label} className="flex items-start gap-3">
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${c.icon}`}>
                                                    <RIcon className="w-3 h-3" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-gray-800">
                                                            {req.label}
                                                        </span>
                                                        {req.critical ? (
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                                                Required
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                                                                Optional
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                                                        {req.detail}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    <div className="h-1" />
                </div>

                {/* ── Footer / CTA ───────────────────────────────────────── */}
                <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Bluetick connects via Meta's official Embedded Signup. We never store your Facebook credentials.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onProceed}
                            disabled={fbLoading}
                            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1465D8] text-white text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {fbLoading ? (
                                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            ) : (
                                <Facebook className="w-4 h-4" />
                            )}
                            <span>{fbLoading ? 'Connecting…' : 'I\'m Ready — Connect'}</span>
                            {!fbLoading && <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

