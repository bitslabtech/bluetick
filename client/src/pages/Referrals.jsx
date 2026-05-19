import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TechPartner from './TechPartner';
import { Gift, Copy, CheckCircle, Users, ArrowRight, Activity, Calendar, Award, Briefcase, DollarSign, TrendingUp, AlertCircle, X } from 'lucide-react';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { formatDistanceToNow } from 'date-fns';

const Referrals = () => {
    const { user } = useAuth();
    const { showToast } = useUI();

    // Legacy Referral States
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copying, setCopying] = useState(false);

    // Tech Partner States
    const [partnerData, setPartnerData] = useState(null);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [applyForm, setApplyForm] = useState({ countryCode: '+91', phoneDigits: '', notes: '' });
    const [applying, setApplying] = useState(false);

    // Derived Status (fallback to checking the user object if API hasn't loaded)
    const tpStatus = partnerData?.status || user?.techPartnerStatus || 'none';

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}`, 'x-auth-token': token };

                // If they are an approved tech partner, fetch the tech partner dashboard
                if (user?.techPartnerStatus === 'approved') {
                    try {
                        const pdRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/partner/dashboard`, { headers });
                        setPartnerData(pdRes.data);
                    } catch (pdErr) {
                        if (pdErr.response?.status === 404 || pdErr.response?.status === 403) {
                            // User's TechPartner profile was deleted or status auto-healed previously.
                            // Fetch standard standard referrals stats instead.
                            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/referrals/stats`, { headers });
                            setStats(res.data);
                            setPartnerData({ status: 'none' });
                        } else {
                            throw pdErr;
                        }
                    }
                } else {
                    // Fetch standard referral stats
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/referrals/stats`, { headers });
                    setStats(res.data);

                    // Fetch status just in case it updated
                    try {
                        const meRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, { headers });
                        setPartnerData({ status: meRes.data.user.techPartnerStatus });
                    } catch (e) { }
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                showToast({ type: 'error', message: 'Failed to load dashboard data' });
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [showToast, user]);

    const handleCopy = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopying(true);
        showToast({ type: 'success', message: 'Link copied to clipboard!' });
        setTimeout(() => setCopying(false), 2000);
    };

    const submitApplication = async (e) => {
        e.preventDefault();
        setApplying(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}`, 'x-auth-token': token };
            const payload = {
                phoneNumber: `${applyForm.countryCode} ${applyForm.phoneDigits}`,
                notes: applyForm.notes
            };
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/partner/apply`, payload, { headers });
            showToast({ type: 'success', message: 'Tech Partner application submitted!' });
            setPartnerData({ ...partnerData, status: res.data.status });
            setShowApplyModal(false);
        } catch (err) {
            showToast({ type: 'error', message: err.response?.data?.error || 'Failed to submit application' });
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

    // ─────────────────────────────────────────────────────────────────
    // TECH PARTNER DASHBOARD (APPROVED)
    // ─────────────────────────────────────────────────────────────────
    if (tpStatus === 'approved') {
        return (
            <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
                <TopHeader 
                    title="B2B Tech Partner"
                    subtitle="Welcome to your partner dashboard. Share your link to earn cash commissions."
                    rightContent={
                        <div className="bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 border border-purple-200 dark:border-purple-500/20">
                            <CheckCircle className="w-4 h-4" /> Active Partner
                        </div>
                    }
                />
                <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative pb-32">
                    <TechPartner />
                </div>
            </div>
        );
    }


    // ─────────────────────────────────────────────────────────────────
    // STANDARD REFER & EARN DASHBOARD (NONE, PENDING, REJECTED)
    // ─────────────────────────────────────────────────────────────────
    const { activeRules, totals, stats: history } = stats || {};
    const isSystemEnabled = activeRules?.enabled === true;
    const refLink = stats?.referralCode ? `${window.location.origin}/register?ref=${stats.referralCode}` : `Not Generated`;

    const getRewardDescription = (rewards) => {
        if (!rewards || rewards.length === 0) return 'No configuration';
        return rewards.map(r => {
            if (r.type === 'validity_months') return `+${r.value} Months`;
            if (r.type === 'ai_tokens') return `+${r.value} AI Tokens`;
            if (r.type === 'extra_messages') return `+${r.value} Messages Limit`;
            if (r.type === 'extra_contacts') return `+${r.value} Contacts Limit`;
            return '';
        }).join(' & ');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display transition-colors duration-300">
            <TopHeader 
                title="Refer & Earn"
                subtitle="Invite friends and unlock premium rewards seamlessly."
            />
            <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 max-w-7xl mx-auto w-full custom-scrollbar relative pb-32">

            {!isSystemEnabled ? (
                <div className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center">
                    <Gift className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Referral Program is Currently Paused</h3>
                    <p className="text-slate-500">The referral program is currently disabled by the administrators. Please check back later.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Share Banner (Left) */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-full">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <Gift className="w-48 h-48 transform -rotate-12" />
                            </div>
                            <div className="relative z-10 mb-6">
                                <h2 className="text-2xl md:text-3xl font-bold mb-4">Invite your network, get rewarded instantly.</h2>
                                <p className="text-indigo-100 mb-8 leading-relaxed">
                                    Share your unique link. When they purchase any paid plan, you both get instant platform rewards.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                                        <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">You Get</div>
                                        <div className="text-lg font-bold text-white">{getRewardDescription(activeRules?.referrerRewards)}</div>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                                        <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">They Get</div>
                                        <div className="text-lg font-bold text-white">{getRewardDescription(activeRules?.refereeRewards)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 bg-black/30 border border-white/20 rounded-xl px-4 py-3 font-mono text-sm truncate flex items-center">
                                    {refLink}
                                </div>
                                <button
                                    onClick={() => handleCopy(refLink)}
                                    className="flex items-center justify-center gap-2 bg-white text-indigo-600 hover:bg-slate-50 font-bold px-6 py-3 rounded-xl transition-all shadow-lg min-w-[120px] whitespace-nowrap"
                                >
                                    {copying ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                    {copying ? 'Copied' : 'Copy Link'}
                                </button>
                            </div>
                        </div>

                        {/* Tech Partner CTA (Right) */}
                        {tpStatus === 'pending' ? (
                            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full">
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle className="w-8 h-8 text-amber-500" />
                                </div>
                                <h3 className="text-xl font-bold text-amber-900 dark:text-amber-400 mb-2">Application Pending</h3>
                                <p className="text-amber-800 dark:text-amber-300/80 max-w-md">Your application to become a B2B Tech Partner is under review. We will notify you once a decision is made.</p>
                            </div>
                        ) : (tpStatus === 'none' || tpStatus === 'rejected') && (
                            <div className="bg-gradient-to-br from-slate-900 to-black rounded-2xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-white/10 h-full">
                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-blue-500">
                                    <Briefcase className="w-48 h-48 transform -rotate-12" />
                                </div>
                                <div className="relative z-10 mb-6">
                                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-4 border border-blue-500/30">
                                        Premium Partner Program
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold mb-4">Become a Tech Partner</h2>
                                    <p className="text-slate-300 leading-relaxed mb-6">
                                        Level up your earning potential. Earn <strong className="text-white">up to 30% real cash commission</strong> directly to your bank account recursively.
                                    </p>

                                    <div className="space-y-4">
                                        {[
                                            'Custom affiliate tracking codes',
                                            'Dedicated ROI analytics dashboard',
                                            'Automated cash payouts'
                                        ].map((feature, i) => (
                                            <div key={i} className="flex items-center gap-3 text-slate-300 text-sm font-medium">
                                                <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <button
                                        onClick={() => setShowApplyModal(true)}
                                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        Apply for Program <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center text-xl">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totals?.totalInvited || 0}</div>
                                <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Clicks/Signups</div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center text-xl">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totals?.totalConverted || 0}</div>
                                <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Converted Invitations</div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center text-xl">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totals?.totalMonthsEarned || 0}</div>
                                <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Rewards Earned</div>
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Your Invitations</h3>
                            <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold">
                                {history?.length || 0} People
                            </span>
                        </div>

                        {history && history.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/5">
                                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">User Details</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Joined Date</th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {history.map((hLine) => (
                                            <tr key={hLine.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                                                            {hLine.name.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{hLine.name}</div>
                                                            <div className="text-xs text-slate-500">{hLine.email.replace(/(.{2})(.*)(?=@)/,
                                                                (gp1, gp2, gp3) => gp1 + gp3.replace(/./g, '*')
                                                            )}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(hLine.joinedAt).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${hLine.status === 'Converted'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
                                                        }`}>
                                                        {hLine.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <h3 className="text-slate-900 dark:text-white font-bold mb-1">No invitations yet</h3>
                                <p className="text-slate-500 text-sm">Share your link to start earning rewards.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Application Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-indigo-500" /> Tech Partner Application
                            </h3>
                            <button onClick={() => setShowApplyModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={submitApplication} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">WhatsApp / Phone Number</label>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <select
                                            className="w-28 h-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                                            value={applyForm.countryCode}
                                            onChange={e => setApplyForm({ ...applyForm, countryCode: e.target.value })}
                                        >
                                            <option value="+91">🇮🇳 +91</option>
                                            <option value="+1">🇺🇸 +1</option>
                                            <option value="+44">🇬🇧 +44</option>
                                            <option value="+61">🇦🇺 +61</option>
                                            <option value="+971">🇦🇪 +971</option>
                                        </select>
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        value={applyForm.phoneDigits}
                                        onChange={e => setApplyForm({ ...applyForm, phoneDigits: e.target.value.replace(/[^0-9]/g, '') })}
                                        placeholder="98765 43210"
                                        className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">How will you promote us?</label>
                                <textarea
                                    required
                                    value={applyForm.notes}
                                    onChange={e => setApplyForm({ ...applyForm, notes: e.target.value })}
                                    placeholder="I have an agency with 50+ clients..."
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                                />
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-4 rounded-xl text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed">
                                <b>Note:</b> Submitting this application will notify our team. If approved, your "Refer & Earn" dashboard will be upgraded to the B2B Tech Partner dashboard.
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowApplyModal(false)} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={applying || !applyForm.notes}
                                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    {applying ? <div className="w-4 h-4 rounded-full border-2 border-indigo-300 border-t-white animate-spin"></div> : <CheckCircle className="w-4 h-4" />}
                                    Submit Application
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default Referrals;
