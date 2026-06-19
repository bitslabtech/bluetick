import React, { useState } from 'react';
import { X, ShoppingBag, ArrowRight, Tag, Loader2, Check } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function WaStoreCheckoutModal({ store, cart, cartSubtotal, shippingCost, cartTotal, onClose, onCheckoutSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        notes: ''
    });

    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
        return symbols[code] || code;
    };

    const getItemPrice = (item) => {
        if (item.minWholesaleQty && item.wholesalePrice && item.qty >= parseInt(item.minWholesaleQty)) {
            return parseFloat(item.wholesalePrice);
        }
        return parseFloat(item.price);
    };

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsValidatingCoupon(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/public/${store.slug}/validate-coupon`, {
                code: couponCode,
                cartTotal: cartTotal
            });
            setAppliedCoupon(res.data);
            toast.success('Coupon applied successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to apply coupon');
            setAppliedCoupon(null);
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
    };

    const calculateFinalTotal = () => {
        if (!appliedCoupon) return cartSubtotal;
        if (appliedCoupon.discountType === 'percentage') {
            return cartSubtotal - (cartSubtotal * (parseFloat(appliedCoupon.discountValue) / 100));
        } else {
            return Math.max(0, cartSubtotal - parseFloat(appliedCoupon.discountValue));
        }
    };

    const calculateDiscountAmount = () => {
        return cartSubtotal - calculateFinalTotal();
    };

    const taxEnabled = store?.taxConfig?.enabled || false;
    
    const calculateTaxAmount = () => {
        if (!taxEnabled) return 0;
        let totalTax = 0;
        let totalBase = 0; // total cart value with tax
        
        cart.forEach(item => {
            let basePrice = getItemPrice(item);
            let taxRate = item.taxRate !== null && item.taxRate !== undefined ? parseFloat(item.taxRate) : (parseFloat(store?.taxConfig?.rate) || 0);
            
            let itemDisplayPrice = 0;
            let itemTax = 0;
            if (store.taxConfig.taxInclusive) {
                itemDisplayPrice = basePrice;
                itemTax = basePrice - (basePrice / (1 + taxRate / 100));
            } else {
                itemTax = basePrice * (taxRate / 100);
                itemDisplayPrice = basePrice + itemTax;
            }
            totalTax += itemTax * item.qty;
            totalBase += itemDisplayPrice * item.qty;
        });
        
        // Prorate tax if there's a discount
        if (appliedCoupon && totalBase > 0) {
            const discountRatio = calculateDiscountAmount() / totalBase;
            totalTax = totalTax * (1 - discountRatio);
        }
        
        return totalTax;
    };

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.address) {
            toast.error("Please fill in the required fields (Name, Phone, Address).");
            return;
        }

        setIsSubmitting(true);
        
        const finalTotal = calculateFinalTotal();

        try {
            // Record Order in Backend
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/orders`, {
                storeId: store.id,
                customerName: formData.name,
                customerPhone: formData.phone,
                customerEmail: formData.email,
                customerAddress: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
                customerNote: formData.notes,
                items: cart.map(item => ({
                    id: item.id, name: item.name, price: getItemPrice(item), qty: item.qty, imageUrls: item.imageUrls
                })),
                subtotal: finalTotal, // discounted subtotal
                shippingCost: shippingCost,
                originalTotal: appliedCoupon ? cartSubtotal : null,
                discountAmount: appliedCoupon ? calculateDiscountAmount() : 0,
                taxAmount: calculateTaxAmount(),
                taxRate: null, // item-level taxes vary
                taxName: taxEnabled ? 'Tax' : null,
                total: finalTotal + shippingCost, // finalTotal already includes tax
                couponCode: appliedCoupon ? appliedCoupon.code : null,
                currency: store.currency
            });

            const { order, orderNumber, gatewayOptions } = res.data;

            if (store.checkoutMode === 'gateway' && gatewayOptions) {
                if (gatewayOptions.provider === 'razorpay') {
                    const loaded = await loadRazorpay();
                    if (!loaded) {
                        toast.error("Failed to load payment gateway.");
                        setIsSubmitting(false);
                        return;
                    }
                    const options = {
                        key: gatewayOptions.keyId,
                        amount: gatewayOptions.amount,
                        currency: gatewayOptions.currency,
                        name: store.name,
                        description: `Order ${orderNumber}`,
                        order_id: gatewayOptions.orderId,
                        prefill: {
                            name: formData.name,
                            email: formData.email,
                            contact: formData.phone
                        },
                        handler: async function (response) {
                            try {
                                await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/public/${store.slug}/verify-payment`, {
                                    orderNumber,
                                    paymentData: response,
                                    provider: 'razorpay'
                                });
                                toast.success('Payment successful! Order placed.');
                                if (onCheckoutSuccess) onCheckoutSuccess();
                                onClose();
                            } catch (err) {
                                toast.error('Payment verification failed.');
                            }
                        },
                        modal: {
                            ondismiss: function() {
                                setIsSubmitting(false);
                            }
                        }
                    };
                    const rzp = new window.Razorpay(options);
                    rzp.on('payment.failed', function (response) {
                        toast.error(response.error.description || 'Payment failed');
                    });
                    rzp.open();
                    return; // Wait for Razorpay flow to complete
                } else if (gatewayOptions.provider === 'phonepe') {
                    window.location.href = gatewayOptions.redirectUrl;
                    return; // Will redirect away
                }
            }

            // WhatsApp Flow
            let message = `🛒 *New Order from ${store.name}*\n\n`;
            message += `👤 *Customer Details:*\n`;
            message += `Name: ${formData.name}\n`;
            message += `Phone: ${formData.phone}\n`;
            if (formData.email) message += `Email: ${formData.email}\n`;
            message += `Address: ${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}\n\n`;
            
            message += `📦 *Order Items:*\n`;
            cart.forEach((item, i) => {
                // Include variant text if present (e.g. "T-Shirt - Size: L")
                let variantText = '';
                if (item.selectedVariants) {
                    const variantsStr = Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ');
                    if (variantsStr) variantText = ` (${variantsStr})`;
                }
                
                const currentItemPrice = getItemPrice(item);
                let priceText = `${getCurrencySymbol(store.currency)} ${currentItemPrice.toFixed(2)}`;
                
                // If wholesale applied, strike-through the original price in WhatsApp
                if (item.wholesalePrice && item.minWholesaleQty && item.qty >= parseInt(item.minWholesaleQty)) {
                    priceText = `~${getCurrencySymbol(store.currency)}${parseFloat(item.price).toFixed(2)}~ *${getCurrencySymbol(store.currency)}${currentItemPrice.toFixed(2)}* (Wholesale)`;
                }

                message += `${i+1}. ${item.name}${variantText}\n   ${item.qty} x ${priceText}\n`;
            });

            message += `\n*Subtotal:* ${getCurrencySymbol(store.currency)} ${cartSubtotal.toFixed(2)}\n`;
            if (appliedCoupon) {
                message += `*Discount (${appliedCoupon.code}):* -${getCurrencySymbol(store.currency)} ${calculateDiscountAmount().toFixed(2)}\n`;
            }
            if (shippingCost > 0) {
                message += `*Shipping:* ${getCurrencySymbol(store.currency)} ${shippingCost.toFixed(2)}\n`;
            }
            if (taxEnabled) {
                message += `*(Includes Tax: ${getCurrencySymbol(store.currency)} ${calculateTaxAmount().toFixed(2)})*\n`;
            }
            message += `*Final Total:* ${getCurrencySymbol(store.currency)} ${(finalTotal + shippingCost).toFixed(2)}\n\n`;
            
            if (formData.notes) message += `📝 *Note:* ${formData.notes}\n\n`;
            message += `_Please confirm my order. Thank you!_`;

            const encodedMsg = encodeURIComponent(message);
            const phone = store.whatsappNumber.replace(/[^0-9]/g, '');
            
            // Redirect to WhatsApp
            window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
            
            if (onCheckoutSuccess) {
                onCheckoutSuccess();
            }
            onClose();

        } catch (error) {
            console.error('Checkout error:', error);
            const errMsg = error.response?.data?.error || 'Failed to process order. Please try again.';
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="w-full max-w-lg bg-white h-full relative z-10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                
                <div className="px-4 md:px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6" /> Secure Checkout
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
                    
                    {/* Delivery Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Delivery Details</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                    <input required type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Delivery Address *</label>
                                <textarea required name="address" value={formData.address} onChange={handleInputChange} rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                    <input required type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input type="text" name="state" value={formData.state} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                                    <input required type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes / Special Instructions</label>
                                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" placeholder="E.g. Please wrap it as a gift..."></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Promo Code */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Discount Code</h3>
                        {appliedCoupon ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-700 font-medium">
                                    <Check className="w-5 h-5" />
                                    <span>Coupon <strong>{appliedCoupon.code}</strong> applied!</span>
                                </div>
                                <button onClick={removeCoupon} className="text-green-800 hover:text-red-600 text-sm font-bold transition-colors">
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Enter promo code" 
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm uppercase focus:ring-2 focus:ring-black outline-none font-medium"
                                    />
                                </div>
                                <button 
                                    onClick={handleApplyCoupon}
                                    disabled={!couponCode || isValidatingCoupon}
                                    className="bg-black text-white px-5 rounded-lg text-sm font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                                >
                                    {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-200">
                    <div className="space-y-3 mb-6 text-sm font-medium">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal ({cart.length} items)</span>
                            <span>{getCurrencySymbol(store.currency)}{cartSubtotal.toFixed(2)}</span>
                        </div>
                        {appliedCoupon && (
                            <div className="flex justify-between text-green-600 font-bold">
                                <span>Discount ({appliedCoupon.code})</span>
                                <span>-{getCurrencySymbol(store.currency)}{calculateDiscountAmount().toFixed(2)}</span>
                            </div>
                        )}
                        {shippingCost > 0 && (
                            <div className="flex justify-between text-gray-500">
                                <span>Shipping</span>
                                <span>{getCurrencySymbol(store.currency)}{shippingCost.toFixed(2)}</span>
                            </div>
                        )}
                        {taxEnabled && (
                            <div className="flex justify-between text-gray-400 text-xs mt-1">
                                <span>Includes Tax</span>
                                <span>{getCurrencySymbol(store.currency)}{calculateTaxAmount().toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3 mt-3">
                            <span>Total</span>
                            <span>{getCurrencySymbol(store.currency)}{(calculateFinalTotal() + shippingCost).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleCheckout}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[#25D366] hover:bg-[#128C7E] text-white text-lg font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-6 h-6 animate-spin" /> Processing...</>
                        ) : (
                            <>
                                {store.checkoutMode === 'gateway' ? 'Pay & Place Order' : 'Confirm & Send to WhatsApp'} 
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                        {store.checkoutMode === 'gateway' ? 'You will be redirected to secure payment gateway.' : 'Your order details will be sent directly to the seller via WhatsApp.'}
                    </p>
                </div>

            </div>
        </div>
    );
}
