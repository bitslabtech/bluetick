import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, MessageCircle, ShoppingBag, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

import WaStoreFooter from '../components/WaStoreFooter';
import WaStoreHeader from '../components/WaStoreHeader';
import { getThemeConfig } from '../utils/wastoreThemes';
import { getStoreRoute } from '../utils/storeRouting';
import { StoreCustomerProvider, useStoreCustomer } from '../context/StoreCustomerContext';

function OrderSuccessInner({ store, theme, slug, products, categories }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);
    
    // Read order data and whatsapp URL from state
    const orderData = location.state?.orderData;
    const whatsappUrl = location.state?.whatsappUrl;
    
    const { customer, authConfig } = useStoreCustomer();
    const authEnabled = authConfig?.enabled || store?.customerAuthConfig?.enabled || false;

    if (!orderData) {
        navigate(getStoreRoute(slug));
        return null;
    }

    const renderOrderSummary = (isMobile) => (
        <>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4">Order Summary</h3>
            <div className="space-y-3 text-sm mb-4">
                <div className="flex justify-between text-gray-600">
                    <p>Subtotal</p>
                    <p className="font-medium text-gray-900">{orderData.currency || '₹'} {parseFloat(orderData.subtotal).toFixed(2)}</p>
                </div>
                {orderData.shippingCost > 0 && (
                    <div className="flex justify-between text-gray-600">
                        <p>Shipping</p>
                        <p className="font-medium text-gray-900">{orderData.currency || '₹'} {parseFloat(orderData.shippingCost).toFixed(2)}</p>
                    </div>
                )}
                {orderData.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                        <p>Discount {orderData.couponCode ? `(${orderData.couponCode})` : ''}</p>
                        <p className="font-medium">-{orderData.currency || '₹'} {parseFloat(orderData.discountAmount).toFixed(2)}</p>
                    </div>
                )}
                {orderData.taxAmount > 0 && (
                    <div className="flex justify-between text-gray-600">
                        <p>{orderData.taxName || 'Tax'}</p>
                        <p className="font-medium text-gray-900">{orderData.currency || '₹'} {parseFloat(orderData.taxAmount).toFixed(2)}</p>
                    </div>
                )}
            </div>
            <div className={`flex justify-between items-center font-bold text-xl text-gray-900 pt-4 border-t ${isMobile ? 'border-gray-200' : 'border-gray-100'}`}>
                <p>Total</p>
                <p>{orderData.currency || '₹'} {parseFloat(orderData.total || orderData.subtotal).toFixed(2)}</p>
            </div>
        </>
    );

    return (
        <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white`} style={{ fontFamily: theme.fontFamily }}>
            <WaStoreHeader
                store={store}
                theme={theme}
                slug={slug}
                products={products}
                categories={categories}
                cartCount={0}
                setIsCartOpen={() => {}}
                authEnabled={authEnabled}
                storeCustomer={customer}
            />
            
            <main className="flex-1 w-full mx-auto px-4 max-w-6xl py-8 md:py-12 font-display">
                
                <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 md:border-none md:bg-transparent md:shadow-none md:overflow-visible md:rounded-none">
                    
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 md:p-10 text-center text-white relative md:rounded-3xl md:shadow-lg mb-0 md:mb-8 overflow-hidden">
                        <div className="absolute inset-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]"></div>
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-white drop-shadow-md animate-in zoom-in duration-500 relative z-10" />
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 relative z-10">Order Confirmed!</h2>
                        <p className="text-green-50 font-medium md:text-lg relative z-10">Thank you for your purchase.</p>
                    </div>
                    
                    <div className="p-6 md:p-0">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start text-black">
                            
                            {/* Left Column - Order Items & Details */}
                            <div className="md:col-span-7 lg:col-span-8 space-y-6">
                                
                                {/* Order Info */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-xl border border-gray-100 md:bg-white md:p-6 md:rounded-2xl md:shadow-sm gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Order Number</p>
                                        <p className="text-xl font-bold text-gray-900">#{orderData.orderNumber}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Date</p>
                                        <p className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                </div>

                                {/* Order Items */}
                                {orderData.items && orderData.items.length > 0 && (
                                    <div className="bg-gray-50 md:bg-white rounded-xl md:rounded-2xl border border-gray-100 md:shadow-sm overflow-hidden flex flex-col">
                                        
                                        {/* Mobile Toggle Button */}
                                        <button 
                                            onClick={() => setIsMobileDetailsOpen(!isMobileDetailsOpen)}
                                            className="md:hidden flex justify-between items-center w-full p-4 sm:p-5 text-left font-bold text-gray-900 bg-white border-b border-gray-100"
                                        >
                                            <span className="text-lg">View Order Details</span>
                                            {isMobileDetailsOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                        </button>

                                        {/* Content - Collapsible on Mobile */}
                                        <div className={`${isMobileDetailsOpen ? 'block' : 'hidden'} md:block`}>
                                            {/* Items Section */}
                                            <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 md:border-none">
                                                <h3 className="hidden md:block text-lg font-bold text-gray-900 mb-4 border-b pb-4">Order Items</h3>
                                                <div className="space-y-4">
                                                    {orderData.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-start py-3 border-b border-gray-200 md:border-gray-50 last:border-0 last:pb-0">
                                                            <div className="pr-4">
                                                                <p className="font-medium text-gray-900 text-base">{item.name}</p>
                                                                <p className="text-sm text-gray-500 mt-1 font-medium">Qty: {item.qty}</p>
                                                                {item.selectedVariants && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <p className="font-semibold text-gray-900 whitespace-nowrap">
                                                                {orderData.currency || '₹'} {(item.price * item.qty).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {/* Summary Section - MOBILE ONLY */}
                                            <div className="p-4 sm:p-5 bg-gray-50 md:hidden border-t border-gray-200">
                                                {renderOrderSummary(true)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                            </div>

                            {/* Right Column - Order Summary & Actions */}
                            <div className="md:col-span-5 lg:col-span-4 space-y-6">
                                
                                {/* Order Summary - DESKTOP ONLY */}
                                <div className="hidden md:block bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    {renderOrderSummary(false)}
                                </div>

                                {/* Call to Actions */}
                                {whatsappUrl && (
                                    <div className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                                        <h3 className="font-bold text-gray-900 text-lg">Confirm on WhatsApp</h3>
                                        <p className="text-sm text-gray-600">Send your order details to the store owner to finalize your purchase.</p>
                                        <button 
                                            onClick={() => window.open(whatsappUrl, '_blank')}
                                            className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-500/30 text-lg"
                                        >
                                            <MessageCircle className="w-6 h-6" />
                                            Send to WhatsApp
                                        </button>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={() => navigate(getStoreRoute(slug))}
                                    className="w-full bg-gray-900 text-white flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold hover:bg-black transition-colors"
                                >
                                    <ShoppingBag className="w-5 h-5" />
                                    Continue Shopping
                                </button>
                            </div>
                            
                        </div>
                    </div>
                </div>
            </main>

            <WaStoreFooter store={store} />
        </div>
    );
}

export default function PublicWaStoreOrderSuccess({ customSlug }) {
    const params = useParams();
    const slug = customSlug || params.slug;
    
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const theme = useMemo(() => getThemeConfig(store?.themeId), [store?.themeId]);

    const categories = useMemo(() => {
        const fromProducts = products.map(p => p.category).filter(Boolean);
        const adminCats = Array.isArray(store?.categories) ? store.categories : [];
        const merged = [...new Set([...adminCats, ...fromProducts])];
        return merged;
    }, [products, store]);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}`);
                setStore(res.data.store);
                setProducts(res.data.products);
            } catch (error) {
                toast.error("Failed to load store");
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading store...</p>
            </div>
        );
    }

    if (!store) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500 font-medium">Store not found.</p>
            </div>
        );
    }

    return (
        <StoreCustomerProvider slug={slug}>
            <OrderSuccessInner 
                store={store} 
                theme={theme} 
                slug={slug} 
                products={products}
                categories={categories}
            />
        </StoreCustomerProvider>
    );
}
