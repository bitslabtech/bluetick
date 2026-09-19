import React from 'react';
import { Grid2X2 } from 'lucide-react';

const COL_OPTIONS = [
    { value: 3, label: '3 Columns' },
    { value: 4, label: '4 Columns' },
    { value: 5, label: '5 Columns' },
];

const SORT_OPTIONS = [
    { value: 'newest',     label: 'Newest First' },
    { value: 'oldest',     label: 'Oldest First' },
    { value: 'price_asc',  label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
    { value: 'name_asc',   label: 'Name A → Z' },
];

const PAGINATION_OPTIONS = [
    { value: 'none',       label: 'Show All Products' },
    { value: 'load_more',  label: 'Load More Button' },
    { value: 'pagination', label: 'Page Numbers' },
];

export default function SectionProducts({ draft, updateDraft }) {
    const config = draft.productGridConfig || {};
    const columns = config.columns || 2;
    const defaultSort = config.defaultSort || 'newest';
    const paginationMode = config.paginationMode || draft.paginationConfig?.mode || 'load_more';

    const update = (key, val) => {
        updateDraft({ productGridConfig: { ...config, [key]: val } });
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <Grid2X2 className="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0" />
                <p className="text-xs text-gray-500 dark:text-slate-400">Controls the main product grid that shows all products.</p>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Columns (Desktop)</label>
                <div className="grid grid-cols-3 gap-2">
                    {COL_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => update('columns', opt.value)}
                            className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${columns === opt.value ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:border-white/30'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Default Sort</label>
                <div className="space-y-1.5">
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => update('defaultSort', opt.value)}
                            className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-all ${defaultSort === opt.value ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:border-white/30 hover:text-gray-900 dark:text-white'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Pagination Mode</label>
                <div className="space-y-1.5">
                    {PAGINATION_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => update('paginationMode', opt.value)}
                            className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-all ${paginationMode === opt.value ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:border-white/30 hover:text-gray-900 dark:text-white'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
