import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, MessageSquare, DollarSign, Activity, AlertCircle, CheckCircle2,
    TrendingUp, CreditCard, PieChart as PieChartIcon, MoreHorizontal,
    Search, Bell
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import AdminHeader from '../components/AdminHeader';
import { useAuth } from '../context/AuthContext';
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

        const fetchData = async () => {
            try {
                const startStr = startDate.toISOString();
                const endStr = endDate.toISOString();
                const res = await axios.get(`http://localhost:5000/api/admin/stats?startDate=${startStr}&endDate=${endStr}`);
                console.log("Admin Data:", res.data); // DEBUG
                setData(res.data);
            } catch (err) {
                console.error("Error loading admin data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData(); // Initial load
        const interval = setInterval(fetchData, 10000); // Auto-refresh

        return () => clearInterval(interval);
    }, [user, startDate, endDate]); // Trigger fetch on date change

    if (!user?.isAdmin) return <Navigate to="/" />;

    // Helper formatting
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });


    // Chart Data Preparation with detailed logging
    console.log("=== CHART DEBUG ===");
    console.log("Full API Response:", data);
    console.log("Message Volume Raw:", data?.graphs?.messageVolume);
    console.log("Revenue Growth Raw:", data?.graphs?.revenueGrowth);

    let messageChartData = data?.graphs?.messageVolume?.map(item => {
        console.log("Processing message item:", item);
        return {
            date: formatDate(item.logDate || item.date),
            count: parseInt(item.count || 0)
        };
    }) || [];

    // Recharts needs at least 2 points to render. If we only have 1, pad with previous/next day
    if (messageChartData.length === 1 && data?.graphs?.messageVolume?.length > 0) {
        const singlePoint = messageChartData[0];
        const date = new Date(data.graphs.messageVolume[0].logDate || data.graphs.messageVolume[0].date);

        // Add previous day with 0 count
        const prevDay = new Date(date);
        prevDay.setDate(prevDay.getDate() - 1);

        // Add next day with 0 count
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        messageChartData = [
            { date: formatDate(prevDay.toISOString()), count: 0 },
            singlePoint,
            { date: formatDate(nextDay.toISOString()), count: 0 }
        ];
    }

    console.log("Processed Message Chart Data:", messageChartData);
    console.log("Message Chart Data Length:", messageChartData.length);

    let revenueChartData = data?.graphs?.revenueGrowth?.map(item => ({
        date: formatDate(item.date),
        amount: parseFloat(item.amount)
    })) || [];

    // Same padding for revenue chart
    if (revenueChartData.length === 1 && data?.graphs?.revenueGrowth?.length > 0) {
        const singlePoint = revenueChartData[0];
        const date = new Date(data.graphs.revenueGrowth[0].date);

        const prevDay = new Date(date);
        prevDay.setDate(prevDay.getDate() - 1);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        revenueChartData = [
            { date: formatDate(prevDay.toISOString()), amount: 0 },
            singlePoint,
            { date: formatDate(nextDay.toISOString()), amount: 0 }
        ];
    }

    console.log("Processed Revenue Chart Data:", revenueChartData);

    const pieData = data?.planDistribution?.map(item => ({
        name: item.plan,
        value: parseInt(item.count)
    })) || [];

    console.log("Plan Distribution Raw:", data?.planDistribution);
    console.log("Pie Chart Data:", pieData);


    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark overflow-y-auto fade-in transition-colors duration-300">
            {/* Header */}
            {/* Header */}
            {/* Header */}
            <AdminHeader>
                <ThemeToggle />
            </AdminHeader>

            {/* Title Section (Moved to Main) */}
            <div className="px-8 pt-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

            <main className="p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full pb-20">

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
                            <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Message Volume (30d)</h3>
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
                            <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Revenue Growth (30d)</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={revenueChartData}>
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
                                            <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* 3. RECENT PURCHASES & PIE CHART */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Purchases List */}
                            <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Purchases</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-3">User</th>
                                                <th className="px-6 py-3">Plan</th>
                                                <th className="px-6 py-3">Amount</th>
                                                <th className="px-6 py-3">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {data.recentPurchases.map((tx, i) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900 dark:text-white">{tx.userName}</div>
                                                        <div className="text-xs text-slate-500">{tx.userEmail}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                            {tx.planName}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                        {formatCurrency(tx.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">
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
                            <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col">
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

                        {/* 4. ACTIVITY LOGS */}
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm p-6">
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
