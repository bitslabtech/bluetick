import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Check, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import { Turnstile } from '@marsidev/react-turnstile';

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

const PHONE_LENGTHS = {
    '+91': { min: 10, max: 10 },
    '+1': { min: 10, max: 10 },
    '+44': { min: 10, max: 10 },
    '+971': { min: 9, max: 9 },
    '+966': { min: 9, max: 9 },
    '+61': { min: 9, max: 9 },
    '+65': { min: 8, max: 8 },
    '+60': { min: 9, max: 11 },
    '+92': { min: 10, max: 10 },
    '+880': { min: 10, max: 10 },
    '+94': { min: 9, max: 9 },
    '+977': { min: 10, max: 10 },
    '+49': { min: 10, max: 11 },
    '+33': { min: 9, max: 9 },
    '+234': { min: 10, max: 10 },
    '+27': { min: 9, max: 9 },
    '+254': { min: 9, max: 10 },
    '+55': { min: 10, max: 11 },
    '+62': { min: 9, max: 13 },
    '+63': { min: 10, max: 10 },
    '+66': { min: 9, max: 9 },
    '+20': { min: 10, max: 10 },
};

const getPhoneLength = (dialCode) => PHONE_LENGTHS[dialCode] || { min: 7, max: 15 };

const ForgotPassword = () => {
    const { publicSettings } = useUI();
    const navigate = useNavigate();
    const [turnstileToken, setTurnstileToken] = useState('');
    const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

    const [step, setStep] = useState('phone'); // phone, input, success
    const [dialCode, setDialCode] = useState('+91');
    const [localNumber, setLocalNumber] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const otpInputRefs = useRef([]);
    const [otpExpiry, setOtpExpiry] = useState(0);
    const [cooldown, setCooldown] = useState(0);
    
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let interval;
        if (otpExpiry > 0) interval = setInterval(() => setOtpExpiry(v => v - 1), 1000);
        return () => clearInterval(interval);
    }, [otpExpiry]);

    useEffect(() => {
        let interval;
        if (cooldown > 0) interval = setInterval(() => setCooldown(v => v - 1), 1000);
        return () => clearInterval(interval);
    }, [cooldown]);

    const handleSendOtp = async () => {
        setError('');
        setMsg('');
        if (cooldown > 0) return;
        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/auth/forgot-password-otp', {
                phone: dialCode + localNumber
            });
            setOtpExpiry(res.data.expiresIn || 300);
            setCooldown(res.data.cooldownSec || 60);
            setMsg(res.data.message || 'OTP Sent successfully');
            setStep('input');
            setOtpDigits(['', '', '', '', '', '']);
            setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOtpDigit = (index, value) => {
        if (!/^[0-9]?$/.test(value)) return;
        const newDigits = [...otpDigits];
        newDigits[index] = value;
        setOtpDigits(newDigits);
        if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
    };

    const handleOtpKey = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        } else if (e.key === 'Enter') {
            if (otpDigits.every(d => d !== '')) handleVerifyAndReset();
        }
    };

    const handleVerifyAndReset = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setMsg('');
        const otpCode = otpDigits.join('');
        if (otpCode.length !== 6) {
            setError('Please enter a complete 6-digit OTP.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (TURNSTILE_SITE_KEY && !turnstileToken) {
            setError('Please complete the security check.');
            return;
        }

        setIsSubmitting(true);
        try {
            await axios.post('/api/auth/reset-password-otp', {
                phone: dialCode + localNumber,
                otp: otpCode,
                newPassword: newPassword,
                turnstileToken
            });
            setStep('success');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-md p-6 sm:p-4 md:p-8 space-y-6 bg-white rounded-xl shadow-lg border border-slate-100 mx-4 sm:mx-0">
                
                <Link to="/login" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
                </Link>

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
                    <h1 className="text-xl font-bold text-slate-900">Reset Password</h1>
                    <p className="text-slate-500 text-sm">Recover access to your account</p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}
                {msg && (
                    <div className="p-3 text-sm text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100">
                        {msg}
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8" />
                        </div>
                        <p className="text-lg font-semibold text-slate-800">Password Reset Complete</p>
                        <p className="text-sm text-slate-500">Redirecting to login...</p>
                    </div>
                )}

                {step === 'phone' && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Enter Registered Phone Number</label>
                            <div className="flex gap-2 w-full">
                                <select
                                    value={dialCode}
                                    onChange={(e) => setDialCode(e.target.value)}
                                    className="w-[85px] sm:w-32 shrink-0 px-1 sm:px-2 py-2.5 border border-slate-200 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all cursor-pointer font-medium text-xs sm:text-sm"
                                >
                                    {COUNTRY_CODES.map(c => (
                                        <option key={c.code + c.dial} value={c.dial} className="text-slate-900 bg-white">
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
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 bg-transparent focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-slate-400"
                                        placeholder={dialCode === '+91' ? '9876543210' : 'Phone number'}
                                        maxLength={getPhoneLength(dialCode).max}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={isSubmitting || localNumber.length < getPhoneLength(dialCode).min}
                            className="w-full py-2.5 bg-primary text-white rounded-lg hover:opacity-90 font-medium transition-colors shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {isSubmitting ? 'Sending...' : 'Send WhatsApp Code'}
                        </button>
                    </div>
                )}

                {step === 'input' && (
                    <form onSubmit={handleVerifyAndReset} className="space-y-5">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Enter 6-digit code
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Sent to <span className="font-semibold text-slate-700">{dialCode} {localNumber}</span>
                                    </p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => { setStep('phone'); setMsg(''); setError(''); }}
                                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors px-2 py-1 bg-emerald-50 rounded-lg"
                                >
                                    Change Number
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
                                        disabled={otpExpiry === 0}
                                        onChange={(e) => handleOtpDigit(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKey(i, e)}
                                        className="w-10 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                                            border-slate-200 bg-white text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30
                                            disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    />
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-xs px-1">
                                {otpExpiry > 0 ? (
                                    <span className="text-slate-500 font-medium">Expires in {otpExpiry}s</span>
                                ) : (
                                    <span className="text-red-500 font-semibold">Code expired</span>
                                )}
                                
                                <button
                                    type="button"
                                    disabled={cooldown > 0}
                                    onClick={handleSendOtp}
                                    className="font-semibold text-emerald-600 disabled:text-slate-400 hover:underline transition-colors"
                                >
                                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-4 border-t border-slate-100">
                            <label className="text-sm font-semibold text-slate-700">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500">Minimum 6 characters required.</p>
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
                            disabled={isSubmitting || newPassword.length < 6 || otpDigits.some(d => d === '')}
                            className="w-full py-2.5 bg-primary text-white rounded-lg hover:opacity-90 font-medium transition-colors shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
};

export default ForgotPassword;
