import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShoppingCart, ChevronLeft, Check, Truck, ShieldCheck, ArrowRight, ArrowLeft, Menu, Home, FileText, ChevronDown, ChevronUp, Tag, X, ChevronRight, Search, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import WaStoreFooter from '../components/WaStoreFooter';
import WaStoreHeader from '../components/WaStoreHeader';
import WaStoreCheckoutModal from '../components/WaStoreCheckoutModal';
import { getThemeConfig } from '../utils/wastoreThemes';
import { applyProductSeo, cleanupStoreSeo } from '../utils/storeSeo';

// Generates a SEO-friendly product URL slug: "blue-cotton-shirt--a1b2c3d4"
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

// Extracts the short ID from a slug like "blue-cotton-shirt--a1b2c3d4"
// Falls back to treating the whole string as an ID (backward compat)
const extractShortId = (slugOrId) => {
    const parts = slugOrId.split('--');
    return parts.length > 1 ? parts[parts.length - 1] : slugOrId;
};


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
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem(`wa_cart_${slug}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [activeImageIdx, setActiveImageIdx] = useState(0);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [openAccordions, setOpenAccordions] = useState({
        description: true,
        delivery: false,
        details: false,
    });
    const touchStartX = React.useRef(null);
    const touchEndX = React.useRef(null);

    const toggleAccordion = (sec) => {
        setOpenAccordions(prev => ({ ...prev, [sec]: !prev[sec] }));
    };

    const getDisplayPrice = React.useCallback((priceVal, prod) => {
        let p = parseFloat(priceVal) || 0;
        if (store?.taxConfig?.enabled && store.taxConfig.taxInclusive === false) {
            let taxRate = prod.taxRate !== null && prod.taxRate !== undefined ? parseFloat(prod.taxRate) : (parseFloat(store.taxConfig.rate) || 0);
            p = p + (p * taxRate / 100);
        }
        return p;
    }, [store]);

    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
    // Note: this cartTotal is mostly unused in PublicWaProduct, but updated for consistency
    const cartTotal = cart.reduce((sum, item) => sum + (getDisplayPrice(item.price, item) * item.qty), 0);

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

    // Theme
    const theme = React.useMemo(() => getThemeConfig(store?.themeId), [store?.themeId]);

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
                const timestamp = new Date().getTime();
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}?t=${timestamp}`);
                setStore(res.data.store);
                setAllProducts(res.data.products);

                // Support both slug format ("blue-shirt--a1b2c3d4") and raw UUID (backward compat)
                const shortId = extractShortId(productId);
                const foundProduct = res.data.products.find(p => {
                    // Match by short ID prefix of the UUID
                    const productShortId = p.id.replace(/-/g, '').slice(0, 8);
                    return productShortId === shortId || p.id === productId;
                });
                
                if (foundProduct) {
                    setProduct(foundProduct);
                    // Apply full product SEO (title, og tags, Product schema, BreadcrumbList)
                    applyProductSeo(foundProduct, res.data.store, window.location.origin);
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
        // Cleanup all injected SEO tags on unmount
        return () => cleanupStoreSeo();
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

    const handleBuyNow = () => {
        if (!product || preventAdd) return;

        // Validate variants
        if (product.options && Array.isArray(product.options)) {
            for (let opt of product.options) {
                if (!selectedVariants[opt.name]) {
                    toast.error(`Please select a ${opt.name}`);
                    return;
                }
            }
        }

        const variantString = Object.values(selectedVariants).sort().join('-');
        const cartItemId = variantString ? `${product.id}-${variantString}` : product.id;

        setCart(prev => {
            const existing = prev.find(item => item.cartItemId === cartItemId);
            if (existing) {
                return prev; // Already in cart, we can just proceed
            }
            return [...prev, { ...product, cartItemId, qty, selectedVariants }];
        });
        
        setIsCheckoutModalOpen(true);
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
            <button onClick={() => navigate(`/store/${slug}`)} className={`${theme.text} font-medium hover:underline flex items-center gap-2`}>
                <ArrowLeft className="w-4 h-4" /> Back to Store
            </button>
        </div>
    );

    const isOutOfStock = product.trackQuantity ? product.stockQuantity <= 0 : !product.inStock;
    const preventAdd = store.inventoryConfig?.preventCartAdd && isOutOfStock;
    const showLowStock = store.inventoryConfig?.showLowStock && product.trackQuantity && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;

    const checkoutConfig = store.checkoutConfig || {};
    const flatShippingRate = checkoutConfig.flatShippingRate || 0;
    const freeShippingThreshold = checkoutConfig.freeShippingThreshold || 0;

    const currentCart = cart.length > 0 ? cart : [{ ...product, cartItemId: product.id, qty, selectedVariants }];
    const checkoutSubtotal = currentCart.reduce((sum, item) => sum + (getDisplayPrice(item.price, item) * item.qty), 0);
    const checkoutShippingCost = (flatShippingRate > 0 && (freeShippingThreshold === 0 || checkoutSubtotal < freeShippingThreshold)) ? flatShippingRate : 0;
    const checkoutTotal = checkoutSubtotal + checkoutShippingCost;

    return (
        <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white pb-[140px] md:pb-0`} style={{ fontFamily: theme.fontFamily }}>
            {/* ─── MODERN HEADER ─── */}
            <WaStoreHeader 
                store={store} 
                theme={theme} 
                slug={slug} 
                products={allProducts}
                categories={categories} 
                cartCount={cartCount} 
                setIsCartOpen={setIsCartOpen} 
            />

            <main className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pt-4 pb-10 md:py-10">
                
                {/* ─── VISUAL BREADCRUMB ─── */}
                <nav aria-label="Breadcrumb" className="mb-4 md:mb-8">
                    <ol className="flex items-center gap-1.5 flex-wrap text-xs font-semibold uppercase tracking-wider">
                        <li>
                            <button
                                onClick={() => navigate(`/store/${slug}`)}
                                className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${theme.textMuted}`}
                            >
                                <Home className="w-3.5 h-3.5" />
                                <span>{store.name}</span>
                            </button>
                        </li>
                        {product.category && (
                            <>
                                <li className={theme.textMuted}><ChevronRight className="w-3 h-3" /></li>
                                <li>
                                    <button
                                        onClick={() => navigate(`/store/${slug}?cat=${encodeURIComponent(product.category)}`)}
                                        className={`hover:opacity-80 transition-opacity ${theme.textMuted}`}
                                    >
                                        {product.category}
                                    </button>
                                </li>
                            </>
                        )}
                        <li className={theme.textMuted}><ChevronRight className="w-3 h-3" /></li>
                        <li>
                            <span className={`${theme.text} font-bold line-clamp-1 normal-case capitalize tracking-normal`}>{product.name}</span>
                        </li>
                    </ol>
                </nav>

                <style>{`
                    @media (min-width: 1024px) {
                        .product-detail-grid {
                            display: grid !important;
                            grid-template-columns: 7fr 5fr !important;
                            gap: 4rem !important;
                            align-items: start !important;
                        }
                        .product-detail-grid > * {
                            min-width: 0 !important;
                            overflow: hidden !important;
                        }
                        .product-detail-grid > .mobile-thumb-strip {
                            display: none !important;
                        }
                    }
                    .product-accordion-content {
                        width: 100% !important;
                        overflow: hidden !important;
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        box-sizing: border-box !important;
                    }
                `}</style>
                <div className="product-detail-grid grid grid-cols-1 gap-8 items-start w-full">
                    
                    {/* Left: Immersive Image Gallery */}
                    <div className="flex flex-col lg:flex-row gap-6 lg:justify-center lg:self-start lg:items-start w-full min-w-0 overflow-hidden">
                        {/* Desktop Vertical Thumbnails */}
                        {product.imageUrls && product.imageUrls.length > 1 && (
                            <div className="hidden lg:flex flex-col gap-3 w-20 shrink-0 select-none">
                                {product.imageUrls.map((url, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveImageIdx(idx)}
                                        className={`w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border transition-all duration-300 relative ${
                                            activeImageIdx === idx
                                                ? 'border-black ring-1 ring-black scale-[1.02]'
                                                : 'border-gray-200 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <img
                                            src={imgUrl(url)}
                                            alt={`Thumbnail ${idx + 1}`}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                            onError={e => e.target.style.display = 'none'}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Main Image Viewport */}
                        <div 
                            className="flex-1 max-w-[500px] aspect-square bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden relative group flex items-center justify-center cursor-zoom-in" 
                            onClick={() => setIsLightboxOpen(true)}
                            onTouchStart={(e) => {
                                touchStartX.current = e.targetTouches[0].clientX;
                            }}
                            onTouchMove={(e) => {
                                touchEndX.current = e.targetTouches[0].clientX;
                            }}
                            onTouchEnd={(e) => {
                                if (!touchStartX.current || !touchEndX.current) return;
                                const diff = touchStartX.current - touchEndX.current;
                                if (Math.abs(diff) > 50 && product.imageUrls?.length > 1) {
                                    // Prevent lightbox click on swipe
                                    e.preventDefault();
                                    if (diff > 0) {
                                        // Swipe left -> next image
                                        setActiveImageIdx(prev => prev === product.imageUrls.length - 1 ? 0 : prev + 1);
                                    } else {
                                        // Swipe right -> prev image
                                        setActiveImageIdx(prev => prev === 0 ? product.imageUrls.length - 1 : prev - 1);
                                    }
                                }
                                touchStartX.current = null;
                                touchEndX.current = null;
                            }}
                        >
                            {product.imageUrls && product.imageUrls[activeImageIdx] ? (
                                <img
                                    key={activeImageIdx}
                                    src={imgUrl(product.imageUrls[activeImageIdx])}
                                    alt={`${product.name} - Image ${activeImageIdx + 1}`}
                                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 hover:scale-[1.04]"
                                    onError={e => e.target.style.display = 'none'}
                                />
                            ) : (
                                <ShoppingBag className={`w-20 h-20 ${theme.textMuted}`} />
                            )}
                            
                            {product.compareAtPrice && (
                                <div className={`absolute top-6 left-6 ${theme.badgeStyle} shadow-md z-10`}>Sale</div>
                            )}
                            
                            {/* Navigation Arrows */}
                            {product.imageUrls && product.imageUrls.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveImageIdx(prev => prev === 0 ? product.imageUrls.length - 1 : prev - 1);
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm text-black rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                                        aria-label="Previous image"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveImageIdx(prev => prev === product.imageUrls.length - 1 ? 0 : prev + 1);
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm text-black rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                                        aria-label="Next image"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                    
                                    {/* Image counter badge */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium tracking-widest px-3 py-1.5 rounded-full z-10">
                                        {activeImageIdx + 1} / {product.imageUrls.length}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile Thumbnail Strip (hidden on desktop) */}
                    {product.imageUrls && product.imageUrls.length > 1 && (
                        <div className="lg:hidden w-full mt-2 flex justify-center">
                            <div className="mobile-thumb-strip flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x max-w-full px-1">
                                {product.imageUrls.map((url, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveImageIdx(idx)}
                                        className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border snap-start relative ${
                                            activeImageIdx === idx
                                                ? 'border-black ring-1 ring-black'
                                                : 'border-transparent opacity-60'
                                        }`}
                                    >
                                        <img
                                            src={imgUrl(url)}
                                            alt={`Thumbnail ${idx + 1}`}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                            onError={e => e.target.style.display = 'none'}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Right: Sticky Details Panel */}
                    <div className="lg:sticky lg:top-28 lg:self-start flex flex-col w-full min-w-0 overflow-hidden">
                        
                        {/* Title Section */}
                        <div className="pb-6 border-b border-gray-100">
                            {product.category && (
                                <span className="text-[10px] tracking-[0.25em] font-semibold text-gray-400 uppercase mb-2.5 block">
                                    {product.category}
                                </span>
                            )}
                            <h1 className={`text-3xl lg:text-4xl font-normal tracking-tight ${theme.text} leading-tight mb-3 capitalize`}>
                                {product.name}
                            </h1>
                            
                            {/* Pricing & Savings & Status */}
                            <div className="flex flex-wrap items-center gap-4">
                                <span className={`text-2xl font-semibold ${theme.text}`}>
                                    {getCurrencySymbol(store.currency)}{getDisplayPrice(product.price, product).toFixed(2)}
                                </span>
                                {product.compareAtPrice && (
                                    <>
                                        <span className="text-lg text-gray-400 line-through font-normal">
                                            {getCurrencySymbol(store.currency)}{getDisplayPrice(product.compareAtPrice, product).toFixed(2)}
                                        </span>
                                        {(() => {
                                            const discountPercent = Math.round(((parseFloat(product.compareAtPrice) - parseFloat(product.price)) / parseFloat(product.compareAtPrice)) * 100);
                                            if (discountPercent > 0) {
                                                return (
                                                    <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                        Save {discountPercent}%
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </>
                                )}

                                {/* Availability Dot Indicator */}
                                <div className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                    {isOutOfStock ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                            <span className="text-rose-600">Out of Stock</span>
                                        </>
                                    ) : showLowStock ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                            <span className="text-amber-600">Only {product.stockQuantity} Left</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-emerald-600">In Stock</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Variant Selector */}
                        {product.options && Array.isArray(product.options) && product.options.length > 0 && (
                            <div className="py-6 border-b border-gray-100 space-y-5">
                                {product.options.map((option, idx) => (
                                    <div key={idx} className="flex flex-col">
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.text} mb-2.5`}>{option.name}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {option.values.map(val => {
                                                const isActive = selectedVariants[option.name] === val;
                                                return (
                                                    <button
                                                        key={val}
                                                        onClick={() => setSelectedVariants(prev => ({ ...prev, [option.name]: val }))}
                                                        className={`px-4.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                                                            isActive
                                                                ? 'bg-black text-white border-black shadow-sm scale-[1.02]'
                                                                : 'bg-white text-black border-gray-200 hover:border-black hover:scale-[1.01]'
                                                        } rounded-xl`}
                                                    >
                                                        {val}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity & Actions */}
                        <div className="hidden md:block py-6 space-y-4 max-w-[280px]">
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Quantity</span>
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shrink-0">
                                    <button 
                                        onClick={() => setQty(Math.max(1, qty - 1))} 
                                        className="w-8 h-8 flex items-center justify-center hover:bg-white text-gray-500 rounded-lg transition-all"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className={`w-10 text-center font-bold text-sm ${theme.text}`}>{qty}</span>
                                    <button 
                                        onClick={() => setQty(qty + 1)} 
                                        className="w-8 h-8 flex items-center justify-center hover:bg-white text-gray-500 rounded-lg transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={addToCart}
                                    disabled={preventAdd}
                                    className={`w-full max-w-[280px] py-3.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 rounded-xl border ${
                                        preventAdd 
                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                            : 'bg-white text-black border-black hover:bg-black hover:text-white shadow-sm'
                                    }`}
                                >
                                    <ShoppingBag className="w-4 h-4 stroke-[2]" /> 
                                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                                </button>
                                <button 
                                    onClick={handleBuyNow}
                                    disabled={preventAdd}
                                    className={`w-full max-w-[280px] py-3.5 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 group ${
                                        preventAdd 
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                                            : 'bg-[#25D366] hover:bg-[#128C7E] hover:shadow-lg shadow-green-500/10'
                                    }`}
                                >
                                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.019 14.12 1.01 11.52 1.01c-5.442 0-9.866 4.372-9.87 9.802 0 1.688.451 3.336 1.307 4.795l-.986 3.6 3.69-.968zm11.396-6.49c-.274-.137-1.62-.8-1.87-.892-.252-.093-.437-.137-.62.137-.183.274-.707.892-.867 1.075-.16.183-.32.206-.594.069-.274-.137-1.157-.426-2.202-1.358-.814-.726-1.364-1.622-1.524-1.896-.16-.274-.017-.422.12-.559.124-.124.274-.32.411-.48.137-.16.183-.274.274-.457.09-.183.046-.343-.023-.48-.069-.137-.62-1.494-.85-2.043-.224-.54-.449-.467-.62-.476-.16-.008-.343-.01-.527-.01-.183 0-.48.069-.73.343-.252.274-.96 1.006-.96 2.455 0 1.449 1.052 2.846 1.198 3.043.147.197 2.07 3.16 5.016 4.434.701.303 1.248.485 1.674.621.706.224 1.349.193 1.856.117.566-.084 1.62-.662 1.85-1.3.23-.637.23-1.182.162-1.296-.069-.115-.252-.183-.527-.32z"/>
                                    </svg>
                                    Buy Now
                                </button>
                            </div>
                        </div>

                        {/* Collapsible Accordions */}
                        <div className="md:border-t md:border-gray-100 md:mt-6 md:pt-4 space-y-0">
                            {/* DESCRIPTION ACCORDION */}
                            <div className="border-b border-gray-100">
                                <button
                                    onClick={() => toggleAccordion('description')}
                                    className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider ${theme.text} py-3`}
                                >
                                    <span>Product Description</span>
                                    {openAccordions.description ? <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                </button>
                                <div
                                    style={{
                                        maxHeight: openAccordions.description ? '600px' : '0',
                                        overflow: 'hidden',
                                        transition: 'max-height 0.25s ease',
                                        width: '100%',
                                    }}
                                >
                                    <div className={`pb-4 text-sm leading-relaxed ${theme.textMuted} whitespace-pre-line`} style={{width:'100%', overflowWrap:'break-word', wordBreak:'break-word'}}>
                                        {product.description || 'This product does not have a description yet. Contact the store for more details.'}
                                    </div>
                                </div>
                            </div>

                            {/* DELIVERY ACCORDION */}
                            <div className="border-b border-gray-100">
                                <button
                                    onClick={() => toggleAccordion('delivery')}
                                    className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider ${theme.text} py-3`}
                                >
                                    <span>WhatsApp Delivery</span>
                                    {openAccordions.delivery ? <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                </button>
                                <div
                                    style={{
                                        maxHeight: openAccordions.delivery ? '600px' : '0',
                                        overflow: 'hidden',
                                        transition: 'max-height 0.25s ease',
                                        width: '100%',
                                    }}
                                >
                                    <div className={`pb-4 text-sm leading-relaxed ${theme.textMuted} space-y-2`} style={{width:'100%', overflowWrap:'break-word', wordBreak:'break-word'}}>
                                        <p>We process all orders directly through WhatsApp to provide a customized shipping quote and confirm product availability.</p>
                                        <ul className="list-disc pl-4 space-y-1 mt-2">
                                            <li>Direct chat with the merchant</li>
                                            <li>Customized shipping options</li>
                                            <li>Live tracking and direct customer support</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* SECURE CHECKOUT ACCORDION */}
                            <div className="border-b border-gray-100">
                                <button
                                    onClick={() => toggleAccordion('details')}
                                    className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider ${theme.text} py-3`}
                                >
                                    <span>Secure Checkout & Support</span>
                                    {openAccordions.details ? <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                </button>
                                <div
                                    style={{
                                        maxHeight: openAccordions.details ? '600px' : '0',
                                        overflow: 'hidden',
                                        transition: 'max-height 0.25s ease',
                                        width: '100%',
                                    }}
                                >
                                    <div className={`pb-4 text-sm leading-relaxed ${theme.textMuted} space-y-2`} style={{width:'100%', overflowWrap:'break-word', wordBreak:'break-word'}}>
                                        <p>Shop with confidence. Your messages are encrypted and payment/delivery details are processed securely and manually verified.</p>
                                        <p>Need support or looking for a customization? Just proceed to checkout and chat with us.</p>
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
                    cart={currentCart} 
                    cartSubtotal={checkoutSubtotal}
                    shippingCost={checkoutShippingCost}
                    cartTotal={checkoutTotal} 
                    onClose={() => setIsCheckoutModalOpen(false)} 
                    onCheckoutSuccess={handleCheckoutSuccess} 
                />
            )}



            {/* ─── CART DRAWER ─── */}
            <AnimatePresence>
                {isCartOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsCartOpen(false)}
                        />
                        
                        {/* Slide-in Drawer Container */}
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
                                        <button onClick={() => setIsCartOpen(false)} className="px-4 md:px-6 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded-full mt-4 hover:bg-gray-200 transition-colors">Start Shopping</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {cart.map(item => (
                                            <div key={item.cartItemId || item.id} className="flex gap-4 items-start">
                                                <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                                    {item.imageUrls && item.imageUrls[0] && (
                                                        <img src={imgUrl(item.imageUrls[0])} alt={item.name} className="w-full h-full object-contain" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <h4 className={`font-semibold text-sm ${theme.text} truncate`}>{item.name}</h4>
                                                    {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                                                        <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>
                                                            {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                                        </div>
                                                    )}
                                                    <div className={`font-medium text-sm ${theme.textMuted} mt-1`}>{getCurrencySymbol(store.currency)}{getDisplayPrice(item.price, item).toFixed(2)}</div>
                                                    
                                                    <div className="flex items-center justify-between gap-3 mt-3">
                                                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                                            <button onClick={() => updateQty(item.cartItemId || item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-8 text-center text-xs font-semibold text-gray-900">{item.qty}</span>
                                                            <button onClick={() => updateQty(item.cartItemId || item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                        {item.qty > 1 && (
                                                            <div className={`font-bold text-sm ${theme.text}`}>
                                                                {getCurrencySymbol(store.currency)}{(getDisplayPrice(item.price, item) * item.qty).toFixed(2)}
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
                                    <div className="flex justify-between items-center mb-6 pt-2 border-t border-black/5 dark:border-white/10">
                                        <span className={theme.textMuted}>Subtotal</span>
                                        <span className={`text-xl font-bold ${theme.text}`}>{getCurrencySymbol(store.currency)}{cartTotal.toFixed(2)}</span>
                                    </div>
                                    <button 
                                        onClick={() => setIsCheckoutModalOpen(true)}
                                        className={`w-full py-4 ${theme.buttonStyle} !text-base !font-bold flex items-center justify-center gap-2 shadow-lg`}
                                    >
                                        <ShoppingBag className="w-5 h-5" /> Proceed to Checkout
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─── FULLSCREEN LIGHTBOX MODAL ─── */}
            <AnimatePresence>
                {isLightboxOpen && product.imageUrls && product.imageUrls[activeImageIdx] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center select-none"
                        onClick={() => setIsLightboxOpen(false)}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setIsLightboxOpen(false)}
                            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-20"
                            aria-label="Close fullscreen"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Image Container */}
                        <div className="relative w-full max-w-4xl h-[70vh] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                            <img
                                src={imgUrl(product.imageUrls[activeImageIdx])}
                                alt={product.name}
                                className="max-w-full max-h-full object-contain rounded-lg"
                            />
                            
                            {/* Navigation Arrows inside Lightbox */}
                            {product.imageUrls.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveImageIdx(prev => prev === 0 ? product.imageUrls.length - 1 : prev - 1);
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
                                        aria-label="Previous image"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveImageIdx(prev => prev === product.imageUrls.length - 1 ? 0 : prev + 1);
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
                                        aria-label="Next image"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Bottom Thumbnail Strip for Lightbox */}
                        {product.imageUrls.length > 1 && (
                            <div className="absolute bottom-8 flex gap-2 overflow-x-auto max-w-[80vw] px-4 py-2 scrollbar-hide z-10" onClick={e => e.stopPropagation()}>
                                {product.imageUrls.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImageIdx(idx)}
                                        className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/10 border-2 transition-all ${
                                            activeImageIdx === idx ? 'border-white scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                                        }`}
                                    >
                                        <img src={imgUrl(url)} alt="" className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <WaStoreFooter store={store} />

            {/* Sticky Mobile Add To Cart / Checkout Bar */}
            <div 
                className="md:hidden fixed left-0 w-full bg-white/95 backdrop-blur-md dark:bg-black/95 border-t border-gray-200 dark:border-white/10 px-2 py-3 z-30 flex items-center gap-1.5 sm:gap-2 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] overflow-x-auto hide-scrollbar"
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 55px)' }}
            >
                {/* Price Display */}
                <div className="flex flex-col justify-center shrink-0 mr-auto pl-1">
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">Total</span>
                    <span className="text-xs sm:text-sm font-bold text-black dark:text-white leading-none whitespace-nowrap">
                        {getCurrencySymbol(store.currency)}{(getDisplayPrice(product.price, product) * qty).toFixed(2)}
                    </span>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-0.5 shrink-0 h-[38px] sm:h-[42px]">
                    <button 
                        onClick={() => setQty(Math.max(1, qty - 1))} 
                        className="w-7 sm:w-8 h-full flex items-center justify-center hover:bg-white dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 rounded-lg transition-all"
                    >
                        <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <span className="w-4 sm:w-6 text-center font-bold text-[11px] sm:text-xs text-black dark:text-white">{qty}</span>
                    <button 
                        onClick={() => setQty(qty + 1)} 
                        className="w-7 sm:w-8 h-full flex items-center justify-center hover:bg-white dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 rounded-lg transition-all"
                    >
                        <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                </div>

                {/* Add to Cart button */}
                <button 
                    onClick={addToCart}
                    disabled={preventAdd}
                    className={`h-[38px] sm:h-[42px] px-3 sm:px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl flex items-center justify-center shrink-0 ${
                        preventAdd 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-black text-white hover:bg-neutral-800 shadow-md'
                    }`}
                >
                    <span className="truncate whitespace-nowrap">{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                </button>

                {/* Buy Now button */}
                <button 
                    onClick={handleBuyNow}
                    disabled={preventAdd}
                    className={`h-[38px] sm:h-[42px] px-3 sm:px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shrink-0 ${
                        preventAdd 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                            : 'bg-[#25D366] text-white hover:bg-[#128C7E] hover:shadow-lg shadow-green-500/10'
                    }`}
                >
                    <span className="truncate">Buy Now</span>
                </button>
            </div>
        </div>
    );
}
