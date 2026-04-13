import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Briefcase, TrendingUp, DollarSign, Clock, CheckCircle,
    Users, Award, AlertCircle, ArrowRight, Copy, ExternalLink, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

const TechPartner = () => {
    const { user } = useAuth();
    const { showToast } = useUI();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(user?.techPartnerStatus || 'none');
    const [applying, setApplying] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/referrals/tech-partner');
            setData(res.data);
            setStatus(res.data.techPartnerStatus);
        } catch (err) {
            if (err.response?.status === 403) {
                // Not yet approved — show the application UI
                setData(null);
            } else {
                showToast({ type: 'error', message: 'Failed to load Tech Partner data.' });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApply = async () => {
        setApplying(true);
        try {
            const res = await axios.post('http://127.0.0.1:5000/api/referrals/apply-partner');
            showToast({ type: 'success', message: res.data.message });
            setStatus('pending');
        } catch (err) {
            showToast({ type: 'error', message: err.response?.data?.error || 'Failed to apply.' });
        } finally {
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // ── Application / Status screens for non-approved users ─────────────────
    if (status !== 'approved') {
        return <ApplicationView status={status} onApply={handleApply} applying={applying} />;
    }

    // ── Approved Partner Dashboard ───────────────────────────────────────────
    const { stats, earnings, techPartnerBalance, minPayoutBalance, commissionRate } = data || {};
    const canRequestPayout = (techPartnerBalance || 0) >= (minPayoutBalance || 10000);

    return (
        <div className="px-4 py-8 lg:px-12 max-w-7xl mx-auto w-full font-display">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Briefcase className="w-8 h-8 text-indigo-500" /> Tech Partner Portal
                        </h1>
                        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider">
                            ✓ Approved
                        </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                        You earn <strong>{commissionRate || 20}%</strong> commission on every plan purchased by your referred users.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 rounded-xl text-slate-600 dark:text-white hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Total Earned"
                    value={`₹${(stats?.totalEarned || 0).toLocaleString()}`}
                    icon={DollarSign}
                    color="text-emerald-500"
                    bg="bg-emerald-50 dark:bg-emerald-500/10"
                />
                <StatCard
                    label="Available Balance"
                    value={`₹${(techPartnerBalance || 0).toLocaleString()}`}
                    icon={TrendingUp}
                    color="text-indigo-500"
                    bg="bg-indigo-50 dark:bg-indigo-500/10"
                />
                <StatCard
                    label="Total Paid Out"
                    value={`₹${(stats?.totalPaid || 0).toLocaleString()}`}
                    icon={CheckCircle}
                    color="text-blue-500"
                    bg="bg-blue-50 dark:bg-blue-500/10"
                />
                <StatCard
                    label="Total Referrals"
                    value={stats?.totalReferrals || 0}
                    icon={Users}
                    color="text-purple-500"
                    bg="bg-purple-50 dark:bg-purple-500/10"
                />
            </div>

            {/* Payout Request Banner */}
            <div className={`rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                canRequestPayout
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30'
                    : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'
            }`}>
                <div>
                    <h3 className={`font-bold text-lg mb-1 ${canRequestPayout ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {canRequestPayout ? '🎉 You\'re eligible for a payout!' : 'Payout Progress'}
                    </h3>
                    <p className={`text-sm ${canRequestPayout ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {canRequestPayout
                            ? `Your balance of ₹${(techPartnerBalance || 0).toLocaleString()} meets the minimum payout threshold of ₹${(minPayoutBalance || 10000).toLocaleString()}.`
                            : `Build up ₹${((minPayoutBalance || 10000) - (techPartnerBalance || 0)).toLocaleString()} more to reach the ₹${(minPayoutBalance || 10000).toLocaleString()} payout threshold.`
                        }
                    </p>
                    {!canRequestPayout && (
                        <div className="mt-3 w-full max-w-sm bg-slate-200 dark:bg-white/10 rounded-full h-2">
                            <div
                                className="bg-indigo-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, ((techPartnerBalance || 0) / (minPayoutBalance || 10000)) * 100)}%` }}
                            />
                        </div>
                    )}
                </div>
                <button
                    disabled={!canRequestPayout}
                    onClick={() => showToast({ type: 'info', message: 'Contact support to process your payout. Our team will reach out within 48 hours.' })}
                    className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                        canRequestPayout
                            ? 'bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    Request Payout
                </button>
            </div>

            {/* Earnings Table */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Commission History</h3>
                    <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold">
                        {earnings?.length || 0} records
                    </span>
                </div>

                {earnings && earnings.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5">
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Plan</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Plan Price</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Commission</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {earnings.map((e) => (
                                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sm text-slate-900 dark:text-white">{e.planName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            ₹{e.planPrice?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                +₹{e.commissionAmount?.toLocaleString()} ({e.commissionRate}%)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(e.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                e.status === 'paid'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
                                            }`}>
                                                {e.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <DollarSign className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-slate-900 dark:text-white font-bold mb-1">No commissions yet</h3>
                        <p className="text-slate-500 text-sm">Share your referral link — commissions appear here when referred users purchase plans.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Application / Status View ────────────────────────────────────────────────
const ApplicationView = ({ status, onApply, applying }) => {
    const isPending = status === 'pending';
    const isRejected = status === 'rejected';

    const perks = [
        { icon: '💰', title: '20% Revenue Share', desc: 'Earn 20% commission on every plan purchase made by your referred clients.' },
        { icon: '📊', title: 'Partner Dashboard', desc: 'Access a dedicated financial dashboard showing real-time earnings and ACV.' },
        { icon: '🏷️', title: 'Tech Partner Badge', desc: 'Get an exclusive "Tech Partner" badge across the platform.' },
        { icon: '💳', title: 'Cash Payouts', desc: 'Unlike standard referrals, Tech Partners earn real currency — not just platform credits.' }
    ];

    return (
        <div className="px-4 py-8 lg:px-12 max-w-5xl mx-auto w-full font-display">
            {/* Hero */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-3xl p-10 lg:p-16 text-white shadow-2xl relative overflow-hidden mb-10">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />
                <div className="absolute -bottom-16 -left-10 w-80 h-80 bg-white/5 rounded-full pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Briefcase className="w-10 h-10 text-indigo-200" />
                        <h1 className="text-4xl font-bold">Tech Partner Program</h1>
                    </div>
                    <p className="text-indigo-100 text-xl max-w-2xl leading-relaxed mb-8">
                        Become an authorized technology partner and earn real revenue sharing on all plans your network buys.
                        Not credits — actual currency payouts directly to you.
                    </p>

                    {!isPending && !isRejected && (
                        <div className="flex items-center gap-4 text-sm text-indigo-200 mb-8">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                Requires purchasing a 1-year annual plan
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                Subject to admin review
                            </div>
                        </div>
                    )}

                    {isPending ? (
                        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-6 py-4 inline-flex items-center gap-3">
                            <Clock className="w-6 h-6 text-amber-300" />
                            <div>
                                <div className="font-bold text-white">Application Under Review</div>
                                <div className="text-indigo-200 text-sm">Our team will review your application shortly.</div>
                            </div>
                        </div>
                    ) : isRejected ? (
                        <div className="bg-red-500/30 border border-red-400/30 rounded-2xl px-6 py-4 inline-flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-red-300" />
                            <div>
                                <div className="font-bold text-white">Application Not Approved</div>
                                <div className="text-red-200 text-sm">Your application was reviewed but not approved at this time. Contact support for more information.</div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={onApply}
                            disabled={applying}
                            className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-8 py-4 rounded-2xl transition-all shadow-xl text-lg disabled:opacity-60"
                        >
                            {applying ? (
                                <div className="w-5 h-5 rounded-full border-2 border-indigo-300 border-t-indigo-700 animate-spin" />
                            ) : (
                                <Award className="w-5 h-5" />
                            )}
                            Apply Now — It's Free
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Perks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                {perks.map((perk, i) => (
                    <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-3xl mb-3">{perk.icon}</div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">{perk.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{perk.desc}</p>
                    </div>
                ))}
            </div>

            {/* How It Works */}
            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { step: '01', title: 'Apply', desc: 'Submit your application. We\'ll review within 48 hours.' },
                        { step: '02', title: 'Get Approved', desc: 'Once approved, share your referral link with your network.' },
                        { step: '03', title: 'Earn Cash', desc: 'Get 20% commission on every plan purchase by your referrals.' }
                    ].map((s) => (
                        <div key={s.step} className="flex gap-4">
                            <div className="w-10 h-10 shrink-0 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                                {s.step}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white mb-1">{s.title}</div>
                                <div className="text-slate-500 dark:text-slate-400 text-sm">{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── Shared sub-components ────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, bg }) => (
    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
        <div className={`w-12 h-12 ${bg} ${color} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">{label}</div>
        </div>
    </div>
);

export default TechPartner;
