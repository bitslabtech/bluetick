import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
    Store, Globe, Phone, Mail, MapPin, Image as ImageIcon,
    Save, ExternalLink, Copy, Upload, X, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Allowed MIME types & extensions ─────────────────────────────────────────
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_EXT  = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
const VIDEO_MIME   = ['video/mp4', 'video/webm', 'video/ogg'];
const VIDEO_EXT    = ['.mp4', '.webm', '.ogg'];
const MAX_SIZE_MB   = 5;
const MAX_VIDEO_MB  = 15;

function validateImageFile(file, acceptVideo = false) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    let allowedMime = [...ALLOWED_MIME];
    let allowedExt = [...ALLOWED_EXT];
    let maxSize = MAX_SIZE_MB;

    if (acceptVideo) {
        allowedMime = [...allowedMime, ...VIDEO_MIME];
        allowedExt = [...allowedExt, ...VIDEO_EXT];
        maxSize = MAX_VIDEO_MB;
    }

    if (!allowedMime.includes(file.type) && !allowedExt.includes(ext)) {
        return `Invalid format. Allowed: ${allowedExt.join(', ')}`;
    }
    if (file.size > maxSize * 1024 * 1024) {
        return `File too large. Max size is ${maxSize} MB.`;
    }
    return null;
}

// ─── Reusable image uploader component ───────────────────────────────────────
function ImageUploader({ label, hint, fieldName, endpoint, currentUrl, onUploaded, acceptVideo = false }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver]   = useState(false);
    const [error, setError]         = useState(null);
    const [preview, setPreview]     = useState(currentUrl || '');

    // Sync preview when parent changes url (e.g. after save)
    useEffect(() => { setPreview(currentUrl || ''); }, [currentUrl]);

    const handleFile = async (file) => {
        setError(null);
        const validationError = validateImageFile(file, acceptVideo);
        if (validationError) { setError(validationError); return; }

        // Show local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        setUploading(true);
        try {
            const form = new FormData();
            form.append(fieldName, file);
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/wastore/${endpoint}`,
                form,
                {
                    headers: {
                        
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setPreview(res.data.url);
            onUploaded(res.data.url);
            toast.success(`${label} uploaded!`);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed. Please try again.');
            setPreview(currentUrl || '');
        } finally {
            setUploading(false);
        }
    };

    const onInputChange = (e) => {
        if (e.target.files?.[0]) handleFile(e.target.files[0]);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };

    const clearImage = () => {
        setPreview('');
        onUploaded('');
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                {label}
            </label>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => !uploading && inputRef.current?.click()}
                className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all overflow-hidden
                    ${dragOver
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50 dark:bg-slate-800/50'
                    }
                    ${preview ? 'h-48' : 'h-36'}
                `}
            >
                {preview ? (
                    <>
                        {preview.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                            <video src={preview} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                        ) : (
                            <img src={preview} alt={label} className="w-full h-full object-cover" onError={() => setPreview('')} />
                        )}
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <div className="text-white text-sm font-medium flex items-center gap-2">
                                <Upload className="w-4 h-4" /> Change Image
                            </div>
                        </div>
                        {/* Clear button */}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); clearImage(); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors z-10"
                            title="Remove image"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 px-4">
                        {uploading ? (
                            <>
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                <p className="text-sm font-medium text-indigo-500">Uploading…</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-8 h-8" />
                                <p className="text-sm font-medium">Click or drag & drop to upload</p>
                                <p className="text-xs text-center">
                                    Allowed: {acceptVideo ? [...ALLOWED_EXT, ...VIDEO_EXT].join(', ') : ALLOWED_EXT.join(', ')} &nbsp;|&nbsp; Max {acceptVideo ? MAX_VIDEO_MB : MAX_SIZE_MB} MB
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Uploading overlay while image already shown */}
                {uploading && preview && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept={acceptVideo ? [...ALLOWED_MIME, ...VIDEO_MIME].join(',') : ALLOWED_MIME.join(',')}
                className="hidden"
                onChange={onInputChange}
            />

            {/* URL text input — manual paste option */}
            <div className="relative">
                <input
                    type="url"
                    placeholder="Or paste an image URL…"
                    value={currentUrl || ''}
                    onChange={(e) => { onUploaded(e.target.value); setPreview(e.target.value); setError(null); }}
                    className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                />
                {currentUrl && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {hint && <p className="text-xs text-slate-400">{hint}</p>}
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
    const { storeId } = useOutletContext();
    const [store, setStore]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
                const myStore = res.data.find(s => s.id === storeId);
                setStore(myStore);
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
                <SectionCard title="Store Identity" description="Core information about your store">
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
                </SectionCard>

                {/* ── Branding & Media ──────────────────────────────────── */}
                <SectionCard
                    title="Branding & Media"
                    description={`Upload your logo. Supported: ${ALLOWED_EXT.join(', ')} · Max ${MAX_SIZE_MB} MB each.`}
                >
                    <ImageUploader
                        label="Store Logo"
                        hint="Square icon shown beside your store name in the header"
                        fieldName="logo"
                        endpoint="upload/logo"
                        currentUrl={store.logo || ''}
                        onUploaded={(url) => set('logo', url)}
                    />
                </SectionCard>

                {/* ── Hero Slider ───────────────────────────────────────── */}
                <SectionCard
                    title="Hero Slider"
                    description="Add up to 5 banner slides for your store homepage. Each slide can have an image, title, subtitle, and call-to-action text."
                >
                    {/* Slide list */}
                    <div className="space-y-5">
                        {(store.heroSlides || []).map((slide, idx) => (
                            <div key={idx} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/[0.02]">
                                {/* Slide header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark">
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
                                className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:text-indigo-500 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors flex items-center justify-center gap-2 font-semibold text-sm bg-transparent"
                            >
                                <ImageIcon className="w-4 h-4" />
                                Add Slide {(store.heroSlides || []).length + 1} of 5
                            </button>
                        )}
                        {(store.heroSlides || []).length === 0 && (
                            <p className="text-xs text-slate-400 text-center">Click "Add Slide" to configure your first hero banner. At least one slide is required to show the slider.</p>
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

                {/* ── Checkout Settings ─────────────────────────────────── */}
                <SectionCard title="Checkout Settings" description="Configure currency preferences">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Currency</label>
                        <select value={store.currency || 'USD'} onChange={e => set('currency', e.target.value)}
                            className="w-full md:w-72 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white">
                            <option value="USD">USD — US Dollar ($)</option>
                            <option value="EUR">EUR — Euro (€)</option>
                            <option value="GBP">GBP — British Pound (£)</option>
                            <option value="INR">INR — Indian Rupee (₹)</option>
                            <option value="AED">AED — UAE Dirham (د.إ)</option>
                            <option value="SGD">SGD — Singapore Dollar (S$)</option>
                            <option value="AUD">AUD — Australian Dollar (A$)</option>
                            <option value="CAD">CAD — Canadian Dollar (C$)</option>
                        </select>
                        <p className="text-xs text-slate-400">All product prices and order messages will use this currency.</p>
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
        </div>
    );
}
