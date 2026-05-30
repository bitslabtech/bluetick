import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Check } from 'lucide-react';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import { Turnstile } from '@marsidev/react-turnstile';

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

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [dialCode, setDialCode] = useState('+91');
    const [localNumber, setLocalNumber] = useState('');
    const [phone, setPhone] = useState('+91');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
    const [selectedPlan, setSelectedPlan] = useState(null);
    const { register } = useAuth();
    const { publicSettings, publicSettingsLoading } = useUI();
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const inviteToken = searchParams.get('invite');
    const refFromUrl = searchParams.get('ref');

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

        if (localNumber.length < 5) {
            setError('Please enter a valid phone number.');
            return;
        }

        if (TURNSTILE_SITE_KEY && !turnstileToken) {
            setError('Please complete the security check.');
            return;
        }

        // Pass selected plan ID, trial intent, and phone to backend
        const isTrial = selectedPlan?.startTrial || false;
        setIsSubmitting(true);
        const res = await register(name, email, password, selectedPlan?.id, referralCode, partnerCode, phone, isTrial, turnstileToken);
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
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-md p-6 sm:p-4 md:p-8 space-y-6 bg-white rounded-xl shadow-lg border border-slate-100 mx-4 sm:mx-0">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        {publicSettings?.logoUrl ? (
                            <img src={publicSettings.logoUrl} alt="Logo" className="h-16 w-auto object-contain rounded-xl" />
                        ) : (
                            <div className="p-3 bg-primary rounded-xl">
                                <LayoutDashboard className="h-8 w-8 text-white" />
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent mt-2">
                        Create Account
                    </h1>
                    <p className="text-slate-500 min-h-[1.5rem] flex items-center justify-center">
                        {!publicSettingsLoading && `Get started with ${publicSettings?.appName || 'Bluetick'}`}
                    </p>
                </div>

                {/* Selected Plan Display */}
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
                        intervalLabel = '/6 months';
                    } else if (interval === 'year' && parseFloat(selectedPlan.yearlyPrice) > 0) {
                        displayPrice = parseFloat(selectedPlan.yearlyPrice);
                        intervalLabel = '/year';
                    }
                    return (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <Check className="w-4 h-4 text-primary" />
                                {selectedPlan.startTrial ? `🎉 Starting ${selectedPlan.trialDays}-Day Free Trial` : `Selected Plan: ${selectedPlan.name}`}
                            </h3>
                            {selectedPlan.startTrial && (
                                <div className="mb-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold">
                                    ✅ No payment needed now. You'll get full access to <strong>{selectedPlan.name}</strong> for {selectedPlan.trialDays} days free.
                                </div>
                            )}
                            <p className="text-sm text-slate-600 mb-2">
                                {sym}{displayPrice.toLocaleString()}{intervalLabel}{selectedPlan.description ? ` — ${selectedPlan.description}` : ''}
                            </p>
                            <ul className="text-xs text-primary space-y-1">
                                <li>• {selectedPlan.messageLimit?.toLocaleString()} messages/month</li>
                                <li>• {selectedPlan.contactLimit?.toLocaleString()} contacts</li>
                                {selectedPlan.templateLimit > 0 && <li>• {selectedPlan.templateLimit} templates</li>}
                                {selectedPlan.teamMemberLimit > 0 && <li>• {selectedPlan.teamMemberLimit} team members</li>}
                            </ul>
                        </div>
                    );
                })()}

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Phone Number</label>
                        <div className="flex gap-2">
                            {/* Country Code Selector */}
                            <select
                                value={dialCode}
                                onChange={(e) => setDialCode(e.target.value)}
                                className="w-32 shrink-0 px-2 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white cursor-pointer"
                            >
                                {COUNTRY_CODES.map(c => (
                                    <option key={c.code + c.dial} value={c.dial}>
                                        {c.flag} {c.dial}
                                    </option>
                                ))}
                            </select>
                            {/* Local Number */}
                            <input
                                type="tel"
                                required
                                value={localNumber}
                                onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 min-w-0 px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="9876543210"
                                maxLength={12}
                            />
                        </div>
                        <p className="text-xs text-slate-400">Enter number without leading zero</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
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

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 bg-primary text-white rounded-lg hover:opacity-90 font-medium transition-colors shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {isSubmitting ? 'Processing...' : (selectedPlan?.startTrial
                            ? `🎉 Start ${selectedPlan.trialDays}-Day Free Trial`
                            : selectedPlan && selectedPlan.price > 0
                            ? 'Continue to Payment'
                            : 'Create Account')}
                    </button>
                </form>

                <div className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:opacity-80 font-medium">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
