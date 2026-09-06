import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
    Tag, Plus, Trash2, Edit2, Check, X, AlertCircle,
    Image as ImageIcon, Loader2, Upload, Camera, RefreshCw, FolderOpen,
    ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import MediaPickerModal from '../../components/MediaPickerModal';

// ─── Category / Subcategory Modal ─────────────────────────────────────────────
function CategoryModal({ mode, initial, onSave, onClose, onOpenPicker, parentCategory = null, isSubcategory = false }) {
    const [name, setName] = useState(initial?.name || '');
    const [imageUrl, setImageUrl] = useState(initial?.image || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [metaTitle, setMetaTitle] = useState(initial?.metaTitle || '');
    const [metaDesc, setMetaDesc] = useState(initial?.metaDesc || '');
    useEffect(() => {
        const handleSelect = (e) => setImageUrl(e.detail.url);
        window.addEventListener('mediapicker:select', handleSelect);
        return () => window.removeEventListener('mediapicker:select', handleSelect);
    }, []);

    const handleSave = () => {
        const trimmed = name.trim();
        if (!trimmed) { toast.error(`${isSubcategory ? 'Subcategory' : 'Category'} name is required`); return; }
        if (!imageUrl) { toast.error(`${isSubcategory ? 'Subcategory' : 'Category'} image is required`); return; }
        onSave({ 
            name: trimmed, 
            image: imageUrl,
            description: description.trim(),
            metaTitle: metaTitle.trim(),
            metaDesc: metaDesc.trim()
        });
    };

    const resolvedImage = imageUrl
        ? (imageUrl.startsWith('http') ? imageUrl : `${import.meta.env.VITE_API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-6 py-5 border-b border-slate-100 dark:border-white/10">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            {isSubcategory
                                ? (mode === 'add' ? `Add Subcategory to "${parentCategory}"` : `Edit Subcategory "${initial?.name || ''}"`)
                                : (mode === 'add' ? 'Add New Category' : 'Edit Category')
                            }
                        </h3>
                        {isSubcategory && (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                                Parent Category: {parentCategory}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            {/* Name input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {isSubcategory ? 'Subcategory Name' : 'Category Name'} <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
                                    placeholder={isSubcategory ? "e.g. T-Shirts, Polo Shirts, Running Shoes…" : "e.g. Men's Wear, Electronics…"}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                />
                            </div>
                            
                            {/* Description input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Description <span className="font-normal text-slate-400">(optional)</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder={`A brief description of this ${isSubcategory ? 'subcategory' : 'category'}...`}
                                    rows="3"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400 resize-none"
                                />
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {isSubcategory ? 'Subcategory Image' : 'Category Image'} <span className="text-rose-500">*</span>
                            </label>

                            {resolvedImage ? (
                                /* Image preview with change / remove buttons */
                                <div className="relative w-full h-full min-h-[140px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-800 group">
                                    <img src={resolvedImage} alt={name || 'Category'} className="w-full h-full object-cover" />
                                    {/* Overlay actions */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                                        {onOpenPicker && (
                                            <button
                                                type="button"
                                                onClick={onOpenPicker}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-800 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <Camera className="w-3 h-3" /> Change
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setImageUrl('')}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-rose-600 transition-colors"
                                        >
                                            <X className="w-3 h-3" /> Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Empty upload area */
                                <>
                                    {onOpenPicker && (
                                        <button
                                            type="button"
                                            onClick={onOpenPicker}
                                            className="flex flex-col items-center justify-center w-full h-full min-h-[140px] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-2 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                                                <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <p className="font-semibold text-sm text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                Add Image
                                            </p>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-white/10 my-2 pt-4">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">SEO Settings (Optional)</h4>
                        
                        {/* Meta Title */}
                        <div className="space-y-2 mb-4">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Meta Title
                            </label>
                            <input
                                type="text"
                                value={metaTitle}
                                onChange={e => setMetaTitle(e.target.value)}
                                placeholder={`e.g. Buy ${name || (isSubcategory ? 'Subcategory' : 'Category')} Online`}
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
                            />
                        </div>

                        {/* Meta Description */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Meta Description
                            </label>
                            <textarea
                                value={metaDesc}
                                onChange={e => setMetaDesc(e.target.value)}
                                placeholder="Description for search engines..."
                                rows="2"
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 px-4 md:px-6 py-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/50 rounded-b-3xl mt-auto">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="w-full sm:w-auto px-4 md:px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {mode === 'add' ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        {mode === 'add' ? (isSubcategory ? 'Add Subcategory' : 'Add Category') : 'Save Changes'}
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
    const [hiddenCategories, setHiddenCategories] = useState([]);
    const [categoryDetails, setCategoryDetails] = useState({});
    const [categoryAutoplay, setCategoryAutoplay] = useState(false);
    const [subcategories, setSubcategories] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [productCounts, setProductCounts] = useState({});
    const [subCategoryCounts, setSubCategoryCounts] = useState({});
    const [loading, setLoading]             = useState(true);
    const [saving, setSaving]               = useState(false);

    // Modal state for parent category
    const [modal, setModal] = useState(null); // { mode: 'add' | 'edit', idx?: number }

    // Modal state for subcategory
    const [subModal, setSubModal] = useState(null); // { mode: 'add' | 'edit', parentCategory: string, idx?: number, initial?: object }

    // ── Media Picker state ────────────────────────────────────────────────────
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerConfig, setPickerConfig] = useState({ allowedTypes: 'image', onSelect: null });
    const openPicker = (config) => { setPickerConfig(config); setPickerOpen(true); };
    const closePicker = () => setPickerOpen(false);

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
                let loadedHidden = myStore?.hiddenCategories || [];
                if (typeof loadedHidden === 'string') {
                    try { loadedHidden = JSON.parse(loadedHidden); } catch { loadedHidden = []; }
                }
                let loadedDetails = myStore?.categoryDetails || {};
                if (typeof loadedDetails === 'string') {
                    try { loadedDetails = JSON.parse(loadedDetails); } catch { loadedDetails = {}; }
                }
                let loadedSubcategories = myStore?.subcategories || {};
                if (typeof loadedSubcategories === 'string') {
                    try { loadedSubcategories = JSON.parse(loadedSubcategories); } catch { loadedSubcategories = {}; }
                }
                if (!loadedSubcategories || typeof loadedSubcategories !== 'object' || Array.isArray(loadedSubcategories)) {
                    loadedSubcategories = {};
                }

                const loadedAutoplay = myStore?.categoryAutoplay === true || myStore?.categoryAutoplay === 'true';

                // Count products per category
                const counts = {};
                const subCounts = {};
                (productsRes.data || []).forEach(p => {
                    if (p.category) {
                        counts[p.category] = (counts[p.category] || 0) + 1;
                        if (Array.isArray(p.subCategories)) {
                            p.subCategories.forEach(sub => {
                                const key = `${p.category}:::${sub}`;
                                subCounts[key] = (subCounts[key] || 0) + 1;
                            });
                        }
                    }
                });

                // Auto-merge categories from products that aren't in the store list
                const productCats = Object.keys(counts);
                const mergedCats = [...new Set([...loadedCategories, ...productCats])];

                if (mergedCats.length > loadedCategories.length) {
                    axios.put(
                        `${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`,
                        { categories: mergedCats, categoryImages: loadedImages, hiddenCategories: loadedHidden, categoryDetails: loadedDetails, subcategories: loadedSubcategories }
                    ).catch(console.error);
                }

                setCategories(mergedCats);
                setCategoryImages(loadedImages);
                setHiddenCategories(loadedHidden);
                setCategoryDetails(loadedDetails);
                setSubcategories(loadedSubcategories);
                setCategoryAutoplay(loadedAutoplay);
                setProductCounts(counts);
                setSubCategoryCounts(subCounts);
            } catch {
                toast.error('Failed to load categories');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [storeId]);

    const persist = async (newList, newImages, newHidden, newDetails, newSubcategories = subcategories, autoplay = categoryAutoplay) => {
        setSaving(true);
        try {
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`,
                {
                    categories: newList,
                    categoryImages: newImages,
                    hiddenCategories: newHidden,
                    categoryDetails: newDetails,
                    subcategories: newSubcategories,
                    categoryAutoplay: autoplay
                }
            );
        } catch {
            toast.error('Failed to save categories');
        } finally {
            setSaving(false);
        }
    };

    const handleAutoplayToggle = async () => {
        const newVal = !categoryAutoplay;
        setCategoryAutoplay(newVal);
        await persist(categories, categoryImages, hiddenCategories, categoryDetails, subcategories, newVal);
        toast.success(newVal ? 'Autoplay enabled on mobile' : 'Autoplay disabled');
    };

    const toggleCategoryExpand = (cat) => {
        setExpandedCategories(prev => ({
            ...prev,
            [cat]: !prev[cat]
        }));
    };

    const handleSaveModal = ({ name, image, description, metaTitle, metaDesc }) => {
        if (modal.mode === 'add') {
            if (categories.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
                toast.error('This category already exists');
                return;
            }
            const newList = [...categories, name];
            const newImages = { ...categoryImages, ...(image ? { [name]: image } : {}) };
            const newDetails = { ...categoryDetails };
            if (description || metaTitle || metaDesc) {
                newDetails[name] = { description, metaTitle, metaDesc };
            }
            setCategories(newList);
            setCategoryImages(newImages);
            setCategoryDetails(newDetails);
            persist(newList, newImages, hiddenCategories, newDetails, subcategories);
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
            
            // Migrate hidden list if name changed
            let newHidden = [...hiddenCategories];
            let newDetails = { ...categoryDetails };
            let newSubcats = { ...subcategories };
            
            if (oldName !== name) {
                if (newHidden.includes(oldName)) {
                    newHidden = newHidden.map(h => h === oldName ? name : h);
                }
                if (newDetails[oldName]) {
                    newDetails[name] = newDetails[oldName];
                    delete newDetails[oldName];
                }
                if (newSubcats[oldName]) {
                    newSubcats[name] = newSubcats[oldName];
                    delete newSubcats[oldName];
                }
            }
            
            // Update details
            if (description || metaTitle || metaDesc) {
                newDetails[name] = { description, metaTitle, metaDesc };
            } else {
                delete newDetails[name];
            }

            setCategories(newList);
            setCategoryImages(newImages);
            setHiddenCategories(newHidden);
            setCategoryDetails(newDetails);
            setSubcategories(newSubcats);
            persist(newList, newImages, newHidden, newDetails, newSubcats);
            toast.success('Category updated!');
        }
        setModal(null);
    };

    const removeCategory = (idx) => {
        const removed = categories[idx];
        const newList = categories.filter((_, i) => i !== idx);
        const newImages = { ...categoryImages };
        delete newImages[removed];
        const newHidden = hiddenCategories.filter(c => c !== removed);
        const newDetails = { ...categoryDetails };
        delete newDetails[removed];
        const newSubcats = { ...subcategories };
        delete newSubcats[removed];

        setCategories(newList);
        setCategoryImages(newImages);
        setHiddenCategories(newHidden);
        setCategoryDetails(newDetails);
        setSubcategories(newSubcats);
        persist(newList, newImages, newHidden, newDetails, newSubcats);
        if (productCounts[removed]) {
            toast(`⚠️ ${productCounts[removed]} product(s) still tagged as "${removed}" — they'll appear as Uncategorized.`, { duration: 4000 });
        } else {
            toast.success(`"${removed}" removed`);
        }
    };

    const handleSaveSubModal = ({ name, image, description, metaTitle, metaDesc }) => {
        if (!subModal) return;
        const parent = subModal.parentCategory;
        const currentList = Array.isArray(subcategories[parent]) ? [...subcategories[parent]] : [];

        if (subModal.mode === 'add') {
            if (currentList.some(s => s.name.toLowerCase() === name.toLowerCase())) {
                toast.error(`"${name}" subcategory already exists in ${parent}`);
                return;
            }
            const updatedSubList = [...currentList, { name, image, description, metaTitle, metaDesc }];
            const updatedSubcats = { ...subcategories, [parent]: updatedSubList };
            setSubcategories(updatedSubcats);
            persist(categories, categoryImages, hiddenCategories, categoryDetails, updatedSubcats);
            toast.success(`Subcategory "${name}" added to ${parent}!`);
        } else {
            const updatedSubList = currentList.map((s, i) => i === subModal.idx ? { name, image, description, metaTitle, metaDesc } : s);
            const updatedSubcats = { ...subcategories, [parent]: updatedSubList };
            setSubcategories(updatedSubcats);
            persist(categories, categoryImages, hiddenCategories, categoryDetails, updatedSubcats);
            toast.success(`Subcategory "${name}" updated!`);
        }
        setSubModal(null);
    };

    const removeSubcategory = (parent, subIdx) => {
        const currentList = Array.isArray(subcategories[parent]) ? [...subcategories[parent]] : [];
        const subToRemove = currentList[subIdx];
        if (!subToRemove) return;

        const updatedSubList = currentList.filter((_, i) => i !== subIdx);
        const updatedSubcats = { ...subcategories, [parent]: updatedSubList };
        setSubcategories(updatedSubcats);
        persist(categories, categoryImages, hiddenCategories, categoryDetails, updatedSubcats);

        const count = subCategoryCounts[`${parent}:::${subToRemove.name}`] || 0;
        if (count > 0) {
            toast(`⚠️ ${count} product(s) were tagged with "${subToRemove.name}".`, { duration: 4000 });
        } else {
            toast.success(`"${subToRemove.name}" removed`);
        }
    };

    const moveUp = (idx) => {
        if (idx === 0) return;
        const newList = [...categories];
        [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
        setCategories(newList);
        persist(newList, categoryImages, hiddenCategories, categoryDetails, subcategories);
    };

    const moveDown = (idx) => {
        if (idx === categories.length - 1) return;
        const newList = [...categories];
        [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
        setCategories(newList);
        persist(newList, categoryImages, hiddenCategories, categoryDetails, subcategories);
    };

    const resolveImg = (url) => url
        ? (url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url.startsWith('/') ? '' : '/'}${url}`)
        : null;

    return (
        <div className="space-y-6 pb-7 sm:pb-20 w-full max-w-5xl">
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

            {/* ─── AUTOPLAY TOGGLE ─── */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${categoryAutoplay ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-white/5'}`}>
                            <RefreshCw className={`w-5 h-5 ${categoryAutoplay ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">Category Autoplay</p>
                            <p className="text-xs text-slate-500 mt-0.5">Auto-scroll categories on mobile every 3.5 seconds</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAutoplayToggle}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                            categoryAutoplay ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/10'
                        }`}
                        title={categoryAutoplay ? 'Click to disable autoplay' : 'Click to enable autoplay'}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            categoryAutoplay ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>
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

                {loading ? (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 animate-pulse">
                                {/* Up/down arrows skeleton */}
                                <div className="w-4 h-8 bg-slate-200 dark:bg-slate-700 rounded-sm shrink-0" />
                                {/* Image skeleton */}
                                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0" />
                                {/* Title and text skeleton */}
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                                    <div className="w-48 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                                </div>
                                {/* Status toggle skeleton */}
                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0" />
                                {/* Buttons skeleton */}
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0" />
                                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-16 px-4 md:px-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Tag className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">No categories yet</p>
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
                            const catSubList = subcategories[cat] || [];
                            const isExpanded = !!expandedCategories[cat];
                            return (
                                <div key={idx} className="transition-colors">
                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] group transition-colors">

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
                                        <div className="w-full sm:w-auto flex items-center justify-end gap-2 shrink-0 mt-2 sm:mt-0">
                                            {/* Subcategories toggle button */}
                                            <button
                                                onClick={() => toggleCategoryExpand(cat)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                    catSubList.length > 0
                                                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
                                                }`}
                                                title="Manage Subcategories"
                                            >
                                                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>{catSubList.length} Subcategor{catSubList.length === 1 ? 'y' : 'ies'}</span>
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const newHidden = hiddenCategories.includes(cat) 
                                                        ? hiddenCategories.filter(c => c !== cat)
                                                        : [...hiddenCategories, cat];
                                                    setHiddenCategories(newHidden);
                                                    persist(categories, categoryImages, newHidden, categoryDetails, subcategories);
                                                }}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                    hiddenCategories.includes(cat) 
                                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' 
                                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}
                                                title={hiddenCategories.includes(cat) ? "Hidden from Landing Page. Click to show." : "Visible on Landing Page. Click to hide."}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${hiddenCategories.includes(cat) ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                {hiddenCategories.includes(cat) ? 'Hidden' : 'Visible'}
                                            </button>
                                            
                                            <div className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
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
                                    </div>

                                    {/* ── Subcategories Expandable Section ── */}
                                    {isExpanded && (
                                        <div className="px-4 py-4 bg-slate-50/70 dark:bg-zinc-900/40 border-t border-slate-100 dark:border-white/5 pl-8 sm:pl-16 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                                    Subcategories of {cat}
                                                </h4>
                                                <button
                                                    onClick={() => setSubModal({ mode: 'add', parentCategory: cat })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Add Subcategory
                                                </button>
                                            </div>

                                            {catSubList.length === 0 ? (
                                                <div className="text-center py-6 px-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white/60 dark:bg-zinc-800/40">
                                                    <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500">
                                                        <FolderOpen className="w-5 h-5" />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No subcategories in "{cat}" yet</p>
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 mb-3">Add subcategories like T-Shirts, Polos, or Jeans under this parent category.</p>
                                                    <button
                                                        onClick={() => setSubModal({ mode: 'add', parentCategory: cat })}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" /> Add First Subcategory
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {catSubList.map((sub, subIdx) => {
                                                        const subImg = resolveImg(sub.image);
                                                        const countKey = `${cat}:::${sub.name}`;
                                                        const count = subCategoryCounts[countKey] || 0;
                                                        return (
                                                            <div
                                                                key={subIdx}
                                                                className="flex items-center gap-3 p-2.5 bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-white/10 rounded-xl shadow-xs group/sub hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all"
                                                            >
                                                                <div className="shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 flex items-center justify-center">
                                                                    {subImg ? (
                                                                        <img src={subImg} alt={sub.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <ImageIcon className="w-4 h-4 text-slate-400" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{sub.name}</p>
                                                                    <p className="text-[11px] text-slate-400">
                                                                        {count > 0 ? `${count} product${count !== 1 ? 's' : ''}` : 'No products'}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => setSubModal({ mode: 'edit', parentCategory: cat, idx: subIdx, initial: sub })}
                                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                                                                        title="Edit Subcategory"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => removeSubcategory(cat, subIdx)}
                                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                                                        title="Delete Subcategory"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                    <p className="font-semibold mb-0.5">How categories and subcategories work</p>
                    <p className="text-indigo-600/80 dark:text-indigo-300/80">
                        Categories and subcategories organize your catalog and provide visual navigation in your store. Subcategories require both a name and an image (just like parent categories) and let customers drill down into specific collections.
                    </p>
                </div>
            </div>

            {/* Parent Category Modal */}
            {modal && (
                <CategoryModal
                    mode={modal.mode}
                    initial={modal.mode === 'edit' ? {
                        name: categories[modal.idx],
                        image: categoryImages[categories[modal.idx]] || '',
                        description: categoryDetails[categories[modal.idx]]?.description || '',
                        metaTitle: categoryDetails[categories[modal.idx]]?.metaTitle || '',
                        metaDesc: categoryDetails[categories[modal.idx]]?.metaDesc || ''
                    } : null}
                    onSave={handleSaveModal}
                    onClose={() => setModal(null)}
                    onOpenPicker={() => openPicker({
                        allowedTypes: 'image',
                        multiple: false,
                        title: 'Select Category Image',
                        onSelect: (url) => {
                            closePicker();
                            window.dispatchEvent(new CustomEvent('mediapicker:select', { detail: { url } }));
                        }
                    })}
                />
            )}

            {/* Subcategory Modal */}
            {subModal && (
                <CategoryModal
                    mode={subModal.mode}
                    isSubcategory={true}
                    parentCategory={subModal.parentCategory}
                    initial={subModal.mode === 'edit' ? subModal.initial : null}
                    onSave={handleSaveSubModal}
                    onClose={() => setSubModal(null)}
                    onOpenPicker={() => openPicker({
                        allowedTypes: 'image',
                        multiple: false,
                        title: `Select Subcategory Image (${subModal.parentCategory})`,
                        onSelect: (url) => {
                            closePicker();
                            window.dispatchEvent(new CustomEvent('mediapicker:select', { detail: { url } }));
                        }
                    })}
                />
            )}



            {/* ── Media Picker Modal ─────────────────────────────────────── */}
            <MediaPickerModal
                isOpen={pickerOpen}
                onClose={closePicker}
                onSelect={(url) => { if (pickerConfig.onSelect) pickerConfig.onSelect(url); }}
                accessMode="restricted"
                allowedTypes={pickerConfig.allowedTypes || 'image'}
                multiple={false}
                title={pickerConfig.title || 'Select Media'}
                mimeConstraints={pickerConfig.mimeConstraints || null}
                storeId={storeId}
                mediaFolder="categories"
            />
        </div>
    );
}
