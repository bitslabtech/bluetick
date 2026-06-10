import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Sparkles, AlertCircle, ChevronLeft, ChevronRight, User, Settings, Zap, MessageSquare, Loader2, X, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';
import { useUI } from '../context/UIContext';

const AdminAITokenUsers = () => {
    const { user } = useAuth();
    const { formatDate, showToast } = useUI();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Global Tokens State
    const [globalTokens, setGlobalTokens] = useState({ ai_chatbot: 1, ai_form_generator: 1, ai_chat_drafter: 1, ai_chat_enhancer: 1, ai_template_draft: 1, ai_meta_ads_builder: 5, ai_media_generator: 5 });
    const [savingTokens, setSavingTokens] = useState(false);
    const [isTokenSettingsModalOpen, setIsTokenSettingsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSearch, setTempSearch] = useState(''); // debounced search
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const limit = 20;

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setSearchTerm(tempSearch);
            setPage(1); // reset page on search
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [tempSearch]);

    useEffect(() => {
        if (!user?.isAdmin) return;
        const fetchTokens = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/ai-tokens`, {
                    params: {
                        search: searchTerm,
                        page,
                        limit,
                        sortBy: 'totalTokens',
                        sortDir: 'DESC'
                    }
                });
                setUsers(res.data.users || []);
                setTotalPages(res.data.pagination.totalPages || 1);
                setTotalUsers(res.data.pagination.totalUsers || 0);
            } catch (err) {
                console.error("Error fetching AI token users:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTokens();
        fetchTokenSettings();
    }, [user, page, searchTerm]);

    const fetchTokenSettings = async () => {
        try {
            const res = await axios.get('/api/system');
            if (res.data?.settings?.aiTokenMultipliers) {
                setGlobalTokens(res.data.settings.aiTokenMultipliers);
            }
        } catch (err) {
            console.error('Failed to load token settings', err);
        }
    };

    const handleSaveTokenSettings = async () => {
        setSavingTokens(true);
        try {
            await axios.put('/api/system/settings', {
                settings: { aiTokenMultipliers: globalTokens }
            });
            showToast({ type: 'success', title: 'Saved', message: 'Global token settings updated globally.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to update settings.' });
        } finally {
            setSavingTokens(false);
        }
    };

    if (!user?.isAdmin) return <Navigate to="/" />;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark overflow-y-auto fade-in transition-colors duration-300 font-sans">
            <AdminHeader>
                <ThemeToggle />
            </AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-7 sm:pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-purple-500" />
                            AI Token Analytics
                        </h1>
                        <p className="text-slate-500 dark:text-text-secondary mt-1">
                            Tracking top token consumers and remaining balances across the platform.
                        </p>
                    </div>
                    <div>
                        <button
                            onClick={() => setIsTokenSettingsModalOpen(true)}
                            className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#0088cc] text-white font-bold rounded-xl hover:bg-[#0077b3] transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5"
                        >
                            <Settings className="w-5 h-5 shrink-0" />
                            Token Settings
                        </button>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search user or email..."
                                value={tempSearch}
                                onChange={e => setTempSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            {totalUsers} Total Consumers
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-white/5 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-text-secondary">
                                <tr>
                                    <th className="px-4 md:px-6 py-4">User</th>
                                    <th className="px-4 md:px-6 py-4">Plan / Company</th>
                                    <th className="px-4 md:px-6 py-4 text-right">Burned Tokens</th>
                                    <th className="px-4 md:px-6 py-4 text-right">Current Balance</th>
                                    <th className="px-4 md:px-6 py-4">Last Activity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-4 md:p-8 text-center text-slate-500">Loading token data...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-4 md:p-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                                <p>No token consumers found matching strict exact records.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u, i) => (
                                        <tr key={u.userId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-4 md:px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                                        <User className="w-5 h-5"/>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white text-[15px]">{u.User?.name || 'Unknown User'}</div>
                                                        <div className="text-slate-500 text-xs mt-0.5">{u.User?.email || 'No email associated'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 md:px-6 py-4">
                                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                                    {u.User?.plan || 'Free'}
                                                </div>
                                                <div className="text-slate-500 text-xs mt-0.5">
                                                    {u.User?.company || '-'}
                                                </div>
                                            </td>

                                            <td className="px-4 md:px-6 py-4 text-right">
                                                <span className="font-bold text-slate-900 dark:text-white text-base">
                                                    {new Intl.NumberFormat().format(u.totalTokens)}
                                                </span>
                                            </td>

                                            <td className="px-4 md:px-6 py-4 text-right">
                                                <span className={`font-bold text-base ${(parseInt(u.User?.aiTokenBalance || 0) <= 1000) ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {new Intl.NumberFormat().format(u.User?.aiTokenBalance || 0)}
                                                </span>
                                            </td>

                                            <td className="px-4 md:px-6 py-4 text-slate-600 dark:text-slate-300">
                                                {u.lastActivity ? formatDate(u.lastActivity) : 'Unknown'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                Showing page {page} of {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {isTokenSettingsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-white/10 relative">
                        <button onClick={() => setIsTokenSettingsModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white z-20">
                            <X className="w-5 h-5" />
                        </button>
                        <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5">
                            <Zap className="w-48 h-48" />
                        </div>
                        <div className="p-4 md:p-8 relative z-10 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-lg">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Global Token Configuration</h2>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Configure token multipliers globally across all users sequentially.</p>
                        </div>
                        <div className="p-4 md:p-8 space-y-8 bg-slate-50/50 dark:bg-transparent relative z-10 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Chatbot Setting */}
                                <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 md:p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200">AI Chatbot Multiplier</h3>
                                            <p className="text-sm text-slate-500 mt-1">Multiplier applies to base token usage for AI replies.</p>
                                        </div>
                                        <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg">
                                            <MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">x</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            min="0"
                                            className="w-full pl-8 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pr-4 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={globalTokens.ai_chatbot}
                                            onChange={(e) => setGlobalTokens({ ...globalTokens, ai_chatbot: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                {/* Form Generator Setting */}
                                <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 md:p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200">AI Form Generator Multiplier</h3>
                                            <p className="text-sm text-slate-500 mt-1">Scales the base cost (10 tokens) for generating high quality forms.</p>
                                        </div>
                                        <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg">
                                            <Sparkles className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">x</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            min="0"
                                            className="w-full pl-8 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pr-4 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={globalTokens.ai_form_generator}
                                            onChange={(e) => setGlobalTokens({ ...globalTokens, ai_form_generator: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                {/* AI Chat Drafter Setting */}
                                <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 md:p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200">AI Chat Drafter Multiplier</h3>
                                            <p className="text-sm text-slate-500 mt-1">Scales the base cost (10 tokens) for drafting context-aware chat replies.</p>
                                        </div>
                                        <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg">
                                            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">x</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            min="0"
                                            className="w-full pl-8 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pr-4 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={globalTokens.ai_chat_drafter}
                                            onChange={(e) => setGlobalTokens({ ...globalTokens, ai_chat_drafter: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                {/* AI Chat Enhancer Setting */}
                                <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 md:p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200">AI Chat Enhancer Multiplier</h3>
                                            <p className="text-sm text-slate-500 mt-1">Scales the base cost (5 tokens) for grammatically optimizing typed chat messages.</p>
                                        </div>
                                        <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg">
                                            <Sparkles className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">x</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            min="0"
                                            className="w-full pl-8 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pr-4 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={globalTokens.ai_chat_enhancer}
                                            onChange={(e) => setGlobalTokens({ ...globalTokens, ai_chat_enhancer: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                {/* AI Template Draft Setting */}
                                <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 md:p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200">AI Template Draft Multiplier</h3>
                                            <p className="text-sm text-slate-500 mt-1">Scales the base cost (10 tokens) for AI-generating a complete WhatsApp template via prompt.</p>
                                        </div>
                                        <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-lg">
                                            <Sparkles className="w-5 h-5 text-amber-500" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">x</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            min="0"
                                            className="w-full pl-8 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pr-4 font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                                            value={globalTokens.ai_template_draft ?? 1}
                                            onChange={(e) => setGlobalTokens({ ...globalTokens, ai_template_draft: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                {/* Meta Ads Builder Setting */}
                                <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 md:p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Meta Ads AI Builder Multiplier</h3>
                                            <p className="text-sm text-slate-500 mt-1">Scales the base costs for Meta Ads AI generation (Research: 20, Copy: 10, Image: 50). Default is 5x.</p>
                                        </div>
                                        <div className="p-2 bg-pink-100 dark:bg-pink-500/10 rounded-lg">
                                            <Sparkles className="w-5 h-5 text-pink-500" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">x</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            min="0"
                                            className="w-full pl-8 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pr-4 font-bold focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all outline-none"
                                            value={globalTokens.ai_meta_ads_builder ?? 5}
                                            onChange={(e) => setGlobalTokens({ ...globalTokens, ai_meta_ads_builder: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                {/* AI Media Generator Setting */}
                                <div className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 md:p-6 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Global AI Media Multiplier</h3>
                                            <p className="text-sm text-slate-500 mt-1">Scales the base cost (50 tokens) for generating images across the platform (Meta Ads, etc).</p>
                                        </div>
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                                            <Sparkles className="w-5 h-5 text-emerald-500" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">x</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            min="0"
                                            className="w-full pl-8 bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl py-3 pr-4 font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                            value={globalTokens.ai_media_generator ?? 5}
                                            onChange={(e) => setGlobalTokens({ ...globalTokens, ai_media_generator: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-surface-dark flex justify-end rounded-b-2xl">
                            <button 
                                onClick={handleSaveTokenSettings}
                                disabled={savingTokens}
                                className="px-4 md:px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {savingTokens ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />} Save Token Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAITokenUsers;
