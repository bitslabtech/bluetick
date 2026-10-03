import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    X, ChevronLeft, ChevronRight, Download, Printer,
    ZoomIn, ZoomOut, RotateCw, Maximize2, Play
} from 'lucide-react';

/**
 * MediaLightbox - WhatsApp-style media viewer for the Live Inbox.
 *
 * Props:
 *  items        - array of { url, type ('image'|'video'), caption?, senderName?, timestamp? }
 *  initialIndex - index to open on
 *  onClose      - called when user dismisses the lightbox
 */
const MediaLightbox = ({ items = [], initialIndex = 0, onClose }) => {
    const [current, setCurrent] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const controlsTimerRef = useRef(null);

    const item = items[current] || {};
    const isImage = item.type === 'image';
    const isVideo = item.type === 'video';
    const hasPrev = current > 0;
    const hasNext = current < items.length - 1;

    const resetTransform = () => {
        setZoom(1);
        setRotate(0);
        setDragOffset({ x: 0, y: 0 });
    };

    const goTo = useCallback((idx) => {
        setCurrent(idx);
        resetTransform();
    }, []);

    const prev = useCallback(() => { if (hasPrev) goTo(current - 1); }, [hasPrev, current, goTo]);
    const next = useCallback(() => { if (hasNext) goTo(current + 1); }, [hasNext, current, goTo]);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [prev, next, onClose]);

    const resetControlsTimer = useCallback(() => {
        setShowControls(true);
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }, []);

    useEffect(() => {
        resetControlsTimer();
        return () => clearTimeout(controlsTimerRef.current);
    }, [current, resetControlsTimer]);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleDownload = async () => {
        try {
            const response = await fetch(item.url, { mode: 'cors' });
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            const ext = isImage ? '.jpg' : '.mp4';
            a.download = item.caption || ('media' + ext);
            a.click();
            URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(item.url, '_blank');
        }
    };

    const handlePrint = () => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Print</title>
            <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000}
            img{max-width:100%;max-height:100vh;object-fit:contain}</style></head>
            <body><img src="${item.url}" onload="window.print();window.close()" /></body></html>
        `);
        win.document.close();
    };

    const onMouseDown = (e) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    const onMouseMove = (e) => {
        if (!isDragging) return;
        setDragOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };
    const onMouseUp = () => setIsDragging(false);

    const touchStartX = useRef(null);
    const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
        if (touchStartX.current === null || zoom > 1) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
        touchStartX.current = null;
    };

    const onWheel = (e) => {
        e.preventDefault();
        setZoom(z => Math.max(0.5, Math.min(5, z - e.deltaY * 0.001)));
    };

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[9999] flex flex-col"
            style={{ background: 'rgba(0,0,0,0.96)' }}
            onMouseMove={resetControlsTimer}
            onClick={resetControlsTimer}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            <div
                className="absolute top-0 left-0 right-0 z-20 transition-opacity duration-300"
                style={{
                    opacity: showControls ? 1 : 0,
                    pointerEvents: showControls ? 'auto' : 'none',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
                }}
            >
                <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex flex-col min-w-0">
                        <span className="text-white font-semibold text-sm truncate leading-tight">
                            {item.senderName || 'Media'}
                        </span>
                        {item.timestamp && (
                            <span className="text-white/50 text-xs mt-0.5">{item.timestamp}</span>
                        )}
                        {items.length > 1 && (
                            <span className="text-white/40 text-[11px]">{current + 1} / {items.length}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-3">
                        {isImage && (
                            <>
                                <button onClick={() => setZoom(z => Math.min(5, z + 0.5))} title="Zoom In" className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                                    <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} title="Zoom Out" className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                                    <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <button onClick={() => setRotate(r => r + 90)} title="Rotate" className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                                    <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <button onClick={handlePrint} title="Print" className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all hidden sm:flex">
                                    <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </>
                        )}
                        <button onClick={handleDownload} title="Download" className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button onClick={toggleFullscreen} title="Fullscreen" className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all hidden sm:flex">
                            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button onClick={onClose} title="Close (Esc)" className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {hasPrev && (
                <button
                    onClick={(e) => { e.stopPropagation(); prev(); }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full transition-all"
                    style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.12)', opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}
                    title="Previous (Arrow Left)"
                >
                    <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </button>
            )}

            {hasNext && (
                <button
                    onClick={(e) => { e.stopPropagation(); next(); }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full transition-all"
                    style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.12)', opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}
                    title="Next (Arrow Right)"
                >
                    <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </button>
            )}

            <div
                className="flex-1 flex items-center justify-center overflow-hidden relative"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onWheel={onWheel}
                style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
                {isImage && (
                    <img
                        ref={imgRef}
                        src={item.url}
                        alt={item.caption || 'media'}
                        draggable={false}
                        style={{
                            transform: `scale(${zoom}) rotate(${rotate}deg) translate(${dragOffset.x / zoom}px, ${dragOffset.y / zoom}px)`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease',
                            maxWidth: '90vw',
                            maxHeight: '80vh',
                            objectFit: 'contain',
                            userSelect: 'none',
                            borderRadius: 8,
                            boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                        }}
                        onDoubleClick={() => setZoom(z => z === 1 ? 2.5 : 1)}
                    />
                )}
                {isVideo && (
                    <video
                        src={item.url}
                        controls
                        autoPlay
                        style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
                    />
                )}
            </div>

            <div
                className="absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300"
                style={{ opacity: showControls ? 1 : 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
            >
                {items.length > 1 && (
                    <div className="flex justify-center gap-2 px-4 py-2 overflow-x-auto">
                        {items.map((itm, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); goTo(idx); }}
                                className="shrink-0 rounded-lg overflow-hidden transition-all"
                                style={{ width: 44, height: 44, border: idx === current ? '2px solid #fff' : '2px solid transparent', opacity: idx === current ? 1 : 0.5, transform: idx === current ? 'scale(1.1)' : 'scale(1)' }}
                            >
                                {itm.type === 'image' ? (
                                    <img src={itm.url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                                        <Play className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
                {item.caption && (
                    <p className="text-white/80 text-sm text-center pb-4 px-8 truncate">{item.caption}</p>
                )}
            </div>

            {isImage && zoom === 1 && showControls && (
                <div className="absolute bottom-16 right-4 text-white/25 text-[10px] hidden sm:block select-none" style={{ pointerEvents: 'none' }}>
                    Scroll or double-click to zoom · Arrow keys to navigate
                </div>
            )}
        </div>
    );
};

export default MediaLightbox;
