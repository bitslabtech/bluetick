import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Contact, ClipboardList, CalendarCheck, Settings, Zap, ShoppingBag, Sparkles, ArrowRight, Image } from 'lucide-react';
import axios from 'axios';
import { useUI } from '../../context/UIContext';

export default function VcardLayout() {
    const location = useLocation();
    const [featuredProduct, setFeaturedProduct] = useState(null);
    const [showBanner, setShowBanner] = useState(false); // default hidden until fetched
    const [bannerImage, setBannerImage] = useState(null);
    const [isVerticalImage, setIsVerticalImage] = useState(false);
    const { showToast } = useUI();

    useEffect(() => {
        // Handle Stripe redirect responses
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('nfc_success') === 'true') {
            const sessionId = searchParams.get('session_id');
            const orderId = searchParams.get('order_id');
            if (sessionId && orderId) {
                axios.post(`${import.meta.env.VITE_API_URL}/api/nfc/verify-payment`, {
                    gateway: 'stripe',
                    nfcOrderId: orderId,
                    stripe_session_id: sessionId
                }).then(() => {
                    showToast({ type: 'success', title: 'Payment Successful', message: 'Your NFC order has been placed and payment confirmed!' });
                    window.history.replaceState(null, '', location.pathname); // Clean URL
                }).catch(err => {
                    showToast({ type: 'error', title: 'Verification Failed', message: 'There was an issue verifying your payment.' });
                });
            }
        } else if (searchParams.get('nfc_canceled') === 'true') {
            showToast({ type: 'warning', title: 'Payment Canceled', message: 'Your checkout session was canceled.' });
            window.history.replaceState(null, '', location.pathname);
        }

        const headers = {  };

        // Fetch catalog product for image display
        axios.get(`${import.meta.env.VITE_API_URL}/api/nfc/catalog`, { headers })
            .then(res => { if (res.data?.length > 0) setFeaturedProduct(res.data[0]); })
            .catch(() => { });

        // Fetch banner visibility setting
        axios.get(`${import.meta.env.VITE_API_URL}/api/nfc/banner-settings`, { headers })
            .then(res => {
                setShowBanner(res.data.showNfcBanner);
                if (res.data.nfcBannerImage) setBannerImage(res.data.nfcBannerImage);
            })
            .catch(() => setShowBanner(false));
    }, []);

    const navItems = [
        { path: '/vcards', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', exact: true },
        { path: '/vcards/list', icon: <Contact className="w-5 h-5" />, label: 'veCards', exact: false },
        { path: '/vcards/enquiries', icon: <ClipboardList className="w-5 h-5" />, label: 'Enquiries', exact: false },
        { path: '/vcards/bookings', icon: <CalendarCheck className="w-5 h-5" />, label: 'Bookings', exact: false },
        { path: '/vcards/media', icon: <Image className="w-5 h-5" />, label: 'Media Manager', exact: false },
        { path: '/vcards/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings', exact: false },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-8rem)]">
            {/* Mobile: Horizontal scrollable tab bar */}
            <div className="md:hidden flex flex-col gap-1.5">
                <div className="flex items-center justify-end px-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 opacity-80">
                        Swipe Menu <ArrowRight className="w-3 h-3 animate-pulse" />
                    </span>
                </div>
                <div className="relative bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-sm">
                    {/* Right fade gradient to indicate scrollability */}
                    <div className="absolute right-1 top-1 bottom-1 w-8 bg-gradient-to-l from-white dark:from-surface-dark pointer-events-none rounded-r-xl z-10" />
                
                <nav className="flex overflow-x-auto hide-scrollbar gap-1 snap-x px-0.5">
                    {navItems.map((item) => {
                        const isActive = item.exact
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0 snap-start ${
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>
                </div>
            </div>

            {/* Desktop: Original vertical sidebar */}
            <div className="w-full md:w-64 flex-shrink-0 hidden md:block">
                {/* Sticky wrapper */}
                <div className="sticky top-24 flex flex-col gap-4">

                    {/* ── Menu Card ── */}
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                        <div className="mb-4 px-2">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">veCard SaaS</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Manage your digital presence</p>
                        </div>
                        <nav className="flex flex-col gap-1">
                            {navItems.map((item) => {
                                const isActive = item.exact
                                    ? location.pathname === item.path
                                    : location.pathname.startsWith(item.path);
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                                            }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </NavLink>
                                );
                            })}
                        </nav>
                    </div>

                    {/* ── NFC Banner Card — only shown if admin enables it ── */}
                    {showBanner && (
                        <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-indigo-500/20 relative bg-white dark:bg-transparent">

                            {/* Dark gradient background (dark mode only) */}
                            <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-[#302b63] via-[#24243e] to-[#0f0c29]" />

                            {/* Animated glow orbs (dark mode only) */}
                            <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500 rounded-full blur-3xl opacity-0 dark:opacity-25 animate-pulse" />
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-600 rounded-full blur-3xl opacity-0 dark:opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

                            <div className="relative z-10 p-5">

                                {/* Header badges */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
                                        <Sparkles className="w-3 h-3 text-yellow-500 dark:text-yellow-300" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700 dark:text-white/80">NFC Store</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-green-50 dark:bg-black/40 border border-green-200 dark:border-white/10 px-2 py-0.5 rounded-full shadow-sm">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-[9px] text-green-700 dark:text-slate-300 font-bold uppercase">Free Shipping</span>
                                    </div>
                                </div>

                                {/* Product Image / Placeholder */}
                                <div
                                    className="rounded-xl overflow-hidden mb-4 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800"
                                    style={{ height: isVerticalImage ? 'auto' : '140px' }}
                                >
                                    {bannerImage ? (
                                        <img
                                            src={bannerImage}
                                            alt="NFC Store"
                                            className="w-full object-cover"
                                            style={{ height: isVerticalImage ? 'auto' : '100%' }}
                                            onLoad={(e) => setIsVerticalImage(e.target.naturalHeight > e.target.naturalWidth)}
                                        />
                                    ) : featuredProduct?.imageUrl ? (
                                        <img
                                            src={featuredProduct.imageUrl}
                                            alt={featuredProduct.name}
                                            className="w-full object-cover"
                                            style={{ height: isVerticalImage ? 'auto' : '100%' }}
                                            onLoad={(e) => setIsVerticalImage(e.target.naturalHeight > e.target.naturalWidth)}
                                        />
                                    ) : (
                                        /* Static NFC illustration placeholder */
                                        <div className="w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 gap-3" style={{ height: '140px' }}>
                                            {/* Card illustration */}
                                            <div className="relative">
                                                <div className="w-24 h-14 rounded-xl bg-gradient-to-br from-indigo-400/30 to-violet-500/20 border border-white/20 flex items-center justify-center relative overflow-hidden shadow-lg">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/10 to-violet-500/10" />
                                                    {/* Chip */}
                                                    <div className="absolute left-3 top-3 w-5 h-3.5 rounded-sm bg-yellow-400/50 border border-yellow-300/50" />
                                                    {/* NFC arcs */}
                                                    <div className="absolute right-3 flex flex-col items-end gap-0.5 top-3">
                                                        {[12, 8, 4].map((s, i) => (
                                                            <div
                                                                key={i}
                                                                className="border-r-2 border-t-2 border-white/30 rounded-tr-full"
                                                                style={{ width: s, height: s }}
                                                            />
                                                        ))}
                                                    </div>
                                                    {/* Shine */}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
                                                </div>
                                                {/* Glow below card */}
                                                <div className="absolute -bottom-2 inset-x-4 h-4 bg-indigo-500/40 blur-md rounded-full" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-white/40 font-medium">Premium NFC Products</p>
                                        </div>
                                    )}
                                </div>

                                {/* Title & Description */}
                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight mb-1">
                                    {featuredProduct?.name || 'Elevate Your Networking'}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-indigo-200/80 leading-relaxed mb-4">
                                    {featuredProduct
                                        ? `From $${featuredProduct.price} — Tap to instantly share your veCard.`
                                        : 'One tap shares everything. Premium metal NFC cards, keychains & more.'}
                                </p>



                                {/* CTA Button */}
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-nfc-store'))}
                                    className="group relative w-full py-2.5 rounded-xl overflow-hidden font-bold text-xs transition-all duration-300"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 group-hover:from-indigo-400 group-hover:via-violet-400 group-hover:to-purple-500 transition-all duration-300" />
                                    <div className="relative flex items-center justify-center gap-2 text-white">
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        Shop NFC Products
                                    </div>
                                </button>

                                {/* Trust line */}
                                <div className="flex items-center justify-center gap-1.5 mt-3">
                                    <Zap className="w-3 h-3 text-yellow-500 dark:text-yellow-400" />
                                    <span className="text-[9px] text-slate-400 dark:text-white/40 font-medium">Free Delivery · Premium quality</span>
                                </div>
                            </div>
                        </div>
                    )} {/* end showBanner */}

                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
}
