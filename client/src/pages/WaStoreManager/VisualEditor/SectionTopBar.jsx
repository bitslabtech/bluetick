import React from 'react';
import { Megaphone, ToggleLeft, ToggleRight } from 'lucide-react';

const DEFAULT_BAR = {
    enabled: false,
    messages: [{ id: '1', text: '🚀 Free shipping on orders above ₹999!' }],
    bgColor: '#1e1b4b',
    textColor: '#ffffff',
    marquee: false,
    fontSize: 'sm',
    padding: 'sm',
};

const PRESETS = [
    { label: 'Midnight', bg: '#0f0f0f', text: '#ffffff' },
    { label: 'Indigo',   bg: '#3730a3', text: '#ffffff' },
    { label: 'Rose',     bg: '#be123c', text: '#ffffff' },
    { label: 'Emerald',  bg: '#065f46', text: '#ffffff' },
    { label: 'Amber',    bg: '#92400e', text: '#fef3c7' },
    { label: 'Sky',      bg: '#075985', text: '#e0f2fe' },
    { label: 'Gold',     bg: '#78350f', text: '#fef08a' },
    { label: 'White',    bg: '#ffffff', text: '#1e293b' },
];

export default function SectionTopBar({ draft, updateDraft }) {
    const config = { ...DEFAULT_BAR, ...(draft.topBarConfig || {}) };

    const update = (key, val) => {
        updateDraft({ topBarConfig: { ...config, [key]: val } });
    };

    const updateColors = (bg, text) => {
        updateDraft({ topBarConfig: { ...config, bgColor: bg, textColor: text } });
    };

    const updateMsg = (idx, text) => {
        const msgs = config.messages.map((m, i) => i === idx ? { ...m, text } : m);
        update('messages', msgs);
    };

    const addMsg = () => {
        update('messages', [...config.messages, { id: Date.now().toString(), text: '✨ New announcement…' }]);
    };

    const removeMsg = (idx) => {
        if (config.messages.length <= 1) return;
        update('messages', config.messages.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Enable Top Bar</span>
                </div>
                <button
                    onClick={() => update('enabled', !config.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? 'bg-violet-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            {/* Messages */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Messages</label>
                {config.messages.map((msg, idx) => (
                    <div key={msg.id} className="flex gap-2">
                        <input
                            type="text"
                            value={msg.text}
                            onChange={e => updateMsg(idx, e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                        <button
                            onClick={() => removeMsg(idx)}
                            disabled={config.messages.length <= 1}
                            className="px-2 py-2 text-gray-400 dark:text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors"
                        >✕</button>
                    </div>
                ))}
                {config.messages.length < 5 && (
                    <button onClick={addMsg} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">+ Add Message</button>
                )}
            </div>

            {/* Color Presets */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Color</label>
                <div className="grid grid-cols-4 gap-2">
                    {PRESETS.map(p => (
                        <button
                            key={p.label}
                            onClick={() => updateColors(p.bg, p.text)}
                            className={`h-8 rounded-lg border-2 transition-all ${config.bgColor === p.bg ? 'border-violet-400 scale-105' : 'border-transparent hover:border-white/30'}`}
                            style={{ backgroundColor: p.bg }}
                            title={p.label}
                        />
                    ))}
                </div>
                {/* Custom color pickers */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Background</label>
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl">
                            <input
                                type="color"
                                value={config.bgColor || '#1e1b4b'}
                                onChange={e => update('bgColor', e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <span className="text-xs font-mono text-gray-500 dark:text-slate-400">{config.bgColor}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Text</label>
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl">
                            <input
                                type="color"
                                value={config.textColor || '#ffffff'}
                                onChange={e => update('textColor', e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <span className="text-xs font-mono text-gray-500 dark:text-slate-400">{config.textColor}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Marquee toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <span className="text-sm text-gray-900 dark:text-white">Scrolling Marquee</span>
                <button
                    onClick={() => update('marquee', !config.marquee)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.marquee ? 'bg-violet-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config.marquee ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
        </div>
    );
}
