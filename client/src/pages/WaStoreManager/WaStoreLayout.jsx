import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Package, LayoutTemplate, Settings, ArrowLeft, ExternalLink, Phone, Globe, Info, ShoppingBag, Tag, FileText, Search, BarChart2, X, Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaStoreLayout() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [coverUploading, setCoverUploading] = useState(false);
    const [coverHover, setCoverHover] = useState(false);
    const [coverDragOver, setCoverDragOver] = useState(false);
    const coverInputRef = useRef(null);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                const myStore = res.data.find(s => s.id === id);
                setStore(myStore);
            } catch (error) {
                toast.error("Failed to load store details");
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [id]);

    // ── Cover image upload handler ──
    const handleCoverFile = async (file) => {
        if (!file) return;
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        if (!allowed.includes(ext)) {
            toast.error(`Invalid format. Allowed: ${allowed.join(', ')}`);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File too large. Max 5 MB.');
            return;
        }

        setCoverUploading(true);
        try {
            const form = new FormData();
            form.append('cover', file);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/upload/cover`, form, {
                headers: { 'x-auth-token': localStorage.getItem('token'), 'Content-Type': 'multipart/form-data' }
            });
            const newUrl = res.data.url;

            // Save to store immediately
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${id}`, { coverImage: newUrl }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setStore(prev => ({ ...prev, coverImage: newUrl }));
            toast.success('Cover image updated!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Cover upload failed');
        } finally {
            setCoverUploading(false);
        }
    };

    const removeCoverImage = async (e) => {
        e.stopPropagation();
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${id}`, { coverImage: '' }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setStore(prev => ({ ...prev, coverImage: '' }));
            toast.success('Cover image removed');
        } catch {
            toast.error('Failed to remove cover image');
        }
    };

    const navItems = [
        { path: `/wastore/${id}/analytics`, icon: <BarChart2 className="w-5 h-5" />, label: 'Analytics' },
        { path: `/wastore/${id}/details`, icon: <Info className="w-5 h-5" />, label: 'Basic Details' },
        { path: `/wastore/${id}/products`, icon: <Package className="w-5 h-5" />, label: 'Products' },
        { path: `/wastore/${id}/categories`, icon: <Tag className="w-5 h-5" />, label: 'Categories' },
        { path: `/wastore/${id}/orders`, icon: <ShoppingBag className="w-5 h-5" />, label: 'Orders' },
        { path: `/wastore/${id}/coupons`, icon: <Tag className="w-5 h-5" />, label: 'Promo Codes' },
        { path: `/wastore/${id}/seo`, icon: <Search className="w-5 h-5" />, label: 'SEO & Tracking' },
        { path: `/wastore/${id}/themes`, icon: <LayoutTemplate className="w-5 h-5" />, label: 'Themes' },
        { path: `/wastore/${id}/policies`, icon: <FileText className="w-5 h-5" />, label: 'Policies' },
        { path: `/wastore/${id}/settings`, icon: <Settings className="w-5 h-5" />, label: 'Settings' },
    ];

    if (loading) return <div className="p-8 animate-pulse text-slate-500">Loading store manager...</div>;
    if (!store) return <div className="p-8 text-rose-500">Store not found</div>;

    const storeUrl = `${window.location.origin}/store/${store.slug}`;

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
            {/* Animated Gradient CSS */}
            <style>{`
                @keyframes coverGradientShift {
                    0%   { background-position: 0% 50%; }
                    25%  { background-position: 100% 50%; }
                    50%  { background-position: 100% 100%; }
                    75%  { background-position: 0% 100%; }
                    100% { background-position: 0% 50%; }
                }
                .animated-cover-gradient {
                    background: linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe, #00f2fe, #667eea);
                    background-size: 400% 400%;
                    animation: coverGradientShift 12s ease infinite;
                }
            `}</style>

            {/* Top Detail Menu / Header */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm relative">
                {/* Cover Image — Interactive Upload Zone */}
                <div
                    className="h-32 md:h-48 w-full relative cursor-pointer group"
                    onMouseEnter={() => setCoverHover(true)}
                    onMouseLeave={() => { setCoverHover(false); setCoverDragOver(false); }}
                    onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true); }}
                    onDragLeave={() => setCoverDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setCoverDragOver(false); if (e.dataTransfer.files?.[0]) handleCoverFile(e.dataTransfer.files[0]); }}
                    onClick={() => !coverUploading && coverInputRef.current?.click()}
                >
                    {/* Background: image or animated gradient */}
                    {store.coverImage ? (
                        <img src={store.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full animated-cover-gradient" />
                    )}

                    {/* Hover / Drag overlay */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                        coverDragOver
                            ? 'bg-indigo-600/60 backdrop-blur-sm'
                            : coverHover
                                ? 'bg-black/40 backdrop-blur-[2px]'
                                : 'bg-transparent pointer-events-none'
                    }`}>
                        {coverUploading ? (
                            <Loader2 className={`w-8 h-8 text-white animate-spin ${!coverHover && !coverDragOver ? 'opacity-0' : ''}`} />
                        ) : (
                            <div className={`flex flex-col items-center gap-1.5 transition-opacity duration-300 ${coverHover || coverDragOver ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                                    <Camera className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-white text-sm font-semibold drop-shadow-md">
                                    {coverDragOver ? 'Drop to upload' : store.coverImage ? 'Change Cover Image' : 'Upload Cover Image'}
                                </p>
                                <p className="text-white/70 text-xs drop-shadow-md">
                                    Recommended: 1200×400px · Max 5 MB
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Remove button — only when image exists */}
                    {store.coverImage && !coverUploading && (
                        <button
                            onClick={removeCoverImage}
                            className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                            title="Remove cover image"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {/* Bottom gradient for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                    {/* Hidden file input */}
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleCoverFile(e.target.files[0]); e.target.value = ''; }}
                    />
                </div>
                
                {/* Store Details */}
                <div className="relative px-6 pb-6 sm:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-12 sm:-mt-16 mb-4">
                        {store.logo ? (
                            <img src={store.logo} alt="Logo" className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white dark:border-surface-dark shadow-md bg-white" />
                        ) : (
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white dark:border-surface-dark shadow-md bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500 font-bold text-3xl">
                                {store.name.charAt(0)}
                            </div>
                        )}
                        <div className="flex-1 space-y-1 mt-4 sm:mt-0 pt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">
                                        {store.name}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${store.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                            {store.isActive ? 'Active' : 'Draft'}
                                        </span>
                                        <span className="text-sm text-slate-500 flex items-center gap-1">
                                            <Globe className="w-4 h-4" /> /{store.slug}
                                        </span>
                                    </div>
                                </div>
                                <a 
                                    href={storeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors text-sm shadow-sm"
                                >
                                    <ExternalLink className="w-4 h-4" /> View Live Store
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-sm">
                            <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
                                <Phone className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900 dark:text-slate-200">WhatsApp</p>
                                <p>{store.whatsappNumber || 'Not set'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-sm">
                            <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
                                <LayoutTemplate className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900 dark:text-slate-200">Active Theme</p>
                                <p className="capitalize">{store.themeId || 'Vogue'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-sm">
                            <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
                                <Package className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900 dark:text-slate-200">Currency</p>
                                <p>{store.currency}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout Below Header */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <button 
                        onClick={() => navigate('/wastore')}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors font-medium px-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Stores
                    </button>
                    
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-3 sticky top-24 shadow-sm">
                        <nav className="flex flex-col gap-1">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                                            isActive 
                                                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                                        }`
                                    }
                                >
                                    {item.icon}
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
