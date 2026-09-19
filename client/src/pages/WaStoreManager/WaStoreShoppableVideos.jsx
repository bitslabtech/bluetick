import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Save, Plus, X, Video, Image as ImageIcon, Camera, Loader2, Link as LinkIcon, Eye, GripVertical } from 'lucide-react';
import MediaPickerModal from '../../components/MediaPickerModal';

function ImageUploader({ label, hint, currentUrl, onUploaded, objectFit = 'cover', onOpenPicker, isVideo = false }) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isVideo ? <Video className="w-4 h-4 text-indigo-400" /> : <ImageIcon className="w-4 h-4 text-indigo-400" />}
                {label}
            </label>

            {currentUrl ? (
                <div className="relative group rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden h-48 bg-slate-100 dark:bg-slate-800">
                    {currentUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i) || isVideo ? (
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
                                {isVideo ? <Video className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" /> : <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />}
                            </div>
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                Select Media
                            </span>
                            {hint && <span className="text-xs text-slate-400 mt-1">{hint}</span>}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

export default function WaStoreShoppableVideos() {
    const { storeId, setParentStore } = useOutletContext();
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);

    useEffect(() => {
        if (!storeId) return;
        fetchData();
    }, [storeId]);

    const fetchData = async () => {
        try {
            // First fetch the store details to get existing shoppableVideos
            // We fetch instead of just using context.store to ensure we have the freshest data, 
            // though we could use context.store if we prefer. But fetching all stores like WaStoreBasicDetails is wasteful,
            // Instead, we just fetch this specific store by UUID:
            // Wait, there is no GET /api/wastore/:id endpoint.
            // WaStoreBasicDetails fetches all stores: axios.get('/api/wastore') and finds by ID.
            // Let's do the same for safety, or we could just use `store` from useOutletContext!
            // Actually, `useOutletContext` provides `store`. Let's initialize from it.
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore`);
            const myStore = res.data.find(s => s.id === storeId);
            setStore(myStore || {});
            
            const productsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/products`);
            setProducts(productsRes.data.products || productsRes.data || []);
        } catch (error) {
            console.error('Failed to load shoppable videos data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, {
                shoppableVideos: store.shoppableVideos,
                shoppableVideosAutoSlide: !!store.shoppableVideosAutoSlide
            });
            if (setParentStore) setParentStore(prev => ({ 
                ...prev, 
                shoppableVideos: store.shoppableVideos,
                shoppableVideosAutoSlide: !!store.shoppableVideosAutoSlide
            }));
            toast.success('Shoppable videos saved successfully!');
        } catch (error) {
            console.error('Failed to save shoppable videos:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const addVideo = () => {
        const currentVideos = Array.isArray(store.shoppableVideos) ? store.shoppableVideos : [];
        const newVideo = {
            id: Date.now().toString(),
            title: '',
            videoUrl: '',
            thumbnail: '',
            views: '0',
            productId: ''
        };
        setStore({ ...store, shoppableVideos: [...currentVideos, newVideo] });
    };

    const updateVideo = (idx, field, value) => {
        const videos = [...store.shoppableVideos];
        videos[idx] = { ...videos[idx], [field]: value };
        setStore({ ...store, shoppableVideos: videos });
    };

    const removeVideo = (idx) => {
        const videos = store.shoppableVideos.filter((_, i) => i !== idx);
        setStore({ ...store, shoppableVideos: videos });
    };

    const moveVideo = (idx, direction) => {
        const videos = [...store.shoppableVideos];
        if (direction === -1 && idx > 0) {
            [videos[idx - 1], videos[idx]] = [videos[idx], videos[idx - 1]];
        } else if (direction === 1 && idx < videos.length - 1) {
            [videos[idx], videos[idx + 1]] = [videos[idx + 1], videos[idx]];
        }
        setStore({ ...store, shoppableVideos: videos });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading Shoppable Videos...</p>
        </div>
    );

    const videos = Array.isArray(store?.shoppableVideos) ? store.shoppableVideos : [];

    return (
        <div className="max-w-5xl mx-auto pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        Shoppable Videos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Create a TikTok/Reels style vertical video slider on your storefront. Attach products to videos to drive instant sales.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={addVideo}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Video
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Auto-slide toggle */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Auto-slide Videos</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Automatically scroll through videos on your storefront</p>
                </div>
                <button
                    type="button"
                    onClick={() => setStore({ ...store, shoppableVideosAutoSlide: !store.shoppableVideosAutoSlide })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${store.shoppableVideosAutoSlide ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${store.shoppableVideosAutoSlide ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {videos.map((video, idx) => (
                    <div key={video.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-slate-400" />
                                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Video {idx + 1}</span>
                            </div>
                            <div className="flex gap-1">
                                <button type="button" disabled={idx === 0}
                                    onClick={() => moveVideo(idx, -1)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-20 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                </button>
                                <button type="button" disabled={idx === videos.length - 1}
                                    onClick={() => moveVideo(idx, 1)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-20 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                <button type="button"
                                    onClick={() => removeVideo(idx)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <ImageUploader
                                    label="Video File (MP4/WEBM)"
                                    hint="Recommended: 9:16 aspect ratio (1080x1920)"
                                    currentUrl={video.videoUrl}
                                    isVideo={true}
                                    onOpenPicker={() => setShowMediaPicker({
                                        allowedTypes: 'video',
                                        multiple: false,
                                        title: 'Select Shoppable Video',
                                        onSelect: (url) => updateVideo(idx, 'videoUrl', url)
                                    })}
                                    onUploaded={(url) => updateVideo(idx, 'videoUrl', url)}
                                />
                                <ImageUploader
                                    label="Custom Thumbnail"
                                    hint="Cover image before video plays"
                                    currentUrl={video.thumbnail}
                                    onOpenPicker={() => setShowMediaPicker({
                                        allowedTypes: 'image',
                                        multiple: false,
                                        title: 'Select Video Thumbnail',
                                        onSelect: (url) => updateVideo(idx, 'thumbnail', url)
                                    })}
                                    onUploaded={(url) => updateVideo(idx, 'thumbnail', url)}
                                />
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        <LinkIcon className="w-4 h-4 text-indigo-400" />
                                        Linked Product
                                    </label>
                                    <select
                                        value={video.productId || ''}
                                        onChange={(e) => updateVideo(idx, 'productId', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
                                    >
                                        <option value="">-- Select a product to link --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Video Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Summer Collection Try-on"
                                            value={video.title || ''}
                                            onChange={(e) => updateVideo(idx, 'title', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            <Eye className="w-3.5 h-3.5" /> View Count
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1.2M or 450K"
                                            value={video.views || ''}
                                            onChange={(e) => updateVideo(idx, 'views', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {videos.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                            <Video className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Shoppable Videos Yet</h3>
                        <p className="text-sm text-slate-500 max-w-sm text-center mb-6">
                            Add vertical videos featuring your products to engage customers and increase conversions.
                        </p>
                        <button
                            onClick={addVideo}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Add First Video
                        </button>
                    </div>
                )}
            </div>

            {showMediaPicker && (
                <MediaPickerModal
                    isOpen={showMediaPicker !== false}
                    storeId={storeId}
                    onClose={() => setShowMediaPicker(false)}
                    onSelect={(url) => {
                        showMediaPicker.onSelect(url);
                        setShowMediaPicker(false);
                    }}
                    multiple={showMediaPicker.multiple || false}
                    allowedTypes={showMediaPicker.allowedTypes || 'all'}
                    title={showMediaPicker.title}
                />
            )}
        </div>
    );
}
// Trigger HMR fix
