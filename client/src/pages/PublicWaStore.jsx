import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShoppingCart, X, Plus, Minus, Search, ArrowRight, MapPin, Mail, Phone, MessageCircle, ChevronLeft, ChevronRight, Filter, Check, Menu, Home, FileText, ChevronDown, ChevronUp, Tag, ChevronRight as Breadcrumb } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import WaStoreFooter from '../components/WaStoreFooter';
import WaStoreHeader from '../components/WaStoreHeader';
const WaStoreCheckoutModal = React.lazy(() => import('../components/WaStoreCheckoutModal'));
import StoreNotFound from '../components/StoreNotFound';
import { getThemeConfig } from '../utils/wastoreThemes';
import { applyStoreSeo, cleanupStoreSeo } from '../utils/storeSeo';

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


const API_BASE = `${import.meta.env.VITE_API_URL}`;
const imgUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function PublicWaStore({ customSlug }) {
    const params = useParams();
    const slug = customSlug || params.slug;
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Use server-embedded data if available — eliminates the API round-trip on first load,
    // which is the main cause of the 2,600ms+ LCP "resource load delay" on mobile.
    const preloaded = typeof window !== 'undefined' ? window.__STORE_INITIAL_DATA__ : null;

    const [store, setStore] = useState(preloaded?.store || null);
    const [products, setProducts] = useState(preloaded?.products || []);
    const [loading, setLoading] = useState(!preloaded?.store);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem(`wa_cart_${slug}`);
        return saved ? JSON.parse(saved) : [];
    });

    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState('newest');

    // Theme
    const theme = useMemo(() => getThemeConfig(store?.themeId), [store?.themeId]);

    // Hero Slider
    const [activeSlide, setActiveSlide] = useState(0);
    const [sliderPaused, setSliderPaused] = useState(false);
    const sliderTimer = useRef(null);

    // Category Autoplay
    const categoryScrollRef = useRef(null);
    const categoryAutoplayTimer = useRef(null);

    const slides = useMemo(() => {
        const heroSlides = store?.heroSlides || [];
        return heroSlides.filter(s => s.imageUrl);
    }, [store]);

    const goToSlide = useCallback((idx) => setActiveSlide(idx), []);
    const nextSlide = useCallback(() => setActiveSlide(prev => (prev + 1) % Math.max(slides.length, 1)), [slides.length]);
    const prevSlide = useCallback(() => setActiveSlide(prev => (prev - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1)), [slides.length]);

    useEffect(() => {
        if (slides.length <= 1 || sliderPaused) return;
        sliderTimer.current = setInterval(nextSlide, 3500);
        return () => clearInterval(sliderTimer.current);
    }, [slides.length, sliderPaused, nextSlide]);

    // Category autoplay — mobile only, 3.5s scroll loop
    useEffect(() => {
        const el = categoryScrollRef.current;
        if (!el || !store?.categoryAutoplay) return;
        if (window.innerWidth > 768) return; // desktop: no autoplay

        const scrollNext = () => {
            if (!categoryScrollRef.current) return;
            const container = categoryScrollRef.current;
            const itemWidth = container.querySelector('button')?.offsetWidth || 112;
            const gap = 12;
            const step = itemWidth + gap;
            const maxScroll = container.scrollWidth - container.clientWidth;

            if (container.scrollLeft + step >= maxScroll - 1) {
                // Reached end — scroll back to start smoothly
                container.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                container.scrollBy({ left: step, behavior: 'smooth' });
            }
        };

        categoryAutoplayTimer.current = setInterval(scrollNext, 3500);

        // Pause on user touch
        const pause = () => {
            clearInterval(categoryAutoplayTimer.current);
            // Resume after 6s of inactivity
            setTimeout(() => {
                categoryAutoplayTimer.current = setInterval(scrollNext, 3500);
            }, 6000);
        };
        el.addEventListener('touchstart', pause, { passive: true });

        return () => {
            clearInterval(categoryAutoplayTimer.current);
            el.removeEventListener('touchstart', pause);
        };
    }, [store?.categoryAutoplay, store]);

    useEffect(() => {
        const fetchStore = async (isSilent = false) => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}`);
                setStore(res.data.store);
                setProducts(res.data.products);

                // Track view once per browser session
                if (!isSilent) {
                    const sessionKey = `wastore_viewed_${slug}`;
                    if (!sessionStorage.getItem(sessionKey)) {
                        sessionStorage.setItem(sessionKey, '1');
                        axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}/view`).catch(() => { });
                    }
                }
            } catch (error) {
                if (!isSilent) toast.error("Failed to load store");
            } finally {
                if (!isSilent) setLoading(false);
            }
        };

        if (preloaded?.store) {
            // Data already embedded in HTML — no loading spinner needed.
            // Track the view and silently refresh data in the background after initial render.
            setLoading(false);
            const sessionKey = `wastore_viewed_${slug}`;
            if (!sessionStorage.getItem(sessionKey)) {
                sessionStorage.setItem(sessionKey, '1');
                axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}/view`).catch(() => {});
            }
            // Background refresh after 1.5s — updates data without blocking LCP
            const t = setTimeout(() => fetchStore(true), 1500);
            // Clear the embedded data so it doesn't persist on SPA navigation
            if (window.__STORE_INITIAL_DATA__) delete window.__STORE_INITIAL_DATA__;
            return () => { clearTimeout(t); cleanupStoreSeo(); };
        } else {
            fetchStore();
        }

        return () => cleanupStoreSeo();
    }, [slug]);

    // NOTE: LCP image preload is injected server-side in index.js before the HTML is sent.
    // A client-side useEffect preload fires AFTER JS parses and runs, which is too late
    // for the browser's preload scanner. The server-side <link rel="preload"> in <head>
    // is discovered immediately by the browser's lookahead parser before any JS runs.


    useEffect(() => {
        localStorage.setItem(`wa_cart_${slug}`, JSON.stringify(cart));
    }, [cart, slug]);

    // ── Re-apply SEO whenever store data, category, or visible products change ──
    const filteredForSeo = useMemo(() => {
        if (!products.length) return [];
        return products.slice(0, 50);
    }, [products]);

    useEffect(() => {
        if (store) {
            applyStoreSeo(store, 'All', filteredForSeo, window.location.origin);
        }
    }, [store, filteredForSeo]);

    const categories = useMemo(() => {
        const fromProducts = products.map(p => p.category).filter(Boolean);
        const adminCats = Array.isArray(store?.categories) ? store.categories : [];
        const merged = [...new Set([...adminCats, ...fromProducts])];
        return merged;
    }, [products, store]);

    const getDisplayPrice = useCallback((priceVal, product) => {
        let p = parseFloat(priceVal) || 0;
        if (store?.taxConfig?.enabled && store.taxConfig.taxInclusive === false) {
            let taxRate = product.taxRate !== null && product.taxRate !== undefined ? parseFloat(product.taxRate) : (parseFloat(store.taxConfig.rate) || 0);
            p = p + (p * taxRate / 100);
        }
        return p;
    }, [store]);

    // Advanced SEO: Dynamic Title and Meta Tags based on category
    useEffect(() => {
        if (!store) return;

        let pageTitle = store.name;
        let pageDesc = store.description || `Welcome to ${store.name}`;

        document.title = pageTitle;

        // Update meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = pageDesc;

        // Open Graph tags
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (!ogTitle) {
            ogTitle = document.createElement('meta');
            ogTitle.setAttribute('property', 'og:title');
            document.head.appendChild(ogTitle);
        }
        ogTitle.content = pageTitle;

        // Advanced SEO: JSON-LD Structured Data
        let schemaScript = document.querySelector('script[id="schema-jsonld"]');
        if (!schemaScript) {
            schemaScript = document.createElement('script');
            schemaScript.id = 'schema-jsonld';
            schemaScript.type = 'application/ld+json';
            document.head.appendChild(schemaScript);
        }

        const schemaData = {
            "@context": "https://schema.org",
            "@type": "Store",
            "name": store.name,
            "description": store.description,
            "image": store.logo ? `${import.meta.env.VITE_API_URL}${store.logo}` : undefined,
            "@id": window.location.href,
            "url": window.location.href
        };

        schemaScript.textContent = JSON.stringify(schemaData);

    }, [store]);

    const filteredAndSortedProducts = useMemo(() => {
        let result = [...products];

        return result.sort((a, b) => {
            if (sortBy === 'price-asc') return parseFloat(a.price) - parseFloat(b.price);
            if (sortBy === 'price-desc') return parseFloat(b.price) - parseFloat(a.price);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [products, sortBy]);

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
            return updated.filter(Boolean); // Remove items with 0 qty
        });
    };

    const checkoutConfig = store?.checkoutConfig || {};
    const minOrderValue = checkoutConfig.minOrderValue || 0;
    const flatShippingRate = checkoutConfig.flatShippingRate || 0;
    const freeShippingThreshold = checkoutConfig.freeShippingThreshold || 0;

    const cartSubtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
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
    if (!store) return <StoreNotFound slug={slug} />;

    return (
        <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white pb-20 md:pb-0`} style={{ fontFamily: theme.fontFamily, scrollbarGutter: 'stable' }}>
            {/* ─── MODERN HEADER ─── */}
            <WaStoreHeader
                store={store}
                theme={theme}
                slug={slug}
                products={products}
                categories={categories}
                cartCount={cartCount}
                setIsCartOpen={setIsCartOpen}
            />

            {/* ─── HERO SLIDER ─── */}
            {slides.length > 0 ? (
                <div className={`relative bg-black w-full aspect-[2/1] overflow-hidden group ${theme.heroShape || ''}`} onMouseEnter={() => setSliderPaused(true)} onMouseLeave={() => setSliderPaused(false)}>
                    {slides.map((slide, idx) => (
                        <div key={idx} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            <div className={`absolute inset-0 ${theme.heroOverlay} z-10`} />
                            {slide.imageUrl?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                                <video src={imgUrl(slide.imageUrl)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                            ) : (
                                <img
                                    src={imgUrl(slide.imageUrl)}
                                    alt={slide.title || ''}
                                    className="w-full h-full object-contain"
                                    onError={e => e.target.style.display = 'none'}
                                    loading={idx === 0 ? 'eager' : 'lazy'}
                                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                                    decoding={idx === 0 ? 'sync' : 'async'}
                                />
                            )}
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-2 md:px-4">
                                <div className="max-w-3xl space-y-1 sm:space-y-2 md:space-y-4">
                                    {slide.title && <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-lg">{slide.title}</h1>}
                                    {slide.subtitle && <p className="text-xs sm:text-base md:text-xl lg:text-2xl text-gray-100 font-medium drop-shadow-md">{slide.subtitle}</p>}
                                    {slide.ctaText && (
                                        <button
                                            onClick={() => {
                                                if (slide.ctaTargetType === 'category' && slide.ctaTargetId) {
                                                    navigate(`/store/${slug}/category/${encodeURIComponent(slide.ctaTargetId)}`);
                                                } else if (slide.ctaTargetType === 'product' && slide.ctaTargetId) {
                                                    const targetProduct = products.find(p => p.id === slide.ctaTargetId);
                                                    if (targetProduct) {
                                                        navigate(`/store/${slug}/product/${slugifyProduct(targetProduct.name, targetProduct.id)}`);
                                                    }
                                                } else {
                                                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                                                }
                                            }}
                                            className="mt-2 md:mt-4 px-3 sm:px-6 md:px-8 py-1.5 sm:py-2 md:py-3 text-[10px] sm:text-sm md:text-base bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
                                        >
                                            {slide.ctaText}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Controls */}
                    {slides.length > 1 && (
                        <>
                            <button
                                onClick={prevSlide}
                                aria-label="Previous slide"
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={nextSlide}
                                aria-label="Next slide"
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                            {/* Dot navigation — wrapped in a larger touch target */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                                {slides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => goToSlide(idx)}
                                        aria-label={`Go to slide ${idx + 1}`}
                                        className="flex items-center justify-center w-12 h-12"
                                    >
                                        <span className={`h-1.5 rounded-full transition-all block ${idx === activeSlide ? 'w-8 bg-white' : 'w-2 bg-white/50'}`} />
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                /* Fallback simple banner if no hero slides */
                <div className={`py-16 px-4 ${theme.header}`}>
                    <div className="max-w-4xl mx-auto text-center space-y-4">
                        <h1 className={`text-4xl font-bold tracking-tight ${theme.headerLogo}`}>{store.name}</h1>
                        {store.description && <p className={`text-lg ${theme.textMuted}`}>{store.description}</p>}
                    </div>
                </div>
            )}

            {/* ─── MAIN CONTENT ─── */}
            <main id="products" className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 sm:pt-12">

                {/* ─── SHOP BY CATEGORY (VISUAL) ─── */}
                {categories.length > 1 && (
                    <div className="mb-4 w-full">
                        <h2 className={`text-2xl font-bold mb-2 sm:mb-4 text-center ${theme.text}`}>Products Category</h2>

                        {theme.id === 'vogue' ? (
                            <div
                                ref={categoryScrollRef}
                                className="flex overflow-x-auto hide-scrollbar gap-3 sm:gap-6 pb-6 px-4 -mx-4 snap-x md:justify-center"
                            >
                                {/* INDIVIDUAL CATEGORIES */}
                                {categories.filter(c => {
                                    if (c === 'All') return false;
                                    let hidden = [];
                                    try { hidden = typeof store.hiddenCategories === 'string' ? JSON.parse(store.hiddenCategories) : (store.hiddenCategories || []); } catch (e) { }
                                    return !hidden.includes(c);
                                }).map(cat => {
                                    let catImage = null;
                                    try {
                                        const imgs = typeof store.categoryImages === 'string' ? JSON.parse(store.categoryImages) : (store.categoryImages || {});
                                        catImage = imgs[cat];
                                    } catch (e) { }

                                    return (
                                        <button
                                            key={cat} onClick={() => navigate(`/store/${slug}/category/${encodeURIComponent(cat)}`)}
                                            className="flex flex-col items-center gap-2 sm:gap-4 shrink-0 group w-24 sm:w-44 snap-start"
                                        >
                                            <div className={`w-24 h-24 sm:w-44 sm:h-44 overflow-hidden rounded-full flex items-center justify-center transition-all duration-300 relative border-2 border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800 group-hover:shadow-md`}>
                                                {catImage ? (
                                    <img
                                        src={imgUrl(catImage)}
                                        alt="" loading="lazy"
                                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-100 group-hover:scale-105`}
                                    />
                                                ) : (
                                                    <span className="text-xl sm:text-4xl font-thin text-zinc-400 dark:text-zinc-600">{cat.substring(0, 1)}</span>
                                                )}
                                                <div className={`absolute inset-0 transition-opacity duration-500 bg-transparent group-hover:bg-black/10`}></div>
                                            </div>
                                            <span className={`text-sm sm:text-lg tracking-[0.15em] uppercase text-center font-light text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white`}>
                                                {cat}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div
                                ref={categoryScrollRef}
                                className="flex overflow-x-auto hide-scrollbar gap-3 sm:gap-6 py-4 px-4 -mx-4 md:justify-center"
                            >
                                {/* INDIVIDUAL CATEGORIES */}
                                {categories.filter(c => {
                                    if (c === 'All') return false;
                                    let hidden = [];
                                    try { hidden = typeof store.hiddenCategories === 'string' ? JSON.parse(store.hiddenCategories) : (store.hiddenCategories || []); } catch (e) { }
                                    return !hidden.includes(c);
                                }).map(cat => {
                                    let catImage = null;
                                    try {
                                        const imgs = typeof store.categoryImages === 'string' ? JSON.parse(store.categoryImages) : (store.categoryImages || {});
                                        catImage = imgs[cat];
                                    } catch (e) { }

                                    return (
                                        <button
                                            key={cat} onClick={() => navigate(`/store/${slug}/category/${encodeURIComponent(cat)}`)}
                                            className="flex flex-col items-center gap-2 sm:gap-4 shrink-0 group w-24 sm:w-44"
                                        >
                                            <div className={`w-24 h-24 sm:w-44 sm:h-44 ${theme.categoryImageShape || 'rounded-full'} overflow-hidden flex items-center justify-center transition-all duration-300 bg-black/5 group-hover:bg-black/10 group-hover:scale-105`}>
                                                {catImage ? (
                                                    <img
                                                        src={imgUrl(catImage)}
                                                        alt="" loading="lazy" className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className={`text-xl sm:text-4xl font-bold uppercase ${theme.textMuted}`}>{cat.substring(0, 2)}</span>
                                                )}
                                            </div>
                                            <span className={`text-sm sm:text-lg font-semibold text-center leading-tight ${theme.textMuted}`}>{cat}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {categories.length > 1 && <hr className="border-gray-200 dark:border-gray-800 my-4 sm:my-8 w-full max-w-[1200px] mx-auto" />}

                {/* Title */}
                <div className="mb-4 sm:mb-6 relative">
                    <h2 className={`text-3xl font-bold text-center w-full ${theme.text}`}>All Products</h2>
                </div>

                {/* Filters / Sort */}
                <div className="flex items-center justify-start mb-4 sm:mb-8">
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all cursor-pointer relative group">
                        <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:block">Sort By</span>
                        <select
                            value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                            aria-label="Sort products"
                            className="bg-transparent text-[13px] md:text-sm font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer border-none focus:ring-0 appearance-none pr-6 z-10"
                        >
                            <option value="newest" className="text-gray-900 font-medium">New Arrivals</option>
                            <option value="price-asc" className="text-gray-900 font-medium">Price: Low to High</option>
                            <option value="price-desc" className="text-gray-900 font-medium">Price: High to Low</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 group-hover:text-black dark:group-hover:text-white transition-colors pointer-events-none" />
                    </div>
                </div>



                {/* Product Grid */}
                {filteredAndSortedProducts.length > 0 ? (() => {
                    const desktopCols = store.gridColumns?.desktop || 4;
                    const mobileCols = store.gridColumns?.mobile || 2;
                    return (
                        <>
                        <style>{`
                            .dynamic-product-grid {
                                grid-template-columns: repeat(${mobileCols}, minmax(0, 1fr));
                            }
                            @media (min-width: 640px) {
                                .dynamic-product-grid {
                                    grid-template-columns: repeat(${Math.min(desktopCols, 3)}, minmax(0, 1fr));
                                }
                            }
                            @media (min-width: 1024px) {
                                .dynamic-product-grid {
                                    grid-template-columns: repeat(${desktopCols}, minmax(0, 1fr));
                                }
                            }
                        `}</style>
                        <div className="grid gap-4 sm:gap-6 dynamic-product-grid">
                            {filteredAndSortedProducts.map(product => {
                                const isOutOfStock = product.trackQuantity ? product.stockQuantity <= 0 : !product.inStock;
                                const preventAdd = store.inventoryConfig?.preventCartAdd && isOutOfStock;
                                const showLowStock = store.inventoryConfig?.showLowStock && product.trackQuantity && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
                                const cartItem = cart.find(item => (item.cartItemId || item.id) === product.id);
                                const qtyInCart = cartItem ? cartItem.qty : 0;

                                return (
                                    <div key={product.id} className={`group cursor-pointer flex flex-col ${theme.cardStyle} h-full`} onClick={() => navigate(`/store/${slug}/product/${slugifyProduct(product.name, product.id)}`)}>

                                        {/* Image Box */}
                                        <div className={`relative overflow-hidden shrink-0 ${theme.cardImageStyle}`}>
                                            {product.imageUrls && product.imageUrls[0] ? (
                                                <img
                                                    src={imgUrl(product.imageUrls[0])}
                                                    alt={product.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                                                    onError={e => e.target.style.display = 'none'}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><ShoppingBag className={`w-12 h-12 ${theme.textMuted}`} /></div>
                                            )}
                                            {isOutOfStock ? (
                                                <div className="absolute top-3 left-3 bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md text-xs font-bold border border-rose-200">
                                                    Out of Stock
                                                </div>
                                            ) : showLowStock ? (
                                                <div className="absolute top-3 left-3 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold border border-amber-200">
                                                    Only {product.stockQuantity} left
                                                </div>
                                            ) : product.compareAtPrice ? (
                                                <div className={`absolute top-3 left-3 ${theme.badgeStyle}`}>
                                                    Sale
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Info */}
                                        <div className="p-3 md:p-5 flex flex-col flex-1">
                                            <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-[0.18em] ${theme.textMuted} mb-1 block leading-none`}>
                                                {product.category || '\u00A0'}
                                            </span>
                                            <h3 className={`text-[13px] md:text-[15px] font-semibold ${theme.text} mb-1.5 line-clamp-2 leading-snug hover:opacity-80 transition-opacity capitalize`}>{product.name}</h3>

                                            <div className="flex items-baseline flex-wrap gap-1 md:gap-2 mb-3 md:mb-5">
                                                {(() => {
                                                    // Find the lowest variant price if variant overrides exist
                                                    const variantPrices = (product.variants || []).map(v => v.price).filter(p => p != null);
                                                    const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : parseFloat(product.price);
                                                    const hasVariantPricing = variantPrices.length > 0 && variantPrices.some(p => p !== parseFloat(product.price));
                                                    return (
                                                        <>
                                                            <span className={`${theme.priceStyle || 'text-base md:text-lg font-bold text-black'}`}>
                                                                {hasVariantPricing ? 'from ' : ''}{getCurrencySymbol(store.currency)}{getDisplayPrice(minPrice, product).toFixed(2)}
                                                            </span>
                                                            {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                                                                <>
                                                                    <span className={`${theme.priceCompareStyle || 'text-xs md:text-sm text-gray-400 line-through font-normal'}`}>
                                                                        {getCurrencySymbol(store.currency)}{getDisplayPrice(product.compareAtPrice, product).toFixed(2)}
                                                                    </span>
                                                                    <span className="text-[9px] md:text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100/50">
                                                                        {Math.round(((parseFloat(product.compareAtPrice) - parseFloat(product.price)) / parseFloat(product.compareAtPrice)) * 100)}% OFF
                                                                    </span>
                                                                </>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            <div className="mt-auto">
                                                <div className="flex items-center w-full h-[36px] md:h-[42px] gap-0 relative">
                                                    {/* Quantity Selector Slider */}
                                                    <div className={`flex items-center justify-between border border-gray-205 rounded-[15px] p-1 bg-gray-50 h-full transition-all duration-300 overflow-hidden ${qtyInCart > 0 ? 'w-[45%] opacity-100 mr-2' : 'w-0 opacity-0 pointer-events-none mr-0'
                                                        }`}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateQty(product.id, -1); }}
                                                            className="w-7 h-7 flex items-center justify-center hover:bg-white active:scale-95 rounded-full transition-all font-bold text-base text-gray-800 select-none"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="font-bold text-xs text-gray-900 select-none">{qtyInCart}</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateQty(product.id, 1); }}
                                                            className="w-7 h-7 flex items-center justify-center hover:bg-white active:scale-95 rounded-full transition-all font-bold text-base text-gray-800 select-none"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    {/* Sliding Add/View Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (qtyInCart > 0) {
                                                                setIsCartOpen(true);
                                                            } else if (!preventAdd) {
                                                                addToCart(product);
                                                            }
                                                        }}
                                                        disabled={preventAdd && qtyInCart === 0}
                                                        className={`h-full transition-all duration-300 flex items-center justify-center gap-1.5 uppercase tracking-widest text-[9.5px] font-bold rounded-[15px] select-none ${qtyInCart > 0
                                                            ? 'w-[55%] bg-black text-white hover:bg-neutral-800 shadow-sm'
                                                            : `${theme.buttonStyle} !py-0 flex-1 w-full ${preventAdd ? 'opacity-50 cursor-not-allowed' : ''}`
                                                            }`}
                                                    >
                                                        {qtyInCart > 0 ? (
                                                            <>
                                                                <span className="truncate">View Cart</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                                                                <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        </>
                    );
                })() : (
                    <div className={`text-center py-24 ${theme.cardStyle} rounded-3xl shadow-sm border border-transparent`}>
                        <ShoppingBag className={`w-12 h-12 ${theme.textMuted} mx-auto mb-4`} />
                        <h2 className={`text-lg font-semibold ${theme.text} mb-2`}>No products found</h2>
                        <p className={`text-sm ${theme.textMuted}`}>Try adjusting your filters or search query.</p>
                        <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className={`mt-6 px-6 py-2 ${theme.buttonStyle}`}>Clear Filters</button>
                    </div>
                )}
            </main>

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
                            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
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
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={theme.textMuted}>Subtotal</span>
                                        <span className={`text-lg font-bold ${theme.text}`}>{getCurrencySymbol(store.currency)}{cartSubtotal.toFixed(2)}</span>
                                    </div>
                                    {shippingCost > 0 && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={theme.textMuted}>Shipping</span>
                                            <span className={`text-lg font-bold ${theme.text}`}>{getCurrencySymbol(store.currency)}{shippingCost.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center mb-6 pt-2 border-t border-black/5 dark:border-white/10">
                                        <span className={theme.textMuted}>Total</span>
                                        <span className={`text-xl font-bold ${theme.text}`}>{getCurrencySymbol(store.currency)}{cartTotal.toFixed(2)}</span>
                                    </div>

                                    {cartSubtotal < minOrderValue ? (
                                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl mb-4 text-sm font-medium">
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

            {/* ─── CHECKOUT MODAL ─── */}
            {isCheckoutModalOpen && (
                <React.Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" /></div>}>
                    <WaStoreCheckoutModal
                        store={store}
                        cart={cart}
                        cartSubtotal={cartSubtotal}
                        shippingCost={shippingCost}
                        cartTotal={cartTotal}
                        onClose={() => setIsCheckoutModalOpen(false)}
                        onCheckoutSuccess={handleCheckoutSuccess}
                    />
                </React.Suspense>
            )}

            {/* ─── MOBILE NAVIGATION DRAWER ─── */}
            <WaStoreFooter store={store} />
        </div>
    );
}
