import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Package, CheckCircle, Zap, Star, ShieldCheck, ShoppingCart, Settings, Tag, LayoutGrid, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import TopHeader from '../components/TopHeader';

const getCurrencySymbol = (c) => ({ USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$' }[c] || c || '$');

const Marketplace = () => {
    const { user } = useAuth();
    const [addons, setAddons] = useState([]);
    const [myAddons, setMyAddons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('browse');

    useEffect(() => {
        fetchMarketplaceData();
    }, []);

    const fetchMarketplaceData = async () => {
        setLoading(true);
        try {
            // Fetch all active add-ons available in the store
            const addonsRes = await axios.get('/api/addons', { headers: { Authorization: `Bearer ${token}` } });
            // Fetch add-ons already owned by the user
            const myAddonsRes = await axios.get('/api/addons/my', { headers: { Authorization: `Bearer ${token}` } });

            setAddons(Array.isArray(addonsRes.data) ? addonsRes.data : []);
            setMyAddons(Array.isArray(myAddonsRes.data) ? myAddonsRes.data : []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load marketplace');
        } finally {
            setLoading(false);
        }
    };

    // Helper to check if user already owns an addon
    const getOwnedAddon = (addonId) => {
        return myAddons.find(ma => ma.addonId === addonId && ma.status === 'active');
    };

    const isOwned = (addonId) => {
        return !!getOwnedAddon(addonId);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
            <TopHeader />
            <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-7xl mx-auto space-y-8 animate-fade-in-up custom-scrollbar">
                {/* Header Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-4 md:p-10 text-white shadow-xl">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center gap-3 tracking-tight">
                        <ShoppingCart className="w-8 h-8 text-indigo-200" />
                        Add-on Marketplace
                    </h1>
                    <p className="text-base md:text-lg text-indigo-100 font-medium">
                        Supercharge your WhatsApp experience. Browse and add powerful new capabilities to your workspace instantly.
                    </p>
                </div>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 opacity-20">
                    <Zap className="w-96 max-w-full h-96 text-white" />
                </div>
                <div className="absolute bottom-0 right-1/4 translate-y-1/2 opacity-10">
                    <Star className="w-64 h-64 text-white" />
                </div>
            </div>

            {/* Premium Tab Navigation */}
            <div className="relative flex p-1.5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-white/80 dark:border-gray-700/80 rounded-[2rem] shadow-xl shadow-indigo-500/5 dark:shadow-indigo-900/20 max-w-xl mx-auto mb-12 overflow-x-auto hide-scrollbar">

                {/* Active Background Pill */}
                <div
                    className="absolute inset-y-1.5 w-[calc(50%-6px)] bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-md transition-all duration-500 ease-out z-0"
                    style={{ left: activeTab === 'browse' ? '6px' : 'calc(50%)' }}
                ></div>

                <button
                    onClick={() => setActiveTab('browse')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'browse'
                        ? 'text-white tracking-wide'
                        : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                >
                    <LayoutGrid className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'browse' ? 'scale-110' : 'scale-100 opacity-70'}`} />
                    Add New Plugins
                </button>

                <button
                    onClick={() => setActiveTab('installed')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'installed'
                        ? 'text-white tracking-wide'
                        : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                >
                    <Layers className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'installed' ? 'scale-110' : 'scale-100 opacity-70'}`} />
                    Installed Plugins
                    {myAddons.length > 0 && (
                        <span className={`ml-1.5 flex flex-shrink-0 items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[11px] font-extrabold rounded-full transition-all duration-300 ${activeTab === 'installed' ? 'bg-white/20 text-white shadow-inner' : 'bg-indigo-100 dark:bg-gray-800 text-indigo-700 dark:text-indigo-300'}`}>
                            {myAddons.filter(a => a.status === 'active').length}
                        </span>
                    )}
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-3xl"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {addons
                        .filter(addon => activeTab === 'browse' ? true : isOwned(addon.id))
                        .map((addon) => {
                            const ownedAddon = getOwnedAddon(addon.id);
                            const owned = !!ownedAddon;
                            
                            let daysLeft = null;
                            if (ownedAddon?.currentPeriodEnd) {
                                const end = new Date(ownedAddon.currentPeriodEnd);
                                const now = new Date();
                                const diffTime = Math.max(0, end - now);
                                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            }

                            return (
                                <div key={addon.id} className="group relative bg-white dark:bg-gray-800 rounded-3xl shadow-md hover:shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300 flex flex-col overflow-hidden transform hover:-translate-y-1">
                                    {owned && (
                                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl z-20 flex flex-col items-center shadow-sm">
                                            <div className="flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Installed
                                            </div>
                                            {daysLeft !== null && (
                                                <span className="text-[9px] opacity-90 mt-0.5 uppercase tracking-wider block text-center">
                                                    {daysLeft <= 0 ? 'Expires Today' : `Expiring in ${daysLeft} Days`}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <Link to={`/marketplace/${addon.id}`} className="flex-grow block hover:no-underline">
                                        {addon.badge && (
                                            <div className="absolute top-4 left-4 z-20">
                                                <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
                                                    <Tag className="w-3 h-3" /> {addon.badge}
                                                </span>
                                            </div>
                                        )}
                                        {addon.bannerUrl ? (
                                            <div className="relative h-40 overflow-hidden">
                                                <img
                                                    src={addon.bannerUrl}
                                                    alt={addon.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-24 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center">
                                                <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner border border-white dark:border-gray-600">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{addon.name}</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-2 min-h-[2rem]">{addon.description}</p>
                                        </div>
                                    </Link>

                                    <div className="p-5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 mt-auto">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                {addon.price > 0 ? (
                                                    <div className="flex items-baseline gap-0.5">
                                                        <span className="text-sm font-bold text-gray-400 dark:text-gray-500">{getCurrencySymbol(addon.currency)}</span>
                                                        <span className="text-xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                                                            {Math.floor(Number(addon.price))}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 font-medium ml-1.5 align-baseline">
                                                            {addon.currency} {addon.isRecurring ? `/${addon.recurringInterval}` : 'one-time'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xl font-extrabold text-green-600 dark:text-green-400">Free</span>
                                                )}
                                            </div>
                                        </div>

                                        {owned ? (
                                            <Link
                                                to={`/addons/${addon.module_key}`}
                                                className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl flex justify-center items-center gap-2 transition-colors"
                                            >
                                                <Settings className="w-4 h-4" />
                                                Manage Settings
                                            </Link>
                                        ) : (
                                            <Link
                                                to={`/marketplace/${addon.id}`}
                                                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex justify-center items-center gap-2 shadow-md shadow-indigo-600/20 transition-all hover:shadow-lg hover:-translate-y-0.5"
                                            >
                                                <ShoppingCart className="w-4 h-4" /> View Details / Purchase
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    {addons.length === 0 && activeTab === 'browse' && (
                        <div className="col-span-full py-24 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                                <Package className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Marketplace is Empty</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">Check back later for exciting new add-ons to supercharge your workspace.</p>
                        </div>
                    )}
                    {addons.filter(addon => isOwned(addon.id)).length === 0 && activeTab === 'installed' && (
                        <div className="col-span-full py-24 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                                <ShieldCheck className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Installed Plugins</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">You haven't purchased or installed any add-ons yet. Browse the marketplace to get started.</p>
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
};

export default Marketplace;
