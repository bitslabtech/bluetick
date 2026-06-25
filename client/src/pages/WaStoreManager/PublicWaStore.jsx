import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShoppingCart, X, Plus, Minus, Search, ArrowRight, MapPin, Mail, Phone, MessageCircle, ChevronLeft, ChevronRight, Filter, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import StoreNotFound from '../../components/StoreNotFound';

const API_BASE = `${import.meta.env.VITE_API_URL}`;
const imgUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function PublicWaStore() {
    const { slug } = useParams();
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    
    // Search, Filter, Sort
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Hero Slider
    const [activeSlide, setActiveSlide] = useState(0);
    const [sliderPaused, setSliderPaused] = useState(false);
    const sliderTimer = useRef(null);

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
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}`);
                setStore(res.data.store);
                setProducts(res.data.products);
                document.title = `${res.data.store.name} | Store`;
            } catch (error) {
                toast.error("Failed to load store");
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [slug]);

    const categories = useMemo(() => {
        const fromProducts = products.map(p => p.category).filter(Boolean);
        const adminCats = Array.isArray(store?.categories) ? store.categories : [];
        const merged = [...new Set([...adminCats, ...fromProducts])];
        return ['All', ...merged];
    }, [products, store]);

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
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + qty } : item);
            }
            return [...prev, { ...product, qty }];
        });
        toast.success(`Added ${product.name} to cart`);
        if (selectedProduct) setSelectedProduct(null);
    };

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.qty + delta;
                return newQty > 0 ? { ...item, qty: newQty } : item;
            }
            return item;
        }));
    };

    const getItemPrice = (item) => {
        if (item.minWholesaleQty && item.wholesalePrice && item.qty >= parseInt(item.minWholesaleQty)) {
            return parseFloat(item.wholesalePrice);
        }
        return parseFloat(item.price);
    };

    const cartTotal = cart.reduce((sum, item) => sum + (getItemPrice(item) * item.qty), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

    // Cross-sells: products from the same category, excluding the currently viewed product
    const crossSellProducts = useMemo(() => {
        if (!selectedProduct || !store?.showCrossSells) return [];
        return products
            .filter(p => p.id !== selectedProduct.id && p.category && p.category === selectedProduct.category)
            .slice(0, 8);
    }, [selectedProduct, products, store?.showCrossSells]);

    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
        return symbols[code] || code;
    };

    const handleWhatsAppCheckout = async (customerDetails = {}) => {
        if (cart.length === 0) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/orders`, {
                storeId: store.id,
                customerName: customerDetails.name || '',
                customerPhone: customerDetails.phone || '',
                customerNote: customerDetails.note || '',
                items: cart.map(item => ({
                    id: item.id, name: item.name, price: getItemPrice(item), qty: item.qty, imageUrls: item.imageUrls
                })),
                subtotal: cartTotal,
                currency: store.currency
            });
        } catch (e) { console.warn('Order recording failed:', e.message); }

        let message = `🛒 *New Order from ${store.name}*\n\n`;
        if (customerDetails.name) message += `👤 *Customer:* ${customerDetails.name}\n`;
        if (customerDetails.phone) message += `📱 *Phone:* ${customerDetails.phone}\n`;
        message += '\n';
        cart.forEach((item, i) => {
            const finalPrice = getItemPrice(item);
            message += `${i+1}. ${item.name}\n   ${item.qty} x ${getCurrencySymbol(store.currency)} ${finalPrice.toFixed(2)}\n`;
        });
        message += `\n*Total:* ${getCurrencySymbol(store.currency)} ${cartTotal.toFixed(2)}\n\n`;
        if (customerDetails.note) message += `📝 *Note:* ${customerDetails.note}\n\n`;
        message += `_Please confirm my order. Thank you!_`;

        const encodedMsg = encodeURIComponent(message);
        const phone = store.whatsappNumber.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
        setCart([]);
        setIsCartOpen(false);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" /></div>;
    if (!store) return <StoreNotFound slug={slug} />;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-black selection:text-white pb-24" style={{ scrollbarGutter: 'stable' }}>
            
            {/* ─── MODERN HEADER ─── */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    {/* Logo & Store Name */}
                    <div className="flex items-center gap-3">
                        {store.logo && (
                            <img src={imgUrl(store.logo)} alt={store.name} className="w-10 h-10 object-contain rounded-md" onError={e => e.target.style.display = 'none'} />
                        )}
                        <span className="font-semibold text-xl tracking-tight text-black">{store.name}</span>
                    </div>

                    {/* Desktop Search */}
                    <div className="hidden md:flex flex-1 max-w-md mx-8 relative group">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search products..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100/50 hover:bg-gray-100 focus:bg-gray-100 border-none rounded-full py-2.5 pl-11 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-black/5"
                        />
                    </div>

                    {/* Cart Button */}
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
                    >
                        <ShoppingCart className="w-6 h-6 text-black stroke-[1.5]" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* ─── HERO SLIDER ─── */}
            {slides.length > 0 ? (
                <div className="relative w-full bg-white h-[60vh] min-h-[400px] overflow-hidden group" onMouseEnter={() => setSliderPaused(true)} onMouseLeave={() => setSliderPaused(false)}>
                    {slides.map((slide, idx) => (
                        <div key={idx} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            <div className="absolute inset-0 bg-black/20 z-10" />
                            <img src={imgUrl(slide.imageUrl)} alt={slide.title} className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
                                <div className="max-w-3xl space-y-4">
                                    {slide.title && <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg">{slide.title}</h1>}
                                    {slide.subtitle && <p className="text-lg md:text-2xl text-gray-100 font-medium drop-shadow-md">{slide.subtitle}</p>}
                                    {slide.ctaText && (
                                        <button onClick={() => document.getElementById('products').scrollIntoView({behavior: 'smooth'})} className="mt-4 px-4 md:px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors">
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
                <div className="bg-white border-b border-gray-200 py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{store.name}</h1>
                        {store.description && <p className="text-lg text-gray-500">{store.description}</p>}
                    </div>
                </div>
            )}

            {/* ─── CONTACT STRIP ─── */}
            <div className="bg-white border-b border-gray-200 py-4">
                <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-6 text-sm text-gray-600 font-medium">
                    {store.whatsappNumber && (
                        <a href={`https://wa.me/${store.whatsappNumber.replace(/[^0-9]/g, '')}`} className="flex items-center gap-2 hover:text-black transition-colors"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                    )}
                    {store.phone && <a href={`tel:${store.phone}`} className="flex items-center gap-2 hover:text-black transition-colors"><Phone className="w-4 h-4" /> {store.phone}</a>}
                    {store.email && <a href={`mailto:${store.email}`} className="flex items-center gap-2 hover:text-black transition-colors"><Mail className="w-4 h-4" /> {store.email}</a>}
                </div>
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <main id="products" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                
                {/* Categories & Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    {/* Categories Scrollable */}
                    <div className="flex-1 overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                        <div className="flex gap-2 min-w-max">
                            {categories.map(cat => (
                                <button 
                                    key={cat} onClick={() => setSelectedCategory(cat)}
                                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                                        selectedCategory === cat 
                                        ? 'bg-black text-white' 
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    
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
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-black transition-colors"
                    />
                </div>

                {/* Product Grid */}
                {filteredAndSortedProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                        {filteredAndSortedProducts.map(product => {
                            const cartItem = cart.find(item => item.id === product.id);
                            const qtyInCart = cartItem ? cartItem.qty : 0;

                            return (
                            <div key={product.id} className="group cursor-pointer flex flex-col justify-between h-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow" onClick={() => setSelectedProduct(product)}>
                                <div>
                                    {/* Image Box */}
                                    <div className="relative aspect-[4/5] bg-gray-50 rounded-xl overflow-hidden border border-gray-100 mb-4">
                                        {product.imageUrls && product.imageUrls[0] ? (
                                            <img src={imgUrl(product.imageUrls[0])} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => e.target.style.display = 'none'} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-50"><ShoppingBag className="w-8 h-8 text-gray-300" /></div>
                                        )}
                                        {product.oldPrice && (
                                            <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wide">
                                                Sale
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex flex-col flex-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-1.5 block">
                                            {product.category || '\u00A0'}
                                        </span>
                                        <h3 className="text-[15px] font-semibold text-gray-900 mb-2 line-clamp-2 h-10 leading-snug hover:text-neutral-700 transition-colors">{product.name}</h3>
                                        
                                        <div className="flex items-baseline flex-wrap gap-2 mb-5">
                                            <span className="text-lg font-bold text-black">{getCurrencySymbol(store.currency)}{parseFloat(product.price).toFixed(2)}</span>
                                            {product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price) && (
                                                <>
                                                    <span className="text-sm text-gray-400 line-through font-normal">
                                                        {getCurrencySymbol(store.currency)}{parseFloat(product.oldPrice).toFixed(2)}
                                                    </span>
                                                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100/50">
                                                        {Math.round(((parseFloat(product.oldPrice) - parseFloat(product.price)) / parseFloat(product.oldPrice)) * 100)}% OFF
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                                  {/* Actions */}
                                <div className="mt-4">
                                    <div className="flex items-center w-full h-[42px] gap-0 relative">
                                        {/* Quantity Selector Slider */}
                                        <div className={`flex items-center justify-between border border-gray-200 rounded-[15px] p-1 bg-gray-50 h-full transition-all duration-300 overflow-hidden ${
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
                                                } else {
                                                    addToCart(product);
                                                }
                                            }}
                                            className={`h-full transition-all duration-300 flex items-center justify-center gap-1.5 uppercase tracking-widest text-[9.5px] font-bold rounded-[15px] select-none ${
                                                qtyInCart > 0 
                                                ? 'w-[55%] bg-black text-white hover:bg-neutral-800 shadow-sm' 
                                                : 'flex-1 w-full bg-white text-black border border-black hover:bg-black hover:text-white'
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
                                                    <span>Add to Cart</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">No products found</h2>
                        <p className="text-gray-500 text-sm">Try adjusting your filters or search query.</p>
                        <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="mt-6 px-4 md:px-6 py-2 bg-black text-white text-sm font-medium rounded-full">Clear Filters</button>
                    </div>
                )}
            </main>

            {/* ─── PRODUCT MODAL ─── */}
            {selectedProduct && (
                <>
                    {console.log('DEBUG selectedProduct:', selectedProduct)}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
                    <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh]">
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                        
                        <div className="md:w-1/2 bg-gray-50 relative">
                            {selectedProduct.imageUrls && selectedProduct.imageUrls[0] ? (
                                <img src={imgUrl(selectedProduct.imageUrls[0])} alt={selectedProduct.name} className="w-full h-full object-cover min-h-[300px]" onError={e => e.target.style.display = 'none'} />
                            ) : (
                                <div className="w-full h-full min-h-[300px] flex items-center justify-center"><ShoppingBag className="w-16 h-16 text-gray-200" /></div>
                            )}
                        </div>
                        
                        <div className="md:w-1/2 p-8 md:p-4 md:p-10 flex flex-col overflow-y-auto">
                            {selectedProduct.category && <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{selectedProduct.category}</span>}
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">{selectedProduct.name}</h2>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl font-semibold text-black">{getCurrencySymbol(store.currency)}{parseFloat(selectedProduct.price).toFixed(2)}</span>
                                {selectedProduct.oldPrice && <span className="text-lg text-gray-400 line-through">{getCurrencySymbol(store.currency)}{parseFloat(selectedProduct.oldPrice).toFixed(2)}</span>}
                            </div>
                            {selectedProduct.wholesalePrice && selectedProduct.minWholesaleQty && (
                                <div className="mb-6 pb-6 border-b border-gray-100">
                                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-bold rounded-full">
                                        Wholesale: {getCurrencySymbol(store.currency)}{parseFloat(selectedProduct.wholesalePrice).toFixed(2)} (Min Qty: {selectedProduct.minWholesaleQty})
                                    </span>
                                </div>
                            )}
                            {(!selectedProduct.wholesalePrice || !selectedProduct.minWholesaleQty) && (
                                <div className="mb-6 pb-6 border-b border-gray-100" />
                            )}
                            
                            <div className="prose prose-sm text-gray-500 mb-8 flex-1">
                                <p>{selectedProduct.description || 'No description available.'}</p>
                            </div>
                            
                            <button onClick={() => addToCart(selectedProduct)} className="w-full py-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                <ShoppingBag className="w-5 h-5" /> Add to Cart
                            </button>

                            {/* ─── CROSS-SELLS ─── */}
                            {crossSellProducts.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">You May Also Like</h4>
                                    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                                        {crossSellProducts.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => setSelectedProduct(p)}
                                                className="shrink-0 w-28 cursor-pointer group/cs"
                                            >
                                                <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100 mb-2">
                                                    {p.imageUrls && p.imageUrls[0] ? (
                                                        <img
                                                            src={imgUrl(p.imageUrls[0])}
                                                            alt={p.name}
                                                            className="w-full h-full object-cover group-hover/cs:scale-105 transition-transform duration-300"
                                                            onError={e => e.target.style.display = 'none'}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-gray-200" /></div>
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug mb-0.5 group-hover/cs:text-black">{p.name}</p>
                                                <p className="text-xs font-bold text-black">{getCurrencySymbol(store.currency)}{parseFloat(p.price).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </>
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
                            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
                            className="w-full max-w-md bg-white h-full relative z-10 flex flex-col shadow-2xl"
                        >
                            
                            <div className="px-4 md:px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                                <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                                    <ShoppingBag className="w-5 h-5" /> Your Cart
                                </h2>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><X className="w-5 h-5" /></button>
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
                                            <div key={item.id} className="flex gap-4 items-start">
                                                <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                                    {item.imageUrls && item.imageUrls[0] && (
                                                        <img src={imgUrl(item.imageUrls[0])} alt={item.name} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <h4 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h4>
                                                    <div className="font-medium text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                                                        {item.wholesalePrice && item.minWholesaleQty && item.qty >= parseInt(item.minWholesaleQty) ? (
                                                            <>
                                                                <span className="line-through opacity-60 text-xs">{getCurrencySymbol(store.currency)}{parseFloat(item.price).toFixed(2)}</span>
                                                                <span className="text-emerald-600 font-bold">{getCurrencySymbol(store.currency)}{getItemPrice(item).toFixed(2)}</span>
                                                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Wholesale Rate Applied</span>
                                                            </>
                                                        ) : (
                                                            <span>{getCurrencySymbol(store.currency)}{getItemPrice(item).toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                                            <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-8 text-center text-xs font-semibold text-gray-900">{item.qty}</span>
                                                            <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-4 md:p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] max-w-full">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="text-xl font-bold text-gray-900">{getCurrencySymbol(store.currency)}{cartTotal.toFixed(2)}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleWhatsAppCheckout()}
                                        className="w-full py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle className="w-5 h-5" /> Checkout on WhatsApp
                                    </button>
                                    <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                                        <Check className="w-3 h-3" /> Secure checkout via WhatsApp
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
        </div>
    );
}
