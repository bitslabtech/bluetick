import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export const usePayment = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const initiatePayment = async ({
        createOrderUrl,
        verifyUrl,
        payload,
        onSuccess,
        onFailure
    }) => {
        setIsProcessing(true);
        try {
            // 1. Create order intent
            const { data: intentData } = await axios.post(createOrderUrl, payload);
            
            if (intentData.instant) {
                // Free/System addons that activate instantly
                onSuccess(intentData);
                setIsProcessing(false);
                return;
            }

            const { gateway } = intentData;

            // 2. Handle based on gateway
            if (gateway === 'razorpay') {
                const isLoaded = await loadRazorpayScript();
                if (!isLoaded) {
                    toast.error('Razorpay SDK failed to load. Are you online?');
                    setIsProcessing(false);
                    if (onFailure) onFailure(new Error('SDK failed to load'));
                    return;
                }

                const options = {
                    key: intentData.keyId || intentData.key,
                    amount: intentData.amount,
                    currency: intentData.currency,
                    name: 'WhatsApp Cloud',
                    description: intentData.description || intentData.planName || intentData.addonName || 'Purchase',
                    order_id: intentData.orderId || intentData.order_id,
                    prefill: {
                        name: intentData.userName || intentData.prefill?.name,
                        email: intentData.userEmail || intentData.prefill?.email,
                        contact: intentData.prefill?.contact || ''
                    },
                    theme: {
                        color: '#6366f1' // indigo-500
                    },
                    handler: async function (response) {
                        try {
                            // 3. Verify Payment
                            const verifyPayload = {
                                gateway: 'razorpay',
                                payload: {
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                },
                                // Spread original payload fields (like planName, itemId, etc)
                                ...payload
                            };
                            
                            // Specific field matching for NFC
                            if (intentData.nfcOrderId) {
                                verifyPayload.nfcOrderId = intentData.nfcOrderId;
                            }

                            const { data: verifyData } = await axios.post(verifyUrl, verifyPayload);
                            
                            toast.success(verifyData.message || 'Payment successful!');
                            if (onSuccess) onSuccess(verifyData);
                        } catch (err) {
                            console.error('Payment Verification Error:', err);
                            toast.error(err.response?.data?.error || 'Payment verification failed.');
                            if (onFailure) onFailure(err);
                        } finally {
                            setIsProcessing(false);
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            setIsProcessing(false);
                            if (onFailure) onFailure(new Error('Payment cancelled by user.'));
                        }
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    setIsProcessing(false);
                    toast.error(response.error.description || 'Payment failed');
                    if (onFailure) onFailure(new Error(response.error.description));
                });
                rzp.open();
                
            } else if (gateway === 'stripe' || gateway === 'phonepe' || gateway === 'cashfree') {
                // Redirect-based gateways
                if (intentData.url) {
                    // Before redirecting, we need a mechanism to remember the original payload 
                    // for the verification step. We can store it in localStorage.
                    // Only store fields we need for verification (like planName, couponCode, etc.)
                    localStorage.setItem('pendingPaymentVerification', JSON.stringify({
                        verifyUrl,
                        payload
                    }));
                    
                    window.location.href = intentData.url;
                } else {
                    toast.error(`Invalid response from ${gateway}`);
                    setIsProcessing(false);
                    if (onFailure) onFailure(new Error('Invalid response'));
                }
            } else {
                toast.error(`Unsupported gateway: ${gateway}`);
                setIsProcessing(false);
                if (onFailure) onFailure(new Error('Unsupported gateway'));
            }

        } catch (err) {
            console.error('Payment Initiation Error:', err);
            toast.error(err.response?.data?.error || err.message || 'Failed to initiate payment.');
            setIsProcessing(false);
            if (onFailure) onFailure(err);
        }
    };

    return {
        initiatePayment,
        isProcessing
    };
};
