import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Package, Plus, Trash2, Edit3, Image as ImageIcon, Wand2, Search, Upload, X, Loader2, Activity, Star, Layers, ChevronDown, ChevronRight, Check, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import MediaPickerModal from '../../components/MediaPickerModal';

// ─── Allowed MIME types & extensions ─────────────────────────────────────────
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_EXT  = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
const MAX_SIZE_MB   = 5;

function validateImageFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_MIME.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
        return `Invalid format. Allowed: ${ALLOWED_EXT.join(', ')}`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `File too large. Max size is ${MAX_SIZE_MB} MB.`;
    }
    return null;
}

// ─── Multi-Image Uploader Component ─────────────────────────────────────────

function MultiImageUploader({ imageUrls, onImagesChange, onOpenPicker }) {

    const removeImage = (idx) => {
        const next = imageUrls.filter((_, i) => i !== idx);
        onImagesChange(next);
    };

    const makeMain = (idx) => {
        if (idx === 0) return;
        const next = [...imageUrls];
        const [moved] = next.splice(idx, 1);
        next.unshift(moved);
        onImagesChange(next);
    };

    const resolveUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${import.meta.env.VITE_API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Product Images <span className="text-slate-400 font-normal">({imageUrls.length})</span>
                </label>
                {imageUrls.length > 0 && (
                    <span className="text-xs text-slate-400">First image is the main cover</span>
                )}
            </div>

            {/* Image Grid */}
            {imageUrls.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center">
                            <img
                                src={resolveUrl(url)}
                                alt={`Product image ${idx + 1}`}
                                className="w-full h-full object-contain"
                                onError={e => e.target.src = ''}
                            />
                            {/* Cover Badge */}
                            {idx === 0 && (
                                <div className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <Star className="w-2.5 h-2.5 fill-white" /> Main
                                </div>
                            )}
                            {/* Actions overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                {idx !== 0 && (
                                    <button
                                        type="button"
                                        onClick={() => makeMain(idx)}
                                        className="text-[10px] font-bold bg-white text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                                        title="Set as main image"
                                    >
                                        Set Main
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                                    title="Remove image"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Image Button (Media Library) */}
            {onOpenPicker && (
                <button
                    type="button"
                    onClick={onOpenPicker}
                    className="w-full h-28 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:text-indigo-600"
                >
                    <ImageIcon className="w-7 h-7 text-slate-400" />
                    <p className="text-sm font-medium">Add Image</p>
                </button>
            )}
        </div>
    );
}

// ─── Single Variant Image Uploader Component ────────────────────────────────
function VariantImageUploader({ onOpenPicker }) {
    return (
        <div className="relative inline-block ml-1">
            <button
                type="button"
                onClick={onOpenPicker}
                title="Choose image for this variant"
                className="w-10 h-10 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
                <ImageIcon className="w-4 h-4 text-slate-400" />
            </button>
        </div>
    );
}

// ─── Generates every combination of option values (Cartesian product) ─────────
function generateCombos(options) {
    const groups = (options || []).map(o => {
        const parsedValues = Array.isArray(o.values) 
            ? o.values.filter(v => typeof v === 'string' && v.trim() !== '')
            : (typeof o.values === 'string' ? o.values.split(',').map(v => v.trim()).filter(Boolean) : []);
        return { ...o, name: (o.name || '').trim(), values: parsedValues };
    }).filter(o => o.name && o.values.length > 0);

    if (groups.length === 0) return [];
    let combos = [{}];
    for (const group of groups) {
        const next = [];
        for (const existing of combos) {
            for (const val of group.values) {
                next.push({ ...existing, [group.name]: val });
            }
        }
        combos = next;
    }
    return combos;
}

export default function WaProductList() {
    const { storeId, store } = useOutletContext();
    const inventoryEnabled = store?.inventoryConfig?.enabled === true;
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [generatingAi, setGeneratingAi] = useState(false);
    const [aiKeywords, setAiKeywords] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [storeCategories, setStoreCategories] = useState([]);
    const [storeTaxConfig, setStoreTaxConfig] = useState(null);
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [isVariationsOpen, setIsVariationsOpen] = useState(false);
    const [isSeoOpen, setIsSeoOpen] = useState(false);

    // ── Media Picker state ────────────────────────────────────────────────────
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerConfig, setPickerConfig] = useState({ allowedTypes: 'image', multiple: true, onSelect: null });
    const openPicker = (config) => { setPickerConfig(config); setPickerOpen(true); };
    const closePicker = () => setPickerOpen(false);

    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
        return symbols[code] || code;
    };

    const defaultForm = { name: '', description: '', price: '', compareAtPrice: '', wholesalePrice: '', minWholesaleQty: '', imageUrls: [], category: '', inStock: true, options: [], variants: [], taxRate: '', metaTitle: '', metaDescription: '', slug: '', ogImage: '', sku: '', trackQuantity: false, stockQuantity: 0, lowStockThreshold: 5 };
    const [form, setForm] = useState(defaultForm);
    const [generatingAiSeo, setGeneratingAiSeo] = useState(false);
    const [showAiSeoModal, setShowAiSeoModal] = useState(false);
    const [aiSeoStep, setAiSeoStep] = useState(0);

    useEffect(() => {
        fetchProducts();
    }, [storeId]);

    const fetchProducts = async () => {
        try {
            const storeRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
            const myStore = storeRes.data.find(s => s.id === storeId);
            if (myStore) {
                setCurrency(myStore.currency || 'USD');
                setStoreCategories(myStore.categories || []);
                setStoreTaxConfig(myStore.taxConfig || null);
            }

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/products`);
            setProducts(res.data);
        } catch (error) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            payload.taxRate = payload.taxRate === '' ? null : payload.taxRate;
            payload.imageUrls = payload.imageUrls.filter(url => url.trim() !== '');
            payload.options = payload.options.map(opt => ({
                ...opt,
                values: Array.isArray(opt.values) 
                    ? opt.values 
                    : opt.values.split(',').map(v => v.trim()).filter(Boolean)
            }));
            // Only save variant rows that actually have a custom price, stock, or image set
            payload.variants = (payload.variants || [])
                .filter(v => v.price !== '' || v.stock !== '' || v.imageUrl)
                .map(v => ({
                    combo: v.combo,
                    price: v.price !== '' ? parseFloat(v.price) : null,
                    stock: v.stock !== '' ? parseInt(v.stock) : null,
                    imageUrl: v.imageUrl || null,
                }));
            
            if (editingProduct) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/products/${editingProduct.id}`, payload);
                toast.success("Product updated");
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/products`, payload);
                toast.success("Product added");
            }
            setShowModal(false);
            fetchProducts();
        } catch (error) {
            toast.error("Failed to save product");
        }
    };

    const handleDelete = async (productId) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/wastore/products/${productId}`);
            toast.success("Product deleted");
            fetchProducts();
        } catch (error) {
            toast.error("Failed to delete product");
        }
    };

    const openEdit = (product) => {
        setEditingProduct(product);
        // Reconstruct variant pricing table from saved options + saved variant overrides
        const savedOptions = product.options || [];
        const savedVariants = product.variants || [];
        const combos = generateCombos(savedOptions);
        const loadedVariants = combos.map(combo => {
            const existing = savedVariants.find(v =>
                v.combo && Object.entries(combo).every(([k, val]) => v.combo[k] === val)
            );
            return {
                combo,
                price: existing?.price != null ? existing.price : '',
                stock: existing?.stock != null ? existing.stock : '',
                imageUrl: existing?.imageUrl || '',
            };
        });
        setForm({
            name: product.name,
            description: product.description || '',
            price: product.price,
            compareAtPrice: product.compareAtPrice || '',
            wholesalePrice: product.wholesalePrice || '',
            minWholesaleQty: product.minWholesaleQty || '',
            imageUrls: product.imageUrls?.length > 0 ? product.imageUrls : [''],
            category: product.category || '',
            inStock: product.inStock,
            options: savedOptions,
            variants: loadedVariants,
            taxRate: product.taxRate !== null && product.taxRate !== undefined ? product.taxRate : '',
            metaTitle: product.metaTitle || '',
            metaDescription: product.metaDescription || '',
            slug: product.slug || '',
            ogImage: product.ogImage || '',
            sku: product.sku || '',
            trackQuantity: !!product.trackQuantity,
            stockQuantity: product.stockQuantity ?? 0,
            lowStockThreshold: product.lowStockThreshold ?? 5,
        });
        
        if (product.category && !storeCategories.includes(product.category)) {
            setIsAddingNewCategory(true);
        } else {
            setIsAddingNewCategory(false);
        }
        setShowModal(true);
    };

    // Builds the variant pricing table from the current option groups
    const generateVariantTable = () => {
        const combos = generateCombos(form.options || []);
        if (combos.length === 0) {
            toast.error('Add at least one option with values first (e.g. Size: S, M, L)');
            return;
        }
        const newVariants = combos.map(combo => {
            const existing = (form.variants || []).find(v =>
                v.combo && Object.entries(combo).every(([k, val]) => v.combo[k] === val)
            );
            return {
                combo,
                price: existing?.price ?? '',
                stock: existing?.stock ?? '',
                imageUrl: existing?.imageUrl ?? '',
            };
        });
        setForm(prev => ({ ...prev, variants: newVariants }));
    };

    const handleGenerateAi = async () => {
        if (!form.name) {
            toast.error("Please enter a product name first");
            return;
        }
        setGeneratingAi(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/ai-description`, {
                productName: form.name,
                keywords: aiKeywords
            });
            setForm(f => ({ ...f, description: res.data.description }));
            toast.success(`Generated! (${res.data.tokensDeducted} tokens used)`);
        } catch (error) {
            toast.error(error.response?.data?.error || "AI generation failed");
        } finally {
            setGeneratingAi(false);
        }
    };

    const handleGenerateAiSeo = async (retryCount = 0) => {
        if (!form.name) {
            toast.error("Please enter a product name first");
            return;
        }
        if (retryCount === 0) {
            setShowAiSeoModal(true);
            setGeneratingAiSeo(true);
            setAiSeoStep(0);
        }
        
        try {
            if (retryCount === 0) {
                setTimeout(() => setAiSeoStep(1), 1200); 
                setTimeout(() => setAiSeoStep(2), 2400); 
            }

            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/wastore/ai-seo`, {
                productName: form.name,
                description: form.description,
                category: form.category,
                price: form.price
            });
            
            setForm(f => ({ 
                ...f, 
                metaTitle: res.data.seo?.metaTitle || f.metaTitle,
                metaDescription: res.data.seo?.metaDescription || f.metaDescription,
                slug: res.data.seo?.slug || f.slug
            }));
            
            setAiSeoStep(3); // Success step
            toast.success(`SEO Generated! (${res.data.tokensDeducted} tokens used)`);
            
            setTimeout(() => {
                setShowAiSeoModal(false);
                setGeneratingAiSeo(false);
                setAiSeoStep(0);
            }, 1000);
            
        } catch (error) {
            if (retryCount < 1) {
                handleGenerateAiSeo(retryCount + 1);
            } else {
                toast.error(error.response?.data?.error || "AI SEO generation failed");
                setShowAiSeoModal(false);
                setGeneratingAiSeo(false);
                setAiSeoStep(0);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-indigo-500" />
                        Products
                    </h2>
                    <p className="text-sm text-slate-500">Manage your store's products.</p>
                </div>
                <button 
                    onClick={() => { setEditingProduct(null); setForm(defaultForm); setIsAddingNewCategory(false); setShowModal(true); }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Product
                </button>
            </div>

            {loading ? (
                <div className="p-4 md:p-8 animate-pulse text-slate-500 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10">Loading inventory...</div>
            ) : products.length === 0 ? (
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-4 md:p-12 text-center">
                    <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No products found</h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">Start adding items to your store to start selling on WhatsApp.</p>
                    <button onClick={() => { setEditingProduct(null); setForm(defaultForm); setIsAddingNewCategory(false); setShowModal(true); }} className="px-4 md:px-6 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-medium rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add First Product
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">Product</th>
                                <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">Price</th>
                                <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">Category</th>
                                <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">Status</th>
                                <th className="px-6 py-4 text-right font-medium text-slate-500 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                            {products.map(product => (
                                <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {product.imageUrls?.[0] ? (
                                                <img src={product.imageUrls[0]} alt={product.name} className="w-10 h-10 rounded-lg object-contain bg-white dark:bg-slate-800 flex-shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                    <ImageIcon className="w-4 h-4 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="min-w-0 max-w-[200px] whitespace-normal">
                                                <p className="font-bold text-slate-900 dark:text-white truncate">{product.name}</p>
                                                <p className="text-xs text-slate-500 truncate max-w-full">{product.description}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <span className="font-medium text-slate-900 dark:text-white">{getCurrencySymbol(currency)}{product.price}</span>
                                            {product.compareAtPrice && <span className="ml-2 text-xs text-slate-500 line-through">{getCurrencySymbol(currency)}{product.compareAtPrice}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-600 dark:text-slate-400">{product.category || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            {product.inStock ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Stock
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Out of Stock
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEdit(product)} className="flex justify-center items-center p-2 bg-transparent text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded transition-colors" title="Edit">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(product.id)} className="flex justify-center items-center p-2 bg-transparent text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 rounded transition-colors" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto flex">
                    <div className="min-h-screen flex items-center w-full lg:w-[85%] max-w-[1600px] mx-auto px-4 lg:px-0">
                        {/* Sidebar Spacer to offset the modal */}
                        <div className="hidden md:block w-64 flex-shrink-0 mr-6 pointer-events-none" />
                        <div className="flex-1 flex justify-center p-0 sm:p-4">
                            <div className="bg-white dark:bg-surface-dark sm:rounded-2xl max-w-[1100px] w-full max-h-[100dvh] sm:max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
                                {/* Sticky Header */}
                                <div className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-surface-dark shrink-0 z-10">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                                    </h2>
                                </div>
                                
                                <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
                                    {/* Scrollable Body */}
                                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column: Main Details */}
                                <div className="lg:col-span-2 space-y-6">
                                    
                                    {/* General Box */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Product Name</label>
                                            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium shadow-sm" placeholder="e.g. Classic White T-Shirt" />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Keywords (optional)" 
                                                        value={aiKeywords} 
                                                        onChange={e => setAiKeywords(e.target.value)}
                                                        className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500 w-32 shadow-sm"
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={handleGenerateAi}
                                                        disabled={generatingAi}
                                                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-md hover:shadow-lg transition-all disabled:opacity-50 font-medium"
                                                    >
                                                        {generatingAi ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                                        {generatingAi ? 'Generating...' : 'AI Magic'}
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea rows={5} required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y shadow-sm text-sm" placeholder="Describe your product..."></textarea>
                                        </div>
                                    </div>

                                    {/* Images Box */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                        <MultiImageUploader
                                            imageUrls={form.imageUrls || []}
                                            onImagesChange={(urls) => setForm({ ...form, imageUrls: urls })}
                                            onOpenPicker={() => openPicker({
                                                allowedTypes: 'image',
                                                multiple: true,
                                                title: 'Select Product Images',
                                                onSelect: (urls) => {
                                                    const arr = Array.isArray(urls) ? urls : [urls];
                                                    const current = form.imageUrls || [];
                                                    setForm(f => ({ ...f, imageUrls: [...current, ...arr] }));
                                                }
                                            })}
                                        />
                                    </div>



                                </div>

                                {/* Right Column: Pricing & Organization */}
                                <div className="space-y-6">
                                    
                                    {/* Status Box */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">Status</h3>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Inventory Status</label>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={form.inStock} onChange={e => setForm({...form, inStock: e.target.checked})} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-500 peer-checked:bg-emerald-500 shadow-inner"></div>
                                                <span className="ml-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{form.inStock ? 'In Stock' : 'Out of Stock'}</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Inventory & Stock — only shown when store inventory management is enabled */}
                                    {inventoryEnabled && (
                                        <div className="bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-5 space-y-4">
                                            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800/40 pb-2 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                Inventory & Stock
                                            </h3>

                                            {/* SKU */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">SKU (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={form.sku}
                                                    onChange={e => setForm({...form, sku: e.target.value})}
                                                    placeholder="e.g. SHIRT-BLK-M"
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                                                />
                                            </div>

                                            {/* Track Quantity toggle */}
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Track Quantity</label>
                                                    <span className="text-[11px] text-slate-500">Count stock on every order</span>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={form.trackQuantity} onChange={e => setForm({...form, trackQuantity: e.target.checked})} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-500 peer-checked:bg-emerald-500 shadow-inner"></div>
                                                </label>
                                            </div>

                                            {/* Stock Qty + Low Stock Threshold — shown only when Track Qty is on */}
                                            {form.trackQuantity && (
                                                <div className="grid grid-cols-2 gap-3 pt-1">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Stock Qty</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={form.stockQuantity}
                                                            onChange={e => setForm({...form, stockQuantity: parseInt(e.target.value) || 0})}
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Low Stock Alert</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={form.lowStockThreshold}
                                                            onChange={e => setForm({...form, lowStockThreshold: parseInt(e.target.value) || 0})}
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Pricing Box */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">Pricing</h3>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{getCurrencySymbol(currency)}</span>
                                                    <input required type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold shadow-sm" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Compare At</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{getCurrencySymbol(currency)}</span>
                                                    <input type="number" value={form.compareAtPrice} onChange={e => setForm({...form, compareAtPrice: e.target.value})} className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">Wholesale / B2B</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{getCurrencySymbol(currency)}</span>
                                                        <input type="number" value={form.wholesalePrice} onChange={e => setForm({...form, wholesalePrice: e.target.value})} className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Min Qty</label>
                                                    <input type="number" value={form.minWholesaleQty} onChange={e => setForm({...form, minWholesaleQty: e.target.value})} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Organization Box */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">Organization</h3>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Category</label>
                                            {!isAddingNewCategory ? (
                                                <select 
                                                    value={form.category} 
                                                    onChange={e => {
                                                        if (e.target.value === 'ADD_NEW') {
                                                            setIsAddingNewCategory(true);
                                                            setForm({...form, category: ''});
                                                        } else {
                                                            setForm({...form, category: e.target.value});
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                                                >
                                                    <option value="">Select category...</option>
                                                    {storeCategories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                    <option value="ADD_NEW" className="font-bold text-indigo-600">+ Add New Category</option>
                                                </select>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={form.category} 
                                                        onChange={e => setForm({...form, category: e.target.value})} 
                                                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm" 
                                                        placeholder="New Category Name" 
                                                        autoFocus
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => { setIsAddingNewCategory(false); setForm({...form, category: ''}); }}
                                                        className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300 font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tax Slab</label>
                                            <select 
                                                value={form.taxRate === null ? '' : form.taxRate} 
                                                onChange={e => setForm({...form, taxRate: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm"
                                            >
                                                <option value="">Store Default ({storeTaxConfig?.rate || 0}%)</option>
                                                {(storeTaxConfig?.slabs || []).map((slab, idx) => (
                                                    <option key={idx} value={slab.rate}>{slab.name} ({slab.rate}%)</option>
                                                ))}
                                                <option value="0">No Tax (0%)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Variations Box (Full Width) */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-6">
                                <div 
                                    className="flex items-center justify-between p-5 cursor-pointer select-none"
                                    onClick={() => setIsVariationsOpen(!isVariationsOpen)}
                                >
                                    <div className="flex items-center gap-2">
                                        {isVariationsOpen ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                                        <label className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">Product Variations</label>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); setIsVariationsOpen(true); setForm({...form, options: [...(form.options || []), { name: '', values: [] }]}) }}
                                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium transition-colors shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Option
                                    </button>
                                </div>
                                
                                {isVariationsOpen && (
                                    <div className="px-5 pb-5 space-y-4 pt-1">
                                        {(form.options || []).map((option, optIdx) => (
                                            <div key={optIdx} className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Option Name (e.g. Size, Color)" 
                                                        value={option.name}
                                                        onChange={(e) => {
                                                            const newOpts = [...form.options];
                                                            newOpts[optIdx].name = e.target.value;
                                                            setForm({...form, options: newOpts});
                                                        }}
                                                        className="flex-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500 font-medium"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const newOpts = form.options.filter((_, i) => i !== optIdx);
                                                            setForm({...form, options: newOpts});
                                                        }}
                                                        className="text-rose-500 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Values (comma separated, e.g. S, M, L)" 
                                                        value={Array.isArray(option.values) ? option.values.join(', ') : option.values}
                                                        onChange={(e) => {
                                                            const newOpts = [...form.options];
                                                            newOpts[optIdx].values = e.target.value;
                                                            setForm({...form, options: newOpts});
                                                        }}
                                                        className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        {/* Variant Pricing & Stock (Only show if options exist) */}
                                        {(form.options || []).some(o => o.values?.length > 0) && (
                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                            Different Prices/Stock per Variant <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={generateVariantTable}
                                                        className="shrink-0 text-xs flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium transition-colors border border-indigo-100 dark:border-indigo-500/20"
                                                    >
                                                        <Layers className="w-3.5 h-3.5" /> Generate Variation
                                                    </button>
                                                </div>

                                                {(form.variants || []).length > 0 ? (
                                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                                                    <tr>
                                                                        <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Variant</th>
                                                                        <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Price (opt)</th>
                                                                        <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                                                                        <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Image (opt)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                                    {form.variants.map((v, idx) => (
                                                                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                                                            <td className="px-4 py-2.5">
                                                                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                                                                                    {Object.values(v.combo).join(' / ')}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-2.5">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    placeholder={form.price ? `Base: ${form.price}` : 'Base'}
                                                                                    value={v.price}
                                                                                    onChange={e => {
                                                                                        const updated = [...form.variants];
                                                                                        updated[idx] = { ...updated[idx], price: e.target.value };
                                                                                        setForm({ ...form, variants: updated });
                                                                                    }}
                                                                                    className="w-24 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium"
                                                                                />
                                                                            </td>
                                                                            <td className="px-4 py-2.5">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    placeholder="—"
                                                                                    value={v.stock}
                                                                                    onChange={e => {
                                                                                        const updated = [...form.variants];
                                                                                        updated[idx] = { ...updated[idx], stock: e.target.value };
                                                                                        setForm({ ...form, variants: updated });
                                                                                    }}
                                                                                    className="w-16 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium"
                                                                                />
                                                                            </td>
                                                                            <td className="px-4 py-2.5">
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    {(() => {
                                                                                        const allUrls = [...(form.imageUrls || [])].filter(u => u && u.trim());
                                                                                        if (v.imageUrl && !allUrls.includes(v.imageUrl)) {
                                                                                            allUrls.push(v.imageUrl);
                                                                                        }
                                                                                        
                                                                                        return allUrls.map((imgUrl, imgIdx) => {
                                                                                            const resolvedSrc = imgUrl.startsWith('http') ? imgUrl : `${import.meta.env.VITE_API_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                                                                                            const isSelected = v.imageUrl === imgUrl;
                                                                                            return (
                                                                                                    <button
                                                                                                        key={imgIdx}
                                                                                                        type="button"
                                                                                                        title={isSelected ? 'Click to remove image link' : `Use image ${imgIdx + 1} for this variant`}
                                                                                                        onClick={() => {
                                                                                                            const updated = [...form.variants];
                                                                                                            updated[idx] = { ...updated[idx], imageUrl: isSelected ? '' : imgUrl };
                                                                                                            setForm({ ...form, variants: updated });
                                                                                                        }}
                                                                                                        className={`relative w-10 h-10 rounded-md border-2 transition-all overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 ${
                                                                                                            isSelected
                                                                                                                ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-700 shadow-sm'
                                                                                                                : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                                                                                                        }`}
                                                                                                    >
                                                                                                        <img src={resolvedSrc} alt="" className="w-full h-full object-contain" />
                                                                                                        {isSelected && (
                                                                                                            <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                                                                                                <Check className="w-5 h-5 text-indigo-600 bg-white rounded-full p-0.5 shadow-sm" />
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </button>
                                                                                            );
                                                                                        });
                                                                                    })()}
                                                                                    
                                                                                    <VariantImageUploader 
                                                                                        onOpenPicker={() => setPickerConfig({
                                                                                            isOpen: true,
                                                                                            allowedTypes: 'image',
                                                                                            multiple: false,
                                                                                            onSelect: (url) => {
                                                                                                const updated = [...form.variants];
                                                                                                updated[idx] = { ...updated[idx], imageUrl: url };
                                                                                                
                                                                                                const nextUrls = [...(form.imageUrls || [])];
                                                                                                if (!nextUrls.includes(url)) {
                                                                                                    nextUrls.push(url);
                                                                                                }
                                                                                                
                                                                                                setForm({ ...form, variants: updated, imageUrls: nextUrls });
                                                                                            }
                                                                                        })}
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                                                        <p className="text-xs text-slate-500">Click <span className="font-semibold text-indigo-500">Generate Variation</span> to set variations.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* SEO Meta Details Box (Full Width) */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-6 mb-6">
                                <div 
                                    className="flex items-center justify-between p-5 cursor-pointer select-none"
                                    onClick={() => setIsSeoOpen(!isSeoOpen)}
                                >
                                    <div className="flex items-center gap-2">
                                        {isSeoOpen ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                                        <label className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">SEO Meta Details</label>
                                    </div>
                                </div>
                                
                                {isSeoOpen && (
                                    <div className="px-5 pb-5 space-y-4 pt-1">
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateAiSeo(0)}
                                                disabled={generatingAiSeo}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                                            >
                                                {generatingAiSeo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                ✨ AI SEO Expert
                                            </button>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Meta Title</label>
                                            <input 
                                                type="text" 
                                                value={form.metaTitle} 
                                                onChange={e => setForm({...form, metaTitle: e.target.value})} 
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium shadow-sm" 
                                                placeholder={form.name || "Product Name"} 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Meta Description</label>
                                            <textarea 
                                                rows={3} 
                                                value={form.metaDescription} 
                                                onChange={e => setForm({...form, metaDescription: e.target.value})} 
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y shadow-sm text-sm" 
                                                placeholder="Brief summary for search engines..."
                                            ></textarea>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">URL Slug</label>
                                            <div className="flex items-center">
                                                <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg text-slate-500 text-sm">/products/</span>
                                                <input 
                                                    type="text" 
                                                    value={form.slug} 
                                                    onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} 
                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-r-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm" 
                                                    placeholder={form.name ? form.name.toLowerCase().replace(/[^a-z0-9-]/g, '-') : "product-url"} 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Social Sharing Image (OG Image)</label>
                                            <div className="flex items-center gap-3">
                                                {form.ogImage ? (
                                                    <div className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white flex-shrink-0">
                                                        <img src={resolveUrl(form.ogImage)} alt="Social preview" className="w-full h-full object-contain" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <button type="button" onClick={() => setForm({...form, ogImage: ''})} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full"><X className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => openPicker({ allowedTypes: 'image', multiple: false, title: 'Select Social Image', onSelect: (url) => setForm({...form, ogImage: url}) })}
                                                        className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors"
                                                    >
                                                        <ImageIcon className="w-5 h-5 mb-1" />
                                                        <span className="text-[10px] font-medium">Upload</span>
                                                    </button>
                                                )}
                                                <p className="text-xs text-slate-500">Recommended size: 1200 x 630 pixels. This image appears when the product is shared on WhatsApp, Facebook, or Twitter.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                                    </div> {/* End Scrollable Body */}
                                    
                                    {/* Sticky Footer */}
                                    <div className="px-4 md:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-surface-dark shrink-0 flex flex-col sm:flex-row gap-3 justify-end z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none">
                                        <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors">Cancel</button>
                                        <button type="submit" className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors">
                                            {editingProduct ? 'Save Changes' : 'Add Product'}
                                        </button>
                                    </div>
                                </form>
                    </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── AI SEO Expert Progress Modal ─────────────────────────────────────────── */}
            {showAiSeoModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 overflow-hidden border border-slate-200 dark:border-slate-800">
                        
                        {/* Background Decoration */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />

                        <div className="relative flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
                                {aiSeoStep === 3 ? (
                                    <Check className="w-8 h-8 text-green-500" />
                                ) : (
                                    <Wand2 className="w-8 h-8 text-indigo-500 animate-pulse" />
                                )}
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {aiSeoStep === 3 ? 'SEO Optimized!' : 'AI SEO Expert'}
                            </h3>
                            
                            <div className="w-full space-y-3">
                                {/* Step 1 */}
                                <div className={`flex items-center gap-3 text-sm transition-all duration-300 ${aiSeoStep >= 0 ? 'opacity-100' : 'opacity-40'}`}>
                                    {aiSeoStep > 0 ? <Check className="w-4 h-4 text-green-500" /> : <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                                    <span className={aiSeoStep >= 0 ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500'}>Analyzing product details...</span>
                                </div>
                                {/* Step 2 */}
                                <div className={`flex items-center gap-3 text-sm transition-all duration-300 ${aiSeoStep >= 1 ? 'opacity-100' : 'opacity-40'}`}>
                                    {aiSeoStep > 1 ? <Check className="w-4 h-4 text-green-500" /> : (aiSeoStep === 1 ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700" />)}
                                    <span className={aiSeoStep >= 1 ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500'}>Writing meta tags...</span>
                                </div>
                                {/* Step 3 */}
                                <div className={`flex items-center gap-3 text-sm transition-all duration-300 ${aiSeoStep >= 2 ? 'opacity-100' : 'opacity-40'}`}>
                                    {aiSeoStep > 2 ? <Check className="w-4 h-4 text-green-500" /> : (aiSeoStep === 2 ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700" />)}
                                    <span className={aiSeoStep >= 2 ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500'}>Optimizing URL slug...</span>
                                </div>
                            </div>

                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out" 
                                    style={{ width: `${(aiSeoStep / 3) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Media Picker Modal ─────────────────────────────────────────── */}
            <MediaPickerModal
                isOpen={pickerOpen}
                onClose={closePicker}
                onSelect={(urls) => { if (pickerConfig.onSelect) pickerConfig.onSelect(urls); }}
                accessMode="restricted"
                allowedTypes={pickerConfig.allowedTypes || 'image'}
                multiple={pickerConfig.multiple || false}
                title={pickerConfig.title || 'Select Media'}
                mimeConstraints={pickerConfig.mimeConstraints || null}
            />
        </div>
    );
}
