import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, ArrowRight, Home, CreditCard, Copy } from 'lucide-react';

const ManualPaymentPending = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { utrNumber, planName, amount, currency } = location.state || {};

    const currencySymbol = (c) => ({ USD: '$', INR: '₹', EUR: '€', GBP: '£' }[c] || c || '₹');

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
    };

    const steps = [
        { icon: '🔍', title: 'We Verify Your Payment', desc: 'Our team checks the UTR number and confirms the transfer in your bank records.' },
        { icon: '✅', title: 'Plan Gets Activated', desc: 'Once verified, your selected plan is instantly activated on your account.' },
        { icon: '📄', title: 'Invoice Delivered', desc: 'A GST invoice is automatically generated and delivered to your email.' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-emerald-50/20 dark:from-gray-950 dark:via-indigo-950/20 dark:to-gray-950 flex items-center justify-center p-4 font-display">
            <div className="w-full max-w-lg">
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-slate-100 dark:border-white/10 overflow-hidden">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-2 left-4 w-20 h-20 rounded-full border-4 border-white"></div>
                            <div className="absolute bottom-0 right-8 w-32 h-32 rounded-full border-4 border-white"></div>
                        </div>
                        <div className="relative">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
                                <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-1">Payment Request Submitted!</h1>
                            <p className="text-emerald-100 text-sm">We have received your bank transfer details</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        {(planName || utrNumber) && (
                            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/10 space-y-3">
                                {planName && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Plan</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{planName}</span>
                                    </div>
                                )}
                                {amount !== undefined && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Amount</span>
                                        <span className="font-bold text-slate-900 dark:text-white text-lg">
                                            {currencySymbol(currency)}{parseFloat(amount).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {utrNumber && (
                                    <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/10 pt-3">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">UTR / Reference No.</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{utrNumber}</span>
                                            <button onClick={() => handleCopy(utrNumber)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Copy UTR">
                                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-full shrink-0">
                                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Pending Verification</p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Usually verified within 2-24 hours on business days</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">What happens next?</p>
                            <div className="space-y-3">
                                {steps.map((step, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-lg">{step.icon}</div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{step.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button onClick={() => navigate('/billing')} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors">
                                <CreditCard className="w-4 h-4" />
                                View Billing
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button onClick={() => navigate('/dashboard')} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-xl font-semibold text-sm transition-colors">
                                <Home className="w-4 h-4" />
                                Dashboard
                            </button>
                        </div>
                        <p className="text-center text-xs text-slate-400 dark:text-slate-500 pb-1">
                            Have questions? Contact us at <a href="mailto:support@bitslab.in" className="text-indigo-500 hover:underline">support@bitslab.in</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualPaymentPending;
