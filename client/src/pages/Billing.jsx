import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Sparkles, Zap, Check, X, MessageSquare, Users, Layout,
    Clock, TrendingUp, Shield, ChevronRight, RefreshCw, Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserDropdown from '../components/UserDropdown';

const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

// Color themes for plan cards
const PLAN_THEMES = {
    default: {
        gradient: 'from-slate-600 via-slate-700 to-slate-800',
        badge: 'bg-slate-100 text-slate-700',
        btn: 'bg-white text-slate-900 hover:bg-slate-50',
        glow: 'shadow-slate-500/20',
        accent: 'text-slate-400',
        ring: 'ring-slate-400/30'
    },
    blue: {
        gradient: 'from-blue-500 via-indigo-600 to-violet-700',
        badge: 'bg-blue-100 text-blue-700',
        btn: 'bg-white text-indigo-900 hover:bg-indigo-50',
        glow: 'shadow-indigo-500/30',
        accent: 'text-indigo-300',
        ring: 'ring-indigo-500/40'
    },
    purple: {
        gradient: 'from-violet-500 via-purple-600 to-fuchsia-700',
        badge: 'bg-purple-100 text-purple-700',
        btn: 'bg-white text-purple-900 hover:bg-purple-50',
        glow: 'shadow-purple-500/30',
        accent: 'text-purple-300',
        ring: 'ring-purple-500/40'
    },
    amber: {
        gradient: 'from-amber-400 via-orange-500 to-red-600',
        badge: 'bg-amber-100 text-amber-700',
        btn: 'bg-white text-orange-900 hover:bg-orange-50',
        glow: 'shadow-orange-500/30',
        accent: 'text-orange-200',
        ring: 'ring-orange-400/40'
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

const PlanCard = ({ plan, currentPlanName, billingInterval, usage, onUpgrade }) => {
    const isCurrent = plan.name === currentPlanName;
    const isDowngrade = (() => {
        const order = { Free: 0, Starter: 1, Pro: 2, Enterprise: 3 };
        return (order[plan.name] ?? 99) < (order[currentPlanName] ?? 0);
    })();

    const theme = PLAN_THEMES[plan.color] || PLAN_THEMES.blue;
    const currencyMap = { USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$' };
    const currency = currencyMap[plan.currency] || plan.currency || '₹';

    // Determine price to display based on selected interval
    let displayPrice = parseFloat(plan.price) || 0;
    let intervalLbl = '/mo';
    let intervalCode = 'month';
    if (billingInterval === 'monthly' && parseFloat(plan.monthlyPrice) > 0) {
        displayPrice = parseFloat(plan.monthlyPrice);
        intervalLbl = '/mo'; intervalCode = 'month';
    } else if (billingInterval === 'half-yearly' && parseFloat(plan.halfYearlyPrice) > 0) {
        displayPrice = parseFloat(plan.halfYearlyPrice);
        intervalLbl = '/6mo'; intervalCode = 'half-year';
    } else if (billingInterval === 'yearly' && parseFloat(plan.yearlyPrice) > 0) {
        displayPrice = parseFloat(plan.yearlyPrice);
        intervalLbl = '/yr'; intervalCode = 'year';
    }

    // Detect which limits this plan would fix
    const fixesMessages = usage && plan.messageLimit !== -1 && plan.messageLimit > usage.monthlyLimit;
    const fixesTemplates = usage && plan.templateLimit !== -1 && plan.templateLimit > usage.templateLimit;
    const fixesContacts = usage && plan.contactLimit !== -1 && plan.contactLimit > usage.contactLimit;
    const fixesSomething = fixesMessages || fixesTemplates || fixesContacts;

    return (
        <div className={`relative flex flex-col overflow-hidden rounded-3xl transition-all duration-300 ${isCurrent
            ? `ring-2 ${theme.ring} shadow-2xl ${theme.glow} scale-[1.02]`
            : 'hover:scale-[1.01] hover:shadow-xl ring-1 ring-slate-200 dark:ring-white/10'
            }`}>

            {/* Popular badge */}
            {plan.isPopular && !isCurrent && (
                <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-amber-900 text-xs font-bold shadow-lg">
                        <Sparkles className="w-3 h-3" /> Most Popular
                    </span>
                </div>
            )}
            {isCurrent && (
                <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-white text-xs font-bold border border-white/30">
                        <Check className="w-3 h-3" /> Current Plan
                    </span>
                </div>
            )}

            {/* Header Gradient */}
            <div className={`relative p-7 pb-8 bg-gradient-to-br ${theme.gradient} text-white`}>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    {plan.description && (
                        <p className={`text-sm mb-4 ${theme.accent}`}>{plan.description}</p>
                    )}
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black tracking-tight">{currency}{displayPrice.toLocaleString()}</span>
                        {intervalLbl && <span className="text-white/60 text-sm font-medium">{intervalLbl}</span>}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col bg-white dark:bg-surface-dark p-4 md:p-6 gap-5">
                {/* Limits */}
                <div className="space-y-3">
                    <LimitRow icon={MessageSquare} label="Messages / month" value={plan.messageLimit} />
                    <LimitRow icon={Layout} label="Templates" value={plan.templateLimit} />
                    <LimitRow icon={Users} label="Contacts" value={plan.contactLimit} />
                </div>

                {/* Features */}
                {plan.features?.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-2">
                        {plan.features.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                {f}
                            </div>
                        ))}
                        {plan.coreFeatures?.map((feat, fi) => (
                            <div key={`core-${fi}`} className={`flex items-center gap-2 text-sm ${(!feat.qty || feat.qty === '0') ? 'text-slate-400 dark:text-slate-500 opacity-70' : 'text-slate-600 dark:text-slate-300'}`}>
                                {(!feat.qty || feat.qty === '0') ? (
                                    <X className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                                ) : (
                                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                )}
                                <span>
                                    {feat.qty && feat.qty !== '0' && <span className="font-extrabold mr-1">{feat.qty}</span>}
                                    {feat.name}
                                </span>
                            </div>
                        ))}
                        {plan.allowWaStore ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                Online Store Builder (Limit: {plan.waStoreLimit})
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 opacity-70">
                                <X className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                                <span>Online Store Builder</span>
                            </div>
                        )}
                        {plan.allowVcard ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                Digital VeCards (Limit: {plan.vcardLimit})
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 opacity-70">
                                <X className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                                <span>Digital VeCards</span>
                            </div>
                        )}
                        {plan.allowCtwaAnalytics ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                Click to WhatsApp Ads
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 opacity-70">
                                <X className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                                <span>Click to WhatsApp Ads</span>
                            </div>
                        )}
                        {plan.allowMetaAds ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                Meta Ads Marketing
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 opacity-70">
                                <X className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                                <span>Meta Ads Marketing</span>
                            </div>
                        )}
                    </div>
                )}

                {/* "Fixes" banner */}
                {!isCurrent && fixesSomething && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-2.5 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            Resolves your current limit{fixesMessages && fixesTemplates ? 's' : ''}
                        </p>
                    </div>
                )}

                {/* CTA */}
                <div className="mt-auto pt-2">
                    {isCurrent ? (
                        <div className="w-full py-3 rounded-xl text-sm font-bold text-center bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 cursor-default">
                            ✓ Active Plan
                        </div>
                    ) : isDowngrade ? (
                        <div className="w-full py-3 rounded-xl text-sm font-medium text-center text-slate-400 bg-slate-50 dark:bg-white/5 cursor-not-allowed border border-slate-100 dark:border-white/5">
                            Lower tier
                        </div>
                    ) : (
                        <button
                            onClick={() => onUpgrade(plan, intervalCode)}
                            className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-95 bg-gradient-to-r ${theme.gradient} text-white hover:opacity-90`}
                        >
                            <Zap className="w-4 h-4" />
                            Upgrade to {plan.name}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const LimitRow = ({ icon, label, value }) => {
    const DynIcon = icon;
    return (
        <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <DynIcon className="w-3.5 h-3.5" />
                <span>{label}</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
                {value === -1 ? '∞ Unlimited' : value?.toLocaleString()}
            </span>
        </div>
    );
};

const Billing = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [billingInfo, setBillingInfo] = useState(null);
    const [plans, setPlans] = useState([]);
    const [billingInterval, setBillingInterval] = useState('monthly');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = { 'x-auth-token': token };
                const [billingRes, plansRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/billing`, { headers }),
                    axios.get(`${API_BASE}/api/billing/plans`, { headers })
                ]);
                setBillingInfo(billingRes.data);
                setPlans(plansRes.data);
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
        localStorage.setItem('pendingPlan', JSON.stringify(planWithInterval));
        navigate('/checkout');
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

                        {/* Hero Banner — Current Plan + Usage */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                            {/* Current Plan Card */}
                            <div className="lg:col-span-3 relative overflow-hidden rounded-3xl p-4 md:p-8 text-white shadow-2xl shadow-indigo-500/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700" />
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                                <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                                <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

                                <div className="relative z-10">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20 text-xs font-bold mb-6">
                                        <Sparkles className="w-3 h-3 text-yellow-300" />
                                        Active Subscription
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                                        <div>
                                            <h2 className="text-4xl font-black tracking-tight mb-2">{plan?.name || 'Free'} Plan</h2>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    {plan?.status || 'Active'}
                                                </span>
                                                {daysLeft !== null && (
                                                    <span className="inline-flex items-center gap-1.5 text-white/60 text-xs">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {daysLeft > 0
                                                            ? `Valid for ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}`
                                                            : 'Plan Expired'
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-5xl font-black tabular-nums">
                                                {getCurrency(plan?.currency)}{parseFloat(plan?.price || 0).toLocaleString()}
                                            </div>
                                            <div className="text-white/50 text-sm font-medium">{getIntervalLabel(plan?.interval)}</div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-5 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-white/50" />
                                            <span className="text-white/70">Logged in as <span className="text-white font-semibold">{user?.email}</span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Usage Card */}
                            <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-3xl p-4 md:p-7 border border-slate-200 dark:border-white/5 shadow-sm flex flex-col gap-6">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">This Month's Usage</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Resets {usage?.periodEnd ? new Date(usage.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'monthly'}
                                    </p>
                                </div>
                                <div className="space-y-5">
                                    <UsageBar
                                        label="Messages Sent"
                                        icon={MessageSquare}
                                        used={usage?.messagesSent ?? 0}
                                        limit={usage?.monthlyLimit ?? 30}
                                        color="bg-indigo-500"
                                    />
                                    <UsageBar
                                        label="Templates"
                                        icon={Layout}
                                        used={usage?.templateCount ?? 0}
                                        limit={usage?.templateLimit ?? 2}
                                        color="bg-violet-500"
                                    />
                                    <UsageBar
                                        label="Contacts"
                                        icon={Users}
                                        used={usage?.contactCount ?? 0}
                                        limit={usage?.contactLimit ?? 10}
                                        color="bg-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Plans Grid */}
                        <div>
                            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Available Plans</h2>
                                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Choose a plan and billing cycle that fits your needs.</p>
                                </div>
                                {/* Interval Switcher */}
                                {(hasMonthly || hasHalfYearly || hasYearly) && (
                                    <div className="flex bg-white dark:bg-surface-dark p-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                                    {plans.map(p => (
                                        <PlanCard
                                            key={p.id}
                                            plan={p}
                                            billingInterval={billingInterval}
                                            currentPlanName={plan?.name}
                                            usage={usage}
                                            onUpgrade={handleUpgrade}
                                        />
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;
