import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Store, Plus, ArrowRight, Activity, ExternalLink, Settings, LayoutTemplate, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaStoreList() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newStore, setNewStore] = useState({ name: '', slug: '', whatsappNumber: '', currency: 'USD' });
    const navigate = useNavigate();

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setStores(res.data);
        } catch (error) {
            console.error("Failed to load stores:", error);
            toast.error("Failed to load your stores");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore`, newStore, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            toast.success("Store created successfully!");
            setShowCreateModal(false);
            navigate(`/wastore/${res.data.id}/products`);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create store");
        }
    };

    if (loading) return <div className="p-8 animate-pulse text-slate-500">Loading your stores...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Store className="w-6 h-6 text-indigo-600" />
                        Online Stores
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your interactive WhatsApp e-commerce storefronts.</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Create Store
                </button>
            </div>

            {stores.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                        <Store className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No stores yet</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">Create your first Online store to start selling your products seamlessly with interactive themes.</p>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Create Your First Store
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stores.map(store => (
                        <div key={store.id} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                                        {store.name.charAt(0)}
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${store.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        {store.isActive ? 'Active' : 'Draft'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{store.name}</h3>
                                <a href={`/store/${store.slug}`} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline mb-4">
                                    /store/{store.slug} <ExternalLink className="w-3 h-3" />
                                </a>
                                
                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                                        <Package className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                        <p className="text-xs text-slate-500">Products</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                                        <LayoutTemplate className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                        <p className="text-xs text-slate-500 uppercase">{store.themeId}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                                        <Activity className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                        <p className="text-xs text-slate-500">{store.views} views</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => navigate(`/wastore/${store.id}/products`)}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg transition-colors font-medium text-sm"
                                >
                                    Manage Store <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create New Store</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Store Name</label>
                                <input required type="text" value={newStore.name} onChange={e => setNewStore({...newStore, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. My Awesome Shop" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Store URL Slug</label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm">/store/</span>
                                    <input required type="text" value={newStore.slug} onChange={e => setNewStore({...newStore, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="my-shop" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp Number</label>
                                <input required type="text" value={newStore.whatsappNumber} onChange={e => setNewStore({...newStore, whatsappNumber: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. +1234567890" />
                                <p className="text-xs text-slate-500 mt-1">Orders will be sent to this number.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                                <select value={newStore.currency} onChange={e => setNewStore({...newStore, currency: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="INR">INR (₹)</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">Create Store</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
