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

function PageInnerWithAuth({ store, theme, slug, products, categories, cartCount, setIsCartOpen, isContactPage, children }) {
    const { customer, authConfig } = useStoreCustomer();
    const authEnabled = authConfig?.enabled || store?.customerAuthConfig?.enabled || false;
    return (
        <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white`} style={{ fontFamily: theme.fontFamily }}>
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
            <WaStoreFooter store={store} />
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
            <div className={`flex items-center justify-center min-h-screen ${theme.pageBg}`}>
                <Loader2 className={`w-8 h-8 animate-spin ${theme.text}`} />
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
