import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Home, ChevronRight, LayoutGrid, Search, ArrowRight, Folder, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import WaStoreFooter from '../components/WaStoreFooter';
import WaStoreHeader from '../components/WaStoreHeader';
import WaStoreCheckoutModal from '../components/WaStoreCheckoutModal';
import StoreNotFound from '../components/StoreNotFound';
import { getThemeConfig } from '../utils/wastoreThemes';
import { injectFavicon, cleanupStoreSeo } from '../utils/storeSeo';
import { getStoreRoute } from '../utils/storeRouting';
import { StoreCustomerProvider, useStoreCustomer } from '../context/StoreCustomerContext';
import { cdnImg } from '../utils/cdnImage';

function CategoriesPageInner({ store, theme, slug, products, categories, cartCount, setIsCartOpen, children }) {
    const { customer, authConfig } = useStoreCustomer();
    const authEnabled = authConfig?.enabled || store?.customerAuthConfig?.enabled || false;
    return (
        <>
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
            {children}
        </>
    );
}

export default function PublicWaStoreCategories({ customSlug }) {
    const params = useParams();
    const slug = customSlug || params.slug;
    const navigate = useNavigate();

    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem(`wa_cart_${slug}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

    const theme = useMemo(() => getThemeConfig(store?.themeId), [store?.themeId]);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const timestamp = new Date().getTime();
                const query = customSlug ? `?customDomain=${window.location.host}&t=${timestamp}` : `?t=${timestamp}`;
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}${query}`);
                setStore(res.data.store);
                setProducts(res.data.products || []);
            } catch (error) {
                toast.error("Failed to load store categories");
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
        return () => cleanupStoreSeo();
    }, [slug, customSlug]);

    useEffect(() => {
        if (store) {
            document.title = `All Categories | ${store.name}`;
            injectFavicon(store.logo);
        }
    }, [store]);

    const categories = useMemo(() => {
        if (!store) return [];
        const cats = store.categories || [];
        const hidden = store.hiddenCategories || [];
        return cats.filter(c => !hidden.includes(c));
    }, [store]);

    const categoryImages = useMemo(() => {
        if (!store?.categoryImages) return {};
        try {
            return typeof store.categoryImages === 'string' 
                ? JSON.parse(store.categoryImages) 
                : store.categoryImages;
        } catch (e) {
            return {};
        }
    }, [store]);

    const categoryProductCounts = useMemo(() => {
        const map = {};
        products.forEach(p => {
            if (p.category) {
                map[p.category] = (map[p.category] || 0) + 1;
            }
        });
        return map;
    }, [products]);

    // Representative image fallback for a category (from its products) if no category image set
    const categoryFallbacks = useMemo(() => {
        const map = {};
        products.forEach(p => {
            if (p.category && !map[p.category] && p.imageUrls && p.imageUrls.length > 0) {
                map[p.category] = p.imageUrls[0];
            }
        });
        return map;
    }, [products]);

    const filteredCategories = useMemo(() => {
        if (!searchTerm.trim()) return categories;
        return categories.filter(cat => 
            cat.toLowerCase().includes(searchTerm.toLowerCase().trim())
        );
    }, [categories, searchTerm]);

    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
            </div>
        );
    }

    if (!store) return <StoreNotFound slug={slug} />;

    return (
        <StoreCustomerProvider slug={slug}>
            <div className={`flex flex-col min-h-screen overflow-x-hidden w-full ${theme.pageBg} font-sans ${theme.text} selection:bg-black selection:text-white`} style={{ fontFamily: theme.fontFamily }}>
                <CategoriesPageInner 
                    store={store} 
                    theme={theme} 
                    slug={slug} 
                    products={products} 
                    categories={categories} 
                    cartCount={cartCount} 
                    setIsCartOpen={setIsCartOpen}
                >
                    <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1">
                        {/* Breadcrumb */}
                        <nav aria-label="Breadcrumb" className="mb-6">
                            <ol className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm">
                                <li>
                                    <button
                                        onClick={() => navigate(getStoreRoute(slug))}
                                        className="flex items-center gap-1 hover:underline text-gray-500 hover:text-gray-900 transition-colors"
                                    >
                                        <Home className="w-3.5 h-3.5" />
                                        <span>{store.name}</span>
                                    </button>
                                </li>
                                <li className="text-gray-400"><ChevronRight className="w-3.5 h-3.5" /></li>
                                <li>
                                    <span className="font-semibold text-gray-900 dark:text-white">All Categories</span>
                                </li>
                            </ol>
                        </nav>

                        {/* Title & Filter Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-white/10">
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                                    <LayoutGrid className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                                    <span>All Categories</span>
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Explore all {categories.length} product collections available in our store
                                </p>
                            </div>

                            {categories.length > 6 && (
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search categories..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Categories Grid */}
                        {filteredCategories.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                                {filteredCategories.map((cat) => {
                                    const img = categoryImages[cat] || categoryFallbacks[cat];

                                    return (
                                        <div
                                            key={cat}
                                            onClick={() => navigate(getStoreRoute(slug, `/category/${encodeURIComponent(cat)}`))}
                                            className="group cursor-pointer rounded-2xl sm:rounded-3xl bg-white dark:bg-surface-dark border border-gray-200/80 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-500/40 transition-all duration-300 flex flex-col"
                                        >
                                            {/* Category Image */}
                                            <div className="aspect-square w-full bg-gray-50 dark:bg-black/20 overflow-hidden relative flex items-center justify-center">
                                                {img ? (
                                                    <img
                                                        src={cdnImg(img)}
                                                        alt={cat}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Folder className="w-8 h-8" />
                                                    </div>
                                                )}
                                                
                                                {/* Gradient Overlay for subtle text contrast */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                    <span className="text-white text-xs font-bold flex items-center gap-1">
                                                        Explore Collection
                                                        <ArrowRight className="w-3 h-3" />
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Category Info */}
                                            <div className="p-3.5 sm:p-4 flex items-center justify-between">
                                                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {cat}
                                                </h3>
                                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-16 px-4 bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/10 max-w-md mx-auto">
                                <Folder className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">No categories found</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {searchTerm ? `No category matching "${searchTerm}"` : 'No categories are currently available in this store.'}
                                </p>
                            </div>
                        )}
                    </main>

                    <WaStoreFooter store={store} />
                </CategoriesPageInner>
            </div>
        </StoreCustomerProvider>
    );
}
