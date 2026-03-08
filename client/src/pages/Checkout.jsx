import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Check, Shield, ArrowLeft, Loader, Tag, Calendar, MessageSquare, Users, Layout, AlertTriangle } from 'lucide-react';
import { useUI } from '../context/UIContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Dynamically load Razorpay checkout script
const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

const currencySymbol = (c) => ({ USD: '$', INR: '₹', EUR: '€', GBP: '£' }[c] || c || '₹');
const intervalLabel = (i) => i === 'year' ? 'per year' : i === 'lifetime' ? 'one-time' : 'per month';

const Checkout = () => {
    const [plan, setPlan] = useState(null);
    const [upgradeData, setUpgradeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const { showToast } = useUI();
    const navigate = useNavigate();

    useEffect(() => {
        const pendingPlanStr = localStorage.getItem('pendingPlan');
        if (!pendingPlanStr) { navigate('/dashboard'); return; }
        try {
            const parsedPlan = JSON.parse(pendingPlanStr);
            setPlan(parsedPlan);

            // Calculate Upgrade Math
            axios.get(`${API}/api/billing/calculate-upgrade/${parsedPlan.name}`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            }).then(res => {
                setUpgradeData(res.data);
            }).catch(err => {
                console.error('Failed to calculate upgrade', err);
            }).finally(() => {
                setLoading(false);
            });

        } catch {
            navigate('/dashboard');
            setLoading(false);
        }
    }, [navigate]);

    const handlePayment = async () => {
        setProcessing(true);

        // 1. Load Razorpay script
        const loaded = await loadRazorpayScript();
        if (!loaded) {
            showToast({ type: 'error', title: 'Payment Error', message: 'Failed to load Razorpay. Please check your internet connection.' });
            setProcessing(false);
            return;
        }

        try {
            // 2. Create Razorpay order on backend
            // Pass isUpgrade flag if we have a credit, so backend recalculates securely
            const { data: orderData } = await axios.post(`${API}/api/billing/create-order`, {
                planName: plan.name,
                isUpgrade: upgradeData?.creditAmount > 0
            }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });

            // 3. Open Razorpay popup
            const rzpOptions = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'WhatsApp Cloud',
                description: `${plan.name} Plan Subscription`,
                order_id: orderData.orderId,
                prefill: {
                    name: orderData.userName || '',
                    email: orderData.userEmail || ''
                },
                theme: { color: '#4f46e5' },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                        showToast({ type: 'warning', title: 'Payment Cancelled', message: 'You cancelled the payment.' });
                    }
                },
                handler: async (response) => {
                    // 4. Payment completed — verify on backend
                    try {
                        await axios.post(`${API}/api/billing/verify-payment`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planName: plan.name
                        }, {
                            headers: { 'x-auth-token': localStorage.getItem('token') }
                        });

                        showToast({
                            type: 'success',
                            title: '🎉 Payment Successful!',
                            message: `You're now on the ${plan.name} plan. Enjoy your new features!`
                        });
                        localStorage.removeItem('pendingPlan');
                        setTimeout(() => navigate('/dashboard'), 2000);
                    } catch (verifyErr) {
                        const msg = verifyErr.response?.data?.error || 'Payment verification failed. Please contact support.';
                        showToast({ type: 'error', title: 'Verification Failed', message: msg });
                        setProcessing(false);
                    }
                }
            };

            const rzp = new window.Razorpay(rzpOptions);
            rzp.on('payment.failed', (response) => {
                showToast({
                    type: 'error',
                    title: 'Payment Failed',
                    message: response.error?.description || 'Payment was declined. Please try a different payment method.'
                });
                setProcessing(false);
            });
            rzp.open();

        } catch (err) {
            const msg = err.response?.data?.error || 'Could not initiate payment. Please try again.';
            showToast({ type: 'error', title: 'Checkout Error', message: msg });
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }
    if (!plan) return null;

    const sym = currencySymbol(plan.currency);
    const intLabel = intervalLabel(plan.interval);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-8 transition-colors font-medium"
                    disabled={processing}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Plans
                </button>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Left: Order Summary (3/5 width) */}
                    <div className="md:col-span-3 space-y-6">
                        {/* Plan Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 border border-slate-200 dark:border-white/10 shadow-sm">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-5">Order Summary</h2>

                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold mb-2">
                                        <Tag className="w-3 h-3" /> {plan.name} Plan
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                        {sym}{upgradeData ? upgradeData.finalPayableAmount.toLocaleString() : parseFloat(plan.price).toLocaleString()}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{intLabel}</p>
                                </div>
                                <div className="text-right">
                                    {plan.interval === 'year' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                                            <Calendar className="w-3 h-3" /> Annual billing
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-2.5 mb-6">
                                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /></div>
                                    <span><strong>{plan.messageLimit === -1 ? 'Unlimited' : plan.messageLimit?.toLocaleString()}</strong> messages/month</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /></div>
                                    <span><strong>{plan.contactLimit === -1 ? 'Unlimited' : plan.contactLimit?.toLocaleString()}</strong> contacts</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><Layout className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /></div>
                                    <span><strong>{plan.templateLimit === -1 ? 'Unlimited' : plan.templateLimit}</strong> templates</span>
                                </div>
                                {plan.features?.map((f, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg"><Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /></div>
                                        <span>{f}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Price Breakdown */}
                            <div className="border-t border-slate-100 dark:border-white/10 pt-5 space-y-2">
                                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                    <span>Subtotal</span>
                                    <span>{sym}{parseFloat(plan.price).toLocaleString()}</span>
                                </div>

                                {upgradeData && upgradeData.creditAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 p-2.5 rounded-lg border border-green-100 dark:border-green-800/20">
                                        <div className="flex flex-col">
                                            <span>Unused Plan Credit</span>
                                            <span className="text-[10px] text-green-700/70 dark:text-green-300/60 leading-none mt-0.5">
                                                {upgradeData.remainingDays} days unused from {upgradeData.currentPlanName} plan
                                            </span>
                                        </div>
                                        <span>-{sym}{upgradeData.creditAmount.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 pt-1">
                                    <span>Tax / GST</span>
                                    <span>Included</span>
                                </div>

                                <div className="flex justify-between text-lg font-black text-slate-900 dark:text-white pt-3 border-t border-slate-100 dark:border-white/10 mt-3">
                                    <span>Total Due Today</span>
                                    <span>{sym}{upgradeData ? upgradeData.finalPayableAmount.toLocaleString() : parseFloat(plan.price).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Security badges */}
                        <div className="flex flex-wrap gap-3">
                            {['256-bit SSL Encrypted', 'PCI DSS Compliant', 'Powered by Razorpay'].map(badge => (
                                <span key={badge} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 shadow-sm">
                                    <Shield className="w-3 h-3 text-green-500" />
                                    {badge}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right: Pay Button (2/5 width) */}
                    <div className="md:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 border border-slate-200 dark:border-white/10 shadow-sm sticky top-8">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-5">Complete Purchase</h2>

                            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl flex items-start gap-3">
                                <Shield className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-green-900 dark:text-green-300 mb-0.5">100% Secure Checkout</p>
                                    <p className="text-xs text-green-700 dark:text-green-400">Pay via Credit/Debit Card, UPI, Net Banking, or Wallets</p>
                                </div>
                            </div>

                            {/* Razorpay CTA */}
                            <button
                                onClick={handlePayment}
                                disabled={processing}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <><Loader className="w-5 h-5 animate-spin" /> Opening Payment...</>
                                ) : (
                                    <><Shield className="w-5 h-5" /> Pay {sym}{upgradeData ? upgradeData.finalPayableAmount.toLocaleString() : parseFloat(plan.price).toLocaleString()}</>
                                )}
                            </button>

                            <button
                                onClick={() => { localStorage.removeItem('pendingPlan'); navigate('/billing'); }}
                                disabled={processing}
                                className="w-full mt-3 py-3 bg-transparent text-slate-500 dark:text-slate-400 rounded-xl font-medium hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-sm disabled:opacity-50"
                            >
                                Cancel & go back
                            </button>

                            {/* Razorpay disclaimer */}
                            <div className="mt-5 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                    A Razorpay payment popup will open. Complete the payment there. Do not close this tab until the payment is confirmed.
                                </p>
                            </div>

                            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-4 leading-relaxed">
                                By completing this purchase you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
