import { useState, useEffect } from 'react';
import TrialBanner from '../components/TrialBanner';
import axios from 'axios';
import {
    Users, MessageSquare, DollarSign, Activity, AlertCircle, CheckCircle2,
    TrendingUp, CreditCard, PieChart as PieChartIcon, MoreHorizontal,
    Search, Bell, Sparkles
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import AdminHeader from '../components/AdminHeader';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Navigate, Link } from 'react-router-dom';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const SuperAdminDashboard = () => {
    const { user } = useAuth();
    const { settings } = useUI();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Date Filter State
    const [startDate, setStartDate] = useState(new Date('2000-01-01'));
    const [endDate, setEndDate] = useState(new Date());
    const [activeFilter, setActiveFilter] = useState('all'); // 1d, 7d, 1m, 3m, 6m, 1y, custom, all
    const [isCustomOpen, setIsCustomOpen] = useState(false);

    const handlePresetChange = (preset) => {
        setActiveFilter(preset);
        const end = new Date();
        let start = new Date();

        switch (preset) {
            case 'all': start = new Date('2000-01-01'); break; // Effectively "All Time"
            case '1d': start = subDays(end, 1); break;
            case '7d': start = subDays(end, 7); break;
            case '1m': start = subMonths(end, 1); break;
            case '3m': start = subMonths(end, 3); break;
            case '6m': start = subMonths(end, 6); break;
            case '1y': start = subYears(end, 1); break;
            case 'custom':
                setIsCustomOpen(true);
                return; // Don't set dates immediately for custom, let user pick
            default: start = subDays(end, 30);
        }
        setStartDate(start);
        setEndDate(end);
        setIsCustomOpen(false);
    };

    useEffect(() => {
        if (!user?.isAdmin) return;
        // Skip fetch if custom mode and endDate is not yet selected
        if (!endDate) return;

        setLoading(true); // Reset loading on every filter change to clear stale chart data

        const fetchData = async () => {
            try {
                const startStr = startDate.toISOString();
                const endStr = endDate.toISOString();
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/stats?startDate=${startStr}&endDate=${endStr}`);
                setData(res.data);
            } catch (err) {
                console.error("Error loading admin data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData(); // Initial load
        const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s

        return () => clearInterval(interval);
    }, [user, startDate, endDate]); // Trigger fetch on date change

    if (!user?.isAdmin) return <Navigate to="/" />;

    // Helper formatting
    const currencyCode = settings?.currency || 'USD';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    const formatCurrency = (val) => new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(val);
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });


    let messageChartData = data?.graphs?.messageVolume?.map(item => ({
        date: formatDate(item.date),
        count: parseInt(item.count || 0)
    })) || [];

    if (messageChartData.length === 1 && data?.graphs?.messageVolume?.length > 0) {
        const singlePoint = messageChartData[0];
        const date = new Date(data.graphs.messageVolume[0].date);
        const prevDay = new Date(date); prevDay.setDate(prevDay.getDate() - 1);
        const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);

        messageChartData = [
            { date: formatDate(prevDay.toISOString()), count: 0 },
            singlePoint,
            { date: formatDate(nextDay.toISOString()), count: 0 }
        ];
    }

    let revenueChartData = data?.graphs?.revenueGrowth?.map(item => ({
        date: formatDate(item.date),
        amount: parseFloat(item.amount || 0)
    })) || [];

    if (revenueChartData.length === 1 && data?.graphs?.revenueGrowth?.length > 0) {
        const singlePoint = revenueChartData[0];
        const date = new Date(data.graphs.revenueGrowth[0].date);
        const prevDay = new Date(date); prevDay.setDate(prevDay.getDate() - 1);
        const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);

        revenueChartData = [
            { date: formatDate(prevDay.toISOString()), amount: 0 },
            singlePoint,
            { date: formatDate(nextDay.toISOString()), amount: 0 }
        ];
    }

    const pieData = data?.planDistribution?.map(item => ({
        name: item.plan,
        value: parseInt(item.count)
    })) || [];

    let aiTokenChartData = data?.graphs?.aiTokenVolume?.map(item => ({
        date: formatDate(item.date),
        count: parseInt(item.tokens || 0)
    })) || [];

    if (aiTokenChartData.length === 1 && data?.graphs?.aiTokenVolume?.length > 0) {
        const singlePoint = aiTokenChartData[0];
        const date = new Date(data.graphs.aiTokenVolume[0].date);
        const prevDay = new Date(date); prevDay.setDate(prevDay.getDate() - 1);
        const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);

        aiTokenChartData = [
            { date: formatDate(prevDay.toISOString()), count: 0 },
            singlePoint,
            { date: formatDate(nextDay.toISOString()), count: 0 }
        ];
    }

    console.log("Plan Distribution Raw:", data?.planDistribution);
    console.log("Pie Chart Data:", pieData);

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark overflow-y-auto fade-in transition-colors duration-300">
            {/* Header */}
            {/* Header */}
            {/* Header */}
            <AdminHeader>
                <TrialBanner />
                    <ThemeToggle />
            </AdminHeader>

            {/* Title Section (Moved to Main) */}
            <div className="px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Superadmin Overview</h1>
                    <p className="text-sm text-slate-500 dark:text-text-secondary">Platform performance and revenue metrics</p>
                </div>

                {/* Date Filter Pills */}
                <div className="flex items-center bg-white dark:bg-surface-dark p-1 rounded-lg border border-slate-200 dark:border-white/5 shadow-sm">
                    {['all', '1d', '7d', '1m', '3m', '6m', '1y'].map((preset) => (
                        <button
                            key={preset}
                            onClick={() => handlePresetChange(preset)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeFilter === preset
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                        >
                            {preset.toUpperCase()}
                        </button>
                    ))}
                    <div className="relative">
                        <button
                            onClick={() => handlePresetChange('custom')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${activeFilter === 'custom'
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                        >
                            Custom
                        </button>
                        {/* Hidden Date Picker for Custom Logic (or Popover) */}
                        {activeFilter === 'custom' && (
                            <div className="absolute top-full right-0 mt-2 z-20">
                                <DatePicker
                                    selected={startDate}
                                    onChange={(dates) => {
                                        const [start, end] = dates;
                                        setStartDate(start);
                                        setEndDate(end);
                                    }}
                                    startDate={startDate}
                                    endDate={endDate}
                                    selectsRange
                                    inline
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 max-w-7xl mx-auto w-full pb-7 sm:pb-20">

                {loading ? (
                    <div className="text-center py-20 text-slate-500">Loading admin analytics...</div>
                ) : (
                    <>
                        {/* 1. KPI CARDS (6 Grid) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            {/* Users */}
                            <KpiCard icon={Users} label="Total Users" value={data.kpi.totalUsers} color="blue" />
                            {/* Active Plans */}
                            <KpiCard icon={CheckCircle2} label="Active Plans" value={data.kpi.activePlans} color="green" />
                            {/* Revenue */}
                            <KpiCard icon={DollarSign} label="Total Revenue" value={formatCurrency(data.kpi.totalRevenue)} color="amber" />
                            {/* Messages */}
                            <KpiCard icon={MessageSquare} label="Messages Sent" value={data.kpi.totalMessages.toLocaleString()} color="purple" />
                            {/* Delivery Rate */}
                            <KpiCard icon={TrendingUp} label="Delivery Rate" value={`${data.kpi.deliveryRate}%`} color="indigo" />
                            {/* Failed Rate */}
                            <KpiCard icon={AlertCircle} label="Failed Rate" value={`${data.kpi.failedRate}%`} color="red" />
                        </div>

                        {/* 2. GRAPHS ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Message Volume */}
                            <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Message Volume</h3>
                                <div className="h-64">
                                    {messageChartData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-500">
                                            <div className="text-center">
                                                <p className="font-semibold">No graph data available</p>
                                                <p className="text-xs mt-2">Check browser console (F12) for debug logs</p>
                                                <p className="text-xs mt-1">API says: {data?.kpi?.totalMessages || 0} total messages exist</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={messageChartData}>
                                                <defs>
                                                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                    itemStyle={{ color: '#8884d8' }}
                                                    labelStyle={{ color: '#64748b' }} // slate-500
                                                    wrapperClassName="dark:!bg-[#1e293b] !bg-white dark:!text-white"
                                                />
                                                <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorMsg)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Revenue Growth */}
                            <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Revenue Growth</h3>
                                <div className="h-64">
                                    {revenueChartData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-500">
                                            <div className="text-center">
                                                <p className="font-semibold">No revenue data for this period</p>
                                                <p className="text-xs mt-2">Try selecting a different date range</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={revenueChartData}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                    itemStyle={{ color: '#10b981' }}
                                                    labelStyle={{ color: '#64748b' }}
                                                    wrapperClassName="dark:!bg-[#1e293b] !bg-white dark:!text-white"
                                                />
                                                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. RECENT PURCHASES & PIE CHART */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Purchases List */}
                            <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Purchases</h3>
                                    <Link to="/superadmin/purchases" className="text-primary text-sm font-medium hover:underline">View All</Link>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 uppercase text-xs">
                                            <tr>
                                                <th className="px-4 md:px-6 py-3">User</th>
                                                <th className="px-4 md:px-6 py-3">Plan</th>
                                                <th className="px-4 md:px-6 py-3">Amount</th>
                                                <th className="px-4 md:px-6 py-3">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {data.recentPurchases.map((tx, i) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="font-medium text-slate-900 dark:text-white">{tx.userName}</div>
                                                        <div className="text-xs text-slate-500">{tx.userEmail}</div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                            {tx.planName}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                        {formatCurrency(tx.amount)}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-slate-500">
                                                        {new Date(tx.createdAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {data.recentPurchases.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-4 text-slate-500">No recent transactions</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Plan Distribution Pie */}
                            <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Plan Distribution</h3>
                                <div className="flex-1 min-h-[250px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                }}
                                                itemStyle={{ color: '#64748b' }}
                                                wrapperClassName="dark:!bg-[#1e293b] !bg-white dark:!text-white"
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Text */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mb-6">
                                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                            {pieData.reduce((acc, curr) => acc + curr.value, 0)}
                                        </div>
                                        <div className="text-xs text-slate-500 uppercase">Users</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3.5 AI TOKEN USAGE & TOP USERS */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* AI Token Graph */}
                            <div className="lg:col-span-2 bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-500" />
                                    AI Token Consumption
                                </h3>
                                <div className="h-64">
                                    {aiTokenChartData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-500">
                                            <div className="text-center">
                                                <p className="font-semibold">No AI Token data available</p>
                                                <p className="text-xs mt-2">Check back when users start burning tokens.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={aiTokenChartData}>
                                                <defs>
                                                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                    itemStyle={{ color: '#a855f7' }}
                                                    wrapperClassName="dark:!bg-[#1e293b] !bg-white dark:!text-white"
                                                    formatter={(value) => [new Intl.NumberFormat().format(value), 'Tokens']}
                                                />
                                                <Area type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorTokens)" activeDot={{ r: 6, fill: '#a855f7' }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Top AI Token Users */}
                            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-1">Top Consumers</h3>
                                    <Link to="/superadmin/ai-tokens" className="text-primary text-sm font-medium hover:underline">View All</Link>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto">
                                    <div className="space-y-4">
                                        {data.topTokenUsers && data.topTokenUsers.length > 0 ? (
                                            data.topTokenUsers.map((u, i) => (
                                                <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5">
                                                    <div className="flex flex-col overflow-hidden mr-2">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate" title={u.User?.name}>{u.User?.name || 'Unknown'}</span>
                                                        <span className="text-xs text-slate-500 truncate">{u.User?.email || '-'}</span>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                                            {new Intl.NumberFormat().format(u.totalTokens)}
                                                        </div>
                                                        <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
                                                            Tokens
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-slate-500 text-sm py-4">No top users yet.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. ACTIVITY LOGS */}
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm p-4 md:p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Platform Activity Logs</h3>
                                <Link to="/superadmin/activity-logs" className="text-primary text-sm font-medium hover:underline">View All</Link>
                            </div>
                            <div className="space-y-6">
                                {data.activityLogs.map((log, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="mt-1">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                                                <Activity className="w-4 h-4 text-slate-500 dark:text-text-secondary" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                <span className="font-bold">{log.userName}</span> {log.details}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
                                                {new Date(log.createdAt).toLocaleString()} • {log.ip || 'IP Hidden'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {data.activityLogs.length === 0 && (
                                    <div className="text-center text-slate-500 text-sm">No activity logs found.</div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

// Simple KPI Card Component
const KpiCard = ({ icon: Icon, label, value, color }) => {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
        purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
        indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
        red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    };

    return (
        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <p className="text-slate-500 dark:text-text-secondary text-xs font-medium uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
    );
};

export default SuperAdminDashboard;
