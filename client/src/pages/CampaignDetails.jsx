import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
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
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
    BarChart, Bar 
} from 'recharts';

const FAST_POLL_MS = 3000;   // 3s when campaign is actively sending
const SLOW_POLL_MS = 30000;  // 30s when campaign is finished

export default function CampaignDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const teamPolicy = user?.teamPolicy || { inboxVisibility: 'see_all', phonePrivacy: 'visible' };
    const isSubMember = !!user?.parentUserId;
    const { showModal, showToast } = useUI();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [visibleLines, setVisibleLines] = useState({
        delivered: true,
        read: true,
        clicked: true,
        failed: true
    });
    const intervalRef = useRef(null);
    
    // Calculate Chart Data
    const generateChartData = () => {
        if (!campaign || !campaign.processedLogs || campaign.processedLogs.length === 0) return { timeSeries: [], readDistribution: [], peakSummary: null };
        
        // 1. Time Series Data (group by hour)
        const timeseriesMap = new Map();
        
        campaign.processedLogs.forEach(log => {
            if (!log.timestamp) return;
            const date = new Date(parseInt(log.timestamp) * 1000);
            
            // Format label: MM/DD HH:00
            const label = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:00`;
            
            if (!timeseriesMap.has(label)) {
                timeseriesMap.set(label, { timeLabel: label, delivered: 0, read: 0, clicked: 0, failed: 0, sortKey: Math.floor(date.getTime() / 3600000) * 3600000 });
            }
            const bucket = timeseriesMap.get(label);
            
            if (['DELIVERED', 'READ', 'CLICKED'].includes(log.status)) bucket.delivered++;
            if (['READ', 'CLICKED'].includes(log.status)) bucket.read++;
            if (log.status === 'CLICKED') bucket.clicked++;
            if (log.status === 'FAILED') bucket.failed++;
        });

        const timeSeries = Array.from(timeseriesMap.values()).sort((a,b) => a.sortKey - b.sortKey);

        // 2. Read Distribution Data (peak hours)
        const readHoursMap = new Map();
        let totalReads = 0;
        let peakHour = null;
        let peakCount = -1;

        campaign.processedLogs.forEach(log => {
            if (['READ', 'CLICKED'].includes(log.status) && log.timestamp) {
                const date = new Date(parseInt(log.timestamp) * 1000);
                const hour = date.getHours();
                const hourLabel = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;
                
                if (!readHoursMap.has(hourLabel)) readHoursMap.set(hourLabel, { hourLabel, count: 0, sortKey: hour });
                readHoursMap.get(hourLabel).count++;
                totalReads++;
            }
        });

        const readDistribution = Array.from(readHoursMap.values()).sort((a,b) => a.sortKey - b.sortKey);
        
        readDistribution.forEach(item => {
            if (item.count > peakCount) {
                peakCount = item.count;
                peakHour = item.hourLabel;
            }
        });

        let peakSummary = null;
        if (peakHour) {
            const percentage = totalReads > 0 ? Math.round((peakCount / totalReads) * 100) : 0;
            peakSummary = `Peak read activity occurred around ${peakHour} with ${peakCount} messages read. ${percentage}% of your readers interacted during this hour.`;
        } else {
            peakSummary = "Not enough read data to determine peak time.";
        }

        return { timeSeries, readDistribution, peakSummary };
    };

    const renderName = (name, phone) => {
        const isActuallyPhone = !name || name === phone || /^\d+$/.test(name.replace(/\D/g, ''));
        if (isActuallyPhone && isSubMember) {
            if (teamPolicy.phonePrivacy === 'blurred') return <span className="blur-sm select-none">{phone || name}</span>;
            if (teamPolicy.phonePrivacy === 'masked') return `****${(phone || name)?.slice(-4)}`;
        }
        return name || phone;
    };

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/messages/${id}`);
                const msg = res.data;

                // Process logs with SAME STRICT LOGIC as Campaign List
                const logs = msg.logs || [];
                const normalizedLogs = logs.map(l => ({
                    ...l,
                    status: (l.status || '').toUpperCase(),
                    // Use metaTimestamp from Meta (reliable), fallback to updatedAt
                    timestamp: l.metaTimestamp || l.updatedAt || msg.createdAt
                }));

                const sentCount = normalizedLogs.filter(l => ['SENT', 'DELIVERED', 'READ', 'CLICKED'].includes(l.status)).length;
                const deliveredCount = normalizedLogs.filter(l => ['DELIVERED', 'READ', 'CLICKED'].includes(l.status)).length;
                const readCount = normalizedLogs.filter(l => ['READ', 'CLICKED'].includes(l.status)).length;
                const clickedCount = normalizedLogs.filter(l => l.status === 'CLICKED').length;
                const failedCount = normalizedLogs.filter(l => l.status === 'FAILED').length;

                setCampaign({
                    ...msg,
                    processedLogs: normalizedLogs,
                    stats: {
                        sent: sentCount,
                        delivered: deliveredCount,
                        read: readCount,
                        clicked: clickedCount,
                        failed: failedCount,
                        total: msg.recipientCount
                    }
                });

                // Smart polling: fast for active campaigns, slow for finished ones
                const status = (msg.status || '').toLowerCase();
                const isActive = ['sending', 'active', 'queued', 'scheduled'].includes(status);
                const nextInterval = isActive ? FAST_POLL_MS : SLOW_POLL_MS;

                if (intervalRef.current?.speed !== nextInterval) {
                    clearInterval(intervalRef.current?.id);
                    const newId = setInterval(fetchCampaign, nextInterval);
                    intervalRef.current = { id: newId, speed: nextInterval };
                }

            } catch (err) {
                console.error("Error fetching campaign details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaign();
        const initId = setInterval(fetchCampaign, FAST_POLL_MS);
        intervalRef.current = { id: initId, speed: FAST_POLL_MS };
        return () => clearInterval(intervalRef.current?.id);
    }, [id]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'CLICKED': return <CheckCheck className="w-4 h-4 text-purple-500" />;
            case 'READ': return <CheckCheck className="w-4 h-4 text-blue-500" />;
            case 'DELIVERED': return <CheckCheck className="w-4 h-4 text-gray-400" />;
            case 'SENT': return <Check className="w-4 h-4 text-gray-400" />;
            case 'FAILED': return <X className="w-4 h-4 text-red-500" />;
            default: return <Clock className="w-4 h-4 text-yellow-500" />;
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            CLICKED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
            READ: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            DELIVERED: "bg-green-500/10 text-green-500 border-green-500/20",
            SENT: "bg-gray-500/10 text-gray-500 border-gray-500/20",
            FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
            PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
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
        let matchesStatus = false;
        if (statusFilter === 'all') matchesStatus = true;
        else if (statusFilter.startsWith('btn_')) matchesStatus = log.clickedButton === statusFilter.substring(4);
        // Hierarchical matching: DELIVERED includes READ & CLICKED; READ includes CLICKED
        else if (statusFilter === 'DELIVERED') matchesStatus = ['DELIVERED', 'READ', 'CLICKED'].includes(log.status);
        else if (statusFilter === 'READ') matchesStatus = ['READ', 'CLICKED'].includes(log.status);
        else matchesStatus = log.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getTabsConfigs = () => {
        const baseTabs = [
            { id: 'all', label: 'All Recipients', icon: Users, count: campaign.stats.total || 0, color: 'text-slate-600' },
            { id: 'DELIVERED', label: 'Delivered', icon: CheckCheck, count: campaign.stats.delivered || 0, color: 'text-green-500' },
            { id: 'READ', label: 'Read', icon: CheckCheck, count: campaign.stats.read || 0, color: 'text-blue-500' },
            { id: 'FAILED', label: 'Failed', icon: X, count: campaign.stats.failed || 0, color: 'text-red-500' }
        ];

        // Compute unique clicked buttons
        const buttonCounts = {};
        let totalClicks = 0;
        campaign.processedLogs.forEach(l => {
            if (l.status === 'CLICKED') {
                totalClicks++;
                if (l.clickedButton) {
                    buttonCounts[l.clickedButton] = (buttonCounts[l.clickedButton] || 0) + 1;
                }
            }
        });

        const dynamicTabs = Object.entries(buttonCounts).map(([btnName, count]) => ({
            id: `btn_${btnName}`,
            label: `👆 ${btnName}`,
            icon: Tag,
            count: count,
            color: 'text-purple-600 dark:text-purple-400',
            isDynamic: true
        }));
        
        // Add a generic Clicked tab if there are any clicks
        if (totalClicks > 0) {
             baseTabs.splice(3, 0, { id: 'CLICKED', label: 'Clicked', icon: Tags, count: totalClicks, color: 'text-purple-500' });
        }

        return [...baseTabs, ...dynamicTabs];
    };

    const { timeSeries, readDistribution, peakSummary } = generateChartData();
    const enableCharts = timeSeries.length > 0;
    
    const toggleLine = (dataKey) => {
        setVisibleLines(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
    };

    const renderChartLegend = (props) => {
        const { payload } = props;
        return (
            <div className="flex justify-center gap-6 mt-2">
                {payload.map((entry, index) => (
                    <div 
                        key={`item-${index}`} 
                        className={`flex items-center gap-2 cursor-pointer transition-opacity duration-200 hover:opacity-80 ${visibleLines[entry.dataKey] ? 'opacity-100' : 'opacity-40 grayscale'}`}
                        onClick={() => toggleLine(entry.dataKey)}
                    >
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    };

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
            </div>

            {/* Insights Dashboard */}
            <div className="px-8 mt-6 shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Engagement Graph */}
                    <div className="lg:col-span-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Engagement Over Time</h3>
                        {enableCharts ? (
                            <div className="h-64 w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timeSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorClicked" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                        <XAxis dataKey="timeLabel" tick={{fontSize: 10}} axisLine={false} tickLine={false} tickMargin={10} stroke="#64748b" />
                                        <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} tickMargin={10} stroke="#64748b" />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}
                                        />
                                        <Legend content={renderChartLegend} />
                                        
                                        <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#22c55e" strokeWidth={3} fill="url(#colorDelivered)" animationDuration={1500} fillOpacity={visibleLines.delivered ? 1 : 0} strokeOpacity={visibleLines.delivered ? 1 : 0} activeDot={visibleLines.delivered ? {r: 6} : false} dot={visibleLines.delivered ? {r: 4, strokeWidth: 2} : false} />
                                        <Area type="monotone" dataKey="read" name="Read" stroke="#3b82f6" strokeWidth={3} fill="url(#colorRead)" animationDuration={1500} fillOpacity={visibleLines.read ? 1 : 0} strokeOpacity={visibleLines.read ? 1 : 0} activeDot={visibleLines.read ? {r: 6} : false} dot={visibleLines.read ? {r: 4, strokeWidth: 2} : false} />
                                        <Area type="monotone" dataKey="clicked" name="Clicked" stroke="#a855f7" strokeWidth={3} fill="url(#colorClicked)" animationDuration={1500} fillOpacity={visibleLines.clicked ? 1 : 0} strokeOpacity={visibleLines.clicked ? 1 : 0} activeDot={visibleLines.clicked ? {r: 6} : false} dot={visibleLines.clicked ? {r: 4, strokeWidth: 2} : false} />
                                        <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" strokeWidth={3} fill="url(#colorFailed)" animationDuration={1500} fillOpacity={visibleLines.failed ? 1 : 0} strokeOpacity={visibleLines.failed ? 1 : 0} activeDot={visibleLines.failed ? {r: 6} : false} dot={visibleLines.failed ? {r: 4, strokeWidth: 2} : false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 w-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                                <Clock className="w-10 h-10 mb-2" />
                                <span className="text-sm">Awaiting engagement data...</span>
                            </div>
                        )}
                    </div>

                    {/* Peak Read Times & Health */}
                    <div className="flex flex-col gap-6">
                        {/* Peak Time Graph */}
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                                Peak Read Times
                                <Clock className="w-4 h-4 text-primary" />
                            </h3>
                            {readDistribution.length > 0 ? (
                                <>
                                    <div className="h-28 w-full mt-2 -ml-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={readDistribution} margin={{top: 5, right: 5, left: -25, bottom: 0}}>
                                                <XAxis dataKey="hourLabel" tick={{fontSize: 9}} axisLine={false} tickLine={false} stroke="#64748b" />
                                                <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} stroke="#64748b" />
                                                <Tooltip 
                                                    cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} 
                                                    contentStyle={{ borderRadius: '8px', border: 'none', padding: '8px' }}
                                                />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Reads" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-100 dark:border-blue-900/20">
                                        <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                                            {peakSummary}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50">
                                    <span className="text-xs">No read data recorded yet.</span>
                                </div>
                            )}
                        </div>

                        {/* Health Diagnostics - Minified */}
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 shadow-sm flex items-center justify-between relative overflow-hidden group">
                            {campaign.stats.failed > 0 ? (
                                <>
                                    <div>
                                        <div className="flex items-center gap-2 text-red-500 mb-1">
                                            <AlertCircle className="w-4 h-4" />
                                            <h3 className="font-bold text-xs uppercase tracking-wider">Action Required</h3>
                                        </div>
                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white">{campaign.stats.failed} <span className="text-sm font-normal text-slate-500">Failures</span></h4>
                                    </div>
                                    <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-full">
                                        <X className="w-5 h-5 text-red-500" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <div className="flex items-center gap-2 text-green-500 mb-1">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <h3 className="font-bold text-xs uppercase tracking-wider">Perfect Health</h3>
                                        </div>
                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white">0 <span className="text-sm font-normal text-slate-500">Failures</span></h4>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-full">
                                        <Check className="w-5 h-5 text-green-500" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-8 flex flex-col lg:flex-row gap-8">

                {/* Main: Message Logs */}
                <div className="flex-1 bg-white dark:bg-surface-dark/50 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col h-[600px] shadow-sm transition-colors duration-300">
                    {/* Log Filters & Retargeting Tabs */}
                    <div className="p-4 border-b border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 sm:pb-0 w-full sm:w-auto">
                            {getTabsConfigs().map(tab => {
                                const pct = campaign.stats.total > 0 ? ((tab.count / campaign.stats.total) * 100).toFixed(0) : 0;
                                const isActive = statusFilter === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setStatusFilter(tab.id); setSelectedLogs([]); }}
                                        className={`flex-shrink-0 flex flex-col items-start gap-1 p-3 rounded-xl min-w-[130px] transition-all border ${isActive
                                            ? tab.isDynamic 
                                                ? 'bg-purple-500/10 border-purple-500 shadow-sm ring-1 ring-purple-500/20' 
                                                : 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20'
                                            : 'bg-slate-50 dark:bg-background-dark border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? (tab.isDynamic ? 'text-purple-600 dark:text-purple-400' : 'text-primary') : 'text-slate-500 dark:text-text-secondary'}`}>
                                                {tab.label}
                                            </span>
                                            <Icon className={`w-4 h-4 ${isActive ? (tab.isDynamic ? 'text-purple-600 dark:text-purple-400' : 'text-primary') : 'text-slate-400'}`} />
                                        </div>
                                        <div className="flex items-baseline gap-2 mt-1 w-full relative">
                                            <span className="text-xl font-bold text-slate-900 dark:text-white">{tab.count}</span>
                                            {!tab.isDynamic && (
                                                <div className="flex items-center gap-1 flex-1 absolute right-0">
                                                    <div className="w-8 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                        <div className={`h-full ${tab.id === 'all' ? 'bg-slate-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-medium text-slate-500">{pct}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-end gap-3 self-end sm:self-auto shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
                            {statusFilter !== 'all' && (
                                <button
                                    onClick={() => {
                                        let retStatus = statusFilter;
                                        if (statusFilter === 'CLICKED') retStatus = 'CLICKED';
                                        else if (statusFilter.startsWith('btn_')) retStatus = 'ALL'; // Handle subset properly below
                                        
                                        // If retargeting a specific button, pass exactly those logs to subset lock.
                                        let explicitlySelectedLogIds = selectedLogs.length > 0 ? selectedLogs : null;
                                        if (statusFilter.startsWith('btn_') && !explicitlySelectedLogIds) {
                                             explicitlySelectedLogIds = filteredLogs.map(l => l.id);
                                             retStatus = 'CLICKED';
                                        }

                                        navigate(`/campaigns?retargetCampaignId=${campaign.id}&retargetStatus=${retStatus}&sourceName=${encodeURIComponent(campaign.campaignName || '')}`, {
                                            state: { retargetLogIds: explicitlySelectedLogIds }
                                        });
                                    }}
                                    className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <Tag className="w-4 h-4" />
                                    Retarget {statusFilter.startsWith('btn_') ? 'Selection' : statusFilter.toLowerCase()} ({selectedLogs.length > 0 ? selectedLogs.length : filteredLogs.length})
                                </button>
                            )}
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-text-secondary" />
                                <input
                                    type="text"
                                    placeholder="Search details..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-48 bg-slate-100 dark:bg-background-dark border border-transparent focus:border-primary rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none transition-colors duration-300 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/5 sticky top-0 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="px-6 py-3 w-10">
                                        {statusFilter !== 'all' && (
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-0 cursor-pointer accent-primary"
                                                checked={filteredLogs.length > 0 && selectedLogs.length === filteredLogs.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedLogs(filteredLogs.map(l => l.id));
                                                    else setSelectedLogs([]);
                                                }}
                                            />
                                        )}
                                    </th>
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
                                                {statusFilter !== 'all' && (
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-0 cursor-pointer accent-primary"
                                                        checked={selectedLogs.includes(log.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedLogs(prev => [...prev, log.id]);
                                                            } else {
                                                                setSelectedLogs(prev => prev.filter(id => id !== log.id));
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900 dark:text-white">{renderName(log.name, log.phone)}</span>
                                                    <span className="text-xs text-slate-500 dark:text-text-secondary font-mono mt-0.5">
                                                        <span className={isSubMember && teamPolicy.phonePrivacy === 'blurred' ? 'blur-sm select-none' : ''}>
                                                            {isSubMember && teamPolicy.phonePrivacy === 'masked'
                                                                ? `****${log.phone?.slice(-4) || ''}`
                                                                : log.phone
                                                            }
                                                        </span>
                                                    </span>
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
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-text-secondary">
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
                                        await axios.delete(`${import.meta.env.VITE_API_URL}/api/messages/${id}`);
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
