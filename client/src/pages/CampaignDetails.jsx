import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import {
    CheckCircle2,
    ArrowLeft,
    Check,
    CheckCheck,
    X,
    Clock,
    Search,
    Filter,
    Download,
    MessageSquare,
    Loader2,
    Users,
    Calendar,
    AlertCircle,
    ChevronDown,
    Trash2,
    Tag,
    Tags
} from 'lucide-react';

export default function CampaignDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showModal, showToast } = useUI();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/messages/${id}`);
                const msg = res.data;

                // Process logs with SAME STRICT LOGIC as Campaign List
                const logs = msg.logs || [];
                const normalizedLogs = logs.map(l => ({
                    ...l,
                    status: (l.status || '').toUpperCase(),
                    // Use metaTimestamp from Meta (reliable), fallback to updatedAt
                    timestamp: l.metaTimestamp || l.updatedAt || msg.createdAt
                }));

                const sentCount = normalizedLogs.filter(l => ['SENT', 'DELIVERED', 'READ'].includes(l.status)).length;
                const deliveredCount = normalizedLogs.filter(l => ['DELIVERED', 'READ'].includes(l.status)).length;
                const readCount = normalizedLogs.filter(l => ['READ'].includes(l.status)).length;
                const failedCount = normalizedLogs.filter(l => l.status === 'FAILED').length;

                setCampaign({
                    ...msg,
                    processedLogs: normalizedLogs,
                    stats: {
                        sent: sentCount,
                        delivered: deliveredCount,
                        read: readCount,
                        failed: failedCount,
                        total: msg.recipientCount
                    }
                });

            } catch (err) {
                console.error("Error fetching campaign details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaign();
        const interval = setInterval(fetchCampaign, 2000); // Auto-refresh every 2s
        return () => clearInterval(interval);
    }, [id]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'READ': return <CheckCheck className="w-4 h-4 text-blue-500" />;
            case 'DELIVERED': return <CheckCheck className="w-4 h-4 text-gray-400" />;
            case 'SENT': return <Check className="w-4 h-4 text-gray-400" />;
            case 'FAILED': return <X className="w-4 h-4 text-red-500" />;
            default: return <Clock className="w-4 h-4 text-yellow-500" />;
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            READ: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            DELIVERED: "bg-green-500/10 text-green-500 border-green-500/20",
            SENT: "bg-gray-500/10 text-gray-500 border-gray-500/20",
            FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
            PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
            // CRITICAL: Make COMPLETED green as requested
            COMPLETED: "bg-green-500/10 text-green-500 border-green-500/20"
        };
        return styles[status] || styles[status.toUpperCase()] || styles.PENDING;
    };

    if (loading) return (
        <div className="flex h-full items-center justify-center bg-background-dark">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
    );

    if (!campaign) return (
        <div className="flex flex-col h-full items-center justify-center bg-background-dark text-white gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h2 className="text-xl font-bold">Campaign Not Found</h2>
            <Link to="/campaign-list" className="text-primary hover:underline">Return to Campaigns</Link>
        </div>
    );

    // Initial "Sent" is total - failed, conceptually for "Success Rate"
    // But sticking to raw counters for clarity
    const filteredLogs = campaign.processedLogs.filter(log => {
        const matchesSearch = (log.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.phone || '').includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-y-auto transition-colors duration-300">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-200 dark:border-surface-dark bg-white/90 dark:bg-background-dark/90 sticky top-0 z-10 backdrop-blur-md transition-colors duration-300">
                <div className="flex items-center gap-4 mb-4">
                    <Link to="/campaign-list" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {campaign.campaignName || (campaign.Template?.name ? `${campaign.Template.name} Campaign` : 'Campaign Details')}
                            </h1>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wide ${getStatusBadge(campaign.status)}`}>
                                {campaign.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-text-secondary">
                            <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <Calendar className="w-4 h-4" />
                                {new Date(campaign.createdAt).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <Users className="w-4 h-4" />
                                {campaign.recipientCount} Recipients
                            </span>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Check className="w-12 h-12 text-slate-400 dark:text-gray-400" />
                        </div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-text-secondary font-medium mb-1">Sent</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{campaign.stats.sent}</h3>
                            <span className="text-xs text-green-500 dark:text-green-400 font-medium">
                                {Math.round((campaign.stats.sent / campaign.recipientCount) * 100)}%
                            </span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCheck className="w-12 h-12 text-slate-400 dark:text-gray-400" />
                        </div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-text-secondary font-medium mb-1">Delivered</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{campaign.stats.delivered}</h3>
                            <span className="text-xs text-slate-500 dark:text-text-secondary opacity-60">Success</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCheck className="w-12 h-12 text-blue-500" />
                        </div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-text-secondary font-medium mb-1">Read</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-blue-500 dark:text-blue-400">{campaign.stats.read}</h3>
                            <span className="text-xs text-blue-500/60 dark:text-blue-400/60 font-medium">
                                {campaign.stats.delivered > 0 ? Math.round((campaign.stats.read / campaign.stats.delivered) * 100) : 0}% Rate
                            </span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertCircle className="w-12 h-12 text-red-500" />
                        </div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-text-secondary font-medium mb-1">Failed</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-red-500">{campaign.stats.failed}</h3>
                            {campaign.stats.failed > 0 && <span className="text-xs text-red-500/60 font-medium">Alert</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-8 flex flex-col lg:flex-row gap-8">

                {/* Main: Message Logs */}
                <div className="flex-1 bg-white dark:bg-surface-dark/50 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col h-[600px] shadow-sm transition-colors duration-300">
                    {/* Log Filters */}
                    <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-text-secondary" />
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-background-dark border border-transparent focus:border-primary rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none transition-colors duration-300"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    // Close when clicking outside is ideal, but for now simple toggle
                                    className="flex items-center gap-2 bg-slate-100 dark:bg-background-dark border border-transparent dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none hover:bg-slate-200 dark:hover:bg-white/5 transition-colors min-w-[150px] justify-between"
                                >
                                    <span className="capitalize flex items-center gap-2">
                                        {statusFilter === 'all' && <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-text-secondary" />}
                                        {statusFilter === 'SENT' && <Check className="w-3.5 h-3.5 text-gray-400" />}
                                        {statusFilter === 'DELIVERED' && <CheckCheck className="w-3.5 h-3.5 text-gray-400" />}
                                        {statusFilter === 'READ' && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                                        {statusFilter === 'FAILED' && <X className="w-3.5 h-3.5 text-red-500" />}
                                        {statusFilter === 'all' ? 'All Statuses' : statusFilter.toLowerCase()}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-text-secondary transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isFilterOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                            {[
                                                { val: 'all', label: 'All Statuses', icon: <Filter className="w-3.5 h-3.5" /> },
                                                { val: 'SENT', label: 'Sent', icon: <Check className="w-3.5 h-3.5 text-gray-400" /> },
                                                { val: 'DELIVERED', label: 'Delivered', icon: <CheckCheck className="w-3.5 h-3.5 text-gray-400" /> },
                                                { val: 'READ', label: 'Read', icon: <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> },
                                                { val: 'FAILED', label: 'Failed', icon: <X className="w-3.5 h-3.5 text-red-500" /> }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.val}
                                                    onClick={() => {
                                                        setStatusFilter(opt.val);
                                                        setIsFilterOpen(false);
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${statusFilter === opt.val ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-text-secondary'
                                                        }`}
                                                >
                                                    {opt.icon}
                                                    <span>{opt.label}</span>
                                                    {statusFilter === opt.val && <Check className="w-3.5 h-3.5 ml-auto opacity-50" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/5 sticky top-0 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Recipient</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-text-secondary uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map((log, index) => (
                                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900 dark:text-white">{log.name || 'Unknown'}</span>
                                                    <span className="text-xs text-slate-500 dark:text-text-secondary font-mono mt-0.5">{log.phone}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(log.status)}
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-text-secondary">
                                                {log.status !== 'FAILED' && log.timestamp ? (
                                                    new Date(parseInt(log.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                ) : (
                                                    <span className="opacity-30 text-xs">--:--</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.status === 'FAILED' ? (
                                                    <span className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        {log.error || 'Unknown Error'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300 dark:text-text-secondary">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500 dark:text-text-secondary">
                                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            No messages found matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar: Template & Info */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm transition-colors duration-300">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            Message Template
                        </h3>
                        <div className="bg-[#E9EDEF] rounded-lg p-3 text-black text-sm relative rounded-tl-none mt-2 shadow-sm border border-slate-200">
                            <div className="absolute -top-2 -left-[1px] w-3 h-3 bg-[#E9EDEF] [clip-path:polygon(0_0,100%_100%,100%_0)] rotate-180 border-t border-l border-slate-200"></div>
                            {/* Simple text info about template, since we don't have full preview logic here easily */}
                            <p className="font-medium text-black/80">{campaign.Template?.name}</p>
                            <div className="mt-2 text-xs text-gray-500 whitespace-pre-wrap">
                                {campaign.Template?.content || '(No content preview available)'}
                            </div>
                            <div className="mt-2 flex justify-end">
                                <span className="text-[10px] text-gray-500">12:00 PM</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm transition-colors duration-300">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-500 dark:text-text-secondary" />
                            Config
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 dark:text-text-secondary block mb-1">Language</label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white uppercase">{campaign.Template?.language || 'EN'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 dark:text-text-secondary block mb-1">Total Audience</label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white">{campaign.recipientCount} Contacts</div>
                            </div>
                            {campaign.targetConfig?.description && (
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-text-secondary block mb-1">Description</label>
                                    <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-background-dark p-2 rounded-lg border border-slate-200 dark:border-white/5">{campaign.targetConfig.description}</div>
                                </div>
                            )}
                            {campaign.targetConfig?.tag && (
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-text-secondary block mb-1">Tag</label>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                        <Tags className="w-3 h-3" />
                                        {campaign.targetConfig.tag}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    <button
                        onClick={async () => {
                            showModal({
                                type: 'error',
                                title: 'Delete Campaign',
                                message: 'Are you sure you want to delete this campaign? This action cannot be undone.',
                                confirmText: 'Delete Forever',
                                cancelText: 'Cancel',
                                onConfirm: async () => {
                                    try {
                                        await axios.delete(`http://localhost:5000/api/messages/${id}`);
                                        showToast({ type: 'success', title: 'Deleted', message: 'Campaign deleted successfully' });
                                        navigate('/campaigns');
                                    } catch (err) {
                                        console.error("Error deleting campaign:", err);
                                        showToast({ type: 'error', title: 'Error', message: "Failed to delete campaign" });
                                    }
                                }
                            });
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-medium rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Campaign
                    </button>
                </div>
            </div>

        </div>
    );
}
