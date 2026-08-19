import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, ArrowRight, Tag, Loader2, Check } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useStoreCustomerOptional } from '../context/StoreCustomerContext';

const INDIAN_STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
    "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", 
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", 
    "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", 
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
    "Uttarakhand", "West Bengal"
];

const COUNTRY_CODES = [
    { code: '+91', label: 'IN (+91)' },
    { code: '+1', label: 'US/CA (+1)' },
    { code: '+44', label: 'UK (+44)' },
    { code: '+61', label: 'AU (+61)' },
    { code: '+971', label: 'UAE (+971)' },
    { code: '+65', label: 'SG (+65)' },
    { code: '+60', label: 'MY (+60)' },
    { code: '+94', label: 'LK (+94)' },
    { code: '+880', label: 'BD (+880)' },
    { code: '+977', label: 'NP (+977)' },
];


export default function WaStoreCheckoutModal({ store, cart, cartSubtotal, shippingCost, cartTotal, onClose, onCheckoutSuccess }) {
    // Returns null gracefully if not inside StoreCustomerProvider
    const storeCustomerCtx = useStoreCustomerOptional();
    const storeCustomer = storeCustomerCtx?.customer || null;

    const [countryCode, setCountryCode] = useState('+91');


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

    // B2B GST details (optional, only shown when store has GST enabled)
    const [gstDetails, setGstDetails] = useState({ company: '', gstin: '', pan: '' });
    const [showGstSection, setShowGstSection] = useState(false);
    const isGstStore = store?.taxConfig?.enabled && store?.taxConfig?.type === 'gst';

    const savedAddresses = storeCustomer?.savedAddresses || [];
    const defaultIdx = savedAddresses.length > 0 ? (savedAddresses.findIndex(a => a.isDefault) > -1 ? savedAddresses.findIndex(a => a.isDefault) : 0) : -1;
    const [selectedAddressIdx, setSelectedAddressIdx] = useState(defaultIdx);
    const [saveNewAddress, setSaveNewAddress] = useState(false);
    const [newAddressLabel, setNewAddressLabel] = useState('Home');

    // Pre-fill form when logged-in customer or selected address changes
    useEffect(() => {
        if (storeCustomer) {
            let addr = null;
            if (selectedAddressIdx >= 0 && savedAddresses[selectedAddressIdx]) {
                addr = savedAddresses[selectedAddressIdx];
            }
            
            let parsedPhone = storeCustomer.phone || '';
            let parsedCountry = '+91';
            
            if (storeCustomer.phone) {
                if (storeCustomer.phone.startsWith('+91')) {
                    parsedPhone = storeCustomer.phone.substring(3);
                } else if (storeCustomer.phone.startsWith('91') && storeCustomer.phone.length > 10) {
                    parsedPhone = storeCustomer.phone.substring(2);
                } else {
                    const matchedCode = COUNTRY_CODES.find(c => storeCustomer.phone.startsWith(c.code) && c.code !== '+91');
                    if (matchedCode) {
                        parsedCountry = matchedCode.code;
                        parsedPhone = storeCustomer.phone.substring(matchedCode.code.length);
                    }
                }
                setCountryCode(parsedCountry);
            }
            
            setFormData(prev => ({
                ...prev,
                name: storeCustomer.name || prev.name,
                phone: parsedPhone || prev.phone,
                email: storeCustomer.email || prev.email,
                address: addr ? addr.address : (selectedAddressIdx === -1 ? '' : prev.address),
                city: addr ? addr.city : (selectedAddressIdx === -1 ? '' : prev.city),
                state: addr ? addr.state : (selectedAddressIdx === -1 ? '' : prev.state),
                pincode: addr ? addr.pincode : (selectedAddressIdx === -1 ? '' : prev.pincode),
            }));
        }
    }, [storeCustomer, selectedAddressIdx]);


    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', INR: '\u20B9' };
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

    const handlePhoneChange = (e) => {
        const val = e.target.value.replace(/\D/g, ''); // only digits
        setFormData({ ...formData, phone: val });
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

    const getDiscountedSubtotal = () => {
        if (!appliedCoupon) return cartSubtotal;
        if (appliedCoupon.discountType === 'percentage') {
            return cartSubtotal - (cartSubtotal * (parseFloat(appliedCoupon.discountValue) / 100));
        } else {
            return Math.max(0, cartSubtotal - parseFloat(appliedCoupon.discountValue));
        }
    };

    const calculateDiscountAmount = () => {
        return cartSubtotal - getDiscountedSubtotal();
    };

    const calculateFinalTotal = () => {
        let baseTotal = getDiscountedSubtotal();
        if (taxEnabled && !store?.taxConfig?.taxInclusive) {
            baseTotal += calculateTaxAmount();
        }
        return baseTotal;
    };

    const taxEnabled = store?.taxConfig?.enabled || false;
    const taxName = store?.taxConfig?.type === 'gst' ? 'GST' : (store?.taxConfig?.type === 'vat' ? 'VAT' : 'Tax');

    // Compute effective average tax rate for backend (for display on invoice)
    const calculateEffectiveTaxRate = () => {
        if (!taxEnabled || cart.length === 0) return 0;
        let totalBase = 0, totalTax = 0;
        cart.forEach(item => {
            const basePrice = getItemPrice(item);
            const rate = item.taxRate !== null && item.taxRate !== undefined ? parseFloat(item.taxRate) : (parseFloat(store?.taxConfig?.rate) || 0);
            if (!store.taxConfig.taxInclusive) {
                totalTax += basePrice * (rate / 100) * item.qty;
            } else {
                totalTax += (basePrice - (basePrice / (1 + rate / 100))) * item.qty;
            }
            totalBase += basePrice * item.qty;
        });
        return totalBase > 0 ? parseFloat(((totalTax / totalBase) * 100).toFixed(2)) : 0;
    };
    
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
        if (appliedCoupon && cartSubtotal > 0) {
            const discountRatio = calculateDiscountAmount() / cartSubtotal;
            totalTax = totalTax * Math.max(0, 1 - discountRatio);
        }
        
        return totalTax;
    };

    const handleCheckout = async (e) => {
        e.preventDefault();
        
        if (storeCustomerCtx && storeCustomer && selectedAddressIdx === -1 && saveNewAddress) {
            try {
                await storeCustomerCtx.addAddress({
                    label: newAddressLabel,
                    name: formData.name,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.pincode,
                    isDefault: savedAddresses.length === 0
                });
            } catch (err) {
                console.error('Failed to save address:', err);
            }
        }

        if (!formData.name?.trim() || !formData.phone?.trim() || !formData.address?.trim() || !formData.city?.trim() || !formData.state?.trim() || !formData.pincode?.trim()) {
            toast.error("Please fill in all the required delivery fields.");
            return;
        }

        if (countryCode === '+91' && formData.phone.length !== 10) {
            toast.error("Please enter a valid 10-digit Indian phone number.");
            return;
        }


        if (showGstSection && gstDetails.gstin) {
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (gstDetails.gstin.length !== 15 || !gstinRegex.test(gstDetails.gstin)) {
                toast.error("Please enter a valid 15-character GSTIN (e.g., 22AAAAA0000A1Z5).");
                return;
            }
        }

        setIsSubmitting(true);
        
        const finalTotal = calculateFinalTotal();

        try {
            // Record Order in Backend
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/orders`, {
                storeId: store.id,
                customerName: formData.name,
                customerPhone: `${countryCode}${formData.phone}`,
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
                taxRate: calculateEffectiveTaxRate(),
                taxName: taxEnabled ? taxName : null,
                total: finalTotal + shippingCost,
                couponCode: appliedCoupon ? appliedCoupon.code : null,
                currency: store.currency,
                // Buyer GST details (B2B)
                customerGstin: gstDetails.gstin || null,
                customerCompany: gstDetails.company || null,
                // Link to logged-in customer account if available
                storeCustomerId: storeCustomer ? storeCustomer.id : null,
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
            let message = `*New Order Request*\n`;
            message += `-----------------------------------\n\n`;
            
            message += `*Customer Details:*\n`;
            message += `Name: ${formData.name}\n`;
            message += `Phone: ${formData.phone}\n`;
            if (formData.email) message += `Email: ${formData.email}\n`;
            message += `Address: ${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}\n\n`;
            
            message += `*Order Items:*\n`;
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

                message += `${i+1}. *${item.name}*${variantText}\n   └ ${item.qty} x ${priceText}\n\n`;
            });

            message += `-----------------------------------\n`;
            message += `*Subtotal:* ${getCurrencySymbol(store.currency)} ${cartSubtotal.toFixed(2)}\n`;
            if (appliedCoupon) {
                message += `*Discount (${appliedCoupon.code}):* -${getCurrencySymbol(store.currency)} ${calculateDiscountAmount().toFixed(2)}\n`;
            }
            if (shippingCost > 0) {
                message += `*Shipping:* ${getCurrencySymbol(store.currency)} ${shippingCost.toFixed(2)}\n`;
            }
            if (taxEnabled) {
                if (store.taxConfig.taxInclusive) {
                    message += `*(Includes Tax: ${getCurrencySymbol(store.currency)} ${calculateTaxAmount().toFixed(2)})*\n`;
                } else {
                    message += `*Tax:* ${getCurrencySymbol(store.currency)} ${calculateTaxAmount().toFixed(2)}\n`;
                }
            }
            message += `*Final Total:* ${getCurrencySymbol(store.currency)} ${(calculateFinalTotal() + shippingCost).toFixed(2)}\n`;
            message += `-----------------------------------\n\n`;
            
            if (formData.notes) message += `*Note:* ${formData.notes}\n\n`;

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
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={onClose} />
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
                                    <div className="flex w-full border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-black focus-within:border-black overflow-hidden bg-white">
                                        <select 
                                            value={countryCode} 
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="bg-gray-50 border-r border-gray-300 px-2 py-2 text-sm outline-none cursor-pointer"
                                        >
                                            {COUNTRY_CODES.map(c => (
                                                <option key={c.code} value={c.code}>{c.label}</option>
                                            ))}
                                        </select>
                                        <input 
                                            required 
                                            type="tel" 
                                            name="phone" 
                                            value={formData.phone} 
                                            onChange={handlePhoneChange} 
                                            className="w-full px-3 py-2 text-sm outline-none" 
                                            placeholder="Enter phone number"
                                            maxLength={countryCode === '+91' ? 10 : 15}
                                        />
                                    </div>
                                </div>

                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                            </div>

                            {/* Saved Addresses List */}
                            {savedAddresses.length > 0 && (
                                <div className="mt-4 mb-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Shipping Address</label>
                                    <div className="space-y-2">
                                        {savedAddresses.map((addr, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => setSelectedAddressIdx(idx)}
                                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedAddressIdx === idx ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                                        {addr.label || 'Home'}
                                                    </span>
                                                    {selectedAddressIdx === idx && <Check className="w-4 h-4 text-black" />}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">{addr.address}, {addr.city}, {addr.state} {addr.pincode}</p>
                                            </div>
                                        ))}
                                        <div 
                                            onClick={() => setSelectedAddressIdx(-1)}
                                            className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between ${selectedAddressIdx === -1 ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <span className="text-sm font-medium text-gray-800">Use a new address</span>
                                            {selectedAddressIdx === -1 && <Check className="w-4 h-4 text-black" />}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Address Form (Shown if New Address or No Saved Addresses) */}
                            {selectedAddressIdx === -1 && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Delivery Address *</label>
                                        <textarea required name="address" value={formData.address} onChange={handleInputChange} rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"></textarea>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                                            <select required name="state" value={formData.state} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none bg-white">
                                                <option value="" disabled>Select State</option>
                                                {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                            <input required type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                                            <input required type="text" pattern="[0-9]{6}" maxLength="6" minLength="6" title="Please enter a valid 6-digit Pincode" name="pincode" value={formData.pincode} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                                        </div>
                                    </div>

                                    {/* Save Address Option for Logged-in Users */}
                                    {storeCustomer && (
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <label className="flex items-center cursor-pointer mb-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={saveNewAddress} 
                                                    onChange={(e) => setSaveNewAddress(e.target.checked)}
                                                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 font-medium">Save this address to my account for next time</span>
                                            </label>
                                            
                                            {saveNewAddress && (
                                                <div className="pl-6 mt-2">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Address Label (e.g. Home, Office)</label>
                                                    <input 
                                                        type="text" 
                                                        value={newAddressLabel} 
                                                        onChange={(e) => setNewAddressLabel(e.target.value)} 
                                                        className="w-full sm:w-1/2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes / Special Instructions</label>
                                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" placeholder="Add any notes for the seller here..."></textarea>
                            </div>
                        </div>
                    </div>

                    {/* B2B GST Details (shown only for GST-enabled stores) */}
                    {isGstStore && (
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowGstSection(v => !v)}
                                className="w-full flex items-center justify-between text-left text-sm font-semibold text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-lg px-4 py-3 hover:bg-indigo-100 transition-colors"
                            >
                                <span>🏢 GST / Business Details <span className="font-normal text-indigo-500">(Optional — for B2B purchases)</span></span>
                                <span className="text-lg">{showGstSection ? '▲' : '▼'}</span>
                            </button>
                            {showGstSection && (
                                <div className="mt-3 space-y-3 p-4 border border-indigo-100 rounded-lg bg-indigo-50/50">
                                    <p className="text-xs text-indigo-600">Fill in your business details to receive a GST-compliant invoice and claim Input Tax Credit (ITC).</p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Business / Company Name</label>
                                        <input
                                            type="text"
                                            value={gstDetails.company}
                                            onChange={e => setGstDetails(d => ({ ...d, company: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            placeholder="Your Registered Business Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                                        <input
                                            type="text"
                                            value={gstDetails.gstin}
                                            onChange={e => setGstDetails(d => ({ ...d, gstin: e.target.value.toUpperCase() }))}
                                            maxLength={15}
                                            pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
                                            title="Please enter a valid GSTIN (e.g., 22AAAAA0000A1Z5)"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase"
                                            placeholder="22AAAAA0000A1Z5"
                                        />
                                        {gstDetails.gstin && (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstDetails.gstin)) && (
                                            <p className="text-xs text-red-500 mt-1">Please enter a valid GSTIN</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                                <span>{store.taxConfig.taxInclusive ? 'Includes Tax' : 'Tax'}</span>
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
