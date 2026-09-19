import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, ArrowLeft, Home, SearchX } from 'lucide-react';
import DOMPurify from 'dompurify';
import { motion } from 'framer-motion';
import { getStoreRoute } from '../utils/storeRouting';

import WaStoreFooter from '../components/WaStoreFooter';
import WaStoreHeader from '../components/WaStoreHeader';
import StoreNotFound from '../components/StoreNotFound';
import WaStoreContactUs from '../components/WaStoreContactUs';
import { getThemeConfig } from '../utils/wastoreThemes';
import { injectFavicon, cleanupStoreSeo } from '../utils/storeSeo';
import { StoreCustomerProvider, useStoreCustomer } from '../context/StoreCustomerContext';

function StoreCustomerWrapper({ slug, store, children }) {
    return (
        <StoreCustomerProvider slug={slug}>
            <StoreCustomerHeaderBridge store={store} slug={slug}>
                {children}
            </StoreCustomerHeaderBridge>
        </StoreCustomerProvider>
    );
}

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
        { style: { top: '7%',  left: '3.5%',  animationDuration: '4.2s', animationDelay: '0s'   }, size: 14, drift: false },
        { style: { top: '19%', right: '3%',   animationDuration: '5.5s', animationDelay: '1.3s' }, size: 9,  drift: true  },
        { style: { top: '52%', left: '2%',    animationDuration: '3.9s', animationDelay: '2.1s' }, size: 11, drift: false },
        { style: { top: '68%', right: '4.5%', animationDuration: '4.8s', animationDelay: '0.6s' }, size: 7,  drift: true  },
        { style: { top: '86%', left: '8%',    animationDuration: '5.2s', animationDelay: '1.9s' }, size: 10, drift: false },
        { style: { top: '37%', right: '2.5%', animationDuration: '3.6s', animationDelay: '3.1s' }, size: 6,  drift: true  },
        { style: { top: '13%', right: '16%',  animationDuration: '6.1s', animationDelay: '0.9s' }, size: 5,  drift: false },
        { style: { top: '91%', right: '11%',  animationDuration: '4.6s', animationDelay: '2.6s' }, size: 9,  drift: true  },
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

