import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Smartphone, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { getThemeConfig } from '../../utils/wastoreThemes';
import { countryCodes, validatePhone } from '../../utils/phoneUtils';
import toast from 'react-hot-toast';

export default function StoreLoginPage({ store, products = [] }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { loginWithEmail, sendOtp, verifyOtp, authConfig, loading } = useStoreCustomer();

    // Tab: 'email' or 'otp'
    const hasEmail = authConfig?.methods?.includes('email_password');
    const hasOtp = authConfig?.methods?.includes('whatsapp_otp');
    const [tab, setTab] = useState(hasEmail ? 'email' : 'otp');

    // Email/Password state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    // OTP state
    const [phone, setPhone] = useState('');
    const [dialCode, setDialCode] = useState('+91');
    const [phoneError, setPhoneError] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);

    const [submitting, setSubmitting] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const theme = getThemeConfig(store?.themeCustomizations?.theme || 'modern', store?.themeCustomizations);
    const themeColor = store?.themeCustomizations?.primaryColor || '#6366f1';

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await loginWithEmail(email, password);
            toast.success('Welcome back!');
            navigate(`/store/${slug}/account`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendOtp = async () => {
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (!cleanPhone) { setPhoneError('Enter a phone number'); return; }
        if (!validatePhone(dialCode, cleanPhone)) { setPhoneError('Invalid phone format'); return; }

        setSubmitting(true);
        try {
            await sendOtp(`${dialCode}${cleanPhone}`);
            setOtpSent(true);
            toast.success('OTP sent to your WhatsApp!');
            // 60-second cooldown
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
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        try {
            await verifyOtp(`${dialCode}${cleanPhone}`, otp);
            toast.success('Logged in successfully!');
            navigate(`/store/${slug}/account`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid OTP. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !store) return null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/70 font-sans text-slate-900 selection:bg-slate-900 selection:text-white">


            {/* Auth Page Body */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full mx-auto">
                    {/* Store Logo & Header */}
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
                        {/* Auth method tabs */}
                        {hasEmail && hasOtp && (
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
                                            layoutId="loginTabPill"
                                            className="absolute inset-0 rounded-xl shadow-sm"
                                            style={{ backgroundColor: themeColor }}
                                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
                                            layoutId="loginTabPill"
                                            className="absolute inset-0 rounded-xl shadow-sm"
                                            style={{ backgroundColor: themeColor }}
                                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                        />
                                    )}
                                    <span className="relative z-10">WhatsApp OTP</span>
                                </button>
                            </div>
                        )}

                        {/* ── Email + Password Form ── */}
                        <AnimatePresence mode="wait">
                            {tab === 'email' && (
                                <motion.form 
                                    key="email"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.12, ease: 'easeInOut' }}
                                    onSubmit={handleEmailLogin} 
                                    className="space-y-4"
                                >
                                    <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address or WhatsApp Number</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="email" 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="you@example.com" 
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                            style={{ '--tw-ring-color': themeColor }} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type={showPwd ? 'text' : 'password'} 
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)}
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
                                    <div className="text-right mt-1.5">
                                        <Link 
                                            to={`/store/${slug}/account/forgot-password`}
                                            className="text-xs font-medium hover:underline" 
                                            style={{ color: themeColor }}
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all hover:opacity-95 disabled:opacity-60"
                                    style={{ background: themeColor }}
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {submitting ? 'Signing in…' : 'Sign In'}
                                </button>
                                </motion.form>
                            )}

                            {/* ── WhatsApp OTP Form ── */}
                            {tab === 'otp' && (
                                <motion.form 
                                    key="otp"
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
                                                value={dialCode}
                                                onChange={e => {
                                                    setDialCode(e.target.value);
                                                    if (phone) {
                                                        const isValid = validatePhone(e.target.value, phone);
                                                        setPhoneError(isValid ? '' : 'Invalid format for selected country');
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
                                                value={phone} 
                                                onChange={e => {
                                                    setPhone(e.target.value);
                                                    if (e.target.value) {
                                                        const isValid = validatePhone(dialCode, e.target.value);
                                                        setPhoneError(isValid ? '' : 'Invalid format');
                                                    } else {
                                                        setPhoneError('');
                                                    }
                                                }}
                                                placeholder="9876543210"
                                                required
                                                disabled={otpSent}
                                                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 disabled:bg-slate-50 ${phoneError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200'}`} 
                                                style={{ '--tw-ring-color': phoneError ? '#fca5a5' : themeColor }}
                                            />
                                        </div>
                                    </div>
                                    {phoneError && <p className="text-[10px] text-red-500 mt-1 font-medium">{phoneError}</p>}
                                </div>

                                {!otpSent ? (
                                    <button 
                                        type="button" 
                                        onClick={handleSendOtp} 
                                        disabled={submitting}
                                        className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60"
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
                                            className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60"
                                            style={{ background: themeColor }}
                                        >
                                            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                            Verify &amp; Login
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={handleSendOtp} 
                                            disabled={otpCooldown > 0 || submitting}
                                            className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40"
                                        >
                                            {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : 'Resend OTP'}
                                        </button>
                                    </>
                                )}
                            </form>
                        )}

                        {/* Register link */}
                        {hasEmail && (
                            <p className="text-center text-xs font-medium text-slate-500 mt-6 pt-4 border-t border-slate-100">
                                Don't have an account?{' '}
                                <Link to={`/store/${slug}/account/register`} className="font-bold hover:underline" style={{ color: themeColor }}>
                                    Create Account
                                </Link>
                            </p>
                        )}
                    </div>

                    <div className="text-center mt-6">
                        <Link to={`/store/${slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
                            <ArrowLeft size={14} /> Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>


        </div>
    );
}
