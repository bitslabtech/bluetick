import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShoppingCart, X, Plus, Minus, Search, ArrowRight, MapPin, Mail, Phone, MessageCircle, ChevronLeft, ChevronRight, Filter, Check, Menu, Home, FileText, ChevronDown, ChevronUp, Tag, ChevronRight as Breadcrumb, Play } from 'lucide-react';
import toast from 'react-hot-toast';

import WaStoreFooter from '../components/WaStoreFooter';
import WaStoreHeader from '../components/WaStoreHeader';
const WaStoreCheckoutModal = React.lazy(() => import('../components/WaStoreCheckoutModal'));
import StoreNotFound from '../components/StoreNotFound';
import { getThemeConfig } from '../utils/wastoreThemes';
import { applyStoreSeo, cleanupStoreSeo } from '../utils/storeSeo';
import { cdnImg, cdnSrcSet } from '../utils/cdnImage';
import { StoreCustomerProvider, useStoreCustomer } from '../context/StoreCustomerContext';
import { getStoreRoute } from '../utils/storeRouting';

// Generates a SEO-friendly product URL slug: "blue-cotton-shirt--a1b2c3d4"

/**
 * Thin wrapper: provides StoreCustomerContext to the store page so the header
 * can read the logged-in customer without re-fetching store data.
 */
function StoreCustomerWrapper({ slug, store, children }) {
    return (
        <StoreCustomerProvider slug={slug}>
            <StoreCustomerHeaderBridge store={store} slug={slug}>
                {children}
            </StoreCustomerHeaderBridge>
        </StoreCustomerProvider>
    );
}

// Inner bridge that reads the context and injects authEnabled/customer to the header child.
// Children must render <WaStoreHeader> as a direct child to benefit from this.
// Since we can't intercept children props easily, we just export a hook instead.
function StoreCustomerHeaderBridge({ children }) {
    return children;
}

/** Floating gold sparkle effect for jewelry theme */
function JewelrySparkles() {
    useEffect(() => {
        const styleId = 'jewelry-sparkle-style';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes jewelGlint {
                0%, 100% { opacity: 0.07; transform: scale(0.7) rotate(0deg); }
                50% { opacity: 0.55; transform: scale(1.15) rotate(22deg); }
            }
            @keyframes jewelDrift {
                0%, 100% { opacity: 0.05; transform: scale(0.6) rotate(-10deg) translateY(0px); }
                50% { opacity: 0.45; transform: scale(1.1) rotate(12deg) translateY(-4px); }
            }
            .jewelry-sparkle-dot { animation: jewelGlint ease-in-out infinite; position: fixed; pointer-events: none; z-index: 1; }
            .jewelry-sparkle-dot.drift { animation-name: jewelDrift; }
        `;
        document.head.appendChild(style);
        return () => { document.getElementById('jewelry-sparkle-style')?.remove(); };
    }, []);

    const sparkles = [
        { style: { top: '7%',  left: '3.5%',  animationDuration: '4.2s', animationDelay: '0s'    }, size: 14, drift: false },
        { style: { top: '19%', right: '3%',   animationDuration: '5.5s', animationDelay: '1.3s'  }, size: 9,  drift: true  },
        { style: { top: '52%', left: '2%',    animationDuration: '3.9s', animationDelay: '2.1s'  }, size: 11, drift: false },
        { style: { top: '68%', right: '4.5%', animationDuration: '4.8s', animationDelay: '0.6s'  }, size: 7,  drift: true  },
        { style: { top: '86%', left: '8%',    animationDuration: '5.2s', animationDelay: '1.9s'  }, size: 10, drift: false },
        { style: { top: '37%', right: '2.5%', animationDuration: '3.6s', animationDelay: '3.1s'  }, size: 6,  drift: true  },
        { style: { top: '13%', right: '16%',  animationDuration: '6.1s', animationDelay: '0.9s'  }, size: 5,  drift: false },
        { style: { top: '91%', right: '11%',  animationDuration: '4.6s', animationDelay: '2.6s'  }, size: 9,  drift: true  },
        { style: { top: '76%', left: '18%',   animationDuration: '5.8s', animationDelay: '1.1s'  }, size: 6,  drift: false },
        { style: { top: '43%', left: '6%',    animationDuration: '4.0s', animationDelay: '3.8s'  }, size: 8,  drift: true  },
    ];

    return (
        <>
            {sparkles.map((s, i) => (
                <div key={i} className={`jewelry-sparkle-dot${s.drift ? ' drift' : ''}`} style={s.style}>
                    <svg width={s.size} height={s.size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0L13.8 10.2L24 12L13.8 13.8L12 24L10.2 13.8L0 12L10.2 10.2L12 0Z" fill="#B76E79"/>
                    </svg>
                </div>
            ))}
        </>
    );
}

/** Reads auth context and passes customer/authEnabled to WaStoreHeader + children */
function StoreInnerWithAuth({ store, theme, slug, products, categories, cartCount, setIsCartOpen, children }) {
    const { customer, authConfig } = useStoreCustomer();
    const authEnabled = authConfig?.enabled || store?.customerAuthConfig?.enabled || false;
    const isDarkTheme = theme?.pageBg?.includes('900') || theme?.pageBg?.includes('950') || theme?.pageBg?.includes('black') || theme?.pageBg?.includes('zinc');

    return (
        <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white ${isDarkTheme ? 'dark' : ''}`} style={{ fontFamily: theme.fontFamily, ...(theme.bgPatternStyle || {}) }}>
            {theme.sparkleEffect && <JewelrySparkles />}
            {/* ─── MODERN HEADER ─── */}
            <div id="store-topbar">
                <WaStoreHeader
                    store={store}
                    theme={theme}
                    slug={slug}
                    products={products}
                    categories={categories}
                    cartCount={cartCount}
                    setIsCartOpen={setIsCartOpen}
                    authEnabled={authEnabled}
                    storeCustomer={customer}
                />
            </div>
            {children}
        </div>
    );
}

