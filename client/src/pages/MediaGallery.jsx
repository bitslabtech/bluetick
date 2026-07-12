import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import {
    Image, Trash2, Upload, X, Check, Search, Filter, RefreshCw,
    AlertCircle, HardDrive, Loader2, Copy, ExternalLink, ZoomIn, Grid3X3, List,
    Film, FileText, FolderOpen
} from "lucide-react";

const MEDIA_TABS = [
    { id: "all",      label: "All Media",  icon: FolderOpen, apiParam: null },
    { id: "image",    label: "Photos",     icon: Image,      apiParam: "image" },
    { id: "video",    label: "Videos",     icon: Film,       apiParam: "video" },
    { id: "document", label: "Documents",  icon: FileText,   apiParam: "document" },
];

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const SOURCE_LABELS = {
    wastore: "Online Store",
    vcard: "Digital vCard",
    general_media: "Gallery Upload"
};

export default function MediaGallery({ accessMode = 'dashboard' }) {
    const { user } = useAuth();
    const { showToast } = useUI();
    const token = user?.token || localStorage.getItem("token");

    const [files, setFiles] = useState([]);
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [previewFile, setPreviewFile] = useState(null);
    const fetchSource = accessMode === 'restricted' ? 'restricted' : 'general_media';
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("grid");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [activeMediaTab, setActiveMediaTab] = useState("all");
    // Ref for the hidden file input inside the drop zone
    const dropZoneInputRef = useRef(null);

    // Build headers inline so callbacks always have the latest token
    const getHeaders = useCallback(() => ({
        Authorization: `Bearer ${token}`
    }), [token]);

    const fetchUsage = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/media/usage`, { headers: getHeaders() });
            setUsage(res.data);
        } catch (e) {
            console.error("Usage fetch error:", e);
        }
    }, [token, getHeaders]);

    const fetchFiles = useCallback(async (p = 1, tab = activeMediaTab) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: 50 });
            // Pass source so each gallery only sees its own files
            params.append('source', fetchSource);
            // Pass mediaType filter when a specific tab is active
            const currentTab = MEDIA_TABS.find(t => t.id === tab);
            if (currentTab?.apiParam) params.append('mediaType', currentTab.apiParam);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/media?${params}`, { headers: getHeaders() });
            setFiles(res.data.files || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
            setPage(p);
        } catch (e) {
            console.error("Files fetch error:", e.response?.data || e.message);
        } finally {
            setLoading(false);
        }
    }, [token, getHeaders, fetchSource, activeMediaTab]);

    useEffect(() => {
        fetchUsage();
        fetchFiles(1, activeMediaTab);
    }, [fetchSource, token]);

    const handleFileUpload = async (fileObj) => {
        if (!fileObj) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", fileObj);
            const uploadUrl = `${import.meta.env.VITE_API_URL}/api/media/upload?source=${fetchSource}`;
            await axios.post(uploadUrl, form, {
                headers: { ...getHeaders(), "Content-Type": "multipart/form-data" }
            });
            showToast("File uploaded successfully!", "success");
            await Promise.all([fetchFiles(1, activeMediaTab), fetchUsage()]);
        } catch (e) {
            const errMsg = e.response?.data?.error || "Upload failed";
            showToast(errMsg, "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = (id) => {
        setDeleteTarget({ type: 'single', id });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setDeleteTarget({ type: 'bulk' });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        setDeleteTarget(null);

        if (target.type === 'single') {
            try {
                await axios.delete(`${import.meta.env.VITE_API_URL}/api/media/${target.id}`, { headers: getHeaders() });
                showToast("File deleted", "success");
                setFiles(prev => prev.filter(f => f.id !== target.id));
                setSelectedIds(prev => prev.filter(sid => sid !== target.id));
                await fetchUsage();
            } catch (e) {
                showToast(e.response?.data?.error || "Delete failed", "error");
            }
        } else if (target.type === 'bulk') {
            try {
                await axios.delete(`${import.meta.env.VITE_API_URL}/api/media`, {
                    headers: getHeaders(),
                    data: { ids: selectedIds }
                });
                showToast(`${selectedIds.length} files deleted`, "success");
                setSelectedIds([]);
                await Promise.all([fetchFiles(page, activeMediaTab), fetchUsage()]);
            } catch (e) {
                showToast(e.response?.data?.error || "Bulk delete failed", "error");
            }
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedIds.length === files.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(files.map(f => f.id));
        }
    };

    const copyUrl = (url) => {
        navigator.clipboard.writeText(url);
        showToast("URL copied!", "success");
    };

    // Drag & drop
    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    // Filtered files by search
    const filteredFiles = files.filter(f =>
        !searchTerm ||
        (f.fileName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.source || "").includes(searchTerm.toLowerCase())
    );

    // Usage bar color for restricted (plan-quota) storage
    const restrictedPct = usage?.percentage || 0;
    const barColor = restrictedPct >= 90 ? "bg-red-500" : restrictedPct >= 70 ? "bg-amber-500" : "bg-emerald-500";

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Image className="w-6 h-6 text-primary" />
                        Media Manager
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage all your uploaded images for Online Store &amp; vCards
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.length})
                        </button>
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? "Uploading..." : "Upload File"}
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,application/pdf,text/csv,text/plain,.docx"
                            className="hidden"
                            onChange={e => handleFileUpload(e.target.files[0])}
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>
            {/* Storage Overview */}
            {usage && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plan-Restricted Storage (vCard + Online Store) - ONLY show in restricted mode */}
                    {accessMode === 'restricted' && (
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <HardDrive className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Plan Storage</span>
                                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">vCard &amp; Online Store</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">Reserved quota for your vCard &amp; Online Store uploads as per your plan.</p>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500">
                                    {formatBytes(usage.restrictedBytes)} used
                                </span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    {usage.unlimited
                                        ? <span className="text-emerald-500">&#8734; Unlimited</span>
                                        : `${usage.limitMb} MB limit`}
                                </span>
                            </div>
                            {!usage.unlimited && (
                                <>
                                    <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                            style={{ width: `${Math.min(100, restrictedPct)}%` }}
                                        />
                                    </div>
                                    <p className={`text-xs mt-1.5 font-medium ${restrictedPct >= 90 ? "text-red-500" : "text-slate-400"}`}>
                                        {restrictedPct >= 90 ? "⚠ Storage almost full!" : `${restrictedPct.toFixed(1)}% of plan quota used`}
                                    </p>
                                </>
                            )}
                            {usage.unlimited && (
                                <p className="text-xs text-slate-400">No limit set on your plan.</p>
                            )}
                        </div>
                    )}

                    {/* General Uploads (Media Manager — Unlimited) - ONLY show in dashboard mode */}
                    {accessMode === 'dashboard' && (
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <HardDrive className="w-4 h-4 text-emerald-500" />
                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">General Uploads</span>
                                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">Unlimited</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">Files uploaded directly through the Media Manager. Not subject to plan quota.</p>
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold text-slate-800 dark:text-white">
                                    {formatBytes(usage.generalBytes)}
                                </span>
                                <span className="text-xs text-slate-400">{total} file{total !== 1 ? "s" : ""} total</span>
                            </div>
                            <div className="w-full bg-emerald-100 dark:bg-emerald-900/20 rounded-full h-2.5 mt-3 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500 opacity-40" style={{ width: "100%" }} />
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">&#8734; No limit — upload freely</p>
                        </div>
                    )}
                </div>
            )}
            {/* Horizontal Type Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-white/10 overflow-x-auto">
                {MEDIA_TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveMediaTab(tab.id); setSelectedIds([]); fetchFiles(1, tab.id); }}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px
                                ${activeMediaTab === tab.id
                                    ? "border-primary text-primary bg-primary/5 dark:bg-primary/10"
                                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by filename..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                {/* View toggle */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-dark rounded-lg p-1">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white dark:bg-white/10 shadow text-primary" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white dark:bg-white/10 shadow text-primary" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
                {/* Refresh */}
                <button
                    onClick={() => { fetchFiles(page, activeMediaTab); fetchUsage(); }}
                    className="p-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:text-primary transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                {/* Select All */}
                {files.length > 0 && (
                    <button
                        onClick={selectAll}
                        className="px-3 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                        {selectedIds.length === files.length ? "Deselect All" : "Select All"}
                    </button>
                )}
            </div>
            {/* Drop Zone Banner — clicking anywhere triggers file picker */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploading && dropZoneInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer select-none
                    ${dragOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-slate-200 dark:border-white/10 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/5"
                    } ${uploading ? "opacity-60 cursor-not-allowed" : ""} cursor-pointer`}
            >
                {/* Hidden file input — triggered by clicking the zone or the Upload button above */}
                <input
                    ref={dropZoneInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,application/pdf,text/csv,text/plain,.docx"
                    className="hidden"
                    onChange={e => { if (e.target.files[0]) { handleFileUpload(e.target.files[0]); e.target.value = ''; } }}
                    disabled={uploading}
                />
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dragOver ? "bg-primary text-white" : uploading ? "bg-primary/20 text-primary" : "bg-slate-100 dark:bg-white/10 text-slate-400"}`}>
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {uploading ? "Uploading..." : dragOver ? "Drop to upload!" : "Click here or drag & drop files to upload"}
                    </p>
                    <p className="text-xs text-slate-400">Images (JPG/PNG/WebP/GIF/SVG), Videos (MP4/WebM), Documents (PDF/CSV/DOCX). Max 50 MB.</p>
                </div>
            </div>
            {/* File Grid / List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                        ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                    <Image className="w-12 h-12 opacity-30" />
                    <p className="font-medium">No media files found</p>
                    <p className="text-sm">Upload files from the Online Store, vCard builder, or directly here.</p>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {filteredFiles.map(file => (
                        <div
                            key={file.id}
                            className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer
                                ${selectedIds.includes(file.id)
                                    ? "border-primary shadow-lg shadow-primary/20"
                                    : "border-transparent hover:border-primary/40 hover:shadow-md"
                                } bg-white dark:bg-surface-dark cursor-pointer`}
                            onClick={() => toggleSelect(file.id)}
                        >
                            {/* Thumbnail */}
                            <div className="aspect-square bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                <img
                                    src={file.url}
                                    alt={file.fileName}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                    onError={e => { e.target.src = ""; e.target.classList.add("hidden"); }}
                                />
                            </div>

                            {/* Selection indicator */}
                            <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                ${selectedIds.includes(file.id) ? "bg-primary border-primary" : "border-white/80 bg-black/20"}`}
                            >
                                {selectedIds.includes(file.id) && <Check className="w-3 h-3 text-white" />}
                            </div>

                            {/* Actions overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                                <div className="w-full p-2 flex items-center gap-1 justify-end">
                                    <button
                                        onClick={e => { e.stopPropagation(); setPreviewFile(file); }}
                                        className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-colors"
                                        title="Preview"
                                    >
                                        <ZoomIn className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); copyUrl(file.url); }}
                                        className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-colors"
                                        title="Copy URL"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDelete(file.id); }}
                                        className="p-1.5 bg-red-500/70 hover:bg-red-600 text-white rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="p-2 border-t border-slate-100 dark:border-white/5">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={file.fileName}>
                                    {file.fileName || "Unnamed"}
                                </p>
                                <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[10px] font-medium text-slate-400">{formatBytes(file.sizeBytes)}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium
                                        ${file.source === "wastore" ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                            : file.source === "vcard" ? "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                                                : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}
                                    >
                                        {SOURCE_LABELS[file.source] || file.source}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List view */
                (<div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === files.length && files.length > 0}
                                        onChange={selectAll}
                                        className="rounded border-slate-300"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left">File</th>
                                <th className="px-4 py-3 text-left hidden sm:table-cell">Source</th>
                                <th className="px-4 py-3 text-left hidden md:table-cell">Size</th>
                                <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredFiles.map(file => (
                                <tr key={file.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${selectedIds.includes(file.id) ? "bg-primary/5" : ""}`}>
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(file.id)}
                                            onChange={() => toggleSelect(file.id)}
                                            className="rounded border-slate-300"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={file.url}
                                                alt={file.fileName}
                                                className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                                                onError={e => { e.target.src = ""; }}
                                            />
                                            <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[180px]">
                                                {file.fileName || "Unnamed"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium
                                            ${file.source === "wastore" ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                                : file.source === "vcard" ? "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                                                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}
                                        >
                                            {SOURCE_LABELS[file.source] || file.source}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell text-slate-500 dark:text-slate-400">
                                        {formatBytes(file.sizeBytes)}
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500 dark:text-slate-400 text-xs">
                                        {new Date(file.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => setPreviewFile(file)}
                                                className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                title="Preview"
                                            >
                                                <ZoomIn className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => copyUrl(file.url)}
                                                className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                title="Copy URL"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                title="Open in new tab"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>)
            )}
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            onClick={() => fetchFiles(p, activeMediaTab)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
                                ${p === page ? "bg-primary text-white shadow-sm" : "bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50"}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}
            {/* Preview Modal */}
            {previewFile && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setPreviewFile(null)}
                >
                    <div
                        className="relative bg-white dark:bg-surface-dark rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl cursor-pointer"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-white truncate max-w-xs">{previewFile.fileName}</p>
                                <p className="text-xs text-slate-400">{formatBytes(previewFile.sizeBytes)} &bull; {SOURCE_LABELS[previewFile.source]}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => copyUrl(previewFile.url)}
                                    className="p-2 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <a
                                    href={previewFile.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="p-2 text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-black/20 flex items-center justify-center min-h-[300px]">
                            <img
                                src={previewFile.url}
                                alt={previewFile.fileName}
                                className="max-h-[60vh] max-w-full object-contain rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-6 h-6 text-rose-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Delete File{deleteTarget.type === 'bulk' ? 's' : ''}?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {deleteTarget.type === 'bulk' 
                                    ? `Are you sure you want to permanently delete ${selectedIds.length} files? This action cannot be undone.`
                                    : `Are you sure you want to permanently delete this file? This action cannot be undone.`}
                            </p>
                        </div>
                        <div className="flex border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-r border-slate-100 dark:border-white/5"
                            >
                                No, Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3.5 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


