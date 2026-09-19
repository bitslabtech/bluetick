import React, { useEffect, useState, useRef } from 'react';
import { GripVertical, X, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function SectionCategories({ draft, updateDraft }) {
    const [allCategories, setAllCategories] = useState([]);
    const [loadingCats, setLoadingCats] = useState(false);
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    // Fetch available categories from the public store API (and combine with draft categories)
    useEffect(() => {
        if (!draft?.slug) return;
        setLoadingCats(true);
        axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${draft.slug}`)
            .then(res => {
                const cats = new Set(draft.categories || []);
                (res.data?.products || []).forEach(p => { if (p.category) cats.add(p.category); });
                setAllCategories([...cats].filter(Boolean).sort());
            })
            .catch(() => {})
            .finally(() => setLoadingCats(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft?.slug]);

    const featured = draft.featuredCategories || [];
    const shape = draft.categoryDisplayConfig?.shape || 'circle';
    const autoplay = draft.categoryAutoplay || false;

    const unpinned = allCategories.filter(c => !featured.includes(c));

    const addCategory = (cat) => {
        updateDraft({ featuredCategories: [...featured, cat] });
    };

    const removeCategory = (cat) => {
        updateDraft({ featuredCategories: featured.filter(c => c !== cat) });
    };

    const handleDragStart = (idx) => setDragIdx(idx);
    const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleDrop = (toIdx) => {
        if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return; }
        const next = [...featured];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(toIdx, 0, moved);
        updateDraft({ featuredCategories: next });
        setDragIdx(null);
        setDragOverIdx(null);
    };
    const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

    const setShape = (s) => {
        updateDraft({ categoryDisplayConfig: { ...(draft.categoryDisplayConfig || {}), shape: s } });
    };

    const toggleAutoplay = () => {
        updateDraft({ categoryAutoplay: !autoplay });
    };

    return (
        <div className="space-y-5">
            {/* Shape */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Category Shape</label>
                <div className="grid grid-cols-2 gap-2">
                    {[{value: 'circle', label: 'Circle', icon: '◉'}, {value: 'round', label: 'Round', icon: '◻'}].map(s => (
                        <button
                            key={s.value}
                            onClick={() => setShape(s.value)}
                            className={`py-2.5 rounded-xl border text-sm font-medium transition-all capitalize ${shape === s.value ? 'bg-violet-50 dark:bg-violet-600/20 border-violet-500 text-violet-700 dark:text-violet-300 shadow-sm' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-slate-500'}`}
                        >
                            {s.icon} {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Autoplay */}
            <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <span className="text-sm text-gray-900 dark:text-white">Auto-scroll</span>
                <button
                    onClick={toggleAutoplay}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoplay ? 'bg-violet-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoplay ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            {/* Pinned categories */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    Pinned in slider {featured.length > 0 ? `(${featured.length})` : '— showing all'}
                </label>

                {featured.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 py-2">All categories shown. Pin specific ones below to control order.</p>
                )}

                <div className="space-y-1.5">
                    {featured.map((cat, idx) => (
                        <div
                            key={cat}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={() => handleDrop(idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-white/5 rounded-lg border group transition-all cursor-grab active:cursor-grabbing
                                ${dragOverIdx === idx && dragIdx !== idx ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/10' : 'border-gray-200 dark:border-white/10'}
                                ${dragIdx === idx ? 'opacity-40' : 'opacity-100'}
                            `}
                        >
                            <GripVertical className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" />
                            <span className="text-xs text-gray-400 dark:text-slate-500 w-4 shrink-0 font-mono">{idx + 1}.</span>
                            <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">{cat}</span>
                            <button onClick={() => removeCategory(cat)} className="p-0.5 text-gray-400 dark:text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add from remaining */}
                {unpinned.length > 0 && (
                    <div className="space-y-1">
                        <label className="text-xs text-gray-300 dark:text-slate-600">Add category:</label>
                        <div className="flex flex-wrap gap-1.5">
                            {unpinned.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => addCategory(cat)}
                                    className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-slate-800 hover:bg-violet-600/20 border border-gray-200 dark:border-white/10 hover:border-violet-500 text-gray-500 dark:text-slate-400 hover:text-violet-300 rounded-lg transition-all"
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
                {!loadingCats && allCategories.length === 0 && (
                    <p className="text-xs text-gray-300 dark:text-slate-600 py-2">No categories found. Add products with categories first.</p>
                )}
            </div>
        </div>
    );
}
