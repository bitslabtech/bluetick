import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ChevronLeft, Check, Truck, ShieldCheck, ArrowRight, ArrowLeft, Menu, Home, FileText, ChevronDown, ChevronUp, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import WaStoreFooter from '../components/WaStoreFooter';
import WaStoreCheckoutModal from '../components/WaStoreCheckoutModal';
import { getThemeConfig } from '../utils/wastoreThemes';

const API_BASE = `${import.meta.env.VITE_API_URL}`;
const imgUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function PublicWaProduct({ customSlug }) {
    const params = useParams();
    const slug = customSlug || params.slug;
    const productId = params.productId;
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem(`wa_cart_${slug}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [activeImageIdx, setActiveImageIdx] = useState(0);

    // Theme
    const theme = React.useMemo(() => getThemeConfig(store?.themeId), [store?.themeId]);

    // Mobile Navigation Drawer
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedMobileSections, setExpandedMobileSections] = useState({ categories: true, policies: false });
    const [activePolicy, setActivePolicy] = useState(null);

    const categories = React.useMemo(() => {
        const cats = store?.categories || [];
        if (typeof cats === 'string') {
            try { return ['All', ...JSON.parse(cats)]; } catch { return ['All']; }
        }
        return ['All', ...(Array.isArray(cats) ? cats : [])];
    }, [store]);

    // Pre-select first options if available
    useEffect(() => {
        if (product?.options && Array.isArray(product.options)) {
            const initial = {};
            product.options.forEach(opt => {
                if (opt.values && opt.values.length > 0) {
                    initial[opt.name] = opt.values[0];
                }
            });
            setSelectedVariants(initial);
        }
        // Reset image index when product changes
        setActiveImageIdx(0);
    }, [product]);

    useEffect(() => {
        localStorage.setItem(`wa_cart_${slug}`, JSON.stringify(cart));
    }, [cart, slug]);

    useEffect(() => {
        const fetchProductData = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}`);
                setStore(res.data.store);
                const foundProduct = res.data.products.find(p => p.id === productId);
                
                if (foundProduct) {
                    setProduct(foundProduct);
                    document.title = `${foundProduct.name} | ${res.data.store.name}`;
                } else {
                    toast.error("Product not found");
                }
            } catch (error) {
                toast.error("Failed to load product details");
            } finally {
                setLoading(false);
            }
        };
        fetchProductData();
        
        // Scroll to top on mount
        window.scrollTo(0, 0);
    }, [slug, productId]);

    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
        return symbols[code] || code;
    };

    const addToCart = () => {
        if (!product) return;

        // Validate variants
        if (product.options && Array.isArray(product.options)) {
            for (let opt of product.options) {
                if (!selectedVariants[opt.name]) {
                    toast.error(`Please select a ${opt.name}`);
                    return;
                }
            }
        }

        // Create a unique ID for the cart item based on variants
        const variantString = Object.values(selectedVariants).sort().join('-');
        const cartItemId = variantString ? `${product.id}-${variantString}` : product.id;

        setCart(prev => {
            const existing = prev.find(item => item.cartItemId === cartItemId);
            if (existing) {
                return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + qty } : item);
            }
            return [...prev, { ...product, cartItemId, qty, selectedVariants }];
        });
        toast.success(`Added ${qty} ${product.name} to cart`);
    };

    const handleCheckoutSuccess = () => {
        setCart([]);
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
        </div>
    );
    
    if (!store || !product) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
            <ShoppingBag className="w-16 h-16 text-gray-300" />
            <h1 className="text-2xl font-semibold text-gray-900">Product Not Found</h1>
            <button onClick={() => navigate(`/store/${slug}`)} className="text-black font-medium hover:underline flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Store
            </button>
        </div>
    );

    return (
        <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white`} style={{ fontFamily: theme.fontFamily }}>
            
            {/* ─── MODERN HEADER ─── */}
            <header className={`sticky top-0 z-50 ${theme.header}`}>
                <div className={theme.headerWrapper || "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between"}>
                    {/* Logo & Store Name */}
                    <div className={`flex items-center gap-3 ${theme.logoWrapper || ''}`}>
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className={`md:hidden p-2 -ml-2 rounded-lg ${theme.textMuted} hover:${theme.text} transition-colors`}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <button onClick={() => navigate(`/store/${slug}`)} className={`mr-2 p-2 hidden md:block hover:opacity-70 rounded-full transition-colors ${theme.textMuted} hover:${theme.text}`} title="Back to Store">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        {store.logo && (
                            <img src={imgUrl(store.logo)} alt={store.name} className="w-10 h-10 object-contain rounded-md" onError={e => e.target.style.display = 'none'} />
                        )}
                        <span className={`font-semibold text-xl tracking-tight ${theme.headerLogo}`}>{store.name}</span>
                    </div>

                    {/* Cart Button (Navigates back to store to view cart) */}
                    <button 
                        onClick={() => navigate(`/store/${slug}`)}
                        className={`relative p-2.5 ${theme.cartButton} rounded-full transition-colors flex items-center gap-2 ${theme.cartWrapper || ''}`}
                        title="View Cart"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        <span className="hidden sm:inline font-medium text-sm">Cart</span>
                        {cart.reduce((sum, item) => sum + item.qty, 0) > 0 && (
                            <span className={`absolute top-1 right-1 sm:-top-1 sm:-right-2 ${theme.cartBadge} text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full`}>
                                {cart.reduce((sum, item) => sum + item.qty, 0)}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
                <div className="lg:grid lg:grid-cols-1 md:grid-cols-2 lg:gap-x-16 xl:gap-x-24">
                    
                    {/* Left: Product Image Gallery */}
                    <div className="mb-10 lg:mb-0">
                        {/* Main Image */}
                        <div className={`aspect-square ${theme.cardImageStyle} overflow-hidden relative shadow-sm bg-gray-50 dark:bg-gray-900`}>
                            {product.imageUrls && product.imageUrls[activeImageIdx] ? (
                                <img
                                    key={activeImageIdx}
                                    src={imgUrl(product.imageUrls[activeImageIdx])}
                                    alt={`${product.name} - Image ${activeImageIdx + 1}`}
                                    className="w-full h-full object-contain transition-all duration-500"
                                    onError={e => e.target.style.display = 'none'}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingBag className={`w-24 h-24 ${theme.textMuted}`} />
                                </div>
                            )}
                            {product.compareAtPrice && (
                                <div className={`absolute top-6 left-6 ${theme.badgeStyle} shadow-lg`}>Sale</div>
                            )}
                            {/* Image counter badge */}
                            {product.imageUrls && product.imageUrls.length > 1 && (
                                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                                    {activeImageIdx + 1} / {product.imageUrls.length}
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Strip */}
                        {product.imageUrls && product.imageUrls.length > 1 && (
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {product.imageUrls.map((url, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveImageIdx(idx)}
                                        className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                            activeImageIdx === idx
                                                ? 'border-black dark:border-white scale-105 shadow-md'
                                                : 'border-transparent opacity-60 hover:opacity-90 hover:border-gray-300'
                                        }`}
                                    >
                                        <img
                                            src={imgUrl(url)}
                                            alt={`Thumbnail ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={e => e.target.style.display = 'none'}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Product Details */}
                    <div className="flex flex-col">
                        <div className="pb-8 border-b border-gray-100">
                            {product.category && (
                                <span className={`text-sm font-bold uppercase tracking-widest ${theme.textMuted} mb-3 block`}>
                                    {product.category}
                                </span>
                            )}
                            <h1 className={`text-4xl sm:text-5xl font-extrabold ${theme.text} tracking-tight leading-tight mb-4`}>
                                {product.name}
                            </h1>
                            <div className="flex items-center gap-4">
                                <span className={`${theme.priceStyle} !text-3xl`}>
                                    {getCurrencySymbol(store.currency)}{parseFloat(product.price).toFixed(2)}
                                </span>
                                {product.compareAtPrice && (
                                    <span className={`${theme.priceCompareStyle} !text-xl`}>
                                        {getCurrencySymbol(store.currency)}{parseFloat(product.compareAtPrice).toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={`py-8 prose prose-lg prose-gray ${theme.textMuted}`}>
                            <p className="leading-relaxed">
                                {product.description || 'This product does not have a description yet. Contact the store for more details.'}
                            </p>
                        </div>

                        {/* Variants */}
                        {product.options && Array.isArray(product.options) && product.options.length > 0 && (
                            <div className="mb-8 space-y-6">
                                {product.options.map((option, idx) => (
                                    <div key={idx}>
                                        <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>{option.name}</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {option.values.map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => setSelectedVariants(prev => ({ ...prev, [option.name]: val }))}
                                                    className={`px-5 py-2.5 text-sm font-medium transition-all ${
                                                        selectedVariants[option.name] === val 
                                                        ? theme.categoryTabActive 
                                                        : theme.categoryTab
                                                    }`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity and Actions */}
                        <div className="mt-auto pt-8 border-t border-gray-100">
                            
                            <div className="flex items-center gap-6 mb-6">
                                <div className={`font-medium ${theme.text}`}>Quantity</div>
                                <div className={`flex items-center ${theme.pageBg} rounded-xl border border-gray-200 p-1`}>
                                    <button 
                                        onClick={() => setQty(Math.max(1, qty - 1))} 
                                        className={`w-10 h-10 flex items-center justify-center hover:opacity-70 rounded-lg transition-all ${theme.textMuted}`}
                                    >
                                        -
                                    </button>
                                    <span className={`w-12 text-center font-semibold text-lg ${theme.text}`}>{qty}</span>
                                    <button 
                                        onClick={() => setQty(qty + 1)} 
                                        className={`w-10 h-10 flex items-center justify-center hover:opacity-70 rounded-lg transition-all ${theme.textMuted}`}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 w-full">
                                <button 
                                    onClick={addToCart}
                                    className={`flex-1 ${theme.buttonStyle} !text-lg !font-bold flex items-center justify-center gap-2`}
                                >
                                    <ShoppingBag className="w-5 h-5" /> 
                                    Add to Cart
                                </button>
                                <button 
                                    onClick={() => {
                                        // Validate before opening checkout
                                        if (product.options && Array.isArray(product.options)) {
                                            for (let opt of product.options) {
                                                if (!selectedVariants[opt.name]) {
                                                    toast.error(`Please select a ${opt.name}`);
                                                    return;
                                                }
                                            }
                                        }
                                        setIsCheckoutModalOpen(true);
                                    }}
                                    className="flex-1 py-4 bg-[#25D366] text-white text-lg font-bold rounded-2xl hover:bg-[#128C7E] transition-colors shadow-xl shadow-green-500/20 flex items-center justify-center gap-2 group"
                                >
                                    Proceed to Checkout
                                    <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>
                            
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`flex items-start gap-3 p-4 rounded-2xl ${theme.searchStyle}`}>
                                    <Truck className={`w-6 h-6 ${theme.textMuted} shrink-0`} />
                                    <div>
                                        <div className={`font-semibold text-sm ${theme.text}`}>Direct Delivery</div>
                                        <div className={`text-xs ${theme.textMuted} mt-1`}>Arranged via WhatsApp</div>
                                    </div>
                                </div>
                                <div className={`flex items-start gap-3 p-4 rounded-2xl ${theme.searchStyle}`}>
                                    <ShieldCheck className={`w-6 h-6 ${theme.textMuted} shrink-0`} />
                                    <div>
                                        <div className={`font-semibold text-sm ${theme.text}`}>Secure Order</div>
                                        <div className={`text-xs ${theme.textMuted} mt-1`}>Direct communication</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </div>
                </div>
            </main>

            {/* ─── CHECKOUT MODAL ─── */}
            {isCheckoutModalOpen && (
                <WaStoreCheckoutModal 
                    store={store} 
                    cart={cart.length > 0 ? cart : [{ ...product, cartItemId: product.id, qty, selectedVariants }]} 
                    cartTotal={cart.length > 0 ? cart.reduce((t, i) => t + (parseFloat(i.price) * i.qty), 0) : parseFloat(product.price) * qty} 
                    onClose={() => setIsCheckoutModalOpen(false)} 
                    onCheckoutSuccess={handleCheckoutSuccess} 
                />
            )}

            {/* ─── MOBILE NAVIGATION DRAWER ─── */}
            <div className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}>
                <div 
                    className={`absolute top-0 left-0 w-[85%] max-w-sm h-full ${theme.pageBg} shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Drawer Header */}
                    <div className={`flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10 ${theme.header}`}>
                        <div className="flex items-center gap-3">
                            {store.logo && <img src={imgUrl(store.logo)} alt={store.name} className="w-8 h-8 object-contain rounded-md" />}
                            <span className={`font-bold text-lg ${theme.headerLogo}`}>{store.name}</span>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg bg-gray-100 dark:bg-white/10 ${theme.text} hover:bg-gray-200 dark:hover:bg-white/20 transition-colors`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                        {/* Home Button */}
                        <button 
                            onClick={() => { setIsMobileMenuOpen(false); navigate(`/store/${slug}`); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${theme.categoryTab} font-semibold`}
                        >
                            <Home className="w-5 h-5" />
                            <span>Home</span>
                        </button>

                        {/* Product Categories Accordion */}
                        {categories.length > 0 && (
                            <div className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
                                <button 
                                    onClick={() => setExpandedMobileSections(p => ({ ...p, categories: !p.categories }))}
                                    className={`w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] ${theme.text} font-bold`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Tag className="w-5 h-5" />
                                        <span>Product Categories</span>
                                    </div>
                                    {expandedMobileSections.categories ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                                
                                <div className={`transition-all overflow-hidden ${expandedMobileSections.categories ? 'max-h-[1000px] border-t border-gray-100 dark:border-white/10' : 'max-h-0'}`}>
                                    <div className="p-2 space-y-1 bg-white dark:bg-black/20">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    setIsMobileMenuOpen(false);
                                                    navigate(`/store/${slug}`);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${theme.categoryTab}`}
                                            >
                                                {cat === 'All' ? 'All Products' : cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Policies Accordion */}
                        {(store.privacyPolicy || store.termsConditions || store.returnPolicy) && (
                            <div className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
                                <button 
                                    onClick={() => setExpandedMobileSections(p => ({ ...p, policies: !p.policies }))}
                                    className={`w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] ${theme.text} font-bold`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5" />
                                        <span>Store Policies</span>
                                    </div>
                                    {expandedMobileSections.policies ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                                
                                <div className={`transition-all overflow-hidden ${expandedMobileSections.policies ? 'max-h-96 border-t border-gray-100 dark:border-white/10' : 'max-h-0'}`}>
                                    <div className="p-2 space-y-1 bg-white dark:bg-black/20">
                                        {store.privacyPolicy && (
                                            <button onClick={() => { setActivePolicy('privacy'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>Privacy Policy</button>
                                        )}
                                        {store.termsConditions && (
                                            <button onClick={() => { setActivePolicy('terms'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>Terms & Conditions</button>
                                        )}
                                        {store.returnPolicy && (
                                            <button onClick={() => { setActivePolicy('return'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>Return Policy</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── POLICY MODAL ─── */}
            {activePolicy && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-4 md:p-6" onClick={() => setActivePolicy(null)}>
                    <div className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl ${theme.pageBg}`} onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 ${theme.header}`}>
                            <h2 className={`text-xl font-bold ${theme.text}`}>
                                {activePolicy === 'privacy' && 'Privacy Policy'}
                                {activePolicy === 'terms' && 'Terms & Conditions'}
                                {activePolicy === 'return' && 'Return Policy'}
                            </h2>
                            <button onClick={() => setActivePolicy(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                <X className={`w-6 h-6 ${theme.text}`} />
                            </button>
                        </div>
                        <div className="p-4 md:p-6 overflow-y-auto">
                            <div className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none whitespace-pre-wrap ${theme.text}`}>
                                {activePolicy === 'privacy' && store.privacyPolicy}
                                {activePolicy === 'terms' && store.termsConditions}
                                {activePolicy === 'return' && store.returnPolicy}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <WaStoreFooter store={store} />
        </div>
    );
}
