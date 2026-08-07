import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import { getThemeConfig } from '../../utils/wastoreThemes';
import toast from 'react-hot-toast';

export default function StoreRegisterPage({ store, products = [] }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { register, authConfig } = useStoreCustomer();

    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

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
        setSubmitting(true);
        try {
            await register(form.name, form.email, form.password, form.phone);
            toast.success('Account created! Welcome 🎉');
            navigate(`/store/${slug}/account`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const hasEmailMethod = authConfig?.methods?.includes('email_password');

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

                    {!hasEmailMethod ? (
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/80 p-8 text-center">
                            <p className="text-sm font-medium text-slate-600">Email registration is not enabled for this store.</p>
                            <Link to={`/store/${slug}/account/login`} className="mt-4 inline-block font-bold text-xs hover:underline" style={{ color: themeColor }}>
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/80 p-6 sm:p-8">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
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
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="email" 
                                            value={form.email} 
                                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            placeholder="you@example.com" 
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" 
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number (Optional)</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="tel" 
                                            value={form.phone} 
                                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                            placeholder="+1 234 567 8900"
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" 
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
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
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
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
                                    <Link to={`/store/${slug}/account/login`} className="font-bold hover:underline" style={{ color: themeColor }}>
                                        Sign In
                                    </Link>
                                </p>
                            </form>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}
