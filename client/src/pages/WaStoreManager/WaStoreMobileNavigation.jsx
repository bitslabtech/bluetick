import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Smartphone, Save, Loader2, Plus, Trash2, * as Icons } from 'lucide-react';
import toast from 'react-hot-toast';

const AVAILABLE_ICONS = [
    'Star', 'Info', 'HelpCircle', 'Tag', 'Heart', 'Award', 'FileText', 'Settings',
    'MessageSquare', 'Phone', 'Mail', 'Globe', 'ShoppingBag', 'Bell', 'Calendar',
    'MapPin', 'CreditCard', 'Truck', 'Gift', 'Briefcase', 'Coffee', 'Bookmark',
    'Compass', 'Shield', 'Activity', 'Camera', 'Music', 'Target', 'Zap'
];

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

    const [customPages, setCustomPages] = useState([]);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
                const myStore = res.data.find(s => s.id === storeId);
                setStore(myStore);
                if (myStore?.mobileBottomMenu) setMobileBottomMenu(myStore.mobileBottomMenu);
                if (myStore?.customPages) setCustomPages(myStore.customPages);
            } catch (error) {
                toast.error('Failed to load store settings');
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [storeId]);

    const handleSave = async () => {
        // Validation: If any custom item is enabled, it MUST have a pageSlug selected.
        for (const item of mobileBottomMenu) {
            if (item.type === 'custom' && item.enabled) {
                if (!item.pageSlug) {
                    toast.error(`Please select a custom page for the menu item "${item.label}"`);
                    return;
                }
            }
        }

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

    const handleAddCustomItem = () => {
        const newId = `custom_${Date.now()}`;
        setMobileBottomMenu(prev => [
            ...prev, 
            { 
                id: newId, 
                type: 'custom', 
                enabled: true, 
                pageSlug: '', 
                icon: 'Star', 
                label: 'New Menu' 
            }
        ]);
    };

    const handleDeleteCustomItem = (id) => {
        if (window.confirm('Remove this custom menu item?')) {
            setMobileBottomMenu(prev => prev.filter(item => item.id !== id));
        }
    };

    const updateCustomItem = (id, updates) => {
        setMobileBottomMenu(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const standardItems = mobileBottomMenu.filter(item => item.type !== 'custom');
    const customItems = mobileBottomMenu.filter(item => item.type === 'custom');

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-300 pb-20">
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
                        <Smartphone className="w-4 h-4 text-indigo-400" /> Standard Menu Items
                    </h3>
                </div>
                <div className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {standardItems.map((item) => (
                            <label key={item.id} className="flex items-start gap-3 cursor-pointer p-3 border border-slate-200 dark:border-white/5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="relative mt-0.5 shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={item.enabled}
                                        onChange={e => {
                                            setMobileBottomMenu(prev => prev.map(m => m.id === item.id ? { ...m, enabled: e.target.checked } : m));
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
                </div>
            </div>

            {/* Custom Internal Pages Section */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Plus className="w-4 h-4 text-indigo-400" /> Custom Internal Pages
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Add custom pages created in "Pages & Policies" to your mobile menu.</p>
                    </div>
                    <button
                        onClick={handleAddCustomItem}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg text-sm font-bold transition-colors shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Custom Item</span>
                    </button>
                </div>
                <div className="p-4 md:p-6 space-y-4">
                    {customItems.length === 0 ? (
                        <div className="text-center p-6 border border-dashed border-slate-300 dark:border-white/20 rounded-2xl text-slate-500">
                            No custom items added. Click "Add Custom Item" above.
                        </div>
                    ) : (
                        customItems.map((item) => {
                            const IconComp = Icons[item.icon] || Icons.Star;
                            return (
                                <div key={item.id} className="p-4 border border-slate-200 dark:border-white/10 rounded-xl space-y-4 bg-slate-50/50 dark:bg-black/10">
                                    <div className="flex items-start justify-between">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className="relative mt-0.5 shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={item.enabled}
                                                    onChange={e => updateCustomItem(item.id, { enabled: e.target.checked })}
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
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Enable this menu item</span>
                                        </label>
                                        <button
                                            onClick={() => handleDeleteCustomItem(item.id)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                        {/* Internal Page Dropdown */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Select Page <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={item.pageSlug || ''}
                                                onChange={e => updateCustomItem(item.id, { pageSlug: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                            >
                                                <option value="" disabled>Select Custom Page</option>
                                                {customPages.map(cp => (
                                                    <option key={cp.slug} value={cp.slug}>{cp.title}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Icon Dropdown */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Icon
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <IconComp className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <select
                                                    value={item.icon || 'Star'}
                                                    onChange={e => updateCustomItem(item.id, { icon: e.target.value })}
                                                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none"
                                                >
                                                    {AVAILABLE_ICONS.map(iconName => (
                                                        <option key={iconName} value={iconName}>{iconName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Label Input */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Menu Label
                                            </label>
                                            <input
                                                type="text"
                                                value={item.label || ''}
                                                onChange={e => updateCustomItem(item.id, { label: e.target.value })}
                                                placeholder="e.g. FAQ"
                                                className="w-full px-3 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                
                <div className="p-4 md:p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex justify-end">
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
    );
}
