import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Save, Monitor, Smartphone, Eye,
    GripVertical, Wand2, Loader2, ExternalLink, X, Columns, AlertTriangle
} from 'lucide-react';

// Section Panel Imports
import SectionTopBar from './VisualEditor/SectionTopBar';
import SectionHero from './VisualEditor/SectionHero';
import SectionCategories from './VisualEditor/SectionCategories';
import SectionCollections from './VisualEditor/SectionCollections';
import SectionVideos from './VisualEditor/SectionVideos';
import SectionTrending from './VisualEditor/SectionTrending';
import SectionProducts from './VisualEditor/SectionProducts';
import SectionFooter from './VisualEditor/SectionFooter';

const SECTION_META = {
    topbar:      { label: 'Top Bar',           icon: '📣' },
    hero:        { label: 'Hero Slider',        icon: '🖼️' },
    categories:  { label: 'Category Bar',       icon: '🏷️' },
    collections: { label: 'Collections',        icon: '🗂️' },
    videos:      { label: 'Shop Through Video', icon: '🎬' },
    trending:    { label: 'Trending Now',        icon: '🔥' },
    products:    { label: 'All Products',        icon: '📦' },
    footer:      { label: 'Footer',             icon: '📄' },
};

const DEFAULT_SECTIONS = [
    { id: 'topbar',      visible: true },
    { id: 'hero',        visible: true },
    { id: 'categories',  visible: true },
    { id: 'collections', visible: true },
    { id: 'videos',      visible: true },
    { id: 'trending',    visible: true },
    { id: 'products',    visible: true },
    { id: 'footer',      visible: true },
];