function PageInnerWithAuth({ store, theme, slug, products, categories, cartCount, setIsCartOpen, isContactPage, children }) {
    const { customer, authConfig } = useStoreCustomer();
    const authEnabled = authConfig?.enabled || store?.customerAuthConfig?.enabled || false;
    const isDarkTheme = theme?.pageBg?.includes('900') || theme?.pageBg?.includes('950') || theme?.pageBg?.includes('black') || theme?.pageBg?.includes('zinc');

    return (
        <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white ${isDarkTheme ? 'dark' : ''}`} style={{ fontFamily: theme.fontFamily, ...(theme.bgPatternStyle || {}) }}>
            {theme.sparkleEffect && <JewelrySparkles />}
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
            <main className={`flex-1 w-full mx-auto px-4 ${isContactPage ? 'max-w-5xl py-8 md:py-12' : 'max-w-4xl py-10 md:py-16'}`}>
                {children}
            </main>
            <WaStoreFooter store={store} theme={theme} />
        </div>
    );
}

export default function PublicWaStorePage({ customSlug, customPageType }) {
    const params = useParams();
    const navigate = useNavigate();
    const slug = customSlug || params.slug;
    const pageType = customPageType || params.pageType?.toLowerCase();
    
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Dummy values since this page doesn't directly show products in the main content,
    // but the header requires them for the search/cart UI to work.
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem(`wa_cart_${slug}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const count = parsed.reduce((sum, item) => sum + (item.qty || 1), 0);
                setCartCount(count);
            } catch (e) {}
        }
    }, [slug]);

    useEffect(() => {
        const fetchStoreData = async () => {
            try {
                // If custom domain, backend expects custom host query, else slug
                const query = customSlug ? `?customDomain=${window.location.host}` : '';
                const storeRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}${query}`);
                
                if (storeRes.data && storeRes.data.store) {
                    setStore(storeRes.data.store);
                } else {
                    setStore(false);
                }
            } catch (error) {
                console.error("Failed to load store for page view");
                setStore(false); // Indicates 404
            } finally {
                setLoading(false);
            }
        };

        if (slug) fetchStoreData();
        
        return () => cleanupStoreSeo();
    }, [slug, customSlug]);

    const theme = useMemo(() => {
        if (!store) return getThemeConfig('vogue');
        return getThemeConfig(store.themeId, store.themeCustomizations);
    }, [store]);

    const { title, content, isContactPage } = useMemo(() => {
        if (!store) return { title: '', content: '', isContactPage: false };
        let t = "Page Not Found";
        let c = "<p>The requested page does not exist.</p>";
        let isContact = false;

        switch (pageType) {
            case "terms-and-conditions":
                t = "Terms & Conditions";
                c = store.termsConditions;
                break;
            case "privacy-policy":
                t = "Privacy Policy";
                c = store.privacyPolicy;
                break;
            case "return-policy":
                t = "Return & Refund Policy";
                c = store.returnPolicy;
                break;
            case "shipping-policy":
                t = "Shipping Policy";
                c = store.shippingPolicy;
                break;
            case "about-us":
                t = "About Us";
                c = store.aboutUs;
                break;
            case "contact-us":
                t = "Contact Us";
                isContact = true;
                break;
            default:
                if (store.customPages && Array.isArray(store.customPages)) {
                    const customPage = store.customPages.find(p => p.slug === pageType);
                    if (customPage) {
                        t = customPage.title || 'Page';
                        c = customPage.content || '';
                    }
                }
                break;
        }

        if (!isContact && !c) {
            c = "<p>This page has not been configured yet.</p>";
        }

        return { title: t, content: c, isContactPage: isContact };
    }, [store, pageType]);

    useEffect(() => {
        if (store && title) {
            document.title = `${title} | ${store.name}`;
            injectFavicon(store.logo);
        }
    }, [store, title]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-[#F9F6F3]">
                {/* Skeleton Header */}
                <div className="w-full h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-40">
                    <div className="h-5 w-28 rounded-md bg-gray-200 animate-pulse" />
                    <div className="flex-1" />
                    <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                </div>
                <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 md:py-16">
                    {/* Page title */}
                    <div className="h-9 w-56 bg-gray-200 rounded-lg animate-pulse mb-8 pb-6 border-b border-gray-100" />
                    {/* Content lines */}
                    <div className="flex flex-col gap-3">
                        {[100, 95, 88, 75, 100, 92, 80, 60, 100, 96, 83].map((w, i) => (
                            <div key={i} className="h-3.5 bg-gray-200 rounded animate-pulse" style={{width:`${w}%`, animationDelay:`${i*0.04}s`}} />
                        ))}
                        <div className="mt-4" />
                        {[100, 90, 85, 70, 95, 78].map((w, i) => (
                            <div key={i+11} className="h-3.5 bg-gray-200 rounded animate-pulse" style={{width:`${w}%`, animationDelay:`${(i+11)*0.04}s`}} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }


    if (store === false || !store) {
        return <StoreNotFound />;
    }

    return (
        <StoreCustomerWrapper slug={slug} store={store}>
            <PageInnerWithAuth 
                store={store} 
                theme={theme} 
                slug={slug} 
                products={[]} 
                categories={store.categories || []}
                cartCount={cartCount}
                setIsCartOpen={setIsCartOpen}
                isContactPage={isContactPage}
            >
                {pageType === '404' ? (
                    <div className="w-full bg-white dark:bg-surface-dark px-4 sm:px-6 md:px-8 lg:px-12 py-16 md:py-24 flex flex-col items-center justify-center text-center">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="w-24 h-24 mb-6 rounded-3xl flex items-center justify-center"
                            style={{ background: `${theme.text}10`, color: theme.text }}
                        >
                            <SearchX size={48} strokeWidth={1.5} />
                        </motion.div>
                        <motion.h1 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className={`text-3xl md:text-5xl font-black mb-4 tracking-tight ${theme.text}`}
                        >
                            404
                        </motion.h1>
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.15 }}
                            className={`text-xl md:text-2xl font-bold mb-3 ${theme.text}`}
                        >
                            Page Not Found
                        </motion.h2>
                        <motion.p 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className={`max-w-md mx-auto mb-10 text-sm md:text-base ${theme.textMuted}`}
                        >
                            The page you're looking for doesn't exist or has been moved.
                        </motion.p>
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.25 }}
                            className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
                        >
                            <button 
                                onClick={() => navigate(-1)}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-colors text-sm"
                                style={{ borderColor: `${theme.text}30`, color: theme.text }}
                            >
                                <ArrowLeft size={16} /> Go Back
                            </button>
                            <button 
                                onClick={() => navigate(getStoreRoute(slug))}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-opacity hover:opacity-90 text-sm"
                                style={{ background: theme.text, color: theme.pageBg }}
                            >
                                <Home size={16} /> Store Home
                            </button>
                        </motion.div>
                    </div>
                ) : isContactPage ? (
                    <WaStoreContactUs store={store} theme={theme} />
                ) : (
                    <div className="w-full bg-white dark:bg-surface-dark px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
                        <div className="max-w-4xl mx-auto">
                            <h1 className={`text-2xl md:text-4xl font-bold mb-8 ${theme.text} pb-6 border-b border-gray-100 dark:border-white/10`}>
                                {title}
                            </h1>
                            <div 
                                className={`prose prose-sm sm:prose-base dark:prose-invert max-w-none ${theme.text} leading-relaxed break-words overflow-x-auto`}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} 
                            />
                        </div>
                    </div>
                )}
            </PageInnerWithAuth>
        </StoreCustomerWrapper>
    );
}
