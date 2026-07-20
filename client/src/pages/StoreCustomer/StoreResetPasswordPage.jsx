import React, { useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function StoreResetPasswordPage({ store }) {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const themeColor = store?.themeCustomizations?.primaryColor || '#6366f1';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 font-medium">Invalid or missing reset token.</p>
                    <Link to={`/store/${slug}/account/forgot-password`} className="mt-2 text-sm hover:underline" style={{ color: themeColor }}>
                        Request a new link
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) { toast.error('Passwords do not match.'); return; }
        if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
        setLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/reset-password`, { token, password });
            setDone(true);
            setTimeout(() => navigate(`/store/${slug}/account/login`), 3000);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Reset failed. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
            <Link to={`/store/${slug}/account/login`} className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
                <ArrowLeft size={16} /> Back to login
            </Link>
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    {done ? (
                        <div className="text-center py-4">
                            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                            <p className="font-semibold text-gray-800">Password reset!</p>
                            <p className="text-sm text-gray-500 mt-2">Redirecting you to login…</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type={showPwd ? 'text' : 'password'} value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Min. 6 characters" required
                                        className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                                        placeholder="Re-enter password" required
                                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                                </div>
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                                style={{ background: themeColor }}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                                Reset Password
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
