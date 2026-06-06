import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Package, Plus, Trash2, Edit3, Image as ImageIcon, Wand2, Search, Upload, X, Loader2, Activity, Star } from 'lucide-react';
import toast from 'react-hot-toast';

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
const MAX_IMAGES = 6;

function MultiImageUploader({ imageUrls, onImagesChange }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState(null);

    const handleFiles = async (files) => {
        setError(null);
        const remaining = MAX_IMAGES - imageUrls.length;
        const filesToUpload = Array.from(files).slice(0, remaining);
        if (filesToUpload.length === 0) {
            setError(`Maximum ${MAX_IMAGES} images allowed.`);
            return;
        }
        for (const file of filesToUpload) {
            const err = validateImageFile(file);
            if (err) { setError(err); return; }
        }
        setUploading(true);
        try {
            const uploaded = [];
            for (const file of filesToUpload) {
                const form = new FormData();
                form.append('product', file);
                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/wastore/upload/product`,
                    form,
                    { headers: {  'Content-Type': 'multipart/form-data' } }
                );
                uploaded.push(res.data.url);
            }
            onImagesChange([...imageUrls, ...uploaded]);
            toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded!`);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

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
                    Product Images <span className="text-slate-400 font-normal">({imageUrls.length}/{MAX_IMAGES})</span>
                </label>
                {imageUrls.length > 0 && (
                    <span className="text-xs text-slate-400">First image is the main cover</span>
                )}
            </div>

            {/* Image Grid */}
            {imageUrls.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                            <img
                                src={resolveUrl(url)}
                                alt={`Product image ${idx + 1}`}
                                className="w-full h-full object-cover"
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

            {/* Upload Drop Zone */}
            {imageUrls.length < MAX_IMAGES && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
                    onClick={() => !uploading && inputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all h-28 flex flex-col items-center justify-center gap-2 ${
                        dragOver
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/50'
                    }`}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                            <p className="text-sm font-medium text-indigo-500">Uploading…</p>
                        </>
                    ) : (
                        <>
                            <Upload className="w-7 h-7 text-slate-400" />
                            <p className="text-sm font-medium text-slate-500">
                                {imageUrls.length === 0 ? 'Add product images' : 'Add more images'}
                            </p>
                            <p className="text-xs text-slate-400">Up to {MAX_IMAGES - imageUrls.length} more · Max {MAX_SIZE_MB}MB each</p>
                        </>
                    )}
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_MIME.join(',')}
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
            />
            {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        </div>
    );
}

export default function WaProductList() {
    const { storeId } = useOutletContext();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [generatingAi, setGeneratingAi] = useState(false);
    const [aiKeywords, setAiKeywords] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [storeCategories, setStoreCategories] = useState([]);
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);

    const getCurrencySymbol = (code) => {
        const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
        return symbols[code] || code;
    };

    const defaultForm = { name: '', description: '', price: '', compareAtPrice: '', wholesalePrice: '', minWholesaleQty: '', imageUrls: [], category: '', inStock: true, options: [] };
    const [form, setForm] = useState(defaultForm);

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
            payload.imageUrls = payload.imageUrls.filter(url => url.trim() !== '');
            payload.options = payload.options.map(opt => ({
                ...opt,
                values: Array.isArray(opt.values) 
                    ? opt.values 
                    : opt.values.split(',').map(v => v.trim()).filter(Boolean)
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
            options: product.options || []
        });
        
        if (product.category && !storeCategories.includes(product.category)) {
            setIsAddingNewCategory(true);
        } else {
            setIsAddingNewCategory(false);
        }
        setShowModal(true);
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-indigo-500" />
                        Inventory
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
                                                <img src={product.imageUrls[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-surface-dark sm:rounded-2xl max-w-2xl w-full max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto p-4 md:p-6 shadow-xl flex flex-col">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                            {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-5 flex-1 flex flex-col">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Product Name</label>
                                    <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Price</label>
                                    <input required type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Compare at Price (Optional)</label>
                                    <input type="number" step="0.01" value={form.compareAtPrice} onChange={e => setForm({...form, compareAtPrice: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>

                                <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">B2B / Wholesale Pricing (Optional)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Wholesale Price</label>
                                            <input type="number" step="0.01" value={form.wholesalePrice} onChange={e => setForm({...form, wholesalePrice: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 15.00" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Min Wholesale Qty</label>
                                            <input type="number" value={form.minWholesaleQty} onChange={e => setForm({...form, minWholesaleQty: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 10" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
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
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="">Select a category...</option>
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
                                                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                                                placeholder="New Category Name" 
                                                autoFocus
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => { setIsAddingNewCategory(false); setForm({...form, category: ''}); }}
                                                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-300 font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1 flex items-center pt-6">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={form.inStock} onChange={e => setForm({...form, inStock: e.target.checked})} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                        <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">In Stock</span>
                                    </label>
                                </div>

                                <div className="md:col-span-2">
                                    <MultiImageUploader
                                        imageUrls={form.imageUrls || []}
                                        onImagesChange={(urls) => setForm({ ...form, imageUrls: urls })}
                                    />
                                </div>

                                {/* AI Description Generator */}
                                <div className="space-y-1 md:col-span-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Keywords (optional)" 
                                                value={aiKeywords} 
                                                onChange={e => setAiKeywords(e.target.value)}
                                                className="px-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500 w-32"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleGenerateAi}
                                                disabled={generatingAi}
                                                className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-md hover:shadow-lg transition-all disabled:opacity-50 font-medium"
                                            >
                                                {generatingAi ? <Activity className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                                {generatingAi ? 'Generating...' : 'AI Magic'}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea rows={4} required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y"></textarea>
                                </div>

                                {/* Variants / Options */}
                                <div className="space-y-4 md:col-span-2 pt-4 border-t border-slate-100 dark:border-white/10">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Product Variants</label>
                                        <button 
                                            type="button" 
                                            onClick={() => setForm({...form, options: [...(form.options || []), { name: '', values: [] }]})}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium transition-colors"
                                        >
                                            <Plus className="w-3 h-3" /> Add Option
                                        </button>
                                    </div>
                                    
                                    {(form.options || []).map((option, optIdx) => (
                                        <div key={optIdx} className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
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
                                                    className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const newOpts = form.options.filter((_, i) => i !== optIdx);
                                                        setForm({...form, options: newOpts});
                                                    }}
                                                    className="text-rose-500 p-1 hover:bg-rose-50 rounded-md transition-colors"
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
                                                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-white/10 mt-auto">
                                <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors">Cancel</button>
                                <button type="submit" className="w-full sm:flex-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors">
                                    {editingProduct ? 'Save Changes' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
