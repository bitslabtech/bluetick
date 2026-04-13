import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Filter, Monitor, User, Shield, AlertCircle, CheckCircle, Clock, BookOpen, MessageSquare, Settings, Send, Trash2, Edit, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';
import { formatDistanceToNow } from 'date-fns';

const AdminActivityLogs = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('All');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/admin/activity-logs');
            setLogs(res.data);
        } catch (err) {
            console.error("Error fetching logs:", err);
        } finally {
            setLoading(false);
        }
    };

    // Derived Filters
    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.User?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.User?.email || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterAction === 'All' ? true : (log.action || '').includes(filterAction);

        return matchesSearch && matchesType;
    });

    const getActionIcon = (action) => {
        const a = action.toLowerCase();
        if (a.includes('login')) return <Monitor className="w-4 h-4 text-blue-500" />;
        if (a.includes('user')) return <User className="w-4 h-4 text-green-500" />;
        if (a.includes('admin') || a.includes('permission')) return <Shield className="w-4 h-4 text-purple-500" />;
        if (a.includes('kb') || a.includes('article') || a.includes('category')) return <BookOpen className="w-4 h-4 text-indigo-500" />;
        if (a.includes('ticket')) return <MessageSquare className="w-4 h-4 text-sky-500" />;
        if (a.includes('plan')) return <Shield className="w-4 h-4 text-amber-500" />;
        if (a.includes('setting') || a.includes('config')) return <Settings className="w-4 h-4 text-slate-500" />;
        if (a.includes('broadcast') || a.includes('notification')) return <Send className="w-4 h-4 text-emerald-500" />;
        if (a.includes('error') || a.includes('failed')) return <AlertCircle className="w-4 h-4 text-red-500" />;
        if (a.includes('delete') || a.includes('remove')) return <Trash2 className="w-4 h-4 text-red-500" />;
        if (a.includes('update') || a.includes('edit')) return <Edit className="w-4 h-4 text-blue-500" />;
        return <Activity className="w-4 h-4 text-slate-500" />;
    };

    const getActionColor = (action) => {
        const a = action.toLowerCase();
        if (a.includes('create') || a.includes('add') || a.includes('success')) return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400';
        if (a.includes('update') || a.includes('edit') || a.includes('change')) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
        if (a.includes('delete') || a.includes('remove')) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400';
        if (a.includes('impersonation')) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
        if (a.includes('broadcast') || a.includes('notification')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400';
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400';
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            {/* Top Bar */}
            <AdminHeader
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
            >
                <ThemeToggle />
            </AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20">

                <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col min-h-[600px]">

                    {/* Header: Title & Controls */}
                    <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="w-6 h-6 text-orange-500" />
                                System Activity Logs
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">Audit trail of all administrative and user actions.</p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={fetchLogs}
                                className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:text-primary transition-colors"
                                title="Refresh Logs"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>

                            <div className="relative group">
                                <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    <Filter className="w-4 h-4" />
                                    {filterAction === 'All' ? 'Filter Type' : filterAction}
                                </button>
                                <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-20">
                                    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-slate-100 dark:border-white/10 p-1">
                                        {['All', 'User', 'Plan', 'Login', 'Impersonation', 'KB', 'Ticket', 'Setting', 'Broadcast'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setFilterAction(type)}
                                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1 bg-slate-50/30 dark:bg-black/10">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/5 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-text-secondary sticky top-0 backdrop-blur-sm z-10 border-b border-slate-200 dark:border-white/5">
                                <tr>
                                    <th className="px-6 py-4 w-48">Timestamp</th>
                                    <th className="px-6 py-4 w-64">User / Admin</th>
                                    <th className="px-6 py-4 w-48">Action</th>
                                    <th className="px-6 py-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm bg-white dark:bg-surface-dark">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-24"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-32"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-20"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-64"></div></td>
                                        </tr>
                                    ))
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <Activity className="w-12 h-12 mb-3 opacity-20" />
                                                <p>No logs found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="font-mono text-xs">
                                                        {new Date(log.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 pl-6">
                                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                                                        {log.User?.name?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-white">{log.User?.name || 'Unknown'}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-500">{log.userId ? log.userId.split('-')[0] + '...' : 'System'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getActionColor(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                {log.details}
                                                {log.ip && (
                                                    <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-500">
                                                        IP: {log.ip}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default AdminActivityLogs;
