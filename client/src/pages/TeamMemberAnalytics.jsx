import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, Users, MessageSquare, FileText, BarChart2,
    Calendar, Clock, Mail, Shield, Send, CheckCircle2, XCircle,
    Activity, UserCheck, Loader2, TrendingUp, Phone
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const ROLE_COLORS = {
    owner: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
    admin: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
    editor: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
    viewer: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
};

const STATUS_STYLE = {
    COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    SENDING: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    FAILED: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

function KpiCard({ icon: Icon, label, value, color, sub }) {
    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all duration-300">
            <div className={`p-3.5 rounded-2xl ${color} flex-shrink-0`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
                {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
const formatShort = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
const timeSince = (d) => {
    if (!d) return 'Never';
    const sec = Math.floor((Date.now() - new Date(d)) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
};

export default function TeamMemberAnalytics() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const teamPolicy = user?.teamPolicy || { inboxVisibility: 'see_all', phonePrivacy: 'visible' };
    const isSubMember = !!user?.parentUserId;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const renderName = (name, phone) => {
        const isActuallyPhone = !name || name === phone || /^\d+$/.test(name.replace(/\D/g, ''));
        if (isActuallyPhone && isSubMember) {
            if (teamPolicy.phonePrivacy === 'blurred') return <span className="blur-sm select-none">{phone || name}</span>;
            if (teamPolicy.phonePrivacy === 'masked') return `****${(phone || name)?.slice(-4)}`;
        }
        return name || phone;
    };

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`${API}/api/team/${id}/stats`, {
                    headers: { }
                });
                setData(res.data);
            } catch (e) {
                setError(e.response?.data?.error || 'Failed to load analytics.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center h-full min-h-screen bg-slate-50 dark:bg-background-dark">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-sm text-slate-400">Loading analytics…</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-full min-h-screen bg-slate-50 dark:bg-background-dark">
            <div className="text-center">
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">{error}</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-indigo-500 hover:underline text-sm">← Go back</button>
            </div>
        </div>
    );

    const { member, summary, activityTimeline, recentMessages, recentContacts } = data;
    const roleStyle = ROLE_COLORS[member?.teamRole] || ROLE_COLORS.viewer;
    const totalActivity = activityTimeline.reduce((s, d) => s + d.campaigns, 0);
    const peakDay = [...activityTimeline].sort((a, b) => b.campaigns - a.campaigns)[0];

    return (
        <div className="bg-slate-50 dark:bg-background-dark min-h-screen">

            {/* ── Header ───────────────────────────────────── */}
            <div className="bg-white dark:bg-background-dark border-b border-slate-200 dark:border-surface-dark px-6 py-5 sticky top-0 z-20 backdrop-blur-sm bg-white/90 dark:bg-background-dark/90">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                            {member?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">{member?.name}</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Member Analytics · Last 30 Days</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${roleStyle.bg} ${roleStyle.text}`}>
                        {member?.teamRole}
                    </span>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

                {/* ── Member Profile Card ─────────────────────── */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-indigo-500/20">
                                {member?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${roleStyle.dot} border-2 border-white dark:border-surface-dark`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{member?.name}</h2>
                            <div className="flex flex-wrap gap-4 mt-2">
                                <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                                    <Mail className="w-3.5 h-3.5" /> {member?.email}
                                </span>
                                <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                                    <Shield className="w-3.5 h-3.5" /> {member?.teamRole}
                                </span>
                                <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" /> Joined {formatDate(member?.createdAt)}
                                </span>
                                <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                                    <Clock className="w-3.5 h-3.5" /> Last active {timeSince(member?.lastLogin)}
                                </span>
                            </div>
                            {member?.teamPermissions?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {member.teamPermissions.map(p => (
                                        <span key={p} className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-full uppercase tracking-wide">
                                            {p.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── KPI Strip ────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon={Send} label="Campaigns Sent" value={summary.messagesSent} color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" sub="All time" />
                    <KpiCard icon={Users} label="Contacts Added" value={summary.contactsAdded} color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" sub="All time" />
                    <KpiCard icon={FileText} label="Templates Authored" value={summary.templatesCreated} color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" sub="All time" />
                    <KpiCard icon={TrendingUp} label="Activity (30d)" value={totalActivity} color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" sub={peakDay?.campaigns > 0 ? `Peak: ${formatShort(peakDay?.date)} (${peakDay?.campaigns})` : 'No recent activity'} />
                </div>

                {/* ── Activity Timeline Chart ───────────────────── */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Campaign Activity</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Campaigns sent per day over the last 30 days</p>
                        </div>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                            <Activity className="w-5 h-5 text-indigo-500" />
                        </div>
                    </div>
                    <div className="h-52">
                        {totalActivity > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activityTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-white/10" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        tickFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        interval={4} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', fontSize: '12px' }}
                                        labelFormatter={v => formatDate(v)}
                                        formatter={(v) => [v, 'Campaigns']}
                                    />
                                    <Area type="monotone" dataKey="campaigns" stroke="#6366f1" strokeWidth={2.5} fill="url(#actGrad)" activeDot={{ r: 5 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <BarChart2 className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                                <p className="text-sm text-slate-400 dark:text-slate-500">No campaign activity in the last 30 days</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Two-column lower section ──────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Recent Campaigns */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white">Recent Campaigns</h3>
                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <Send className="w-4 h-4 text-indigo-500" />
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {recentMessages.length > 0 ? recentMessages.map(m => (
                                <div key={m.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{m.name}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-slate-400">{formatDate(m.date)}</span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Users className="w-3 h-3" />{m.recipients?.toLocaleString() || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex-shrink-0 ${STATUS_STYLE[m.status] || STATUS_STYLE.FAILED}`}>
                                        {m.status}
                                    </span>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                    <Send className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                    <p className="text-sm text-slate-400">No campaigns sent yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right column: Recent Contacts + Permissions */}
                    <div className="space-y-6">
                        {/* Recent Contacts */}
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-white">Recently Added Contacts</h3>
                                <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <UserCheck className="w-4 h-4 text-purple-500" />
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {recentContacts.length > 0 ? recentContacts.map(c => (
                                    <div key={c.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                            {c.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{renderName(c.name, c.phone)}</p>
                                            <p className="text-xs text-slate-400">
                                                <span className={isSubMember && teamPolicy.phonePrivacy === 'blurred' ? 'blur-sm select-none' : ''}>
                                                    {isSubMember && teamPolicy.phonePrivacy === 'masked'
                                                        ? `****${c.phone?.slice(-4) || ''}`
                                                        : c.phone
                                                    }
                                                </span>
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-slate-400 flex-shrink-0">{formatShort(c.date)}</span>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                                        <Users className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                        <p className="text-sm text-slate-400">No contacts added yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Permissions Summary */}
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-slate-400" /> Permissions
                            </h3>
                            {['send_campaigns', 'manage_contacts', 'manage_templates', 'view_reports'].map(p => {
                                const has = member?.teamPermissions?.includes(p);
                                return (
                                    <div key={p} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
                                        <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">{p.replace(/_/g, ' ')}</span>
                                        {has
                                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            : <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
