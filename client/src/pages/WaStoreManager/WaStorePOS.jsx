import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Plus, Minus, Search, User, Phone, Check, Receipt, X, Sliders, Layers, Sparkles, AlertCircle } from 'lucide-react';
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

    // Modal state for selecting variations
    const [variantModalProduct, setVariantModalProduct] = useState(null);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [modalQty, setModalQty] = useState(1);
    
    // Tax details from store settings
    const taxEnabled = store?.taxConfig?.enabled || false;
    const taxRate = parseFloat(store?.taxConfig?.rate) || 0;
    const taxName = store?.taxConfig?.type === 'gst' ? 'GST' : (store?.taxConfig?.type === 'vat' ? 'VAT' : 'Tax');
    
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
            const q = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(q) || 
                (p.sku && p.sku.toLowerCase().includes(q))
            );
        }
        return result;
    }, [products, searchQuery, selectedCategory]);

    // ── Variant Helpers ──────────────────────────────────────────────────────────
    const getParsedOptions = (prod) => {
        if (!prod?.options || !Array.isArray(prod.options)) return [];
        return prod.options.map(opt => {
            let values = [];
            if (Array.isArray(opt.values)) {
                values = opt.values.map(v => typeof v === 'string' ? v.trim() : v).filter(Boolean);
            } else if (typeof opt.values === 'string') {
                values = opt.values.split(',').map(v => v.trim()).filter(Boolean);
            }
            return {
                name: (opt.name || '').trim(),
                values
            };
        }).filter(opt => opt.name && opt.values.length > 0);
    };

    const hasProductVariants = (prod) => {
        if (!prod) return false;
        const opts = getParsedOptions(prod);
        const hasVariantsList = Array.isArray(prod.variants) && prod.variants.length > 0;
        return opts.length > 0 || hasVariantsList;
    };

    const resolveVariantPrice = (prod, selVars) => {
        if (!prod) return 0;
        if (!prod.variants?.length || !Object.keys(selVars || {}).length) {
            return parseFloat(prod.price) || 0;
        }
        const match = prod.variants.find(v =>
            v.combo && Object.entries(selVars).every(([k, val]) => v.combo[k] === val)
        );
        return match?.price != null ? parseFloat(match.price) : (parseFloat(prod.price) || 0);
    };

    const resolveVariantStock = (prod, selVars) => {
        if (!prod) return null;
        if (!prod.variants?.length || !Object.keys(selVars || {}).length) {
            return prod.stockQuantity ?? null;
        }
        const match = prod.variants.find(v =>
            v.combo && Object.entries(selVars).every(([k, val]) => v.combo[k] === val)
        );
        return match?.stock != null ? match.stock : (prod.stockQuantity ?? null);
    };

    const getCartItemId = (productId, selVariants) => {
        if (!selVariants || Object.keys(selVariants).length === 0) {
            return String(productId);
        }
        const variantString = Object.keys(selVariants).sort().map(k => `${k}:${selVariants[k]}`).join('-');
        return `${productId}-${variantString}`;
    };

    // ── Cart Operations ──────────────────────────────────────────────────────────
    const addDirectToCart = (product) => {
        const cartItemId = String(product.id);
        const price = parseFloat(product.price) || 0;
        setCart(prev => {
            const existing = prev.find(item => item.cartItemId === cartItemId);
            if (existing) {
                return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, {
                ...product,
                cartItemId,
                price,
                qty: 1,
                selectedVariants: null
            }];
        });
        toast.success(`Added ${product.name}`, { duration: 1200 });
    };

    const openVariantModal = (product) => {
        const opts = getParsedOptions(product);
        const initial = {};
        opts.forEach(opt => {
            if (opt.values && opt.values.length > 0) {
                initial[opt.name] = opt.values[0];
            }
        });
        setSelectedVariants(initial);
        setModalQty(1);
        setVariantModalProduct(product);
    };

    const handleProductCardClick = (product) => {
        if (hasProductVariants(product)) {
            openVariantModal(product);
        } else {
            addDirectToCart(product);
        }
    };

    const handleConfirmVariantAdd = () => {
        if (!variantModalProduct) return;
        const cartItemId = getCartItemId(variantModalProduct.id, selectedVariants);
        const price = resolveVariantPrice(variantModalProduct, selectedVariants);
        const qty = Math.max(1, parseInt(modalQty) || 1);

        setCart(prev => {
            const existing = prev.find(item => item.cartItemId === cartItemId);
            if (existing) {
                return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + qty } : item);
            }
            return [...prev, {
                ...variantModalProduct,
                cartItemId,
                price,
                qty,
                selectedVariants: { ...selectedVariants }
            }];
        });

        const variantSummary = Object.values(selectedVariants).join(', ');
        toast.success(`Added ${variantModalProduct.name} (${variantSummary}) x${qty}`, { duration: 1800 });
        setVariantModalProduct(null);
    };

    const updateQty = (cartItemId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) {
                const newQty = item.qty + delta;
                return newQty > 0 ? { ...item, qty: newQty } : item;
            }
            return item;
        }));
    };

    const removeFromCart = (cartItemId) => {
        setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.qty), 0);
    
    const calculateTaxAmount = () => {
        if (!taxEnabled) return 0;
        let totalTax = 0;
        cart.forEach(item => {
            let basePrice = parseFloat(item.price) || 0;
            let itemTaxRate = (item.taxRate !== null && item.taxRate !== undefined && !isNaN(parseFloat(item.taxRate)))
                ? parseFloat(item.taxRate)
                : (parseFloat(store?.taxConfig?.rate) || 0);
            
            if (store?.taxConfig?.taxInclusive) {
                totalTax += (basePrice - (basePrice / (1 + itemTaxRate / 100))) * item.qty;
            } else {
                totalTax += (basePrice * (itemTaxRate / 100)) * item.qty;
            }
        });
        return totalTax;
    };
    
    const taxAmount = calculateTaxAmount();
    const total = subtotal; // subtotal includes tax as per display logic

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!customerName || !customerPhone) return toast.error("Customer details required");

        setIsProcessing(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/orders/pos`, {
                customerName,
                customerPhone,
                items: cart.map(item => ({
                    id: item.id,
                    cartItemId: item.cartItemId,
                    name: item.name,
                    price: parseFloat(item.price),
                    qty: parseInt(item.qty) || 1,
                    selectedVariants: item.selectedVariants || null,
                    taxRate: (item.taxRate !== null && item.taxRate !== undefined && !isNaN(parseFloat(item.taxRate)))
                        ? parseFloat(item.taxRate)
                        : (parseFloat(store?.taxConfig?.rate) || null),
                    image: item.imageUrls?.[0] || null
                })),
                subtotal,
                taxAmount,
                total,
                taxRate: null, // mixed tax rates supported per item
                taxName: taxEnabled ? 'Tax' : null,
                sendInvoice: store?.taxConfig?.autoSendInvoice ?? true
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

    // Calculate current variant modal pricing and stock
    const modalCurrentPrice = variantModalProduct 
        ? resolveVariantPrice(variantModalProduct, selectedVariants) 
        : 0;
    const modalCurrentStock = variantModalProduct 
        ? resolveVariantStock(variantModalProduct, selectedVariants) 
        : null;
    const modalParsedOptions = variantModalProduct 
        ? getParsedOptions(variantModalProduct) 
        : [];

    return (
        <div className="flex flex-col md:flex-row gap-6 h-auto md:h-[calc(100vh-140px)]">
            {/* Products Section */}
            <div className="flex-1 flex flex-col bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm h-[60vh] md:h-auto">
                <div className="p-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">POS Catalog</h2>
                            <p className="text-xs text-slate-500">Tap any product to add to cart or select options</p>
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search products or SKU..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                    {/* Categories Scroll */}
                    <div className="flex overflow-x-auto hide-scrollbar gap-2 mt-4 pb-1">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {filteredProducts.map(product => {
                            const hasVariants = hasProductVariants(product);
                            return (
                                <div 
                                    key={product.id} 
                                    onClick={() => handleProductCardClick(product)}
                                    className="group relative border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-all flex flex-col h-full bg-white dark:bg-surface-dark shadow-sm hover:shadow"
                                >
                                    {/* Product Image & Badges */}
                                    <div className="relative w-full h-28 bg-slate-50 dark:bg-slate-800/60 rounded-lg mb-2.5 overflow-hidden flex items-center justify-center">
                                        {product.imageUrls?.[0] ? (
                                            <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                        ) : (
                                            <div className="text-slate-400 text-xs font-medium">No Image</div>
                                        )}
                                        {hasVariants && (
                                            <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-sm">
                                                <Sliders className="w-2.5 h-2.5" /> Options
                                            </span>
                                        )}
                                    </div>

                                    {/* Product Details */}
                                    <div className="mt-auto flex flex-col justify-between flex-1">
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {product.name}
                                            </h3>
                                            {product.sku && (
                                                <p className="text-[11px] text-slate-400 font-mono mb-1 truncate">
                                                    SKU: {product.sku}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 mt-1">
                                            <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                {currencySym}{parseFloat(product.price || 0).toFixed(2)}
                                            </p>
                                            <span className="text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 flex items-center gap-0.5">
                                                {hasVariants ? 'Select →' : '+ Add'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-400">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="font-medium text-sm">No products found matching your search.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cart / POS Register Section */}
            <div className="w-full md:w-[320px] lg:w-96 flex flex-col bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm h-[60vh] md:h-auto">
                <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark flex-shrink-0 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-indigo-500" /> POS Register
                    </h2>
                    {cart.length > 0 && (
                        <button 
                            onClick={() => setCart([])}
                            className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                        >
                            Clear All
                        </button>
                    )}
                </div>
                
                {/* Customer Details */}
                <div className="p-3.5 space-y-2.5 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Customer Name *"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Customer WhatsApp Number *"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[150px]">
                    {cart.length === 0 ? (
                        <div className="text-center text-slate-400 mt-10">
                            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">Cart is empty</p>
                            <p className="text-xs text-slate-400 mt-0.5">Click products on the left to add items</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.cartItemId} className="flex flex-col bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600">
                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white leading-tight block truncate">
                                            {item.name}
                                        </span>
                                        {/* Display selected variations */}
                                        {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {Object.entries(item.selectedVariants).map(([k, v]) => (
                                                    <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                                                        {k}: {v}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => removeFromCart(item.cartItemId)} 
                                        className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors shrink-0"
                                        title="Remove item"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 mt-1">
                                    <div>
                                        <p className="text-[11px] text-slate-400">
                                            {currencySym}{parseFloat(item.price).toFixed(2)} each
                                        </p>
                                        <p className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                                            {currencySym}{(parseFloat(item.price) * item.qty).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                        <button 
                                            onClick={() => updateQty(item.cartItemId, -1)} 
                                            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300"
                                            title="Decrease quantity"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-xs font-bold w-5 text-center text-slate-900 dark:text-white">{item.qty}</span>
                                        <button 
                                            onClick={() => updateQty(item.cartItemId, 1)} 
                                            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300"
                                            title="Increase quantity"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Checkout Summary */}
                <div className="p-4 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-white/10 space-y-2 flex-shrink-0">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Items Count</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                            {cart.reduce((sum, item) => sum + item.qty, 0)} units ({cart.length} lines)
                        </span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{currencySym}{subtotal.toFixed(2)}</span>
                    </div>
                    {taxEnabled && (
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Includes {taxName}</span>
                            <span className="font-medium">{currencySym}{taxAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-white/10 mt-2">
                        <span>Grand Total</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{currencySym}{total.toFixed(2)}</span>
                    </div>
                    
                    <button 
                        onClick={handleCheckout}
                        disabled={isProcessing || cart.length === 0}
                        className="w-full mt-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
                    >
                        {isProcessing ? 'Processing...' : (
                            <>
                                <Receipt className="w-5 h-5" /> Checkout & Send Invoice
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── POS Variation Selector Modal ────────────────────────────────────── */}
            {variantModalProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onKeyDown={e => {
                            if (e.key === 'Escape') setVariantModalProduct(null);
                            if (e.key === 'Enter') handleConfirmVariantAdd();
                        }}
                    >
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                            <div className="flex items-center gap-3 min-w-0">
                                {variantModalProduct.imageUrls?.[0] ? (
                                    <img 
                                        src={variantModalProduct.imageUrls[0]} 
                                        alt={variantModalProduct.name} 
                                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs shrink-0">
                                        No Image
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                        {variantModalProduct.name}
                                    </h3>
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                                        {currencySym}{modalCurrentPrice.toFixed(2)}
                                        {variantModalProduct.compareAtPrice && parseFloat(variantModalProduct.compareAtPrice) > modalCurrentPrice && (
                                            <span className="text-slate-400 line-through text-[11px] ml-1.5 font-normal">
                                                {currencySym}{parseFloat(variantModalProduct.compareAtPrice).toFixed(2)}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setVariantModalProduct(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body: Option Selectors */}
                        <div className="p-5 overflow-y-auto space-y-4">
                            {modalParsedOptions.map(opt => (
                                <div key={opt.name} className="space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                            {opt.name}
                                        </span>
                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                            {selectedVariants[opt.name]}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {opt.values.map(val => {
                                            const isSelected = selectedVariants[opt.name] === val;
                                            return (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => setSelectedVariants(prev => ({ ...prev, [opt.name]: val }))}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                        isSelected
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/30'
                                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {val}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Stock Indicator if tracked */}
                            {variantModalProduct.trackQuantity && (
                                <div className="text-xs flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                    <span className="text-slate-500">Available Stock:</span>
                                    <span className={`font-bold ${modalCurrentStock <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {modalCurrentStock !== null ? `${modalCurrentStock} units in stock` : 'Available'}
                                    </span>
                                </div>
                            )}

                            {/* Quantity Stepper */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quantity</span>
                                <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                                    <button 
                                        type="button"
                                        onClick={() => setModalQty(prev => Math.max(1, prev - 1))}
                                        className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-sm font-bold w-7 text-center text-slate-900 dark:text-white">{modalQty}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setModalQty(prev => prev + 1)}
                                        className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setVariantModalProduct(null)}
                                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmVariantAdd}
                                className="flex-[2] py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Check className="w-4 h-4" /> Add to POS Cart — {currencySym}{(modalCurrentPrice * modalQty).toFixed(2)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
