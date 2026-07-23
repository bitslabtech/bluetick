import { useState, useEffect } from 'react';
import TrialBanner from '../components/TrialBanner';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserDropdown from '../components/UserDropdown';
import {
    Menu, Plus, Info, Search,
    Globe, LayoutTemplate, Image as ImageIcon, AlertTriangle, X, RefreshCw,
    Lock, Trash2, Zap, Sparkles, Send, ChevronDown
} from 'lucide-react';
import CreateTemplateModal from '../components/CreateTemplateModal';
import { io } from 'socket.io-client';


const Templates = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { showModal, showToast } = useUI();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [templateLimit, setTemplateLimit] = useState(-1);

    const [showConfigError, setShowConfigError] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showGuidelines, setShowGuidelines] = useState(false);

    // AI Draft States
    const [showAiDraftModal, setShowAiDraftModal] = useState(false);
    const [aiDraftPrompt, setAiDraftPrompt] = useState('');
    const [isDrafting, setIsDrafting] = useState(false);
    const [draftPayload, setDraftPayload] = useState(null);
    const [editTemplateData, setEditTemplateData] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const [newTemplate, setNewTemplate] = useState({
        name: '',
        category: 'MARKETING',
        language: 'en_US',
        content: ''
    });

    // Fetch Templates (sorted oldest first so first N = plan-active)
    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const [tmplRes, billingRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/templates`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/billing`)
            ]);
            // Sort oldest first so the first N are always the "active" ones
            const sorted = [...tmplRes.data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setTemplates(sorted);
            setTemplateLimit(billingRes.data?.usage?.templateLimit ?? -1);
        } catch (err) {
            console.error('Error fetching templates:', err);
        } finally {
            setLoading(false);
        }
    };

    // A template is locked if its position (0-based) >= plan limit
    const isLocked = (index) => templateLimit !== -1 && index >= templateLimit;

    const handleSyncTemplates = async (silent = false) => {
        try {
            setSyncing(true);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/templates/sync`);
            if (!silent) {
                showToast({ type: 'success', title: 'Sync Complete', message: res.data.message });
            }
            fetchTemplates();
        } catch (err) {
            console.error("Sync Error:", err);
            if (!silent) {
                showToast({ type: 'error', title: 'Sync Failed', message: err.response?.data?.error || err.message });
            }
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        handleSyncTemplates(true); // silent sync on page load
    }, []);

    // ── Real-time template status / category updates via socket ──────────────────
    useEffect(() => {
        const API_BASE = import.meta.env.VITE_API_URL || '';
        const socket = io(API_BASE, { withCredentials: true });

        socket.on('template_status_update', ({ id, status, category }) => {
            setTemplates(prev => prev.map(t => {
                if (t.id !== id) return t;
                const updated = { ...t, status };
                // If Meta reclassified this template, update category too
                if (category) updated.category = category;
                return updated;
            }));
        });

        return () => socket.disconnect();
    }, []);
    // ─────────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (location.state?.openCreateTemplate) {
            checkSettingsAndOpenModal(null, false);
            window.history.replaceState({}, document.title);
        }
    }, [location]);


    const checkSettingsAndOpenModal = async (draft = null, isEdit = false, templateData = null) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings`);
            const s = res.data;
            const embeddedConfigured = !!(s?.metaBusinessAccountId);
            const manualConfigured = !!(s?.metaPhoneNumberId && s?.metaAccessToken);
            if (!embeddedConfigured && !manualConfigured) {
                setShowConfigError(true);
                return;
            }
            if (draft) {
                setDraftPayload(draft);
            } else {
                setDraftPayload(null);
            }
            if (isEdit && templateData) {
                setEditTemplateData(templateData);
            } else {
                setEditTemplateData(null);
            }
            setShowCreateModal(true);
        } catch (err) {
            console.error("Error checking settings:", err);
            setShowConfigError(true);
        }
    };

    const handleAiDraftSubmit = async (e) => {
        e.preventDefault();
        if (!aiDraftPrompt.trim()) return;
        setIsDrafting(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/templates/draft-ai`, { prompt: aiDraftPrompt });
            showToast({ type: 'success', title: 'AI Draft Complete', message: `Template drafted successfully! Used ${res.data.tokensDeducted} Tokens.` });
            setShowAiDraftModal(false);
            setAiDraftPrompt('');
            // Fire confetti burst
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3500);
            // Open the builder modal and pass the generated payload
            checkSettingsAndOpenModal(res.data.draft);
        } catch (err) {
            console.error("AI Draft Error:", err);
            showToast({ type: 'error', title: 'AI Drafting Failed', message: err.response?.data?.error || 'Could not reach AI platform.' });
        } finally {
            setIsDrafting(false);
        }
    };

    const handleCreateSuccess = () => {
        setShowCreateModal(false);
        fetchTemplates();
    };

    const handleDeleteTemplate = async (id) => {
        showModal({
            type: 'warning',
            title: 'Delete Template',
            message: "Are you sure you want to delete this template?",
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL}/api/templates/${id}`);
                    fetchTemplates();
                    showToast({ type: 'success', title: 'Deleted', message: 'Template deleted successfully' });
                } catch (err) {
                    console.error("Error deleting template:", err);
                    showToast({ type: 'error', title: 'Error', message: 'Failed to delete template' });
                }
            }
        });
    };

    const filteredTemplates = templates.filter(t => {
        const matchesStatus = filter === 'All' || (t.status || '').toLowerCase() === filter.toLowerCase();
        const searchLower = (searchQuery || '').toLowerCase();
        const matchesSearch = (t.name || '').toLowerCase().includes(searchLower) ||
            (t.category || '').toLowerCase().includes(searchLower);
        return matchesStatus && matchesSearch;
    });

    const getStatusStyles = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-500/20 text-green-400 border-green-500/20';
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
            case 'REJECTED': return 'bg-red-500/20 text-red-400 border-red-500/20';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white font-display relative transition-colors duration-300">

            {/* Confetti Burst Animation */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
                    {Array.from({ length: 60 }).map((_, i) => {
                        const colors = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#f97316'];
                        const color = colors[i % colors.length];
                        const left = `${Math.random() * 100}%`;
                        const delay = `${Math.random() * 0.8}s`;
                        const duration = `${1.5 + Math.random() * 2}s`;
                        const size = `${6 + Math.random() * 8}px`;
                        const rotate = `${Math.random() * 720}deg`;
                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    left,
                                    top: '-20px',
                                    width: size,
                                    height: size,
                                    background: color,
                                    borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
                                    animation: `confettiFall ${duration} ${delay} ease-in forwards`,
                                    transform: `rotate(${rotate})`
                                }}
                            />
                        );
                    })}
                    <style>{`
                        @keyframes confettiFall {
                            0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
                            80% { opacity: 1; }
                            100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
                        }
                    `}</style>
                </div>
            )}
            {/* Header */}
            <header className="hidden md:flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-4 md:px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300">
                <div className="flex items-center gap-6 w-full">

                    {/* Search Bar */}
                    <div className="hidden md:flex items-center rounded-lg bg-slate-100 dark:bg-surface-dark h-10 w-full max-w-md px-3 border border-transparent focus-within:border-primary transition-colors">
                        <Search className="w-5 h-5 text-slate-400 dark:text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-secondary text-sm focus:outline-none ml-2"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <TrialBanner />
                    <ThemeToggle />
                    <NotificationBell />
                    <UserDropdown />
                </div>
            </header>

            {/* Content Actions */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
                <div className="w-full flex flex-col gap-8">

                    {/* Title & Add Button */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Message Templates</h1>
                            <p className="text-slate-500 dark:text-text-secondary mt-1">Manage and organize your message templates for WhatsApp Business API.</p>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={handleSyncTemplates}
                                disabled={syncing}
                                className="flex-1 sm:flex-none justify-center bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                                title="Sync Templates"
                            >
                                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${syncing ? 'animate-spin' : ''}`} />
                                <span className="sm:hidden">Sync</span>
                                <span className="hidden sm:inline">Sync</span>
                            </button>
                            <button
                                onClick={() => setShowAiDraftModal(true)}
                                className="flex-1 sm:flex-none justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-95 relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-100" />
                                <span className="hidden sm:inline">Create with AI</span>
                                <span className="sm:hidden">Create with AI</span>
                            </button>
                            <button
                                onClick={() => checkSettingsAndOpenModal(null)}
                                className="flex-1 sm:flex-none justify-center bg-primary hover:bg-blue-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-primary/20 active:scale-95"
                            >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">New Template</span>
                                <span className="sm:hidden">Create</span>
                            </button>
                        </div>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl overflow-hidden transition-all duration-300">
                        <button 
                            onClick={() => setShowGuidelines(!showGuidelines)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-500/5 transition-colors focus:outline-none"
                        >
                            <div className="flex items-center gap-3">
                                <Info className="w-5 h-5 text-blue-400 shrink-0" />
                                <h3 className="text-blue-400 font-bold text-sm">Meta Approval Process Guidelines</h3>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform duration-300 ${showGuidelines ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showGuidelines && (
                            <div className="px-4 pb-4 pt-0 pl-12 animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-slate-600 dark:text-text-secondary text-sm leading-relaxed">
                                    All templates must be submitted to Meta for approval before they can be sent to customers. This process helps prevent spam and ensures high-quality messages. Approvals typically take a few minutes to 24 hours. {' '}
                                    <a className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline underline-offset-2 transition-colors" href="#">Read formatting guidelines</a>.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-surface-dark p-2 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm transition-colors duration-300">
                        <div className="flex gap-1 bg-slate-100 dark:bg-background-dark p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                            {['All', 'Approved', 'Pending', 'Rejected'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${filter === status ? 'bg-white dark:bg-surface-dark text-primary dark:text-white shadow-sm border border-slate-200 dark:border-white/10' : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-text-secondary w-4 h-4" />
                            <input
                                className="w-full bg-slate-100 dark:bg-background-dark border-none text-slate-900 dark:text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-1 focus:ring-primary placeholder:text-slate-500 dark:placeholder:text-gray-600 outline-none transition-all"
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                type="text"
                            />
                        </div>
                    </div>

                    {/* Plan limit warning banner */}
                    {templateLimit !== -1 && templates.length > templateLimit && (
                        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/50 rounded-xl px-5 py-4">
                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                    Total Template Limit: {templateLimit} of {templates.length} templates active
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                                    Your plan allows {templateLimit} template{templateLimit !== 1 ? 's' : ''}. The {templateLimit} oldest are active for campaigns. Upgrade to unlock more.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 flex flex-col shadow-sm">
                                    <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-start bg-slate-50/50 dark:bg-transparent">
                                        <div className="flex-1 w-full space-y-2">
                                            <div className="h-5 bg-slate-200 dark:bg-white/10 rounded w-1/2 animate-pulse"></div>
                                            <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-1/3 animate-pulse"></div>
                                        </div>
                                        <div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded-full animate-pulse ml-4"></div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col space-y-3">
                                        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-20 animate-pulse mb-2"></div>
                                        <div className="bg-slate-100 dark:bg-background-dark p-4 rounded-lg border border-slate-200 dark:border-white/5 space-y-2 flex-1 min-h-[120px]">
                                            <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-full animate-pulse"></div>
                                            <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-5/6 animate-pulse"></div>
                                            <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-4/6 animate-pulse"></div>
                                        </div>
                                    </div>
                                    <div className="px-5 pb-5 flex gap-2">
                                        <div className="h-7 bg-slate-200 dark:bg-white/10 rounded-full w-16 animate-pulse"></div>
                                        <div className="h-7 bg-slate-200 dark:bg-white/10 rounded-full w-16 animate-pulse"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                            {filteredTemplates.map((template) => {
                                // Find original sort index (before filtering)
                                const originalIndex = templates.findIndex(t => t.id === template.id);
                                const locked = isLocked(originalIndex);
                                return (
                                    <div key={template.id} className={`relative bg-white dark:bg-surface-dark rounded-xl border overflow-hidden group transition-all flex flex-col shadow-sm duration-300 ${locked
                                        ? 'border-slate-200 dark:border-white/5 opacity-70'
                                        : 'border-slate-200 dark:border-white/5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'
                                        }`}>
                                        {/* Lock overlay */}
                                        {locked && (
                                            <div className="absolute inset-0 z-10 bg-slate-100/70 dark:bg-background-dark/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 rounded-xl">
                                                <div className="flex items-center gap-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-full px-4 py-2 shadow-lg">
                                                    <Lock className="w-4 h-4 text-slate-500" />
                                                    <span className="text-xs font-bold text-slate-600 dark:text-text-secondary">Total Template Limit Reached</span>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/billing')}
                                                    className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-primary/30 hover:bg-blue-600 transition-colors active:scale-95"
                                                >
                                                    <Zap className="w-3.5 h-3.5" /> Upgrade Plan
                                                </button>
                                            </div>
                                        )}

                                        {/* Header */}
                                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-start bg-slate-50/50 dark:bg-transparent">
                                            <div className="flex-1 min-w-0 pr-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-slate-900 dark:text-white font-bold text-base truncate">{template.name}</h3>
                                                    {!locked && (
                                                        <span className="flex-shrink-0 text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-text-secondary truncate font-mono tracking-wider opacity-60">ID: {template.id.slice(0, 8)}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${getStatusStyles(template.status)}`}>
                                                {template.status}
                                            </span>
                                        </div>

                                        {/* Body */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <p className="text-xs font-medium text-slate-400 dark:text-text-secondary mb-2 uppercase tracking-wider">Preview</p>
                                            <div className="bg-slate-100 dark:bg-background-dark p-3 rounded-lg border border-slate-200 dark:border-white/5 relative flex-1">
                                                {template.type === 'IMAGE' && (
                                                    <div className="w-full h-12 bg-white dark:bg-surface-dark rounded mb-2 flex items-center justify-center text-xs text-slate-400 dark:text-text-secondary gap-1 border border-slate-200 dark:border-white/5">
                                                        <ImageIcon className="w-4 h-4" /> Header Image
                                                    </div>
                                                )}
                                                <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed font-normal whitespace-pre-wrap">
                                                    {template.content}
                                                </p>
                                            </div>

                                            <div className="mt-4 flex gap-4 text-xs text-slate-500 dark:text-text-secondary">
                                                <div className="flex items-center gap-1.5">
                                                    <Globe className="w-3.5 h-3.5" /> {template.language}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <LayoutTemplate className="w-3.5 h-3.5" /> {template.category}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="p-4 bg-slate-50 dark:bg-background-dark/50 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-slate-500 dark:text-text-secondary">
                                            <span className="text-[10px]">Created: {new Date(template.createdAt).toLocaleDateString()}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => checkSettingsAndOpenModal(null, true, template)}
                                                    className="hover:text-blue-500 dark:hover:text-blue-400 p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-surface-dark transition-colors"
                                                    title="Edit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(template.id)}
                                                    className="hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-surface-dark transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Create New Card */}
                            <button
                                onClick={() => checkSettingsAndOpenModal(null)}
                                className="bg-slate-100/50 dark:bg-surface-dark/30 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-primary hover:bg-slate-50 dark:hover:bg-surface-dark transition-all flex flex-col items-center justify-center gap-4 group min-h-[300px] cursor-pointer"
                            >
                                <div className="size-16 rounded-full bg-white dark:bg-background-dark flex items-center justify-center group-hover:scale-110 transition-transform border border-slate-200 dark:border-white/10 shadow-sm">
                                    <Plus className="w-8 h-8 text-primary" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-slate-900 dark:text-white font-bold text-lg">Create New</h3>
                                    <p className="text-slate-500 dark:text-text-secondary text-sm mt-1">Start from scratch</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modern Create Template Modal */}
            <CreateTemplateModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setEditTemplateData(null); }}
                onSuccess={handleCreateSuccess}
                showToast={showToast}
                initialDraft={draftPayload}
                editTemplateData={editTemplateData}
            />

            {/* AI Drafting Prompt Modal */}
            {showAiDraftModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden relative">
                        {isDrafting && (
                            <div className="absolute inset-0 z-10 bg-white/80 dark:bg-surface-dark/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                                <div className="relative">
                                    <div className="size-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(139,92,246,0.4)] max-w-full">
                                        <Sparkles className="w-8 h-8 text-white animate-spin-slow" />
                                    </div>
                                    {/* Orbital rings */}
                                    <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-[spin_3s_linear_infinite]"></div>
                                    <div className="absolute -inset-2 rounded-full border-2 border-purple-400/20 border-b-purple-400 animate-[spin_4s_linear_infinite_reverse]"></div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
                                        Architecting your Template
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-text-secondary max-w-[250px] max-w-full mx-auto mt-1">
                                        Deploying Gemini to structure the perfect variables and JSON...
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-500" /> Draft Template with AI
                            </h3>
                            <button onClick={() => setShowAiDraftModal(false)} className="p-2 -mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAiDraftSubmit} className="p-4 md:p-6">
                            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                                Describe your message
                            </label>
                            <textarea
                                value={aiDraftPrompt}
                                onChange={(e) => setAiDraftPrompt(e.target.value)}
                                placeholder="I need a welcome template with a 50% discount code and a button that goes to my shop URL..."
                                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all h-32"
                                autoFocus
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAiDraftModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={!aiDraftPrompt.trim()} className="px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2 active:scale-95">
                                    <Send className="w-4 h-4" /> Generate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Config Error Modal */}
            {showConfigError && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-dark border border-red-500/20 rounded-2xl w-full max-w-md shadow-2xl p-4 md:p-6 flex flex-col gap-4 text-center items-center">
                        <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-2">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Configuration Missing</h3>
                        <p className="text-text-secondary text-sm">
                            You must configure your WhatsApp before you can create message templates.
                        </p>
                        <div className="flex gap-3 w-full mt-2">
                            <button
                                onClick={() => setShowConfigError(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => navigate('/settings', { state: { initialTab: 'whatsapp_gateway' } })}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                            >
                                Configure Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Templates;
