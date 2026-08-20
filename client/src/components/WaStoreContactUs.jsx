import React, { useState } from 'react';
import { 
    MapPin, 
    Phone, 
    Mail, 
    MessageCircle, 
    ArrowRight, 
    Check, 
    Copy, 
    ShieldCheck, 
    ExternalLink,
    Store,
    ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaStoreContactUs({ store, theme }) {
    if (!store) return null;

    const [copiedField, setCopiedField] = useState(null);

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        toast.success(`${fieldName} copied!`, { duration: 1500 });
        setTimeout(() => setCopiedField(null), 2000);
    };

    const cleanWhatsApp = store.whatsappNumber ? store.whatsappNumber.replace(/[^0-9]/g, '') : '';
    const rawPhone = store.phone ? store.phone.replace(/[^0-9+]/g, '') : '';

    let fullAddress = store.address || '';
    if (store.city) fullAddress += (fullAddress ? ', ' : '') + store.city;
    if (store.state) fullAddress += (fullAddress ? ', ' : '') + store.state;
    if (store.country) fullAddress += (fullAddress ? ', ' : '') + store.country;

    const hasAnyContact = store.whatsappNumber || store.phone || store.email || fullAddress;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            
            {/* Top Compact Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white p-6 sm:p-7 border border-slate-800 shadow-md">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 text-center max-w-xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Customer Support</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        Contact {store.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                        Have questions or need assistance? Reach out to us through any channel below.
                    </p>
                </div>
            </div>

            {hasAnyContact ? (
                <>
                    {/* Compact 2x2 Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* WhatsApp Priority Card */}
                        {cleanWhatsApp && (
                            <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                                            Fast Reply
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                            WhatsApp Support
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Direct chat for orders and quick queries
                                        </p>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                            {store.whatsappNumber}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(store.whatsappNumber, 'WhatsApp Number')}
                                            className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition-colors"
                                            title="Copy WhatsApp Number"
                                        >
                                            {copiedField === 'WhatsApp Number' ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <a
                                        href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(`Hello ${store.name}, I would like to inquire about your products.`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        <span>Chat on WhatsApp</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Phone Support Card */}
                        {store.phone && (
                            <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-500/20">
                                            Direct Call
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Phone Assistance
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Voice support with our team
                                        </p>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                            {store.phone}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(store.phone, 'Phone Number')}
                                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                                            title="Copy Phone Number"
                                        >
                                            {copiedField === 'Phone Number' ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <a
                                        href={`tel:${rawPhone || store.phone}`}
                                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>Call Now</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Email Support Card */}
                        {store.email && (
                            <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-blue-500/50 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-500/20">
                                            Email
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Email Inquiries
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Send detailed queries or requests
                                        </p>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 flex items-center justify-between min-w-0">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate mr-2">
                                            {store.email}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(store.email, 'Email Address')}
                                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors shrink-0"
                                            title="Copy Email"
                                        >
                                            {copiedField === 'Email Address' ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <a
                                        href={`mailto:${store.email}`}
                                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        <span>Send Email</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Store Location Card */}
                        {fullAddress && (
                            <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-rose-500/50 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-500/20">
                                            Location
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Store Location
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Visit our branch or outlet
                                        </p>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 flex items-start justify-between gap-2">
                                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-1">
                                            {fullAddress}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(fullAddress, 'Address')}
                                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors shrink-0"
                                            title="Copy Address"
                                        >
                                            {copiedField === 'Address' ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span>Get Directions</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Compact Features Ribbon */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <MessageCircle className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">WhatsApp Support</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Quick assistance on orders</p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">Secure Transactions</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">100% safe & encrypted payments</p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">24/7 Catalog</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Browse & order anytime</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 px-6 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 max-w-sm mx-auto shadow-sm">
                    <Store className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                        No Contact Details Available
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        The store owner hasn't published contact details yet.
                    </p>
                </div>
            )}
        </div>
    );
}
