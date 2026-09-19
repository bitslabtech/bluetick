import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Contact, TrendingUp, Users, Nfc, Calendar, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NfcLinkModal from '../../components/NfcLinkModal';

const DATE_FILTERS = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
];

// Custom Tooltip for the chart
function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(15,23,42,0.92)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '10px 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)'
            }}>
                <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ color: '#818cf8', fontSize: 20, fontWeight: 800, margin: 0 }}>
                    {payload[0].value}
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginLeft: 4 }}>views</span>
                </p>
            </div>
        );
    }
    return null;
}

export default function VcardDashboard() {
    const { user } = useAuth();
    const [vcards, setVcards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);
    const [isLinkOpen, setIsLinkOpen] = useState(false);
    const [linkedNfcCount, setLinkedNfcCount] = useState(0);
    const [totalEnquiries, setTotalEnquiries] = useState(0);
    const [selectedDays, setSelectedDays] = useState(7);
    const [chartData, setChartData] = useState([]);

    // Fetch vcards & enquiry count on mount
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [vcardsRes, enquiriesRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/vcards`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/vcards/data/enquiries`),
                ]);
                setVcards(vcardsRes.data);
                setTotalEnquiries(enquiriesRes.data.length);
            } catch (err) {
                console.error("Failed to load vcard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
        axios.get(`${import.meta.env.VITE_API_URL}/api/nfc/my-cards`).then(res => setLinkedNfcCount(res.data?.length || 0)).catch(() => { });
    }, []);

    // Fetch analytics whenever selectedDays changes
    const fetchAnalytics = useCallback(async (days) => {
        setChartLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vcards/data/analytics?days=${days}`);
            setChartData(res.data.series || []);
        } catch (err) {
            console.error("Failed to load analytics", err);
            setChartData([]);
        } finally {
            setChartLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics(selectedDays);
    }, [selectedDays, fetchAnalytics]);

    const totalViews = vcards.reduce((sum, v) => sum + (v.views || 0), 0);
    const activeCards = vcards.filter(v => v.status === 'active').length;

    // Chart summary for selected period
    const periodViews = chartData.reduce((s, d) => s + d.views, 0);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="mb-6">
                    <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
                    <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>
                <div className="h-48 w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm mb-6"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0"></div>
                            <div className="space-y-2 flex-1">
                                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                                <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 mt-6">
                    <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-6"></div>
                    <div className="h-72 w-full bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">veCard Analytics Overview</h1>
                <p className="text-slate-500 dark:text-slate-400">Track how your digital business cards are performing</p>
            </div>

            {/* NFC Purchase Banner */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-4 md:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-500/20 mb-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl items-center justify-center border border-white/20 shrink-0 shadow-inner">
                            <Nfc className="w-8 h-8 text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold mb-2">Elevate your networking with Physical NFC</h3>
                            <p className="text-indigo-200 max-w-xl text-sm sm:text-base">Order premium Metal Cards, PVC Cards, or Keychains. Tap them on any smartphone to instantly share your digital veCard.</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                        <button onClick={() => setIsLinkOpen(true)} className="px-4 md:px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                            <Nfc className="w-4 h-4" /> Link NFC Device
                        </button>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('open-nfc-store'))} className="px-4 md:px-6 py-3 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                            Buy NFC Products
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 rounded-xl">
                        <Eye className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Views</p>
                        <h3 className="text-2xl font-bold">{totalViews.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 rounded-xl">
                        <Contact className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Active Cards</p>
                        <h3 className="text-2xl font-bold">{activeCards}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-900/30 rounded-xl">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Enquiries Captured</p>
                        <h3 className="text-2xl font-bold">{totalEnquiries.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-xl">
                        <Nfc className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Linked NFC Products</p>
                        <h3 className="text-2xl font-bold">{linkedNfcCount}</h3>
                    </div>
                </div>
            </div>

            {/* Enquiries Chart */}
            <div className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                {/* Chart Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Views Over Time</h3>
                        <p className="text-sm text-slate-400 mt-0.5">
                            {periodViews.toLocaleString()} view{periodViews === 1 ? '' : 's'} in the last {selectedDays} days &mdash; today excluded
                        </p>
                    </div>
                    {/* Date Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
                        {DATE_FILTERS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setSelectedDays(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedDays === f.value
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart */}
                <div className="h-72 w-full relative">
                    {chartLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 rounded-xl z-10 backdrop-blur-sm">
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                    {!chartLoading && chartData.every(d => d.views === 0) ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Calendar className="w-10 h-10 opacity-30" />
                            <p className="text-sm font-medium">No views recorded in this period yet</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEnquiries" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.15)" />
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                    dy={10}
                                    interval={selectedDays > 30 ? Math.floor(chartData.length / 8) : 0}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    allowDecimals={false}
                                    width={30}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    stroke="#4f46e5"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorEnquiries)"
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Top Performing Cards */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-white/5">
                    <h3 className="font-bold">Top Performing VeCards</h3>
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                            <tr>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">Slug</th>
                                <th className="p-4 font-medium">Theme</th>
                                <th className="p-4 font-medium text-right">Total Views</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {vcards.sort((a, b) => b.views - a.views).slice(0, 5).map(v => (
                                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                    <td className="p-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                                        {v.profileImage ? (
                                            <img src={v.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{v.name.charAt(0)}</div>
                                        )}
                                        {v.name}
                                    </td>
                                    <td className="p-4 text-slate-500 font-mono text-xs">/vecards/{v.slug}</td>
                                    <td className="p-4 text-slate-500"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">{v.themeId}</span></td>
                                    <td className="p-4 font-bold text-right">{(v.views || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                            {vcards.length === 0 && (
                                <tr><td colSpan="4" className="p-4 md:p-8 text-center text-slate-400">No VeCards available to display.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                    {vcards.length === 0 && (
                        <p className="p-4 text-center text-slate-400 text-sm">No VeCards available to display.</p>
                    )}
                    {vcards.sort((a, b) => b.views - a.views).slice(0, 5).map(v => (
                        <div key={v.id} className="flex items-center gap-3 p-4">
                            {v.profileImage ? (
                                <img src={v.profileImage} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">{v.name.charAt(0)}</div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{v.name}</p>
                                <p className="text-xs text-slate-400 truncate font-mono">/vecards/{v.slug}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{(v.views || 0).toLocaleString()}</p>
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-500">{v.themeId}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <NfcLinkModal isOpen={isLinkOpen} onClose={() => setIsLinkOpen(false)} vcards={vcards} />
        </div>
    );
}
