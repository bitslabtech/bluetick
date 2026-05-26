import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Zap, ShieldCheck, ArrowLeft, Settings, ShoppingCart, Tag, X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const getCurrencySymbol = (c) => ({ USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$' }[c] || c || '$');

const AddonDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [addon, setAddon] = useState(null);
    const [owned, setOwned] = useState(false);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [userAddon, setUserAddon] = useState(null);

    useEffect(() => { fetchData(); }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [addonsRes, myAddonsRes] = await Promise.all([
                axios.get('/api/addons', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/addons/my', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            const foundAddon = addonsRes.data.find(a => a.id === id);
            if (!foundAddon) {
                toast.error('Add-on not found.');
                navigate('/marketplace');
                return;
            }
            setAddon(foundAddon);
            const addonRecord = myAddonsRes.data.find(ma => ma.addonId === id && ma.status === 'active');
            const isOwned = addonRecord !== undefined;
            setOwned(isOwned);
            setUserAddon(addonRecord || null);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load add-on details');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        setShowPurchaseModal(false);
        setPurchasing(true);
        try {
            const response = await axios.post(`/api/addons/${addon.id}/create-order`, {}, { headers: { Authorization: `Bearer ${token}` } });
            if (response.data.instant) {
                toast.success(`Successfully activated: ${addon.name}!`);
                setOwned(true);
                return;
            }
            const options = {
                key: response.data.keyId,
                amount: response.data.amount,
                currency: response.data.currency,
                name: "Bluetick",
                description: `Purchase Add-on: ${response.data.addonName}`,
                order_id: response.data.orderId,
                handler: async function (paymentResponse) {
                    try {
                        await axios.post(`/api/addons/${addon.id}/verify-payment`, {
                            razorpay_order_id: paymentResponse.razorpay_order_id,
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_signature: paymentResponse.razorpay_signature
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        toast.success(`Successfully purchased ${addon.name}!`);
                        setOwned(true);
                    } catch (verifyError) {
                        toast.error(verifyError.response?.data?.error || 'Payment verification failed');
                    }
                },
                prefill: { name: user?.name, email: user?.email },
                theme: { color: "#4f46e5" }
            };
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (r) => toast.error(r.error.description || 'Payment Failed'));
            rzp.open();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Purchase initiation failed');
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full flex justify-center items-center h-80">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!addon) return null;

    const priceLabel = addon.price > 0 ? `${getCurrencySymbol(addon.currency)}${Math.floor(Number(addon.price))}` : 'Free';

    let daysLeft = null;
    if (userAddon?.currentPeriodEnd) {
        const end = new Date(userAddon.currentPeriodEnd);
        const now = new Date();
        const diffTime = Math.max(0, end - now);
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const hasVideo = !!addon.demoVideoUrl;
    const hasBanner = !!addon.bannerUrl;
    const hasMedia = hasVideo || hasBanner;

    return (
        <>
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto space-y-6">

            {/* Back button + installed badge */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/marketplace')}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Marketplace
                </button>
                {owned && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 shadow-sm">
                            <CheckCircle className="w-3.5 h-3.5" /> Installed & Active
                        </span>
                        {daysLeft !== null && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-sm animate-pulse-slow">
                                <Clock className="w-3.5 h-3.5" />
                                {daysLeft <= 0 ? 'Expires Today' : `Expiring in ${daysLeft} Days`}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Main Content */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Page Title + Short Description */}
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                            {addon.name}
                        </h1>
                        {(addon.shortDescription || addon.description) && (
                            <p className="text-base text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                                {addon.shortDescription || addon.description}
                            </p>
                        )}
                    </div>

                    {/* Media */}
                    {hasMedia && (
                        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-900 relative aspect-video">
                            {hasVideo ? (
                                addon.demoVideoUrl.includes('youtube.com') || addon.demoVideoUrl.includes('youtu.be') ? (
                                    <iframe
                                        className="absolute inset-0 w-full h-full"
                                        src={addon.demoVideoUrl.replace('watch?v=', 'embed/').split('&')[0]}
                                        title="Demo Video"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                ) : (
                                    <video className="absolute inset-0 w-full h-full object-cover" controls muted loop playsInline src={addon.demoVideoUrl}></video>
                                )
                            ) : (
                                <img src={addon.bannerUrl} alt={addon.name} className="absolute inset-0 w-full h-full object-cover" />
                            )}
                        </div>
                    )}

                    {/* Long Description */}
                    {addon.longDescription && (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">About this Add-on</h3>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                                {addon.longDescription}
                            </p>
                        </div>
                    )}

                    {/* Dynamic Core Features */}
                    {addon.features && addon.features.filter(f => f.trim()).length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-indigo-500" />
                                Features
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {addon.features.filter(f => f.trim()).map((feat, idx) => (
                                    <div key={idx} className="flex gap-3 p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium text-sm leading-snug pt-1.5">{feat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* CTA Sidebar */}
                <div className="lg:col-span-4">
                    <div className="sticky top-20 bg-white dark:bg-gray-800 rounded-3xl p-4 md:p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-6 overflow-hidden">
                        {/* Premium "Most Popular" Banner logic (optional visual flair) */}
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase shadow-md">
                            Premium Addon
                        </div>
                        {addon.badge && (
                            <div className="pt-2 px-1">
                                <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg inline-flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> {addon.badge}
                                </span>
                            </div>
                        )}

                        {/* Price Block */}
                        <div className="relative p-4 md:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-900/10 dark:to-gray-800 border border-indigo-100 dark:border-indigo-800/30 overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>

                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 relative z-10 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" /> Instant Activation
                            </p>

                            {addon.price > 0 ? (
                                <div className="relative z-10">
                                    <div className="flex items-baseline gap-0.5 mt-2">
                                        <span className="text-lg font-bold text-gray-400 dark:text-gray-500">{getCurrencySymbol(addon.currency)}</span>
                                        <span className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums tracking-tight">
                                            {Math.floor(Number(addon.price))}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                                        {addon.currency} <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span> {addon.isRecurring ? `Billed ${addon.recurringInterval}ly` : 'One-time payment'}
                                    </p>
                                </div>
                            ) : (
                                <div className="relative z-10">
                                    <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 mt-2 block">Free</span>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">No credit card required</p>
                                </div>
                            )}
                        </div>

                        {/* Included Features Checklist */}
                        <div className="space-y-3 px-1">
                            <p className="font-bold text-gray-900 dark:text-white text-sm mb-4">Included with your purchase:</p>
                            {[
                                'Full access to core addon features',
                                'Priority technical support',
                                'Free updates & maintenance',
                                'Seamless 1-click integration'
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300 leading-snug">{item}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2">
                            {owned ? (
                                <div className="space-y-4">
                                    <Link
                                        to={`/addons/${addon.module_key}`}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-base font-bold rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5"
                                    >
                                        <Settings className="w-5 h-5" /> Manage This Module
                                    </Link>
                                    <p className="text-center text-xs font-medium text-gray-500 dark:text-gray-400">Ready to configure in your workspace.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setShowPurchaseModal(true)}
                                        disabled={purchasing}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-base font-bold rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:shadow-[0_8px_30px_rgb(79,70,229,0.5)] max-w-full hover:-translate-y-1 transform disabled:opacity-70 disabled:transform-none relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                        <span className="relative flex items-center gap-2">
                                            {purchasing ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <><ShoppingCart className="w-5 h-5 animate-bounce-slow" /> {addon.price > 0 ? 'Purchase Addon' : 'Enable Free Add-on'}</>
                                            )}
                                        </span>
                                    </button>

                                    {/* Trust Badges Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                                        {addon.price > 0 && (
                                            <div className="flex items-center gap-2 justify-center bg-gray-50 dark:bg-gray-800/80 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">256-bit Secure</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 justify-center bg-gray-50 dark:bg-gray-800/80 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                                            <Zap className="w-4 h-4 text-yellow-500" />
                                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Instant Setup</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>


            {/* Purchase Confirmation Modal */}
            {showPurchaseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPurchaseModal(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

                    {/* Modal */}
                    <div
                        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setShowPurchaseModal(false)}
                            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Top Gradient Banner */}
                        <div className="relative h-28 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-20">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl" />
                            </div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-2 border border-white/30 shadow-lg">
                                    <Sparkles className="w-7 h-7 text-white" />
                                </div>
                                <p className="text-white/80 text-xs font-semibold tracking-widest uppercase">Confirm Purchase</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 md:p-6 space-y-5">
                            {/* Addon Info */}
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">{addon.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                                    {addon.shortDescription || addon.description || 'This addon will be instantly activated in your workspace.'}
                                </p>
                            </div>

                            {/* Price Card */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800/30">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Total</p>
                                        <div className="flex items-baseline gap-1">
                                            {addon.price > 0 ? (
                                                <>
                                                    <span className="text-sm font-bold text-gray-400">{getCurrencySymbol(addon.currency)}</span>
                                                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums">{Math.floor(Number(addon.price))}</span>
                                                </>
                                            ) : (
                                                <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600">Free</span>
                                            )}
                                        </div>
                                        {addon.price > 0 && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {addon.isRecurring ? `Billed ${addon.recurringInterval}ly` : 'One-time payment'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-md border border-gray-100 dark:border-gray-700">
                                        <ShieldCheck className="w-6 h-6 text-green-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Quick Benefits */}
                            <div className="space-y-2">
                                {['Instant activation', 'Free updates included', 'Cancel anytime'].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2.5">
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-600 dark:text-gray-300">{item}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setShowPurchaseModal(false)}
                                    className="flex-1 py-3.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePurchase}
                                    disabled={purchasing}
                                    className="flex-[2] py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none"
                                >
                                    {purchasing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <><ShoppingCart className="w-4 h-4" /> {addon.price > 0 ? `Pay ${priceLabel}` : 'Activate Now'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AddonDetail;
