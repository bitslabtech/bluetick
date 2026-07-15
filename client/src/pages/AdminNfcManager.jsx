import React, { useState, useEffect } from 'react';
import TrialBanner from '../components/TrialBanner';
import axios from 'axios';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';
import { useUI } from '../context/UIContext';
import { CreditCard, Database, PackageSearch, Tag, Download, CheckCircle, Package, Truck, Info, Plus, ShoppingBag, Trash2, Edit2, X, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function AdminNfcManager() {
    const { showToast } = useUI();
    const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'generate' | 'orders'
    
    // Data states
    const [cards, setCards] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Generation form state
    const [genCount, setGenCount] = useState(50);
    const [genType, setGenType] = useState('pvc_card');
    const [genBatch, setGenBatch] = useState(`BATCH-${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2, '0')}`);
    const [generating, setGenerating] = useState(false);

    // Catalog state
    const [catalog, setCatalog] = useState([]);
    const [showCatalogForm, setShowCatalogForm] = useState(false);
    const [savingCatalog, setSavingCatalog] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [catalogForm, setCatalogForm] = useState({ id: null, name: '', desc: '', price: '', type: '', imageUrl: '' });

    // Banner visibility toggle
    const [showNfcBanner, setShowNfcBanner] = useState(true);
    const [nfcBannerImage, setNfcBannerImage] = useState(null);
    const [savingBanner, setSavingBanner] = useState(false);
    const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

    useEffect(() => {
        // Fetch banner setting on mount
        axios.get(`${import.meta.env.VITE_API_URL}/api/admin/nfc/banner-settings`)
            .then(res => {
                setShowNfcBanner(res.data.showNfcBanner);
                setNfcBannerImage(res.data.nfcBannerImage);
            })
            .catch(() => {});
    }, []);

    const handleToggleBanner = async () => {
        setSavingBanner(true);
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/nfc/banner-settings`, { showNfcBanner: !showNfcBanner });
            setShowNfcBanner(res.data.showNfcBanner);
            showToast({ type: 'success', message: `NFC banner ${res.data.showNfcBanner ? 'enabled' : 'disabled'}` });
        } catch {
            showToast({ type: 'error', message: 'Failed to update banner setting' });
        } finally {
            setSavingBanner(false);
        }
    };

    const handleBannerImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingBannerImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/nfc/catalog/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/nfc/banner-settings`, { nfcBannerImage: data.url });
            setNfcBannerImage(data.url);
            showToast({ type: 'success', message: 'Banner image uploaded successfully' });
        } catch (err) {
            showToast({ type: 'error', message: 'Banner image upload failed' });
        } finally {
            setUploadingBannerImage(false);
        }
    };
    
    const handleRemoveBannerImage = async () => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/nfc/banner-settings`, { nfcBannerImage: null });
            setNfcBannerImage(null);
            showToast({ type: 'success', message: 'Banner image removed' });
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to remove banner image' });
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'cards' || activeTab === 'generate') {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/nfc/cards`);
                setCards(data);
            } else if (activeTab === 'orders') {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/nfc/orders`);
                setOrders(data);
            } else if (activeTab === 'catalog') {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/nfc/catalog`);
                setCatalog(data);
            }
        } catch (error) {
            showToast({ type: 'error', message: 'Failed to fetch NFC data' });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenerating(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/nfc/generate`, {
                count: parseInt(genCount),
                type: genType,
                batchId: genBatch
            });
            
            showToast({ type: 'success', message: `Generated ${genCount} NFC cards!` });
            setActiveTab('cards');
            fetchData();
        } catch (err) {
            showToast({ type: 'error', message: err.response?.data?.error || 'Generation failed' });
        } finally {
            setGenerating(false);
        }
    };

    const handleUpdateOrder = async (orderId, newStatus) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/nfc/orders/${orderId}`, { status: newStatus });
            showToast({ type: 'success', message: 'Order status updated' });
            fetchData();
        } catch (err) {
            showToast({ type: 'error', message: 'Update failed' });
        }
    };

    // --- Catalog Management ---
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/nfc/catalog/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setCatalogForm(prev => ({ ...prev, imageUrl: data.url }));
            showToast({ type: 'success', message: 'Image uploaded successfully' });
        } catch (err) {
            showToast({ type: 'error', message: 'Image upload failed' });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSaveCatalog = async (e) => {
        e.preventDefault();
        setSavingCatalog(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/nfc/catalog`, catalogForm);
            showToast({ type: 'success', message: 'Product saved to catalog' });
            setShowCatalogForm(false);
            fetchData();
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to save product' });
        } finally {
            setSavingCatalog(false);
        }
    };

    const handleDeleteCatalog = async (id) => {
        if (!window.confirm("Delete this product from catalog?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/nfc/catalog/${id}`);
            showToast({ type: 'success', message: 'Product deleted' });
            fetchData();
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to delete product' });
        }
    };

    const openCreateCatalog = () => {
        setCatalogForm({ id: null, name: '', desc: '', price: '', type: '', imageUrl: '' });
        setShowCatalogForm(true);
    };

    const openEditCatalog = (prod) => {
        setCatalogForm(prod);
        setShowCatalogForm(true);
    };
    // --------------------------

    const exportCsv = () => {
        if (!cards.length) return;
        const csvContent = "data:text/csv;charset=utf-8," 
            + "ID,ShortCode,Batch,Type,Status,TargetURL\n"
            + cards.map(c => `${c.id},${c.shortCode},${c.batchId},${c.type},${c.status},${window.location.origin}/n/${c.shortCode}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `nfc-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Stats
    const totalCards = cards.length;
    const assignedCards = cards.filter(c => c.status === 'assigned').length;
    const unassignedCards = totalCards - assignedCards;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            <AdminHeader><TrialBanner />
                    <ThemeToggle /></AdminHeader>

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            NFC Product Manager
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Generate physical NFC codes and manage user orders.
                        </p>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center"><Database className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Codes</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalCards}</h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl flex items-center justify-center"><CheckCircle className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Linked Cards</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{assignedCards}</h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center"><Tag className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Unassigned Stock</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{unassignedCards}</h3>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 mb-6 overflow-x-auto pb-1">
                    <button onClick={() => setActiveTab('cards')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'cards' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}>
                        NFC Inventory ({totalCards})
                    </button>
                    <button onClick={() => setActiveTab('generate')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'generate' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}>
                        Generate Batch
                    </button>
                    <button onClick={() => setActiveTab('catalog')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'catalog' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}>
                        Store Catalog
                    </button>
                    <button onClick={() => setActiveTab('orders')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}>
                        Customer Orders
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="p-4 md:p-8 space-y-4">
                            <Skeleton height={50} className="dark:opacity-10" />
                            <Skeleton height={50} className="dark:opacity-10" />
                            <Skeleton height={50} className="dark:opacity-10" />
                        </div>
                    ) : activeTab === 'generate' ? (
                        <div className="p-4 md:p-8 max-w-2xl mx-auto">
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4 md:p-6 mb-8 flex gap-4">
                                <Info className="w-6 h-6 text-indigo-500 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">Batch Generation Process</h4>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-400">Create bulk records of physical items. Each item generates a secure 8-character <code>shortCode</code>. Export the generated CSV to provide to your NFC/printing manufacturer.</p>
                                </div>
                            </div>

                            <form onSubmit={handleGenerate} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Number of Codes to Generate</label>
                                    <input type="number" min="1" max="1000" value={genCount} onChange={e => setGenCount(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" required />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Product Type</label>
                                    <select value={genType} onChange={e => setGenType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" required>
                                        <option value="pvc_card">PVC Card</option>
                                        <option value="metal_card">Metal Card (Premium)</option>
                                        <option value="keychain">NFC Keychain</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Batch Identifier</label>
                                    <input type="text" value={genBatch} onChange={e => setGenBatch(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" required />
                                </div>

                                <button type="submit" disabled={generating} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
                                    {generating ? <div className="w-5 h-5 rounded-full border-2 border-indigo-300 border-t-white animate-spin" /> : <Plus className="w-5 h-5" />}
                                    Generate Batch
                                </button>
                            </form>
                        </div>
                    ) : activeTab === 'cards' ? (
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-slate-200 dark:border-white/5 flex justify-end">
                                <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors text-sm">
                                    <Download className="w-4 h-4" />
                                    Export CSV for Printer
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-4 md:px-6 py-4">Short Code</th>
                                            <th className="px-4 md:px-6 py-4">Batch ID</th>
                                            <th className="px-4 md:px-6 py-4">Type</th>
                                            <th className="px-4 md:px-6 py-4">Status</th>
                                            <th className="px-4 md:px-6 py-4">Linked Owner</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {cards.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-4 md:px-6 py-12 text-center text-slate-500">
                                                    No NFC cards generated yet.
                                                </td>
                                            </tr>
                                        ) : cards.map(card => (
                                            <tr key={card.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 md:px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{card.shortCode}</td>
                                                <td className="px-4 md:px-6 py-4 text-slate-500">{card.batchId}</td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{card.type.replace('_', ' ')}</span>
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${card.status === 'assigned' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                        {card.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-4 text-slate-600 dark:text-slate-300">
                                                    {card.owner ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-900 dark:text-white">{card.owner.name}</span>
                                                            <span className="text-xs text-slate-500">{card.vcard?.slug ? `vcard.link/${card.vcard.slug}` : 'No veCard selected'}</span>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : activeTab === 'catalog' ? (
                        <div className="p-4 md:p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Store Catalog</h3>
                                    <p className="text-sm text-slate-500">Manage physical products available for users to buy.</p>
                                </div>
                                <button onClick={openCreateCatalog} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
                                    <Plus className="w-4 h-4" /> Add Product
                                </button>
                            </div>

                            {/* Banner Visibility Toggle & Image Upload */}
                            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-6 shadow-sm">
                                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                    showNfcBanner
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30'
                                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${
                                            showNfcBanner ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                        }`}>
                                            {showNfcBanner ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">NFC Banner in veCard Sidebar</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {showNfcBanner ? 'Banner is currently visible to all users in the veCard section.' : 'Banner is hidden from users.'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleToggleBanner}
                                        disabled={savingBanner}
                                        className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-60 ${
                                            showNfcBanner ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                                            showNfcBanner ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>
                                
                                {showNfcBanner && (
                                    <div className="mt-5 pt-5 border-t border-slate-200 dark:border-white/10">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Custom Banner Image (Optional)</label>
                                        <div className="flex flex-col sm:flex-row items-start gap-4">
                                            <div className="w-full sm:w-48 h-24 bg-slate-100 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                                {nfcBannerImage ? (
                                                    <>
                                                        <img src={nfcBannerImage} className="w-full h-full object-cover" alt="Banner Preview" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <button onClick={handleRemoveBannerImage} className="p-1.5 bg-white/20 hover:bg-red-500/80 text-white rounded-lg backdrop-blur-sm transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                                    Upload a specific promotional image for the NFC banner. If left empty, it will automatically display the first product from the NFC catalog.
                                                </p>
                                                <input type="file" id="nfcBannerUpload" className="hidden" onChange={handleBannerImageUpload} accept="image/*" />
                                                <label htmlFor="nfcBannerUpload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-sm font-bold text-slate-700 dark:text-white rounded-lg transition-colors">
                                                    {uploadingBannerImage ? <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"/> : <ImageIcon className="w-4 h-4"/>}
                                                    {nfcBannerImage ? 'Change Image' : 'Upload Image'}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {catalog.length === 0 ? (
                                <div className="p-4 md:p-12 text-center border border-dashed border-slate-300 dark:border-white/20 rounded-2xl">
                                    <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <h3 className="text-slate-900 dark:text-white font-bold mb-1">No Products in Catalog</h3>
                                    <p className="text-slate-500 text-sm">Add physical cards and keychains for your users to purchase.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {catalog.map(prod => (
                                        <div key={prod.id} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col group relative">
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditCatalog(prod)} className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 shadow-sm hover:text-indigo-500">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteCatalog(prod.id)} className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-red-500 shadow-sm hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="h-40 bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                                {prod.imageUrl ? (
                                                    <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="w-10 h-10 text-slate-400" />
                                                )}
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-slate-900 dark:text-white">{prod.name}</h4>
                                                    <span className="font-black text-indigo-600 dark:text-indigo-400">₹{prod.price}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{prod.desc}</p>
                                                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/10">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded">
                                                        Type: {prod.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-4 md:px-6 py-4">Date</th>
                                        <th className="px-4 md:px-6 py-4">Customer</th>
                                        <th className="px-4 md:px-6 py-4">Product</th>
                                        <th className="px-4 md:px-6 py-4">Shipping / Contact</th>
                                        <th className="px-4 md:px-6 py-4">Status</th>
                                        <th className="px-4 md:px-6 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 md:px-6 py-12 text-center text-slate-500">
                                                No NFC orders received yet.
                                            </td>
                                        </tr>
                                    ) : orders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 md:px-6 py-4 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td className="px-4 md:px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {order.user?.name}
                                            </td>
                                            <td className="px-4 md:px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-indigo-500" />
                                                    <span className="font-medium dark:text-white">{order.quantity}x {order.productType}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 text-slate-500 text-xs max-w-[200px] max-w-full truncate" title={order.shippingAddress}>
                                                {order.shippingAddress}<br/>
                                                <span className="text-slate-400 font-mono">{order.contactNumber}</span>
                                            </td>
                                            <td className="px-4 md:px-6 py-4">
                                                <select 
                                                    value={order.status}
                                                    onChange={(e) => handleUpdateOrder(order.id, e.target.value)}
                                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="processing">Processing</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </td>
                                            <td className="px-4 md:px-6 py-4">
                                                {/* Visual indicator of payment if integrated */}
                                                <span className={`text-[10px] font-bold uppercase ${order.paymentStatus === 'paid' ? 'text-green-500' : 'text-amber-500'}`}>
                                                    {order.paymentStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Catalog Modal */}
            {showCatalogForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 dark:border-white/5">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{catalogForm.id ? 'Edit Product' : 'Add New Product'}</h3>
                            <button onClick={() => setShowCatalogForm(false)} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 p-1.5 rounded-lg"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleSaveCatalog} className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product Image</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                                        {catalogForm.imageUrl ? (
                                            <img src={catalogForm.imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input type="file" id="nfcImgUpload" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                        <label htmlFor="nfcImgUpload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-sm font-bold text-slate-700 dark:text-white rounded-lg transition-colors">
                                            {uploadingImage ? <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"/> : <ImageIcon className="w-4 h-4"/>}
                                            {catalogForm.imageUrl ? 'Change Image' : 'Upload Image'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name</label>
                                <input type="text" value={catalogForm.name} onChange={e => setCatalogForm({...catalogForm, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:text-white" required placeholder="Premium Metal Card" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Price (₹)</label>
                                    <input type="number" min="0" value={catalogForm.price} onChange={e => setCatalogForm({...catalogForm, price: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold dark:text-white" required placeholder="1499" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type Identifier</label>
                                    <select value={catalogForm.type} onChange={e => setCatalogForm({...catalogForm, type: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold dark:text-white" required>
                                        <option value="" disabled>Select Product Type</option>
                                        <option value="pvc_card">PVC Card</option>
                                        <option value="metal_card">Metal Card (Premium)</option>
                                        <option value="keychain">NFC Keychain</option>
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">Links to generated batch type</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                                <textarea value={catalogForm.desc} onChange={e => setCatalogForm({...catalogForm, desc: e.target.value})} rows="3" className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:text-white" required placeholder="Matte black stainless steel..." />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCatalogForm(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl">Cancel</button>
                                <button type="submit" disabled={savingCatalog} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                    {savingCatalog ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/> : null}
                                    Save Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
