import React from 'react';
import { Zap, Plus } from 'lucide-react';

export default function QuickReplySuggestions({ replies, query, onSelect, onCreate }) {
    // Filter replies by the typed shortcut (after /)
    const filtered = replies.filter(r =>
        r.shortcut.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#233138] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-64 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    Quick Replies
                </div>
                <button
                    onClick={onCreate}
                    type="button"
                    className="flex items-center gap-1 text-[10px] bg-indigo-600 dark:bg-indigo-500 text-white dark:text-white px-2 py-1 rounded font-medium hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-sm transition-colors"
                >
                    <Plus className="w-3 h-3" /> New
                </button>
            </div>

            <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                        No shortcuts matching "/{query}"
                    </div>
                ) : (
                    filtered.map(reply => (
                        <button
                            key={reply.id}
                            type="button"
                            onClick={() => onSelect(reply.message)}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-50 dark:border-white/5 last:border-0"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded shrink-0">
                                    /{reply.shortcut}
                                </span>
                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{reply.message}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
