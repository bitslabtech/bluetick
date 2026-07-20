import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Megaphone, Save, Plus, Trash2, Eye, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_BAR = {
    enabled: false,
    messages: [{ id: '1', text: '🚀 Free shipping on orders above ₹999!' }],
    bgColor: '#1e1b4b',
    textColor: '#ffffff',
    marquee: false,
    fontSize: 'sm',
    padding: 'sm',
};

export default function WaStoreTopBar() {
    const { store, storeId, setParentStore } = useOutletContext();
    const [config, setConfig] = useState(() => ({
        ...DEFAULT_BAR,
        ...(store?.topBarConfig || {}),
        messages: store?.topBarConfig?.messages?.length
            ? store.topBarConfig.messages
            : DEFAULT_BAR.messages,
    }));
    const [saving, setSaving] = useState(false);

    const set = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

    const updateMsg = (idx, text) =>
        setConfig(prev => ({
            ...prev,
            messages: prev.messages.map((m, i) => i === idx ? { ...m, text } : m),
        }));

    const addMsg = () => {
        const newMsgs = [...config.messages, { id: Date.now().toString(), text: '✨ New announcement here...' }];
        setConfig(prev => ({ ...prev, messages: newMsgs }));
    };

    const removeMsg = (idx) => {
        if (config.messages.length <= 1) return;
        setConfig(prev => ({ ...prev, messages: prev.messages.filter((_, i) => i !== idx) }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, { topBarConfig: config });
            if (setParentStore) setParentStore(prev => ({ ...prev, topBarConfig: config }));
            toast.success('Top bar saved!');
        } catch {
            toast.error('Failed to save top bar settings.');
        } finally {
            setSaving(false);
        }
    };

    const previewText = config.messages.map(m => m.text).join('   •   ');
    const paddingMap = { sm: 'py-1.5', md: 'py-2.5', lg: 'py-3.5' };
    const fontSizeMap = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
    // Marquee duration: longer text = slower to maintain reading speed
    const marqueeDuration = Math.max(8, Math.round(previewText.length * 0.12));

    const PRESETS = [
        { label: 'Midnight', bg: '#0f0f0f', text: '#ffffff' },
        { label: 'Indigo', bg: '#3730a3', text: '#ffffff' },
        { label: 'Rose', bg: '#be123c', text: '#ffffff' },
        { label: 'Emerald', bg: '#065f46', text: '#ffffff' },
        { label: 'Amber', bg: '#92400e', text: '#fef3c7' },
        { label: 'Sky', bg: '#075985', text: '#e0f2fe' },
        { label: 'Gold', bg: '#78350f', text: '#fef08a' },
        { label: 'White', bg: '#ffffff', text: '#1e293b' },
    ];

    return (
        <div className="max-w-4xl space-y-6 pb-20">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-indigo-500" />
                    Top Announcement Bar
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Show a sticky announcement bar above your store header. Add multiple messages with scrolling marquee effect.
                </p>
            </div>

            {/* ── LIVE PREVIEW ── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Live Preview</span>
                    <span className="ml-auto text-xs text-slate-400">Updates as you type</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-900">
                    {/* Top bar simulation */}
                    {config.enabled ? (
                        <div
                            className={`w-full overflow-hidden flex items-center justify-center ${paddingMap[config.padding] || 'py-1.5'}`}
                            style={{ backgroundColor: config.bgColor }}
                        >
                            {config.marquee ? (
                                <>
                                    <style>{`
                                        @keyframes topbar-scroll { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
                                        .topbar-scroll { display: inline-block; white-space: nowrap; animation: topbar-scroll ${marqueeDuration}s linear infinite; }
                                    `}</style>
                                    <div className="w-full overflow-hidden">
                                        <span className="topbar-scroll">
                                            <span className={`font-medium ${fontSizeMap[config.fontSize]}`} style={{ color: config.textColor }}>
                                                {previewText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                            </span>
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <span className={`font-medium text-center ${fontSizeMap[config.fontSize]}`} style={{ color: config.textColor }}>
                                    {config.messages[0]?.text || 'Your announcement here'}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="w-full py-2 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Top bar is disabled — enable it below</span>
                        </div>
                    )}
                    {/* Fake nav bar */}
                    <div className="w-full h-12 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-5">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500" />
                            <div className="w-24 h-3 rounded-full bg-slate-200 dark:bg-slate-600" />
                        </div>
                        <div className="hidden sm:flex gap-4">
                            {[60, 48, 56].map((w, i) => <div key={i} className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700" style={{ width: w }} />)}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700" />
                    </div>
                    {/* Fake product grid stub */}
                    <div className="grid grid-cols-4 gap-2 p-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── SETTINGS ── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">

                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-white">Enable Top Bar</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show the announcement bar on your live store</p>
                    </div>
                    <button type="button" onClick={() => set('enabled', !config.enabled)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${config.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700" />

                {/* Messages */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-white text-sm">Announcement Messages</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {config.marquee ? 'All messages scroll together in a loop.' : 'Only the first message shows when marquee is off.'}
                            </p>
                        </div>
                        <button type="button" onClick={addMsg}
                            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                    </div>
                    <div className="space-y-2">
                        {config.messages.map((msg, idx) => (
                            <div key={msg.id} className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                <input
                                    type="text"
                                    value={msg.text}
                                    onChange={(e) => updateMsg(idx, e.target.value)}
                                    placeholder="Enter announcement text..."
                                    className="flex-1 px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                />
                                {config.messages.length > 1 && (
                                    <button type="button" onClick={() => removeMsg(idx)}
                                        className="p-2 text-rose-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700" />

                {/* Colors */}
                <div>
                    <p className="font-semibold text-slate-800 dark:text-white text-sm mb-4">Colors</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { label: 'Background Color', key: 'bgColor' },
                            { label: 'Text Color', key: 'textColor' },
                        ].map(({ label, key }) => (
                            <div key={key}>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <input
                                        type="color"
                                        value={config[key]}
                                        onChange={(e) => set(key, e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5 bg-white dark:bg-slate-800 shadow-sm"
                                        title={`Pick ${label.toLowerCase()}`}
                                    />
                                    <input
                                        type="text"
                                        value={config[key]}
                                        onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) set(key, e.target.value); }}
                                        className="flex-1 text-sm font-mono bg-transparent outline-none text-slate-800 dark:text-white uppercase"
                                        maxLength={7}
                                    />
                                    <div className="w-8 h-8 rounded-lg border-2 border-white dark:border-slate-700 shadow" style={{ backgroundColor: config[key] }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Presets */}
                    <div className="mt-4">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Quick Presets</p>
                        <div className="flex flex-wrap gap-2">
                            {PRESETS.map(p => (
                                <button key={p.label} type="button"
                                    onClick={() => { set('bgColor', p.bg); set('textColor', p.text); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all hover:scale-105 shadow-sm"
                                    style={{ backgroundColor: p.bg, color: p.text, borderColor: p.bg }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700" />

                {/* Style options */}
                <div>
                    <p className="font-semibold text-slate-800 dark:text-white text-sm mb-4">Style & Behaviour</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Marquee */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-slate-800 dark:text-white">Scrolling Marquee</p>
                                <button type="button" onClick={() => set('marquee', !config.marquee)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.marquee ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config.marquee ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Scrolls text right → left in a loop</p>
                        </div>

                        {/* Font size */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-medium text-slate-800 dark:text-white mb-2">Font Size</p>
                            <div className="flex gap-1.5">
                                {[{ k: 'sm', l: 'Small' }, { k: 'md', l: 'Medium' }, { k: 'lg', l: 'Large' }].map(s => (
                                    <button key={s.k} type="button" onClick={() => set('fontSize', s.k)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${config.fontSize === s.k ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'}`}>
                                        {s.l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Padding */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-medium text-slate-800 dark:text-white mb-2">Bar Height</p>
                            <div className="flex gap-1.5">
                                {[{ k: 'sm', l: 'Slim' }, { k: 'md', l: 'Normal' }, { k: 'lg', l: 'Tall' }].map(s => (
                                    <button key={s.k} type="button" onClick={() => set('padding', s.k)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${config.padding === s.k ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'}`}>
                                        {s.l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <button type="button" disabled={saving} onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-indigo-200 dark:shadow-none">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : 'Save Top Bar'}
                </button>
            </div>
        </div>
    );
}
