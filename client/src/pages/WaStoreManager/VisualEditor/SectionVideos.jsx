import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Video, Plus, X, ChevronUp, ChevronDown,
    Image as ImageIcon, Link as LinkIcon, Eye, Camera, Loader2
} from 'lucide-react';
import MediaPickerModal from '../../../components/MediaPickerModal';

// ── Compact media picker button ────────────────────────────────────────────────
function MiniMediaPicker({ label, currentUrl, isVideo, onOpenPicker, onClear }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                {isVideo ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                {label}
            </label>
            {currentUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-800" style={{ height: 72 }}>
                    {isVideo ? (
                        <video src={currentUrl} muted loop playsInline className="w-full h-full object-cover" />
                    ) : (
                        <img src={currentUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                        <button type="button" onClick={onOpenPicker}
                            className="px-2 py-1 bg-white text-gray-900 rounded-lg text-[10px] font-bold flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Change
                        </button>
                        <button type="button" onClick={onClear}
                            className="px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ) : (
                <button type="button" onClick={onOpenPicker}
                    className="w-full h-16 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all group">
                    {isVideo
                        ? <Video className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-violet-400 transition-colors" />
                        : <ImageIcon className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-violet-400 transition-colors" />
                    }
                    <span className="text-[9px] text-gray-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors font-semibold">Select</span>
                </button>
            )}
        </div>
    );
}

export default function SectionVideos({ draft, updateDraft, storeId }) {
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState(null); // which video card is expanded

    const videos = Array.isArray(draft.shoppableVideos) ? draft.shoppableVideos : [];

    // Load products for the product link dropdown
    useEffect(() => {
        if (!storeId) return;
        axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}/products`)
            .then(res => setProducts(res.data.products || res.data || []))
            .catch(() => {})
            .finally(() => setLoadingProducts(false));
    }, [storeId]);

    const setVideos = (updated) => {
        updateDraft({ shoppableVideos: updated });
    };

    const addVideo = () => {
        const newVideo = {
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: '',
            videoUrl: '',
            thumbnail: '',
            productId: '',
        };
        const updated = [...videos, newVideo];
        setVideos(updated);
        setExpandedIdx(updated.length - 1);
    };

    const updateVideo = (idx, field, value) => {
        const updated = [...videos];
        updated[idx] = { ...updated[idx], [field]: value };
        setVideos(updated);
    };

    const removeVideo = (idx) => {
        const updated = videos.filter((_, i) => i !== idx);
        setVideos(updated);
        if (expandedIdx === idx) setExpandedIdx(null);
        else if (expandedIdx > idx) setExpandedIdx(expandedIdx - 1);
    };

    const moveVideo = (idx, dir) => {
        const updated = [...videos];
        const target = idx + dir;
        if (target < 0 || target >= updated.length) return;
        [updated[idx], updated[target]] = [updated[target], updated[idx]];
        setVideos(updated);
        setExpandedIdx(target);
    };

    return (
        <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {videos.length} Video{videos.length !== 1 ? 's' : ''}
                </label>
                <button
                    onClick={addVideo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Video
                </button>
            </div>

            {/* Auto-slide toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Auto-slide Videos</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">Automatically scroll videos horizontally</span>
                </div>
                <button
                    type="button"
                    onClick={() => updateDraft({ shoppableVideosAutoSlide: !draft.shoppableVideosAutoSlide })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${draft.shoppableVideosAutoSlide ? 'bg-violet-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${draft.shoppableVideosAutoSlide ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            {/* Empty state */}
            {videos.length === 0 && (
                <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-white/5">
                    <Video className="w-8 h-8 text-gray-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-1">No shoppable videos yet</p>
                    <p className="text-[10px] text-gray-300 dark:text-slate-600 text-center leading-relaxed px-4">
                        Add vertical videos to create a TikTok-style slider on your store.
                    </p>
                    <button
                        onClick={addVideo}
                        className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold rounded-xl transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add First Video
                    </button>
                </div>
            )}

            {/* Video cards */}
            <div className="space-y-2">
                {videos.map((video, idx) => {
                    const isOpen = expandedIdx === idx;
                    return (
                        <div key={video.id || idx}
                            className={`rounded-xl border transition-all overflow-hidden ${isOpen
                                ? 'border-violet-400/40 dark:border-violet-500/30 bg-violet-50/30 dark:bg-violet-900/10'
                                : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5'
                            }`}
                        >
                            {/* Card header */}
                            <div
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
                                onClick={() => setExpandedIdx(isOpen ? null : idx)}
                            >
                                {/* Thumbnail preview */}
                                <div className="w-8 h-11 rounded-lg overflow-hidden bg-gray-200 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                                    {video.thumbnail
                                        ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                                        : video.videoUrl
                                            ? <video src={video.videoUrl} muted className="w-full h-full object-cover" />
                                            : <Video className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                        {video.title || `Video ${idx + 1}`}
                                    </p>
                                    {video.videoUrl
                                        ? <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                                            {video.videoUrl.split('/').pop()}
                                        </p>
                                        : <p className="text-[10px] text-amber-500 font-medium">No video file</p>
                                    }
                                </div>
                                {/* Reorder + delete */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <button type="button" disabled={idx === 0}
                                        onClick={(e) => { e.stopPropagation(); moveVideo(idx, -1); }}
                                        className="p-1 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30 disabled:opacity-20 transition-colors">
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" disabled={idx === videos.length - 1}
                                        onClick={(e) => { e.stopPropagation(); moveVideo(idx, 1); }}
                                        className="p-1 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30 disabled:opacity-20 transition-colors">
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button"
                                        onClick={(e) => { e.stopPropagation(); removeVideo(idx); }}
                                        className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded fields */}
                            {isOpen && (
                                <div className="px-3 pb-3 space-y-3 border-t border-gray-200 dark:border-white/10 pt-3">
                                    {/* Video + Thumbnail pickers */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <MiniMediaPicker
                                            label="Video File"
                                            currentUrl={video.videoUrl}
                                            isVideo={true}
                                            onOpenPicker={() => setShowMediaPicker({
                                                allowedTypes: 'video',
                                                title: 'Select Shoppable Video',
                                                onSelect: (url) => updateVideo(idx, 'videoUrl', url),
                                            })}
                                            onClear={() => updateVideo(idx, 'videoUrl', '')}
                                        />
                                        <MiniMediaPicker
                                            label="Thumbnail"
                                            currentUrl={video.thumbnail}
                                            isVideo={false}
                                            onOpenPicker={() => setShowMediaPicker({
                                                allowedTypes: 'image',
                                                title: 'Select Thumbnail',
                                                onSelect: (url) => updateVideo(idx, 'thumbnail', url),
                                            })}
                                            onClear={() => updateVideo(idx, 'thumbnail', '')}
                                        />
                                    </div>

                                    {/* Title */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Summer Collection Try-on"
                                            value={video.title || ''}
                                            onChange={(e) => updateVideo(idx, 'title', e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-violet-500 outline-none"
                                        />
                                    </div>

                                    {/* Linked product */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <LinkIcon className="w-3 h-3" /> Linked Product
                                        </label>
                                        {loadingProducts ? (
                                            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Loading products…
                                            </div>
                                        ) : (
                                            <select
                                                value={video.productId || ''}
                                                onChange={(e) => updateVideo(idx, 'productId', e.target.value)}
                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                            >
                                                <option value="">-- Select a product --</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Hint */}
            {videos.length > 0 && (
                <p className="text-[10px] text-gray-300 dark:text-slate-600 leading-relaxed text-center">
                    Changes update the preview instantly. Click Save to make them live.
                </p>
            )}

            {/* Media Picker Modal */}
            {typeof showMediaPicker === 'object' && showMediaPicker !== null && (
                <MediaPickerModal
                    isOpen={true}
                    storeId={storeId}
                    onClose={() => setShowMediaPicker(false)}
                    onSelect={(url) => {
                        if (typeof showMediaPicker.onSelect === 'function') showMediaPicker.onSelect(url);
                        setShowMediaPicker(false);
                    }}
                    multiple={false}
                    allowedTypes={showMediaPicker.allowedTypes || 'all'}
                    title={showMediaPicker.title}
                />
            )}
        </div>
    );
}
