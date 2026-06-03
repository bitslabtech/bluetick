import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Plus, Minus, Search, User, Phone, Check, Receipt, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaStorePOS() {
    const { storeId, store } = useOutletContext();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Tax details from store settings
    const taxEnabled = store?.taxConfig?.enabled || false;
    const taxRate = parseFloat(store?.taxConfig?.rate) || 0;
    const taxName = store?.taxConfig?.name || 'Tax';
    
    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
        return symbols[code] || code;
    };
    const currencySym = getCurrencySymbol(store?.currency || 'USD');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/products`);
                setProducts(res.data.filter(p => p.inStock));
            } catch (error) {
                toast.error("Failed to load products");
            }
        };
        fetchProducts();
    }, [storeId]);

    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return ['All', ...Array.from(cats)];
    }, [products]);

    const filteredProducts = useMemo(() => {
        let result = products;
        if (selectedCategory !== 'All') {
            result = result.filter(p => p.category === selectedCategory);
        }
        if (searchQuery) {
            result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return result;
    }, [products, searchQuery, selectedCategory]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.qty + delta;
                return newQty > 0 ? { ...item, qty: newQty } : item;
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
    const taxAmount = taxEnabled ? (subtotal * taxRate) / 100 : 0;
    const total = subtotal + taxAmount;

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!customerName || !customerPhone) return toast.error("Customer details required");

        setIsProcessing(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders/pos`, {
                customerName,
                customerPhone,
                items: cart,
                subtotal,
                taxAmount,
                total,
                taxRate,
                taxName,
                sendInvoice: store?.taxConfig?.autoSendInvoice || true
            });
            
            toast.success("Order completed successfully!");
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to process POS order");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-auto md:h-[calc(100vh-140px)]">
            {/* Products Section */}
            <div className="flex-1 flex flex-col bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm h-[60vh] md:h-auto">
                <div className="p-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Products</h2>
                        <div className="relative w-full sm:w-auto">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                    </div>
                    {/* Categories Scroll */}
                    <div className="flex overflow-x-auto hide-scrollbar gap-2 mt-4 pb-1">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                    selectedCategory === cat
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map(product => (
                            <div 
                                key={product.id} 
                                onClick={() => addToCart(product)}
                                className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all flex flex-col h-full"
                            >
                                {product.imageUrls?.[0] ? (
                                    <img src={product.imageUrls[0]} alt={product.name} className="w-full h-24 object-cover rounded-lg mb-3" />
                                ) : (
                                    <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 flex items-center justify-center text-slate-400">No Image</div>
                                )}
                                <div className="mt-auto">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mb-1">{product.name}</h3>
                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                        {currencySym}{product.price}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full py-10 text-center text-slate-500">
                                No products found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cart / POS Register Section */}
            <div className="w-full md:w-[320px] lg:w-96 flex flex-col bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm h-[60vh] md:h-auto">
                <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-indigo-500" /> POS Register
                    </h2>
                </div>
                
                {/* Customer Details */}
                <div className="p-4 space-y-3 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Customer Name"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Customer WhatsApp Number"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[150px]">
                    {cart.length === 0 ? (
                        <div className="text-center text-slate-500 mt-10">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex flex-col bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{item.name}</span>
                                    <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                                        {currencySym}{(parseFloat(item.price) * item.qty).toFixed(2)}
                                    </p>
                                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                        <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300"><Minus className="w-3 h-3" /></button>
                                        <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300"><Plus className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Checkout Summary */}
                <div className="p-4 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-white/10 space-y-2 flex-shrink-0">
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Subtotal</span>
                        <span className="font-medium text-slate-900 dark:text-white">{currencySym}{subtotal.toFixed(2)}</span>
                    </div>
                    {taxEnabled && (
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>{taxName} ({taxRate}%)</span>
                            <span className="font-medium text-slate-900 dark:text-white">{currencySym}{taxAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-black text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-white/10">
                        <span>Total</span>
                        <span>{currencySym}{total.toFixed(2)}</span>
                    </div>
                    
                    <button 
                        onClick={handleCheckout}
                        disabled={isProcessing || cart.length === 0}
                        className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing...' : (
                            <>
                                <Receipt className="w-5 h-5" /> Checkout & Invoice
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
