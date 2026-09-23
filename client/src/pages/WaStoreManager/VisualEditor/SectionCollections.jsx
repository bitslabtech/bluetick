import React, { useEffect, useState } from 'react';
import { GripVertical, X, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function SectionCollections({ draft, updateDraft }) {
    const collections = draft.homepageCollections || [];
    const [availableCategories, setAvailableCategories] = useState([]);
    const [loadingCats, setLoadingCats] = useState(false);
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    // Fetch available categories from the public store API
    useEffect(() => {
        if (!draft?.slug) return;
        setLoadingCats(true);
        axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${draft.slug}`)
            .then(res => {
                const cats = new Set();
                (res.data?.products || []).forEach(p => { if (p.category) cats.add(p.category); });
                setAvailableCategories([...cats].filter(Boolean).sort());
            })
            .catch(() => {})
            .finally(() => setLoadingCats(false));
    }, [draft?.slug]);

    const unused = availableCategories.filter(c => !collections.includes(c));

    const addCollection = (cat) => {
        updateDraft({ homepageCollections: [...collections, cat] });
    };

    const removeCollection = (cat) => {
        updateDraft({ homepageCollections: collections.filter(c => c !== cat) });
    };

    const handleDragStart = (idx) => setDragIdx(idx);
    const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleDrop = (toIdx) => {
        if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return; }
        const next = [...collections];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(toIdx, 0, moved);
        updateDraft({ homepageCollections: next });
        setDragIdx(null);
        setDragOverIdx(null);
    };
    const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

    return (
        <div className="space-y-5">


            {/* Current collection rows */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    Collection Rows ({collections.length})
                </label>

                {collections.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 py-2">No collections yet. Add a category below to create your first collection row.</p>
                )}

                <div className="space-y-1.5">
                    {collections.map((cat, idx) => (
                        <div
                            key={cat}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={() => handleDrop(idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-white/5 rounded-xl border group transition-all cursor-grab active:cursor-grabbing
                                ${dragOverIdx === idx && dragIdx !== idx ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/10' : 'border-gray-200 dark:border-white/10'}
                                ${dragIdx === idx ? 'opacity-40' : 'opacity-100'}
                            `}
                        >
                            <GripVertical className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                            <span className="text-xs text-gray-400 dark:text-slate-500 w-4 shrink-0 font-mono">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{cat}</p>
                                <p className="text-xs text-gray-400 dark:text-slate-500">8 products + View All card</p>
                            </div>
                            <button
                                onClick={() => removeCollection(cat)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 dark:text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add collection */}
            {unused.length > 0 && (
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Add Collection Row</label>
                    <div className="flex flex-wrap gap-2">
                        {unused.map(cat => (
                            <button
                                key={cat}
                                onClick={() => addCollection(cat)}
                                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 hover:bg-violet-600/20 border border-gray-200 dark:border-white/10 hover:border-violet-500 text-gray-500 dark:text-slate-400 hover:text-violet-300 rounded-xl transition-all font-medium"
                            >
                                + {cat}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {loadingCats && (
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500 py-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading categories…
                </div>
            )}
            {!loadingCats && availableCategories.length === 0 && (
                <p className="text-xs text-gray-300 dark:text-slate-600 py-2">No categories found. Add products with categories first.</p>
            )}
        </div>
    );
}
