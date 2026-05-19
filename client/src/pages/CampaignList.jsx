import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus, Search, Filter, MoreVertical, Calendar,
    MessageSquare, CheckCircle, AlertCircle, XCircle, Clock, Loader2, CheckCircle2, Menu, User, Check, CheckCheck, X, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import UserDropdown from '../components/UserDropdown';

const FAST_POLL_MS = 3000;   // 3s when campaigns are actively sending
const SLOW_POLL_MS = 30000;  // 30s when all campaigns are idle

export default function CampaignList() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const intervalRef = useRef(null);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/messages`);
                const formattedCampaigns = res.data.map(msg => {
                    return {
                        id: msg.id,
                        name: msg.campaignName || (msg.Template ? `${msg.Template.name} Campaign` : `Campaign ${new Date(msg.createdAt).toLocaleDateString()}`),
                        status: msg.status.toLowerCase(),
                        sent: msg.sentCount || 0,
                        audience: msg.recipientCount,
                        delivered: msg.deliveredCount || 0,
                        read: msg.readCount || 0,
                        failed: msg.failedCount || 0,
                        error: null,
                        date: msg.createdAt,
                        template: msg.Template?.name || 'Unknown'
                    };
                });

                // Only update state if data changed to prevent re-renders
                setCampaigns(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(formattedCampaigns)) {
                        return formattedCampaigns;
                    }
                    return prev;
                });

                // Smart polling: fast when campaigns are active, slow when all idle
                const hasActive = formattedCampaigns.some(c =>
                    ['sending', 'active', 'queued', 'scheduled'].includes(c.status)
                );
                const nextInterval = hasActive ? FAST_POLL_MS : SLOW_POLL_MS;

                // Only reset interval if the speed changed
                if (intervalRef.current?.speed !== nextInterval) {
                    clearInterval(intervalRef.current?.id);
                    const id = setInterval(fetchCampaigns, nextInterval);
                    intervalRef.current = { id, speed: nextInterval };
                }
            } catch (err) {
                console.error("Error fetching campaigns:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
        // Start with fast poll; fetchCampaigns will adjust speed after first response
        const id = setInterval(fetchCampaigns, FAST_POLL_MS);
        intervalRef.current = { id, speed: FAST_POLL_MS };
        return () => clearInterval(intervalRef.current?.id);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'sending': // fallthrough
            case 'active': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'scheduled': // fallthrough
            case 'queued': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-4 h-4" />;
            case 'sending': // fallthrough
            case 'active': return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'scheduled': // fallthrough
            case 'queued': return <Clock className="w-4 h-4" />;
            case 'failed': return <AlertCircle className="w-4 h-4" />;
            default: return null;
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredCampaigns = campaigns.filter(c => {
        const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.template.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-300 overflow-hidden fade-in">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-4 md:px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300">
                <div className="flex items-center w-full max-w-md">
                    {/* Search Bar */}
                    <div className="flex items-center rounded-lg bg-slate-100 dark:bg-surface-dark h-10 w-full px-3 border border-transparent focus-within:border-primary transition-colors">
                        <Search className="w-5 h-5 text-slate-400 dark:text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
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

            {/* Filters & Actions */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-surface-dark flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm z-10 transition-colors duration-300">
                <div className="flex items-center gap-6 overflow-x-auto w-full sm:w-auto">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white shrink-0">Campaigns</h2>
                    <div className="flex bg-slate-100 dark:bg-surface-dark rounded-lg p-1 border border-slate-200 dark:border-white/5 transition-colors duration-300 shrink-0">
                        {['all', 'active', 'scheduled', 'completed', 'failed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${filterStatus === status
                                    ? 'bg-white dark:bg-background-dark text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Link
                        to="/campaigns"
                        className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-colors flex items-center gap-2 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        New Campaign
                    </Link>
                </div>
            </div>

            {/* Main Content List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : filteredCampaigns.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredCampaigns.map((campaign) => (
                            <Link
                                to={`/campaign-details/${campaign.id}`}
                                key={campaign.id}
                                className="block group bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 p-5 hover:border-primary/50 dark:hover:border-white/10 transition-all hover:shadow-md dark:hover:bg-surface-dark/80"
                            >
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    {/* Icon & Status */}
                                    <div className="flex items-center justify-between w-full md:w-auto md:flex-col md:items-start md:gap-3 shrink-0 min-w-[120px]">
                                        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium capitalize ${getStatusColor(campaign.status)}`}>
                                            {getStatusIcon(campaign.status)}
                                            {campaign.status}
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-text-secondary md:hidden">{formatDate(campaign.date)}</span>
                                    </div>

                                    {/* Campaign Info */}
                                    <div className="flex-1 w-full text-center md:text-left">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors cursor-pointer">{campaign.name}</h3>
                                        <div className="flex items-center justify-center md:justify-start gap-4 text-xs text-slate-500 dark:text-text-secondary">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDate(campaign.date)}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20"></span>
                                            <span className="flex items-center gap-1.5">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                Template: <span className="text-slate-700 dark:text-white font-medium">{campaign.template}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-6 w-full md:w-auto justify-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/5 pt-4 md:pt-0 md:pl-6">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <div className="flex items-center gap-1.5" title="Sent">
                                                <Check className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                <span className="text-lg font-bold text-slate-900 dark:text-white">{campaign.sent}</span>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-text-secondary font-medium">Sent</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <div className="flex items-center gap-1.5" title="Delivered">
                                                <CheckCheck className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                <span className="text-lg font-bold text-slate-900 dark:text-white">{campaign.delivered}</span>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-text-secondary font-medium">Delivered</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <div className="flex items-center gap-1.5" title="Failed">
                                                <X className="w-4 h-4 text-red-500" />
                                                <span className="text-lg font-bold text-red-500">{campaign.failed || 0}</span>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-text-secondary font-medium">Failed</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <div className="flex items-center gap-1.5" title="Read">
                                                <CheckCheck className="w-4 h-4 text-blue-500" />
                                                <span className="text-lg font-bold text-blue-500 dark:text-blue-400">{campaign.read}</span>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-text-secondary font-medium">Read</span>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="hidden md:flex items-center justify-end w-20">
                                        <button className="p-2 text-slate-400 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Error Details */}
                                {campaign.failed > 0 && campaign.error && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 text-xs text-red-500 dark:text-red-400 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>Error: {campaign.error}</span>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-surface-dark/30">
                        <div className="bg-primary/10 p-4 rounded-full mb-4">
                            <MessageSquare className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No campaigns found</h3>
                        <p className="text-slate-500 dark:text-text-secondary text-sm max-w-xs mb-6">You haven't created any campaigns yet. Start your first one today!</p>
                        <Link
                            to="/campaigns"
                            className="px-6 py-2.5 text-sm font-bold text-white bg-primary rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Campaign
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
