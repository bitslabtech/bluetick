import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import {
    X, Upload, Search, RefreshCw, Loader2, Check, Image as ImageIcon,
    Film, FileText, Grid3X3, List, HardDrive, ZoomIn, FolderOpen,
    AlertCircle, File, Ban, Info
} from "lucide-react";

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const isVideo = (mimeType, url) =>
    (mimeType && mimeType.startsWith("video/")) ||
    /\.(mp4|webm|3gp|ogg)(\?.*)?$/i.test(url || "");

const isDocument = (mimeType) =>
    mimeType && (
        mimeType === "application/pdf" ||
        mimeType.startsWith("text/") ||
        mimeType.includes("document") ||
        mimeType.includes("spreadsheet")
    );

const ALLOWED_TYPES = {
    image: {
        mime: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
        ext: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"],
        label: "JPG, PNG, WebP, GIF, SVG"
    },
    video: {
        mime: ["video/mp4", "video/webm", "video/3gpp"],
        ext: [".mp4", ".webm", ".3gp", ".3gpp"],
        label: "MP4, WebM, 3GP"
    },
    document: {
        mime: [
            "application/pdf", "text/csv", "text/plain",
            "text/markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        ext: [".pdf", ".csv", ".txt", ".md", ".docx"],
        label: "PDF, CSV, TXT, MD, DOCX"
    },
    all: {
        mime: ["image/jpeg","image/png","image/webp","image/gif","image/svg+xml","video/mp4","video/webm","video/3gpp","application/pdf","text/csv","text/plain","text/markdown","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        ext: [".jpg",".jpeg",".png",".webp",".gif",".svg",".mp4",".webm",".3gp",".3gpp",".pdf",".csv",".txt",".md",".docx"],
        label: "All supported types"
    }
};

const MAX_FILE_SIZE_MB = 50;

/**
 * Well-known mime constraint presets for common contexts.
 * Callers can pass these directly as mimeConstraints prop.
 */
export const MIME_PRESETS = {
    // WhatsApp Cloud API only allows JPG and PNG for template headers
    whatsapp_image: ["image/jpeg", "image/png"],
    // WhatsApp media including documents and video
    whatsapp_media: ["image/jpeg", "image/png", "video/mp4", "video/3gpp", "application/pdf"],
    // General images including webp
    general_image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
    // Videos only
    video_only: ["video/mp4", "video/webm", "video/3gpp"],
};

function validateFileClient(file, allowedTypes, mimeConstraints) {
    const ext = ("." + file.name.split(".").pop()).toLowerCase();
    const typeConf = ALLOWED_TYPES[allowedTypes] || ALLOWED_TYPES.all;
    if (!typeConf.mime.includes(file.type) && !typeConf.ext.includes(ext)) {
        return `Invalid file type. Allowed: ${typeConf.label}`;
    }
    // Apply additional mime constraints if provided
    if (mimeConstraints && mimeConstraints.length > 0 && !mimeConstraints.includes(file.type)) {
        const labels = mimeConstraints.map(m => m.split("/")[1].toUpperCase()).join(", ");
        return `This context only accepts: ${labels}`;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return `File too large. Max ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
}

const TABS = [
    { id: "all",      label: "All",       icon: FolderOpen, apiParam: null },
    { id: "image",    label: "Photos",    icon: ImageIcon,  apiParam: "image" },
    { id: "video",    label: "Videos",    icon: Film,       apiParam: "video" },
    { id: "document", label: "Documents", icon: FileText,   apiParam: "document" },
];

function FileThumbnail({ file, selected, onClick, disabled, disabledReason }) {
    const [imgError, setImgError] = useState(false);
    const vid = isVideo(file.mimeType, file.url);
    const doc = isDocument(file.mimeType);

    return (
        <div
            onClick={disabled ? undefined : onClick}
            title={disabled ? disabledReason : file.fileName}
            className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-150 select-none
                ${disabled
                    ? "border-slate-200 dark:border-white/5 cursor-not-allowed opacity-40 grayscale"
                    : `cursor-pointer ${selected ? "border-primary shadow-lg shadow-primary/25 ring-2 ring-primary/30" : "border-transparent hover:border-primary/40 hover:shadow-md"}`
                }
                bg-white dark:bg-surface-dark cursor-pointer`}
        >
            <div className="aspect-square bg-slate-100 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                {vid ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/80 gap-1">
                        <Film className="w-7 h-7 text-white/70" />
                        <span className="text-[9px] text-white/50 font-medium">VIDEO</span>
                    </div>
                ) : doc ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 gap-1">
                        <File className="w-7 h-7 text-slate-400" />
                        <span className="text-[9px] text-slate-500 font-medium uppercase">{(file.mimeType || "").split("/").pop()?.slice(0,4)}</span>
                    </div>
                ) : !imgError ? (
                    <img src={file.url} alt={file.fileName} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={() => setImgError(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                )}
            </div>
            {/* Selection circle — only for non-disabled */}
            {!disabled && (
                <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${selected ? "bg-primary border-primary scale-110" : "border-white/80 bg-black/20 group-hover:bg-black/30"}`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                </div>
            )}
            {/* "Not supported" badge for disabled files */}
            {disabled && (
                <div className="absolute inset-0 flex items-end justify-center pb-1 pointer-events-none">
                    <span className="text-[8px] font-bold bg-slate-800/80 text-white/80 rounded px-1.5 py-0.5 uppercase tracking-wide">
                        Not supported
                    </span>
                </div>
            )}
            {/* Hover zoom — only for non-disabled */}
            {!disabled && (
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <ZoomIn className="w-5 h-5 text-white/80" />
                </div>
            )}
            <div className="p-1.5 border-t border-slate-100 dark:border-white/5">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={file.fileName}>{file.fileName || "Unnamed"}</p>
                <span className="text-[9px] font-medium text-slate-400">{formatBytes(file.sizeBytes)}</span>
            </div>
        </div>
    );
}

export default function MediaPickerModal({
    isOpen,
    onClose,
    onSelect,
    accessMode = "dashboard",
    allowedTypes = "all",
    multiple = false,
    maxSelect = 10,
    title = "Pick from Media Manager",
    /**
     * mimeConstraints — optional array of MIME types allowed for selection in this context.
     * Files not matching will appear greyed-out with "Not supported" label.
     * Also restricts the upload input to these types.
     * Example: ["image/jpeg", "image/png"] for WhatsApp templates.
     */
    mimeConstraints = null,
    returnType = "url"
}) {
    const { user } = useAuth();
    const { showToast } = useUI();
    const token = user?.token || localStorage.getItem("token");
    const getHeaders = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);
    const fetchSource = accessMode === "restricted" ? "restricted" : "general_media";

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [viewMode, setViewMode] = useState("grid");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [tabCache, setTabCache] = useState({}); // Stores page 1 data for each tab

    const [usage, setUsage] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const uploadInputRef = useRef(null);

    const visibleTabs = allowedTypes === "all" ? TABS : TABS.filter(t => t.id === "all" || t.id === allowedTypes);

    // Determine if a file is compatible with the current mimeConstraints
    const isFileCompatible = useCallback((file) => {
        if (!mimeConstraints || mimeConstraints.length === 0) return true;
        return mimeConstraints.includes(file.mimeType);
    }, [mimeConstraints]);

    // Human-readable label for the constraint hint
    const constraintLabel = mimeConstraints
        ? mimeConstraints.map(m => {
            const sub = m.split("/")[1];
            const labels = { jpeg: "JPG", png: "PNG", webp: "WebP", gif: "GIF", "svg+xml": "SVG", mp4: "MP4", webm: "WebM", "3gpp": "3GP", pdf: "PDF", csv: "CSV", plain: "TXT", markdown: "MD", "vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX" };
            return labels[sub] || sub.toUpperCase();
        }).join(", ")
        : null;

    const fetchFiles = useCallback(async (p = 1, tab = activeTab, forceRefresh = false) => {
        // Use cache for page 1 if available and not forcing refresh
        if (p === 1 && !forceRefresh && tabCache[tab]) {
            setFiles(tabCache[tab].files);
            setTotalPages(tabCache[tab].totalPages);
            setPage(1);
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: 48, source: fetchSource });
            const currentTab = TABS.find(t => t.id === tab);
            if (currentTab?.apiParam) params.append("mediaType", currentTab.apiParam);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/media?${params}`, { headers: getHeaders() });
            
            const fetchedFiles = res.data.files || [];
            const fetchedTotalPages = res.data.totalPages || 1;
            
            setFiles(fetchedFiles);
            setTotalPages(fetchedTotalPages);
            setPage(p);

            // Save to cache if it's page 1
            if (p === 1) {
                setTabCache(prev => ({
                    ...prev,
                    [tab]: { files: fetchedFiles, totalPages: fetchedTotalPages }
                }));
            }
        } catch (e) {
            console.error("Media fetch error:", e.response?.data || e.message);
        } finally {
            setLoading(false);
        }
    }, [fetchSource, getHeaders, activeTab, tabCache]);

    const fetchUsage = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/media/usage`, { headers: getHeaders() });
            setUsage(res.data);
        } catch { /* silent */ }
    }, [getHeaders]);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedIds([]);
        setSearchTerm("");
        setActiveTab("all");
        setUploadError(null);
        setPage(1);
        setTabCache({}); // Clear cache on fresh open
        fetchFiles(1, "all", true); // Force fetch on fresh open
        fetchUsage();
    }, [isOpen]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSelectedIds([]);
        setPage(1);
        fetchFiles(1, tabId);
    };

    const toggleSelect = (id) => {
        if (multiple) {
            setSelectedIds(prev => {
                if (prev.includes(id)) return prev.filter(s => s !== id);
                if (prev.length >= maxSelect) { showToast(`You can select at most ${maxSelect} files.`, "error"); return prev; }
                return [...prev, id];
            });
        } else {
            setSelectedIds(prev => prev.includes(id) ? [] : [id]);
        }
    };

    const handleConfirm = () => {
        if (selectedIds.length === 0) { showToast("Please select at least one file.", "error"); return; }
        const selectedFiles = files.filter(f => selectedIds.includes(f.id));
        
        if (returnType === "object") {
            if (multiple) { onSelect(selectedFiles); } else { onSelect(selectedFiles[0]); }
        } else {
            const urls = selectedFiles.map(f => f.url);
            if (multiple) { onSelect(urls); } else { onSelect(urls[0]); }
        }
        onClose();
    };

    const handleUpload = async (fileObj) => {
        if (!fileObj) return;
        setUploadError(null);
        const validationErr = validateFileClient(fileObj, allowedTypes, mimeConstraints);
        if (validationErr) { setUploadError(validationErr); return; }
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", fileObj);
            const uploadUrl = `${import.meta.env.VITE_API_URL}/api/media/upload?source=${fetchSource}`;
            await axios.post(uploadUrl, form, { headers: { ...getHeaders(), "Content-Type": "multipart/form-data" } });
            showToast("File uploaded successfully!", "success");
            setTabCache({}); // Invalidate cache after upload
            await Promise.all([fetchFiles(1, activeTab, true), fetchUsage()]);
        } catch (e) {
            setUploadError(e.response?.data?.error || "Upload failed");
        } finally {
            setUploading(false);
            if (uploadInputRef.current) uploadInputRef.current.value = "";
        }
    };

    const filteredFiles = files.filter(f => !searchTerm || (f.fileName || "").toLowerCase().includes(searchTerm.toLowerCase()));

    // Narrow the accept string to the mime intersection when constraints are active
    const baseAcceptMimes = (ALLOWED_TYPES[allowedTypes] || ALLOWED_TYPES.all).mime;
    const acceptMimes = mimeConstraints
        ? baseAcceptMimes.filter(m => mimeConstraints.includes(m))
        : baseAcceptMimes;
    const acceptStr = acceptMimes.length > 0 ? acceptMimes.join(",") : baseAcceptMimes.join(",");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10 cursor-pointer" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{title}</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {accessMode === "restricted" ? "vCard & Online Store media" : "Your media library"}
                                {" · "}{multiple ? `Select up to ${maxSelect}` : "Select one to use"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Constraint hint badge */}
                        {constraintLabel && (
                            <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                                <Info className="w-3 h-3 flex-shrink-0" />
                                <span className="font-medium">Only {constraintLabel}</span>
                            </div>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Constraint hint for mobile */}
                {constraintLabel && (
                    <div className="sm:hidden flex items-center gap-1.5 mx-4 mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 flex-shrink-0">
                        <Info className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium">This context only accepts: {constraintLabel}</span>
                    </div>
                )}

                {/* Type Tabs */}
                <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-slate-100 dark:border-white/10 overflow-x-auto flex-shrink-0">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${activeTab === tab.id ? "border-primary text-primary bg-primary/5 dark:bg-primary/10" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"}`}>
                                <Icon className="w-3.5 h-3.5" />{tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="text" placeholder="Search by filename..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                        <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white dark:bg-white/10 shadow text-primary" : "text-slate-400 hover:text-slate-600"}`} title="Grid view"><Grid3X3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white dark:bg-white/10 shadow text-primary" : "text-slate-400 hover:text-slate-600"}`} title="List view"><List className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => { setUploadError(null); setTabCache({}); fetchFiles(page, activeTab, true); fetchUsage(); }} className="p-2 text-slate-400 hover:text-primary bg-slate-100 dark:bg-white/5 rounded-lg transition-colors" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>

                {/* Storage info (restricted mode) */}
                {usage && accessMode === "restricted" && !usage.unlimited && (
                    <div className="mx-4 mb-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-xs flex-shrink-0">
                        <HardDrive className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-amber-700 dark:text-amber-400">Plan Storage: <strong>{formatBytes(usage.restrictedBytes)}</strong> / {usage.limitMb} MB used</span>
                        {usage.percentage >= 80 && <span className="ml-auto text-amber-600 font-medium">&#9888; {usage.percentage.toFixed(0)}% full</span>}
                    </div>
                )}

                {/* Upload area */}
                <div className="px-4 pb-2 flex-shrink-0">
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
                        onClick={() => !uploading && uploadInputRef.current?.click()}
                        className={`cursor-pointer border-2 border-dashed rounded-xl py-3 px-4 flex items-center gap-3 transition-all duration-150 ${dragOver ? "border-primary bg-primary/5" : "border-slate-200 dark:border-white/10 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/5"} ${uploading ? "opacity-60 cursor-not-allowed" : ""} cursor-pointer`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${dragOver ? "bg-primary text-white" : uploading ? "bg-primary/20 text-primary" : "bg-slate-100 dark:bg-white/10 text-slate-400"}`}>
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{uploading ? "Uploading..." : dragOver ? "Drop to upload" : "Upload new file"}</p>
                            <p className="text-xs text-slate-400 truncate">
                                {constraintLabel ? `Accepted: ${constraintLabel}` : (ALLOWED_TYPES[allowedTypes] || ALLOWED_TYPES.all).label}
                                {" · Max "}{MAX_FILE_SIZE_MB} MB
                            </p>
                        </div>
                        <input ref={uploadInputRef} type="file" accept={acceptStr} className="hidden" onChange={e => { if (e.target.files[0]) handleUpload(e.target.files[0]); }} disabled={uploading} />
                    </div>
                    {uploadError && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{uploadError}
                        </div>
                    )}
                </div>

                {/* Files grid / list */}
                <div className="flex-1 overflow-y-auto px-4 pb-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
                            <ImageIcon className="w-12 h-12 opacity-20" />
                            <p className="font-medium text-sm">No files found</p>
                            <p className="text-xs text-center max-w-xs">Upload a file above or switch tabs to find what you need.</p>
                        </div>
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {filteredFiles.map(file => {
                                const compatible = isFileCompatible(file);
                                return (
                                    <FileThumbnail
                                        key={file.id}
                                        file={file}
                                        selected={selectedIds.includes(file.id)}
                                        onClick={() => toggleSelect(file.id)}
                                        disabled={!compatible}
                                        disabledReason={!compatible ? `Not supported here. Only ${constraintLabel} accepted.` : undefined}
                                        className="cursor-pointer" />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left w-8"></th>
                                        <th className="px-3 py-2.5 text-left">File</th>
                                        <th className="px-3 py-2.5 text-left hidden sm:table-cell">Type</th>
                                        <th className="px-3 py-2.5 text-left hidden md:table-cell">Size</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                 {filteredFiles.map(file => {
                                        const compatible = isFileCompatible(file);
                                        const sel = selectedIds.includes(file.id);
                                        return (
                                            <tr
                                                key={file.id}
                                                onClick={compatible ? () => toggleSelect(file.id) : undefined}
                                                title={!compatible ? `Not supported here. Only ${constraintLabel} accepted.` : undefined}
                                                className={`transition-colors
                                                    ${compatible
                                                        ? `cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${sel ? "bg-primary/5" : ""}`
                                                        : "opacity-40 grayscale cursor-not-allowed"
                                                    } cursor-pointer`}
                                            >
                                                <td className="px-3 py-2.5">
                                                    {compatible ? (
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${sel ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-600"}`}>
                                                            {sel && <Check className="w-2.5 h-2.5 text-white" />}
                                                        </div>
                                                    ) : (
                                                        <Ban className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center">
                                                            {isVideo(file.mimeType, file.url) ? <Film className="w-4 h-4 text-slate-400" /> : isDocument(file.mimeType) ? <File className="w-4 h-4 text-slate-400" /> : <img src={file.url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />}
                                                        </div>
                                                        <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[160px]">{file.fileName || "Unnamed"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 hidden sm:table-cell">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-medium capitalize">{file.mediaType || "other"}</span>
                                                </td>
                                                <td className="px-3 py-2.5 hidden md:table-cell text-slate-400">{formatBytes(file.sizeBytes)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex justify-center gap-1.5 mt-3 pb-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => fetchFiles(p, activeTab)}
                                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-primary text-white" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200"}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer confirm bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 flex-shrink-0">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedIds.length === 0 ? "Click a file to select it, then confirm below" : multiple ? `${selectedIds.length} file${selectedIds.length !== 1 ? "s" : ""} selected` : "1 file selected \u2014 ready to use"}
                    </p>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">Cancel</button>
                        <button onClick={handleConfirm} disabled={selectedIds.length === 0}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${selectedIds.length > 0 ? "bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/30" : "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed"}`}>
                            <Check className="w-3.5 h-3.5" />
                            Use Selected{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
