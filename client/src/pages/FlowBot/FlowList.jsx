import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Workflow, Clock, Zap, Search } from 'lucide-react';
import TopHeader from '../../components/TopHeader';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const FlowList = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        loadFlows();
    }, []);

    const loadFlows = async () => {
        try {
            const res = await axios.get(`${API}/api/flows`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFlows(res.data);
        } catch (err) {
            toast.error('Failed to load flows');
        } finally {
            setLoading(false);
        }
    };

    const toggleFlowStatus = async (flow) => {
        try {
            await axios.put(`${API}/api/flows/${flow.id}`, {
                isActive: !flow.isActive
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(flow.isActive ? 'Flow deactivated' : 'Flow activated! 🚀');
            loadFlows();
        } catch (err) {
            toast.error('Failed to update flow');
        }
    };

    const deleteFlow = async (flowId) => {
        try {
            await axios.delete(`${API}/api/flows/${flowId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Flow deleted');
            setDeleteConfirm(null);
            loadFlows();
        } catch (err) {
            toast.error('Failed to delete flow');
        }
    };

    const filteredFlows = flows.filter(f => 
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.triggerKeyword || '').toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300">
            <TopHeader />
            <div className="flex-1 overflow-y-auto w-full hide-scrollbar relative pb-7 sm:pb-20">
                {/* Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-10">
                    <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <Workflow className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">FlowBot Builder</h1>
                                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Build visual WhatsApp automation flows</p>
                            </div>
                        </div>
                        {/* Mobile Only Quick Create Button */}
                        <button
                            onClick={() => navigate('/flowbot/create')}
                            className="sm:hidden px-3.5 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Create
                        </button>
                    </div>
                    {/* Desktop Create Button */}
                    <button
                        onClick={() => navigate('/flowbot/create')}
                        className="hidden sm:flex px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30 items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create New Flow
                    </button>
                </div>
            </div>

            {/* Content */}
            <div>
                <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search flows by name or keyword..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                    ) : filteredFlows.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <Workflow className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {search ? 'No matching flows' : 'No flows yet'}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                                {search 
                                    ? 'Try a different search term.' 
                                    : 'Create your first visual automation flow to engage customers on WhatsApp.'
                                }
                            </p>
                            {!search && (
                                <button
                                    onClick={() => navigate('/flowbot/create')}
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create First Flow
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Flow Cards Grid */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredFlows.map((flow) => (
                                <div
                                    key={flow.id}
                                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                                >
                                    {/* Card Header */}
                                    <div className="p-4 pb-3">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-800 dark:text-white truncate">{flow.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        flow.isActive
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${flow.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {flow.isActive ? 'Live' : 'Draft'}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Premium CSS Toggle */}
                                            <button
                                                onClick={() => toggleFlowStatus(flow)}
                                                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                                                    flow.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                                role="switch"
                                                aria-checked={flow.isActive}
                                                title={flow.isActive ? 'Deactivate Flow' : 'Activate Flow'}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${
                                                        flow.isActive ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Flow Details */}
                                        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-3.5 h-3.5" />
                                                <span>
                                                    Trigger: {flow.isAny 
                                                        ? <span className="text-amber-600 dark:text-amber-400 font-medium">Any Message</span>
                                                        : <span className="text-indigo-600 dark:text-indigo-400 font-medium">"{flow.triggerKeyword || 'Not set'}"</span>
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Workflow className="w-3.5 h-3.5" />
                                                <span>{flow.nodes?.length || 0} nodes · {flow.edges?.length || 0} connections</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>Modified {formatDate(flow.updatedAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Actions */}
                                    <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap sm:flex-nowrap items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/flowbot/edit/${flow.id}`)}
                                            className="flex-1 min-w-[120px] py-2 text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            Edit Flow
                                        </button>
                                        {deleteConfirm === flow.id ? (
                                            <div className="flex items-center gap-1 ml-auto">
                                                <button
                                                    onClick={() => deleteFlow(flow.id)}
                                                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(flow.id)}
                                                className="py-1.5 sm:py-2 px-2 sm:px-3 text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-auto"
                                                title="Delete Flow"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
};

export default FlowList;
