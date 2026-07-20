import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function StoreForgotPasswordPage({ store }) {
    const { slug } = useParams();
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const themeColor = store?.themeCustomizations?.primaryColor || '#6366f1';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/forgot-password`, { email });
            setSubmitted(true);
        } catch (err) {
            toast.error('Something went wrong. Please try again.');
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
                    <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
                    <p className="text-gray-500 mt-1">We'll send you a reset link</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    {submitted ? (
                        <div className="text-center py-4">
                            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                            <p className="font-semibold text-gray-800">Check your inbox</p>
                            <p className="text-sm text-gray-500 mt-2">If this email is registered, you'll receive a password reset link shortly.</p>
                            <Link to={`/store/${slug}/account/login`} className="mt-4 inline-block text-sm font-medium hover:underline" style={{ color: themeColor }}>
                                Back to login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                        placeholder="you@example.com"
                                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                                </div>
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                                style={{ background: themeColor }}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                                Send Reset Link
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
