import { useState, useEffect } from 'react';
import TrialBanner from '../components/TrialBanner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Sparkles, Zap, Check, X, MessageSquare, Users, Layout,
    Clock, TrendingUp, Shield, ChevronRight, RefreshCw, Menu, Info,
    MousePointerClick, Megaphone, CreditCard, ShoppingCart, Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserDropdown from '../components/UserDropdown';
import BillingProfileComp from '../components/BillingProfile';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Color themes matching the landing page
const THEME_COLORS = {
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
        btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25'
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
        btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25'
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

const UsageBar = ({ label, icon, used, limit, color }) => {
    const DynIcon = icon;
    const pct = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
    const isUnlimited = limit === -1;
    const isWarning = pct >= 80 && pct < 100;
    const isDanger = pct >= 100;

    const barColor = isUnlimited
        ? 'bg-emerald-500'
        : isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : color;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isUnlimited ? 'bg-emerald-500/10 text-emerald-500' : isDanger ? 'bg-red-500/10 text-red-500' : isWarning ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                        <DynIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                </div>
                <span className={`text-xs font-bold ${isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    {isUnlimited ? `${used.toLocaleString()} / ∞` : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
                </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: isUnlimited ? '100%' : `${pct}%`, opacity: isUnlimited ? 0.4 : 1 }}
                />
            </div>
            {isDanger && (
                <p className="text-[10px] text-red-500 font-semibold">Limit reached — upgrade to continue</p>
            )}
        </div>
    );
};

const PlanCard = ({ plan, currentPlan, billingInterval, usage, metaRates, onUpgrade }) => {
    const currentPlanName = currentPlan?.name || 'Free';
    const isExpired = currentPlan?.expiry ? new Date(currentPlan.expiry) < new Date() : false;
    const isOnTrial = currentPlan?.status === 'Trial';
    
    // Trial users or expired subscriptions should NOT see their plan as "Active"
    const isCurrent = !isOnTrial && !isExpired && plan.name === currentPlanName;
    
    // A plan is a downgrade if its base price is strictly less than the user's current plan base price
    const isDowngrade = parseFloat(plan.price || 0) < parseFloat(currentPlan?.price || 0);

    // Check if user is currently active mid-subscription (Trial is NOT a paid subscription)
    const isMidSubscription = currentPlan?.status === 'Active' && !isExpired && currentPlanName !== 'Free';

    // Disallow downgrade if mid subscription
    const downgradeBlocked = isDowngrade && isMidSubscription;

    let displayPrice = parseFloat(plan.price) || 0;
    let displayInterval = 'mo';
    let intervalCode = 'month';
    let originalTotal = null;
    let billedTotal = null;
    let billedPeriodText = '';
    let savingsPercentage = 0;
    
    const baseMonthlyPrice = parseFloat(plan.monthlyPrice) || parseFloat(plan.price) || 0;

    if (billingInterval === 'monthly') {
        displayPrice = baseMonthlyPrice;
        displayInterval = 'mo';
        intervalCode = 'month';
    } else if (billingInterval === 'half-yearly' && parseFloat(plan.halfYearlyPrice) > 0) {
        billedTotal = parseFloat(plan.halfYearlyPrice);
        displayPrice = billedTotal / 6; 
        displayInterval = 'mo';
        intervalCode = 'half-year';
        originalTotal = baseMonthlyPrice * 6;
        billedPeriodText = 'billed half-yearly';
        if (originalTotal > 0 && originalTotal > billedTotal) {
            savingsPercentage = Math.round(((originalTotal - billedTotal) / originalTotal) * 100);
        }
    } else if (billingInterval === 'yearly' && parseFloat(plan.yearlyPrice) > 0) {
        billedTotal = parseFloat(plan.yearlyPrice);
        displayPrice = billedTotal / 12;
        displayInterval = 'mo';
        intervalCode = 'year';
        originalTotal = baseMonthlyPrice * 12;
        billedPeriodText = 'billed yearly';
        if (originalTotal > 0 && originalTotal > billedTotal) {
            savingsPercentage = Math.round(((originalTotal - billedTotal) / originalTotal) * 100);
        }
    }

    // Interval validity downgrade check
    const intervalWeights = { month: 1, 'half-year': 6, year: 12 };
    const targetIntervalWeight = intervalWeights[intervalCode] || 1;
    const currentIntervalWeight = intervalWeights[currentPlan?.interval] || 1;
    const isIntervalDowngrade = targetIntervalWeight < currentIntervalWeight;
    const intervalDowngradeBlocked = isIntervalDowngrade && isMidSubscription;

    const theme = THEME_COLORS[plan.color] || THEME_COLORS.blue;
    const currencyMap = { USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$' };
    const currency = currencyMap[plan.currency] || plan.currency || '₹';
    const isPopular = plan.isPopular;

    const renderCTA = () => (
        <div className="flex flex-col gap-2">
            {isCurrent ? (
                <div className="w-full py-4 rounded-xl text-sm font-bold text-center bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 cursor-default shadow-sm border border-slate-200 dark:border-white/10">
                    ✓ Active Plan
                </div>
            ) : downgradeBlocked ? (
                <div className="w-full py-4 rounded-xl text-sm font-medium text-center text-slate-400 bg-slate-50 dark:bg-white/5 cursor-not-allowed border border-slate-100 dark:border-white/5" title="Downgrades are only allowed after your current subscription expires.">
                    Unavailable (Mid-Subscription)
                </div>
            ) : intervalDowngradeBlocked ? (
                <div className="w-full py-4 rounded-xl text-sm font-medium text-center text-slate-400 bg-slate-50 dark:bg-white/5 cursor-not-allowed border border-slate-100 dark:border-white/5" title="Downgrading cycle duration is not allowed mid-subscription.">
                    Requires {currentPlan?.interval === 'year' ? 'Annual' : 'Half-Yearly'} Billing
                </div>
            ) : isDowngrade ? (
                <button
                    onClick={() => onUpgrade(plan, intervalCode)}
                    className={`w-full py-4 rounded-xl font-bold text-center transition-all text-sm ${theme.btnSubtleReg}`}
                >
                    Downgrade to {plan.name}
                </button>
            ) : plan.name === currentPlanName ? (
                <button
                    onClick={() => onUpgrade(plan, intervalCode)}
                    className="w-full py-4 rounded-xl font-bold text-center transition-all text-sm bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                >
                    Renew {plan.name}
                </button>
            ) : (
                <button
                    onClick={() => onUpgrade(plan, intervalCode)}
                    className="w-full py-4 rounded-xl font-bold text-center transition-all text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                >
                    Upgrade to {plan.name}
                </button>
            )}
        </div>
    );

    return (
        <div className={`relative flex flex-col h-full rounded-[2rem] border p-5 lg:p-6 transition-all ${isPopular ? theme.bgPop : theme.bgReg}`}>
            
            {/* Badges */}
            {isCurrent && (
                <div className="absolute top-0 right-6 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[9px] uppercase tracking-widest font-bold rounded-b-xl shadow-lg shadow-emerald-500/10 border-b border-x border-emerald-400/30 whitespace-nowrap z-10 flex items-center gap-1.5">
                    <Check className="w-2.5 h-2.5" /> CURRENT PLAN
                </div>
            )}
            {isPopular && !isCurrent && (
                <div className="absolute top-0 right-6 px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[9px] uppercase tracking-widest font-bold rounded-b-xl shadow-lg shadow-indigo-500/10 border-b border-x border-indigo-400/30 whitespace-nowrap z-10">
                    MOST POPULAR
                </div>
            )}

            <h3 className="text-xl font-bold mb-2 pt-2">{plan.name}</h3>
            <p className="text-xs mb-6 font-medium text-slate-500 dark:text-slate-400">{plan.description || 'Perfect for growing businesses.'}</p>

            <div className="flex flex-col gap-1 mb-2 pb-6 border-b border-indigo-500/20 dark:border-white/10 min-h-[110px] justify-end">
                <div className="flex items-baseline gap-1 mt-auto">
                    <span className="text-4xl font-extrabold">{currency}{displayPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <span className="font-bold text-slate-500 dark:text-slate-400">
                        /{displayInterval}
                        {plan.taxEnabled && <span className="text-[10px] ml-1 font-semibold opacity-70">({plan.taxText})</span>}
                    </span>
                </div>
                {billedTotal ? (
                    <div className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap items-center gap-1.5 leading-tight">
                        {originalTotal > billedTotal && (
                            <span className="line-through opacity-70 text-[13px]">{currency}{originalTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        )}
                        <span className="text-slate-800 dark:text-slate-200 text-[15px]">{currency}{billedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span>{billedPeriodText}</span>
                        {savingsPercentage > 0 && (
                            <span className="inline-flex items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold px-1.5 py-0.5 rounded ml-1">
                                SAVE {savingsPercentage}%
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-2 opacity-0">Spacer</div>
                )}
            </div>

            <div className="space-y-5 mb-8 flex-1">
                {/* Top CTA */}
                {renderCTA()}

                {/* Meta Message Pricing Box */}
                {metaRates && (
                    <div className="mb-6 relative rounded-xl bg-gradient-to-br from-emerald-50/10 to-green-50/5 dark:from-emerald-950/5 dark:to-green-950/5 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm">
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
                            <span className={!plan.flowBotEnabled ? "text-slate-900 dark:text-white" : ""}>
                                {plan.flowBotEnabled && plan.flowLimit !== undefined
                                    ? `${plan.flowLimit === -1 ? 'Unlimited' : plan.flowLimit} AI FlowBots`
                                    : 'AI FlowBot Builder'}
                            </span>
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

                {/* Capabilities / Add-ons */}
                {(plan.aiTokensAllowance > 0 || plan.aiTokensAllowance === -1 || (Array.isArray(plan.includedAddons) && plan.includedAddons.length > 0)) && (
                    <div>
                        <div className="font-bold text-[10px] tracking-widest uppercase mb-3 text-slate-400">Add-ons</div>
                        <ul className="space-y-3">
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

                {/* Custom Features */}
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

            {/* CTA section */}
            <div className="mt-auto pt-6 flex flex-col gap-2">
                {renderCTA()}
            </div>
        </div>
    );
};

const Billing = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [billingInfo, setBillingInfo] = useState(null);
    const [plans, setPlans] = useState([]);
    const [metaRates, setMetaRates] = useState(null);
    const [billingInterval, setBillingInterval] = useState('yearly');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [billingRes, plansRes, metaRatesRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/billing`),
                    axios.get(`${API_BASE}/api/plans/public`),
                    axios.get(`${API_BASE}/api/plans/meta-rates`).catch(() => ({ data: null }))
                ]);
                setBillingInfo(billingRes.data);
                setPlans(plansRes.data);
                if (metaRatesRes && metaRatesRes.data) {
                    setMetaRates(metaRatesRes.data);
                }
            } catch (err) {
                console.error('Billing fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleUpgrade = (plan, intervalCode = 'month') => {
        const planWithInterval = { ...plan, interval: intervalCode };
        // Write to localStorage as a fallback for page refreshes
        localStorage.setItem('pendingPlan', JSON.stringify(planWithInterval));
        // Pass plan directly via router state — guaranteed to be available on Checkout mount
        navigate('/checkout', { state: { plan: planWithInterval } });
    };

    // Determine available intervals across all plans
    const hasMonthly = plans.some(p => parseFloat(p.monthlyPrice) > 0);
    const hasHalfYearly = plans.some(p => parseFloat(p.halfYearlyPrice) > 0);
    const hasYearly = plans.some(p => parseFloat(p.yearlyPrice) > 0);

    const maxYearlySavings = Math.max(0, ...plans.map(p => {
        const m = parseFloat(p.monthlyPrice) || 0;
        const y = parseFloat(p.yearlyPrice) || 0;
        return (m > 0 && y > 0) ? Math.round(100 - (y / (m * 12) * 100)) : 0;
    }));

    const { plan, usage } = billingInfo || {};
    const daysLeft = plan?.expiry
        ? Math.ceil((new Date(plan.expiry) - new Date()) / 86400000)
        : null;

    // Currency symbol helper
    const currMap = { USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$' };
    const getCurrency = (c) => currMap[c] || c || '$';
    const getIntervalLabel = (i) => i === 'year' ? 'per year' : i === 'lifetime' ? 'one-time' : 'per month';

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-300">
            {/* Header */}
            <header className="hidden md:flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-4 md:px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300">
                <div className="flex items-center gap-6 w-full">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Billing & Plans</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage your subscription and usage</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <TrialBanner />
                    <ThemeToggle />
                    <NotificationBell />
                    <UserDropdown />
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-full gap-3">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                        <span className="text-slate-500">Loading billing details...</span>
                    </div>
                ) : (
                    <div className="p-4 sm:p-6 md:p-10 max-w-[1400px] max-w-full mx-auto space-y-10">



                        {/* Plans Grid */}
                        <div>
                            <div className="mb-10 flex flex-col items-center justify-center text-center gap-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Available Plans</h2>
                                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Choose a plan and billing cycle that fits your needs.</p>
                                </div>
                                {/* Interval Switcher */}
                                {(hasMonthly || hasHalfYearly || hasYearly) && (
                                    <div className="inline-flex bg-white dark:bg-surface-dark p-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                                        {hasMonthly && (
                                            <button
                                                onClick={() => setBillingInterval('monthly')}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${billingInterval === 'monthly'
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                                    }`}
                                            >
                                                Monthly
                                            </button>
                                        )}
                                        {hasHalfYearly && (
                                            <button
                                                onClick={() => setBillingInterval('half-yearly')}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${billingInterval === 'half-yearly'
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                                    }`}
                                            >
                                                Half-Yearly
                                            </button>
                                        )}
                                        {hasYearly && (
                                            <button
                                                onClick={() => setBillingInterval('yearly')}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${billingInterval === 'yearly'
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                                    }`}
                                            >
                                                Yearly
                                                {maxYearlySavings > 0 && <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-black px-1.5 py-0.5 rounded-full">Save {maxYearlySavings}%</span>}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {plans.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">No plans available at the moment.</div>
                            ) : (
                                <div className="flex flex-wrap justify-center gap-6">
                                    {plans.map(p => (
                                        <div key={p.id} className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] xl:w-[calc(25%-1.5rem)] max-w-[300px] flex flex-col">
                                            <PlanCard
                                                plan={p}
                                                currentPlan={billingInfo?.plan}
                                                billingInterval={billingInterval}
                                                usage={billingInfo?.usage}
                                                metaRates={metaRates}
                                                onUpgrade={handleUpgrade}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer note */}
                        <p className="text-center text-xs text-slate-400 dark:text-slate-600 pb-4">
                            Need a custom plan?{' '}
                            <button onClick={() => navigate('/support')} className="text-indigo-500 hover:text-indigo-400 underline underline-offset-2 font-medium">
                                Contact Support
                            </button>
                        </p>

                        {/* Transaction History + Profile Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-200 dark:border-white/5">
                            <div className="md:col-span-2">
                                <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Transaction History</h3>
                                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-4">
                                    <BillingHistory />
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Billing Profile</h3>
                                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-6">
                                    <BillingProfileComp />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;

// ─── Billing History ──────────────────────────────────────────────────────────
export function BillingHistory() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_BASE = import.meta.env.VITE_API_URL || '';

    useEffect(() => {
        axios.get(`${API_BASE}/api/billing/invoices`)
            .then(r => { setTransactions(r.data || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const formatCurrency = (v, c = 'INR') => {
        if (c === 'INR') return '₹' + parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        return `${c} ${parseFloat(v || 0).toFixed(2)}`;
    };

    if (loading) return <div className="text-center py-8 text-slate-400 text-sm">Loading transactions…</div>;
    if (transactions.length === 0) return (
        <div className="text-center py-10 text-slate-400">
            <div className="text-3xl mb-2">🧾</div>
            <p className="text-sm">No transactions yet. History will appear here after your first purchase.</p>
        </div>
    );

    return (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
            {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-3 px-2">
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800 dark:text-white">
                            {tx.planName}
                            <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {tx.status}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                            {tx.invoice ? `Invoice: ${tx.invoice.invoiceNumber}` : `Txn ID: ${tx.id.substring(0,8)}...`}
                        </div>
                        <div className="text-xs text-slate-400">{formatDate(tx.createdAt)}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{formatCurrency(tx.amount, tx.currency)}</div>
                        <div className="flex items-center gap-2 mt-1 justify-end">
                            {tx.status === 'COMPLETED' && tx.invoice && (
                                <a href={`${API_BASE}/api/invoices/my/${tx.invoice.id}/pdf`} target="_blank" rel="noreferrer"
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors">
                                    ⬇ PDF
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
