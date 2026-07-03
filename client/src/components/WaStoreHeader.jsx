import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, ShoppingBag, Home, Tag, ChevronDown, ChevronUp, FileText, Phone, Mail, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WaStoreMobileBottomMenu from './WaStoreMobileBottomMenu';
import { cdnImg } from '../utils/cdnImage';

// Helper to slugify product names for URLs
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

export default function WaStoreHeader({
    store,
    theme,
    slug,
    products = [],
    categories = [],
    cartCount = 0,
    setIsCartOpen,
}) {
    const navigate = useNavigate();

    // Local state for header interactions
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedMobileSections, setExpandedMobileSections] = useState({ categories: true, policies: false, contact: false });
    const [activePolicy, setActivePolicy] = useState(null); // 'privacy', 'terms', 'return'

    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
        return symbols[code] || code;
    };

    const renderSearchResults = () => {
        const results = products.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
        ).slice(0, 6);

        if (results.length === 0) {
            return (
                <div className="p-6 text-center text-gray-500">
                    No products found for "{searchQuery}"
                </div>
            );
        }

        return (
            <ul className="flex flex-col">
                {results.map(product => (
                    <li key={product.id}>
                        <button 
                            onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                                navigate(`/store/${slug}/product/${slugifyProduct(product.name, product.id)}`);
                            }}
                            className="w-full flex items-center gap-4 p-3 sm:p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                        >
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                {product.imageUrls && product.imageUrls[0] ? (
                                    <img src={imgUrl(product.imageUrls[0])} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ShoppingBag className="w-5 h-5 text-gray-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-gray-900 truncate">{product.name}</h4>
                                <p className="text-xs text-gray-500 truncate">{product.category || 'Uncategorized'}</p>
                            </div>
                            <div className="font-medium text-sm text-gray-900 shrink-0">
                                {getCurrencySymbol(store.currency)}{parseFloat(product.price).toFixed(2)}
                            </div>
                        </button>
                    </li>
                ))}
                <li className="bg-gray-50 p-3 text-center border-t border-gray-100">
                    <button 
                        onClick={() => {
                            setIsSearchOpen(false);
                            navigate(`/store/${slug}`);
                            setTimeout(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        View all search results
                    </button>
                </li>
            </ul>
        );
    };

    return (
        <>
            <header className={`sticky top-0 z-50 ${theme.header}`}>
                {theme.id === 'vogue' ? (
                    /* ── VOGUE: Minimal 3-column ── Hamburger | Logo | Search+Cart */
                    <div className="max-w-[1440px] mx-auto px-4 sm:px-10 h-20 grid grid-cols-3 items-center">
                        {/* LEFT – Hamburger on mobile, Search on desktop */}
                        <div className="flex items-center justify-start gap-2 relative">
                            <button 
                                aria-label="Open menu"
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden p-2 -ml-2 text-black hover:bg-black/5 rounded-lg transition-colors"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            {/* Desktop Search */}
                            <div className="hidden md:block w-full max-w-[280px] relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search products..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-black py-2 pl-9 pr-8 rounded-full outline-none focus:border-black transition-colors text-sm"
                                />
                                {searchQuery && (
                                    <button 
                                        aria-label="Clear search"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                {/* Results */}
                                {searchQuery.trim().length > 0 && (
                                    <div className="absolute left-0 w-[150%] top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
                                        {renderSearchResults()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CENTER – Logo or store name */}
                        <div className="flex items-center justify-center cursor-pointer" onClick={() => navigate(`/store/${slug}`)}>
                            {store.logo ? (
                                // Logo: ~134px display → serve 180w standard / 268w retina
                                <img
                                    src={cdnImg(imgUrl(store.logo), { width: 268 })}
                                    srcSet={`${cdnImg(imgUrl(store.logo), { width: 180 })} 180w, ${cdnImg(imgUrl(store.logo), { width: 268 })} 268w`}
                                    sizes="(max-width: 640px) 180px, 268px"
                                    alt={store.name}
                                    className="h-12 max-w-[180px] object-contain"
                                    onError={e => e.target.style.display = 'none'}
                                />
                            ) : (
                                <span className="text-xl tracking-[0.25em] uppercase text-black font-normal" style={{ fontFamily: theme.fontFamily }}>{store.name}</span>
                            )}
                        </div>

                        {/* RIGHT – Search(mobile) and Cart */}
                        <div className="flex items-center justify-end gap-2">
                            <button 
                                aria-label="Toggle search"
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className="md:hidden p-2 text-black hover:bg-black/5 rounded-full transition-colors flex items-center justify-center"
                            >
                                <Search className="w-5 h-5 stroke-[1.5]" />
                            </button>
                            <button
                                aria-label="View cart"
                                onClick={() => setIsCartOpen(true)}
                                className="relative flex items-center justify-center p-2 text-black hover:bg-black/5 rounded-full transition-colors group"
                            >
                                <span className="sr-only">View cart</span>
                                <ShoppingCart aria-hidden="true" className="w-5 h-5 text-black group-hover:scale-105 transition-transform stroke-[1.5]" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full border border-white">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                ) : theme.id === 'glow' ? (
                    /* ── GLOW: Single Row Header ── Logo | Menu | Search+Cart */
                    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between md:gap-6 relative">
                        {/* LEFT: Mobile Menu Button (hidden on desktop) */}
                        <div className="flex items-center shrink-0 w-1/3 md:w-auto md:hidden">
                            <button 
                                aria-label="Open menu"
                                onClick={() => setIsMobileMenuOpen(true)}
                                className={`p-2 -ml-2 rounded-lg ${theme.textMuted} hover:${theme.text} transition-colors mr-2`}
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>

                        {/* MIDDLE/LEFT: Logo (Centered on mobile, Left on desktop) */}
                        <div className="flex items-center justify-center md:justify-start shrink-0 w-1/3 md:w-auto">
                            {store.logo ? (
                                // Logo: ~134px display → serve 180w standard / 268w retina
                                <img
                                    src={cdnImg(imgUrl(store.logo), { width: 268 })}
                                    srcSet={`${cdnImg(imgUrl(store.logo), { width: 180 })} 180w, ${cdnImg(imgUrl(store.logo), { width: 268 })} 268w`}
                                    sizes="(max-width: 640px) 180px, 268px"
                                    alt={store.name}
                                    className="w-auto h-10 md:h-12 object-contain cursor-pointer"
                                    onClick={() => navigate(`/store/${slug}`)}
                                    onError={e => e.target.style.display = 'none'}
                                />
                            ) : (
                                <span className={`font-semibold text-lg md:text-xl tracking-tight cursor-pointer ${theme.headerLogo}`} onClick={() => navigate(`/store/${slug}`)}>{store.name}</span>
                            )}
                        </div>

                        {/* MIDDLE: Desktop Mega Menu */}
                        <div className="hidden md:flex flex-1 justify-center">
                            {store.megaMenu && store.megaMenu.length > 0 && (
                                <ul className="flex items-center space-x-8">
                                    {store.megaMenu.map((menuItem) => (
                                        <li key={menuItem.id} className="relative group">
                                            <a 
                                                href={menuItem.link || '#'} 
                                                onClick={(e) => {
                                                    if (!menuItem.link) e.preventDefault();
                                                    else if (menuItem.link.startsWith('/?cat=')) {
                                                        e.preventDefault();
                                                        navigate(`/store/${slug}/category/${encodeURIComponent(menuItem.link.split('=')[1])}`);
                                                    } else if (menuItem.link.startsWith('/')) {
                                                        e.preventDefault();
                                                        navigate(menuItem.link);
                                                    }
                                                }}
                                                className="flex items-center text-[13px] font-bold tracking-[0.1em] hover:opacity-70 transition-opacity uppercase"
                                            >
                                                {menuItem.title}
                                                {menuItem.children && menuItem.children.length > 0 && (
                                                    <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-50 transition-transform group-hover:rotate-180" />
                                                )}
                                            </a>
                                            {/* Dropdown */}
                                            {menuItem.children && menuItem.children.length > 0 && (
                                                <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl rounded-xl py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top translate-y-2 group-hover:translate-y-0 z-50">
                                                    <ul className="flex flex-col">
                                                        {menuItem.children.map(child => (
                                                            <li key={child.id}>
                                                                <a 
                                                                    href={child.link || '#'}
                                                                    onClick={(e) => {
                                                                        if (!child.link) e.preventDefault();
                                                                        else if (child.link.startsWith('/?cat=')) {
                                                                            e.preventDefault();
                                                                            navigate(`/store/${slug}/category/${encodeURIComponent(child.link.split('=')[1])}`);
                                                                        } else if (child.link.startsWith('/')) {
                                                                            e.preventDefault();
                                                                            navigate(child.link);
                                                                        }
                                                                    }}
                                                                    className="block px-5 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                            )}
                        </div>

                        {/* RIGHT: Search Bar & Cart */}
                        <div className="flex items-center justify-end gap-2 md:gap-4 shrink-0 w-1/3 md:w-auto">
                            {/* Mobile Search Icon */}
                            <button 
                                aria-label="Toggle search"
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className={`md:hidden p-2 rounded-full transition-colors ${theme.textMuted} hover:${theme.text} flex items-center justify-center`}
                            >
                                <Search className="w-6 h-6 stroke-[1.5]" />
                            </button>
                            
                            {/* Desktop Search */}
                            <div className="hidden md:block w-48 lg:w-64 relative">
                                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted || 'text-gray-400'}`} />
                                <input 
                                    type="text" 
                                    placeholder="Search products..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 focus:border-gray-300 dark:focus:border-white/20 text-current py-2 pl-9 pr-8 rounded-full outline-none transition-colors text-sm"
                                />
                                {searchQuery && (
                                    <button 
                                        aria-label="Clear search"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-current p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                {/* Results */}
                                {searchQuery.trim().length > 0 && (
                                    <div className="absolute right-0 w-80 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[60vh] overflow-y-auto text-black">
                                        {renderSearchResults()}
                                    </div>
                                )}
                            </div>

                            {/* Cart Button */}
                            <button 
                                aria-label="View cart"
                                title="View cart"
                                onClick={() => setIsCartOpen(true)}
                                className={`relative p-2 ${theme.cartButton} rounded-full transition-colors flex items-center justify-center ${theme.cartWrapper || ''}`}
                            >
                                <span className="sr-only">View cart</span>
                                <ShoppingCart aria-hidden="true" className="w-6 h-6 stroke-[1.5]" />
                                {cartCount > 0 && (
                                    <span className={`absolute -top-1 -right-1 ${theme.cartBadge} text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[var(--glow-bg,white)] shadow-sm`}>
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── DEFAULT layout for all other themes ── */
                    <div className={theme.headerWrapper || "max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between relative"}>
                        {/* LEFT: Mobile Menu Button */}
                        <div className="flex items-center shrink-0 w-1/3 md:w-auto md:hidden">
                            <button 
                                aria-label="Open menu"
                                onClick={() => setIsMobileMenuOpen(true)}
                                className={`p-2 -ml-2 rounded-lg ${theme.textMuted} hover:${theme.text} transition-colors`}
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>

                        {/* MIDDLE: Logo (Centered on mobile and desktop) */}
                        <div className={`flex items-center justify-center shrink-0 w-1/3 md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 ${theme.logoWrapper || ''}`}>
                            {store.logo ? (
                                // Logo: ~134px display → serve 180w standard / 268w retina
                                <img
                                    src={cdnImg(imgUrl(store.logo), { width: 268 })}
                                    srcSet={`${cdnImg(imgUrl(store.logo), { width: 180 })} 180w, ${cdnImg(imgUrl(store.logo), { width: 268 })} 268w`}
                                    sizes="(max-width: 640px) 180px, 268px"
                                    alt={store.name}
                                    className="w-auto h-10 md:h-12 object-contain rounded-md cursor-pointer"
                                    onClick={() => navigate(`/store/${slug}`)}
                                    onError={e => e.target.style.display = 'none'}
                                />
                            ) : (
                                <span className={`font-semibold text-lg md:text-xl tracking-tight cursor-pointer ${theme.headerLogo}`} onClick={() => navigate(`/store/${slug}`)}>{store.name}</span>
                            )}
                        </div>

                        {/* RIGHT: Search Bar & Cart */}
                        <div className="flex items-center justify-end gap-2 md:gap-4 shrink-0 w-1/3 md:w-full">
                            {/* Mobile Search Icon */}
                            <button 
                                aria-label="Toggle search"
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className={`md:hidden p-2 rounded-full transition-colors ${theme.textMuted} hover:${theme.text} flex items-center justify-center`}
                            >
                                <Search className="w-6 h-6 stroke-[1.5]" />
                            </button>
                            
                            {/* Desktop Search */}
                            <div className="hidden md:block w-48 lg:w-64 relative">
                                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted || 'text-gray-400'}`} />
                                <input 
                                    type="text" 
                                    placeholder="Search products..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full py-2 pl-9 pr-8 rounded-full outline-none transition-colors text-sm ${theme.headerSearch || 'bg-black/5 dark:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 focus:border-gray-300 dark:focus:border-white/20 text-current'}`}
                                />
                                {searchQuery && (
                                    <button 
                                        aria-label="Clear search"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-current p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                {/* Results */}
                                {searchQuery.trim().length > 0 && (
                                    <div className="absolute right-0 w-80 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[60vh] overflow-y-auto text-black">
                                        {renderSearchResults()}
                                    </div>
                                )}
                            </div>

                            {/* Cart Button */}
                            <button 
                                aria-label="View cart"
                                title="View cart"
                                onClick={() => setIsCartOpen(true)}
                                className={`relative p-2 ${theme.cartButton} rounded-full transition-colors flex items-center justify-center ${theme.cartWrapper || ''}`}
                            >
                                <span className="sr-only">View cart</span>
                                <ShoppingCart aria-hidden="true" className="w-6 h-6 stroke-[1.5]" />
                                {cartCount > 0 && (
                                    <span className={`absolute -top-1 -right-1 ${theme.cartBadge} text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm`}>
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── COLLAPSIBLE SEARCH BAR ─── */}
                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute left-0 right-0 top-full w-full bg-white border-b border-gray-100 shadow-sm z-40 overflow-visible"
                        >
                            <div className="max-w-[1440px] mx-auto px-4 py-4 sm:px-6 lg:px-8 relative">
                                <div className="relative">
                                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search for products..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 text-black py-3 pl-12 pr-4 rounded-xl outline-none focus:border-black transition-colors"
                                    />
                                    <button 
                                        aria-label="Close search"
                                        onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-1"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                {/* LIVE SEARCH RESULTS */}
                                {searchQuery.trim().length > 0 && (
                                    <div className="absolute left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
                                        {renderSearchResults()}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── MEGA MENU ─── */}
                {store.megaMenu && store.megaMenu.length > 0 && theme.id !== 'glow' && (
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
                                                    navigate(`/store/${slug}/category/${encodeURIComponent(menuItem.link.split('=')[1])}`);
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
                                                                        navigate(`/store/${slug}/category/${encodeURIComponent(child.link.split('=')[1])}`);
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

            {/* ─── MOBILE NAVIGATION DRAWER ─── */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-[60] flex md:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
                            className={`w-[85%] max-w-sm h-full relative z-10 flex flex-col shadow-2xl ${theme.pageBg}`}
                        >
                            <div className={`px-4 pt-6 pb-3 border-b border-gray-100 dark:border-white/10 flex items-center relative ${theme.header}`}>
                                <div className="flex-1"></div>
                                <div className="flex flex-col items-center text-center shrink-0">
                                    {store.logo ? (
                                        <img src={imgUrl(store.logo)} alt={store.name} className="h-10 max-w-[150px] object-contain mb-0.5" />
                                    ) : null}
                                    <span className={`font-bold text-lg tracking-tight ${theme.headerLogo}`}>{store.name}</span>
                                </div>
                                <div className="flex-1 flex justify-end">
                                    <button aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${theme.textMuted}`}>
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                                {/* Home Button */}
                                <button 
                                    onClick={() => { 
                                        navigate(`/store/${slug}`);
                                        setIsMobileMenuOpen(false); 
                                    }}
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
                                                            navigate(`/store/${slug}/category/${encodeURIComponent(cat)}`);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${theme.categoryTab}`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Contact Us Accordion */}
                                {(store.phone || store.whatsappNumber || store.email) && (
                                    <div className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
                                        <button 
                                            onClick={() => setExpandedMobileSections(p => ({ ...p, contact: !p.contact }))}
                                            className={`w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] ${theme.text} font-bold`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Phone className="w-5 h-5" />
                                                <span>Contact Us</span>
                                            </div>
                                            {expandedMobileSections.contact ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                        
                                        <div className={`transition-all overflow-hidden ${expandedMobileSections.contact ? 'max-h-96 border-t border-gray-100 dark:border-white/10' : 'max-h-0'}`}>
                                            <div className="p-2 space-y-1 bg-white dark:bg-black/20">
                                                {store.whatsappNumber && (
                                                    <a href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>
                                                        <MessageCircle className="w-4 h-4" />
                                                        WhatsApp
                                                    </a>
                                                )}
                                                {store.phone && (
                                                    <a href={`tel:${store.phone.replace(/\D/g, '')}`} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>
                                                        <Phone className="w-4 h-4" />
                                                        Call Us
                                                    </a>
                                                )}
                                                {store.email && (
                                                    <a href={`mailto:${store.email}`} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>
                                                        <Mail className="w-4 h-4" />
                                                        Email Us
                                                    </a>
                                                )}
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                            <button aria-label="Close policy" onClick={() => setActivePolicy(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
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

            {/* Mobile Bottom Navigation Bar */}
            <WaStoreMobileBottomMenu 
                store={store}
                theme={theme}
                cartCount={cartCount}
                setIsCartOpen={setIsCartOpen}
                setIsSearchOpen={setIsSearchOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
        </>
    );
}
