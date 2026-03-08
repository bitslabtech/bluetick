import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserDropdown from '../components/UserDropdown';
import {
    Menu, Plus, Info, Search,
    Globe, LayoutTemplate, Image as ImageIcon, AlertTriangle, X, RefreshCw,
    Lock, Trash2, Zap
} from 'lucide-react';
import CreateTemplateModal from '../components/CreateTemplateModal';

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
                axios.get('http://localhost:5000/api/templates'),
                axios.get('http://localhost:5000/api/billing')
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

    const handleSyncTemplates = async () => {
        try {
            setSyncing(true);
            const res = await axios.post('http://localhost:5000/api/templates/sync');
            showToast({ type: 'success', title: 'Sync Complete', message: res.data.message });
            fetchTemplates();
        } catch (err) {
            console.error("Sync Error:", err);
            showToast({ type: 'error', title: 'Sync Failed', message: err.response?.data?.error || err.message });
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        if (location.state?.openCreateTemplate) {
            checkSettingsAndOpenModal();
            window.history.replaceState({}, document.title);
        }
    }, [location]);


    const checkSettingsAndOpenModal = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/settings', {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            const s = res.data;
            // Allow if: embedded onboarding connected (wabaId/metaBusinessAccountId)
            // OR manual keys configured (phoneNumberId + accessToken)
            const embeddedConfigured = !!(s?.metaBusinessAccountId);
            const manualConfigured = !!(s?.metaPhoneNumberId && s?.metaAccessToken);
            if (!embeddedConfigured && !manualConfigured) {
                setShowConfigError(true);
                return;
            }
            setShowCreateModal(true);
        } catch (err) {
            console.error("Error checking settings:", err);
            // On any error, block access and show config error
            setShowConfigError(true);
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
                    await axios.delete(`http://localhost:5000/api/templates/${id}`);
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
        const matchesStatus = filter === 'All' || t.status?.toLowerCase() === filter.toLowerCase();
        const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category?.toLowerCase().includes(searchQuery.toLowerCase());
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
            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300">
                <div className="flex items-center gap-6 w-full">
                    <button className="md:hidden text-slate-900 dark:text-white">
                        <Menu className="w-6 h-6" />
                    </button>

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
                    <ThemeToggle />
                    <NotificationBell />
                    <UserDropdown />
                </div>
            </header>

            {/* Content Actions */}
            <div className="flex-1 overflow-y-auto p-[46px] custom-scrollbar">
                <div className="w-full flex flex-col gap-8">

                    {/* Title & Add Button */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Message Templates</h1>
                            <p className="text-slate-500 dark:text-text-secondary mt-1">Manage and organize your message templates for WhatsApp Business API.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSyncTemplates}
                                disabled={syncing}
                                className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                            >
                                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                                Sync
                            </button>
                            <button
                                onClick={checkSettingsAndOpenModal}
                                className="bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Create New Template
                            </button>
                        </div>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-4 items-start">
                        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-blue-400 font-bold text-sm mb-1">Meta Approval Process Guidelines</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                All templates must be submitted to Meta for approval before they can be sent to customers. This process helps prevent spam and ensures high-quality messages. Approvals typically take a few minutes to 24 hours. {' '}
                                <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors" href="#">Read formatting guidelines</a>.
                            </p>
                        </div>
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
                                    Plan Limit: {templateLimit} of {templates.length} templates active
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                                    Your plan allows {templateLimit} template{templateLimit !== 1 ? 's' : ''}. The {templateLimit} oldest are active for campaigns. Upgrade to unlock more.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center p-20 text-text-secondary">
                            Loading templates...
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
                                                    <span className="text-xs font-bold text-slate-600 dark:text-text-secondary">Plan Limit Reached</span>
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
                                onClick={checkSettingsAndOpenModal}
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
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
                showToast={showToast}
            />

            {/* Config Error Modal */}
            {showConfigError && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-dark border border-red-500/20 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4 text-center items-center">
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
