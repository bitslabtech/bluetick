import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicWaStoreVerify() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, failed
    const [orderInfo, setOrderInfo] = useState(null);

    const orderNumber = searchParams.get('order');

    useEffect(() => {
        if (!orderNumber || !slug) {
            setStatus('failed');
            toast.error('Invalid request');
            return;
        }

        const verifyPayment = async () => {
            try {
                const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}/verify-payment`, {
                    orderNumber,
                    provider: 'phonepe-check'
                });

                if (res.data.success) {
                    setStatus('success');
                    setOrderInfo(res.data.order);
                } else {
                    setStatus('failed');
                }
            } catch (error) {
                console.error('Verify error:', error);
                setStatus('failed');
            }
        };

        verifyPayment();
    }, [slug, orderNumber]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                {status === 'processing' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
                        <p className="text-gray-500">Please wait while we confirm your payment...</p>
                    </div>
                )}
                
                {status === 'success' && (
                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                        <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                        <p className="text-gray-600 mb-6">Your order #{orderNumber} has been placed successfully.</p>
                        <button 
                            onClick={() => navigate(`/store/${slug}`)}
                            className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                        >
                            Back to Store
                        </button>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                        <XCircle className="w-20 h-20 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
                        <p className="text-gray-600 mb-6">We couldn't verify your payment for order #{orderNumber}. If amount was deducted, it will be refunded automatically.</p>
                        <button 
                            onClick={() => navigate(`/store/${slug}`)}
                            className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                        >
                            Return to Store
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