export default function WaStoreVisualEditor() {
    const navigate = useNavigate();
    const { slug } = useParams();

    // Self-contained store fetching (no useOutletContext — this route is outside WaStoreLayout)
    const [storeId, setStoreId] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);

    // Draft store state — changes here → postMessage to iframe
    const [draft, setDraft] = useState(null);
    const [sections, setSections] = useState(DEFAULT_SECTIONS);
    const [activeSection, setActiveSection] = useState('hero');
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [previewMode, setPreviewMode] = useState(() => localStorage.getItem('vse_previewMode') || 'both'); // 'desktop' | 'mobile' | 'both'
    const [showMobilePreview, setShowMobilePreview] = useState(false); // mobile modal
    const [products, setProducts] = useState([]); // forwarded to iframe for live preview
    const productsRef = useRef([]); // ref so callbacks always see latest products
    const [hoveredSection, setHoveredSection] = useState(null); // for iframe highlight
    
    // Dedicated in-app unsaved changes modal state
    const [showExitModal, setShowExitModal] = useState(false);
    const [exitType, setExitType] = useState('back'); // 'back' | 'reload'

    // Drag state
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    const desktopIframeRef = useRef(null);
    const mobileIframeRef = useRef(null);
    const mobileModalIframeRef = useRef(null);
    const iframeUrl = `${window.location.origin}/store/${slug}?editor=true`;
    const desktopReadyRef = useRef(false);
    const mobileReadyRef = useRef(false);
    const mobileModalReadyRef = useRef(false);

    // Fetch store data on mount
    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/by-slug/${slug}`);
                const s = res.data;
                setStoreId(s.id);
                const storedSections = s.homepageSections;
                let mergedSections;
                if (storedSections && storedSections.length > 0) {
                    mergedSections = DEFAULT_SECTIONS.map(def => {
                        const saved = storedSections.find(sec => sec.id === def.id);
                        return saved || def;
                    });
                } else {
                    mergedSections = DEFAULT_SECTIONS;
                }
                setSections(mergedSections);
                setDraft({ ...s, homepageSections: mergedSections });

                // Also fetch products so the iframe preview can show them
                try {
                    const pRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/${slug}`);
                    if (pRes.data.products) {
                        setProducts(pRes.data.products);
                        productsRef.current = pRes.data.products;
                    }
                } catch (_) {
                    // Non-fatal — products just won't show in preview
                }
            } catch (err) {
                toast.error('Failed to load store');
                navigate(`/online-store/${slug}/details`);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchStore();
    }, [slug]);

    // ── postMessage to iframes ────────────────────────────────────────────────
    const sendToIframe = useCallback((updatedDraft, prods) => {
        const payload = { type: 'VSE_UPDATE', store: updatedDraft, products: prods ?? productsRef.current };
        if (desktopIframeRef.current?.contentWindow) {
            desktopIframeRef.current.contentWindow.postMessage(payload, window.location.origin);
        }
        if (mobileIframeRef.current?.contentWindow) {
            mobileIframeRef.current.contentWindow.postMessage(payload, window.location.origin);
        }
        if (mobileModalIframeRef.current?.contentWindow) {
            mobileModalIframeRef.current.contentWindow.postMessage(payload, window.location.origin);
        }
    }, []);

    // Listen for VSE_READY from iframe AND handle draft becoming available
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'VSE_READY' && draft) {
                // Iframe just booted and is ready — push current draft + products
                sendToIframe(draft, products);
            }
            if (event.data?.type === 'VSE_SCROLL') {
                const payload = { 
                    type: 'VSE_SYNC_SCROLL', 
                    scrollPercent: event.data.scrollPercent, 
                    currentId: event.data.currentId,
                    nextId: event.data.nextId,
                    fraction: event.data.fraction,
                    senderId: event.data.senderId 
                };
                // Broadcast to all iframes. The sender will ignore its own message.
                desktopIframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
                mobileIframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
                mobileModalIframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
            }
            if (event.data?.type === 'VSE_ROUTE_CHANGE') {
                const payload = { 
                    type: 'VSE_SYNC_ROUTE', 
                    pathname: event.data.pathname, 
                    search: event.data.search, 
                    senderId: event.data.senderId 
                };
                desktopIframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
                mobileIframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
                mobileModalIframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [draft, products, sendToIframe]);

    // When draft first becomes available and all loaded iframes are ready, push to them
    useEffect(() => {
        if (!draft) return;
        if (desktopReadyRef.current || mobileReadyRef.current || mobileModalReadyRef.current) {
            const t = setTimeout(() => sendToIframe(draft, products), 100);
            return () => clearTimeout(t);
        }
    }, [draft, products, sendToIframe]);

    const updateDraft = useCallback((changes) => {
        setDraft(prev => {
            const next = { ...prev, ...changes };
            setTimeout(() => sendToIframe(next, products), 0);
            return next;
        });
        setHasChanges(true);
    }, [sendToIframe, products]);

    // Per-iframe load handlers — each iframe sends draft independently
    const handleDesktopIframeLoad = useCallback(() => {
        desktopReadyRef.current = true;
        if (draft) setTimeout(() => {
            const payload = { type: 'VSE_UPDATE', store: draft, products: productsRef.current };
            desktopIframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
        }, 200);
    }, [draft]);

    const handleMobileIframeLoad = useCallback(() => {
        mobileReadyRef.current = true;
        if (draft) setTimeout(() => {
            const payload = { type: 'VSE_UPDATE', store: draft, products: productsRef.current };
            mobileIframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
        }, 200);
    }, [draft]);

    const handleMobileModalIframeLoad = useCallback(() => {
        mobileModalReadyRef.current = true;
        if (draft) setTimeout(() => {
            const payload = { type: 'VSE_UPDATE', store: draft, products: productsRef.current };
            mobileModalIframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
        }, 200);
    }, [draft]);

    // Toggle section visibility (topbar and footer are always visible)
    const toggleSection = (id) => {
        if (id === 'footer' || id === 'topbar') return;
        const updated = sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
        setSections(updated);
        updateDraft({ homepageSections: updated });
    };

    // Drag-to-reorder sections (topbar stays first, footer stays last)
    const handleDragStart = (idx) => setDragIdx(idx);
    const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleDrop = (idx) => {
        if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
        const reordered = [...sections];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(idx, 0, moved);
        // Keep topbar always first, footer always last
        const topbarIdx = reordered.findIndex(s => s.id === 'topbar');
        if (topbarIdx !== 0) {
            const [topbar] = reordered.splice(topbarIdx, 1);
            reordered.unshift(topbar);
        }
        const footerIdx = reordered.findIndex(s => s.id === 'footer');
        if (footerIdx !== reordered.length - 1) {
            const [footer] = reordered.splice(footerIdx, 1);
            reordered.push(footer);
        }
        setSections(reordered);
        updateDraft({ homepageSections: reordered });
        setDragIdx(null);
        setDragOverIdx(null);
    };

    // Save to backend
    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/wastore/${storeId}`, draft);
            toast.success('Changes saved and live!');
            setHasChanges(false);
            return true;
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save changes');
            return false;
        } finally {
            setSaving(false);
        }
    };

    // ── Unsaved changes protection ──────────────────────────────────────────
    // 1. Intercept keyboard reloads (F5, Ctrl+R, Cmd+R) to show app-dedicated modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!hasChanges) return;
            const isF5 = e.key === 'F5';
            const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R');
            if (isF5 || isCtrlR) {
                e.preventDefault();
                setExitType('reload');
                setShowExitModal(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasChanges]);

    const skipBeforeUnloadRef = useRef(false);

    // 2. Safety net for closing tab / browser toolbar reload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!hasChanges || skipBeforeUnloadRef.current) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges]);

    const doNavigateBack = useCallback(() => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(`/online-store/${slug}/details`);
        }
    }, [navigate, slug]);

    const handleBackClick = () => {
        if (hasChanges) {
            setExitType('back');
            setShowExitModal(true);
        } else {
            doNavigateBack();
        }
    };

    const handleConfirmDiscard = () => {
        setShowExitModal(false);
        setHasChanges(false);
        skipBeforeUnloadRef.current = true;
        if (exitType === 'reload') {
            window.location.reload();
        } else {
            doNavigateBack();
        }
    };

    const handleSaveAndExit = async () => {
        const ok = await handleSave();
        if (ok) {
            setShowExitModal(false);
            skipBeforeUnloadRef.current = true;
            if (exitType === 'reload') {
                window.location.reload();
            } else {
                doNavigateBack();
            }
        }
    };
    // ── Phase 5: Section hover highlight — tell iframe to outline a section ───
    const highlightSection = useCallback((sectionId) => {
        const payload = { type: 'VSE_HIGHLIGHT', sectionId };
        if (desktopIframeRef.current?.contentWindow) {
            desktopIframeRef.current.contentWindow.postMessage(payload, window.location.origin);
        }
        if (mobileIframeRef.current?.contentWindow) {
            mobileIframeRef.current.contentWindow.postMessage(payload, window.location.origin);
        }
    }, []);

    const handleSectionMouseEnter = useCallback((sectionId) => {
        setHoveredSection(sectionId);
        highlightSection(sectionId);
    }, [highlightSection]);

    const handleSectionMouseLeave = useCallback(() => {
        setHoveredSection(null);
        highlightSection(null);
    }, [highlightSection]);

    // ── Focus: scroll-to + persistent red dashed active border in iframe ──────
    const focusSection = useCallback((sectionId) => {
        const payload = { type: 'VSE_FOCUS', sectionId };
        if (desktopIframeRef.current?.contentWindow) {
            desktopIframeRef.current.contentWindow.postMessage(payload, window.location.origin);
        }
        if (mobileIframeRef.current?.contentWindow) {
            mobileIframeRef.current.contentWindow.postMessage(payload, window.location.origin);
        }
    }, []);

    // Active section panel component
    const renderPanel = () => {
        if (!draft) return null;
        const props = { draft, updateDraft, storeId };
        switch (activeSection) {
            case 'topbar':      return <SectionTopBar {...props} />;
            case 'hero':        return <SectionHero {...props} />;
            case 'categories':  return <SectionCategories {...props} />;
            case 'collections': return <SectionCollections {...props} />;
            case 'videos':      return <SectionVideos {...props} />;
            case 'trending':    return <SectionTrending {...props} />;
            case 'products':    return <SectionProducts {...props} />;
            case 'footer':      return <SectionFooter {...props} />;
            default:            return null;
        }
    };

    if (initialLoading || !draft) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
                    <p className="text-gray-500 dark:text-slate-400 text-sm">Loading Visual Editor…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-white" style={{ fontFamily: 'Inter, sans-serif' }}>

            {/* ─── TOP BAR ─── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBackClick}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="h-5 w-px bg-gray-200 dark:bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-violet-400" />
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">Visual Editor</span>
                        <span className="text-gray-400 dark:text-slate-500 text-sm">— {draft.name}</span>
                    </div>
                    {hasChanges && (
                        <span className="hidden sm:block text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                            Unsaved changes
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Preview size toggle — desktop only */}
                    <div className="hidden md:flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => { setPreviewMode('both'); localStorage.setItem('vse_previewMode', 'both'); }}
                            className={`p-1.5 rounded-lg transition-colors ${previewMode === 'both' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white'}`}
                            title="Side-by-side preview"
                        >
                            <Columns className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => { setPreviewMode('desktop'); localStorage.setItem('vse_previewMode', 'desktop'); }}
                            className={`p-1.5 rounded-lg transition-colors ${previewMode === 'desktop' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white'}`}
                            title="Desktop preview"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => { setPreviewMode('mobile'); localStorage.setItem('vse_previewMode', 'mobile'); }}
                            className={`p-1.5 rounded-lg transition-colors ${previewMode === 'mobile' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white'}`}
                            title="Mobile preview"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Mobile: Preview button */}
                    <button
                        onClick={() => setShowMobilePreview(true)}
                        className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
                    >
                        <Eye className="w-4 h-4" /> Preview
                    </button>

                    <a
                        href={`/store/${slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" /> Live
                    </a>

                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/25"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ─── LEFT PANEL ─── */}
                <div className="w-72 shrink-0 flex flex-col border-r border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden">

                    {/* Sections list */}
                    <div className="px-3 pt-4 pb-2 shrink-0">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 font-bold px-2 mb-2">Sections</p>
                    </div>
                    <div className="px-3 space-y-1 shrink-0">
                        {sections.map((section, idx) => {
                            const meta = SECTION_META[section.id];
                            if (!meta) return null;
                            const isActive = activeSection === section.id;
                            const isLocked = section.id === 'footer' || section.id === 'topbar'; // pinned, not draggable
                            return (
                                <div
                                    key={section.id}
                                    draggable={!isLocked}
                                    onDragStart={() => !isLocked && handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDrop={() => handleDrop(idx)}
                                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                                    onMouseEnter={() => handleSectionMouseEnter(section.id)}
                                    onMouseLeave={handleSectionMouseLeave}
                                    className={`flex items-center gap-2 px-2 py-2.5 rounded-xl cursor-pointer group transition-all relative
                                        ${isActive ? 'bg-violet-600/10 dark:bg-violet-600/20 border border-violet-400/40 dark:border-violet-500/30' : 'hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'}
                                        ${dragOverIdx === idx && dragIdx !== idx && !isLocked ? 'border-t-2 border-t-violet-400' : ''}
                                        ${hoveredSection === section.id && !isActive ? 'bg-violet-50/60 dark:bg-violet-900/10' : ''}
                                    `}
                                    onClick={() => {
                                        setActiveSection(section.id);
                                        focusSection(section.id);
                                    }}
                                >
                                    {/* Hover accent — subtle left bar */}
                                    {hoveredSection === section.id && !isActive && (
                                        <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-violet-400/60 rounded-full" />
                                    )}
                                    {/* Drag handle or lock icon */}
                                    {isLocked ? (
                                        <div className="w-4 shrink-0 flex items-center justify-center" title={section.id === 'topbar' ? 'Always first' : 'Always last'}>
                                            <span className="text-[10px] text-gray-300 dark:text-slate-600">🔒</span>
                                        </div>
                                    ) : (
                                        <GripVertical className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 shrink-0 cursor-grab" />
                                    )}
                                    <span className="text-base leading-none">{meta.icon}</span>
                                    <span className={`flex-1 text-sm font-medium ${isActive ? 'text-violet-600 dark:text-violet-300' : 'text-gray-700 dark:text-slate-300'}`}>
                                        {meta.label}
                                    </span>
                                    {/* Visibility toggle — pill switch for non-locked sections */}
                                    {!isLocked && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                                            title={section.visible ? 'Click to hide section' : 'Click to show section'}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none
                                                ${section.visible ? 'bg-green-500' : 'bg-red-500'}`}
                                        >
                                            <span
                                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200
                                                    ${section.visible ? 'translate-x-4' : 'translate-x-0.5'}`}
                                            />
                                        </button>
                                    )}
                                    {isLocked && (
                                        <span className="text-[9px] text-gray-300 dark:text-slate-600 font-medium">fixed</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Active section settings panel */}
                    <div className="flex-1 overflow-y-auto mt-4 border-t border-gray-100 dark:border-white/10">
                        <div className="px-3 pt-4">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500 font-bold px-1 mb-3">
                                {SECTION_META[activeSection]?.icon} {SECTION_META[activeSection]?.label} Settings
                            </p>
                        </div>
                        <div className="px-3 pb-8">
                            {renderPanel()}
                        </div>
                    </div>
                </div>

                {/* ─── RIGHT: IFRAME PREVIEW ─── */}
                <div className="hidden md:flex flex-1 flex-col min-h-0 bg-gray-100 dark:bg-slate-950 items-center overflow-auto py-4 gap-3">
                    <div className={`transition-all duration-500 flex-1 min-h-0 w-full flex justify-center gap-6 ${previewMode === 'mobile' ? 'max-w-[400px]' : 'max-w-full px-4'}`}>
                        
                        {/* Mobile Iframe (renders in 'mobile' or 'both' mode) */}
                        {(previewMode === 'mobile' || previewMode === 'both') && (
                            <div className={`flex flex-col gap-2.5 items-center ${previewMode === 'both' ? 'flex-[1] min-w-[320px] max-w-[400px]' : 'w-[375px]'} min-h-0 shrink-0 transition-all duration-500`}>
                                <div className="relative w-full flex-1 min-h-0 bg-gray-200 dark:bg-slate-900 rounded-[2.5rem] pt-6 px-2 pb-2 shadow-2xl border-4 border-gray-300 dark:border-slate-700 overflow-hidden">
                                    <div className="absolute top-0 inset-x-0 h-6 bg-gray-200 dark:bg-slate-900 z-10 flex items-center justify-center">
                                        <div className="w-20 h-3.5 bg-gray-300 dark:bg-slate-700 rounded-full" />
                                    </div>
                                    <iframe
                                        ref={mobileIframeRef}
                                        src={iframeUrl}
                                        onLoad={handleMobileIframeLoad}
                                        className="w-full h-full rounded-[1.5rem] border-0 bg-white"
                                        title="Mobile Store Preview"
                                    />
                                </div>
                                <span className="text-[11px] font-bold tracking-widest uppercase text-gray-400 dark:text-slate-500">
                                    📱 Mobile Phone Preview
                                </span>
                            </div>
                        )}

                        {/* Desktop Iframe (renders in 'desktop' or 'both' mode) */}
                        {(previewMode === 'desktop' || previewMode === 'both') && (
                            <div className={`flex flex-col gap-2.5 items-center ${previewMode === 'both' ? 'flex-[3]' : 'flex-1'} min-w-[700px] min-h-0 shrink-0 transition-all duration-500`}>
                                <div className="w-full flex-1 min-h-0 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden bg-white">
                                    <iframe
                                        ref={desktopIframeRef}
                                        src={iframeUrl}
                                        onLoad={handleDesktopIframeLoad}
                                        className="w-full h-full border-0"
                                        title="Desktop Store Preview"
                                    />
                                </div>
                                <span className="text-[11px] font-bold tracking-widest uppercase text-gray-400 dark:text-slate-500">
                                    🖥️ Desktop / PC preview
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-600 shrink-0 pb-2">
                        ✨ Changes appear live as you edit
                    </p>
                </div>

                {/* Mobile: No preview pane (use modal instead) */}
                <div className="flex-1 md:hidden flex items-center justify-center bg-gray-100 dark:bg-slate-950 text-gray-400 dark:text-slate-600 text-sm">
                    <div className="text-center p-8">
                        <Monitor className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Open on desktop for live preview</p>
                        <button onClick={() => setShowMobilePreview(true)} className="mt-3 text-violet-500 hover:underline text-sm">
                            Or tap Preview →
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── MOBILE PREVIEW MODAL ─── */}
            {showMobilePreview && (
                <div className="fixed inset-0 z-[60] flex flex-col bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
                    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">Store Preview</span>
                        <button
                            onClick={() => setShowMobilePreview(false)}
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <iframe
                        ref={mobileModalIframeRef}
                        src={iframeUrl}
                        onLoad={handleMobileModalIframeLoad}
                        className="flex-1 border-0"
                        title="Store Preview Mobile"
                    />
                </div>
            )}
            {/* ─── APP DEDICATED UNSAVED CHANGES MODAL ─── */}
            {showExitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Unsaved Changes</h3>
                                <p className="text-xs text-gray-400 dark:text-slate-500">
                                    {exitType === 'reload' ? 'Page reload requested' : 'Leaving Visual Editor'}
                                </p>
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
                            {exitType === 'reload' 
                                ? 'You have unsaved changes in your store design. Reloading the page will discard all edits made since your last save.'
                                : 'You have unsaved changes in your store design. Are you sure you want to leave without saving? Your changes will be lost.'}
                        </p>

                        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:gap-3">
                            <button
                                onClick={handleSaveAndExit}
                                disabled={saving}
                                className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save & {exitType === 'reload' ? 'Reload' : 'Leave'}
                            </button>
                            <button
                                onClick={handleConfirmDiscard}
                                className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 text-sm font-semibold rounded-xl transition-colors text-center"
                            >
                                Discard Changes
                            </button>
                            <button
                                onClick={() => setShowExitModal(false)}
                                className="py-2.5 px-4 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-center"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
