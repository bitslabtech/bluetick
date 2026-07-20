import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useStoreCustomer } from '../../context/StoreCustomerContext';
import toast from 'react-hot-toast';

export default function StoreRegisterPage({ store }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { register, authConfig } = useStoreCustomer();

    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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
    if (!hasEmailMethod) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Email registration is not enabled for this store.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
            <Link to={`/store/${slug}/account/login`} className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft size={16} /> Back to login
            </Link>

            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    {store?.logo && (
                        <img src={store.logo.startsWith('http') ? store.logo : `${import.meta.env.VITE_API_URL}${store.logo}`}
                            alt={store.name} className="h-12 mx-auto mb-4 object-contain" />
                    )}
                    <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
                    <p className="text-gray-500 mt-1">at {store?.name || 'this store'}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="John Doe" required
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                            </div>
                        </div>
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="you@example.com" required
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                            </div>
                        </div>
                        {/* Phone (optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                WhatsApp Number <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    placeholder="+91 98765 43210"
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                            </div>
                        </div>
                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type={showPwd ? 'text' : 'password'} value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder="Min. 6 characters" required
                                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                                <button type="button" onClick={() => setShowPwd(!showPwd)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {/* Strength bar */}
                            {form.password && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="flex-1 h-1 rounded-full transition-all"
                                                style={{ background: i <= strength.level ? strength.color : '#e5e7eb' }} />
                                        ))}
                                    </div>
                                    <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                                </div>
                            )}
                        </div>
                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="password" value={form.confirm}
                                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                                    placeholder="Re-enter password" required
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                                {form.confirm && form.password === form.confirm && (
                                    <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={submitting}
                            className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 mt-2"
                            style={{ background: themeColor }}>
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            {submitting ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link to={`/store/${slug}/account/login`} className="font-medium hover:underline" style={{ color: themeColor }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
