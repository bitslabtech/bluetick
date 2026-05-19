import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Search, Save, Globe, Code, Image as ImageIcon, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE_MB = 5;

function validateImageFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_MIME.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
        return `Invalid format. Allowed: ${ALLOWED_EXT.join(', ')}`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `File too large. Max size is ${MAX_SIZE_MB} MB.`;
    }
    return null;
}

function ImageUploader({ label, endpoint, currentUrl, onUploaded }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFile = async (file) => {
        setError(null);
        const validationError = validateImageFile(file);
        if (validationError) { setError(validationError); return; }

        setUploading(true);
        try {
            const form = new FormData();
            form.append('image', file);
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/wastore/${endpoint}`,
                form,
                { headers: { 'x-auth-token': localStorage.getItem('token') } }
            );
            onUploaded(res.data.url);
            toast.success(`${label} uploaded successfully!`);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                    {uploading ? 'Uploading...' : `Upload ${label}`}
                </button>
                {currentUrl && (
                    <button type="button" onClick={() => onUploaded('')} className="text-rose-500 text-sm hover:underline">
                        Remove Image
                    </button>
                )}
            </div>
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <input 
                ref={inputRef} 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden" 
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} 
            />
        </div>
    );
}

export default function WaStoreSEO() {
    const { id: storeId } = useParams();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [seo, setSeo] = useState({
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        ogImage: '',
        googleAnalyticsId: '',
        facebookPixelId: ''
    });

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                const myStore = res.data.find(s => s.id === storeId);
                setStore(myStore);
                if (myStore?.seoConfig) {
                    setSeo(prev => ({ ...prev, ...myStore.seoConfig }));
                }
            } catch (error) {
                toast.error('Failed to load SEO settings');
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
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                seoConfig: seo
            }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            toast.success('SEO Settings saved successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save SEO settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="space-y-4 animate-pulse max-w-4xl">
            <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
    );

    return (
        <div className="max-w-4xl space-y-6 pb-20">
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-500" />
                    Advanced SEO & Tracking
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Optimize how your store appears on Google and social media, and track your visitors.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Search Engine Optimization */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Globe className="w-4 h-4 text-indigo-400" /> Search Engine Details
                        </h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl mb-4">
                            <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-2">Search Engine Preview</h4>
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="text-[#1a0dab] dark:text-[#8ab4f8] text-lg cursor-pointer hover:underline truncate">
                                    {seo.metaTitle || store?.name || 'Your Store Name'}
                                </div>
                                <div className="text-[#006621] dark:text-[#81c995] text-sm mb-1 flex items-center gap-1">
                                    {window.location.origin}/store/{store?.slug}
                                </div>
                                <div className="text-[#545454] dark:text-[#bdc1c6] text-sm line-clamp-2">
                                    {seo.metaDescription || store?.description || 'Add a meta description to see how it looks here.'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Meta Title</label>
                            <input
                                type="text"
                                placeholder="e.g. Premium Footwear & Accessories | John's Shoes"
                                value={seo.metaTitle}
                                onChange={e => setSeo({ ...seo, metaTitle: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">Recommended length: 50-60 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Meta Description</label>
                            <textarea
                                rows={3}
                                placeholder="Write a compelling description of your store to encourage clicks..."
                                value={seo.metaDescription}
                                onChange={e => setSeo({ ...seo, metaDescription: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm resize-none"
                            ></textarea>
                            <p className="text-xs text-slate-500 mt-1.5">Recommended length: 150-160 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Meta Keywords</label>
                            <input
                                type="text"
                                placeholder="shoes, sneakers, online store, fashion"
                                value={seo.metaKeywords}
                                onChange={e => setSeo({ ...seo, metaKeywords: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-sm"
                            />
                            <p className="text-xs text-slate-500 mt-1.5">Separate keywords with commas.</p>
                        </div>
                    </div>
                </div>

                {/* Social Sharing */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-indigo-400" /> Social Media Sharing (Open Graph)
                        </h3>
                    </div>
                    <div className="p-6">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Social Share Image</label>
                        <p className="text-xs text-slate-500 mb-3">This image appears when your store link is shared on WhatsApp, Facebook, or Twitter. Supported formats: JPG, PNG, WEBP (Max 5MB).</p>
                        
                        <div className="mb-4">
                            <ImageUploader 
                                label="OG Image"
                                endpoint="upload/seo"
                                currentUrl={seo.ogImage}
                                onUploaded={(url) => setSeo({ ...seo, ogImage: url })}
                            />
                        </div>
                        {seo.ogImage && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-w-sm">
                                <img src={seo.ogImage} alt="Social Share Preview" className="w-full h-48 object-cover" onError={(e) => e.target.src = 'https://placehold.co/600x400?text=Invalid+Image'} />
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{seo.metaTitle || store?.name}</div>
                                    <div className="text-xs text-slate-500 truncate mt-0.5">{seo.metaDescription || store?.description || window.location.hostname}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tracking & Analytics */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Code className="w-4 h-4 text-indigo-400" /> Tracking & Analytics
                        </h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Google Analytics (GA4) Measurement ID</label>
                            <input
                                type="text"
                                placeholder="G-XXXXXXXXXX"
                                value={seo.googleAnalyticsId}
                                onChange={e => setSeo({ ...seo, googleAnalyticsId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-mono text-sm uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Facebook Pixel ID</label>
                            <input
                                type="text"
                                placeholder="123456789012345"
                                value={seo.facebookPixelId}
                                onChange={e => setSeo({ ...seo, facebookPixelId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-mono text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving Settings...' : 'Save SEO & Tracking Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
