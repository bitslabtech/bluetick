import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
    Store, Globe, Phone, Mail, MapPin, Image as ImageIcon,
    Save, ExternalLink, Copy, Upload, X, CheckCircle, AlertCircle, Loader2,
    Search, ChevronDown, FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import MediaPickerModal from '../../components/MediaPickerModal';



// ─── Reusable image uploader component ───────────────────────────────────────
function ImageUploader({ label, hint, currentUrl, onUploaded, objectFit = 'cover', onOpenPicker }) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                {label}
            </label>

            {currentUrl ? (
                <div className="relative group rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden h-48 bg-slate-100 dark:bg-slate-800">
                    {currentUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                        <video src={currentUrl} autoPlay muted loop playsInline className={`w-full h-full object-${objectFit}`} />
                    ) : (
                        <img src={currentUrl} alt={label} className={`w-full h-full object-${objectFit}`} />
                    )}
                    
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                        {onOpenPicker && (
                            <button
                                type="button"
                                onClick={onOpenPicker}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-800 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-100 transition-colors"
                            >
                                <Camera className="w-3 h-3" /> Change
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => onUploaded('')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-rose-600 transition-colors"
                        >
                            <X className="w-3 h-3" /> Remove
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {onOpenPicker && (
                        <button
                            type="button"
                            onClick={onOpenPicker}
                            className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-2 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                                <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <p className="font-semibold text-sm text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                Add Image
                            </p>
                        </button>
                    )}
                </>
            )}

            {hint && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

// ─── Searchable Select Component ─────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
    const selectedOption = options.find(opt => opt.value === value);

    const displayValue = isOpen ? searchTerm : (selectedOption ? selectedOption.label : '');

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input 
                    ref={inputRef}
                    type="text"
                    placeholder={selectedOption ? selectedOption.label : placeholder}
                    value={displayValue}
                    onFocus={() => setIsOpen(true)}
                    onChange={e => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-text text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-500 focus:placeholder-slate-300 dark:focus:placeholder-slate-600"
                />
                <ChevronDown className={`absolute right-4 w-4 h-4 text-slate-400 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="overflow-y-auto overflow-x-hidden custom-scrollbar p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-500">No results found.</div>
                        ) : (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt.value}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                        inputRef.current?.blur();
                                    }}
                                    className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors truncate ${value === opt.value ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
                                >
                                    {opt.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Generic input field ──────────────────────────────────────────────────────
const InputField = ({ label, icon: Icon, hint, ...props }) => (
    <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            {Icon && <Icon className="w-4 h-4 text-indigo-400" />}
            {label}
        </label>
        <input
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
            {...props}
        />
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
);

const SectionCard = ({ title, description, children }) => (
    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
            <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        <div className="p-4 md:p-6 space-y-5">
            {children}
        </div>
    </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WaStoreBasicDetails() {
    const { storeId, setParentStore } = useOutletContext();
    const [store, setStore]   = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);

    // ── Media Picker state ────────────────────────────────────────────────────
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerConfig, setPickerConfig] = useState({ allowedTypes: 'image', onSelect: null });

    const openPicker = (config) => { setPickerConfig(config); setPickerOpen(true); };
    const closePicker = () => setPickerOpen(false);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
                const myStore = res.data.find(s => s.id === storeId);
                setStore(myStore);
                
                try {
                    const prodRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/products`);
                    setProducts(prodRes.data || []);
                } catch (e) {
                    console.error('Failed to load products for CTA target', e);
                }
            } catch {
                toast.error('Failed to load store details');
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [storeId]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, store);
            if (setParentStore) setParentStore(store);
            toast.success('Basic details saved successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save details');
        } finally {
            setSaving(false);
        }
    };

    const set = (field, val) => setStore(prev => ({ ...prev, [field]: val }));

    const storeUrl = store ? `${window.location.origin}/store/${store.slug}` : '';
    const copySlug = () => { navigator.clipboard.writeText(storeUrl); toast.success('Store URL copied!'); };

    if (loading || !store) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
    );

    return (
        <div className="space-y-6 pb-7 sm:pb-20">
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-indigo-500" />
                    Basic Details
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Set up your store's fundamental information — this is what customers will see.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* ── Store Identity ────────────────────────────────────── */}
                <SectionCard title="Store Identity & Branding" description="Core information and logo for your store">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left column: Text Inputs */}
                        <div className="flex-1 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <InputField
                                    label="Store Name"
                                    icon={Store}
                                    required
                                    type="text"
                                    placeholder="My Awesome Store"
                                    value={store.name || ''}
                                    onChange={e => set('name', e.target.value)}
                                />

                                {/* Slug with copy / open buttons */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        <Globe className="w-4 h-4 text-indigo-400" /> Store URL Slug
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                            <span className="hidden sm:flex items-center px-3 text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap select-none">
                                                /store/
                                            </span>
                                            <input
                                                required
                                                type="text"
                                                placeholder="my-store"
                                                value={store.slug || ''}
                                                onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                                className="flex-1 px-3 py-2.5 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                            />
                                        </div>
                                        <button type="button" onClick={copySlug} title="Copy store URL"
                                            className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 transition-colors">
                                            <Copy className="w-4 h-4 text-slate-500" />
                                        </button>
                                        <a href={storeUrl} target="_blank" rel="noreferrer" title="Open live store"
                                            className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 transition-colors">
                                            <ExternalLink className="w-4 h-4 text-slate-500" />
                                        </a>
                                    </div>
                                    <p className="text-xs text-slate-400">Only lowercase letters, numbers, and hyphens allowed.</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Store Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="Tell customers what your store is about…"
                                    value={store.description || ''}
                                    onChange={e => set('description', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 resize-y"
                                />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-white text-sm">Store Visibility</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {store.isActive ? 'Your store is live and visible to the public.' : 'Your store is in draft mode — hidden from the public.'}
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={!!store.isActive} onChange={e => set('isActive', e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                                </label>
                            </div>
                        </div>

                        {/* Right column: Logo Image */}
                        <div className="w-full lg:w-72 shrink-0">
                            <ImageUploader
                                label="Store Logo"
                                hint="Square icon shown beside your store name in the header"
                                fieldName="logo"
                                endpoint="upload/logo"
                                currentUrl={store.logo || ''}
                                onUploaded={(url) => set('logo', url)}
                                objectFit="contain"
                                onOpenPicker={() => openPicker({ allowedTypes: 'image', multiple: false, title: 'Select Store Logo', onSelect: (url) => set('logo', url) })}
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* ── Hero Slider ───────────────────────────────────────── */}
                <SectionCard
                    title="Hero Slider"
                    description="Add up to 5 banner slides for your store homepage. Each slide can have an image, title, subtitle, and call-to-action text."
                >
                    {/* Slide list */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        {(store.heroSlides || []).map((slide, idx) => (
                            <div key={idx} className="border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-white/[0.02] relative z-10 hover:z-20">
                                {/* Slide header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark rounded-t-2xl">
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Slide {idx + 1}</span>
                                    <div className="flex gap-1">
                                        <button type="button" disabled={idx === 0}
                                            onClick={() => {
                                                const s = [...(store.heroSlides || [])];
                                                [s[idx-1], s[idx]] = [s[idx], s[idx-1]];
                                                set('heroSlides', s);
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>
                                        </button>
                                        <button type="button" disabled={idx === (store.heroSlides || []).length - 1}
                                            onClick={() => {
                                                const s = [...(store.heroSlides || [])];
                                                [s[idx], s[idx+1]] = [s[idx+1], s[idx]];
                                                set('heroSlides', s);
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                                        </button>
                                        <button type="button"
                                            onClick={() => {
                                                const s = (store.heroSlides || []).filter((_, i) => i !== idx);
                                                set('heroSlides', s);
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Slide image uploader */}
                                    <ImageUploader
                                        label="Slide Media (Image or Video)"
                                        hint="Recommended: 1600×600px. Supports JPG, PNG, MP4, WEBM (Max 15MB)"
                                        fieldName="slide"
                                        endpoint="upload/slide"
                                        currentUrl={slide.imageUrl || ''}
                                        acceptVideo={true}
                                        onOpenPicker={() => openPicker({
                                            allowedTypes: 'all',
                                            multiple: false,
                                            title: `Select Slide ${idx + 1} Media`,
                                            onSelect: (url) => { const s = [...(store.heroSlides || [])]; s[idx] = { ...s[idx], imageUrl: url }; set('heroSlides', s); }
                                        })}
                                        onUploaded={(url) => {
                                            const s = [...(store.heroSlides || [])];
                                            s[idx] = { ...s[idx], imageUrl: url };
                                            set('heroSlides', s);
                                        }}
                                    />

                                    {/* Slide text fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Slide Title</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. New Arrivals 2025"
                                                value={slide.title || ''}
                                                onChange={e => {
                                                    const s = [...(store.heroSlides || [])];
                                                    s[idx] = { ...s[idx], title: e.target.value };
                                                    set('heroSlides', s);
                                                }}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subtitle / Description</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Up to 50% off this season"
                                                value={slide.subtitle || ''}
                                                onChange={e => {
                                                    const s = [...(store.heroSlides || [])];
                                                    s[idx] = { ...s[idx], subtitle: e.target.value };
                                                    set('heroSlides', s);
                                                }}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">CTA Button Text (Optional)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Shop Now, Explore Collection"
                                                        value={slide.ctaText || ''}
                                                        onChange={e => {
                                                            const s = [...(store.heroSlides || [])];
                                                            s[idx] = { ...s[idx], ctaText: e.target.value };
                                                            set('heroSlides', s);
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">CTA Target</label>
                                                    <select
                                                        value={slide.ctaTargetType || 'none'}
                                                        onChange={e => {
                                                            const s = [...(store.heroSlides || [])];
                                                            s[idx] = { ...s[idx], ctaTargetType: e.target.value, ctaTargetId: '' };
                                                            set('heroSlides', s);
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                                                    >
                                                        <option value="none">Scroll to Products (Default)</option>
                                                        <option value="category">Specific Category</option>
                                                        <option value="product">Specific Product</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {slide.ctaTargetType === 'category' && (
                                                <div className="mt-4 space-y-1.5">
                                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Category</label>
                                                    <SearchableSelect
                                                        options={(store.categories || []).map(cat => ({ value: cat, label: cat }))}
                                                        value={slide.ctaTargetId || ''}
                                                        onChange={val => {
                                                            const s = [...(store.heroSlides || [])];
                                                            s[idx] = { ...s[idx], ctaTargetId: val };
                                                            set('heroSlides', s);
                                                        }}
                                                        placeholder="-- Choose Category --"
                                                    />
                                                </div>
                                            )}

                                            {slide.ctaTargetType === 'product' && (
                                                <div className="mt-4 space-y-1.5">
                                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Product</label>
                                                    <SearchableSelect
                                                        options={products.map(p => ({ value: p.id, label: p.name }))}
                                                        value={slide.ctaTargetId || ''}
                                                        onChange={val => {
                                                            const s = [...(store.heroSlides || [])];
                                                            s[idx] = { ...s[idx], ctaTargetId: val };
                                                            set('heroSlides', s);
                                                        }}
                                                        placeholder="-- Choose Product --"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add slide button */}
                        {(store.heroSlides || []).length < 5 && (
                            <button
                                type="button"
                                onClick={() => {
                                    const s = [...(store.heroSlides || []), { imageUrl: '', title: '', subtitle: '', ctaText: '' }];
                                    set('heroSlides', s);
                                }}
                                className="w-full h-full min-h-[120px] py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:text-indigo-500 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors flex items-center justify-center gap-2 font-semibold text-sm bg-transparent xl:col-span-full"
                            >
                                <ImageIcon className="w-4 h-4" />
                                Add Slide {(store.heroSlides || []).length + 1} of 5
                            </button>
                        )}
                        {(store.heroSlides || []).length === 0 && (
                            <p className="text-xs text-slate-400 text-center xl:col-span-full pt-2">Click "Add Slide" to configure your first hero banner. At least one slide is required to show the slider.</p>
                        )}
                    </div>
                </SectionCard>

                {/* ── Contact Information ───────────────────────────────── */}
                <SectionCard title="Contact Information" description="How customers can reach you">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputField label="WhatsApp Number" icon={Phone} required type="tel"
                            placeholder="+91 98765 43210" value={store.whatsappNumber || ''}
                            onChange={e => set('whatsappNumber', e.target.value)}
                            hint="Orders will be sent to this number via WhatsApp" />
                        <InputField label="Contact Phone (Optional)" icon={Phone} type="tel"
                            placeholder="+91 98765 43210" value={store.phone || ''}
                            onChange={e => set('phone', e.target.value)}
                            hint="Displayed on the store for general enquiries" />
                        <InputField label="Email Address (Optional)" icon={Mail} type="email"
                            placeholder="hello@mystore.com" value={store.email || ''}
                            onChange={e => set('email', e.target.value)}
                            hint="Displayed on the store as a contact option" />
                    </div>
                </SectionCard>

                {/* ── Store Address ─────────────────────────────────────── */}
                <SectionCard title="Store Address" description="Physical location (optional — helps build customer trust)">
                    <InputField label="Street Address" icon={MapPin} type="text"
                        placeholder="123, Main Street" value={store.address || ''}
                        onChange={e => set('address', e.target.value)} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <InputField label="City" type="text" placeholder="Mumbai" value={store.city || ''}
                            onChange={e => set('city', e.target.value)} />
                        <InputField label="State / Province" type="text" placeholder="Maharashtra" value={store.state || ''}
                            onChange={e => set('state', e.target.value)} />
                        <InputField label="Country" type="text" placeholder="India" value={store.country || ''}
                            onChange={e => set('country', e.target.value)} />
                    </div>
                </SectionCard>



                {/* ── Save ─────────────────────────────────────────────── */}
                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-4 md:px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95">
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving…' : 'Save Details'}
                    </button>
                </div>
            </form>

            {/* ── Media Picker Modal ─────────────────────────────────────── */}
            <MediaPickerModal
                isOpen={pickerOpen}
                onClose={closePicker}
                onSelect={(url) => { if (pickerConfig.onSelect) pickerConfig.onSelect(url); }}
                accessMode="restricted"
                allowedTypes={pickerConfig.allowedTypes || 'image'}
                multiple={false}
                title={pickerConfig.title || 'Select Media'}
                mimeConstraints={pickerConfig.mimeConstraints || null}
            />
        </div>
    );
}
