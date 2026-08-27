import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, MessageCircle, Phone, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import WaStoreHeader from '../../components/WaStoreHeader';
import WaStoreFooter from '../../components/WaStoreFooter';
import { getThemeConfig } from '../../utils/wastoreThemes';
import toast from 'react-hot-toast';
import { getStoreRoute } from '../../utils/storeRouting';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { countryCodes, validatePhone } from '../../utils/phoneUtils';

// ── Forgot Password Page ──────────────────────────────────────────────────────
// Supports two reset flows:
//  1. Email link  — classic reset email (requires store SMTP to be configured)
//  2. WhatsApp OTP — verify via OTP then set new password (no SMTP needed)

export default function StoreForgotPasswordPage({ store, products = [] }) {
    const { slug } = useParams();
    const [isCartOpen, setIsCartOpen] = useState(false);

    // ── Email flow state ──────────────────────────────────────────────────────
    const [email, setEmail] = useState('');
    const [emailSubmitted, setEmailSubmitted] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [smtpUnavailable, setSmtpUnavailable] = useState(false);

    // ── WhatsApp OTP flow state ───────────────────────────────────────────────
    // step: 'idle' → 'otp_sent' → 'set_password' → 'done'
    const [waStep, setWaStep] = useState('idle');
    const [waPhone, setWaPhone] = useState('');
    const [waDialCode, setWaDialCode] = useState('+91');
    const [waPhoneError, setWaPhoneError] = useState('');
    const [waOtp, setWaOtp] = useState('');
    const [waNewPassword, setWaNewPassword] = useState('');
    const [waShowPassword, setWaShowPassword] = useState(false);
    const [waCooldown, setWaCooldown] = useState(0);
    const [waLoading, setWaLoading] = useState(false);

    const theme = getThemeConfig(store?.themeCustomizations?.theme || 'modern', store?.themeCustomizations);
    const themeColor = store?.themeCustomizations?.primaryColor || '#6366f1';

    const { authConfig } = useStoreCustomer();
    const hasOtp = authConfig?.methods?.includes?.('whatsapp_otp');

    // ── Email handler ─────────────────────────────────────────────────────────
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setEmailLoading(true);
        setSmtpUnavailable(false);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/forgot-password`, { email });
            setEmailSubmitted(true);
        } catch (err) {
            if (err.response?.status === 503 && err.response?.data?.error === 'smtp_not_configured') {
                setSmtpUnavailable(true);
            } else {
                toast.error('Something went wrong. Please try again.');
            }
        } finally {
            setEmailLoading(false);
        }
    };

    // ── WhatsApp OTP: send OTP ────────────────────────────────────────────────
    const handleSendWaOtp = async (e) => {
        e?.preventDefault();
        const cleanPhone = waPhone.replace(/[\s\-\(\)]/g, '');
        if (!cleanPhone) { setWaPhoneError('Enter your WhatsApp number'); return; }
        if (!validatePhone(waDialCode, cleanPhone)) { setWaPhoneError('Enter 10 digit phone number'); return; }

        setWaLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/send-otp-reset`, { phone: waDialCode + cleanPhone });
            setWaStep('otp_sent');
            toast.success('OTP sent to your WhatsApp!');
            // 60-second cooldown
            let secs = 60;
            setWaCooldown(secs);
            const t = setInterval(() => { secs--; setWaCooldown(secs); if (secs <= 0) clearInterval(t); }, 1000);
        } catch (err) {
            const msg = err.response?.data?.error;
            toast.error(msg || 'Failed to send OTP. Please try again.');
        } finally {
            setWaLoading(false);
        }
    };

    // ── WhatsApp OTP: verify OTP ──────────────────────────────────────────────
    const handleVerifyWaOtp = async (e) => {
        e.preventDefault();
        setWaLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/verify-otp-reset`, {
                phone: waDialCode + waPhone.replace(/[\s\-\(\)]/g, ''),
                otp: waOtp,
                newPassword: waNewPassword,
            });
            setWaStep('done');
            toast.success('Password updated!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Verification failed. Please try again.');
        } finally {
            setWaLoading(false);
        }
    };

    if (!store) return null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/70 font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
            <WaStoreHeader
                store={store}
                theme={theme}
                slug={slug}
                products={products}
                categories={[]}
                cartCount={0}
                setIsCartOpen={setIsCartOpen}
                authEnabled={true}
            />

            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full mx-auto">
                    <div className="text-center mb-8">
                        {store?.logo && (
                            <img
                                src={store.logo.startsWith('http') ? store.logo : `${import.meta.env.VITE_API_URL}${store.logo}`}
                                alt={store.name}
                                className="h-14 mx-auto mb-4 object-contain"
                            />
                        )}
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Forgot Password</h1>
                        <p className="text-sm text-slate-500 mt-1.5 font-medium">Reset your account password</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/80 p-6 sm:p-8">

                        {/* ── Email Flow: SMTP not configured ── */}
                        {smtpUnavailable && waStep === 'idle' && (
                            <div className="text-center py-2">
                                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={26} className="text-amber-500" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg">Email Not Available</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed mb-5">
                                    This store hasn't set up email delivery yet. {hasOtp ? 'Use WhatsApp OTP below to reset your password instead.' : 'Please contact the store owner.'}
                                </p>
                                {hasOtp && (
                                    <button
                                        onClick={() => setSmtpUnavailable(false) || setWaStep('idle') || setWaPhone('')}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white font-bold text-xs shadow-md hover:opacity-95"
                                        style={{ background: themeColor }}
                                    >
                                        <MessageCircle size={14} /> Reset via WhatsApp OTP
                                    </button>
                                )}
                                {!hasOtp && (
                                    <Link
                                        to={getStoreRoute(slug, `/account/login`)}
                                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-2xl text-white font-bold text-xs shadow-md hover:opacity-95"
                                        style={{ background: themeColor }}
                                    >
                                        <ArrowLeft size={14} /> Back to Login
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* ── Email Flow: success ── */}
                        {emailSubmitted && (
                            <div className="text-center py-4">
                                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                                <h3 className="font-bold text-slate-900 text-lg">Check your inbox</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    If an account exists for <span className="font-semibold text-slate-800">{email}</span>, you will receive a password reset link shortly.
                                </p>
                                <Link
                                    to={getStoreRoute(slug, `/account/login`)}
                                    className="mt-6 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-2xl text-white font-bold text-xs shadow-md hover:opacity-95"
                                    style={{ background: themeColor }}
                                >
                                    Return to Login
                                </Link>
                            </div>
                        )}

                        {/* ── WhatsApp OTP Flow: Done ── */}
                        {waStep === 'done' && (
                            <div className="text-center py-4">
                                <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-3" />
                                <h3 className="font-bold text-slate-900 text-lg">Password Updated!</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    Your password has been changed successfully. You can now log in with your new password.
                                </p>
                                <Link
                                    to={getStoreRoute(slug, `/account/login`)}
                                    className="mt-6 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-2xl text-white font-bold text-xs shadow-md hover:opacity-95"
                                    style={{ background: themeColor }}
                                >
                                    Go to Login
                                </Link>
                            </div>
                        )}

                        {/* ── Main form: hidden when a terminal state is shown ── */}
                        {!emailSubmitted && !smtpUnavailable && waStep === 'idle' && (
                            <div className="space-y-5">
                                {/* Email reset section */}
                                <form onSubmit={handleEmailSubmit} className="space-y-3">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            placeholder="you@example.com"
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={emailLoading}
                                        className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60"
                                        style={{ background: themeColor }}
                                    >
                                        {emailLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={14} />}
                                        Send Reset Link via Email
                                    </button>
                                </form>

                                {/* WhatsApp OTP alternative */}
                                {hasOtp && (
                                    <>
                                        <div className="relative flex items-center">
                                            <div className="flex-1 border-t border-slate-200" />
                                            <span className="mx-3 text-xs font-semibold text-slate-400">or</span>
                                            <div className="flex-1 border-t border-slate-200" />
                                        </div>
                                        <button
                                            onClick={() => setWaStep('phone')}
                                            className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-2 hover:bg-slate-50 transition-colors"
                                            style={{ borderColor: themeColor, color: themeColor }}
                                        >
                                            <MessageCircle size={14} /> Reset via WhatsApp OTP
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── WhatsApp OTP Flow: Enter phone ── */}
                        {waStep === 'phone' && (
                            <form onSubmit={handleSendWaOtp} className="space-y-4">
                                <div className="text-center mb-2">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${themeColor}18` }}>
                                        <Phone size={20} style={{ color: themeColor }} />
                                    </div>
                                    <h3 className="font-bold text-slate-900">Enter Your WhatsApp Number</h3>
                                    <p className="text-xs text-slate-500 mt-1">We'll send a 6-digit OTP to verify your identity.</p>
                                </div>
                                <div>
                                    <div className="flex gap-2">
                                        <div className="w-[100px] shrink-0">
                                            <select 
                                                value={waDialCode}
                                                onChange={e => {
                                                    setWaDialCode(e.target.value);
                                                    if (waPhone) {
                                                        const isValid = validatePhone(e.target.value, waPhone);
                                                        setWaPhoneError(isValid ? '' : 'Enter 10 digit phone number');
                                                    }
                                                }}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-slate-50 appearance-none"
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
                                                value={waPhone}
                                                onChange={e => {
                                                    setWaPhone(e.target.value);
                                                    if (e.target.value) {
                                                        const isValid = validatePhone(waDialCode, e.target.value);
                                                        setWaPhoneError(isValid ? '' : 'Enter 10 digit phone number');
                                                    } else {
                                                        setWaPhoneError('');
                                                    }
                                                }}
                                                required
                                                placeholder="9876543210"
                                                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                                                    waPhoneError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-slate-100'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                    {waPhoneError && <p className="text-[10px] text-red-500 mt-1.5 font-medium ml-1">{waPhoneError}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={waLoading}
                                    className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60"
                                    style={{ background: themeColor }}
                                >
                                    {waLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={14} />}
                                    Send OTP on WhatsApp
                                </button>
                                <button type="button" onClick={() => setWaStep('idle')} className="w-full text-xs text-slate-500 hover:text-slate-800 font-medium py-1">
                                    ← Back
                                </button>
                            </form>
                        )}

                        {/* ── WhatsApp OTP Flow: Enter OTP + new password ── */}
                        {waStep === 'otp_sent' && (
                            <form onSubmit={handleVerifyWaOtp} className="space-y-4">
                                <div className="text-center mb-2">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${themeColor}18` }}>
                                        <KeyRound size={20} style={{ color: themeColor }} />
                                    </div>
                                    <h3 className="font-bold text-slate-900">Enter OTP &amp; New Password</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        OTP sent to <span className="font-semibold text-slate-700">...{waPhone.slice(-4)}</span>
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit OTP</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={waOtp}
                                        onChange={e => setWaOtp(e.target.value.replace(/\D/g, ''))}
                                        required
                                        placeholder="123456"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-center tracking-widest font-bold focus:outline-none focus:ring-2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={waShowPassword ? 'text' : 'password'}
                                            value={waNewPassword}
                                            onChange={e => setWaNewPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            placeholder="Min. 6 characters"
                                            className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                                        />
                                        <button type="button" onClick={() => setWaShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                            {waShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={waLoading}
                                    className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60"
                                    style={{ background: themeColor }}
                                >
                                    {waLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={14} />}
                                    Verify &amp; Set Password
                                </button>

                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <button type="button" onClick={() => setWaStep('phone')} className="hover:text-slate-800 font-medium">← Change Number</button>
                                    {waCooldown > 0 ? (
                                        <span>Resend in {waCooldown}s</span>
                                    ) : (
                                        <button type="button" onClick={handleSendWaOtp} className="font-semibold hover:text-slate-800" style={{ color: themeColor }}>
                                            Resend OTP
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="text-center mt-6">
                        <Link to={getStoreRoute(slug, `/account/login`)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>

            <WaStoreFooter store={store} />
        </div>
    );
}
