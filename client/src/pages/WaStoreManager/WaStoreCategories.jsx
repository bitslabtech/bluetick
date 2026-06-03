import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
    Tag, Plus, Trash2, Edit2, Check, X, AlertCircle,
    Image as ImageIcon, Loader2, Upload, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Category Modal ────────────────────────────────────────────────────────────
function CategoryModal({ mode, initial, onSave, onClose }) {
    const [name, setName] = useState(initial?.name || '');
    const [imageUrl, setImageUrl] = useState(initial?.image || '');
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('category', file);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/upload/category`, formData);
            setImageUrl(res.data.url);
        } catch {
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const handleSave = () => {
        const trimmed = name.trim();
        if (!trimmed) { toast.error('Category name is required'); return; }
        onSave({ name: trimmed, image: imageUrl });
    };

    const resolvedImage = imageUrl
        ? (imageUrl.startsWith('http') ? imageUrl : `${import.meta.env.VITE_API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-6 py-5 border-b border-slate-100 dark:border-white/10">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {mode === 'add' ? 'Add New Category' : 'Edit Category'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 md:p-6 space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Category Image <span className="font-normal text-slate-400">(optional)</span>
                        </label>

                        {resolvedImage ? (
                            /* Image preview with change / remove buttons */
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-800 group">
                                <img src={resolvedImage} alt="Category" className="w-full h-full object-cover" />
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                                {/* Overlay actions */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <Camera className="w-4 h-4" /> Change
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImageUrl('')}
                                        className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-rose-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Empty upload area */
                            <label
                                className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all group"
                            >
                                {uploading ? (
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                ) : (
                                    <>
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                                            <Upload className="w-7 h-7 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                        <p className="font-semibold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            Click to upload image
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5 MB</p>
                                    </>
                                )}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        )}
                        {/* Hidden file input for "Change" button on existing image */}
                        {resolvedImage && (
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        )}
                    </div>

                    {/* Name input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Category Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
                            placeholder="e.g. Men's Wear, Electronics…"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 px-4 md:px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || uploading}
                        className="w-full sm:w-auto px-4 md:px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {mode === 'add' ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        {mode === 'add' ? 'Add Category' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function WaStoreCategories() {
    const { storeId } = useOutletContext();
    const [categories, setCategories]       = useState([]);
    const [categoryImages, setCategoryImages] = useState({});
    const [productCounts, setProductCounts] = useState({});
    const [loading, setLoading]             = useState(true);
    const [saving, setSaving]               = useState(false);

    // Modal state
    const [modal, setModal] = useState(null); // { mode: 'add' | 'edit', idx?: number }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [storesRes, productsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/products`)
                ]);
                const myStore = storesRes.data.find(s => s.id === storeId);
                let loadedCategories = myStore?.categories || [];
                if (typeof loadedCategories === 'string') {
                    try { loadedCategories = JSON.parse(loadedCategories); } catch { loadedCategories = []; }
                }
                let loadedImages = myStore?.categoryImages || {};
                if (typeof loadedImages === 'string') {
                    try { loadedImages = JSON.parse(loadedImages); } catch { loadedImages = {}; }
                }

                // Count products per category
                const counts = {};
                (productsRes.data || []).forEach(p => {
                    if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
                });

                // Auto-merge categories from products that aren't in the store list
                const productCats = Object.keys(counts);
                const mergedCats = [...new Set([...loadedCategories, ...productCats])];

                if (mergedCats.length > loadedCategories.length) {
                    axios.put(
                        `${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`,
                        { categories: mergedCats, categoryImages: loadedImages }
                    ).catch(console.error);
                }

                setCategories(mergedCats);
                setCategoryImages(loadedImages);
                setProductCounts(counts);
            } catch {
                toast.error('Failed to load categories');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [storeId]);

    const persist = async (newList, newImages) => {
        setSaving(true);
        try {
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`,
                { categories: newList, categoryImages: newImages }
            );
        } catch {
            toast.error('Failed to save categories');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveModal = ({ name, image }) => {
        if (modal.mode === 'add') {
            if (categories.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
                toast.error('This category already exists');
                return;
            }
            const newList = [...categories, name];
            const newImages = { ...categoryImages, ...(image ? { [name]: image } : {}) };
            setCategories(newList);
            setCategoryImages(newImages);
            persist(newList, newImages);
            toast.success(`"${name}" added!`);
        } else {
            const oldName = categories[modal.idx];
            const newList = categories.map((c, i) => i === modal.idx ? name : c);
            // Migrate image key if name changed
            const newImages = { ...categoryImages };
            if (oldName !== name) {
                if (newImages[oldName]) { newImages[name] = newImages[oldName]; delete newImages[oldName]; }
            }
            if (image) newImages[name] = image;
            else delete newImages[name];
            setCategories(newList);
            setCategoryImages(newImages);
            persist(newList, newImages);
            toast.success('Category updated!');
        }
        setModal(null);
    };

    const removeCategory = (idx) => {
        const removed = categories[idx];
        const newList = categories.filter((_, i) => i !== idx);
        const newImages = { ...categoryImages };
        delete newImages[removed];
        setCategories(newList);
        setCategoryImages(newImages);
        persist(newList, newImages);
        if (productCounts[removed]) {
            toast(`⚠️ ${productCounts[removed]} product(s) still tagged as "${removed}" — they'll appear as Uncategorized.`, { duration: 4000 });
        } else {
            toast.success(`"${removed}" removed`);
        }
    };

    const moveUp = (idx) => {
        if (idx === 0) return;
        const newList = [...categories];
        [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
        setCategories(newList);
        persist(newList, categoryImages);
    };

    const moveDown = (idx) => {
        if (idx === categories.length - 1) return;
        const newList = [...categories];
        [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
        setCategories(newList);
        persist(newList, categoryImages);
    };

    const resolveImg = (url) => url
        ? (url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url.startsWith('/') ? '' : '/'}${url}`)
        : null;

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
    );

    return (
        <div className="space-y-6 pb-7 sm:pb-20 max-w-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Tag className="w-5 h-5 text-indigo-500" /> Product Categories
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Organize your products and add images to each category for a visual storefront filter.
                    </p>
                </div>
                <button
                    onClick={() => setModal({ mode: 'add' })}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shrink-0"
                >
                    <Plus className="w-4 h-4" /> Add Category
                </button>
            </div>

            {/* Category List */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        All Categories
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                            {categories.length}
                        </span>
                    </h3>
                    {saving && <span className="text-xs text-indigo-500 animate-pulse font-medium">Saving…</span>}
                </div>

                {categories.length === 0 ? (
                    <div className="text-center py-16 px-4 md:px-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Tag className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">No categories yet</p>
                        <p className="text-slate-400 text-sm mt-1 mb-5">Add your first category to organize your products.</p>
                        <button
                            onClick={() => setModal({ mode: 'add' })}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add First Category
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {categories.map((cat, idx) => {
                            const img = resolveImg(categoryImages[cat]);
                            return (
                                <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] group transition-colors">

                                    {/* Order buttons */}
                                    <div className="flex flex-col gap-0.5 opacity-100 md:opacity-30 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveUp(idx)} disabled={idx === 0}
                                            className="p-0.5 hover:text-indigo-500 disabled:opacity-20 disabled:cursor-not-allowed">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button onClick={() => moveDown(idx)} disabled={idx === categories.length - 1}
                                            className="p-0.5 hover:text-indigo-500 disabled:opacity-20 disabled:cursor-not-allowed">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Index */}
                                    <span className="text-xs font-bold text-slate-400 w-4 md:w-5 text-center shrink-0">{idx + 1}</span>

                                    {/* Category image thumbnail */}
                                    <div
                                        className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
                                        title="Click Edit to change image"
                                    >
                                        {img ? (
                                            <img src={img} alt={cat} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                        )}
                                    </div>

                                    {/* Name & count */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 dark:text-white truncate">{cat}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {productCounts[cat] > 0
                                                ? `${productCounts[cat]} product${productCounts[cat] !== 1 ? 's' : ''}`
                                                : 'No products yet'}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="w-full sm:w-auto flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2 sm:mt-0">
                                        <button
                                            onClick={() => setModal({ mode: 'edit', idx })}
                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 flex-1 sm:flex-none text-slate-600 md:text-slate-500 bg-slate-100 md:bg-transparent hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:bg-white/5 md:dark:bg-transparent dark:hover:bg-indigo-900/20 rounded-lg text-xs font-semibold transition-all"
                                            title="Edit name & image"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            <span className="md:hidden">Edit</span>
                                        </button>
                                        <button
                                            onClick={() => removeCategory(idx)}
                                            className="flex items-center justify-center gap-1.5 p-1.5 flex-1 sm:flex-none text-rose-500 md:text-slate-400 bg-rose-50 md:bg-transparent hover:text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20 md:dark:bg-transparent dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="md:hidden text-xs font-semibold">Delete</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 text-sm text-indigo-700 dark:text-indigo-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold mb-0.5">How categories work</p>
                    <p className="text-indigo-600/80 dark:text-indigo-300/80">
                        Categories appear as filter buttons on your public storefront. Adding an image makes them display
                        as visual tiles for a richer browsing experience. Use the <strong>Edit</strong> button on any
                        category to update its name or image at any time.
                    </p>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {modal && (
                <CategoryModal
                    mode={modal.mode}
                    initial={modal.mode === 'edit' ? {
                        name: categories[modal.idx],
                        image: categoryImages[categories[modal.idx]] || ''
                    } : null}
                    onSave={handleSaveModal}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
}
