import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import { X, ShieldCheck, Zap, PackageOpen, Image as ImageIcon } from 'lucide-react';

export default function NfcStoreModal({ isOpen, onClose }) {
    const { showToast } = useUI();
    const [step, setStep] = useState(1);
    
    // Form state
    const [productType, setProductType] = useState('metal_card');
    const [quantity, setQuantity] = useState(1);
    const [shippingAddress, setShippingAddress] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    // Dynamic catalog
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchCatalog();
        }
    }, [isOpen]);

    const fetchCatalog = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/nfc/catalog`);
            setProducts(data);
            if (data.length > 0) {
                setProductType(data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch catalog', err);
        } finally {
            setLoading(false);
        }
    };

    const selectedProduct = products.find(p => p.id === productType);
    const totalAmount = selectedProduct ? selectedProduct.price * quantity : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/nfc/order`, {
                productType: selectedProduct.name,
                quantity,
                shippingAddress,
                contactNumber,
                amount: totalAmount
            });
            
            setStep(3); // Success step
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to place order. Try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="relative p-6 sm:p-8 bg-gradient-to-br from-indigo-900 to-slate-900 text-white shrink-0">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-indigo-500/30 rounded-2xl">
                            <Zap className="w-8 h-8 text-indigo-300" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">NFC Physical Store</h2>
                            <p className="text-indigo-200">Elevate your networking with tap-to-share devices.</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Select a Product</h3>
                            
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : products.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                                    <PackageOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <h4 className="text-slate-500 font-medium">Store is currently empty. Check back later!</h4>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {products.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => setProductType(p.id)}
                                            className={`cursor-pointer rounded-2xl border-2 overflow-hidden transition-all flex flex-col ${productType === p.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-md shadow-indigo-500/20 transform -translate-y-1' : 'border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 bg-white dark:bg-slate-800'}`}
                                        >
                                            <div className="h-32 w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0">
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                                                )}
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col">
                                                <h4 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">{p.name}</h4>
                                                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mb-2">₹{p.price}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-2 flex-1">{p.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="flex justify-end pt-4">
                                <button disabled={products.length === 0} onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all">
                                    Continue to Shipping
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Order Summary</p>
                                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">{selectedProduct?.name}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-500 mb-1">Total (₹{selectedProduct?.price} x {quantity})</p>
                                    <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{totalAmount}</h4>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Quantity</label>
                                    <input type="number" min="1" max="100" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contact Number</label>
                                    <input type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="+91 9876543210" className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" required />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Shipping Address</label>
                                    <textarea value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} placeholder="House No, Street, City, State, Pincode" rows="3" className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" required />
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <button type="button" onClick={() => setStep(1)} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 dark:hover:text-white transition-colors">
                                    Back
                                </button>
                                <button type="submit" disabled={submitting} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
                                    {submitting ? <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin" /> : null}
                                    Place Order (Cash on Delivery / Request Link)
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Order Placed Successfully!</h3>
                            <p className="text-slate-500 mb-8 max-w-md mx-auto">Our team will contact you shortly on {contactNumber} to confirm your address and arrange payment & delivery.</p>
                            <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-8 py-3 rounded-xl font-bold transition-colors">
                                Close & Return to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
