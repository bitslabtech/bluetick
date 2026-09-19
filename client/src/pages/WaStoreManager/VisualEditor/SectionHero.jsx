import React, { useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import MediaPickerModal from '../../../components/MediaPickerModal';

export default function SectionHero({ draft, updateDraft, storeId }) {
    const slides = draft.heroSlides || [];
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerTarget, setPickerTarget] = useState(null); // slide index

    const updateSlide = (idx, key, val) => {
        const updated = slides.map((s, i) => i === idx ? { ...s, [key]: val } : s);
        updateDraft({ heroSlides: updated });
    };

    const addSlide = () => {
        if (slides.length >= 5) return;
        updateDraft({ heroSlides: [...slides, { imageUrl: '', title: '', subtitle: '', ctaText: '' }] });
    };

    const removeSlide = (idx) => {
        updateDraft({ heroSlides: slides.filter((_, i) => i !== idx) });
    };

    const moveSlide = (idx, dir) => {
        const next = [...slides];
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= next.length) return;
        [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
        updateDraft({ heroSlides: next });
    };

    const openPicker = (idx) => { setPickerTarget(idx); setPickerOpen(true); };

    return (
        <div className="space-y-4">
            {slides.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No slides yet. Add your first hero banner below.</p>
            )}

            {slides.map((slide, idx) => (
                <div key={idx} className="bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    {/* Slide header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Slide {idx + 1}</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => moveSlide(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:text-white disabled:opacity-20 transition-colors">
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => moveSlide(idx, 1)} disabled={idx === slides.length - 1} className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:text-white disabled:opacity-20 transition-colors">
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => removeSlide(idx)} className="p-1 text-gray-400 dark:text-slate-500 hover:text-red-400 transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-3 space-y-3">
                        {/* Image thumbnail / picker */}
                        <button
                            onClick={() => openPicker(idx)}
                            className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/20 hover:border-violet-500 transition-colors flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-slate-800 group relative"
                        >
                            {slide.imageUrl ? (
                                slide.imageUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                    <video src={slide.imageUrl.startsWith('http') ? slide.imageUrl : `${import.meta.env.VITE_API_URL}${slide.imageUrl}`} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                                ) : (
                                    <img src={slide.imageUrl.startsWith('http') ? slide.imageUrl : `${import.meta.env.VITE_API_URL}${slide.imageUrl}`} alt="" className="w-full h-full object-cover" />
                                )
                            ) : (
                                <span className="text-xs text-gray-400 dark:text-slate-500 group-hover:text-violet-400 transition-colors">+ Add Media</span>
                            )}
                            {slide.imageUrl && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-xs font-semibold">Change Media</span>
                                </div>
                            )}
                        </button>

                        {['title', 'subtitle', 'ctaText'].map(field => (
                            <input
                                key={field}
                                type="text"
                                placeholder={field === 'ctaText' ? 'CTA Button Text' : field.charAt(0).toUpperCase() + field.slice(1)}
                                value={slide[field] || ''}
                                onChange={e => updateSlide(idx, field, e.target.value)}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        ))}
                        {/* CTA Link — shown only when ctaText is set */}
                        {slide.ctaText && (
                            <input
                                type="text"
                                placeholder="CTA Link (e.g. /category/summer or https://...)"
                                value={slide.ctaLink || ''}
                                onChange={e => updateSlide(idx, 'ctaLink', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-violet-300 dark:border-violet-500/30 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        )}
                    </div>
                </div>
            ))}

            {slides.length < 5 && (
                <button
                    onClick={addSlide}
                    className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-violet-500 rounded-xl text-sm text-gray-400 dark:text-slate-500 hover:text-violet-400 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Slide ({slides.length}/5)
                </button>
            )}

            <MediaPickerModal
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={(url) => {
                    if (pickerTarget !== null) updateSlide(pickerTarget, 'imageUrl', url);
                    setPickerOpen(false);
                }}
                accessMode="restricted"
                allowedTypes="all"
                multiple={false}
                storeId={storeId}
                title="Select Slide Media"
            />
        </div>
    );
}
