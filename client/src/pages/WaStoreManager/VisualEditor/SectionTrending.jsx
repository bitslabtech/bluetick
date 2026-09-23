import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function SectionTrending({ draft, updateDraft }) {
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <TrendingUp className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Trending Now</p>
                    
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                    Section Title
                </label>
                <input
                    type="text"
                    value={draft.trendingTitle || ''}
                    onChange={(e) => updateDraft({ trendingTitle: e.target.value })}
                    placeholder="e.g. Trending Now, New Arrivals"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white placeholder-gray-400"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                    Number of Products to Show
                </label>
                <input
                    type="number"
                    min="4"
                    max="20"
                    value={draft.trendingLimit || 8}
                    onChange={(e) => updateDraft({ trendingLimit: parseInt(e.target.value) || 8 })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white placeholder-gray-400"
                />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    💡 To show or hide this section, use the <strong>eye icon</strong> in the Sections list on the left.
                </p>
            </div>

            <p className="text-xs text-gray-300 dark:text-slate-600 leading-relaxed">
                Tip: The "Collections" section is a more powerful alternative — it lets you show products from specific categories with custom titles, instead of just the newest ones.
            </p>
        </div>
    );
}
