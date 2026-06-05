import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GripVertical, Plus, Trash2, Link as LinkIcon, Save, AlertCircle, LayoutList, CheckCircle2, Search, ShoppingCart, Menu as MenuIcon, ChevronDown, ListTree, Globe, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getThemeConfig } from '../../utils/wastoreThemes';

const API_BASE = `${import.meta.env.VITE_API_URL}`;
const imgUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function WaStoreNavigation() {
    const { store, setParentStore } = useOutletContext();
    const [megaMenu, setMegaMenu] = useState(store?.megaMenu || []);
    const [saving, setSaving] = useState(false);
    
    const categories = React.useMemo(() => {
        const cats = store?.categories || [];
        if (typeof cats === 'string') {
            try { return JSON.parse(cats); } catch { return []; }
        }
        return Array.isArray(cats) ? cats : [];
    }, [store]);

    // Drag state for top-level items
    const [draggedParentIndex, setDraggedParentIndex] = useState(null);
    const [draggedOverParentIndex, setDraggedOverParentIndex] = useState(null);

    const hasHomeSelected = React.useMemo(() => {
        return megaMenu.some(p => p.linkType === 'home' || p.children?.some(c => c.linkType === 'home'));
    }, [megaMenu]);

    // Drag state for child items
    const [draggedChildIndex, setDraggedChildIndex] = useState(null);
    const [draggedOverChildIndex, setDraggedOverChildIndex] = useState(null);
    const [draggedChildParentIndex, setDraggedChildParentIndex] = useState(null);

    const theme = React.useMemo(() => getThemeConfig(store?.themeId), [store?.themeId]);

    useEffect(() => {
        if (store?.megaMenu && megaMenu.length === 0 && store.megaMenu.length > 0) {
            setMegaMenu(store.megaMenu);
        }
    }, [store]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${store.id}`, {
                megaMenu: megaMenu
            });
            setParentStore(prev => ({ ...prev, megaMenu }));
            toast.success('Navigation menu saved successfully!');
        } catch (error) {
            toast.error('Failed to save navigation menu');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const addParentItem = () => {
        const newItem = {
            id: Date.now().toString(),
            title: 'New Menu Item',
            linkType: 'url',
            link: '',
            children: []
        };
        setMegaMenu([...megaMenu, newItem]);
    };

    const addChildItem = (parentIndex) => {
        const newMenu = [...megaMenu];
        newMenu[parentIndex].children.push({
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            title: 'Sub Item',
            linkType: 'url',
            link: ''
        });
        setMegaMenu(newMenu);
    };

    const updateParent = (index, field, value) => {
        const newMenu = [...megaMenu];
        newMenu[index][field] = value;
        // Auto-format link based on type if changing type
        if (field === 'linkType') {
            if (value === 'category' && categories.length > 0) newMenu[index].link = `/?cat=${categories[0]}`;
            else if (value === 'internal') newMenu[index].link = `/?search=`;
            else if (value === 'home') newMenu[index].link = `/`;
            else newMenu[index].link = '';
        }
        setMegaMenu(newMenu);
    };

    const updateChild = (parentIndex, childIndex, field, value) => {
        const newMenu = [...megaMenu];
        newMenu[parentIndex].children[childIndex][field] = value;
        // Auto-format link based on type if changing type
        if (field === 'linkType') {
            if (value === 'category' && categories.length > 0) newMenu[parentIndex].children[childIndex].link = `/?cat=${categories[0]}`;
            else if (value === 'internal') newMenu[parentIndex].children[childIndex].link = `/?search=`;
            else if (value === 'home') newMenu[parentIndex].children[childIndex].link = `/`;
            else newMenu[parentIndex].children[childIndex].link = '';
        }
        setMegaMenu(newMenu);
    };

    const removeParent = (index) => {
        const newMenu = [...megaMenu];
        newMenu.splice(index, 1);
        setMegaMenu(newMenu);
    };

    const removeChild = (parentIndex, childIndex) => {
        const newMenu = [...megaMenu];
        newMenu[parentIndex].children.splice(childIndex, 1);
        setMegaMenu(newMenu);
    };

    // --- Drag and Drop Logic ---
    const onParentDragStart = (e, index) => {
        e.stopPropagation();
        setDraggedParentIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => e.target.classList.add('opacity-50'), 0);
    };

    const onParentDragEnter = (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedParentIndex === null || draggedParentIndex === index) return;
        setDraggedOverParentIndex(index);
        
        const newMenu = [...megaMenu];
        const draggedItem = newMenu[draggedParentIndex];
        newMenu.splice(draggedParentIndex, 1);
        newMenu.splice(index, 0, draggedItem);
        
        setDraggedParentIndex(index);
        setMegaMenu(newMenu);
    };

    const onParentDragEnd = (e) => {
        e.stopPropagation();
        e.target.classList.remove('opacity-50');
        setDraggedParentIndex(null);
        setDraggedOverParentIndex(null);
    };

    const onChildDragStart = (e, parentIndex, childIndex) => {
        e.stopPropagation();
        setDraggedChildParentIndex(parentIndex);
        setDraggedChildIndex(childIndex);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => e.target.classList.add('opacity-50'), 0);
    };

    const onChildDragEnter = (e, parentIndex, childIndex) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedChildParentIndex !== parentIndex) return;
        if (draggedChildIndex === null || draggedChildIndex === childIndex) return;
        setDraggedOverChildIndex(childIndex);
        
        const newMenu = [...megaMenu];
        const children = newMenu[parentIndex].children;
        const draggedItem = children[draggedChildIndex];
        
        children.splice(draggedChildIndex, 1);
        children.splice(childIndex, 0, draggedItem);
        
        setDraggedChildIndex(childIndex);
        setMegaMenu(newMenu);
    };

    const onChildDragEnd = (e) => {
        e.stopPropagation();
        e.target.classList.remove('opacity-50');
        setDraggedChildIndex(null);
        setDraggedOverChildIndex(null);
        setDraggedChildParentIndex(null);
    };

    // Helper to render the link input based on linkType
    const renderLinkInput = (item, updateFn) => {
        const type = item.linkType || 'url';
        
        return (
            <div className="flex gap-2 w-full">
                <select 
                    value={type} 
                    onChange={(e) => updateFn('linkType', e.target.value)}
                    className="w-1/3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all font-medium"
                >
                    <option value="home" disabled={hasHomeSelected && type !== 'home'}>Home Page {hasHomeSelected && type !== 'home' ? '(Already used)' : ''}</option>
                    <option value="url">Custom URL</option>
                    <option value="category">Category</option>
                    <option value="internal">Internal Page</option>
                </select>

                <div className="flex-1 relative">
                    {type === 'home' && (
                        <div className="w-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-lg pl-3 pr-3 py-2 text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" /> Links to your main store page.
                        </div>
                    )}
                    
                    {type === 'url' && (
                        <>
                            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text" 
                                value={item.link} 
                                onChange={(e) => updateFn('link', e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                            />
                        </>
                    )}
                    
                    {type === 'category' && (
                        <>
                            <ListTree className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select 
                                value={item.link.replace('/?cat=', '')} 
                                onChange={(e) => updateFn('link', `/?cat=${e.target.value}`)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all appearance-none"
                            >
                                {categories.length === 0 && <option value="">No categories found</option>}
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </>
                    )}

                    {type === 'internal' && (
                        <>
                            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select 
                                value={item.link} 
                                onChange={(e) => updateFn('link', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all appearance-none"
                            >
                                <option value="/?search=">All Products</option>
                            </select>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // --- Visual Header Mock ---
    const HeaderPreview = () => (
        <div className={`w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl mb-8 font-sans ${theme.text}`} style={{ fontFamily: theme.fontFamily }}>
            {/* Browser top bar mock */}
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-200 dark:border-white/10">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
                <div className="flex-1 text-center">
                    <div className="inline-block bg-white dark:bg-slate-900 rounded-md px-3 py-0.5 text-[10px] text-slate-500 font-mono border border-slate-200 dark:border-white/10">
                        {store.customDomain || `${store.slug}.store.com`}
                    </div>
                </div>
            </div>

            {/* Actual Store Header */}
            <div className={`relative ${theme.pageBg}`}>
                <header className={theme.header}>
                    {theme.id === 'vogue' ? (
                        <div className="max-w-screen-xl mx-auto px-10 h-20 grid grid-cols-3 items-center">
                            <div className="flex items-center gap-2 border border-gray-300 rounded-[15px] px-3.5 py-2 max-w-[220px]">
                                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="text-[13px] text-gray-400 tracking-wide">Search</span>
                            </div>
                            <div className="flex items-center justify-center">
                                {store.logo ? (
                                    <img src={imgUrl(store.logo)} alt={store.name} className="h-12 max-w-[180px] object-contain" />
                                ) : (
                                    <span className="text-xl tracking-[0.25em] uppercase text-black font-normal">{store.name}</span>
                                )}
                            </div>
                            <div className="flex items-center justify-end">
                                <div className="relative flex items-center justify-center p-2 text-black">
                                    <ShoppingCart className="w-5 h-5 text-black stroke-[1.5]" />
                                    <span className="absolute -top-1 -right-1 flex items-center justify-center bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full border border-white">2</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={theme.headerWrapper || "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between"}>
                            <div className={`flex items-center gap-3 ${theme.logoWrapper || ''}`}>
                                <MenuIcon className={`md:hidden w-6 h-6 ${theme.textMuted}`} />
                                {store.logo && (
                                    <img src={imgUrl(store.logo)} alt={store.name} className="w-12 h-12 object-contain rounded-md" />
                                )}
                                <span className={`font-semibold text-xl tracking-tight ${theme.headerLogo}`}>{store.name}</span>
                            </div>
                            <div className={`hidden md:flex flex-1 max-w-md relative group ${theme.searchWrapper !== undefined ? theme.searchWrapper : 'mx-8'}`}>
                                <Search className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                                <div className={`w-full ${theme.searchStyle} py-2.5 pl-11 pr-4 text-sm flex items-center text-gray-400`}>Search products...</div>
                            </div>
                            <div className={`relative p-2 ${theme.cartButton} rounded-full flex items-center justify-center ${theme.cartWrapper || ''}`}>
                                <ShoppingCart className="w-6 h-6 stroke-[1.5]" />
                                <span className={`absolute -top-1 -right-1 ${theme.cartBadge} text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm`}>2</span>
                            </div>
                        </div>
                    )}

                    {/* LIVE MEGA MENU PREVIEW */}
                    <div className="w-full border-t border-gray-200/50 hidden md:block">
                        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                            <ul className="flex items-center justify-center space-x-10 h-12">
                                {megaMenu.map((menuItem) => (
                                    <li key={menuItem.id} className="h-full relative group flex items-center">
                                        <div className="flex items-center h-full text-sm font-semibold tracking-wide hover:opacity-70 transition-opacity uppercase cursor-default">
                                            {menuItem.title || 'Untitled'}
                                            {menuItem.children && menuItem.children.length > 0 && (
                                                <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-50 transition-transform group-hover:rotate-180" />
                                            )}
                                        </div>
                                        
                                        {/* Dropdown */}
                                        {menuItem.children && menuItem.children.length > 0 && (
                                            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-56 bg-white border border-gray-100 shadow-2xl rounded-xl py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top translate-y-2 group-hover:translate-y-0 z-50">
                                                <ul className="flex flex-col">
                                                    {menuItem.children.map(child => (
                                                        <li key={child.id}>
                                                            <div className="block px-5 py-2.5 text-[13px] font-medium text-gray-700 hover:text-black hover:bg-gray-50 transition-colors cursor-default">
                                                                {child.title || 'Untitled'}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </header>
            </div>
            
            <div className="bg-slate-50 dark:bg-black/50 p-3 text-center text-xs text-slate-400 font-medium tracking-wide uppercase border-t border-slate-200 dark:border-white/10">
                Live Preview (Hover to see dropdowns)
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <LayoutList className="w-5 h-5 text-indigo-500" /> Visual Navigation Editor
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Build your store's top header mega menu and see it update in real-time above.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 shrink-0"
                >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Navigation
                </button>
            </div>

            {/* LIVE PREVIEW AREA */}
            <HeaderPreview />

            {/* EDITOR AREA */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden p-6 relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <LayoutList className="w-32 h-32" />
                </div>

                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Menu Builder</h3>

                    {megaMenu.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-500 mb-6 text-sm">
                                Create your first menu item below. It will appear instantly in the preview header above.
                            </p>
                            <button onClick={addParentItem} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30 font-medium rounded-xl transition-colors">
                                <Plus className="w-4 h-4" /> Add First Item
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {megaMenu.map((parent, pIndex) => (
                                <div 
                                    key={parent.id} 
                                    draggable
                                    onDragStart={(e) => onParentDragStart(e, pIndex)}
                                    onDragEnter={(e) => onParentDragEnter(e, pIndex)}
                                    onDragEnd={onParentDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                    className={`border rounded-xl transition-all ${draggedParentIndex === pIndex ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark/80 backdrop-blur-sm'}`}
                                >
                                    {/* Parent Item Header */}
                                    <div className="p-4 flex items-center gap-4 group">
                                        <div className="cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                            <GripVertical className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Menu Title</label>
                                                <input 
                                                    type="text" 
                                                    value={parent.title} 
                                                    onChange={(e) => updateParent(pIndex, 'title', e.target.value)}
                                                    placeholder="e.g. Collections"
                                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white transition-all font-medium"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Destination</label>
                                                {renderLinkInput(parent, (field, value) => updateParent(pIndex, field, value))}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => removeParent(pIndex)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                                            title="Delete Menu"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Child Items */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-200 dark:border-white/10 p-4 rounded-b-xl">
                                        <div className="space-y-2 mb-3 pl-10">
                                            {parent.children && parent.children.map((child, cIndex) => (
                                                <div 
                                                    key={child.id}
                                                    draggable
                                                    onDragStart={(e) => onChildDragStart(e, pIndex, cIndex)}
                                                    onDragEnter={(e) => onChildDragEnter(e, pIndex, cIndex)}
                                                    onDragEnd={onChildDragEnd}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white dark:bg-surface-dark border transition-all rounded-lg p-2.5 ${draggedChildParentIndex === pIndex && draggedChildIndex === cIndex ? 'border-indigo-400 shadow-sm' : 'border-slate-200 dark:border-white/10'}`}
                                                >
                                                    <div className="flex items-center gap-2 w-full sm:w-1/4">
                                                        <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1">
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>
                                                        <input 
                                                            type="text" 
                                                            value={child.title} 
                                                            onChange={(e) => updateChild(pIndex, cIndex, 'title', e.target.value)}
                                                            placeholder="Sub-item Title"
                                                            className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 dark:text-white px-1 font-medium"
                                                        />
                                                    </div>
                                                    
                                                    <div className="flex-1 w-full pl-6 sm:pl-0 flex items-center gap-2">
                                                        {renderLinkInput(child, (field, value) => updateChild(pIndex, cIndex, field, value))}
                                                        
                                                        <button 
                                                            onClick={() => removeChild(pIndex, cIndex)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors shrink-0 ml-auto"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pl-10">
                                            <button 
                                                onClick={() => addChildItem(pIndex)}
                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1.5 transition-colors bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 px-3 py-1.5 rounded-md"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Sub-item
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button 
                                onClick={addParentItem}
                                className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center gap-2 font-medium"
                            >
                                <Plus className="w-5 h-5" /> Add Another Menu Item
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-semibold mb-1">Navigation Suggestions</p>
                    <p>Right now, you can link to <b>Categories</b>, <b>Internal Pages</b>, or <b>Custom URLs</b>. In the future, we can easily add options like:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><b>Specific Product:</b> A search bar to link directly to a specific product.</li>
                        <li><b>Direct WhatsApp Message:</b> A link that opens a pre-filled WhatsApp chat with your business.</li>
                        <li><b>Social Media Links:</b> Quick links to your Instagram or Facebook.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
