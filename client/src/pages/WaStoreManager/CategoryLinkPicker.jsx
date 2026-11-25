import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ListTree, ChevronDown, Search, Check, CornerDownRight } from 'lucide-react';
import { parseCategoryLink, buildCategoryLink } from '../../utils/storeMenuLinks';

const PANEL_HEIGHT = 320;

// Searchable list of categories with their subcategories, for a navigation menu destination.
export default function CategoryLinkPicker({ categories, subcategories, link, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [pos, setPos] = useState(null);
    const buttonRef = useRef(null);
    const panelRef = useRef(null);
    const selected = parseCategoryLink(link);

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        return categories.map(category => {
            const subs = (Array.isArray(subcategories[category]) ? subcategories[category] : [])
                .map(s => (typeof s === 'string' ? s : s?.name))
                .filter(Boolean);
            // A matching category shows all its subcategories; otherwise only the matching ones
            if (!q || category.toLowerCase().includes(q)) return { category, subs };
            const hits = subs.filter(s => s.toLowerCase().includes(q));
            return hits.length ? { category, subs: hits } : null;
        }).filter(Boolean);
    }, [categories, subcategories, query]);

    // The panel is rendered on <body> so the menu cards cannot clip or cover it
    const openPanel = () => {
        const r = buttonRef.current.getBoundingClientRect();
        const width = Math.min(Math.max(r.width, 260), window.innerWidth - 16);
        const above = window.innerHeight - r.bottom < PANEL_HEIGHT && r.top > window.innerHeight - r.bottom;
        setPos({
            width,
            left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
            ...(above ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
        });
        setQuery('');
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const outside = (e) => !panelRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target);
        const onDown = (e) => outside(e) && setOpen(false);
        const onScroll = (e) => !panelRef.current?.contains(e.target) && setOpen(false);
        const onResize = () => setOpen(false);
        document.addEventListener('mousedown', onDown);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open]);

    const pick = (category, sub) => {
        onChange(buildCategoryLink(category, sub));
        setOpen(false);
    };

    const onSearchKey = (e) => {
        if (e.key === 'Escape') setOpen(false);
        if (e.key === 'Enter' && groups.length) {
            e.preventDefault();
            const q = query.trim().toLowerCase();
            const first = groups[0];
            const categoryMatches = !q || first.category.toLowerCase().includes(q);
            pick(first.category, categoryMatches ? '' : first.subs[0]);
        }
    };

    const rowClass = (active) => `w-full flex items-center gap-2 text-left rounded-lg py-2 pr-2 text-sm transition-colors ${active
        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5'}`;

    const label = selected.category
        ? (selected.sub ? `${selected.category} › ${selected.sub}` : selected.category)
        : (categories.length ? 'Select a category' : 'No categories found');

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => (open ? setOpen(false) : openPanel())}
                disabled={categories.length === 0}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="w-full flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all disabled:opacity-60"
            >
                <ListTree className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {open && createPortal(
                <div
                    ref={panelRef}
                    style={{ position: 'fixed', ...pos }}
                    className="z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                    <div className="relative p-2 border-b border-slate-100 dark:border-white/10">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={onSearchKey}
                            placeholder="Search category or subcategory"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1" role="listbox">
                        {groups.length === 0 && (
                            <p className="px-3 py-4 text-sm text-slate-500 text-center">No match found</p>
                        )}
                        {groups.map(({ category, subs }) => {
                            const active = selected.category === category && !selected.sub;
                            return (
                                <div key={category}>
                                    <button type="button" role="option" aria-selected={active} onClick={() => pick(category, '')} className={`${rowClass(active)} pl-3 font-semibold`}>
                                        <span className="flex-1 truncate">{category}</span>
                                        {active && <Check className="w-4 h-4 shrink-0" />}
                                    </button>
                                    {subs.map(sub => {
                                        const subActive = selected.category === category && selected.sub === sub;
                                        return (
                                            <button key={sub} type="button" role="option" aria-selected={subActive} onClick={() => pick(category, sub)} className={`${rowClass(subActive)} pl-6`}>
                                                <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="flex-1 truncate">{sub}</span>
                                                {subActive && <Check className="w-4 h-4 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
