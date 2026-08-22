import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, ShoppingBag, Home, Tag, ChevronDown, ChevronUp, FileText, Phone, Mail, MessageCircle, User, ArrowLeft } from 'lucide-react';

import WaStoreMobileBottomMenu from './WaStoreMobileBottomMenu';
import { cdnImg } from '../utils/cdnImage';
import { getStoreRoute } from '../utils/storeRouting';

// Helper to slugify product names for URLs
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

// Helper to check if rich text actually has content (isn't just <p><br></p>)
const hasContent = (html) => html && html.replace(/<[^>]*>?/gm, '').trim().length > 0;

// Helper for contact info
const getHasContactInfo = (store) => !!(store.email || store.whatsappNumber || store.phone || store.address);

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
    storeCustomer = null,   // customer object if logged in
    authEnabled = false,    // whether store has customer auth enabled
}) {
    const navigate = useNavigate();

    // Local state for header interactions
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedMobileSections, setExpandedMobileSections] = useState({ categories: true, policies: false, contact: false });
     // 'privacy', 'terms', 'return'

    if (!store) return null;

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
                                navigate(getStoreRoute(slug, `/product/${slugifyProduct(product)}`));
                            }}
                            className="w-full flex items-center gap-4 p-3 sm:p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 text-left"
                        >
                            <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                                {product.imageUrls && product.imageUrls[0] ? (
                                    <img src={imgUrl(product.imageUrls[0])} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                                ) : (
                                    <ShoppingBag className="w-6 h-6 text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-[15px] text-gray-900 truncate mb-0.5">{product.name}</h4>
                                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider truncate">{product.category || 'Uncategorized'}</p>
                            </div>
                            <div className="font-bold text-[15px] text-gray-900 shrink-0 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                {getCurrencySymbol(store.currency)}{parseFloat(product.price).toFixed(2)}
                            </div>
                        </button>
                    </li>
                ))}
                <li className="bg-gray-50 p-3 text-center border-t border-gray-100">
                    <button 
                        onClick={() => {
                            setIsSearchOpen(false);
                            navigate(getStoreRoute(slug));
                            setTimeout(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }}
                        className="text-[13px] font-bold text-gray-900 sm:text-blue-600 bg-gray-100 sm:bg-transparent px-4 py-3 sm:py-2 rounded-xl sm:rounded-none w-full sm:w-auto hover:bg-gray-200 transition-colors"
                    >
                        View all search results
                    </button>
                </li>
            </ul>
        );
    };

    return (
        <>
            {/* ── TOP ANNOUNCEMENT BAR ── */}
            {store?.topBarConfig?.enabled && (() => {
                const tb = store.topBarConfig;
                const paddingMap = { sm: 'py-1.5', md: 'py-2.5', lg: 'py-3.5' };
                const fontSizeMap = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
                const allText = (tb.messages || []).map(m => m.text).join('   •   ');
                const dur = Math.max(8, Math.round(allText.length * 0.12));
                return (
                    <div
                        className={`w-full overflow-hidden flex items-center justify-center z-[60] relative ${paddingMap[tb.padding] || 'py-1.5'}`}
                        style={{ backgroundColor: tb.bgColor }}
                    >
                        {tb.marquee ? (
                            <>
                                <style>{`
                                    @keyframes wastore-topbar { 0% { transform: translateX(100cqw); } 100% { transform: translateX(-100%); } }
                                    .wastore-topbar-text { display: inline-block; white-space: nowrap; animation: wastore-topbar ${dur}s linear infinite; padding-left: 20px; }
                                `}</style>
                                <div className="w-full overflow-hidden" style={{ containerType: 'inline-size' }}>
                                    <span className="wastore-topbar-text">
                                        <span className={`font-medium ${fontSizeMap[tb.fontSize] || 'text-xs'}`} style={{ color: tb.textColor }}>
                                            {allText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                        </span>
                                    </span>
                                </div>
                            </>
                        ) : (
                            <span className={`font-medium text-center px-4 ${fontSizeMap[tb.fontSize] || 'text-xs'}`} style={{ color: tb.textColor }}>
                                {tb.messages?.[0]?.text || ''}
                            </span>
                        )}
                    </div>
                );
            })()}
            <header className={`sticky top-0 z-50 ${theme.header}`}>
                {theme.id === 'vogue' ? (
                    /* ── VOGUE: Minimal 3-column ── Hamburger | Logo | Search+Cart */
                    (<div className="max-w-[1440px] mx-auto px-4 sm:px-10 h-20 grid grid-cols-3 items-center">
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
                        <div className="flex items-center justify-center cursor-pointer" onClick={() => navigate(getStoreRoute(slug))}>
                            {store.logo ? (
                                // Logo: ~134px display → serve 180w standard / 268w retina
                                (<img
                                    src={cdnImg(imgUrl(store.logo), { width: 268 })}
                                    srcSet={`${cdnImg(imgUrl(store.logo), { width: 180 })} 180w, ${cdnImg(imgUrl(store.logo), { width: 268 })} 268w`}
                                    sizes="(max-width: 640px) 180px, 268px"
                                    alt={store.name}
                                    className="h-12 max-w-[180px] object-contain"
                                    onError={e => e.target.style.display = 'none'}
                                />)
                            ) : (
                                <span className="text-xl tracking-[0.25em] uppercase text-black font-normal" style={{ fontFamily: theme.fontFamily }}>{store.name}</span>
                            )}
                        </div>
                        {/* RIGHT – Search(mobile), Account and Cart */}
                        <div className="flex items-center justify-end gap-2">
                            <button 
                                aria-label="Toggle search"
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className="md:hidden p-2 text-black hover:bg-black/5 rounded-full transition-colors flex items-center justify-center"
                            >
                                <Search className="w-5 h-5 stroke-[1.5]" />
                            </button>
                            {/* Account button — only show if store owner enabled customer auth */}
                            {authEnabled && (
                                <button
                                    aria-label="My Account"
                                    onClick={() => navigate(getStoreRoute(slug, `/account${storeCustomer ? '' : '/login'}`))}
                                    className="relative hidden md:flex items-center justify-center p-2 text-black hover:bg-black/5 rounded-full transition-colors group"
                                >
                                    <User className="w-5 h-5 stroke-[1.5] group-hover:scale-105 transition-transform" />
                                    {storeCustomer && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                                    )}
                                </button>
                            )}
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
                    </div>)
                ) : theme.id === 'glow' ? (
                    /* ── GLOW: Single Row Header ── Logo | Menu | Search+Cart */
                    (<div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between md:gap-6 relative">
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
                                (<img
                                    src={cdnImg(imgUrl(store.logo), { width: 268 })}
                                    srcSet={`${cdnImg(imgUrl(store.logo), { width: 180 })} 180w, ${cdnImg(imgUrl(store.logo), { width: 268 })} 268w`}
                                    sizes="(max-width: 640px) 180px, 268px"
                                    alt={store.name}
                                    className="w-auto h-10 md:h-12 object-contain cursor-pointer"
                                    onClick={() => navigate(getStoreRoute(slug))}
                                    onError={e => e.target.style.display = 'none'}
                                />)
                            ) : (
                                <span className={`font-semibold text-lg md:text-xl tracking-tight cursor-pointer ${theme.headerLogo} cursor-pointer`} onClick={() => navigate(getStoreRoute(slug))}>{store.name}</span>
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
                                                        navigate(getStoreRoute(slug, `/category/${encodeURIComponent(menuItem.link.split('=')[1])}`));
                                                    } else if (menuItem.link.startsWith('/')) {
                                                        e.preventDefault();
                                                        let target = menuItem.link;
                                                        if (!target.startsWith('/store/')) {
                                                            target = target === '/' ? getStoreRoute(slug) : getStoreRoute(slug, `${target}`);
                                                        }
                                                        navigate(target);
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
                                                                            navigate(getStoreRoute(slug, `/category/${encodeURIComponent(child.link.split('=')[1])}`));
                                                                        } else if (child.link.startsWith('/')) {
                                                                            e.preventDefault();
                                                                            let target = child.link;
                                                                            if (!target.startsWith('/store/')) {
                                                                                target = target === '/' ? getStoreRoute(slug) : getStoreRoute(slug, `${target}`);
                                                                            }
                                                                            navigate(target);
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
                    </div>)
                ) : (
                    /* ── DEFAULT layout for all other themes ── */
                    (<div className={theme.headerWrapper || "max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between relative"}>
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
                                (<img
                                    src={cdnImg(imgUrl(store.logo), { width: 268 })}
                                    srcSet={`${cdnImg(imgUrl(store.logo), { width: 180 })} 180w, ${cdnImg(imgUrl(store.logo), { width: 268 })} 268w`}
                                    sizes="(max-width: 640px) 180px, 268px"
                                    alt={store.name}
                                    className="w-auto h-10 md:h-12 object-contain rounded-md cursor-pointer"
                                    onClick={() => navigate(getStoreRoute(slug))}
                                    onError={e => e.target.style.display = 'none'}
                                />)
                            ) : (
                                <span className={`font-semibold text-lg md:text-xl tracking-tight cursor-pointer ${theme.headerLogo} cursor-pointer`} onClick={() => navigate(getStoreRoute(slug))}>{store.name}</span>
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
                    </div>)
                )}

                {/* ─── SEARCH BAR (Mobile Fullscreen / Desktop Dropdown) ─── */}
                {/* CSS fade+slide replaces framer-motion */}
                {isSearchOpen && (
                    <div
                        className="fixed inset-0 sm:inset-auto sm:absolute sm:left-0 sm:right-0 sm:top-full w-full bg-white sm:border-b sm:border-gray-100 sm:shadow-sm z-[100] sm:z-40 overflow-hidden sm:overflow-visible flex flex-col"
                        style={{ animation: 'fadeSlideDown 0.2s ease forwards' }}
                    >
                        {/* Mobile Header for Full Screen Modal */}
                        <div className="sm:hidden flex items-center px-4 h-16 border-b border-gray-100 shrink-0 bg-white shadow-sm z-10">
                            <button 
                                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                className="mr-3 p-2 -ml-2 text-gray-500 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <input 
                                type="text" 
                                placeholder="Search products..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                                className="w-full text-lg outline-none bg-transparent placeholder-gray-400 text-black font-medium"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="p-2 -mr-2 text-gray-400 hover:text-black">
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Desktop Search Input */}
                        <div className="hidden sm:block max-w-[1440px] mx-auto px-4 py-4 sm:px-6 lg:px-8 relative w-full">
                            <div className="relative">
                                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search for products..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
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
                            
                            {/* DESKTOP LIVE SEARCH RESULTS */}
                            {searchQuery.trim().length > 0 && (
                                <div className="absolute left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
                                    {renderSearchResults()}
                                </div>
                            )}
                        </div>

                        {/* MOBILE LIVE SEARCH RESULTS */}
                        <div className="sm:hidden flex-1 overflow-y-auto bg-gray-50 text-black">
                            {searchQuery.trim().length > 0 ? (
                                <div className="bg-white">
                                    {renderSearchResults()}
                                </div>
                            ) : (
                                <div className="px-4 py-16 text-center text-gray-400 flex flex-col items-center justify-center h-full pb-[30vh]">
                                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                                        <Search className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-600 mb-1">Looking for something?</h3>
                                    <p className="text-sm font-medium text-gray-400">Start typing to search across the store</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                                                    navigate(getStoreRoute(slug, `/category/${encodeURIComponent(menuItem.link.split('=')[1])}`));
                                                } else if (menuItem.link.startsWith('/')) {
                                                    e.preventDefault();
                                                    let target = menuItem.link;
                                                    if (!target.startsWith('/store/')) {
                                                        target = target === '/' ? getStoreRoute(slug) : getStoreRoute(slug, `${target}`);
                                                    }
                                                    navigate(target);
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
                                                                        navigate(getStoreRoute(slug, `/category/${encodeURIComponent(child.link.split('=')[1])}`));
                                                                    } else if (child.link.startsWith('/')) {
                                                                        e.preventDefault();
                                                                        let target = child.link;
                                                                        if (!target.startsWith('/store/')) {
                                                                            target = target === '/' ? getStoreRoute(slug) : getStoreRoute(slug, `${target}`);
                                                                        }
                                                                        navigate(target);
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
            {/* CSS transitions replace framer-motion */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[60] flex md:hidden">
                    {/* Backdrop — CSS fade */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
                        style={{ animation: 'fadeIn 0.2s ease forwards' }}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    {/* Slide-in panel from left — CSS */}
                    <div
                        className={`w-[85%] max-w-sm h-full relative z-10 flex flex-col shadow-2xl ${theme.pageBg}`}
                        style={{ animation: 'slideInLeft 0.3s ease forwards' }}
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
                                {/* Account Actions */}
                                {authEnabled && (
                                    <div className="flex items-center gap-3 w-full">
                                        {storeCustomer ? (
                                            <button 
                                                onClick={() => { navigate(getStoreRoute(slug, `/account`)); setIsMobileMenuOpen(false); }}
                                                className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-semibold text-center transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                                            >
                                                <User className="w-5 h-5" />
                                                My Account
                                            </button>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => { navigate(getStoreRoute(slug, `/login`)); setIsMobileMenuOpen(false); }}
                                                    className={`flex-1 py-3 rounded-xl font-semibold text-center transition-colors ${theme.categoryTab}`}
                                                >
                                                    Login
                                                </button>
                                                <button 
                                                    onClick={() => { navigate(getStoreRoute(slug, `/register`)); setIsMobileMenuOpen(false); }}
                                                    className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-semibold text-center transition-opacity hover:opacity-90"
                                                >
                                                    Register
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                                {/* Home Button */}
                                <button 
                                    onClick={() => { 
                                        navigate(getStoreRoute(slug));
                                        setIsMobileMenuOpen(false); 
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${theme.categoryTab} font-semibold`}
                                >
                                    <Home className="w-5 h-5" />
                                    <span>Home</span>
                                </button>

                                {/* Custom Navigation (Mega Menu) */}
                                {store.megaMenu && store.megaMenu.length > 0 && (
                                    <div className="space-y-4">
                                        {store.megaMenu.map(menuItem => (
                                            <div key={menuItem.id} className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
                                                {menuItem.children && menuItem.children.length > 0 ? (
                                                    <>
                                                        <button 
                                                            onClick={() => setExpandedMobileSections(p => ({ ...p, [`nav_${menuItem.id}`]: !p[`nav_${menuItem.id}`] }))}
                                                            className={`w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] ${theme.text} font-bold`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <FileText className="w-5 h-5 opacity-70" />
                                                                <span>{menuItem.title}</span>
                                                            </div>
                                                            {expandedMobileSections[`nav_${menuItem.id}`] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </button>
                                                        <div className={`transition-all overflow-hidden ${expandedMobileSections[`nav_${menuItem.id}`] ? 'max-h-[1000px] border-t border-gray-100 dark:border-white/10' : 'max-h-0'}`}>
                                                            <div className="p-2 space-y-1 bg-white dark:bg-black/20">
                                                                {menuItem.children.map(child => (
                                                                    <button
                                                                        key={child.id}
                                                                        onClick={() => {
                                                                            setIsMobileMenuOpen(false);
                                                                            if (!child.link) return;
                                                                            if (child.link.startsWith('/?cat=')) {
                                                                                navigate(getStoreRoute(slug, `/category/${encodeURIComponent(child.link.split('=')[1])}`));
                                                                            } else if (child.link.startsWith('/')) {
                                                                                let target = child.link;
                                                                                if (!target.startsWith('/store/')) target = target === '/' ? getStoreRoute(slug) : getStoreRoute(slug, `${target}`);
                                                                                navigate(target);
                                                                            } else {
                                                                                window.location.href = child.link;
                                                                            }
                                                                        }}
                                                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${theme.categoryTab}`}
                                                                    >
                                                                        {child.title}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <button 
                                                        onClick={() => {
                                                            setIsMobileMenuOpen(false);
                                                            if (!menuItem.link) return;
                                                            if (menuItem.link.startsWith('/?cat=')) {
                                                                navigate(getStoreRoute(slug, `/category/${encodeURIComponent(menuItem.link.split('=')[1])}`));
                                                            } else if (menuItem.link.startsWith('/')) {
                                                                let target = menuItem.link;
                                                                if (!target.startsWith('/store/')) target = target === '/' ? getStoreRoute(slug) : getStoreRoute(slug, `${target}`);
                                                                navigate(target);
                                                            } else {
                                                                window.location.href = menuItem.link;
                                                            }
                                                        }}
                                                        className={`w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/[0.02] ${theme.text} font-bold`}
                                                    >
                                                        <FileText className="w-5 h-5 opacity-70" />
                                                        <span>{menuItem.title}</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

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
                                                            navigate(getStoreRoute(slug, `/category/${encodeURIComponent(cat)}`));
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

                                {/* Pages & Policies Accordion */}
                                {(getHasContactInfo(store) || hasContent(store.aboutUs) || hasContent(store.privacyPolicy) || hasContent(store.termsConditions) || hasContent(store.returnPolicy) || hasContent(store.shippingPolicy)) && (
                                    <div className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
                                        <button 
                                            onClick={() => setExpandedMobileSections(p => ({ ...p, policies: !p.policies }))}
                                            className={`w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] ${theme.text} font-bold`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5" />
                                                <span>Pages & Policies</span>
                                            </div>
                                            {expandedMobileSections.policies ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                        
                                        <div className={`transition-all overflow-hidden ${expandedMobileSections.policies ? 'max-h-96 border-t border-gray-100 dark:border-white/10' : 'max-h-0'}`}>
                                            <div className="p-2 space-y-1 bg-white dark:bg-black/20">
                                                {hasContent(store.aboutUs) && (
                                                    <Link onClick={() => setIsMobileMenuOpen(false)} to={getStoreRoute(store.slug, '/pages/about-us')} className={`block w-full text-left px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>About Us</Link>
                                                )}
                                                {getHasContactInfo(store) && (
                                                    <Link onClick={() => setIsMobileMenuOpen(false)} to={getStoreRoute(store.slug, '/pages/contact-us')} className={`block w-full text-left px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>Contact Us</Link>
                                                )}
                                                {hasContent(store.shippingPolicy) && (
                                                    <Link onClick={() => setIsMobileMenuOpen(false)} to={getStoreRoute(store.slug, '/pages/shipping-policy')} className={`block w-full text-left px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>Shipping Policy</Link>
                                                )}
                                                {hasContent(store.privacyPolicy) && (
                                                    <Link onClick={() => setIsMobileMenuOpen(false)} to={getStoreRoute(store.slug, '/pages/privacy-policy')} className={`block w-full text-left px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>Privacy Policy</Link>
                                                )}
                                                {hasContent(store.termsConditions) && (
                                                    <Link onClick={() => setIsMobileMenuOpen(false)} to={getStoreRoute(store.slug, '/pages/terms-and-conditions')} className={`block w-full text-left px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>Terms & Conditions</Link>
                                                )}
                                                {hasContent(store.returnPolicy) && (
                                                    <Link onClick={() => setIsMobileMenuOpen(false)} to={getStoreRoute(store.slug, '/pages/return-policy')} className={`block w-full text-left px-4 py-3 rounded-xl font-medium ${theme.categoryTab}`}>Return Policy</Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                authEnabled={authEnabled}
                storeCustomer={storeCustomer}
            />
        </>
    );
}
