import { useState, useEffect } from 'react';
import axios from 'axios';
import { Store, Zap, MessageSquare, Users, Loader, CheckCircle, Shield } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';

import ThemeToggle from '../components/ThemeToggle';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

// Load Razorpay script
const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

const StorePage = () => {
    console.log("StorePage component initiated");
    const { showToast } = useUI();
    const { user, fetchUser } = useAuth();
    console.log("Contexts accessed:", { hasUser: !!user, hasToast: !!showToast });
    const [storeItems, setStoreItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [renderError, setRenderError] = useState(null);

    useEffect(() => {
        console.log("StorePage mounted, fetching items...");
        fetchStoreItems();
    }, []);

    const fetchStoreItems = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/store', { headers: { Authorization: `Bearer ${token}` } });
            console.log("Store Items fetch success:", res.data);
            if (Array.isArray(res.data)) {
                setStoreItems(res.data);
            } else {
                console.warn("Store items response is not an array:", res.data);
                setStoreItems([]);
            }
        } catch (err) {
            console.error("Error fetching store items:", err);
            if (showToast) showToast({ type: 'error', title: 'Error', message: 'Failed to load store items' });
            setStoreItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (item) => {
        console.log("Purchase initiated for:", item.name);
        if (processingId) return;
        setProcessingId(item.id);

        const loaded = await loadRazorpayScript();
        if (!loaded) {
            showToast({ type: 'error', title: 'Payment Error', message: 'Failed to load Razorpay. Check your connection.' });
            setProcessingId(null);
            return;
        }

        try {
            // 1. Create Order
            const { data: orderData } = await axios.post(`${API}/api/billing/create-order`, {
                itemId: item.id
            }, {
                headers: { 
                    'x-auth-token': localStorage.getItem('token'),
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                }
            });

            // 2. Open Razorpay
            const rzpOptions = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'WhatsApp Cloud Store',
                description: `Purchase: ${item.name}`,
                order_id: orderData.orderId,
                prefill: {
                    name: user?.name || '',
                    email: user?.email || ''
                },
                theme: { color: '#0088cc' },
                modal: {
                    ondismiss: () => {
                        setProcessingId(null);
                    }
                },
                handler: async (response) => {
                    // 3. Verify Payment
                    try {
                        const verifyRes = await axios.post(`${API}/api/billing/verify-payment`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            itemId: item.id
                        }, {
                            headers: { 
                                'x-auth-token': localStorage.getItem('token'),
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });

                        showToast({
                            type: 'success',
                            title: 'Purchase Successful!',
                            message: verifyRes.data.message
                        });
                        
                        // Refresh user data so balances update in the UI
                        if (fetchUser) await fetchUser();
                    } catch (verifyErr) {
                        const msg = verifyErr.response?.data?.error || 'Payment verification failed.';
                        showToast({ type: 'error', title: 'Verification Failed', message: msg });
                    } finally {
                        setProcessingId(null);
                    }
                }
            };

            const rzp = new window.Razorpay(rzpOptions);
            rzp.on('payment.failed', (response) => {
                showToast({
                    type: 'error',
                    title: 'Payment Failed',
                    message: response.error?.description || 'Payment was declined.'
                });
                setProcessingId(null);
            });
            rzp.open();

        } catch (err) {
            const msg = err.response?.data?.error || 'Could not initiate payment.';
            showToast({ type: 'error', title: 'Checkout Error', message: msg });
            setProcessingId(null);
        }
    };

    // Ensure storeItems is always an array before reducing
    const safeItems = Array.isArray(storeItems) ? storeItems : [];
    const groupedItems = safeItems.reduce((acc, item) => {
        if (!item || !item.itemType) return acc;
        if (!acc[item.itemType]) acc[item.itemType] = [];
        acc[item.itemType].push(item);
        return acc;
    }, {});

    if (renderError) {
        return <div className="p-20 text-center"><h1>Something went wrong.</h1><p>{renderError}</p></div>
    }

    try {
        console.log("Attempting main render...");
        return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-4 md:px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300">
                <div className="flex items-center gap-6 w-full">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">Store & Top-ups</h2>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </header>

            <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full pb-20">
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Power Up Your Account</h1>
                    <p className="text-slate-500 dark:text-text-secondary text-lg">Need more capacity? Purchase one-time top-ups to instantly increase your limits without changing your base plan.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader className="w-10 h-10 text-primary animate-spin" />
                    </div>
                ) : storeItems.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-2xl border border-dotted border-slate-300 dark:border-white/10">
                        <Store className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Coming soon! No top-ups are available right now.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* AI Tokens Section */}
                        {groupedItems['ai_tokens'] && (
                            <section>
                                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200 dark:border-white/10">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg"><Zap className="w-6 h-6" /></div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI Tokens</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedItems['ai_tokens'].map(item => (
                                        <StoreCard key={item.id} item={item} processingId={processingId} onPurchase={() => handlePurchase(item)} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Messages Section */}
                        {groupedItems['messages'] && (
                            <section>
                                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200 dark:border-white/10">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><MessageSquare className="w-6 h-6" /></div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Extra Messages</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedItems['messages'].map(item => (
                                        <StoreCard key={item.id} item={item} processingId={processingId} onPurchase={() => handlePurchase(item)} />
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        {/* Contacts Section */}
                        {groupedItems['contacts'] && (
                            <section>
                                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200 dark:border-white/10">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><Users className="w-6 h-6" /></div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Extra Contacts</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedItems['contacts'].map(item => (
                                        <StoreCard key={item.id} item={item} processingId={processingId} onPurchase={() => handlePurchase(item)} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
        );
    } catch (e) {
        console.error("StorePage Render Error:", e);
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h1>
                <p className="text-slate-500 mb-4">{e.message}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
            </div>
        );
    }
};

const StoreCard = ({ item, processingId, onPurchase }) => {
    const isProcessing = processingId === item.id;
    const isAnyProcessing = processingId !== null;

    const themeColors = {
        blue: { bg: 'bg-blue-600 hover:bg-blue-700', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200', btnText: 'text-white' },
        indigo: { bg: 'bg-indigo-600 hover:bg-indigo-700', text: 'text-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200', btnText: 'text-white' },
        emerald: { bg: 'bg-emerald-600 hover:bg-emerald-700', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200', btnText: 'text-white' },
        amber: { bg: 'bg-amber-500 hover:bg-amber-600', text: 'text-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200', btnText: 'text-indigo-900' },
        rose: { bg: 'bg-rose-500 hover:bg-rose-600', text: 'text-rose-600', light: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200', btnText: 'text-white' },
    };
    const theme = themeColors[item.color] || themeColors.indigo;

    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1 relative overflow-hidden group">
            {/* Background accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${theme.light} rounded-full blur-3xl -mr-16 -mt-16 opacity-50 transition-opacity group-hover:opacity-100`}></div>
            
            <div className="relative z-10 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize mb-1">{item.name}</h3>
                {item.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{item.description}</p>}
                
                <div className={`mt-auto inline-flex items-center self-start gap-1.5 px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm mb-6`}>
                    +{item.amount.toLocaleString()} Units
                </div>

                <div className="flex items-end justify-between mb-4 mt-auto pt-4 border-t border-slate-100 dark:border-white/10">
                    <div>
                        <span className="text-sm font-medium text-slate-500 line-through mr-2">
                            {item.currency === 'USD' ? '$' : '₹'}{(item.price * 1.2).toFixed(2)}
                        </span>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                            {item.currency === 'USD' ? '$' : '₹'}{item.price}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onPurchase}
                    disabled={isAnyProcessing}
                    className={`w-full py-3 px-4 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 
                        ${theme.bg} ${theme.btnText} 
                        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                >
                    {isProcessing ? (
                        <><Loader className="w-5 h-5 animate-spin" /> Processing...</>
                    ) : (
                        <><Shield className="w-4 h-4 opacity-70" /> Buy Now</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default StorePage;
