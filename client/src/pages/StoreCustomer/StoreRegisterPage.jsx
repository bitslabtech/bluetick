import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Phone, Smartphone, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { getThemeConfig } from '../../utils/wastoreThemes';
import { countryCodes, validatePhone } from '../../utils/phoneUtils';
import toast from 'react-hot-toast';
import { getStoreRoute } from '../../utils/storeRouting';

export default function StoreRegisterPage({ store, products = [] }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { register, sendOtp, verifyOtp, authConfig } = useStoreCustomer();

    const hasEmailMethod = authConfig?.methods?.includes('email_password');
    const hasOtpMethod = authConfig?.methods?.includes('whatsapp_otp');
    const [tab, setTab] = useState(hasEmailMethod ? 'email' : 'otp');

    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
    const [dialCode, setDialCode] = useState('+91');
    const [phoneError, setPhoneError] = useState('');
    
    const [otpPhone, setOtpPhone] = useState('');
    const [otpDialCode, setOtpDialCode] = useState('+91');
    const [otpPhoneError, setOtpPhoneError] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);

    const [showPwd, setShowPwd] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const whatsappReq = authConfig?.whatsappRequirement || 'optional';

    const theme = getThemeConfig(store?.themeCustomizations?.theme || 'modern', store?.themeCustomizations);
    const themeColor = store?.themeCustomizations?.primaryColor || '#6366f1';

    const passwordStrength = (pwd) => {
        if (!pwd) return { level: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        const map = [
            { level: 1, label: 'Weak', color: '#ef4444' },
            { level: 2, label: 'Fair', color: '#f59e0b' },
            { level: 3, label: 'Good', color: '#3b82f6' },
            { level: 4, label: 'Strong', color: '#22c55e' },
        ];
        return map[score - 1] || { level: 1, label: 'Weak', color: '#ef4444' };
    };

    const strength = passwordStrength(form.password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) { toast.error('Passwords do not match.'); return; }
        if (form.password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
        
        const cleanPhone = form.phone.replace(/[\s\-\(\)]/g, '');
        if (whatsappReq === 'mandatory' && !cleanPhone) {
            setPhoneError('WhatsApp number is required.');
            return;
        }
        
        if (cleanPhone && !validatePhone(dialCode, cleanPhone)) {
            setPhoneError('Invalid phone number format.');
            return;
        }

        const fullPhone = cleanPhone ? `${dialCode}${cleanPhone}` : '';

        setSubmitting(true);
        try {
            await register(form.name, form.email, form.password, fullPhone);
            toast.success('Account created! Welcome 🎉');
            navigate(getStoreRoute(slug, `/account`));
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendOtp = async () => {
        const cleanPhone = otpPhone.replace(/[\s\-\(\)]/g, '');
        if (!cleanPhone) { setOtpPhoneError('Enter a phone number'); return; }
        if (!validatePhone(otpDialCode, cleanPhone)) { setOtpPhoneError('Invalid phone format'); return; }

        setSubmitting(true);
        try {
            await sendOtp(`${otpDialCode}${cleanPhone}`);
            setOtpSent(true);
            toast.success('OTP sent to your WhatsApp!');
            let secs = 60;
            setOtpCooldown(secs);
            const t = setInterval(() => { secs--; setOtpCooldown(secs); if (secs <= 0) clearInterval(t); }, 1000);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send OTP.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const cleanPhone = otpPhone.replace(/[\s\-\(\)]/g, '');
        try {
            await verifyOtp(`${otpDialCode}${cleanPhone}`, otp);
            toast.success('Account created & logged in!');
            navigate(getStoreRoute(slug, `/account`));
        } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid OTP. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!store) return null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/70 font-sans text-slate-900 selection:bg-slate-900 selection:text-white">


            {/* Main Auth Container */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full mx-auto">
                    <div className="text-center mb-8">
                        {store?.logo && (
                            <img 
                                src={store.logo.startsWith('http') ? store.logo : `${import.meta.env.VITE_API_URL}${store.logo}`}
                                alt={store.name} 
                                className="h-14 mx-auto mb-6 object-contain" 
                            />
                        )}
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/80 p-6 sm:p-8">
                        {/* Tab Navigation */}
                        {hasEmailMethod && hasOtpMethod && (
                            <div className="relative flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6">
                                <button 
                                    type="button"
                                    onClick={() => setTab('email')}
                                    className={`relative z-10 flex-1 py-2 text-xs font-bold rounded-xl transition-colors duration-200 ${
                                        tab === 'email' ? 'text-white' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    {tab === 'email' && (
                                        <motion.div
                                            layoutId="registerTabPill"
                                            className="absolute inset-0 rounded-xl shadow-sm"
                                            style={{ backgroundColor: themeColor }}
                                            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                                        />
                                    )}
                                    <span className="relative z-10">Email Login</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setTab('otp')}
                                    className={`relative z-10 flex-1 py-2 text-xs font-bold rounded-xl transition-colors duration-200 ${
                                        tab === 'otp' ? 'text-white' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    {tab === 'otp' && (
                                        <motion.div
                                            layoutId="registerTabPill"
                                            className="absolute inset-0 rounded-xl shadow-sm"
                                            style={{ backgroundColor: themeColor }}
                                            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                                        />
                                    )}
                                    <span className="relative z-10">WhatsApp OTP</span>
                                </button>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {!hasEmailMethod && tab === 'email' ? (
                                <motion.div 
                                    key="disabled"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.12, ease: 'easeInOut' }}
                                    className="text-center py-4"
                                >
                                    <p className="text-sm font-medium text-slate-600">Email registration is not enabled for this store.</p>
                                    <button onClick={() => setTab('otp')} className="mt-4 font-bold text-xs hover:underline" style={{ color: themeColor }}>
                                        Use WhatsApp OTP
                                    </button>
                                </motion.div>
                            ) : tab === 'email' ? (
                                <motion.form 
                                    key="email-form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.12, ease: 'easeInOut' }}
                                    onSubmit={handleSubmit} 
                                    className="space-y-4"
                                >
                                    {/* Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={form.name} 
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="John Doe" 
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" 
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="email" 
                                            value={form.email} 
                                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            placeholder="you@example.com" 
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" 
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        WhatsApp Number {whatsappReq === 'optional' ? '(Optional)' : <span className="text-red-500">*</span>}
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="w-[100px] shrink-0">
                                            <select 
                                                value={dialCode}
                                                onChange={e => {
                                                    setDialCode(e.target.value);
                                                    if (form.phone) {
                                                        const isValid = validatePhone(e.target.value, form.phone);
                                                        setPhoneError(isValid ? '' : 'Invalid format for selected country');
                                                    }
                                                }}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-slate-50 appearance-none"
                                                style={{ '--tw-ring-color': themeColor }}
                                            >
                                                {countryCodes.map(c => (
                                                    <option key={c.code} value={c.dialCode}>
                                                        {c.code} ({c.dialCode})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="relative flex-1 min-w-0">
                                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="tel" 
                                                value={form.phone} 
                                                onChange={e => {
                                                    setForm(f => ({ ...f, phone: e.target.value }));
                                                    if (e.target.value) {
                                                        const isValid = validatePhone(dialCode, e.target.value);
                                                        setPhoneError(isValid ? '' : 'Invalid format');
                                                    } else {
                                                        setPhoneError('');
                                                    }
                                                }}
                                                placeholder="9876543210"
                                                required={whatsappReq === 'mandatory'}
                                                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${phoneError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200'}`} 
                                                style={{ '--tw-ring-color': phoneError ? '#fca5a5' : themeColor }}
                                            />
                                        </div>
                                    </div>
                                    {phoneError && <p className="text-[10px] text-red-500 mt-1 font-medium">{phoneError}</p>}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type={showPwd ? 'text' : 'password'} 
                                            value={form.password} 
                                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                            placeholder="••••••••" 
                                            required
                                            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPwd(!showPwd)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    
                                    {/* Strength meter */}
                                    {form.password && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                                                {[1, 2, 3, 4].map(l => (
                                                    <div 
                                                        key={l}
                                                        className="flex-1 h-full rounded-full transition-all duration-300"
                                                        style={{ background: l <= strength.level ? strength.color : '#e2e8f0' }}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs font-bold shrink-0" style={{ color: strength.color }}>{strength.label}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Confirm Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="password" 
                                            value={form.confirm} 
                                            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                                            placeholder="Re-enter password" 
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" 
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all hover:opacity-95 disabled:opacity-60 pt-3"
                                    style={{ background: themeColor }}
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {submitting ? 'Creating account…' : 'Create Account'}
                                </button>

                                <p className="text-center text-xs font-medium text-slate-500 mt-6 pt-4 border-t border-slate-100">
                                    Already have an account?{' '}
                                    <Link to={getStoreRoute(slug, `/account/login`)} className="font-bold hover:underline" style={{ color: themeColor }}>
                                        Sign In
                                    </Link>
                                </p>
                                </motion.form>
                            ) : (
                                <motion.form 
                                    key="otp-form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.12, ease: 'easeInOut' }}
                                    onSubmit={handleVerifyOtp} 
                                    className="space-y-4"
                                >
                                    {/* Phone */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                                    <div className="flex gap-2">
                                        <div className="w-[100px] shrink-0">
                                            <select 
                                                value={otpDialCode}
                                                onChange={e => {
                                                    setOtpDialCode(e.target.value);
                                                    if (otpPhone) {
                                                        const isValid = validatePhone(e.target.value, otpPhone);
                                                        setOtpPhoneError(isValid ? '' : 'Invalid format for selected country');
                                                    }
                                                }}
                                                disabled={otpSent}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-slate-50 appearance-none disabled:opacity-70"
                                                style={{ '--tw-ring-color': themeColor }}
                                            >
                                                {countryCodes.map(c => (
                                                    <option key={c.code} value={c.dialCode}>
                                                        {c.code} ({c.dialCode})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="relative flex-1 min-w-0">
                                            <Smartphone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="tel" 
                                                value={otpPhone} 
                                                onChange={e => {
                                                    setOtpPhone(e.target.value);
                                                    if (e.target.value) {
                                                        const isValid = validatePhone(otpDialCode, e.target.value);
                                                        setOtpPhoneError(isValid ? '' : 'Invalid format');
                                                    } else {
                                                        setOtpPhoneError('');
                                                    }
                                                }}
                                                placeholder="9876543210"
                                                required
                                                disabled={otpSent}
                                                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 disabled:bg-slate-50 ${otpPhoneError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200'}`} 
                                                style={{ '--tw-ring-color': otpPhoneError ? '#fca5a5' : themeColor }}
                                            />
                                        </div>
                                    </div>
                                    {otpPhoneError && <p className="text-[10px] text-red-500 mt-1 font-medium">{otpPhoneError}</p>}
                                </div>

                                {!otpSent ? (
                                    <button 
                                        type="button" 
                                        onClick={handleSendOtp} 
                                        disabled={submitting}
                                        className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60 pt-3"
                                        style={{ background: themeColor }}
                                    >
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                        Send OTP via WhatsApp
                                    </button>
                                ) : (
                                    <>
                                        <div className="p-3 bg-emerald-50 rounded-2xl flex items-start gap-2 text-xs font-medium text-emerald-800 border border-emerald-100">
                                            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                                            OTP sent! Check your WhatsApp messages.
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Enter 6-Digit OTP</label>
                                            <input 
                                                type="text" 
                                                inputMode="numeric" 
                                                maxLength={6} 
                                                value={otp} 
                                                onChange={e => setOtp(e.target.value)}
                                                placeholder="123456" 
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2" 
                                            />
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={submitting || otp.length < 6}
                                            className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60 pt-3"
                                            style={{ background: themeColor }}
                                        >
                                            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                            Verify &amp; Create Account
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={handleSendOtp} 
                                            disabled={otpCooldown > 0 || submitting}
                                            className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40"
                                        >
                                            {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                                        </button>
                                    </>
                                )}
                                <p className="text-center text-xs font-medium text-slate-500 mt-6 pt-4 border-t border-slate-100">
                                    Already have an account?{' '}
                                    <Link to={getStoreRoute(slug, `/account/login`)} className="font-bold hover:underline" style={{ color: themeColor }}>
                                        Sign In
                                    </Link>
                                </p>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>


        </div>
    );
}
