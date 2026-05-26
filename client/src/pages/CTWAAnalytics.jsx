import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
    Megaphone, TrendingUp, MousePointerClick, Activity, Link2,
    CheckCircle2, ChevronRight, Loader2, RefreshCw, LogOut,
    DollarSign, Users, Eye, ArrowUpRight, AlertCircle, BarChart2,
    ExternalLink, Image as ImageIcon
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) => {
    if (n === null || n === undefined) return '—';
    return Number(n).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};

const fmtCurrency = (n) => {
    if (n === null || n === undefined) return '—';
    return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'indigo' }) => {
    const colors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500',
        emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500',
        rose:    'bg-rose-50 dark:bg-rose-500/10 text-rose-500',
        amber:   'bg-amber-50 dark:bg-amber-500/10 text-amber-500',
    };
    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
            {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        </div>
    );
};

// ── Wizard Step 1: Facebook Login ─────────────────────────────────────────────
const StepConnectFacebook = ({ onConnected }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFBLogin = () => {
        // Meta's FB.login in dev mode without the JS SDK
        // We use the FB Login Dialog via popup window approach
        const clientId = window.FB_APP_ID || import.meta.env.VITE_FB_APP_ID;
        if (!clientId) {
            setError('VITE_FB_APP_ID is not configured in your .env file.');
            return;
        }

        const redirectUri = `${window.location.origin}/ctwa-analytics`;
        const scope = 'ads_read,ads_management,business_management';
        const fbUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=token`;

        const popup = window.open(fbUrl, 'fb_login', 'width=600,height=600');
        setLoading(true);

        const interval = setInterval(async () => {
            try {
                if (popup.closed) {
                    setLoading(false);
                    clearInterval(interval);
                    return;
                }
                const hash = popup.location.hash;
                if (hash && hash.includes('access_token')) {
                    popup.close();
                    clearInterval(interval);
                    const params = new URLSearchParams(hash.replace('#', ''));
                    const token = params.get('access_token');
                    if (token) {
                        await exchangeToken(token);
                    }
                }
            } catch (e) {
                // Cross-origin errors are expected until FB redirects back
            }
        }, 500);
    };

    const exchangeToken = async (token) => {
        try {
            setLoading(true);
            const authToken = localStorage.getItem('token');
            await axios.post('/api/ctwa/auth', { accessToken: token }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            onConnected();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to connect Facebook account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-20 text-center">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Connect Your Facebook Ads</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                Link your Facebook account to pull real-time Ad Spend data. We only request <strong className="text-slate-700 dark:text-slate-200">read-only</strong> access to your ad reporting.
            </p>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-left">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            <button
                onClick={handleFBLogin}
                disabled={loading}
                className="inline-flex items-center gap-3 bg-[#1877F2] hover:bg-[#0866E0] text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                )}
                {loading ? 'Connecting...' : 'Continue with Facebook'}
            </button>

            <p className="text-xs text-slate-400 mt-4">
                Permissions requested: <code className="bg-slate-100 dark:bg-white/10 px-1 rounded">ads_read</code>, <code className="bg-slate-100 dark:bg-white/10 px-1 rounded">business_management</code>
            </p>
        </div>
    );
};

// ── Wizard Step 2: Select Ad Account ──────────────────────────────────────────
const StepSelectAccount = ({ onSelected }) => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await axios.get('/api/ctwa/ad-accounts', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAccounts(res.data.accounts || []);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load Ad Accounts.');
            } finally {
                setLoading(false);
            }
        };
        fetchAccounts();
    }, []);

    const handleSelect = async () => {
        if (!selected) return;
        try {
            setSaving(true);
            await axios.post('/api/ctwa/select-account', { adAccountId: selected }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSelected();
        } catch (err) {
            setError('Failed to save selection. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto py-16">
            <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-4">
                    <CheckCircle2 className="w-4 h-4" /> Facebook connected!
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Select Your Ad Account</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Choose the Ad Account running your CTWA campaigns.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {accounts.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10">
                    <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No Ad Accounts found for this Facebook account.</p>
                    <p className="text-xs text-slate-400 mt-1">Make sure you have access to at least one active Ad Account.</p>
                </div>
            ) : (
                <div className="space-y-3 mb-6">
                    {accounts.map(acc => (
                        <button
                            key={acc.id}
                            onClick={() => setSelected(acc.id)}
                            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                                selected === acc.id
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark hover:border-indigo-300 dark:hover:border-indigo-700'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">{acc.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {acc.id} · {acc.currency}
                                        {acc.businessName && ` · ${acc.businessName}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${acc.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                                        {acc.status}
                                    </span>
                                    {selected === acc.id && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <button
                onClick={handleSelect}
                disabled={!selected || saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-40"
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Launch Dashboard'}
            </button>
        </div>
    );
};

// ── Main Dashboard (Step 3) ───────────────────────────────────────────────────
const CTWADashboard = ({ onDisconnect }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('last_30d');

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/ctwa/dashboard?dateRange=${dateRange}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error('[CTWA Dashboard]', err);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const handleDisconnect = async () => {
        if (!window.confirm('Disconnect your Facebook Ads account?')) return;
        await axios.delete('/api/ctwa/disconnect', { headers: { Authorization: `Bearer ${token}` } });
        onDisconnect();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-indigo-500" />
                        CTWA Ads Analytics
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Leads from Click-to-WhatsApp campaigns · Ad Account: <span className="font-mono font-bold">{data?.adAccountId}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                        className="text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark text-slate-700 dark:text-white rounded-lg px-3 py-2"
                    >
                        <option value="last_7d">Last 7 Days</option>
                        <option value="last_14d">Last 14 Days</option>
                        <option value="last_30d">Last 30 Days</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                    </select>
                    <button onClick={fetchDashboard} disabled={loading} className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleDisconnect} className="p-2 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total CTWA Leads" value={loading ? '—' : fmt(data?.totalLeads)} color="indigo" />
                <StatCard icon={DollarSign} label="Total Ad Spend" value={loading ? '—' : fmtCurrency(data?.totalSpend)} color="rose" />
                <StatCard
                    icon={MousePointerClick}
                    label="Avg. Cost Per Lead"
                    value={loading ? '—' : (data?.totalLeads > 0 && data?.totalSpend > 0
                        ? fmtCurrency(data.totalSpend / data.totalLeads)
                        : '—')}
                    color="amber"
                />
                <StatCard icon={Activity} label="Active Campaigns" value={loading ? '—' : fmt(data?.ads?.length)} color="emerald" />
            </div>

            {/* Ads Table */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Campaigns Breakdown</h3>
                    <span className="text-xs text-slate-400 font-medium">Spend data from Meta · Leads from your inbox</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : !data?.ads?.length ? (
                    <div className="text-center py-16 px-6">
                        <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">No CTWA Leads Yet</h4>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            When customers click your WhatsApp Ads and message you, their data will show up here automatically.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5">
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3 w-64">Ad</th>
                                    <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Leads</th>
                                    <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Spend</th>
                                    <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">CPL</th>
                                    <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Impressions</th>
                                    <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Clicks</th>
                                    <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">CTR</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {data.ads.map(ad => (
                                    <tr key={ad.adId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {ad.imageUrl ? (
                                                    <img src={ad.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4 text-indigo-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white text-sm leading-tight max-w-[180px] truncate">{ad.adName}</div>
                                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{ad.adId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{fmt(ad.leads)}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                                            {fmtCurrency(ad.spend)}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {ad.costPerLead !== null ? (
                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(ad.costPerLead)}</span>
                                            ) : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{fmt(ad.impressions)}</td>
                                        <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{fmt(ad.clicks)}</td>
                                        <td className="px-4 py-4 text-right">
                                            {ad.ctr !== null ? (
                                                <span className={`font-medium ${parseFloat(ad.ctr) >= 1 ? 'text-emerald-500' : 'text-slate-500'}`}>{ad.ctr}%</span>
                                            ) : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {ad.sourceUrl && (
                                                <a href={ad.sourceUrl} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors inline-flex">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
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

// ── Root Component with Wizard Flow ──────────────────────────────────────────
export default function CTWAAnalytics() {
    const { user } = useAuth();
    const [step, setStep] = useState('loading'); // 'loading' | 'connect-fb' | 'select-account' | 'dashboard'

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await axios.get('/api/ctwa/status', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.connected && res.data.adAccountId) {
                    setStep('dashboard');
                } else if (res.data.connected) {
                    setStep('select-account');
                } else {
                    setStep('connect-fb');
                }
            } catch {
                setStep('connect-fb');
            }
        };
        checkStatus();
    }, []);

    if (step === 'loading') return (
        <div className="flex items-center justify-center min-h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto">
            {/* Progress steps indicator */}
            {step !== 'dashboard' && (
                <div className="flex items-center gap-4 mb-10">
                    {['connect-fb', 'select-account'].map((s, idx) => (
                        <React.Fragment key={s}>
                            <div className={`flex items-center gap-2 ${step === s ? 'text-indigo-600 dark:text-indigo-400' : step === 'dashboard' || (s === 'connect-fb' && step === 'select-account') ? 'text-emerald-500' : 'text-slate-400'}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === s ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : (s === 'connect-fb' && step === 'select-account') ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-slate-200 dark:border-white/10'}`}>
                                    {(s === 'connect-fb' && step === 'select-account') ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                </div>
                                <span className="text-xs font-medium hidden sm:block">{s === 'connect-fb' ? 'Connect Facebook' : 'Select Ad Account'}</span>
                            </div>
                            {idx < 1 && <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {step === 'connect-fb'     && <StepConnectFacebook onConnected={() => setStep('select-account')} />}
            {step === 'select-account' && <StepSelectAccount onSelected={() => setStep('dashboard')} />}
            {step === 'dashboard'      && <CTWADashboard onDisconnect={() => setStep('connect-fb')} />}
        </div>
    );
}
