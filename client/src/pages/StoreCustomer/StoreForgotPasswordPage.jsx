import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import WaStoreHeader from '../../components/WaStoreHeader';
import WaStoreFooter from '../../components/WaStoreFooter';
import { getThemeConfig } from '../../utils/wastoreThemes';
import toast from 'react-hot-toast';

export default function StoreForgotPasswordPage({ store, products = [] }) {
    const { slug } = useParams();
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const theme = getThemeConfig(store?.themeCustomizations?.theme || 'modern', store?.themeCustomizations);
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
                        <p className="text-sm text-slate-500 mt-1.5 font-medium">We'll send you a password reset link to your email</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/80 p-6 sm:p-8">
                        {submitted ? (
                            <div className="text-center py-4">
                                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                                <h3 className="font-bold text-slate-900 text-lg">Check your inbox</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    If an account exists for <span className="font-semibold text-slate-800">{email}</span>, you will receive a password reset link shortly.
                                </p>
                                <Link 
                                    to={`/store/${slug}/account/login`} 
                                    className="mt-6 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-2xl text-white font-bold text-xs shadow-md hover:opacity-95" 
                                    style={{ background: themeColor }}
                                >
                                    Return to Login
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
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
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60 pt-3"
                                    style={{ background: themeColor }}
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                                    Send Reset Link
                                </button>
                            </form>
                        )}
                    </div>

                    <div className="text-center mt-6">
                        <Link to={`/store/${slug}/account/login`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>

            <WaStoreFooter store={store} />
        </div>
    );
}
