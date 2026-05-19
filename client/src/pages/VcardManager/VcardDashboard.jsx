import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Contact, TrendingUp, Users, Nfc } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NfcStoreModal from '../../components/NfcStoreModal';
import NfcLinkModal from '../../components/NfcLinkModal';

export default function VcardDashboard() {
    const { user } = useAuth();
    const [vcards, setVcards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isLinkOpen, setIsLinkOpen] = useState(false);
    const [linkedNfcCount, setLinkedNfcCount] = useState(0);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vcards`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                setVcards(res.data);
            } catch (err) {
                console.error("Failed to load vcard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();

        // Fetch linked NFC card count
        axios.get(`${import.meta.env.VITE_API_URL}/api/nfc/my-cards`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        }).then(res => setLinkedNfcCount(res.data?.length || 0)).catch(() => {});
    }, []);

    // Listen for sidebar banner "Shop Now" click from any vCard sub-page
    useEffect(() => {
        const handler = () => setIsStoreOpen(true);
        window.addEventListener('open-nfc-store', handler);
        return () => window.removeEventListener('open-nfc-store', handler);
    }, []);

    const totalViews = vcards.reduce((sum, v) => sum + (v.views || 0), 0);
    const activeCards = vcards.filter(v => v.status === 'active').length;

    // Mock chart data for now since we don't have time-series view tracking on the backend yet
    const chartData = [
        { name: 'Mon', views: Math.round(totalViews * 0.1) },
        { name: 'Tue', views: Math.round(totalViews * 0.15) },
        { name: 'Wed', views: Math.round(totalViews * 0.2) },
        { name: 'Thu', views: Math.round(totalViews * 0.1) },
        { name: 'Fri', views: Math.round(totalViews * 0.25) },
        { name: 'Sat', views: Math.round(totalViews * 0.15) },
        { name: 'Sun', views: Math.round(totalViews * 0.05) },
    ];

    if (loading) {
        return <div className="p-8 animate-pulse text-slate-500">Loading analytics...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">veCard Analytics Overview</h1>
                <p className="text-slate-500 dark:text-slate-400">Track how your digital business cards are performing</p>
            </div>

            {/* NFC Purchase Banner */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-500/20 mb-6">
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
                        <button onClick={() => setIsLinkOpen(true)} className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                            <Nfc className="w-4 h-4" /> Link NFC Device
                        </button>
                        <button onClick={() => setIsStoreOpen(true)} className="px-6 py-3 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                            Buy NFC Products
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 rounded-xl">
                        <Eye className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Views</p>
                        <h3 className="text-2xl font-bold">{totalViews}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 rounded-xl">
                        <Contact className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Active Cards</p>
                        <h3 className="text-2xl font-bold">{activeCards}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-900/30 rounded-xl">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Enquiries Captured</p>
                        <h3 className="text-2xl font-bold">0</h3> {/* Placeholder */}
                    </div>
                </div>
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-xl">
                        <Nfc className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Linked NFC Products</p>
                        <h3 className="text-2xl font-bold">{linkedNfcCount}</h3>
                    </div>
                </div>
            </div>

            {/* Views Chart */}
            <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-bold mb-6">Views Over Time (This Week)</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ stroke: '#4f46e5', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area type="monotone" dataKey="views" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Performing Cards */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-white/5">
                    <h3 className="font-bold">Top Performing veCards</h3>
                </div>
                <div className="overflow-x-auto">
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
                                    <td className="p-4 text-slate-500">{v.slug}</td>
                                    <td className="p-4 text-slate-500"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">{v.themeId}</span></td>
                                    <td className="p-4 font-bold text-right">{v.views}</td>
                                </tr>
                            ))}
                            {vcards.length === 0 && (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No veCards available to display.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <NfcStoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
            <NfcLinkModal isOpen={isLinkOpen} onClose={() => setIsLinkOpen(false)} vcards={vcards} />
        </div>
    );
}
