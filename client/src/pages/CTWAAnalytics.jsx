import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
    Megaphone, TrendingUp, MousePointerClick, Activity, Link2,
    CheckCircle2, ChevronRight, Loader2, RefreshCw, LogOut,
    DollarSign, Users, Eye, ArrowUpRight, AlertCircle, BarChart2,
    ExternalLink, Image as ImageIcon, Shield, FlaskConical, Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) => {
    if (n === null || n === undefined) return '—';
    return Number(n).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};

const fmtCurrency = (n, currencyCode = 'INR') => {
    if (n === null || n === undefined) return '—';
    
    // Choose appropriate locale based on currency for native formatting
    const locales = {
        INR: 'en-IN',
        USD: 'en-US',
        EUR: 'de-DE', 
        GBP: 'en-GB'
    };
    const locale = locales[currencyCode] || 'en-US';

    return new Intl.NumberFormat(locale, { 
        style: 'currency', 
        currency: currencyCode,
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(Number(n));
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
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-200 dark:border-white/10 shadow-sm">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${colors[color]}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">{value}</div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
            {sub && <div className="text-[10px] sm:text-xs text-slate-400 mt-1">{sub}</div>}
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
            await axios.post('/api/ctwa/auth', { accessToken: token }, {
                withCredentials: true
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
                className="inline-flex items-center gap-3 bg-[#1877F2] hover:bg-[#0866E0] text-white font-bold px-4 md:px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
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
                    withCredentials: true
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
                withCredentials: true
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

    // ── Facebook Page ID (manual override) ──────────────────────────────────
    const [pageId, setPageId]           = useState('');
    const [pageIdInput, setPageIdInput] = useState('');
    const [pageIdSaving, setPageIdSaving] = useState(false);

    // Load page ID from status
    useEffect(() => {
        axios.get('/api/ctwa/status', { withCredentials: true }).then(res => {
            if (res.data.pageId) { setPageId(res.data.pageId); setPageIdInput(res.data.pageId); }
        }).catch(() => {});
    }, []);

    const handleSavePageId = async () => {
        if (!pageIdInput.trim()) return toast.error('Enter your Facebook Page ID');
        setPageIdSaving(true);
        try {
            const res = await axios.post('/api/ctwa/save-page', { pageId: pageIdInput.trim() }, { withCredentials: true });
            setPageId(res.data.pageId);
            toast.success('✅ Facebook Page ID saved!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save Page ID');
        } finally { setPageIdSaving(false); }
    };

    // ── CAPI Config state ────────────────────────────────────────────────────
    const [capiPixelId, setCapiPixelId]           = useState('');
    const [capiAccessToken, setCapiAccessToken]   = useState('');
    const [capiTestCode, setCapiTestCode]         = useState('');
    const [capiSaving, setCapiSaving]             = useState(false);
    const [capiTesting, setCapiTesting]           = useState(false);
    const [capiSaved, setCapiSaved]               = useState(false);

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/ctwa/dashboard?dateRange=${dateRange}`, {
                withCredentials: true
            });
            setData(res.data);
        } catch (err) {
            console.error('[CTWA Dashboard]', err);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    // Load existing CAPI config on mount
    useEffect(() => {
        axios.get('/api/ctwa/capi-config', { withCredentials: true })
            .then(res => {
                if (res.data.pixelId)     setCapiPixelId(res.data.pixelId);
                if (res.data.accessToken) setCapiAccessToken('••••••••');
                if (res.data.testEventCode) setCapiTestCode(res.data.testEventCode);
                if (res.data.pixelId)     setCapiSaved(true);
            })
            .catch(() => {});
    }, []);

    const handleDisconnect = async () => {
        if (!window.confirm('Disconnect your Facebook Ads account?')) return;
        await axios.delete('/api/ctwa/disconnect', { withCredentials: true });
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
                <StatCard icon={DollarSign} label="Total Ad Spend" value={loading ? '—' : fmtCurrency(data?.totalSpend, data?.currency)} color="rose" />
                <StatCard
                    icon={MousePointerClick}
                    label="Avg. Cost Per Lead"
                    value={loading ? '—' : (data?.totalLeads > 0 && data?.totalSpend > 0
                        ? fmtCurrency(data.totalSpend / data.totalLeads, data?.currency)
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
                    <div className="text-center py-16 px-4 md:px-6">
                        <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">No CTWA Leads Yet</h4>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            When customers click your WhatsApp Ads and message you, their data will show up here automatically.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto sm:overflow-visible">
                        <table className="w-full text-sm block sm:table">
                            <thead className="hidden sm:table-header-group">
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
                            <tbody className="block sm:table-row-group divide-y divide-slate-100 dark:divide-white/5">
                                {data.ads.map(ad => (
                                    <tr key={ad.adId} className="block sm:table-row hover:bg-slate-50 dark:hover:bg-white/5 transition-colors p-4 sm:p-0">
                                        <td className="block sm:table-cell px-0 sm:px-5 py-3 sm:py-4">
                                            <div className="flex items-center gap-3">
                                                {ad.imageUrl ? (
                                                    <img src={ad.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4 text-indigo-400" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-slate-900 dark:text-white text-sm leading-tight truncate">{ad.adName}</div>
                                                    <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">{ad.adId}</div>
                                                </div>
                                                {ad.sourceUrl && (
                                                    <a href={ad.sourceUrl} target="_blank" rel="noreferrer" className="sm:hidden ml-auto p-2 text-slate-400 hover:text-indigo-500 transition-colors inline-flex flex-shrink-0">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-end px-0 sm:px-4 py-2 sm:py-4 border-t border-slate-100/50 sm:border-0 dark:border-white/5 sm:text-right">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Leads</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{fmt(ad.leads)}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-end px-0 sm:px-4 py-2 sm:py-4 border-t border-slate-100/50 sm:border-0 dark:border-white/5 sm:text-right font-semibold text-slate-800 dark:text-slate-200">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Spend</span>
                                            <span>{fmtCurrency(ad.spend, data?.currency)}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-end px-0 sm:px-4 py-2 sm:py-4 border-t border-slate-100/50 sm:border-0 dark:border-white/5 sm:text-right">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">CPL</span>
                                            <span>{ad.costPerLead !== null ? (
                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(ad.costPerLead, data?.currency)}</span>
                                            ) : <span className="text-slate-400">—</span>}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-end px-0 sm:px-4 py-2 sm:py-4 border-t border-slate-100/50 sm:border-0 dark:border-white/5 sm:text-right text-slate-600 dark:text-slate-300">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Impressions</span>
                                            <span>{fmt(ad.impressions)}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-end px-0 sm:px-4 py-2 sm:py-4 border-t border-slate-100/50 sm:border-0 dark:border-white/5 sm:text-right text-slate-600 dark:text-slate-300">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">Clicks</span>
                                            <span>{fmt(ad.clicks)}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center sm:justify-end px-0 sm:px-4 py-2 sm:py-4 border-t border-slate-100/50 sm:border-0 dark:border-white/5 sm:text-right">
                                            <span className="sm:hidden text-[11px] font-bold text-slate-500 uppercase tracking-wider">CTR</span>
                                            <span>{ad.ctr !== null ? (
                                                <span className={`font-medium ${parseFloat(ad.ctr) >= 1 ? 'text-emerald-500' : 'text-slate-500'}`}>{ad.ctr}%</span>
                                            ) : <span className="text-slate-400">—</span>}</span>
                                        </td>
                                        <td className="hidden sm:table-cell px-0 sm:px-4 py-2 sm:py-4 text-right">
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

        {/* ── Facebook Page ID Panel ── */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Facebook Page ID</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Required to create Click-to-WhatsApp ads. Auto-detected or set manually.</p>
                    </div>
                </div>
                {pageId && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                    </span>
                )}
            </div>
            <div className="p-5">
                {!pageId && (
                    <div className="mb-4 p-3.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                            <strong>Page ID not set.</strong> If you see "No Facebook Page found" when creating ads, paste your Page ID below.
                            {' '}<a href="https://www.facebook.com/help/1503421039731588" target="_blank" rel="noreferrer" className="underline font-bold">How to find your Page ID →</a>
                        </p>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={pageIdInput}
                        onChange={e => setPageIdInput(e.target.value)}
                        placeholder="e.g. 123456789012345"
                        className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-400/50 transition-all font-mono"
                    />
                    <button
                        onClick={handleSavePageId}
                        disabled={pageIdSaving || !pageIdInput.trim() || pageIdInput.trim() === pageId}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40 whitespace-nowrap"
                    >
                        {pageIdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {pageIdSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Go to your Facebook Page → About → find "Page ID" at the bottom.</p>
            </div>
        </div>

        {/* ── CAPI Configuration Panel ── */}
        <CAPIConfigPanel
            pixelId={capiPixelId}       setPixelId={setCapiPixelId}
            accessToken={capiAccessToken} setAccessToken={setCapiAccessToken}
            testCode={capiTestCode}     setTestCode={setCapiTestCode}
            saved={capiSaved}           setSaved={setCapiSaved}
        />
    </div>
    );
};

// ── CAPI Config Panel (inside CTWADashboard, added before closing tag) ────────
const CAPIConfigPanel = ({ pixelId, setPixelId, accessToken, setAccessToken, testCode, setTestCode, saved, setSaved }) => {
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const handleSave = async () => {
        if (!pixelId.trim()) return toast.error('Pixel ID is required');
        if (!accessToken.trim() || accessToken === '••••••••') {
            if (accessToken === '••••••••' && saved) {
                return toast('Token unchanged — already saved ✅');
            }
            return toast.error('CAPI Access Token is required');
        }
        setSaving(true);
        try {
            await axios.post('/api/ctwa/capi-config', { pixelId, accessToken, testEventCode: testCode }, { withCredentials: true });
            setSaved(true);
            toast.success('✅ CAPI config saved! Purchases from your Online Store will now be tracked.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save CAPI config');
        } finally { setSaving(false); }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            await axios.post('/api/ctwa/capi-test', {}, { withCredentials: true });
            toast.success('✅ Test event sent to Meta! Check Events Manager to confirm.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Test failed — check Pixel ID and token');
        } finally { setTesting(false); }
    };

    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Meta Conversions API (CAPI)</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Track Online Store purchases → attribute ROAS to your ad campaigns</p>
                    </div>
                </div>
                {saved && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                )}
            </div>

            <div className="p-5 space-y-4">
                {/* Info Banner */}
                <div className="flex items-start gap-3 p-3.5 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-500/20 rounded-xl">
                    <Shield className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                        Once saved, every order placed in your Online Store will automatically fire
                        <strong> InitiateCheckout</strong> and <strong>Purchase</strong> events to Meta — enabling
                        accurate ROAS tracking and smarter ad optimization.
                    </p>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Meta Pixel ID <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={pixelId}
                            onChange={e => setPixelId(e.target.value)}
                            placeholder="e.g. 1234567890123456"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-violet-400/50 transition-all font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">From Meta Business Manager → Events Manager → your Pixel</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">CAPI Access Token <span className="text-red-500">*</span></label>
                        <input
                            type="password"
                            value={accessToken}
                            onChange={e => setAccessToken(e.target.value)}
                            placeholder="EAAxxxxxxxxxxxxxxx"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-violet-400/50 transition-all font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Events Manager → your Pixel → Settings → Generate Access Token</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Test Event Code <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                        <input
                            type="text"
                            value={testCode}
                            onChange={e => setTestCode(e.target.value)}
                            placeholder="TEST12345"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-violet-400/50 transition-all font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">From Meta Events Manager Test Events tab — remove before going live</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-1">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save CAPI Config'}
                    </button>
                    {saved && (
                        <button
                            onClick={handleTest}
                            disabled={testing}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
                        >
                            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                            {testing ? 'Sending...' : 'Send Test Event'}
                        </button>
                    )}
                </div>
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
                    withCredentials: true
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
