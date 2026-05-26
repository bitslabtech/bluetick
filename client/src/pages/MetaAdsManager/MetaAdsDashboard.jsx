import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Megaphone, TrendingUp, DollarSign, MessageCircle, BarChart2,
    Calendar, MoreVertical, CreditCard, Play, Pause, Zap, ArrowRight, Loader2, AlertTriangle, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useUI } from '../../context/UIContext';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const StatCard = ({ title, value, icon: Icon, trend, colorClass }) => (
    <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        className="relative overflow-hidden bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl border border-white/50 dark:border-white/10 p-4 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-full dark:shadow-none transition-all group"
    >
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Icon className="w-24 h-24" />
        </div>
        <div className="flex items-center justify-between z-10 relative">
            <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-text-secondary uppercase tracking-wider">{title}</p>
                <div className="flex items-baseline gap-3 mt-2">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3>
                    {trend && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                            {trend > 0 ? '+' : ''}{trend}%
                        </span>
                    )}
                </div>
            </div>
            <div className={`p-4 rounded-xl ${colorClass}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </motion.div>
);

const MetaAdsDashboard = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useUI();
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState([]);
    const [metaConnected, setMetaConnected] = useState(null); // null = loading

    // Check Meta connection status
    useEffect(() => {
        axios.get('/api/ctwa/status', { withCredentials: true })
            .then(res => setMetaConnected(res.data.connected))
            .catch(() => setMetaConnected(false));
    }, []);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const res = await axios.get('/api/meta-ads', { withCredentials: true });
                setCampaigns(res.data);
            } catch (err) {
                console.error("Failed to fetch campaigns", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaigns();
    }, []);

    const statusColors = {
        Active: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
        Paused: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400',
        Published: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    };

    return (
        <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto space-y-8">

            {/* Meta Connection Warning Banner */}
            {metaConnected === false && (
                <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">Meta Ads Account Not Connected</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            You haven't linked a Facebook Ad Account yet. You can create campaigns, but they'll be saved as <strong>Draft</strong> and won't be published to Meta until you connect.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/ctwa-analytics')}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/40 hover:bg-amber-200 dark:hover:bg-amber-700/40 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                        Connect Now <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-secondary" />
                        AI Meta Ads Manager
                    </h1>
                    <p className="text-slate-500 dark:text-text-secondary mt-1 max-w-2xl text-sm">
                        Create, deploy, and manage highly-targeted Click-to-WhatsApp (CTWA) ad campaigns powered by artificial intelligence.
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/meta-ads/wizard')}
                    className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-4 md:px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Create New AI Campaign
                </motion.button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Ads" value={campaigns.filter(c => c.status === 'Active' || c.status === 'Published').length} icon={Zap} trend={12} colorClass="bg-gradient-to-br from-amber-400 to-amber-600" />
                <StatCard title="Total Spend" value="$0.00" icon={DollarSign} trend={8} colorClass="bg-gradient-to-br from-emerald-400 to-emerald-600" />
                <StatCard title="Messages Started" value="0" icon={MessageCircle} trend={24} colorClass="bg-gradient-to-br from-blue-400 to-blue-600" />
                <StatCard title="Cost Per Conv." value="$0.00" icon={TrendingUp} trend={-5} colorClass="bg-gradient-to-br from-purple-400 to-purple-600" />
            </div>

            {/* Campaigns List */}
            <div className="bg-white/70 dark:bg-surface-dark/70 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-primary" /> Campaign History
                    </h2>
                </div>
                
                {loading ? (
                    <div className="p-4 md:p-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} height={80} baseColor={isDarkMode ? '#1e293b' : '#f8fafc'} highlightColor={isDarkMode ? '#334155' : '#ffffff'} className="rounded-xl" />
                        ))}
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="p-4 md:p-16 text-center">
                        <div className="w-24 h-24 bg-primary/10 dark:bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Megaphone className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No campaigns yet</h3>
                        <p className="text-slate-500 dark:text-text-secondary max-w-sm mx-auto mb-6">You haven't created any AI-powered Meta Ad campaigns yet.</p>
                        <button
                            onClick={() => navigate('/meta-ads/wizard')}
                            className="inline-flex items-center gap-2 text-primary font-bold hover:text-secondary transition-colors"
                        >
                            Create your first campaign <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    <th className="p-4 pl-6 font-semibold">Campaign</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Daily Budget</th>
                                    <th className="p-4 font-semibold">Objective</th>
                                    <th className="p-4 font-semibold text-right">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {campaigns.map((campaign) => (
                                    <tr key={campaign.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/5 flex items-center justify-center text-primary flex-shrink-0">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary transition-colors cursor-pointer">
                                                        {campaign.campaignName}
                                                    </p>
                                                    <p className="text-xs text-slate-500 line-clamp-1 max-w-[250px] max-w-full">
                                                        {campaign.targeting?.locations?.[0]} • Age {campaign.targeting?.age_min}-{campaign.targeting?.age_max}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[campaign.status] || statusColors.Draft}`}>
                                                {campaign.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                                                {campaign.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-medium text-slate-900 dark:text-slate-300">
                                                ${parseFloat(campaign.dailyBudget || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                            {campaign.objective?.replace('_', ' ')}
                                        </td>
                                        <td className="p-4 pr-6 text-right text-sm text-slate-500">
                                            {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetaAdsDashboard;
