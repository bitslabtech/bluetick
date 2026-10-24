import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
    Store, Globe, Phone, Mail, MapPin, Image as ImageIcon,
    Save, ExternalLink, Copy, Upload, X, CheckCircle, AlertCircle, Loader2,
    Search, ChevronDown, FolderOpen, Camera, Building2, Landmark, Hash, Check
} from 'lucide-react';
import { Country, State, City } from 'country-state-city';
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
function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Select an option',
    searchPlaceholder = 'Search...',
    disabled = false,
    disabledHint = '',
    allowCustom = false,
    customLabel = 'Use custom',
    icon: Icon,
    clearable = false
}) {
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
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    const selectedOption = options.find(opt => opt.value === value || opt.label === value);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const term = searchTerm.toLowerCase().trim();
        return options.filter(opt =>
            (opt.label && opt.label.toLowerCase().includes(term)) ||
            (opt.value && String(opt.value).toLowerCase().includes(term))
        );
    }, [options, searchTerm]);

    const displayValue = isOpen ? searchTerm : (selectedOption ? selectedOption.label : (value || ''));

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
        setIsOpen(false);
    };

    if (disabled) {
        return (
            <div className="relative flex items-center px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl cursor-not-allowed opacity-60">
                {Icon && <Icon className="w-4 h-4 text-slate-400 mr-2 shrink-0" />}
                <span className="text-sm text-slate-400 truncate">
                    {disabledHint || placeholder}
                </span>
            </div>
        );
    }

    const hasExactMatch = filteredOptions.some(opt =>
        opt.label.toLowerCase() === searchTerm.trim().toLowerCase() ||
        String(opt.value).toLowerCase() === searchTerm.trim().toLowerCase()
    );

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative flex items-center">
                {Icon && (
                    <Icon className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none shrink-0" />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={selectedOption ? selectedOption.label : placeholder}
                    value={displayValue}
                    onFocus={() => setIsOpen(true)}
                    onChange={e => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Escape') {
                            setIsOpen(false);
                            setSearchTerm('');
                            inputRef.current?.blur();
                        } else if (e.key === 'Enter' && allowCustom && searchTerm.trim() && !hasExactMatch) {
                            e.preventDefault();
                            onChange(searchTerm.trim());
                            setIsOpen(false);
                            setSearchTerm('');
                            inputRef.current?.blur();
                        }
                    }}
                    className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-12 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-text text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all`}
                />
                <div className="absolute right-2.5 flex items-center gap-1">
                    {clearable && value && !isOpen && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                            title="Clear"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-slate-400 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="overflow-y-auto overflow-x-hidden custom-scrollbar p-1">
                        {allowCustom && searchTerm.trim() && !hasExactMatch && (
                            <div
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onChange(searchTerm.trim());
                                    setIsOpen(false);
                                    setSearchTerm('');
                                    inputRef.current?.blur();
                                }}
                                className="px-3 py-2 mb-1 text-sm rounded-lg cursor-pointer bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-medium flex items-center justify-between"
                            >
                                <span className="truncate">
                                    + {customLabel}: <strong>"{searchTerm.trim()}"</strong>
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 shrink-0 ml-2">
                                    Custom
                                </span>
                            </div>
                        )}

                        {filteredOptions.length === 0 && (!allowCustom || !searchTerm.trim()) ? (
                            <div className="p-3 text-center text-xs text-slate-400">No results found.</div>
                        ) : (
                            filteredOptions.slice(0, 100).map((opt, idx) => {
                                const isSelected = value === opt.value || value === opt.label;
                                return (
                                    <div
                                        key={opt.value ? `${opt.value}-${idx}` : idx}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                            inputRef.current?.blur();
                                        }}
                                        className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                                            isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
                                    </div>
                                );
                            })
                        )}
                        {filteredOptions.length > 100 && (
                            <div className="p-2 text-center text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-700/50">
                                Showing 100 of {filteredOptions.length} matches. Type to filter more.
                            </div>
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
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    // ── Location Options (Country -> State -> City) ──────────────────────────
    const allCountries = useMemo(() => {
        try {
            const raw = Country.getAllCountries();
            // Pin India to the top for convenience while keeping alphabetical order for others
            const india = raw.find(c => c.isoCode === 'IN');
            const others = raw.filter(c => c.isoCode !== 'IN').sort((a, b) => a.name.localeCompare(b.name));
            const list = india ? [india, ...others] : others;
            return list.map(c => ({
                value: c.name,
                label: `${c.flag ? c.flag + ' ' : ''}${c.name}`,
                rawName: c.name,
                isoCode: c.isoCode
            }));
        } catch (e) {
            console.error('Failed to load countries', e);
            return [];
        }
    }, []);

    const selectedCountryObj = useMemo(() => {
        if (!store?.country) return null;
        const cName = String(store.country).trim().toLowerCase();
        return allCountries.find(c => c.rawName.toLowerCase() === cName || c.isoCode.toLowerCase() === cName) || null;
    }, [store?.country, allCountries]);

    const isIndia = (store?.country || '').trim().toLowerCase() === 'india' || selectedCountryObj?.isoCode === 'IN';

    const stateOptions = useMemo(() => {
        if (!selectedCountryObj) return [];
        try {
            const rawStates = State.getStatesOfCountry(selectedCountryObj.isoCode);
            return (rawStates || []).map(s => ({
                value: s.name,
                label: s.name,
                rawName: s.name,
                isoCode: s.isoCode
            }));
        } catch (e) {
            console.error('Failed to load states', e);
            return [];
        }
    }, [selectedCountryObj]);

    const selectedStateObj = useMemo(() => {
        if (!store?.state || !stateOptions.length) return null;
        const sName = String(store.state).trim().toLowerCase();
        return stateOptions.find(s => s.rawName.toLowerCase() === sName || s.isoCode.toLowerCase() === sName) || null;
    }, [store?.state, stateOptions]);

    const cityOptions = useMemo(() => {
        if (!selectedCountryObj || !selectedStateObj) return [];
        try {
            const rawCities = City.getCitiesOfState(selectedCountryObj.isoCode, selectedStateObj.isoCode);
            const uniqueNames = Array.from(new Set((rawCities || []).map(c => c.name))).sort((a, b) => a.localeCompare(b));
            return uniqueNames.map(name => ({
                value: name,
                label: name
            }));
        } catch (e) {
            console.error('Failed to load cities', e);
            return [];
        }
    }, [selectedCountryObj, selectedStateObj]);

    const handleCountryChange = (countryName) => {
        setStore(prev => ({
            ...prev,
            country: countryName || '',
            state: '',
            city: '',
        }));
    };

    const handleStateChange = (stateName) => {
        setStore(prev => ({
            ...prev,
            state: stateName || '',
            city: '',
        }));
    };

    const handleCityChange = (cityName) => {
        setStore(prev => ({
            ...prev,
            city: cityName || ''
        }));
    };

    const isPincodeRequired = useMemo(() => {
        return Boolean(
            String(store?.country || '').trim() &&
            String(store?.state || '').trim() &&
            String(store?.city || '').trim()
        );
    }, [store?.country, store?.state, store?.city]);

    const pincodeError = useMemo(() => {
        const pin = String(store?.pincode || '').trim();
        if (isPincodeRequired && !pin) {
            return isIndia
                ? 'PIN code is mandatory when Country, State, and City are selected'
                : 'Postal code is mandatory when Country, State, and City are selected';
        }
        if (!pin) return null;
        if (isIndia) {
            if (!/^\d{6}$/.test(pin)) {
                return 'Indian PIN code must be exactly 6 digits (e.g. 400001)';
            }
        } else if (pin.length < 2 || pin.length > 10) {
            return 'Please enter a valid postal code (2-10 characters)';
        }
        return null;
    }, [store?.pincode, isIndia, isPincodeRequired]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (pincodeError) {
            toast.error(pincodeError);
            return;
        }
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

            {loading || !store ? (
                <div className="space-y-6 animate-pulse">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-6">
                            <div className="w-48 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
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
                                    
                                    {/* Store ID (Read-only for easy copy) */}
                                    <div className="space-y-1.5 col-span-1 md:col-span-2 mt-2">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            <FolderOpen className="w-4 h-4 text-indigo-400" /> Store ID
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                type="text"
                                                value={store.shortId || ''}
                                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-500 dark:text-slate-400 font-mono text-sm"
                                            />
                                            <button type="button" onClick={() => { navigator.clipboard.writeText(store.shortId); toast.success('Store ID copied!'); }} title="Copy Store ID"
                                                className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 transition-colors">
                                                <Copy className="w-4 h-4 text-slate-500" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400">This ID is used for your bulk import media path (e.g. store/{store.shortId}/products/image.jpg).</p>
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

                                {/* Header Branding toggle */}
                                <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                                    <label className="text-sm font-semibold text-slate-800 dark:text-white">Header Branding</label>
                                    <p className="text-xs text-slate-500 mb-3">Choose what to display in the public store header.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {['logo', 'name', 'both'].map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => set('themeCustomizations', { ...(store.themeCustomizations || {}), headerDisplayMode: mode })}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                                    (store.themeCustomizations?.headerDisplayMode || 'logo') === mode
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                {mode === 'logo' ? 'Logo Only' : mode === 'name' ? 'Name Only' : 'Logo + Name'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right column: Logo Image */}
                            <div className="w-full lg:w-72 shrink-0">
                                <ImageUploader
                                    label="Store Logo"
                                    hint="Square icon shown beside your store name in the header"
                                    fieldName="logo"
                                    endpoint={`${storeId}/upload/logo`}
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
                                                    [s[idx - 1], s[idx]] = [s[idx], s[idx - 1]];
                                                    set('heroSlides', s);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                            </button>
                                            <button type="button" disabled={idx === (store.heroSlides || []).length - 1}
                                                onClick={() => {
                                                    const s = [...(store.heroSlides || [])];
                                                    [s[idx], s[idx + 1]] = [s[idx + 1], s[idx]];
                                                    set('heroSlides', s);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
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
                                            endpoint={`${storeId}/upload/slide`}
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
                                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Button Text (Optional)</label>
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
                                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Button Action</label>
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
                    <SectionCard title="Store Address" description="Physical location & regional address (optional — helps build customer trust and displays on storefront & invoices)">
                        <InputField label="Street Address" icon={MapPin} type="text"
                            placeholder="e.g. Shop 12, Phoenix Marketcity, Kurla" value={store.address || ''}
                            onChange={e => set('address', e.target.value)}
                            hint="Street name, shop/suite number, landmark" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                            {/* Country Dropdown */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Globe className="w-4 h-4 text-indigo-400" />
                                    Country
                                </label>
                                <SearchableSelect
                                    options={allCountries}
                                    value={store.country || ''}
                                    onChange={handleCountryChange}
                                    placeholder="Select Country"
                                    icon={Globe}
                                    clearable
                                />
                                <p className="text-[11px] text-slate-400">
                                    Choose country to filter states
                                </p>
                            </div>

                            {/* State Dropdown */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Landmark className="w-4 h-4 text-indigo-400" />
                                    State / Province
                                </label>
                                {stateOptions.length > 0 ? (
                                    <SearchableSelect
                                        options={stateOptions}
                                        value={store.state || ''}
                                        onChange={handleStateChange}
                                        placeholder={store.country ? "Select State" : "Select country first"}
                                        disabled={!store.country}
                                        disabledHint="Select a country first"
                                        icon={Landmark}
                                        clearable
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        placeholder={store.country ? "Enter state / province" : "Select country first"}
                                        value={store.state || ''}
                                        disabled={!store.country}
                                        onChange={e => handleStateChange(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                )}
                                <p className="text-[11px] text-slate-400">
                                    {store.country ? `${stateOptions.length} state(s) available` : 'Select country first'}
                                </p>
                            </div>

                            {/* City Dropdown */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Building2 className="w-4 h-4 text-indigo-400" />
                                    City
                                </label>
                                {cityOptions.length > 0 ? (
                                    <SearchableSelect
                                        options={cityOptions}
                                        value={store.city || ''}
                                        onChange={handleCityChange}
                                        placeholder={store.state ? "Select City" : "Select state first"}
                                        disabled={!store.state}
                                        disabledHint="Select a state first"
                                        allowCustom={true}
                                        customLabel="Use custom city"
                                        icon={Building2}
                                        clearable
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        placeholder={store.state ? "Enter city" : "Select state first"}
                                        value={store.city || ''}
                                        disabled={!store.state}
                                        onChange={e => handleCityChange(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                )}
                                <p className="text-[11px] text-slate-400">
                                    {store.state ? `${cityOptions.length} cities available (or type custom)` : 'Select state first'}
                                </p>
                            </div>

                            {/* Pincode / Postal Code */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Hash className="w-4 h-4 text-indigo-400" />
                                    <span>{isIndia ? 'PIN Code' : 'Postal / PIN Code'}</span>
                                    {isPincodeRequired && <span className="text-rose-500 font-bold" title="Required">*</span>}
                                </label>
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        maxLength={isIndia ? 6 : 10}
                                        placeholder={isIndia ? "e.g. 400001" : "e.g. 10001"}
                                        value={store.pincode || ''}
                                        onChange={e => {
                                            let val = e.target.value;
                                            if (isIndia) {
                                                val = val.replace(/\D/g, '').slice(0, 6);
                                            }
                                            set('pincode', val);
                                        }}
                                        className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border ${
                                            pincodeError ? 'border-rose-400 dark:border-rose-500 ring-1 ring-rose-400' : 'border-slate-200 dark:border-slate-700'
                                        } rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 text-sm`}
                                    />
                                    {store.pincode && isIndia && store.pincode.length === 6 && (
                                        <Check className="w-4 h-4 text-emerald-500 absolute right-3 pointer-events-none" />
                                    )}
                                </div>
                                {pincodeError ? (
                                    <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                                        <AlertCircle className="w-3 h-3 shrink-0" /> {pincodeError}
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-slate-400">
                                        {isPincodeRequired
                                            ? (isIndia ? 'Required: 6-digit Indian PIN code' : 'Required: Area postal / zip code')
                                            : (isIndia ? '6-digit Indian PIN code' : 'Area postal / zip code')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Formatted Address Preview */}
                        {(store.address || store.city || store.state || store.pincode || store.country) && (
                            <div className="mt-2 p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-xl flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">Address Preview: </span>
                                    {[
                                        store.address,
                                        store.city,
                                        store.state,
                                        store.pincode ? (isIndia ? `PIN - ${store.pincode}` : store.pincode) : null,
                                        store.country
                                    ].filter(Boolean).join(', ')}
                                </div>
                            </div>
                        )}
                    </SectionCard>

                    {/* ── Storefront Visibility ─────────────────────────────────────── */}
                    <SectionCard title="Storefront Visibility" description="Control which sections appear on your storefront homepage">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl">
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Trending Now Section</h4>
                                <p className="text-xs text-slate-500 mt-1">Show a carousel of your latest products below the hero slider.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => set('showTrendingNow', store.showTrendingNow === false ? true : false)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                                    store.showTrendingNow !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/10'
                                }`}
                                title={store.showTrendingNow !== false ? 'Click to disable Trending Now' : 'Click to enable Trending Now'}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                    store.showTrendingNow !== false ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                    </SectionCard>

                    {/* ── Footer Settings ─────────────────────────────────────── */}
                    <SectionCard title="Footer Settings" description="Customize your store's footer">
                        <InputField label="Custom Footer Text" type="text"
                            placeholder="e.g. Bluetick.cloud a brand of Bitslab technologies" value={store.customFooterText || ''}
                            onChange={e => set('customFooterText', e.target.value)}
                            hint="This text will appear in the bottom right corner of your store's footer." />
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
            )}


            {/* ── Media Picker Modal ─────────────────────────────────────── */}
            <MediaPickerModal
                isOpen={pickerOpen}
                onClose={closePicker}
                onSelect={(url) => { if (pickerConfig.onSelect) pickerConfig.onSelect(url); }}
                accessMode="restricted"
                allowedTypes={pickerConfig.allowedTypes || 'image'}
                multiple={pickerConfig.multiple || false}
                title={pickerConfig.title || 'Select Media'}
                mimeConstraints={pickerConfig.mimeConstraints || null}
                storeId={storeId}
                mediaFolder="logos"
            />
        </div>
    );
}
