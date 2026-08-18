import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Smartphone, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaStoreMobileNavigation() {
    const { storeId, setParentStore } = useOutletContext();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [mobileBottomMenu, setMobileBottomMenu] = useState([
        { id: 'home', enabled: true },
        { id: 'search', enabled: true },
        { id: 'cart', enabled: true },
        { id: 'whatsapp', enabled: true },
        { id: 'categories', enabled: false },
        { id: 'policies', enabled: false },
        { id: 'profile', enabled: false }
    ]);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
                const myStore = res.data.find(s => s.id === storeId);
                setStore(myStore);
                if (myStore?.mobileBottomMenu) setMobileBottomMenu(myStore.mobileBottomMenu);
            } catch (error) {
                toast.error('Failed to load store settings');
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [storeId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                mobileBottomMenu
            });
            toast.success('Mobile navigation saved successfully!');
        } catch (error) {
            toast.error('Failed to save mobile navigation');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Smartphone className="w-8 h-8 text-indigo-500" />
                    Mobile Navigation
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    Configure the icons that appear in the sticky navigation bar on mobile devices.
                </p>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-indigo-400" /> Mobile Bottom Menu
                    </h3>
                </div>
                <div className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {mobileBottomMenu.map((item, idx) => (
                            <label key={item.id} className="flex items-start gap-3 cursor-pointer p-3 border border-slate-200 dark:border-white/5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="relative mt-0.5 shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={item.enabled}
                                        onChange={e => {
                                            const updated = [...mobileBottomMenu];
                                            updated[idx].enabled = e.target.checked;
                                            setMobileBottomMenu(updated);
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div
                                        className={`w-9 h-5 rounded-full transition-colors cursor-pointer border-2 ${item.enabled
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        <div className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${item.enabled ? 'translate-x-4' : 'translate-x-0'
                                            }`} />
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-sm font-semibold text-slate-900 dark:text-white capitalize">{item.id}</span>
                                    <span className="block text-xs text-slate-500 mt-0.5">
                                        Show {item.id} icon in the bottom menu
                                    </span>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold sm:font-medium transition-all text-sm shadow-sm flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Navigation'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
