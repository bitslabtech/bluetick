import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Smartphone, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import toast from 'react-hot-toast';

export default function StoreLoginPage({ store }) {
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
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);

    const [submitting, setSubmitting] = useState(false);

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
        if (!phone || phone.length < 7) { toast.error('Enter a valid phone number.'); return; }
        setSubmitting(true);
        try {
            await sendOtp(phone);
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
        try {
            await verifyOtp(phone, otp);
            toast.success('Logged in successfully!');
            navigate(`/store/${slug}/account`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid OTP. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
            {/* Back to store */}
            <Link to={`/store/${slug}`} className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft size={16} /> Back to store
            </Link>

            <div className="max-w-md w-full mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    {store?.logo && (
                        <img src={store.logo.startsWith('http') ? store.logo : `${import.meta.env.VITE_API_URL}${store.logo}`}
                            alt={store.name} className="h-12 mx-auto mb-4 object-contain" />
                    )}
                    <h1 className="text-2xl font-bold text-gray-900">{store?.name || 'Store'}</h1>
                    <p className="text-gray-500 mt-1">Sign in to your account</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    {/* Auth method tabs */}
                    {hasEmail && hasOtp && (
                        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
                            <button onClick={() => setTab('email')}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'email' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                style={tab === 'email' ? { background: themeColor } : {}}>
                                Email &amp; Password
                            </button>
                            <button onClick={() => setTab('otp')}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'otp' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                style={tab === 'otp' ? { background: themeColor } : {}}>
                                WhatsApp OTP
                            </button>
                        </div>
                    )}

                    {/* ── Email + Password Form ── */}
                    {tab === 'email' && (
                        <form onSubmit={handleEmailLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="you@example.com" required
                                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': themeColor }} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••" required
                                        className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <div className="text-right mt-1">
                                    <Link to={`/store/${slug}/account/forgot-password`}
                                        className="text-xs hover:underline" style={{ color: themeColor }}>
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>
                            <button type="submit" disabled={submitting}
                                className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{ background: themeColor }}>
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                {submitting ? 'Signing in…' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {/* ── WhatsApp OTP Form ── */}
                    {tab === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                                <div className="relative">
                                    <Smartphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                        placeholder="+91 98765 43210" required disabled={otpSent}
                                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50" />
                                </div>
                            </div>

                            {!otpSent ? (
                                <button type="button" onClick={handleSendOtp} disabled={submitting}
                                    className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                                    style={{ background: themeColor }}>
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                    Send OTP on WhatsApp
                                </button>
                            ) : (
                                <>
                                    <div className="p-3 bg-green-50 rounded-lg flex items-start gap-2 text-sm text-green-700 border border-green-100">
                                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                                        OTP sent! Check your WhatsApp.
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                                        <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)}
                                            placeholder="6-digit code" required
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2" />
                                    </div>
                                    <button type="submit" disabled={submitting || otp.length < 6}
                                        className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                                        style={{ background: themeColor }}>
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                        Verify &amp; Login
                                    </button>
                                    <button type="button" onClick={handleSendOtp} disabled={otpCooldown > 0 || submitting}
                                        className="w-full text-center text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40">
                                        {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}
                                    </button>
                                </>
                            )}
                        </form>
                    )}

                    {/* Register link */}
                    {hasEmail && (
                        <p className="text-center text-sm text-gray-500 mt-6">
                            Don't have an account?{' '}
                            <Link to={`/store/${slug}/account/register`} className="font-medium hover:underline" style={{ color: themeColor }}>
                                Create one
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