const slugifyProduct = (productOrName, id) => {
    let name = productOrName;
    if (productOrName && typeof productOrName === 'object') {
        if (productOrName.slug) return productOrName.slug;
        name = productOrName.name;
        id = productOrName.id;
    }
    const nameSlug = (name || '')
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
    const [trendingProducts, setTrendingProducts] = useState(preloaded?.trendingProducts || []);
    const [loading, setLoading] = useState(!preloaded?.store);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // ── Visual Store Editor (VSE) live preview mode ──────────────────────────
    // When loaded inside the VSE iframe (?editor=true), listen for postMessage
    // updates from the parent editor window and re-render with draft store data.
    const [isEditorMode] = useState(() => {
        if (window.self === window.top) return false;
        return searchParams.get('editor') === 'true';
    });
    useEffect(() => {
        if (!isEditorMode) return;

        // Signal the parent editor that this iframe is ready to receive data
        window.parent.postMessage({ type: 'VSE_READY' }, window.location.origin);

        // Inject editor-mode styles once
        const styleId = 'vse-highlight-style';
        if (!document.getElementById(styleId)) {
            const s = document.createElement('style');
            s.id = styleId;
            s.textContent = `
                /* Hover highlight — subtle violet outline */
                .vse-highlighted {
                    outline: 2px solid rgba(139,92,246,0.65) !important;
                    outline-offset: 3px !important;
                    border-radius: 8px !important;
                    box-shadow: 0 0 0 4px rgba(139,92,246,0.10) !important;
                    transition: outline 0.15s ease, box-shadow 0.15s ease !important;
                }
                /* Active / focused section — red dashed "currently editing" border */
                .vse-active-section {
                    outline: 2.5px dashed rgba(239,68,68,0.75) !important;
                    outline-offset: 5px !important;
                    border-radius: 8px !important;
                    box-shadow: 0 0 0 6px rgba(239,68,68,0.07) !important;
                    position: relative !important;
                }
                /* "Editing" badge pinned top-left of active section */
                .vse-editing-badge {
                    position: absolute;
                    top: -22px;
                    left: 4px;
                    z-index: 9999;
                    background: rgba(239,68,68,0.92);
                    color: #fff;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    padding: 2px 8px;
                    border-radius: 4px 4px 0 0;
                    pointer-events: none;
                    white-space: nowrap;
                    font-family: Inter, system-ui, sans-serif;
                }
                /* Hide scrollbars in visual editor preview */
                ::-webkit-scrollbar {
                    display: none !important;
                }
                * {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
            `;
            document.head.appendChild(s);
        }

        // Section ID → DOM element ID map
        const SECTION_DOM_IDS = {
            hero:        'section-hero',
            categories:  'section-categories',
            collections: 'section-collections',
            videos:      'section-videos',
            trending:    'section-trending',
            products:    'all-products-grid',
            topbar:      'store-topbar',
            footer:      'store-footer',
        };

        const SECTION_LABELS = {
            hero: 'Hero Slider', categories: 'Category Bar', collections: 'Collections',
            videos: 'Shop Through Video', trending: 'Trending Now', products: 'All Products',
            topbar: 'Top Bar', footer: 'Footer',
        };

        const clearActiveFocus = () => {
            document.querySelectorAll('.vse-active-section').forEach(el => {
                el.classList.remove('vse-active-section');
            });
            document.querySelectorAll('.vse-editing-badge').forEach(b => b.remove());
        };

        window.__VSE_IFRAME_ID = window.__VSE_IFRAME_ID || Math.random().toString(36).substr(2, 9);

        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === 'VSE_UPDATE' && event.data?.store) {
                setStore(event.data.store);
                if (event.data.products) setProducts(event.data.products);
                if (event.data.store.productGridConfig?.defaultSort) {
                    setSortBy(event.data.store.productGridConfig.defaultSort);
                }
            }

            if (event.data?.type === 'VSE_HIGHLIGHT') {
                // Clear hover highlights (don't touch active focus border)
                document.querySelectorAll('.vse-highlighted').forEach(el => el.classList.remove('vse-highlighted'));
                const domId = event.data.sectionId ? SECTION_DOM_IDS[event.data.sectionId] : null;
                if (domId) {
                    const el = document.getElementById(domId);
                    if (el) el.classList.add('vse-highlighted');
                }
            }

            if (event.data?.type === 'VSE_FOCUS') {
                // Clear previous active focus
                clearActiveFocus();

                const { sectionId } = event.data;
                if (!sectionId) return;

                const domId = SECTION_DOM_IDS[sectionId];
                if (!domId) return;

                const el = document.getElementById(domId);
                if (!el) return;

                // Apply red dashed active border
                el.style.position = el.style.position || 'relative';
                el.classList.add('vse-active-section');

                // Inject "✏ Editing" badge
                const badge = document.createElement('div');
                badge.className = 'vse-editing-badge';
                badge.textContent = `✏ Editing: ${SECTION_LABELS[sectionId] || sectionId}`;
                el.insertBefore(badge, el.firstChild);

                // Smooth scroll into view (centered, with a little top offset)
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 80);
            }
        };

        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [isEditorMode]);
    // ─────────────────────────────────────────────────────────────────────────

    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem(`wa_cart_${slug}`);
        return saved ? JSON.parse(saved) : [];
    });

    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState(preloaded?.store?.productGridConfig?.defaultSort || 'newest');
    const [currentPage, setCurrentPage] = useState(1);

    // Shoppable Videos State & Demo Data
    const [activeVideo, setActiveVideo] = useState(null);
    const videosScrollRef = useRef(null);
    const [activeVideoDot, setActiveVideoDot] = useState(0);
    const [videosPaused, setVideosPaused] = useState(false);
    const videoAutoSlideTimer = useRef(null);
    const shoppableVideos = useMemo(() => {
        if (store?.shoppableVideos && Array.isArray(store.shoppableVideos) && store.shoppableVideos.length > 0) {
            return store.shoppableVideos.map(v => ({
                ...v,
                product: products?.find(p => p.id === v.productId) || null
            }));
        }
        return []; // No videos yet
    }, [store?.shoppableVideos, products]);

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

    useEffect(() => {
        if (window.location.search.includes('cart=open')) {
            setIsCartOpen(true);
            window.history.replaceState({}, '', getStoreRoute(slug));
        }
    }, [slug]);

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
        let resumeTimeout = null;

        // Pause on user touch
        const pause = () => {
            clearInterval(categoryAutoplayTimer.current);
            if (resumeTimeout) clearTimeout(resumeTimeout);
            
            // Resume after 6s of inactivity
            resumeTimeout = setTimeout(() => {
                clearInterval(categoryAutoplayTimer.current); // double check
                categoryAutoplayTimer.current = setInterval(scrollNext, 3500);
            }, 6000);
        };
        el.addEventListener('touchstart', pause, { passive: true });

        return () => {
            clearInterval(categoryAutoplayTimer.current);
            if (resumeTimeout) clearTimeout(resumeTimeout);
            el.removeEventListener('touchstart', pause);
        };
    }, [store?.categoryAutoplay, store]);

    // Shoppable videos active dot calculation on scroll
    const handleVideoScroll = useCallback(() => {
        const el = videosScrollRef.current;
        if (!el || shoppableVideos.length === 0) return;
        const card = el.children[0];
        if (!card) return;
        const cardWidth = card.offsetWidth;
        const gap = 16;
        const step = cardWidth + gap;
        const scrollPos = el.scrollLeft;
        const idx = Math.min(
            shoppableVideos.length - 1,
            Math.max(0, Math.round(scrollPos / step))
        );
        setActiveVideoDot(idx);
    }, [shoppableVideos.length]);

    const scrollToVideo = useCallback((idx) => {
        const el = videosScrollRef.current;
        if (!el) return;
        const card = el.children[idx];
        if (card) {
            const targetLeft = card.offsetLeft - el.offsetLeft;
            el.scrollTo({ left: targetLeft, behavior: 'smooth' });
        }
        setActiveVideoDot(idx);
    }, []);

    // Shoppable videos auto-slide effect
    useEffect(() => {
        const el = videosScrollRef.current;
        if (!el || !store?.shoppableVideosAutoSlide || shoppableVideos.length <= 1 || videosPaused) return;

        videoAutoSlideTimer.current = setInterval(() => {
            const container = videosScrollRef.current;
            if (!container) return;
            const card = container.children[0];
            if (!card) return;
            const step = card.offsetWidth + 16;
            const maxScroll = container.scrollWidth - container.clientWidth;

            if (container.scrollLeft + step >= maxScroll - 10) {
                container.scrollTo({ left: 0, behavior: 'smooth' });
                setActiveVideoDot(0);
            } else {
                container.scrollBy({ left: step, behavior: 'smooth' });
            }
        }, 3500);

        return () => clearInterval(videoAutoSlideTimer.current);
    }, [store?.shoppableVideosAutoSlide, shoppableVideos.length, videosPaused]);

    useEffect(() => {
        // ── EDITOR MODE: skip all API fetching ────────────────────────────────
        // Data is pushed in real-time via postMessage from WaStoreVisualEditor.
        // Any API fetch here would overwrite the draft and break the live preview.
        if (isEditorMode) {
            setLoading(false);
            return () => cleanupStoreSeo();
        }
        // ──────────────────────────────────────────────────────────────────────

        const fetchStore = async (isSilent = false) => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}`);
                setStore(res.data.store);
                setProducts(res.data.products);
                setTrendingProducts(res.data.trendingProducts || []);
                if (res.data.store?.productGridConfig?.defaultSort) {
                    setSortBy(res.data.store.productGridConfig.defaultSort);
                }

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
    }, [slug, isEditorMode]);

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
        return parseFloat(priceVal) || 0;
    }, [store]);

    // Smart price formatter: strips .00 decimals, keeps .50 etc.
    const formatPrice = useCallback((num) => {
        const n = parseFloat(num);
        if (isNaN(n)) return '0';
        return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2);
    }, []);

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
            const getPrice = (p) => parseFloat(p.price) || 0;
            if (sortBy === 'price-asc' || sortBy === 'price_asc') return getPrice(a) - getPrice(b);
            if (sortBy === 'price-desc' || sortBy === 'price_desc') return getPrice(b) - getPrice(a);
            if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [products, sortBy]);

    const paginationMode = store?.productGridConfig?.paginationMode || store?.paginationConfig?.mode || 'load_more';

    const paginatedProducts = useMemo(() => {
        if (paginationMode === 'none') return filteredAndSortedProducts;

        const isMobile = window.innerWidth < 768;
        const limit = isMobile ? 12 : 16;
        
        if (paginationMode === 'load_more') {
            return filteredAndSortedProducts.slice(0, currentPage * limit);
        }
        
        if (paginationMode === 'pagination') {
            const start = (currentPage - 1) * limit;
            return filteredAndSortedProducts.slice(start, start + limit);
        }

        return filteredAndSortedProducts;
    }, [filteredAndSortedProducts, paginationMode, currentPage]);
    
    const hasMoreProducts = useMemo(() => {
        if (paginationMode === 'none') return false;
        const isMobile = window.innerWidth < 768;
        const limit = isMobile ? 12 : 16;
        return currentPage * limit < filteredAndSortedProducts.length;
    }, [filteredAndSortedProducts.length, paginationMode, currentPage]);
    
    const totalPages = useMemo(() => {
        const isMobile = window.innerWidth < 768;
        const limit = isMobile ? 12 : 16;
        return Math.ceil(filteredAndSortedProducts.length / limit);
    }, [filteredAndSortedProducts.length]);

    const addToCart = (product, qty = 1) => {
        if (product.options && Array.isArray(product.options) && product.options.length > 0) {
            navigate(getStoreRoute(slug, `/product/${slugifyProduct(product)}`));
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

    const getItemPrice = useCallback((item) => {
        if (item.minWholesaleQty && item.wholesalePrice && item.qty >= parseInt(item.minWholesaleQty)) {
            return parseFloat(item.wholesalePrice);
        }
        return parseFloat(item.price);
    }, []);

    const cartSubtotal = cart.reduce((sum, item) => sum + (getItemPrice(item) * item.qty), 0);
    const estimatedTax = (store?.taxConfig?.enabled && store.taxConfig.taxInclusive === false)
        ? cart.reduce((sum, item) => {
            const taxRate = item.taxRate !== null && item.taxRate !== undefined ? parseFloat(item.taxRate) : (parseFloat(store.taxConfig.rate) || 0);
            return sum + (getItemPrice(item) * (taxRate / 100) * item.qty);
          }, 0)
        : 0;
    const shippingCost = (flatShippingRate > 0 && (freeShippingThreshold === 0 || (cartSubtotal + estimatedTax) < freeShippingThreshold)) ? flatShippingRate : 0;
    const cartTotal = cartSubtotal + shippingCost + estimatedTax;
    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', INR: '\u20B9' };
        return symbols[code] || code;
    };


    const handleCheckoutSuccess = () => {
        setCart([]);
        setIsCartOpen(false);
    };

    const renderProductCard = (product, context = 'grid') => {
        const isOutOfStock = product.trackQuantity ? product.stockQuantity <= 0 : !product.inStock;
        const preventAdd = store.inventoryConfig?.preventCartAdd && isOutOfStock;
        const showLowStock = store.inventoryConfig?.showLowStock && product.trackQuantity && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
        const cartItem = cart.find(item => (item.cartItemId || item.id) === product.id);
        const qtyInCart = cartItem ? cartItem.qty : 0;
        const widthClass = context === 'slider' ? 'w-[160px] md:w-[240px] shrink-0 snap-start' : 'w-full';

        return (
            <div key={product.id} className={`group cursor-pointer flex flex-col ${theme.cardStyle} h-full ${widthClass}`} onClick={() => navigate(getStoreRoute(slug, `/product/${slugifyProduct(product)}`))}>
                {/* Image Box */}
                <div className={`relative overflow-hidden shrink-0 ${theme.cardImageStyle}`}>
                    {product.imageUrls && product.imageUrls[0] ? (
                        <img
                            src={cdnImg(imgUrl(product.imageUrls[0]), { width: 400 })}
                            srcSet={cdnSrcSet(imgUrl(product.imageUrls[0]), [400, 600, 800])}
                            sizes="(max-width: 640px) calc(50vw - 2rem), (max-width: 1024px) calc(33vw - 2rem), calc(25vw - 2rem)"
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
                    <div className="flex items-center justify-between mb-1 min-h-[14px]">
                        <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-[0.18em] ${theme.textMuted} leading-none truncate`}>
                            {product.category || '\u00A0'}
                        </span>
                        {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                            <span className="text-[9px] md:text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100/50 shrink-0 ml-1">
                                {Math.round(((parseFloat(product.compareAtPrice) - parseFloat(product.price)) / parseFloat(product.compareAtPrice)) * 100)}% OFF
                            </span>
                        )}
                    </div>
                    <h3 className={`text-base md:text-[17px] font-bold ${theme.text} mb-1.5 line-clamp-2 leading-tight hover:opacity-80 transition-opacity capitalize`}>{product.name}</h3>

                    <div className="flex items-baseline flex-wrap gap-1 md:gap-2 mb-3 md:mb-5">
                        {(() => {
                            const variantPrices = (product.variants || []).map(v => v.price).filter(p => p != null);
                            const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : parseFloat(product.price);
                            const hasVariantPricing = variantPrices.length > 0 && variantPrices.some(p => p !== parseFloat(product.price));
                            return (
                                <>
                                    <span className={`${theme.priceStyle || 'text-base md:text-lg font-bold text-black'}`}>
                                        {hasVariantPricing ? 'from ' : ''}{getCurrencySymbol(store.currency)}{formatPrice(getDisplayPrice(minPrice, product))}
                                    </span>
                                    {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                                        <span className={`${theme.priceCompareStyle || 'text-xs md:text-sm text-gray-400 line-through font-normal'}`}>
                                            {getCurrencySymbol(store.currency)}{formatPrice(getDisplayPrice(product.compareAtPrice, product))}
                                        </span>
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
    };

    // Show a themed skeleton while data loads
    if (loading) return (
        <div className="flex flex-col min-h-screen bg-[#F9F6F3]">
            {/* Skeleton Header */}
            <div className="w-full h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
                <div className="h-5 w-28 rounded-md bg-gray-200 animate-pulse" />
                <div className="flex-1" />
                <div className="h-5 w-32 rounded-full bg-gray-200 animate-pulse hidden md:block" />
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            </div>
            {/* Hero Banner Skeleton */}
            <div className="w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.5/1] bg-gray-200 animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.6s_infinite]" style={{backgroundSize:'200% 100%', animation:'shimmer 1.6s ease-in-out infinite'}} />
            </div>
            {/* Category Pills Skeleton */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex gap-3 overflow-hidden">
                {[80,64,96,72,56].map((w, i) => (
                    <div key={i} className="h-8 rounded-full bg-gray-200 animate-pulse shrink-0" style={{width: w}} />
                ))}
            </div>
            {/* Product Grid Skeleton */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex flex-col bg-white rounded-xl overflow-hidden shadow-sm">
                        <div className="w-full aspect-[4/5] bg-gray-200 animate-pulse" style={{animationDelay: `${i * 0.07}s`}} />
                        <div className="p-3 flex flex-col gap-2">
                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mt-1" />
                            <div className="h-9 w-full bg-gray-200 rounded-lg animate-pulse mt-1" />
                        </div>
                    </div>
                ))}
            </div>
            <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
        </div>
    );
    if (!store) return <StoreNotFound slug={slug} />;

    return (
        <StoreCustomerWrapper store={store} slug={slug}>
        <StoreInnerWithAuth
            store={store} theme={theme} slug={slug} products={products} categories={categories}
            cartCount={cartCount} setIsCartOpen={setIsCartOpen}
        >
            {/* ─── MAIN CONTENT ─── */}
            <main id="products" className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">


                {/* ─── DYNAMIC SECTION RENDERER ─────────────────────────────────
                    Sections render in the order defined by store.homepageSections.
                    Each section checks its own visibility flag before rendering.
                    Falls back to default order if homepageSections is not set.
                    Missing sections (e.g., from older saved configs) are appended.
                ──────────────────────────────────────────────────────────────── */}
                {(() => {
                    const ALL_SECTION_IDS = ['topbar', 'hero', 'videos', 'trending', 'categories', 'collections', 'products', 'footer'];
                    const DEFAULT_ORDER = ['hero', 'videos', 'trending', 'categories', 'collections', 'products'];

                    let sectionConfig;
                    if (store.homepageSections && store.homepageSections.length > 0) {
                        // Use saved config, but fill in any sections that are missing
                        // (handles stores saved with older versions of the editor)
                        const savedIds = new Set(store.homepageSections.map(s => s.id));
                        const missing = ALL_SECTION_IDS
                            .filter(id => !savedIds.has(id))
                            .map(id => ({ id, visible: true }));
                        // Insert missing non-footer sections before footer, footer last
                        const withoutFooter = store.homepageSections.filter(s => s.id !== 'footer');
                        const footer = store.homepageSections.find(s => s.id === 'footer') || { id: 'footer', visible: true };
                        const missingNonFooter = missing.filter(s => s.id !== 'footer');
                        sectionConfig = [...withoutFooter, ...missingNonFooter, footer];
                    } else {
                        sectionConfig = DEFAULT_ORDER.map(id => ({ id, visible: true }));
                    }

                    // Filter out topbar (always in WaStoreHeader) and footer (always last)
                    const orderedSections = sectionConfig.filter(s => s.id !== 'topbar' && s.id !== 'footer');

                    return orderedSections.map(({ id, visible }) => {
                        if (visible === false) return null;

                        // ── HERO SLIDER ──────────────────────────────────────
                        if (id === 'hero') {
                            return (
                                <div key="hero" id="section-hero" className="relative group w-[100vw] mb-6 md:mb-10 left-1/2 -translate-x-1/2" onMouseEnter={() => setSliderPaused(true)} onMouseLeave={() => setSliderPaused(false)}>
                                    {slides.length > 0 ? (
                                        <>
                                        <div className={`relative bg-black w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.5/1] overflow-hidden ${theme.heroShape || ''}`}>
                                        {slides.map((slide, idx) => (
                                            <div key={idx} className={`absolute inset-0 ${
                                                idx === 0
                                                    ? (activeSlide === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0 transition-opacity duration-700 ease-in-out')
                                                    : `transition-opacity duration-700 ease-in-out ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`
                                            }`}>
                                                <div className={`absolute inset-0 ${theme.heroOverlay} z-10`} />
                                                {slide.imageUrl?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                                                    <video src={imgUrl(slide.imageUrl)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                                                ) : (
                                                    <img
                                                        src={cdnImg(imgUrl(slide.imageUrl), { width: 800 })}
                                                        srcSet={cdnSrcSet(imgUrl(slide.imageUrl), [480, 800, 1200])}
                                                        sizes={'(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px'}
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
                                                                        navigate(getStoreRoute(slug, `/category/${encodeURIComponent(slide.ctaTargetId)}`));
                                                                    } else if (slide.ctaTargetType === 'product' && slide.ctaTargetId) {
                                                                        const tp = products.find(p => p.id === slide.ctaTargetId);
                                                                        if (tp) navigate(getStoreRoute(slug, `/product/${slugifyProduct(tp)}`));
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
                                        {slides.length > 1 && (
                                            <>
                                                <button onClick={prevSlide} aria-label="Previous slide" className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all">
                                                    <ChevronLeft className="w-6 h-6" />
                                                </button>
                                                <button onClick={nextSlide} aria-label="Next slide" className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all hidden md:flex">
                                                    <ChevronRight className="w-6 h-6" />
                                                </button>
                                            </>
                                        )}
                                        </div>
                                        {slides.length > 1 && (
                                            <div className="flex justify-center gap-1 md:gap-2 mt-3">
                                                {slides.map((_, idx) => (
                                                    <button key={idx} onClick={() => goToSlide(idx)} aria-label={`Go to slide ${idx + 1}`} className="flex items-center justify-center p-2">
                                                        <span className={`h-1.5 rounded-full transition-all block ${idx === activeSlide ? 'w-6 bg-gray-800 dark:bg-gray-200' : 'w-2 bg-gray-300 dark:bg-gray-600'}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        </>
                                    ) : (
                                        <div className={`py-16 px-4 ${theme.header}`}>
                                            <div className="max-w-4xl mx-auto text-center space-y-4">
                                                <h1 className={`text-4xl font-bold tracking-tight ${theme.headerLogo}`}>{store.name}</h1>
                                                {store.description && <p className={`text-lg ${theme.textMuted}`}>{store.description}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // ── SHOPPABLE VIDEOS ────────────────────────────────
                        if (id === 'videos') {
                            if (shoppableVideos.length === 0) return null;
                            return (
                                <div 
                                    key="videos" 
                                    id="section-videos" 
                                    className="mb-8 sm:mb-14"
                                    onMouseEnter={() => setVideosPaused(true)}
                                    onMouseLeave={() => setVideosPaused(false)}
                                    onTouchStart={() => setVideosPaused(true)}
                                    onTouchEnd={() => {
                                        setTimeout(() => setVideosPaused(false), 3500);
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
                                        <h2 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>Shop Through Video</h2>
                                        <span className={`text-[13px] font-semibold ${theme.textMuted} flex items-center gap-0.5 cursor-pointer hover:underline transition-all`}>View All <ChevronRight className="w-4 h-4"/></span>
                                    </div>
                                    <div 
                                        ref={videosScrollRef}
                                        onScroll={handleVideoScroll}
                                        className="flex overflow-x-auto hide-scrollbar gap-3 sm:gap-5 pb-4 snap-x"
                                    >
                                        {shoppableVideos.map((video) => (
                                            <div
                                                key={video.id}
                                                onClick={() => setActiveVideo(video)}
                                                className="relative shrink-0 w-[140px] h-[250px] sm:w-[180px] sm:h-[320px] rounded-2xl overflow-hidden cursor-pointer group snap-start shadow-md border border-black/5 dark:border-white/10"
                                            >
                                                <video 
                                                    src={video.videoUrl} 
                                                    autoPlay 
                                                    muted 
                                                    playsInline 
                                                    onTimeUpdate={(e) => { if (e.target.currentTime >= 5) e.target.currentTime = 0; }}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none" 
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none"></div>
                                                <div className="absolute bottom-3 left-3 pr-3">
                                                    <h3 className="text-white font-bold text-[13px] sm:text-[15px] leading-tight mb-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{video.title}</h3>
                                                    <span className="text-white text-[9px] sm:text-[10px] uppercase font-bold tracking-wider bg-black/30 hover:bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full inline-block border border-white/20 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Shop Now</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Bottom navigation dots */}
                                    {shoppableVideos.length > 1 && (
                                        <div className="flex items-center justify-center gap-1 mt-3 sm:mt-4">
                                            {shoppableVideos.map((_, dotIdx) => (
                                                <button
                                                    key={dotIdx}
                                                    type="button"
                                                    aria-label={`Go to video ${dotIdx + 1}`}
                                                    onClick={() => scrollToVideo(dotIdx)}
                                                    className="p-1.5 focus:outline-none"
                                                >
                                                    <span className={`block rounded-full transition-all duration-300 ${
                                                        activeVideoDot === dotIdx
                                                            ? 'w-6 h-2 bg-slate-900 dark:bg-white shadow-sm'
                                                            : 'w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
                                                    }`} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // ── TRENDING NOW ────────────────────────────────────
                        if (id === 'trending') {
                            if (store.showTrendingNow === false || trendingProducts.length === 0) return null;
                            return (
                                <div key="trending" id="section-trending" className="mb-10 sm:mb-14 w-full">
                                    <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
                                        <h2 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{store.trendingTitle || 'Trending Now'}</h2>
                                        <span
                                            className={`text-[13px] font-semibold ${theme.textMuted} flex items-center gap-0.5 cursor-pointer hover:underline transition-all`}
                                            onClick={() => { document.getElementById('all-products-grid')?.scrollIntoView({ behavior: 'smooth' }); }}
                                        >
                                            Shop All <ArrowRight className="w-4 h-4"/>
                                        </span>
                                    </div>
                                    <div className="flex overflow-x-auto hide-scrollbar gap-4 sm:gap-6 pb-6 snap-x">
                                        {trendingProducts.slice(0, store.trendingLimit || 8).map(product => renderProductCard(product, 'slider'))}
                                    </div>
                                </div>
                            );
                        }

                        // ── CATEGORY BAR ────────────────────────────────────
                        if (id === 'categories') {
                            if (categories.length <= 1) return null;

                            // Apply featuredCategories filter + ordering if set
                            const featured = store.featuredCategories;
                            const visibleCats = (() => {
                                if (featured && featured.length > 0) {
                                    return featured.filter(c => categories.includes(c));
                                }
                                let hidden = [];
                                try { hidden = typeof store.hiddenCategories === 'string' ? JSON.parse(store.hiddenCategories) : (store.hiddenCategories || []); } catch (e) {}
                                return categories.filter(c => c !== 'All' && !hidden.includes(c));
                            })();

                            if (visibleCats.length === 0) return null;

                            const shapeClass = store.categoryDisplayConfig?.shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
                            const mobileCols = store.categoryDisplayConfig?.mobileLayout || 3;
                            const mobileWidthClass = mobileCols === 2 ? 'w-[calc(50%-6px)]' : mobileCols === 4 ? 'w-[calc(25%-9px)]' : 'w-[calc(33.333%-8px)]';

                            return (
                                <div key="categories" id="section-categories" className="mb-4 w-full">
                                    <h2 className={`text-2xl font-bold mb-2 sm:mb-4 text-center ${theme.text}`}>Products Category</h2>
                                    <div ref={categoryScrollRef} className="flex overflow-x-auto hide-scrollbar gap-3 sm:gap-6 pb-6 snap-x">
                                        {visibleCats.map(cat => {
                                            let catImage = null;
                                            try {
                                                const imgs = typeof store.categoryImages === 'string' ? JSON.parse(store.categoryImages) : (store.categoryImages || {});
                                                catImage = imgs[cat];
                                            } catch (e) {}
                                            return (
                                                <button key={cat} onClick={() => navigate(getStoreRoute(slug, `/category/${encodeURIComponent(cat)}`))}
                                                    className={`flex flex-col items-center gap-2 sm:gap-4 shrink-0 group ${mobileWidthClass} md:w-44 md:snap-start`}
                                                >
                                                    <div className={`w-full aspect-square md:w-44 md:h-44 overflow-hidden ${shapeClass} flex items-center justify-center transition-all duration-300 relative border-2 border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800 group-hover:shadow-md`}>
                                                        {catImage ? (
                                                            <img src={cdnImg(imgUrl(catImage), { width: 352, fit: 'cover' })} srcSet={cdnSrcSet(imgUrl(catImage), [192, 352], { fit: 'cover' })} sizes="(max-width: 640px) 96px, 176px" alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 scale-100 group-hover:scale-105" />
                                                        ) : (
                                                            <span className="text-xl sm:text-4xl font-thin text-zinc-400 dark:text-zinc-600">{cat.substring(0, 1)}</span>
                                                        )}
                                                        <div className="absolute inset-0 transition-opacity duration-500 bg-transparent group-hover:bg-black/10"></div>
                                                    </div>
                                                    <span className="text-[11px] sm:text-sm tracking-[0.15em] uppercase text-center font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white">{cat}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <hr className="border-gray-200 dark:border-gray-800 my-4 sm:my-8 w-full max-w-[1200px] mx-auto" />
                                </div>
                            );
                        }

                        // ── COLLECTIONS (category product sliders) ──────────
                        if (id === 'collections') {
                            const collectionCats = store.homepageCollections && store.homepageCollections.length > 0
                                ? store.homepageCollections
                                : []; // if empty, show nothing (user must configure)

                            if (collectionCats.length === 0) return null;

                            return (
                                <div key="collections" id="section-collections" className="mb-12">
                                    {collectionCats.map(cat => {
                                        const allCatProducts = products.filter(p => p.category === cat);
                                        const totalCatCount = allCatProducts.length;
                                        const catProducts = allCatProducts.slice(0, 8);
                                        if (catProducts.length === 0) return null;

                                        // Desktop slider fits ~4 cards in viewport; mobile fits ~2
                                        const showViewAllOnDesktop = totalCatCount > 4;
                                        const showViewAllOnMobile  = totalCatCount > 2;
                                        const showViewAllCard = showViewAllOnMobile || showViewAllOnDesktop;

                                        return (
                                            <div key={cat} className="mb-10 sm:mb-14">
                                                <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
                                                    <h2 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{cat}</h2>
                                                    {showViewAllOnDesktop && (
                                                        <span
                                                            className={`text-[13px] font-semibold ${theme.textMuted} flex items-center gap-0.5 cursor-pointer hover:underline transition-all`}
                                                            onClick={() => navigate(getStoreRoute(slug, `/category/${encodeURIComponent(cat)}`))}
                                                        >
                                                            View All <ChevronRight className="w-4 h-4"/>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex overflow-x-auto hide-scrollbar gap-4 sm:gap-6 pb-6 snap-x">
                                                    {catProducts.map(product => renderProductCard(product, 'slider'))}
                                                    {/* View All card:
                                                        - always visible on mobile  (>2 products, scroll hides them)
                                                        - visible on desktop only   (>4 products, beyond viewport)
                                                        - hidden on desktop         (≤4 products, all cards in view) */}
                                                    {showViewAllCard && (
                                                        <button
                                                            onClick={() => navigate(getStoreRoute(slug, `/category/${encodeURIComponent(cat)}`))}
                                                            className={`shrink-0 snap-start w-[160px] sm:w-[200px] rounded-2xl border-2 border-dashed ${theme.id === 'vogue' ? 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-white' : 'border-gray-200 dark:border-white/20 hover:border-gray-400'} flex flex-col items-center justify-center gap-3 transition-all group ${!showViewAllOnDesktop ? 'md:hidden' : ''}`}
                                                        >
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${theme.buttonStyle}`}>
                                                                <ChevronRight className="w-6 h-6" />
                                                            </div>
                                                            <div className="text-center px-3">
                                                                <p className={`text-sm font-bold ${theme.text}`}>View All</p>
                                                                <p className={`text-xs ${theme.textMuted}`}>{cat}</p>
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                </div>
                            );
                        }

                        // ── ALL PRODUCTS GRID ────────────────────────────────
                        if (id === 'products') {
                            return (
                                <div key="products" id="all-products-grid" className="mb-4 sm:mb-6">
                                    <h2 className={`text-2xl sm:text-3xl font-bold text-center w-full mb-4 sm:mb-6 ${theme.text} ${theme.id === 'amber' ? 'tracking-tight' : ''}`}>All Products</h2>
                                    {/* Filters / Sort */}
                                    <div className="flex items-center justify-between mb-6 sm:mb-8 w-full border-b border-gray-100 dark:border-zinc-800/50 pb-4">
                                        <div className={`text-sm font-medium ${theme.textMuted} hidden sm:block`}>
                                            Showing {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'product' : 'products'}
                                        </div>
                                        <div className="flex items-center gap-2 bg-gray-50/50 hover:bg-gray-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-full px-4 py-2 transition-all cursor-pointer relative group shadow-sm ml-auto">
                                            <Filter className={`w-4 h-4 ${theme.textMuted}`} />
                                            <span className={`text-[11px] font-bold ${theme.textMuted} uppercase tracking-wider hidden sm:block`}>Sort</span>
                                            <select
                                                value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                                                aria-label="Sort products"
                                                className={`bg-transparent text-[13px] font-semibold ${theme.text} outline-none cursor-pointer border-none focus:ring-0 appearance-none pr-5 z-10`}
                                            >
                                                <option value="newest" className="text-gray-900 font-medium">New Arrivals</option>
                                                <option value="oldest" className="text-gray-900 font-medium">Oldest First</option>
                                                <option value="price_asc" className="text-gray-900 font-medium">Price: Low to High</option>
                                                <option value="price_desc" className="text-gray-900 font-medium">Price: High to Low</option>
                                                <option value="name_asc" className="text-gray-900 font-medium">Name A → Z</option>
                                            </select>
                                            <ChevronDown className={`w-4 h-4 ${theme.textMuted} absolute right-3 pointer-events-none`} />
                                        </div>
                                    </div>
                                    {/* Product Grid */}
                                    {filteredAndSortedProducts.length > 0 ? (() => {
                                        const desktopCols = store.productGridConfig?.columns || 4;
                                        const mobileCols = 2; // Fixed to 2 for mobile as requested
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
                                                    {paginatedProducts.map(product => renderProductCard(product, 'grid'))}
                                                </div>
                                                {paginationMode === 'load_more' && hasMoreProducts && (
                                                    <div className="flex justify-center mt-12 w-full">
                                                        <button onClick={() => setCurrentPage(p => p + 1)} className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${theme.buttonStyle} !w-auto mx-auto`}>
                                                            Load More Products <ChevronDown className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                                {paginationMode === 'pagination' && totalPages > 1 && (
                                                    <div className="flex justify-center items-center gap-2 mt-12 overflow-x-auto pb-4">
                                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`p-2 rounded-lg transition-all ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-white/10'} ${theme.text}`}>
                                                            <ChevronLeft className="w-5 h-5" />
                                                        </button>
                                                        {[...Array(totalPages)].map((_, i) => {
                                                            const page = i + 1;
                                                            if (page !== 1 && page !== totalPages && Math.abs(currentPage - page) > 2) {
                                                                if (Math.abs(currentPage - page) === 3) return <span key={page} className={theme.textMuted}>...</span>;
                                                                return null;
                                                            }
                                                            return (
                                                                <button key={page} onClick={() => setCurrentPage(page)} className={`w-10 h-10 rounded-xl font-bold transition-all flex items-center justify-center ${currentPage === page ? theme.buttonStyle : `bg-transparent hover:bg-slate-100 dark:hover:bg-white/10 ${theme.text}`}`}>
                                                                    {page}
                                                                </button>
                                                            );
                                                        })}
                                                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`p-2 rounded-lg transition-all ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-white/10'} ${theme.text}`}>
                                                            <ChevronRight className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })() : (
                                        <div className={`text-center py-24 ${theme.cardStyle} rounded-3xl`}>
                                            <ShoppingBag className={`w-12 h-12 ${theme.textMuted} mx-auto mb-4`} />
                                            <h2 className={`text-lg font-semibold ${theme.text} mb-2`}>No products found</h2>
                                            <p className={`text-sm ${theme.textMuted}`}>No products are available in this store yet.</p>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return null;
                    });
                })()}

            </main>

            {/* ─── CART DRAWER ─── */}
            {/* CSS transitions replace framer-motion — removes vendor-motion from public store critical path */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop — CSS fade */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
                        style={{ animation: 'fadeIn 0.2s ease forwards' }}
                        onClick={() => setIsCartOpen(false)}
                    />

                    {/* Slide-in Drawer — CSS slide from right */}
                    <div
                        className={`w-full max-w-md ${theme?.mobileNavBg || theme?.pageBg} h-full relative z-10 flex flex-col shadow-2xl`}
                        style={{ animation: 'slideInRight 0.3s ease forwards' }}
                    >

                            <div className={`px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between ${theme?.mobileNavBg || theme?.pageBg}`}>
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
                                                <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0 flex items-center justify-center">
                                                    {(() => {
                                                        let rawUrl = null;
                                                        if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) rawUrl = item.imageUrls[0];
                                                        else if (typeof item.imageUrls === 'string') {
                                                            try { const p = JSON.parse(item.imageUrls); if (Array.isArray(p)) rawUrl = p[0]; }
                                                            catch (e) { rawUrl = item.imageUrls; }
                                                        }
                                                        else if (item.imageUrl) rawUrl = item.imageUrl;

                                                        if (!rawUrl) return <ShoppingBag className="w-6 h-6 text-gray-300" />;
                                                        const cleanUrl = imgUrl(encodeURI(rawUrl.replace(/\\/g, '/')));
                                                        return (
                                                            <img 
                                                                src={cleanUrl} 
                                                                alt={item.name} 
                                                                className="w-full h-full object-contain"
                                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                                            />
                                                        );
                                                    })()}
                                                    <ShoppingBag className="w-6 h-6 text-gray-300 hidden" />
                                                </div>
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <h4 className={`font-semibold text-sm ${theme.text} truncate`}>{item.name}</h4>
                                                    {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                                                        <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>
                                                            {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                                        </div>
                                                    )}
                                                    <div className={`font-medium text-sm ${theme.textMuted} mt-1`}>{getCurrencySymbol(store.currency)}{getDisplayPrice(getItemPrice(item), item).toFixed(2)}</div>

                                                    <div className="flex items-center justify-between gap-3 mt-3">
                                                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                                            <button onClick={() => updateQty(item.cartItemId || item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-8 text-center text-xs font-semibold text-gray-900">{item.qty}</span>
                                                            <button onClick={() => updateQty(item.cartItemId || item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                        <div className={`font-bold text-sm ${theme.text}`}>
                                                            {getCurrencySymbol(store.currency)}{(getDisplayPrice(getItemPrice(item), item) * item.qty).toFixed(2)}
                                                        </div>
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
                                    {(flatShippingRate > 0 || shippingCost > 0) && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={theme.textMuted}>Shipping</span>
                                            <span className={`text-lg font-bold ${shippingCost === 0 ? 'text-emerald-500' : theme.text}`}>
                                                {shippingCost === 0 ? 'Free' : `${getCurrencySymbol(store.currency)}${shippingCost.toFixed(2)}`}
                                            </span>
                                        </div>
                                    )}
                                    {store?.taxConfig?.enabled && store.taxConfig.taxInclusive === false && estimatedTax > 0 && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={theme.textMuted}>Estimated Tax</span>
                                            <span className={`text-lg font-bold ${theme.text}`}>{getCurrencySymbol(store.currency)}{estimatedTax.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center mb-6 pt-2 border-t border-black/5 dark:border-white/10">
                                        <span className={theme.textMuted}>Total</span>
                                        <span className={`text-xl font-bold ${theme.text}`}>{getCurrencySymbol(store.currency)}{cartTotal.toFixed(2)}</span>
                                    </div>

                                    {(cartSubtotal + estimatedTax) < minOrderValue ? (
                                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl mb-4 text-sm font-medium">
                                            Minimum order value is {getCurrencySymbol(store.currency)}{minOrderValue}. Add {getCurrencySymbol(store.currency)}{(minOrderValue - (cartSubtotal + estimatedTax)).toFixed(2)} more to checkout.
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setIsCartOpen(false); setIsCheckoutModalOpen(true); }}
                                                className={`w-full py-4 ${theme.id === 'amber' ? 'bg-[#382215] hover:bg-[#25160D] shadow-[#382215]/20' : 'bg-[#25D366] hover:bg-[#128C7E] shadow-green-500/20'} text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2`}
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
                    </div>
                </div>
            )}
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
            {/* ─── SHOPPABLE VIDEO MODAL ─── */}
            {activeVideo && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-0 sm:p-4">
                    <button 
                        onClick={() => setActiveVideo(null)}
                        className="absolute top-4 sm:top-6 right-4 sm:right-6 z-[110] bg-white/10 hover:bg-white/20 p-2 sm:p-3 rounded-full text-white backdrop-blur-lg transition-all"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    
                    <div className="relative w-full h-full sm:h-[85vh] sm:max-w-md bg-black sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10">
                        <video 
                            src={activeVideo.videoUrl} 
                            autoPlay 
                            loop 
                            muted={false} 
                            playsInline 
                            className="w-full h-full object-cover"
                            controls={false}
                        />
                        {/* Overlay Controls */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pt-28 pb-6 sm:pb-8 px-4 sm:px-6">
                            <h2 className="text-white text-xl sm:text-2xl font-bold mb-3">{activeVideo.title}</h2>
                            {activeVideo.product ? (
                                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/20 transition-all border border-white/10"
                                     onClick={() => {
                                        setActiveVideo(null);
                                        navigate(getStoreRoute(slug, `/product/${slugifyProduct(activeVideo.product)}`));
                                     }}
                                >
                                    {activeVideo.product.imageUrls?.[0] ? (
                                        <img src={imgUrl(activeVideo.product.imageUrls[0])} alt="" className="w-14 h-14 object-cover rounded-xl bg-white" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-white" /></div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-semibold text-sm line-clamp-1">{activeVideo.product.name}</h3>
                                        <div className="text-white/80 text-xs font-medium mt-0.5">{getCurrencySymbol(store.currency)}{getDisplayPrice(parseFloat(activeVideo.product.price), activeVideo.product).toFixed(2)}</div>
                                    </div>
                                    <div className="bg-white text-black p-2.5 rounded-full shadow-lg">
                                        <ShoppingBag className="w-4 h-4" />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-white/60 text-sm font-medium text-center border border-white/10">
                                    Product unavailable
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MOBILE NAVIGATION DRAWER ─── */}
            <div id="store-footer">
                <WaStoreFooter store={store} theme={theme} />
            </div>
        </StoreInnerWithAuth>
        </StoreCustomerWrapper>
    );
}
