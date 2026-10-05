import React, { useState, useEffect } from 'react';
import { X, GripVertical, Search, Check, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function CollectionEditorModal({ isOpen, onClose, collectionName, storeSlug, draft, updateDraft }) {
    // Current custom order from the draft (array of product IDs)
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Store full product objects to display them
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Add Products Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setShowAddModal(false);
            return;
        }

        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Fetch all products for the store
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${storeSlug}`);
                const allProducts = res.data?.products || [];
                setProducts(allProducts);

                // Initialize selected IDs
                const existingCustomOrder = draft.collectionProducts?.[collectionName];
                if (existingCustomOrder && Array.isArray(existingCustomOrder) && existingCustomOrder.length > 0) {
                    // Filter out any IDs that no longer exist in the store
                    const validIds = existingCustomOrder.filter(id => allProducts.some(p => p.id === id));
                    setSelectedIds(validIds);
                } else {
                    // Default: Select all products that originally belong to this category
                    const defaultIds = allProducts
                        .filter(p => p.category === collectionName)
                        .map(p => p.id);
                    setSelectedIds(defaultIds);
                }
            } catch (error) {
                console.error("Failed to load products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [isOpen, collectionName, storeSlug, draft.collectionProducts]);

    const handleSave = () => {
        // Update the draft with the new collection products order
        const currentMapping = draft.collectionProducts || {};
        updateDraft({
            collectionProducts: {
                ...currentMapping,
                [collectionName]: selectedIds
            }
        });
        onClose();
    };

    // --- Drag and Drop Logic ---
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    const handleDragStart = (idx) => setDragIdx(idx);
    const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleDrop = (toIdx) => {
        if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return; }
        const next = [...selectedIds];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(toIdx, 0, moved);
        setSelectedIds(next);
        setDragIdx(null);
        setDragOverIdx(null);
    };
    const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

    // --- Helpers ---
    const removeProduct = (idToRemove) => {
        setSelectedIds(prev => prev.filter(id => id !== idToRemove));
    };

    const toggleProductSelection = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(pId => pId !== id);
            }
            return [...prev, id];
        });
    };

    if (!isOpen) return null;

    // Ordered products to display in the main modal
    const orderedProducts = selectedIds
        .map(id => products.find(p => p.id === id))
        .filter(Boolean);

    // Products available to add (filtered by search)
    const availableProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {!showAddModal ? (
                // --- MAIN MODAL (Drag & Drop Reordering) ---
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[95vh]">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Collection</h2>
                            <p className="text-xs text-gray-500">
                                {collectionName} - {selectedIds.length} Products
                                <span className="mx-2 text-gray-300">|</span>
                                <span className="text-violet-600 dark:text-violet-400 font-medium">Drag and drop cards to reorder them</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {loading ? (
                            <div className="flex items-center justify-center p-8 text-gray-500">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading products...
                            </div>
                        ) : orderedProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                                <AlertTriangle className="w-8 h-8 text-yellow-500 mb-3" />
                                <p className="text-sm font-medium text-gray-900 dark:text-white">No products selected</p>
                                <p className="text-xs text-gray-500 mt-1 mb-4">Add products to this collection to show them on the homepage.</p>
                                <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg">
                                    Add Products
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3">
                                {orderedProducts.map((product, idx) => (
                                    <div
                                        key={product.id}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDrop={() => handleDrop(idx)}
                                        onDragEnd={handleDragEnd}
                                        className={`relative flex flex-col p-2 bg-white dark:bg-slate-800 border rounded-xl group cursor-grab active:cursor-grabbing transition-all
                                            ${dragOverIdx === idx && dragIdx !== idx ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-white/10'}
                                            ${dragIdx === idx ? 'opacity-40 scale-[0.96]' : 'opacity-100 scale-100'}
                                        `}
                                    >
                                        <div className="absolute top-4 right-4 z-10">
                                            <button
                                                onClick={() => removeProduct(product.id)}
                                                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-gray-500 hover:text-red-500 hover:bg-red-50 dark:bg-black/60 dark:text-gray-300 dark:hover:bg-red-500/80 transition-all shadow-sm opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100"
                                                title="Remove from collection"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="absolute top-4 left-4 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm dark:bg-black/60 shadow-sm opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                                            <GripVertical className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                                        </div>

                                        <div className="absolute top-4 left-4 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md shadow-sm group-hover:opacity-0 transition-opacity">
                                            <span className="text-[10px] text-white font-mono font-medium">{idx + 1}</span>
                                        </div>
                                        
                                        <div className="w-full aspect-square rounded-xl bg-gray-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-white/5 mb-2.5">
                                            {product.imageUrls?.[0] ? (
                                                <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col justify-between">
                                            <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug">{product.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {orderedProducts.length > 0 && (
                            <button 
                                onClick={() => setShowAddModal(true)}
                                className="w-full flex items-center justify-center gap-2 p-3 mt-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 dark:hover:text-violet-400 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Add More Products
                            </button>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm">
                            Save Collection
                        </button>
                    </div>
                </div>
            ) : (
                // --- SECONDARY MODAL (Add Products Selector) ---
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col h-[95vh]">
                    <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Select Products</h2>
                            <button onClick={() => { setShowAddModal(false); setSearchQuery(''); }} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {availableProducts.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                No products match your search.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {availableProducts.map(product => {
                                    const isSelected = selectedIds.includes(product.id);
                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => toggleProductSelection(product.id)}
                                            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors
                                                ${isSelected ? 'bg-violet-50 dark:bg-violet-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                                            `}
                                        >
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors
                                                ${isSelected ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800'}
                                            `}>
                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                            </div>

                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden border border-gray-200 dark:border-white/5">
                                                {product.imageUrls?.[0] ? (
                                                    <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{product.category}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {selectedIds.length} Selected
                        </span>
                        <button 
                            onClick={() => { setShowAddModal(false); setSearchQuery(''); }} 
                            className="px-6 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
