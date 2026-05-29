import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

export const PaymentRedirectHandler = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const verifyRedirectPayment = async () => {
            const paymentSuccess = searchParams.get('payment_success');
            const gateway = searchParams.get('gateway');
            
            // Collect possible payment identifiers
            const sessionId = searchParams.get('session_id');
            const txnId = searchParams.get('txn_id');
            const orderId = searchParams.get('order_id'); // Cashfree or generic

            if (paymentSuccess === 'true' && gateway && !isVerifying) {
                setIsVerifying(true);
                
                // Get pending payment context from localStorage
                const pendingContextStr = localStorage.getItem('pendingPaymentVerification');
                let verifyUrl = '';
                let originalPayload = {};
                
                if (pendingContextStr) {
                    try {
                        const context = JSON.parse(pendingContextStr);
                        verifyUrl = context.verifyUrl;
                        originalPayload = context.payload;
                    } catch (e) {
                        console.error("Failed to parse pending payment context");
                    }
                }

                // If no verifyUrl in localStorage, we can't reliably verify globally here, 
                // but wait, NFC flow passes nfc_success=true.
                // If it's a generic flow, verifyUrl is needed.
                if (!verifyUrl) {
                    // Fallback heuristics based on URL if needed, or just let the specific page handle it
                    setIsVerifying(false);
                    return;
                }

                try {
                    const payload = {
                        session_id: sessionId,
                        txn_id: txnId,
                        order_id: orderId
                    };

                    const finalPayload = {
                        gateway,
                        payload,
                        ...originalPayload // includes planName, itemId, couponCode, nfcOrderId etc.
                    };

                    const { data } = await axios.post(verifyUrl, finalPayload);
                    toast.success(data.message || 'Payment successful!');
                    
                    // Clear the context
                    localStorage.removeItem('pendingPaymentVerification');
                    
                    // Clean URL
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('payment_success');
                    newParams.delete('gateway');
                    newParams.delete('session_id');
                    newParams.delete('txn_id');
                    newParams.delete('order_id');
                    setSearchParams(newParams, { replace: true });
                    
                } catch (err) {
                    console.error('Payment Verification Error:', err);
                    toast.error(err.response?.data?.error || 'Payment verification failed.');
                } finally {
                    setIsVerifying(false);
                }
            }
        };

        verifyRedirectPayment();
    }, [searchParams, setSearchParams, isVerifying]);

    // This is a headless component, it just returns null or an overlay if verifying
    if (isVerifying) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full mx-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verifying Payment</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">
                        Please wait while we confirm your payment status...
                    </p>
                </div>
            </div>
        );
    }

    return null;
};
