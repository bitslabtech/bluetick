import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Check, Eye, EyeOff, MessageSquare, Users, Layers, TrendingUp, Sparkles, Shield, Store, CreditCard, Megaphone } from 'lucide-react';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion } from 'framer-motion';

const CURRENCY_SYMBOLS = {
    USD: '$', INR: '₹', EUR: '€', GBP: '£',
    AED: 'د.إ', SAR: 'SR', AUD: 'A$', CAD: 'C$',
    SGD: 'S$', MYR: 'RM'
};

const COUNTRY_CODES = [
    { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India' },
    { code: 'US', dial: '+1', flag: '🇺🇸', name: 'USA' },
    { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'UK' },
    { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
    { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada' },
    { code: 'SG', dial: '+65', flag: '🇸🇬', name: 'Singapore' },
    { code: 'MY', dial: '+60', flag: '🇲🇾', name: 'Malaysia' },
    { code: 'PK', dial: '+92', flag: '🇵🇰', name: 'Pakistan' },
    { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh' },
    { code: 'LK', dial: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
    { code: 'NP', dial: '+977', flag: '🇳🇵', name: 'Nepal' },
    { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France' },
    { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
    { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa' },
    { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya' },
    { code: 'BR', dial: '+55', flag: '🇧🇷', name: 'Brazil' },
    { code: 'ID', dial: '+62', flag: '🇮🇩', name: 'Indonesia' },
    { code: 'PH', dial: '+63', flag: '🇵🇭', name: 'Philippines' },
    { code: 'TH', dial: '+66', flag: '🇹🇭', name: 'Thailand' },
    { code: 'EG', dial: '+20', flag: '🇪🇬', name: 'Egypt' },
];

// Per-country subscriber number lengths (digits after the dial code)
// Source: ITU-T E.164 national significant number lengths
const PHONE_LENGTHS = {
    '+91': { min: 10, max: 10 }, // India
    '+1': { min: 10, max: 10 }, // USA / Canada
    '+44': { min: 10, max: 10 }, // UK
    '+971': { min: 9, max: 9 }, // UAE
    '+966': { min: 9, max: 9 }, // Saudi Arabia
    '+61': { min: 9, max: 9 }, // Australia
    '+65': { min: 8, max: 8 }, // Singapore
    '+60': { min: 9, max: 11 }, // Malaysia
    '+92': { min: 10, max: 10 }, // Pakistan
    '+880': { min: 10, max: 10 }, // Bangladesh
    '+94': { min: 9, max: 9 }, // Sri Lanka
    '+977': { min: 10, max: 10 }, // Nepal
    '+49': { min: 10, max: 11 }, // Germany
    '+33': { min: 9, max: 9 }, // France
    '+234': { min: 10, max: 10 }, // Nigeria
    '+27': { min: 9, max: 9 }, // South Africa
    '+254': { min: 9, max: 9 }, // Kenya
    '+55': { min: 10, max: 11 }, // Brazil
    '+62': { min: 9, max: 12 }, // Indonesia
    '+63': { min: 10, max: 10 }, // Philippines
    '+66': { min: 9, max: 9 }, // Thailand
    '+20': { min: 10, max: 10 }, // Egypt
};

const getPhoneLength = (dial) => PHONE_LENGTHS[dial] || { min: 6, max: 15 };

const FEATURE_HIGHLIGHTS = [
    {
        title: "WhatsApp Automation & CRM",
        desc: "Automate responses, manage chat flows, and orchestrate customer pipelines.",
        icon: MessageSquare,
        colorClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20",
        tag: "Automation"
    },
    {
        title: "Online Store Manager",
        desc: "Launch catalogs, manage checkouts, and handle customer shopping instantly.",
        icon: Store,
        colorClass: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20",
        tag: "E-Commerce"
    },
    {
        title: "VeCards (Virtual Business Cards)",
        desc: "Create premium digital cards, share them via QR, and track networking engagement.",
        icon: CreditCard,
        colorClass: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20",
        tag: "Growth Tools"
    },
    {
        title: "Meta Ads Marketing",
        desc: "Publish and scale Instagram and Facebook lead-generation ads directly.",
        icon: Megaphone,
        colorClass: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20",
        tag: "Advertising"
    }
];

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [dialCode, setDialCode] = useState('+91');
    const [localNumber, setLocalNumber] = useState('');
    const [phone, setPhone] = useState('+91');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [mockMessages, setMockMessages] = useState([]);

    // ── OTP verification state ──
    const [otpStep, setOtpStep] = useState('idle');      // 'idle' | 'sending' | 'input' | 'verifying' | 'verified'
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpError, setOtpError] = useState('');
    const [phoneVerifiedToken, setPhoneVerifiedToken] = useState(null);
    const [otpExpiry, setOtpExpiry] = useState(0);      // seconds remaining until OTP expires
    const [cooldown, setCooldown] = useState(0);         // seconds remaining until resend allowed
    const otpExpiryRef = useRef(null);
    const cooldownRef = useRef(null);
    const otpInputRefs = useRef([]);

    useEffect(() => {
        const conversation = [
            { id: 1, sender: 'user', text: 'Hi! Are you open today? 👋' },
            { id: 2, sender: 'bot', text: 'Yes, we are open until 8 PM! How can I help you? 🏪' },
            { id: 3, sender: 'user', text: 'Awesome! Can you share the store catalog?' },
            { id: 4, sender: 'bot', text: 'Here is our digital catalog. Click below to browse! 📋', button: 'View Catalog 🛍️' },
        ];

        let index = 1;
        setMockMessages([conversation[0]]);

        const interval = setInterval(() => {
            index = (index + 1) % (conversation.length + 1);
            if (index === 0) {
                setMockMessages([]);
            } else {
                setMockMessages(conversation.slice(0, index));
            }
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    const { register } = useAuth();
    const { publicSettings, publicSettingsLoading } = useUI();
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const inviteToken = searchParams.get('invite');
    const refFromUrl = searchParams.get('ref');

    // Whether WhatsApp OTP is enabled in system config
    const otpEnabled = publicSettings?.whatsappOtpEnabled === true;

    // ── OTP timer helpers ──
    const startExpiryTimer = (seconds) => {
        if (otpExpiryRef.current) clearInterval(otpExpiryRef.current);
        setOtpExpiry(seconds);
        otpExpiryRef.current = setInterval(() => {
            setOtpExpiry(prev => {
                if (prev <= 1) { clearInterval(otpExpiryRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const startCooldownTimer = (seconds) => {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        setCooldown(seconds);
        cooldownRef.current = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (otpExpiryRef.current) clearInterval(otpExpiryRef.current);
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, []);

    // ── Send OTP ──
    const handleSendOtp = async () => {
        const { min, max } = getPhoneLength(dialCode);
        if (localNumber.length < min || localNumber.length > max) {
            const hint = min === max ? `${min} digits` : `${min}–${max} digits`;
            setOtpError(`Please enter a valid phone number (${hint} for ${dialCode}).`);
            return;
        }
        setOtpError('');
        setOtpStep('sending');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/send-otp`, { phone });
            setOtpDigits(['', '', '', '', '', '']);
            setOtpStep('input');
            startExpiryTimer(res.data.expiresIn || 300);
            startCooldownTimer(res.data.cooldownSec || 60);
            // Focus first OTP box
            setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to send verification code. Try again.';
            const retryAfter = err.response?.data?.retryAfterSec;
            if (retryAfter) startCooldownTimer(retryAfter);
            setOtpError(msg);
            setOtpStep(otpStep === 'sending' ? 'idle' : otpStep);
        }
    };

    // ── Verify OTP ──
    const handleVerifyOtp = async (digits) => {
        const code = (digits || otpDigits).join('');
        if (code.length < 6) return;
        setOtpError('');
        setOtpStep('verifying');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/verify-otp`, { phone, otp: code });
            setPhoneVerifiedToken(res.data.phoneVerifiedToken);
            setOtpStep('verified');
            if (otpExpiryRef.current) clearInterval(otpExpiryRef.current);
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        } catch (err) {
            setOtpError(err.response?.data?.error || 'Incorrect code. Please try again.');
            setOtpStep('input');
            setOtpDigits(['', '', '', '', '', '']);
            setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
        }
    };

    // ── OTP digit box key handler ──
    const handleOtpKey = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    // ── OTP digit change ──
    const handleOtpDigit = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const next = [...otpDigits];
        next[index] = digit;
        setOtpDigits(next);
        if (digit && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
        // Auto-submit when all 6 filled
        if (next.every(d => d !== '') && next.join('').length === 6) {
            handleVerifyOtp(next);
        }
    };

    // ── Reset OTP when phone number changes ──
    useEffect(() => {
        if (otpStep !== 'idle') {
            setOtpStep('idle');
            setPhoneVerifiedToken(null);
            setOtpDigits(['', '', '', '', '', '']);
            setOtpError('');
            if (otpExpiryRef.current) clearInterval(otpExpiryRef.current);
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phone]);

    // ── Referral code helpers ──
    const REF_KEY = 'referral_code';
    const REF_EXPIRY_KEY = 'referral_code_expiry';

    const getSavedReferralCode = () => {
        const code = localStorage.getItem(REF_KEY);
        const expiry = parseInt(localStorage.getItem(REF_EXPIRY_KEY) || '0', 10);
        if (code && Date.now() < expiry) return code;
        localStorage.removeItem(REF_KEY);
        localStorage.removeItem(REF_EXPIRY_KEY);
        return null;
    };

    const clearReferralCode = () => {
        localStorage.removeItem(REF_KEY);
        localStorage.removeItem(REF_EXPIRY_KEY);
    };

    // URL param takes priority over stored code
    const referralCode = refFromUrl || getSavedReferralCode();

    // ── Partner code helpers (B2B Tech Partner attribution) ──
    const PARTNER_KEY = 'partner_code';
    const PARTNER_EXPIRY_KEY = 'partner_code_expiry';
    const partnerFromUrl = searchParams.get('partner');

    const getSavedPartnerCode = () => {
        const code = localStorage.getItem(PARTNER_KEY);
        const expiry = parseInt(localStorage.getItem(PARTNER_EXPIRY_KEY) || '0', 10);
        if (code && Date.now() < expiry) return code;
        localStorage.removeItem(PARTNER_KEY);
        localStorage.removeItem(PARTNER_EXPIRY_KEY);
        return null;
    };

    const clearPartnerCode = () => {
        localStorage.removeItem(PARTNER_KEY);
        localStorage.removeItem(PARTNER_EXPIRY_KEY);
    };

    const partnerCode = (partnerFromUrl || getSavedPartnerCode() || '')?.toUpperCase() || null;


    // Sync combined phone state whenever dial code or local number changes
    useEffect(() => {
        setPhone(dialCode + localNumber.replace(/^0+/, ''));
    }, [dialCode, localNumber]);

    // Get plan ID and trial flag from URL
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const planId = searchParams.get('plan');
        const isTrial = searchParams.get('trial') === 'true';

        if (planId) {
            fetchPlanDetails(planId, isTrial);
        }
    }, [location]);

    const fetchPlanDetails = async (planId, isTrial = false) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/plans`);
            const plan = res.data.find(p => p.id === planId);
            if (plan) {
                const searchParams = new URLSearchParams(location.search);
                const reqInterval = searchParams.get('interval');
                if (reqInterval) plan.interval = reqInterval;
                plan.startTrial = isTrial && plan.trialDays > 0; // flag trial intent
                setSelectedPlan(plan);
            }
        } catch (err) {
            console.error('Failed to fetch plan details', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const { min: pMin, max: pMax } = getPhoneLength(dialCode);
        if (localNumber.length < pMin || localNumber.length > pMax) {
            const hint = pMin === pMax ? `${pMin} digits` : `${pMin}–${pMax} digits`;
            setError(`Please enter a valid phone number (${hint} for ${dialCode}).`);
            return;
        }

        // Enforce OTP verification before submission
        if (otpEnabled && otpStep !== 'verified') {
            setError('Please verify your WhatsApp number with the code before creating your account.');
            return;
        }

        if (TURNSTILE_SITE_KEY && !turnstileToken) {
            setError('Please complete the security check.');
            return;
        }

        // Pass selected plan ID, trial intent, and phone to backend
        const isTrial = selectedPlan?.startTrial || false;
        setIsSubmitting(true);
        const res = await register(name, email, password, selectedPlan?.id, referralCode, partnerCode, phone, isTrial, turnstileToken, phoneVerifiedToken);
        setIsSubmitting(false);

        if (res.success) {
            // Clear persisted codes so they can't be reused
            clearReferralCode();
            clearPartnerCode();
            // Process Team Invite if present
            if (inviteToken) {
                try {
                    await axios.post(`${import.meta.env.VITE_API_URL}/api/team/join`, { token: inviteToken });
                } catch (inviteErr) {
                    console.error('Failed to join team during registration:', inviteErr);
                }
            }

            // If user explicitly selected a plan (and didn't request a trial) OR it's a direct registration that got pushed to Pending
            const registeredUser = res.user;
            if (registeredUser?.planStatus === 'Pending') {
                let targetPlanForCheckout = selectedPlan;

                // If direct registration (selectedPlan is null), we use the assigned plan details (the default plan)
                if (!targetPlanForCheckout && registeredUser.planDetails) {
                    targetPlanForCheckout = registeredUser.planDetails;
                }

                if (targetPlanForCheckout) {
                    localStorage.setItem('pendingPlan', JSON.stringify({ ...targetPlanForCheckout, interval: targetPlanForCheckout.interval || 'month' }));
                    navigate('/checkout');
                    return;
                }
            }

            // If they started a trial plan or are free, go to dashboard
            navigate('/dashboard');
        } else {
            setError(res.error);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-display transition-colors duration-300">
            {/* Left Column - Branding & Plan/Platform Details (Only visible on desktop) */}
            <div className={`hidden md:flex md:w-[40%] xl:w-[35%] relative overflow-hidden ${(publicSettings?.registerBannerUrl) ? '' : 'border-r border-slate-200/50 dark:border-slate-800/50 flex-col justify-between p-10 lg:p-12'}`}>
                {(publicSettings?.registerBannerUrl) ? (
                    <img src={publicSettings.registerBannerUrl} alt="Promotional Banner" className="absolute inset-0 w-full h-full object-contain" />
                ) : (
                    <>
                        {/* Elegant Static Background */}
                        <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-900 -z-20" />

                        {/* Subtle Gradient Wash */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 dark:from-primary/10 dark:via-slate-900/50 dark:to-emerald-500/10 pointer-events-none -z-10" />

                        {/* Noise Texture */}
                        <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none mix-blend-overlay -z-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

                        {/* Soft Core Glow */}
                        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/20 dark:bg-primary/10 blur-[120px] pointer-events-none -z-10" />

                        {/* Logo Header */}
                        <div className="relative z-10 flex items-center gap-3">
                            {publicSettings?.logoUrl ? (
                                <img src={publicSettings.logoUrl} alt="Logo" className="h-10 w-auto object-contain rounded-lg" />
                            ) : (
                                <div className="p-2 bg-primary rounded-lg">
                                    <LayoutDashboard className="h-5 w-5 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Main Content Pane */}
                        <div className="relative z-10 my-auto py-6">
                            {selectedPlan ? (() => {
                                const sym = CURRENCY_SYMBOLS[publicSettings?.currency] || publicSettings?.currency || '$';
                                const interval = selectedPlan.interval || 'month';
                                let displayPrice = parseFloat(selectedPlan.price) || 0;
                                let intervalLabel = ' / mo';
                                if (interval === 'month' && parseFloat(selectedPlan.monthlyPrice) > 0) {
                                    displayPrice = parseFloat(selectedPlan.monthlyPrice);
                                    intervalLabel = ' / mo';
                                } else if (interval === 'half-year' && parseFloat(selectedPlan.halfYearlyPrice) > 0) {
                                    displayPrice = parseFloat(selectedPlan.halfYearlyPrice);
                                    intervalLabel = ' / 6 months';
                                } else if (interval === 'year' && parseFloat(selectedPlan.yearlyPrice) > 0) {
                                    displayPrice = parseFloat(selectedPlan.yearlyPrice);
                                    intervalLabel = ' / yr';
                                }

                                return (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">
                                        <div className="space-y-2">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Selected Plan
                                            </span>
                                            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                                                {selectedPlan.name}
                                            </h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                                {selectedPlan.description || 'Unlock the full potential of your business communication.'}
                                            </p>
                                        </div>

                                        {selectedPlan.startTrial && (
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl space-y-1">
                                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                                                    <span className="flex h-2 w-2 relative">
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                    {selectedPlan.trialDays}-Day Free Trial Active
                                                </div>
                                                <p className="text-xs text-emerald-600/80 dark:text-slate-300">
                                                    Enjoy full access for free. No charges will be made today.
                                                </p>
                                            </div>
                                        )}

                                        <div className="py-4 border-y border-slate-100 dark:border-slate-800/60">
                                            <div className="flex items-baseline gap-1 text-slate-900 dark:text-white">
                                                <span className="text-4xl font-extrabold tracking-tight">{sym}{displayPrice.toLocaleString()}</span>
                                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{intervalLabel}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">What's included</h4>
                                            <ul className="space-y-3.5">
                                                <li className="flex items-start gap-3">
                                                    <div className="mt-0.5 shrink-0 p-1 bg-primary/10 rounded-md text-primary">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                                                        <strong className="text-slate-900 dark:text-white font-semibold">{selectedPlan.messageLimit?.toLocaleString()}</strong> messages per month
                                                    </span>
                                                </li>

                                                <li className="flex items-start gap-3">
                                                    <div className="mt-0.5 shrink-0 p-1 bg-primary/10 rounded-md text-primary">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                                                        <strong className="text-slate-900 dark:text-white font-semibold">{selectedPlan.contactLimit?.toLocaleString()}</strong> contacts
                                                    </span>
                                                </li>

                                                {selectedPlan.templateLimit > 0 && (
                                                    <li className="flex items-start gap-3">
                                                        <div className="mt-0.5 shrink-0 p-1 bg-primary/10 rounded-md text-primary">
                                                            <Check className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                                                            <strong className="text-slate-900 dark:text-white font-semibold">{selectedPlan.templateLimit}</strong> message templates
                                                        </span>
                                                    </li>
                                                )}

                                                {selectedPlan.teamMemberLimit > 0 && (
                                                    <li className="flex items-start gap-3">
                                                        <div className="mt-0.5 shrink-0 p-1 bg-primary/10 rounded-md text-primary">
                                                            <Check className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                                                            <strong className="text-slate-900 dark:text-white font-semibold">{selectedPlan.teamMemberLimit}</strong> team members
                                                        </span>
                                                    </li>
                                                )}

                                                {Array.isArray(selectedPlan.features) && selectedPlan.features.map((feature, idx) => feature?.trim() && (
                                                    <li key={idx} className="flex items-start gap-3">
                                                        <div className="mt-0.5 shrink-0 p-1 bg-primary/10 rounded-md text-primary">
                                                            <Check className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })() : null}
                        </div>
                    </>
                )}
            </div>

            {/* Right Column - Registration Form */}
            <div className="w-full md:w-[60%] xl:w-[65%] flex items-center justify-center p-6 sm:p-12 lg:p-16 overflow-y-auto">
                <div className="w-full max-w-lg space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-2xl border border-slate-200/80 dark:border-slate-800/50 shadow-sm">

                    {/* Header */}
                    <div className="text-center space-y-3">
                        <div className="flex justify-center mb-2">
                            {publicSettings?.logoUrl ? (
                                <img src={publicSettings.logoUrl} alt="Logo" className="h-12 w-auto object-contain rounded-xl" />
                            ) : (
                                <div className="p-3 bg-primary rounded-xl">
                                    <LayoutDashboard className="h-6 w-6 text-white" />
                                </div>
                            )}
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Create Account
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {!publicSettingsLoading && `Get started with ${publicSettings?.appName || 'Bluetick'}`}
                        </p>
                    </div>

                    {/* Mobile-Only Selected Plan Summary Card */}
                    {selectedPlan && (() => {
                        const sym = CURRENCY_SYMBOLS[publicSettings?.currency] || publicSettings?.currency || '$';
                        const interval = selectedPlan.interval || 'month';
                        let displayPrice = parseFloat(selectedPlan.price) || 0;
                        let intervalLabel = '/mo';
                        if (interval === 'month' && parseFloat(selectedPlan.monthlyPrice) > 0) {
                            displayPrice = parseFloat(selectedPlan.monthlyPrice);
                            intervalLabel = '/mo';
                        } else if (interval === 'half-year' && parseFloat(selectedPlan.halfYearlyPrice) > 0) {
                            displayPrice = parseFloat(selectedPlan.halfYearlyPrice);
                            intervalLabel = '/6m';
                        } else if (interval === 'year' && parseFloat(selectedPlan.yearlyPrice) > 0) {
                            displayPrice = parseFloat(selectedPlan.yearlyPrice);
                            intervalLabel = '/yr';
                        }

                        return (
                            <div className="md:hidden p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                        {selectedPlan.startTrial ? `🎉 Free Trial: ${selectedPlan.name}` : `Selected: ${selectedPlan.name}`}
                                    </span>
                                    <span className="text-sm font-semibold text-primary">
                                        {sym}{displayPrice.toLocaleString()}{intervalLabel}
                                    </span>
                                </div>
                                {selectedPlan.startTrial && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                        ✅ {selectedPlan.trialDays} days free trial. No credit card required.
                                    </p>
                                )}
                            </div>
                        );
                    })()}

                    {error && (
                        <div className="p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
                            {error}
                        </div>
                    )}

                    {/* Registration Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:placeholder-slate-600 placeholder-slate-400"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:placeholder-slate-600 placeholder-slate-400"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
                            
                            <div className="relative transition-all duration-300 ease-in-out">
                                {/* State 1: IDLE - Phone Input */}
                                {otpStep === 'idle' && (
                                    <div className="space-y-2 animate-[fadeIn_0.3s_ease-out]">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2 w-full">
                                                <select
                                                    value={dialCode}
                                                    onChange={(e) => setDialCode(e.target.value)}
                                                    className="w-[85px] sm:w-32 shrink-0 px-1 sm:px-2 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all cursor-pointer font-medium text-xs sm:text-sm"
                                                >
                                                    {COUNTRY_CODES.map(c => (
                                                        <option key={c.code + c.dial} value={c.dial} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                                                            {c.flag} {c.dial}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="relative flex-1 min-w-0">
                                                    <input
                                                        type="tel"
                                                        required
                                                        value={localNumber}
                                                        onChange={(e) => {
                                                            const digits = e.target.value.replace(/\D/g, '');
                                                            const { max } = getPhoneLength(dialCode);
                                                            setLocalNumber(digits.slice(0, max));
                                                        }}
                                                        className="w-full px-4 py-2.5 sm:pr-28 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:placeholder-slate-600 placeholder-slate-400"
                                                        placeholder={dialCode === '+91' ? '9876543210' : 'Phone number'}
                                                        maxLength={getPhoneLength(dialCode).max}
                                                    />
                                                    {otpEnabled && localNumber.length >= getPhoneLength(dialCode).min && (
                                                        <button
                                                            type="button"
                                                            onClick={handleSendOtp}
                                                            className="hidden sm:inline-flex absolute right-1.5 top-1.5 bottom-1.5 items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                                                        >
                                                            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.46-1.761-1.633-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                                            Send OTP
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {otpEnabled && localNumber.length >= getPhoneLength(dialCode).min && (
                                                <button
                                                    type="button"
                                                    onClick={handleSendOtp}
                                                    className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all"
                                                >
                                                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.46-1.761-1.633-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                                    Send WhatsApp Code
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                            Enter number without leading zero · {(() => { const { min, max } = getPhoneLength(dialCode); return min === max ? `${min} digits required` : `${min}–${max} digits`; })()}
                                        </p>
                                        {otpError && <p className="text-xs text-red-500 font-medium">{otpError}</p>}
                                    </div>
                                )}

                                {/* State 2: SENDING - Loader Block */}
                                {otpStep === 'sending' && (
                                    <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-emerald-500 rounded-full animate-spin mb-4" />
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sending Verification Code</p>
                                        <p className="text-xs text-slate-500 mt-1">Please wait a moment...</p>
                                    </div>
                                )}

                                {/* State 3: INPUT / VERIFYING - OTP Entry */}
                                {(otpStep === 'input' || otpStep === 'verifying') && (
                                    <div className="animate-[fadeIn_0.4s_ease-out] p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 shadow-inner">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                    Enter 6-digit code
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Sent via WhatsApp to <span className="font-semibold text-slate-700 dark:text-slate-300">{dialCode} {localNumber}</span>
                                                </p>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => { setOtpStep('idle'); setOtpError(''); }}
                                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition-colors px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg"
                                            >
                                                Edit Number
                                            </button>
                                        </div>
                                        
                                        <div className="flex gap-2 justify-center py-2">
                                            {otpDigits.map((digit, i) => (
                                                <input
                                                    key={i}
                                                    ref={el => otpInputRefs.current[i] = el}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    disabled={otpStep === 'verifying' || otpExpiry === 0}
                                                    onChange={(e) => handleOtpDigit(i, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKey(i, e)}
                                                    className="w-10 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                                                        border-slate-200 dark:border-slate-700
                                                        bg-white dark:bg-slate-900
                                                        text-slate-900 dark:text-white
                                                        focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30
                                                        disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                                />
                                            ))}
                                        </div>

                                        {otpStep === 'verifying' ? (
                                            <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                                                Verifying code...
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between text-xs px-1">
                                                {otpExpiry > 0 ? (
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Expires in {otpExpiry}s</span>
                                                ) : (
                                                    <span className="text-red-500 font-semibold">Code expired</span>
                                                )}
                                                
                                                <button
                                                    type="button"
                                                    disabled={cooldown > 0}
                                                    onClick={handleSendOtp}
                                                    className="font-semibold text-emerald-600 dark:text-emerald-400 disabled:text-slate-400 dark:disabled:text-slate-600 hover:underline transition-colors"
                                                >
                                                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                                                </button>
                                            </div>
                                        )}

                                        {otpError && <p className="text-xs text-red-500 font-medium text-center">{otpError}</p>}
                                    </div>
                                )}

                                {/* State 4: VERIFIED - Success Block */}
                                {otpStep === 'verified' && (
                                    <div className="animate-[fadeIn_0.4s_ease-out] flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shrink-0">
                                                <Check className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">WhatsApp Verified</p>
                                                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500/80 mt-0.5">{dialCode} {localNumber}</p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => { setOtpStep('idle'); setPhoneVerifiedToken(null); }}
                                            className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
                                        >
                                            Edit Number
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-10 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:placeholder-slate-600 placeholder-slate-400"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-455 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {TURNSTILE_SITE_KEY && (
                            <div className="flex justify-center mt-4">
                                <Turnstile
                                    siteKey={TURNSTILE_SITE_KEY}
                                    onSuccess={(token) => setTurnstileToken(token)}
                                    onError={() => setError('Captcha verification failed. Please refresh.')}
                                    onExpire={() => setTurnstileToken('')}
                                />
                            </div>
                        )}

                        <div className="relative group w-full mt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || (otpEnabled && otpStep !== 'verified')}
                                className="w-full py-2.5 bg-primary text-white rounded-xl hover:opacity-90 font-medium transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
                            >
                                {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {isSubmitting ? 'Processing...' : (selectedPlan?.startTrial
                                    ? `🎉 Start ${selectedPlan.trialDays}-Day Free Trial`
                                    : selectedPlan && selectedPlan.price > 0
                                        ? 'Continue to Payment'
                                        : 'Create Account')}
                            </button>

                            {/* Hover Tooltip for disabled state */}
                            {otpEnabled && otpStep !== 'verified' && !isSubmitting && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-max max-w-[280px] text-center opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 pointer-events-none z-10 px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium rounded-lg shadow-xl">
                                    Verify your WhatsApp number to create an account
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45" />
                                </div>
                            )}
                        </div>
                    </form>

                    <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:underline font-semibold">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
