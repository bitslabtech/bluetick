import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { ClipboardList, Search, Save, AlertCircle, CheckCircle2, XCircle, ArrowUpDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaStoreInventory() {
    const { storeId, store } = useOutletContext();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    
    // Store original products to detect changes
    const [originalProducts, setOriginalProducts] = useState([]);

    useEffect(() => {
        fetchProducts();
    }, [storeId]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/products`);
            // Deep copy to allow editing without affecting original until saved
            const loadedProducts = res.data.map(p => ({
                ...p,
                sku: p.sku || '',
                trackQuantity: !!p.trackQuantity,
                stockQuantity: p.stockQuantity || 0,
                lowStockThreshold: p.lowStockThreshold || 5,
                inStock: !!p.inStock
            }));
            setProducts(loadedProducts);
            setOriginalProducts(JSON.parse(JSON.stringify(loadedProducts)));
        } catch (error) {
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (id, field, value) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const hasChanges = JSON.stringify(products) !== JSON.stringify(originalProducts);

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // Find changed products
            const changedProducts = products.filter((p, index) => {
                const orig = originalProducts[index];
                return p.sku !== orig.sku 
                    || p.trackQuantity !== orig.trackQuantity 
                    || p.stockQuantity !== orig.stockQuantity 
                    || p.lowStockThreshold !== orig.lowStockThreshold
                    || p.inStock !== orig.inStock;
            });

            if (changedProducts.length === 0) {
                toast.success("No changes to save");
                setSaving(false);
                return;
            }

            // Save them one by one (or bulk endpoint if one existed, but PUT /products/:id is safe)
            await Promise.all(changedProducts.map(p => 
                axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/products/${p.id}`, {
                    sku: p.sku,
                    trackQuantity: p.trackQuantity,
                    stockQuantity: p.stockQuantity,
                    lowStockThreshold: p.lowStockThreshold,
                    inStock: p.inStock
                })
            ));

            toast.success("Inventory updated successfully!");
            setOriginalProducts(JSON.parse(JSON.stringify(products)));
        } catch (error) {
            toast.error("Failed to save some inventory changes");
        } finally {
            setSaving(false);
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    );

    const getStatusBadge = (product) => {
        if (!product.trackQuantity) {
            return product.inStock 
                ? <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> In Stock</span>
                : <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-md text-xs font-semibold"><XCircle className="w-3.5 h-3.5" /> Out of Stock</span>;
        }

        if (product.stockQuantity <= 0) {
            return <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-md text-xs font-semibold"><XCircle className="w-3.5 h-3.5" /> Out of Stock</span>;
        } else if (product.stockQuantity <= product.lowStockThreshold) {
            return <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-semibold"><AlertCircle className="w-3.5 h-3.5" /> Low Stock</span>;
        } else {
            return <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> In Stock</span>;
        }
    };

    if (loading) {
        return <div className="p-8 animate-pulse text-slate-500">Loading inventory...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-indigo-500" />
                        Inventory
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Track and update your product stock levels.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <span className="text-amber-500 text-sm font-medium mr-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Unsaved changes
                        </span>
                    )}
                    <button
                        onClick={handleSaveAll}
                        disabled={!hasChanges || saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Config warning if settings are disabled */}
            {(!store.inventoryConfig?.autoOutOfStock || !store.inventoryConfig?.preventCartAdd) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-xl border border-blue-100 dark:border-blue-800/40 text-sm flex gap-3 items-start">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold mb-1">Store Inventory Settings</p>
                        <p>Your store settings currently allow customers to buy out-of-stock items. You can change this behavior in the <a href={`/online-store/${store.slug}/settings`} className="underline font-medium hover:text-blue-800">Store Settings</a> page under Inventory Preferences.</p>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by product name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                    />
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 font-semibold">
                        <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">SKU</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-center">Track Qty</th>
                            <th className="px-4 py-3 w-32">Available</th>
                            <th className="px-4 py-3 w-32">Low Stock At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                                    No products found matching your search.
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {product.imageUrls?.[0] ? (
                                                <img src={product.imageUrls[0]} className="w-10 h-10 rounded-lg object-cover border border-slate-200" alt={product.name} />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                                    <ClipboardList className="w-4 h-4 text-slate-400" />
                                                </div>
                                            )}
                                            <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input 
                                            type="text" 
                                            value={product.sku} 
                                            onChange={(e) => handleFieldChange(product.id, 'sku', e.target.value)}
                                            placeholder="Add SKU"
                                            className="w-28 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-xs font-mono"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(product)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <label className="inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={product.trackQuantity} 
                                                onChange={(e) => handleFieldChange(product.id, 'trackQuantity', e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                            />
                                        </label>
                                    </td>
                                    <td className="px-4 py-3">
                                        {product.trackQuantity ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    value={product.stockQuantity} 
                                                    onChange={(e) => handleFieldChange(product.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-2 text-xs">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={product.inStock} 
                                                        onChange={(e) => handleFieldChange(product.id, 'inStock', e.target.checked)}
                                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                    />
                                                    In Stock
                                                </label>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <input 
                                            type="number" 
                                            value={product.lowStockThreshold} 
                                            disabled={!product.trackQuantity}
                                            onChange={(e) => handleFieldChange(product.id, 'lowStockThreshold', parseInt(e.target.value) || 0)}
                                            className="w-16 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm disabled:opacity-50"
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
