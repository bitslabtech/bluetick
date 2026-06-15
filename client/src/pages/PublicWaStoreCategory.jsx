import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShoppingCart, X, Plus, Minus, Search, Home, ChevronRight, Menu, Filter, MessageCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import WaStoreFooter from '../components/WaStoreFooter';
import WaStoreHeader from '../components/WaStoreHeader';
import WaStoreCheckoutModal from '../components/WaStoreCheckoutModal';
import { getThemeConfig } from '../utils/wastoreThemes';
import { applyStoreSeo, cleanupStoreSeo } from '../utils/storeSeo';

const slugifyProduct = (name, id) => {
    const nameSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60);
    const shortId = id ? id.replace(/-/g, '').slice(0, 8) : '';
    return shortId ? `${nameSlug}--${shortId}` : nameSlug;
};

const API_BASE = `${import.meta.env.VITE_API_URL}`;
const imgUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function PublicWaStoreCategory({ customSlug }) {
    const params = useParams();
    const slug = customSlug || params.slug;
    const categoryName = decodeURIComponent(params.categoryName || '');
    const navigate = useNavigate();

    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem(`wa_cart_${slug}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState('newest');

    // Theme
    const theme = useMemo(() => getThemeConfig(store?.themeId), [store?.themeId]);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const timestamp = new Date().getTime();
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}?t=${timestamp}`);
                setStore(res.data.store);
                setProducts(res.data.products);
            } catch (error) {
                toast.error("Failed to load store");
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
        return () => cleanupStoreSeo();
    }, [slug]);

    useEffect(() => {
        localStorage.setItem(`wa_cart_${slug}`, JSON.stringify(cart));
    }, [cart, slug]);

    const categoryProducts = useMemo(() => {
        return products.filter(p => p.category === categoryName);
    }, [products, categoryName]);

    useEffect(() => {
        if (store) {
            applyStoreSeo(store, categoryName, categoryProducts, window.location.origin);
            
            let pageTitle = `${categoryName} - ${store.name}`;
            let pageDesc = `Browse our collection of ${categoryName} at ${store.name}.`;
            try {
                const parsedDetails = typeof store.categoryDetails === 'string' ? JSON.parse(store.categoryDetails) : (store.categoryDetails || {});
                const details = parsedDetails[categoryName] || {};
                pageTitle = details.metaTitle || pageTitle;
                pageDesc = details.metaDesc || details.description || pageDesc;
            } catch(e) {}
            
            document.title = pageTitle;
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = pageDesc;
        }
    }, [store, categoryName, categoryProducts]);

    const filteredAndSortedProducts = useMemo(() => {
        let result = [...categoryProducts];

        return result.sort((a, b) => {
            if (sortBy === 'price-asc') return parseFloat(a.price) - parseFloat(b.price);
            if (sortBy === 'price-desc') return parseFloat(b.price) - parseFloat(a.price);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [categoryProducts, sortBy]);

    const categories = useMemo(() => {
        const fromProducts = products.map(p => p.category).filter(Boolean);
        const adminCats = Array.isArray(store?.categories) ? store.categories : [];
        const merged = [...new Set([...adminCats, ...fromProducts])];
        return merged;
    }, [products, store]);

    const addToCart = (product, qty = 1) => {
        if (product.options && Array.isArray(product.options) && product.options.length > 0) {
            navigate(`/store/${slug}/product/${slugifyProduct(product.name, product.id)}`);
            return;
        }
        
        setCart(prev => {
            const existing = prev.find(item => (item.cartItemId || item.id) === product.id);
            if (existing) {
                return prev.map(item => (item.cartItemId || item.id) === product.id ? { ...item, qty: item.qty + qty } : item);
            }
            return [...prev, { ...product, cartItemId: product.id, qty }];
        });
        toast.success(`Added ${product.name} to cart`);
    };

    const updateQty = (cartItemId, delta) => {
        setCart(prev => {
            const updated = prev.map(item => {
                if ((item.cartItemId || item.id) === cartItemId) {
                    const newQty = item.qty + delta;
                    return newQty > 0 ? { ...item, qty: newQty } : null;
                }
                return item;
            });
            return updated.filter(Boolean);
        });
    };

    const cartSubtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
    const checkoutConfig = store?.checkoutConfig || {};
    const flatShippingRate = checkoutConfig.flatShippingRate || 0;
    const freeShippingThreshold = checkoutConfig.freeShippingThreshold || 0;
    const minOrderValue = checkoutConfig.minOrderValue || 0;
    const shippingCost = (flatShippingRate > 0 && (freeShippingThreshold === 0 || cartSubtotal < freeShippingThreshold)) ? flatShippingRate : 0;
    const cartTotal = cartSubtotal + shippingCost;
    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
        return symbols[code] || code;
    };

    const handleCheckoutSuccess = () => {
        setCart([]);
        setIsCartOpen(false);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" /></div>;
    if (!store) return <div className="h-screen flex items-center justify-center bg-white"><h1 className="text-2xl font-medium text-gray-900">Store Not Found</h1></div>;

    return (
        <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white pb-20 md:pb-0`} style={{ fontFamily: theme.fontFamily, scrollbarGutter: 'stable' }}>
            
            <WaStoreHeader 
                store={store} 
                theme={theme} 
                slug={slug} 
                products={products} 
                categories={categories} 
                cartCount={cartCount} 
                setIsCartOpen={setIsCartOpen} 
            />

            <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <nav aria-label="Breadcrumb" className="mb-8">
                    <ol className="flex items-center gap-1.5 flex-wrap text-sm">
                        <li>
                            <button
                                onClick={() => navigate(`/store/${slug}`)}
                                className={`flex items-center gap-1 hover:underline font-medium ${theme.textMuted} hover:${theme.text} transition-colors`}
                            >
                                <Home className="w-3.5 h-3.5" />
                                <span>{store.name}</span>
                            </button>
                        </li>
                        <li className={theme.textMuted}><ChevronRight className="w-3.5 h-3.5" /></li>
                        <li>
                            <span className={`font-semibold ${theme.text}`}>{categoryName}</span>
                        </li>
                    </ol>
                </nav>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <h1 className={`text-3xl font-bold ${theme.text}`}>{categoryName}</h1>
                    <div className="flex items-center gap-2 shrink-0">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select 
                            value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                            className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer py-1"
                        >
                            <option value="newest">New Arrivals</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>

                {filteredAndSortedProducts.length > 0 ? (() => {
                    const desktopCols = store.gridColumns?.desktop || 4;
                    const mobileCols = store.gridColumns?.mobile || 2;
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                    const cols = isMobile ? mobileCols : desktopCols;
                    return (
                        <div
                            className="grid gap-4 sm:gap-6"
                            style={{ gridTemplateColumns: `repeat(${mobileCols}, minmax(0, 1fr))` }}
                            ref={el => {
                                if (!el) return;
                                const update = () => {
                                    const w = window.innerWidth;
                                    const c = w < 640 ? (store.gridColumns?.mobile || 2)
                                            : w < 1024 ? Math.min(store.gridColumns?.desktop || 4, 3)
                                            : (store.gridColumns?.desktop || 4);
                                    el.style.gridTemplateColumns = `repeat(${c}, minmax(0, 1fr))`;
                                };
                                update();
                                window.addEventListener('resize', update);
                                el._cleanupGrid = () => window.removeEventListener('resize', update);
                            }}
                        >
                            {filteredAndSortedProducts.map(product => {
                                const isOutOfStock = product.trackQuantity ? product.stockQuantity <= 0 : !product.inStock;
                                const preventAdd = store.inventoryConfig?.preventCartAdd && isOutOfStock;
                                const showLowStock = store.inventoryConfig?.showLowStock && product.trackQuantity && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;

                                return (
                                <div key={product.id} className={`group cursor-pointer flex flex-col ${theme.cardStyle} h-full`} onClick={() => navigate(`/store/${slug}/product/${slugifyProduct(product.name, product.id)}`)}>
                                    <div className={`relative overflow-hidden shrink-0 ${theme.cardImageStyle}`}>
                                        {product.imageUrls && product.imageUrls[0] ? (
                                            <img src={imgUrl(product.imageUrls[0])} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" onError={e => e.target.style.display = 'none'} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><ShoppingBag className={`w-12 h-12 ${theme.textMuted}`} /></div>
                                        )}
                                        {isOutOfStock ? (
                                            <div className="absolute top-2 right-2 px-2.5 py-1 bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-sm shadow-sm">Out of Stock</div>
                                        ) : product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) ? (
                                            <div className={`absolute top-2 left-2 px-2.5 py-1 ${theme.saleBadge} text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-sm shadow-sm`}>
                                                Sale {Math.round((1 - parseFloat(product.price) / parseFloat(product.compareAtPrice)) * 100)}%
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className={`p-3 md:p-4 flex flex-col flex-1 ${theme.cardBodyStyle}`}>
                                        <div className="flex-1">
                                            <p className={`text-[9px] md:text-[11px] font-medium tracking-wider uppercase mb-1 md:mb-1.5 leading-none ${theme.textMuted}`}>{product.category}</p>
                                            <h3 className={`font-semibold text-[13px] md:text-[15px] leading-tight mb-1.5 md:mb-2 ${theme.text} line-clamp-2 capitalize`}>{product.name}</h3>
                                        </div>
                                        <div className="mt-auto">
                                            <div className="flex items-end gap-1.5 md:gap-2 mb-2 md:mb-3">
                                                <span className={`font-bold text-base md:text-lg ${theme.text}`}>{getCurrencySymbol(store.currency)}{parseFloat(product.price).toFixed(2)}</span>
                                                {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                                                    <span className={`text-xs md:text-sm line-through ${theme.textMuted} mb-0 md:mb-0.5`}>{getCurrencySymbol(store.currency)}{parseFloat(product.compareAtPrice).toFixed(2)}</span>
                                                )}
                                            </div>
                                            {showLowStock && (
                                                <p className="text-orange-500 text-[10px] md:text-xs font-medium mb-2 md:mb-3 leading-tight">Only {product.stockQuantity} left!</p>
                                            )}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); if(!preventAdd) addToCart(product); }}
                                                disabled={preventAdd}
                                                className={`w-full py-2 md:py-2.5 text-[12px] md:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 md:gap-2 transition-all ${preventAdd ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : theme.buttonStyle}`}
                                            >
                                                {preventAdd ? 'Out of Stock' : (
                                                    <><Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> Add to Cart</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    );
                })() : (
                    <div className={`text-center py-24 ${theme.cardStyle} rounded-3xl shadow-sm border border-transparent`}>
                        <ShoppingBag className={`w-12 h-12 ${theme.textMuted} mx-auto mb-4`} />
                        <h2 className={`text-lg font-semibold ${theme.text} mb-2`}>No products found</h2>
                        <p className={`text-sm ${theme.textMuted}`}>Try adjusting your filters or search query.</p>
                    </div>
                )}
            </main>

            {/* CART DRAWER */}
            <AnimatePresence>
                {isCartOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsCartOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className={`w-full max-w-md ${theme.pageBg} h-full relative z-10 flex flex-col shadow-2xl`}
                        >
                            <div className={`px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between ${theme.pageBg}`}>
                                <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme.text}`}>
                                    <ShoppingBag className="w-5 h-5" /> Your Cart
                                </h2>
                                <button onClick={() => setIsCartOpen(false)} className={`p-2 hover:opacity-70 rounded-full transition-colors ${theme.textMuted}`}><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                        <ShoppingBag className="w-16 h-16 opacity-20" />
                                        <p className="font-medium">Your cart is empty</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {cart.map(item => (
                                            <div key={item.cartItemId || item.id} className="flex gap-4 items-start">
                                                <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                                    {item.imageUrls && item.imageUrls[0] && (
                                                        <img src={imgUrl(item.imageUrls[0])} alt={item.name} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <h4 className={`font-semibold text-sm ${theme.text} truncate`}>{item.name}</h4>
                                                    <div className={`font-medium text-sm ${theme.textMuted} mt-1`}>{getCurrencySymbol(store.currency)}{parseFloat(item.price).toFixed(2)}</div>
                                                    <div className="flex items-center justify-between gap-3 mt-3">
                                                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                                            <button onClick={() => updateQty(item.cartItemId || item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-8 text-center text-xs font-semibold text-gray-900">{item.qty}</span>
                                                            <button onClick={() => updateQty(item.cartItemId || item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                        {item.qty > 1 && (
                                                            <div className={`font-bold text-sm ${theme.text}`}>
                                                                {getCurrencySymbol(store.currency)}{(parseFloat(item.price) * item.qty).toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className={`p-6 ${theme.pageBg} border-t border-black/5 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={theme.textMuted}>Subtotal</span>
                                        <span className={`text-lg font-bold ${theme.text}`}>{getCurrencySymbol(store.currency)}{cartSubtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-6 pt-2 border-t border-gray-100">
                                        <span className={theme.textMuted}>Total</span>
                                        <span className={`text-xl font-bold ${theme.text}`}>{getCurrencySymbol(store.currency)}{cartTotal.toFixed(2)}</span>
                                    </div>

                                    {cartSubtotal < minOrderValue ? (
                                        <div className="text-center p-3 bg-red-50 text-red-600 rounded-xl mb-4 text-sm font-medium">
                                            Minimum order value is {getCurrencySymbol(store.currency)}{minOrderValue}. Add {getCurrencySymbol(store.currency)}{(minOrderValue - cartSubtotal).toFixed(2)} more to checkout.
                                        </div>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => { setIsCartOpen(false); setIsCheckoutModalOpen(true); }}
                                                className="w-full py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                            >
                                                <MessageCircle className="w-5 h-5" /> Proceed to Checkout
                                            </button>
                                            <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                                                <Check className="w-3 h-3" /> Secure checkout via WhatsApp
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            {isCheckoutModalOpen && (
                <WaStoreCheckoutModal 
                    store={store} 
                    cart={cart} 
                    cartSubtotal={cartSubtotal}
                    shippingCost={shippingCost}
                    cartTotal={cartTotal} 
                    onClose={() => setIsCheckoutModalOpen(false)} 
                    onCheckoutSuccess={handleCheckoutSuccess} 
                />
            )}

            <WaStoreFooter store={store} />
        </div>
    );
}
