import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Package, CheckCircle, Zap, Star, ShieldCheck, ShoppingCart, Settings, Tag, LayoutGrid, Layers, Search, List } from 'lucide-react';
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileGridView, setIsMobileGridView] = useState(false);

    useEffect(() => {
        fetchMarketplaceData();
    }, []);

    const fetchMarketplaceData = async () => {
        setLoading(true);
        try {
            // Fetch all active add-ons available in the store
            const addonsRes = await axios.get('/api/addons');
            // Fetch add-ons already owned by the user
            const myAddonsRes = await axios.get('/api/addons/my');

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

    const filteredAddons = addons
        .filter(addon => activeTab === 'browse' ? true : isOwned(addon.id))
        .filter(addon => 
            addon.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            addon.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
            <TopHeader />
            <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-7xl mx-auto space-y-8 animate-fade-in-up hide-scrollbar">
                
                {/* Renovated Premium Top Banner */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-6 md:p-12 text-white border border-white/5 shadow-[0_20px_50px_rgba(8,112,184,0.15)] dark:shadow-[0_20px_50px_rgba(99,102,241,0.05)]">
                    {/* Glowing Mesh Background */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_60%)] z-0" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_85%,rgba(168,85,247,0.12),transparent_50%)] z-0" />
                    
                    {/* Decorative pulsing blurs */}
                    <div className="absolute top-1/2 -right-12 -translate-y-1/2 w-72 h-72 rounded-full bg-indigo-600/25 blur-[100px] z-0 animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
                    <div className="absolute -bottom-12 left-1/3 w-64 h-64 rounded-full bg-purple-600/15 blur-[80px] z-0 animate-pulse pointer-events-none" style={{ animationDuration: '6s' }} />

                    {/* Content Container */}
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="max-w-2xl">
                            {/* Premium Tech Tag */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 uppercase mb-4 backdrop-blur-md">
                                <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                                Plugin Store
                            </div>
                            
                            <h1 className="text-3xl md:text-4xl font-black mb-3 flex items-center gap-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200">
                                Add-on Marketplace
                            </h1>
                            
                            <p className="text-sm md:text-base text-indigo-200/80 font-medium leading-relaxed max-w-xl">
                                Supercharge your WhatsApp Business workflows. Discover, install, and custom-configure modular integrations to unlock ultimate productivity.
                            </p>
                        </div>
                        
                        {/* Premium Visual Indicator */}
                        <div className="hidden lg:flex items-center gap-4 pr-6">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg relative group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <ShoppingCart className="w-10 h-10 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation and Search Controls */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
                    {/* Premium Tab Navigation */}
                    <div className="relative flex p-1.5 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800/80 rounded-[2rem] shadow-lg shadow-indigo-500/5 dark:shadow-indigo-900/20 w-full md:max-w-md overflow-x-auto hide-scrollbar">
                        {/* Active Background Pill */}
                        <div
                            className="absolute inset-y-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-md transition-all duration-500 ease-out z-0"
                            style={{
                                left: activeTab === 'browse' ? '6px' : 'calc(50% + 2px)',
                                width: 'calc(50% - 8px)'
                            }}
                        ></div>

                        <button
                            onClick={() => setActiveTab('browse')}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'browse'
                                ? 'text-white tracking-wide'
                                : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                        >
                            <LayoutGrid className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'browse' ? 'scale-110' : 'scale-100 opacity-70'}`} />
                            Add New Plugins
                        </button>

                        <button
                            onClick={() => setActiveTab('installed')}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'installed'
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

                    {/* Search Bar & Mobile Layout Toggle */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:max-w-xs group flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200">
                                <Search className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search plugins..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 shadow-sm"
                            />
                        </div>
                        {/* Mobile Grid/List Toggle */}
                        <button
                            onClick={() => setIsMobileGridView(!isMobileGridView)}
                            className="md:hidden flex items-center justify-center p-3 rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 text-gray-600 dark:text-gray-300 shadow-sm"
                        >
                            {isMobileGridView ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className={`grid ${isMobileGridView ? 'grid-cols-2' : 'grid-cols-1'} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6`}>
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-3xl"></div>)}
                    </div>
                ) : (
                    <div className={`grid ${isMobileGridView ? 'grid-cols-2' : 'grid-cols-1'} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6`}>
                        {filteredAddons.map((addon) => {
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
                                        <div className={`absolute top-0 right-0 bg-green-500 text-white ${isMobileGridView ? 'text-[10px] px-2 py-1' : 'text-xs px-4 py-1.5'} font-bold rounded-bl-xl z-20 flex flex-col items-center shadow-sm`}>
                                            <div className="flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                <span className={isMobileGridView ? "hidden sm:inline" : ""}>Installed</span>
                                            </div>
                                            {daysLeft !== null && (
                                                <span className="text-[9px] opacity-90 mt-0.5 uppercase tracking-wider block text-center hidden sm:block">
                                                    {daysLeft <= 0 ? 'Expires Today' : `Expiring in ${daysLeft} Days`}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <Link to={`/marketplace/${addon.slug || addon.id}`} className="flex-grow block hover:no-underline">
                                        {addon.badge && (
                                            <div className="absolute top-4 left-4 z-20">
                                                <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
                                                    <Tag className="w-3 h-3" /> {addon.badge}
                                                </span>
                                            </div>
                                        )}
                                        {addon.bannerUrl ? (
                                            <div className={`relative overflow-hidden ${isMobileGridView ? 'h-24 sm:h-40' : 'h-40'}`}>
                                                <img
                                                    src={addon.bannerUrl}
                                                    alt={addon.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                                />
                                            </div>
                                        ) : (
                                            <div className={`${isMobileGridView ? 'h-16 sm:h-24' : 'h-24'} bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center`}>
                                                <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner border border-white dark:border-gray-600">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                            </div>
                                        )}
                                        <div className={`${isMobileGridView ? 'p-3 sm:p-5' : 'p-5'}`}>
                                            <h3 className={`${isMobileGridView ? 'text-sm sm:text-base line-clamp-1' : 'text-base line-clamp-1 sm:line-clamp-none'} font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors`}>{addon.name}</h3>
                                            <p className={`text-gray-500 dark:text-gray-400 ${isMobileGridView ? 'text-[10px] sm:text-xs min-h-[1.5rem] sm:min-h-[2rem]' : 'text-xs min-h-[2rem]'} leading-relaxed line-clamp-2`}>{addon.description}</p>
                                        </div>
                                    </Link>

                                    <div className={`${isMobileGridView ? 'p-3 sm:p-5' : 'p-5'} bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 mt-auto`}>
                                        <div className={`flex items-center justify-between ${isMobileGridView ? 'mb-2 sm:mb-4' : 'mb-4'}`}>
                                            <div>
                                                {addon.price > 0 ? (
                                                    <div className={`flex items-baseline ${isMobileGridView ? 'gap-0 sm:gap-0.5 flex-wrap' : 'gap-0.5'}`}>
                                                        <span className={`${isMobileGridView ? 'text-xs sm:text-sm' : 'text-sm'} font-bold text-gray-400 dark:text-gray-500`}>{getCurrencySymbol(addon.currency)}</span>
                                                        <span className={`${isMobileGridView ? 'text-base sm:text-xl' : 'text-xl'} font-extrabold text-gray-900 dark:text-white tabular-nums`}>
                                                            {Math.floor(Number(addon.price))}
                                                        </span>
                                                        <span className={`text-[10px] text-gray-500 font-medium ${isMobileGridView ? 'ml-0.5 sm:ml-1.5' : 'ml-1.5'} align-baseline`}>
                                                            {addon.currency} {addon.isRecurring ? `/${addon.recurringInterval}` : 'one-time'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className={`${isMobileGridView ? 'text-base sm:text-xl' : 'text-xl'} font-extrabold text-green-600 dark:text-green-400`}>Free</span>
                                                )}
                                            </div>
                                        </div>

                                        {owned ? (
                                            <Link
                                                to={`/addons/${addon.module_key}`}
                                                className={`w-full ${isMobileGridView ? 'py-1.5 sm:py-2.5 px-2 sm:px-4' : 'py-2.5 px-4'} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl flex justify-center items-center gap-2 transition-colors`}
                                            >
                                                <Settings className="w-4 h-4" />
                                                <span className={isMobileGridView ? 'hidden sm:inline text-xs sm:text-sm' : 'text-sm'}>Manage Settings</span>
                                            </Link>
                                        ) : (
                                            <Link
                                                to={`/marketplace/${addon.slug || addon.id}`}
                                                className={`w-full ${isMobileGridView ? 'py-1.5 sm:py-2.5 px-2 sm:px-4 text-xs sm:text-sm' : 'py-2.5 px-4 text-sm'} bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex justify-center items-center gap-1.5 sm:gap-2 shadow-md shadow-indigo-600/20 transition-all hover:shadow-lg hover:-translate-y-0.5`}
                                            >
                                                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                                                <span className={isMobileGridView ? 'hidden sm:inline' : ''}>View Details</span>
                                                <span className={isMobileGridView ? 'inline sm:hidden' : 'hidden'}>View</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredAddons.length === 0 && searchQuery !== '' && (
                            <div className="col-span-full py-24 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                                    <Search className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Matching Plugins</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">We couldn't find any plugins matching &quot;{searchQuery}&quot;. Try adjusting your keywords.</p>
                            </div>
                        )}

                        {addons.length === 0 && activeTab === 'browse' && searchQuery === '' && (
                            <div className="col-span-full py-24 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                                    <Package className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Marketplace is Empty</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">Check back later for exciting new add-ons to supercharge your workspace.</p>
                            </div>
                        )}

                        {addons.filter(addon => isOwned(addon.id)).length === 0 && activeTab === 'installed' && searchQuery === '' && (
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
