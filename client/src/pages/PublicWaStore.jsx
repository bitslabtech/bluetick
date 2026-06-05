import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShoppingCart, X, Plus, Minus, Search, ArrowRight, MapPin, Mail, Phone, MessageCircle, ChevronLeft, ChevronRight, Filter, Check, Menu, Home, FileText, ChevronDown, ChevronUp, Tag, ChevronRight as Breadcrumb } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import WaStoreFooter from '../components/WaStoreFooter';
import WaStoreCheckoutModal from '../components/WaStoreCheckoutModal';
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
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem(`wa_cart_${slug}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    
    // Theme
    const theme = useMemo(() => getThemeConfig(store?.themeId), [store?.themeId]);
    
    // Search, Filter, Sort — category driven by URL ?cat= param
    const [searchQuery, setSearchQuery] = useState('');
    const selectedCategory = searchParams.get('cat') || 'All';
    const [sortBy, setSortBy] = useState('newest');

    // Helper to change category and update URL
    const setSelectedCategory = useCallback((cat) => {
        if (cat === 'All') {
            setSearchParams({}, { replace: true });
        } else {
            setSearchParams({ cat }, { replace: true });
        }
    }, [setSearchParams]);

    // Hero Slider
    const [activeSlide, setActiveSlide] = useState(0);
    const [sliderPaused, setSliderPaused] = useState(false);
    const sliderTimer = useRef(null);

    // Mobile Navigation Drawer
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedMobileSections, setExpandedMobileSections] = useState({ categories: true, policies: false });
    const [activePolicy, setActivePolicy] = useState(null); // 'privacy', 'terms', 'return'

    const slides = useMemo(() => {
        const heroSlides = store?.heroSlides || [];
        return heroSlides.filter(s => s.imageUrl);
    }, [store]);

    const goToSlide = useCallback((idx) => setActiveSlide(idx), []);
    const nextSlide = useCallback(() => setActiveSlide(prev => (prev + 1) % Math.max(slides.length, 1)), [slides.length]);
    const prevSlide = useCallback(() => setActiveSlide(prev => (prev - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1)), [slides.length]);

    useEffect(() => {
        if (slides.length <= 1 || sliderPaused) return;
        sliderTimer.current = setInterval(nextSlide, 6000);
        return () => clearInterval(sliderTimer.current);
    }, [slides.length, sliderPaused, nextSlide]);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const timestamp = new Date().getTime();
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}?t=${timestamp}`);
                setStore(res.data.store);
                setProducts(res.data.products);

                // Track view once per browser session
                const sessionKey = `wastore_viewed_${slug}`;
                if (!sessionStorage.getItem(sessionKey)) {
                    sessionStorage.setItem(sessionKey, '1');
                    axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}/view`).catch(() => {});
                }
            } catch (error) {
                toast.error("Failed to load store");
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
        // Cleanup all injected SEO tags on unmount
        return () => cleanupStoreSeo();
    }, [slug]);



    useEffect(() => {
        localStorage.setItem(`wa_cart_${slug}`, JSON.stringify(cart));
    }, [cart, slug]);

    // ── Re-apply SEO whenever store data, category, or visible products change ──
    const filteredForSeo = useMemo(() => {
        if (!products.length) return [];
        if (!selectedCategory || selectedCategory === 'All') return products;
        return products.filter(p => p.category === selectedCategory);
    }, [products, selectedCategory]);

    useEffect(() => {
        if (store) {
            applyStoreSeo(store, selectedCategory, filteredForSeo, window.location.origin);
        }
    }, [store, selectedCategory, filteredForSeo]);

    const categories = useMemo(() => {
        const fromProducts = products.map(p => p.category).filter(Boolean);
        const adminCats = Array.isArray(store?.categories) ? store.categories : [];
        const merged = [...new Set([...adminCats, ...fromProducts])];
        return ['All', ...merged];
    }, [products, store]);

    // Advanced SEO: Dynamic Title and Meta Tags based on category
    useEffect(() => {
        if (!store) return;
        
        let pageTitle = store.name;
        let pageDesc = store.description || `Welcome to ${store.name}`;
        
        if (selectedCategory && selectedCategory !== 'All') {
            let details = {};
            try {
                const parsedDetails = typeof store.categoryDetails === 'string' ? JSON.parse(store.categoryDetails) : (store.categoryDetails || {});
                details = parsedDetails[selectedCategory] || {};
            } catch(e) {}
            
            pageTitle = details.metaTitle || `${selectedCategory} - ${store.name}`;
            pageDesc = details.metaDesc || details.description || `Browse our collection of ${selectedCategory} at ${store.name}. Find the best products and offers.`;
        }
        
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
        
        if (selectedCategory && selectedCategory !== 'All') {
            schemaData.department = {
                "@type": "Store",
                "name": selectedCategory
            };
        }
        schemaScript.textContent = JSON.stringify(schemaData);
        
    }, [store, selectedCategory]);

    const filteredAndSortedProducts = useMemo(() => {
        let result = products.filter(p => {
            const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCat && matchesSearch;
        });

        return result.sort((a, b) => {
            if (sortBy === 'price-asc') return parseFloat(a.price) - parseFloat(b.price);
            if (sortBy === 'price-desc') return parseFloat(b.price) - parseFloat(a.price);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [products, selectedCategory, searchQuery, sortBy]);

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
    if (!store) return <div className="h-screen flex items-center justify-center bg-white"><h1 className="text-2xl font-medium text-gray-900">Store Not Found</h1></div>;

    return (
        <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white`} style={{ fontFamily: theme.fontFamily, scrollbarGutter: 'stable' }}>
            
            {/* ─── MODERN HEADER ─── */}
            <header className={`sticky top-0 z-50 ${theme.header}`}>
                {theme.id === 'vogue' ? (
                    /* ── VOGUE: Minimal 3-column ── Search | Logo | Cart */
                    <div className="max-w-[1440px] mx-auto px-10 h-20 grid grid-cols-3 items-center">
                        {/* LEFT – Minimal bordered search */}
                        <div className="flex items-center gap-2 border border-gray-300 rounded-[15px] px-3.5 py-2 max-w-[220px] hover:border-gray-400 transition-colors">
                            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent text-[13px] text-gray-700 placeholder-gray-400 outline-none w-full tracking-wide"
                            />
                        </div>

                        {/* CENTER – Logo or store name */}
                        <div className="flex items-center justify-center">
                            {store.logo ? (
                                <img src={imgUrl(store.logo)} alt={store.name} className="h-12 max-w-[180px] object-contain" onError={e => e.target.style.display = 'none'} />
                            ) : (
                                <span className="text-xl tracking-[0.25em] uppercase text-black font-normal" style={{ fontFamily: theme.fontFamily }}>{store.name}</span>
                            )}
                        </div>

                        {/* RIGHT – Minimal borderless cart */}
                        <div className="flex items-center justify-end">
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="relative flex items-center justify-center p-2 text-black hover:bg-black/5 rounded-full transition-colors group"
                            >
                                <ShoppingCart className="w-5 h-5 text-black group-hover:scale-105 transition-transform stroke-[1.5]" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full border border-white">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── DEFAULT layout for all other themes ── */
                    <div className={theme.headerWrapper || "max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between"}>
                        {/* Logo & Store Name */}
                        <div className={`flex items-center gap-3 ${theme.logoWrapper || ''}`}>
                            <button 
                                onClick={() => setIsMobileMenuOpen(true)}
                                className={`md:hidden p-2 -ml-2 rounded-lg ${theme.textMuted} hover:${theme.text} transition-colors`}
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            {store.logo && (
                                <img src={imgUrl(store.logo)} alt={store.name} className="w-12 h-12 object-contain rounded-md" onError={e => e.target.style.display = 'none'} />
                            )}
                            <span className={`font-semibold text-xl tracking-tight ${theme.headerLogo}`}>{store.name}</span>
                        </div>

                        {/* Desktop Search */}
                        <div className={`hidden md:flex flex-1 max-w-md relative group ${theme.searchWrapper !== undefined ? theme.searchWrapper : 'mx-8'}`}>
                            <Search className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted} transition-colors`} />
                            <input 
                                type="text" 
                                placeholder="Search products..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full ${theme.searchStyle} py-2.5 pl-11 pr-4 text-sm outline-none transition-all`}
                            />
                        </div>

                        {/* Cart Button */}
                        <button 
                            onClick={() => setIsCartOpen(true)}
                            className={`relative p-2 ${theme.cartButton} rounded-full transition-colors flex items-center justify-center ${theme.cartWrapper || ''}`}
                        >
                            <ShoppingCart className="w-6 h-6 stroke-[1.5]" />
                            {cartCount > 0 && (
                                <span className={`absolute -top-1 -right-1 ${theme.cartBadge} text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm`}>
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* ─── MEGA MENU ─── */}
                {store.megaMenu && store.megaMenu.length > 0 && (
                    <div className="w-full border-t border-gray-200/50 hidden md:block">
                        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                            <ul className="flex items-center justify-center space-x-10 h-12">
                                {store.megaMenu.map((menuItem) => (
                                    <li key={menuItem.id} className="h-full relative group flex items-center">
                                        <a 
                                            href={menuItem.link || '#'} 
                                            onClick={(e) => {
                                                if (!menuItem.link) e.preventDefault();
                                                else if (menuItem.link.startsWith('/?cat=')) {
                                                    e.preventDefault();
                                                    setSelectedCategory(menuItem.link.split('=')[1]);
                                                } else if (menuItem.link.startsWith('/')) {
                                                    e.preventDefault();
                                                    navigate(menuItem.link);
                                                }
                                            }}
                                            className="flex items-center h-full text-sm font-semibold tracking-wide hover:opacity-70 transition-opacity uppercase"
                                        >
                                            {menuItem.title}
                                            {menuItem.children && menuItem.children.length > 0 && (
                                                <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-50 transition-transform group-hover:rotate-180" />
                                            )}
                                        </a>
                                        
                                        {/* Dropdown */}
                                        {menuItem.children && menuItem.children.length > 0 && (
                                            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-56 bg-white border border-gray-100 shadow-2xl rounded-xl py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top translate-y-2 group-hover:translate-y-0 z-50">
                                                <ul className="flex flex-col">
                                                    {menuItem.children.map(child => (
                                                        <li key={child.id}>
                                                            <a 
                                                                href={child.link || '#'}
                                                                onClick={(e) => {
                                                                    if (!child.link) e.preventDefault();
                                                                    else if (child.link.startsWith('/?cat=')) {
                                                                        e.preventDefault();
                                                                        setSelectedCategory(child.link.split('=')[1]);
                                                                    } else if (child.link.startsWith('/')) {
                                                                        e.preventDefault();
                                                                        navigate(child.link);
                                                                    }
                                                                }}
                                                                className="block px-5 py-2.5 text-[13px] font-medium text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
                                                            >
                                                                {child.title}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </header>

            {/* ─── HERO SLIDER ─── */}
            {slides.length > 0 ? (
                <div className={`relative bg-white h-[800px] overflow-hidden group ${theme.heroShape || ''}`} onMouseEnter={() => setSliderPaused(true)} onMouseLeave={() => setSliderPaused(false)}>
                    {slides.map((slide, idx) => (
                        <div key={idx} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            <div className={`absolute inset-0 ${theme.heroOverlay} z-10`} />
                            {slide.imageUrl?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                                <video src={imgUrl(slide.imageUrl)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                            ) : (
                                <img src={imgUrl(slide.imageUrl)} alt={slide.title} className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                            )}
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
                                <div className="max-w-3xl space-y-4">
                                    {slide.title && <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg">{slide.title}</h1>}
                                    {slide.subtitle && <p className="text-lg md:text-2xl text-gray-100 font-medium drop-shadow-md">{slide.subtitle}</p>}
                                    {slide.ctaText && (
                                        <button 
                                            onClick={() => {
                                                if (slide.ctaTargetType === 'category' && slide.ctaTargetId) {
                                                    setSelectedCategory(slide.ctaTargetId);
                                                    setTimeout(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }), 50);
                                                } else if (slide.ctaTargetType === 'product' && slide.ctaTargetId) {
                                                    const targetProduct = products.find(p => p.id === slide.ctaTargetId);
                                                    if (targetProduct) {
                                                        navigate(`/store/${slug}/product/${slugifyProduct(targetProduct.name, targetProduct.id)}`);
                                                    }
                                                } else {
                                                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                                                }
                                            }} 
                                            className="mt-4 px-4 md:px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
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
                            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all">
                                <ChevronRight className="w-6 h-6" />
                            </button>
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                                {slides.map((_, idx) => (
                                    <button key={idx} onClick={() => goToSlide(idx)} className={`h-1.5 rounded-full transition-all ${idx === activeSlide ? 'w-8 bg-white' : 'w-2 bg-white/50'}`} />
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
            <main id="products" className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                
                {/* ─── VISUAL BREADCRUMB ─── */}
                {selectedCategory && selectedCategory !== 'All' && (
                    <nav aria-label="Breadcrumb" className="mb-8">
                        <ol className="flex items-center gap-1.5 flex-wrap text-sm">
                            <li>
                                <button
                                    onClick={() => setSelectedCategory('All')}
                                    className={`flex items-center gap-1 hover:underline font-medium ${theme.textMuted} hover:${theme.text} transition-colors`}
                                >
                                    <Home className="w-3.5 h-3.5" />
                                    <span>{store.name}</span>
                                </button>
                            </li>
                            <li className={theme.textMuted}><ChevronRight className="w-3.5 h-3.5" /></li>
                            <li>
                                <span className={`font-semibold ${theme.text}`}>{selectedCategory}</span>
                            </li>
                        </ol>
                    </nav>
                )}

                {/* ─── SHOP BY CATEGORY (VISUAL) ─── */}
                {categories.length > 1 && (
                    <div className="mb-12 w-full">
                        <h2 className={`text-2xl font-bold mb-4 ${theme.text}`}>Shop by Category</h2>
                        
                        {theme.id === 'vogue' ? (
                            <div className="flex overflow-x-auto hide-scrollbar gap-6 pb-6 px-4 -mx-4 snap-x">
                                {/* ALL PRODUCTS */}
                                <button 
                                    onClick={() => setSelectedCategory('All')}
                                    className="flex flex-col items-center gap-4 shrink-0 group w-28 sm:w-36 snap-start"
                                >
                                    <div className={`w-28 h-28 sm:w-36 sm:h-36 overflow-hidden rounded-full flex items-center justify-center transition-all duration-300 relative border-2 border-zinc-900 dark:border-white ${
                                        selectedCategory === 'All' 
                                        ? 'shadow-md' 
                                        : 'bg-zinc-100 dark:bg-zinc-900 group-hover:shadow-md'
                                    }`}>
                                        <div className={`absolute inset-0 transition-opacity duration-500 ${selectedCategory === 'All' ? 'bg-black/5 dark:bg-white/5' : 'bg-transparent group-hover:bg-black/5 dark:group-hover:bg-white/5'}`}></div>
                                        <span className={`text-xl font-light tracking-[0.2em] uppercase transition-transform duration-500 ${selectedCategory === 'All' ? 'scale-105 text-zinc-900 dark:text-white font-medium' : 'text-zinc-500 dark:text-zinc-400 group-hover:scale-105 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                                            All
                                        </span>
                                    </div>
                                    <span className={`text-sm tracking-[0.15em] uppercase text-center ${selectedCategory === 'All' ? 'font-medium text-zinc-900 dark:text-white' : 'font-light text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                                        All Products
                                    </span>
                                </button>
                                
                                {/* INDIVIDUAL CATEGORIES */}
                                {categories.filter(c => {
                                    if (c === 'All') return false;
                                    let hidden = [];
                                    try { hidden = typeof store.hiddenCategories === 'string' ? JSON.parse(store.hiddenCategories) : (store.hiddenCategories || []); } catch(e){}
                                    return !hidden.includes(c);
                                }).map(cat => {
                                    let catImage = null;
                                    try {
                                        const imgs = typeof store.categoryImages === 'string' ? JSON.parse(store.categoryImages) : (store.categoryImages || {});
                                        catImage = imgs[cat];
                                    } catch(e){}
                                        
                                    return (
                                        <button 
                                            key={cat} onClick={() => setSelectedCategory(cat)}
                                            className="flex flex-col items-center gap-4 shrink-0 group w-28 sm:w-36 snap-start"
                                        >
                                            <div className={`w-28 h-28 sm:w-36 sm:h-36 overflow-hidden rounded-full flex items-center justify-center transition-all duration-300 relative border-2 border-zinc-900 dark:border-white ${
                                                selectedCategory === cat 
                                                ? 'shadow-md' 
                                                : 'bg-zinc-100 dark:bg-zinc-800 group-hover:shadow-md'
                                            }`}>
                                                {catImage ? (
                                                    <img src={imgUrl(catImage)} alt={cat} className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${selectedCategory === cat ? 'scale-105' : 'scale-100 group-hover:scale-105'}`} />
                                                ) : (
                                                    <span className="text-4xl font-thin text-zinc-400 dark:text-zinc-600">{cat.substring(0,1)}</span>
                                                )}
                                                <div className={`absolute inset-0 transition-opacity duration-500 ${selectedCategory === cat ? 'bg-black/10' : 'bg-transparent group-hover:bg-black/10'}`}></div>
                                            </div>
                                            <span className={`text-sm tracking-[0.15em] uppercase text-center ${selectedCategory === cat ? 'font-medium text-zinc-900 dark:text-white' : 'font-light text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                                                {cat}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex overflow-x-auto hide-scrollbar gap-6 py-4 px-4 -mx-4">
                                {/* ALL PRODUCTS */}
                                <button 
                                    onClick={() => setSelectedCategory('All')}
                                    className="flex flex-col items-center gap-3 shrink-0 group w-20 sm:w-24"
                                >
                                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                                        selectedCategory === 'All' 
                                        ? `bg-black/10 scale-105 shadow-md` 
                                        : `bg-black/5 group-hover:bg-black/10 group-hover:scale-105`
                                    }`}>
                                        <span className={`text-xl sm:text-2xl font-bold uppercase ${selectedCategory === 'All' ? theme.text : theme.textMuted}`}>ALL</span>
                                    </div>
                                    <span className={`text-sm font-semibold text-center leading-tight ${selectedCategory === 'All' ? theme.text : theme.textMuted}`}>All Products</span>
                                </button>
                                
                                {/* INDIVIDUAL CATEGORIES */}
                                {categories.filter(c => {
                                    if (c === 'All') return false;
                                    let hidden = [];
                                    try { hidden = typeof store.hiddenCategories === 'string' ? JSON.parse(store.hiddenCategories) : (store.hiddenCategories || []); } catch(e){}
                                    return !hidden.includes(c);
                                }).map(cat => {
                                    let catImage = null;
                                    try {
                                        const imgs = typeof store.categoryImages === 'string' ? JSON.parse(store.categoryImages) : (store.categoryImages || {});
                                        catImage = imgs[cat];
                                    } catch(e){}
                                        
                                    return (
                                        <button 
                                            key={cat} onClick={() => setSelectedCategory(cat)}
                                            className="flex flex-col items-center gap-3 shrink-0 group w-20 sm:w-24"
                                        >
                                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 ${
                                                selectedCategory === cat 
                                                ? `bg-black/10 scale-105 shadow-md` 
                                                : `bg-black/5 group-hover:bg-black/10 group-hover:scale-105`
                                            }`}>
                                                {catImage ? (
                                                    <img src={imgUrl(catImage)} alt={cat} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className={`text-xl sm:text-2xl font-bold uppercase ${selectedCategory === cat ? theme.text : theme.textMuted}`}>{cat.substring(0,2)}</span>
                                                )}
                                            </div>
                                            <span className={`text-sm font-semibold text-center leading-tight ${selectedCategory === cat ? theme.text : theme.textMuted}`}>{cat}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Category Description */}
                {selectedCategory !== 'All' && (() => {
                    let desc = '';
                    try {
                        const parsedDetails = typeof store.categoryDetails === 'string' ? JSON.parse(store.categoryDetails) : (store.categoryDetails || {});
                        desc = parsedDetails[selectedCategory]?.description || '';
                    } catch(e) {}
                    return desc ? (
                        <div className="mb-8 p-4 bg-gray-50/50 dark:bg-zinc-800/20 rounded-2xl border border-gray-100 dark:border-white/5">
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center sm:text-left">{desc}</p>
                        </div>
                    ) : null;
                })()}

                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-end gap-6 mb-8">
                    
                    {/* Sort */}
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

                {/* Mobile Search */}
                <div className="md:hidden relative mb-8">
                    <Search className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                    <input 
                        type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full ${theme.searchStyle} py-3 pl-11 pr-4 text-sm outline-none transition-colors`}
                    />
                </div>

                {/* Product Grid */}
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
                            const cartItem = cart.find(item => (item.cartItemId || item.id) === product.id);
                            const qtyInCart = cartItem ? cartItem.qty : 0;

                            return (
                            <div key={product.id} className={`group cursor-pointer flex flex-col ${theme.cardStyle} h-full`} onClick={() => navigate(`/store/${slug}/product/${slugifyProduct(product.name, product.id)}`)}>

                                {/* Image Box */}
                                <div className={`relative overflow-hidden shrink-0 ${theme.cardImageStyle}`}>
                                    {product.imageUrls && product.imageUrls[0] ? (
                                        <img src={imgUrl(product.imageUrls[0])} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => e.target.style.display = 'none'} />
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
                                <div className="p-5 flex flex-col flex-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.textMuted} mb-1.5 block`}>
                                        {product.category || '\u00A0'}
                                    </span>
                                    <h3 className={`text-[15px] font-semibold ${theme.text} mb-2 line-clamp-2 h-10 leading-snug hover:opacity-80 transition-opacity`}>{product.name}</h3>
                                    
                                    <div className="flex items-baseline flex-wrap gap-2 mb-5">
                                        <span className={`${theme.priceStyle || 'text-lg font-bold text-black'}`}>{getCurrencySymbol(store.currency)}{parseFloat(product.price).toFixed(2)}</span>
                                        {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                                            <>
                                                <span className={`${theme.priceCompareStyle || 'text-sm text-gray-400 line-through font-normal'}`}>
                                                    {getCurrencySymbol(store.currency)}{parseFloat(product.compareAtPrice).toFixed(2)}
                                                </span>
                                                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100/50">
                                                    {Math.round(((parseFloat(product.compareAtPrice) - parseFloat(product.price)) / parseFloat(product.compareAtPrice)) * 100)}% OFF
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <div className="mt-auto">
                                        <div className="flex items-center w-full h-[42px] gap-0 relative">
                                            {/* Quantity Selector Slider */}
                                            <div className={`flex items-center justify-between border border-gray-205 rounded-[15px] p-1 bg-gray-50 h-full transition-all duration-300 overflow-hidden ${
                                                qtyInCart > 0 ? 'w-[45%] opacity-100 mr-2' : 'w-0 opacity-0 pointer-events-none mr-0'
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
                                                className={`h-full transition-all duration-300 flex items-center justify-center gap-1.5 uppercase tracking-widest text-[9.5px] font-bold rounded-[15px] select-none ${
                                                    qtyInCart > 0 
                                                    ? 'w-[55%] bg-black text-white hover:bg-neutral-800 shadow-sm' 
                                                    : `${theme.buttonStyle} !py-0 flex-1 w-full ${preventAdd ? 'opacity-50 cursor-not-allowed' : ''}`
                                                }`}
                                            >
                                                {qtyInCart > 0 ? (
                                                    <>
                                                        <span className="truncate">View Cart</span>
                                                        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
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
                            className="w-full max-w-md bg-white h-full relative z-10 flex flex-col shadow-2xl"
                        >
                            
                            <div className={`px-6 py-5 border-b border-gray-100 flex items-center justify-between ${theme.pageBg}`}>
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
                                                        <img src={imgUrl(item.imageUrls[0])} alt={item.name} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <h4 className={`font-semibold text-sm ${theme.text} truncate`}>{item.name}</h4>
                                                    {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                                                        <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>
                                                            {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                                        </div>
                                                    )}
                                                    <div className={`font-medium text-sm ${theme.textMuted} mt-1`}>{getCurrencySymbol(store.currency)}{parseFloat(item.price).toFixed(2)}</div>
                                                    
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                                            <button onClick={() => updateQty(item.cartItemId || item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-8 text-center text-xs font-semibold">{item.qty}</span>
                                                            <button onClick={() => updateQty(item.cartItemId || item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className={`p-6 ${theme.pageBg} border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]`}>
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
                                    <div className="flex justify-between items-center mb-6 pt-2 border-t border-gray-100">
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
                            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
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
                                        {['All', ...categories.filter(c => c !== 'All')].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    setSelectedCategory(cat);
                                                    setIsMobileMenuOpen(false);
                                                    setTimeout(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }), 50);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${selectedCategory === cat ? theme.categoryTabActive : theme.categoryTab}`}
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
