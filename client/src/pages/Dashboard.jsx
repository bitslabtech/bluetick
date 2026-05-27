import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
    Search, Bell, HelpCircle, Wallet, Plus,
    Send, CheckCheck, Eye, MessageSquare, Users,
    UserPlus, FilePlus, CreditCard, MoreVertical, FileText,
    Calendar, ChevronDown, CheckCircle2, AlertTriangle, XCircle, Info, MessageCircle, Zap,
    ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import TopHeader from '../components/TopHeader';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns'; // We need date-fns, if not available I will use native logic or check package.json

const Dashboard = () => {
    const { user, isImpersonating } = useAuth();
    const { showToast, showModal } = useUI();
    const navigate = useNavigate();

    // Redirect Superadmin to their dashboard if they land here (but NOT when impersonating)
    useEffect(() => {
        if (user?.isAdmin && !isImpersonating) {
            navigate('/superadmin', { replace: true });
        }
    }, [user, isImpersonating, navigate]);

    const [stats, setStats] = useState({
        contactsCount: 0,
        templatesCount: 0,
        totalMessages: 0,
        deliveredCount: 0,
        readCount: 0,
        readRate: 0,
        recentCampaigns: [],
        isWhatsappConfigured: true,
        monthlyUsageCount: 0,
        aiTokenBalance: 0,
        aiTokensAllowance: 0
    });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true); // Separate loading for chart
    const [fbLoading, setFbLoading] = useState(false);

    // Filter State
    const [dateRange, setDateRange] = useState('7d'); // 1d, 7d, 1m, 3m, custom
    const [customStart, setCustomStart] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
    const [customEnd, setCustomEnd] = useState(new Date());

    useEffect(() => {
        // Initialize Facebook JS SDK for Connect Button
        const initFBSDK = () => {
            console.log('[FB DEBUG] initFBSDK() called');
            console.log('[FB DEBUG] VITE_FB_APP_ID =', import.meta.env.VITE_FB_APP_ID || '(MISSING!)');
            console.log('[FB DEBUG] VITE_FB_CONFIG_ID =', import.meta.env.VITE_FB_CONFIG_ID || '(MISSING!)');
            console.log('[FB DEBUG] window.FB exists?', !!window.FB);
            console.log('[FB DEBUG] Script tag #facebook-jssdk exists?', !!document.getElementById('facebook-jssdk'));

            return new Promise((resolve, reject) => {
                if (window.FB) {
                    console.log('[FB DEBUG] window.FB already available, re-initializing...');
                    window.FB.init({
                        appId: import.meta.env.VITE_FB_APP_ID,
                        cookie: true,
                        xfbml: true,
                        version: 'v22.0'
                    });
                    console.log('[FB DEBUG] ✅ FB.init() completed (re-init)');
                    window.__fbSDKReady = true;
                    resolve();
                    return;
                }

                console.log('[FB DEBUG] window.FB not found, setting up fbAsyncInit...');
                window.fbAsyncInit = function () {
                    console.log('[FB DEBUG] fbAsyncInit fired! window.FB =', !!window.FB);
                    window.FB.init({
                        appId: import.meta.env.VITE_FB_APP_ID,
                        cookie: true,
                        xfbml: true,
                        version: 'v22.0'
                    });
                    console.log('[FB DEBUG] ✅ FB.init() completed (async init)');
                    window.__fbSDKReady = true;
                    resolve();
                };

                if (!document.getElementById('facebook-jssdk')) {
                    console.log('[FB DEBUG] Injecting <script> for connect.facebook.net/en_US/sdk.js ...');
                    const js = document.createElement('script');
                    js.id = 'facebook-jssdk';
                    js.src = 'https://connect.facebook.net/en_US/sdk.js';
                    js.async = true;
                    js.onload = () => {
                        console.log('[FB DEBUG] ✅ SDK script onload fired. window.FB =', !!window.FB);
                    };
                    js.onerror = (e) => {
                        console.error('[FB DEBUG] ❌ SDK script FAILED to load! This is likely an ad-blocker or network issue.', e);
                        window.__fbSDKFailed = true;
                        reject(new Error('FB SDK script failed to load'));
                    };
                    document.body.appendChild(js);
                    console.log('[FB DEBUG] <script> tag appended to body');
                } else {
                    console.log('[FB DEBUG] Script tag already exists, polling for window.FB...');
                    let pollCount = 0;
                    const checkFB = setInterval(() => {
                        pollCount++;
                        if (window.FB) {
                            clearInterval(checkFB);
                            console.log(`[FB DEBUG] ✅ window.FB became available after ${pollCount} polls`);
                            window.FB.init({
                                appId: import.meta.env.VITE_FB_APP_ID,
                                cookie: true,
                                xfbml: true,
                                version: 'v22.0'
                            });
                            console.log('[FB DEBUG] ✅ FB.init() completed (polled)');
                            window.__fbSDKReady = true;
                            resolve();
                        }
                    }, 200);
                    setTimeout(() => {
                        clearInterval(checkFB);
                        if (!window.FB) {
                            console.error(`[FB DEBUG] ❌ window.FB still not available after 15s (${pollCount} polls). SDK timed out.`);
                            window.__fbSDKFailed = true;
                            reject(new Error('FB SDK timed out'));
                        }
                    }, 15000);
                }
            });
        };

        initFBSDK().catch(err => console.warn('[FB DEBUG] initFBSDK promise rejected:', err.message));
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats?range=${dateRange}${dateRange === 'custom' ? `&startDate=${customStart.toISOString()}&endDate=${customEnd.toISOString()}` : ''}`);
                setStats(prev => ({
                    ...prev,
                    ...res.data,
                    totalMessages: res.data.totalMessages ?? res.data.campaignsCount ?? 0,
                    deliveryRate: res.data.deliveryRate ?? 0,
                    readRate: res.data.readRate ?? 0,
                    deliveredCount: res.data.deliveredCount ?? 0,
                    readCount: res.data.readCount ?? 0,
                    isWhatsappConfigured: res.data.isWhatsappConfigured ?? true,
                    monthlyUsageCount: res.data.monthlyUsageCount ?? 0
                }));
            } catch (err) {
                console.error("Error fetching stats:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [dateRange, customStart, customEnd]);

    useEffect(() => {
        const fetchChartData = async () => {
            setChartLoading(true);
            try {
                const params = { range: dateRange };
                if (dateRange === 'custom') {
                    params.startDate = customStart.toISOString();
                    params.endDate = customEnd.toISOString();
                }
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/chart`, { params });
                setChartData(res.data);
            } catch (err) {
                console.error("Error fetching chart data:", err);
            } finally {
                setChartLoading(false);
            }
        };
        fetchChartData();
    }, [dateRange, customStart, customEnd]);

    const exchangeFbCode = async (code) => {
        console.log('[FB DEBUG] exchangeFbCode() called with code length:', code?.length);
        try {
            console.log('[FB DEBUG] POSTing to /api/whatsapp/exchange-token ...');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/whatsapp/exchange-token`, { code });

            console.log('[FB DEBUG] ✅ Exchange token response:', res.data);
            showToast({ type: 'success', title: 'WhatsApp Connected', message: res.data.message });

            setStats(prev => ({ ...prev, isWhatsappConfigured: true }));
        } catch (error) {
            console.error('[FB DEBUG] ❌ Exchange token FAILED:', error?.response?.status, error?.response?.data || error.message);
            const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to connect WhatsApp account.';
            showModal({ type: 'error', title: 'Connection Failed', message: errorMessage, confirmText: 'Close' });
        } finally {
            setFbLoading(false);
        }
    };

    const handleFacebookLogin = () => {
        console.log('[FB DEBUG] ========== handleFacebookLogin() START ==========');
        console.log('[FB DEBUG] window.__fbSDKFailed =', window.__fbSDKFailed);
        console.log('[FB DEBUG] window.__fbSDKReady =', window.__fbSDKReady);
        console.log('[FB DEBUG] window.FB =', !!window.FB);
        console.log('[FB DEBUG] typeof window.FB?.login =', typeof window.FB?.login);
        console.log('[FB DEBUG] VITE_FB_APP_ID =', import.meta.env.VITE_FB_APP_ID);
        console.log('[FB DEBUG] VITE_FB_CONFIG_ID =', import.meta.env.VITE_FB_CONFIG_ID);

        if (window.__fbSDKFailed) {
            console.error('[FB DEBUG] ❌ SDK failed to load — showing blocked modal');
            showModal({
                type: 'error',
                title: 'Facebook SDK Blocked',
                message: 'The Facebook SDK could not be loaded. This is usually caused by an ad blocker or browser privacy extension. Please disable your ad blocker for this site and refresh the page, then try again.',
                confirmText: 'OK'
            });
            return;
        }

        if (!window.FB) {
            console.error('[FB DEBUG] ❌ window.FB is falsy — SDK not loaded yet');
            showToast({ type: 'error', title: 'SDK Not Ready', message: 'Facebook SDK is still loading. Please wait a moment and try again.' });
            return;
        }

        setFbLoading(true);
        showToast({ type: 'info', title: 'Connecting...', message: 'Opening WhatsApp Setup. Please allow popups if blocked.' });

        try {
            let callbackFired = false;

            const loginOptions = {
                config_id: import.meta.env.VITE_FB_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: { 
                    feature: 'whatsapp_embedded_signup',
                    sessionInfoVersion: '2'
                },
                scope: 'whatsapp_business_management,whatsapp_business_messaging'
            };
            console.log('[FB DEBUG] Calling FB.login() with options:', JSON.stringify(loginOptions, null, 2));

            window.FB.login(function (response) {
                callbackFired = true;
                clearTimeout(window.fbSafetyTimeout);
                console.log('[FB DEBUG] ✅ FB.login callback FIRED');
                console.log('[FB DEBUG] response.status =', response?.status);
                console.log('[FB DEBUG] response.authResponse =', JSON.stringify(response?.authResponse, null, 2));

                if (response.authResponse && response.authResponse.code) {
                    console.log('[FB DEBUG] ✅ Got auth code, calling exchangeFbCode()...');
                    exchangeFbCode(response.authResponse.code);
                } else {
                    setFbLoading(false);
                    console.warn('[FB DEBUG] ⚠️ No auth code received. User cancelled or not fully authorized.');
                    console.log('[FB DEBUG] Full response:', JSON.stringify(response, null, 2));
                    if (response.status === 'unknown') {
                        showToast({ type: 'warning', title: 'Popup Blocked?', message: 'The login popup may have been blocked. Please allow popups for this site and try again.' });
                    } else {
                        showToast({ type: 'warning', message: 'WhatsApp connection was cancelled.' });
                    }
                }
            }, loginOptions);

            console.log('[FB DEBUG] FB.login() call returned (popup should be opening now)');

            // Safety timeout — if callback hasn't fired in 15s, the popup was likely blocked
            window.fbSafetyTimeout = setTimeout(() => {
                if (!callbackFired) {
                    console.error('[FB DEBUG] ❌ SAFETY TIMEOUT — FB.login callback never fired after 15s');
                    console.log('[FB DEBUG] This usually means:');
                    console.log('[FB DEBUG]   1. Popup was blocked by browser');
                    console.log('[FB DEBUG]   2. Ad blocker blocked the Facebook iframe');
                    console.log('[FB DEBUG]   3. config_id is invalid');
                    console.log('[FB DEBUG]   4. FB app is not properly configured');
                    setFbLoading(false);
                    showModal({
                        type: 'warning',
                        title: 'Popup May Be Blocked',
                        message: 'The Facebook login popup did not open or was closed. Please check:\n\n1. Allow popups for this site in your browser settings\n2. Disable any ad blocker or privacy extension\n3. Make sure third-party cookies are enabled\n\nThen try again.',
                        confirmText: 'OK'
                    });
                }
            }, 15000);

        } catch (err) {
            setFbLoading(false);
            console.error('[FB DEBUG] ❌ FB.login() THREW an exception:', err);
            showToast({ type: 'error', title: 'Connection Error', message: 'Failed to open WhatsApp signup. Please check console for details.' });
        }
        console.log('[FB DEBUG] ========== handleFacebookLogin() END ==========');
    };




    // Helper for status badge
    const getStatusBadge = (status) => {
        switch (status) {
            case 'COMPLETED':
            case 'DELIVERED':
            case 'READ':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        <div className="size-1.5 rounded-full bg-green-400"></div>Completed
                    </span>
                );
            case 'SENDING':
            case 'QUEUED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <div className="size-1.5 rounded-full bg-blue-400 animate-pulse"></div>Sending
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        <div className="size-1.5 rounded-full bg-red-400"></div>Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <div className="size-1.5 rounded-full bg-yellow-400"></div>{status}
                    </span>
                );
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 p-3 rounded-lg shadow-xl transition-colors duration-300">
                    <p className="text-slate-500 dark:text-text-secondary text-xs mb-1">{label}</p>
                    <p className="text-primary font-bold text-sm">
                        {payload[0].value} Messages
                    </p>
                </div>
            );
        }
        return null;
    };

    const getRateStatus = (rate) => {
        const val = parseFloat(rate);
        if (val >= 50) return { label: 'Excellent', color: 'bg-green-500', text: 'text-green-600 dark:text-[#0bda5b]', bg: 'bg-green-100 dark:bg-[#0bda5b]/10' };
        if (val >= 31) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10' };
        if (val >= 21) return { label: 'Average', color: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-400/10' };
        return { label: 'Low', color: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/10' };
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-300">
            <TopHeader 
                title={`Welcome back, ${user?.name?.split(' ')[0]}`}
                subtitle="Here is your messaging performance overview."
            />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
                <div className="w-full flex flex-col gap-8">

                    {/* Top Action Row: Banner & New Campaign */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 w-full">
                        {/* Quick WhatsApp Connect Banner (If not configured) */}
                        {!stats.isWhatsappConfigured && (
                            <div className="shrink-0 w-full md:w-auto">
                                <section className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-500/30 shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between">
                                    <div className="flex-1 px-5 py-3">
                                        <h2 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2 mb-0.5">
                                            <MessageCircle className="w-4 h-4" /> Connect WhatsApp Business
                                        </h2>
                                        <p className="text-indigo-700/80 dark:text-indigo-200/80 text-xs">
                                            Quickly connect your number to start messaging.
                                        </p>
                                    </div>
                                    <div className="px-5 py-3 md:py-0 md:pl-0 border-t md:border-t-0 border-indigo-100 dark:border-indigo-500/30 w-full md:w-auto flex justify-end">
                                        <button
                                            onClick={handleFacebookLogin}
                                            disabled={fbLoading}
                                            className="w-full md:w-auto shrink-0 px-4 py-2 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex justify-center items-center gap-2 text-sm disabled:opacity-75 disabled:cursor-not-allowed"
                                        >
                                            {fbLoading ? (
                                                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                </svg>
                                            )}
                                            {fbLoading ? 'Connecting...' : 'Connect WhatsApp'}
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="shrink-0 w-full xl:w-auto flex items-center justify-end gap-3 ml-auto">
                            <button
                                onClick={() => navigate('/store')}
                                className="flex items-center justify-center gap-2 h-11 px-4 md:px-6 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
                            >
                                <Wallet className="w-5 h-5" /> Top-up Store
                            </button>
                            <button
                                onClick={() => navigate('/campaigns')}
                                className="flex items-center justify-center gap-2 h-11 px-4 md:px-6 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20 w-full sm:w-auto"
                            >
                                <Plus className="w-5 h-5" /> New Campaign
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* Stat 1: Messages Sent / Plan Limit */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm transition-colors duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-background-dark text-primary">
                                    <MessageSquare className="w-6 h-6" />
                                </div>
                                <span className="text-slate-500 dark:text-text-secondary text-xs font-bold bg-slate-100 dark:bg-background-dark px-2 py-1 rounded border border-slate-200 dark:border-[#2f455a]">Plan: {stats.planName || 'Free'}</span>
                            </div>
                            <p className="text-slate-500 dark:text-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">This Month's Usage</p>
                            <div className="flex items-end gap-1">
                                <p className="text-slate-900 dark:text-white text-2xl font-bold">{stats.monthlyUsageCount.toLocaleString()}</p>
                                <span className="text-slate-400 dark:text-text-secondary text-sm mb-1 pb-0.5">/ {stats.monthlyLimit?.toLocaleString() || 30}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-background-dark h-1.5 rounded-full mt-3 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-colors ${((stats.monthlyUsageCount / (stats.monthlyLimit || 30)) * 100) < 60
                                        ? 'bg-green-500 dark:bg-green-400'
                                        : ((stats.monthlyUsageCount / (stats.monthlyLimit || 30)) * 100) < 85
                                            ? 'bg-orange-500 dark:bg-orange-400'
                                            : 'bg-red-500 dark:bg-red-400'
                                        }`}
                                    style={{ width: `${Math.min((stats.monthlyUsageCount / (stats.monthlyLimit || 30)) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Stat 2: Delivery Rate */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm transition-colors duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-background-dark text-green-500 dark:text-green-400">
                                    <CheckCheck className="w-6 h-6" />
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${getRateStatus(stats.deliveryRate).text} ${getRateStatus(stats.deliveryRate).bg}`}>
                                    <div className={`size-1.5 rounded-full ${getRateStatus(stats.deliveryRate).color}`}></div>
                                    {getRateStatus(stats.deliveryRate).label}
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Delivery Rate</p>
                            <p className="text-slate-900 dark:text-white text-2xl font-bold">{stats.deliveryRate}%</p>
                            <p className="text-slate-500 dark:text-text-secondary text-xs mt-1 font-medium">{stats.deliveredCount} delivered</p>
                        </div>

                        {/* Stat 3: Read Rate */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm transition-colors duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-background-dark text-blue-500 dark:text-blue-400">
                                    <Eye className="w-6 h-6" />
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${getRateStatus(stats.readRate).text} ${getRateStatus(stats.readRate).bg}`}>
                                    <div className={`size-1.5 rounded-full ${getRateStatus(stats.readRate).color}`}></div>
                                    {getRateStatus(stats.readRate).label}
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Read Rate</p>
                            <p className="text-slate-900 dark:text-white text-2xl font-bold">{stats.readRate}%</p>
                            <p className="text-slate-500 dark:text-text-secondary text-xs mt-1">{stats.readCount} read</p>
                        </div>

                        {/* Stat 4: Contacts */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm transition-colors duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-background-dark text-purple-500 dark:text-purple-400">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Total Contacts</p>
                            <div className="flex items-end gap-1">
                                <p className="text-slate-900 dark:text-white text-2xl font-bold">{stats.contactsCount.toLocaleString()}</p>
                                <span className="text-slate-400 dark:text-text-secondary text-sm mb-1 pb-0.5">/ {stats.contactLimit?.toLocaleString() || 10}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-background-dark h-1.5 rounded-full mt-3 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-colors ${((stats.contactsCount / (stats.contactLimit || 10)) * 100) < 60
                                        ? 'bg-green-500 dark:bg-green-400'
                                        : ((stats.contactsCount / (stats.contactLimit || 10)) * 100) < 85
                                            ? 'bg-orange-500 dark:bg-orange-400'
                                            : 'bg-red-500 dark:bg-red-400'
                                        }`}
                                    style={{ width: `${Math.min((stats.contactsCount / (stats.contactLimit || 10)) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Stat 5: Total Templates */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm transition-colors duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-background-dark text-orange-500 dark:text-orange-400">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <span className="text-orange-600 dark:text-orange-400 text-xs font-bold bg-orange-100 dark:bg-orange-500/10 px-2 py-1 rounded border border-orange-200 dark:border-orange-500/20">All</span>
                            </div>
                            <p className="text-slate-500 dark:text-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Templates</p>
                            <div className="flex items-end gap-1">
                                <p className="text-slate-900 dark:text-white text-2xl font-bold">{stats.templatesCount.toLocaleString()}</p>
                                <span className="text-slate-400 dark:text-text-secondary text-sm mb-1 pb-0.5">/ {stats.templateLimit?.toLocaleString() || 2}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-background-dark h-1.5 rounded-full mt-3 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-colors ${((stats.templatesCount / (stats.templateLimit || 2)) * 100) < 60
                                        ? 'bg-green-500 dark:bg-green-400'
                                        : ((stats.templatesCount / (stats.templateLimit || 2)) * 100) < 85
                                            ? 'bg-orange-500 dark:bg-orange-400'
                                            : 'bg-red-500 dark:bg-red-400'
                                        }`}
                                    style={{ width: `${Math.min((stats.templatesCount / (stats.templateLimit || 2)) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-[#2f455a] shadow-sm transition-colors duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${stats.aiTokenBalance >= 1000
                                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10'
                                    : stats.aiTokenBalance > 0
                                        ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-400/10'
                                        : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-400/10'
                                    }`}>
                                    <div className={`size-1.5 rounded-full ${stats.aiTokenBalance >= 1000 ? 'bg-indigo-500' : stats.aiTokenBalance > 0 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}></div>
                                    {stats.aiTokenBalance >= 1000 ? 'Good' : stats.aiTokenBalance > 0 ? 'Low' : 'Empty'}
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">AI Tokens</p>
                            <div className="flex items-end gap-1 mb-4">
                                <p className="text-slate-900 dark:text-white text-2xl font-bold">{(stats.aiTokenBalance || 0).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                                <p className="text-slate-500 dark:text-text-secondary text-xs font-medium">Available Balance</p>
                                <button
                                    onClick={() => navigate('/store')}
                                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm shadow-indigo-500/30 ${stats.aiTokenBalance < 1000 ? 'animate-pulse' : ''}`}
                                >
                                    <Zap className="w-3 h-3" />
                                    Buy More Tokens
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Middle Section: Chart & Quick Actions (Chart Visual Mocked for design) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart Area */}
                        <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-xl p-4 md:p-6 border border-slate-200 dark:border-[#2f455a] flex flex-col min-h-[400px] shadow-sm transition-colors duration-300">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <h3 className="text-slate-900 dark:text-white text-lg font-bold">Message Volume</h3>

                                <div className="flex items-center bg-slate-100 dark:bg-background-dark rounded-lg p-1 border border-slate-200 dark:border-white/5 overflow-x-auto w-full md:w-auto hide-scrollbar whitespace-nowrap">
                                    {[
                                        { id: '1d', label: '1D' },
                                        { id: '7d', label: '7D' },
                                        { id: '1m', label: '1M' },
                                        { id: 'this_month', label: 'This Month' },
                                        { id: '3m', label: '3M' },
                                        { id: 'custom', label: 'Custom' },
                                    ].map((filter) => (
                                        <button
                                            key={filter.id}
                                            onClick={() => setDateRange(filter.id)}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${dateRange === filter.id
                                                ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/10'
                                                : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>

                                {dateRange === 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <DatePicker
                                                selected={customStart}
                                                onChange={(date) => setCustomStart(date)}
                                                selectsStart
                                                startDate={customStart}
                                                endDate={customEnd}
                                                className="bg-background-dark border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 w-24 focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                        <span className="text-text-secondary text-xs">-</span>
                                        <div className="relative">
                                            <DatePicker
                                                selected={customEnd}
                                                onChange={(date) => setCustomEnd(date)}
                                                selectsEnd
                                                startDate={customStart}
                                                endDate={customEnd}
                                                minDate={customStart}
                                                className="bg-background-dark border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 w-24 focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Area Chart */}
                            <div className="flex-1 w-full h-[300px]">
                                {chartLoading ? (
                                    <div className="h-full flex items-center justify-center text-text-secondary text-sm">Loading chart data...</div>
                                ) : chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#2f455a" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                stroke="#94a3b8"
                                                tick={{ fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                stroke="#94a3b8"
                                                tick={{ fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="messages"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorMessages)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                                        <div className="bg-surface-dark border border-dashed border-white/10 rounded-full p-4 mb-3">
                                            <Calendar className="w-6 h-6 text-text-secondary" />
                                        </div>
                                        <p className="text-sm">No data available for this period</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-slate-900 dark:text-white text-lg font-bold">Quick Actions</h3>
                            <div className="grid grid-cols-1 gap-2 flex-1">
                                <button
                                    onClick={() => navigate('/contacts', { state: { openAddContact: true } })}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-[#2f455a] rounded-xl border border-slate-200 dark:border-[#2f455a] transition-all group shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-slate-900 dark:text-white font-medium text-sm leading-tight">Add Contact</p>
                                            <p className="text-slate-500 dark:text-text-secondary text-[11px] leading-tight">Upload CSV or manual entry</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => navigate('/templates', { state: { openCreateTemplate: true } })}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-[#2f455a] rounded-xl border border-slate-200 dark:border-[#2f455a] transition-all group shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                            <FilePlus className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-slate-900 dark:text-white font-medium text-sm leading-tight">Create Template</p>
                                            <p className="text-slate-500 dark:text-text-secondary text-[11px] leading-tight">Submit for Meta approval</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => navigate('/marketplace')}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-[#2f455a] rounded-xl border border-slate-200 dark:border-[#2f455a] transition-all group shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                            <ShoppingBag className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-slate-900 dark:text-white font-medium text-sm leading-tight">Addon Marketplace</p>
                                            <p className="text-slate-500 dark:text-text-secondary text-[11px] leading-tight">Unlock powerful add-ons to supercharge your workflow</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => navigate('/support')}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-[#2f455a] rounded-xl border border-slate-200 dark:border-[#2f455a] transition-all group shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                            <HelpCircle className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-slate-900 dark:text-white font-medium text-sm leading-tight">Support</p>
                                            <p className="text-slate-500 dark:text-text-secondary text-[11px] leading-tight">Get help & assistance</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Table */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-slate-900 dark:text-white text-lg font-bold">Recent Campaigns</h3>
                            <button
                                onClick={() => navigate('/campaign-list')}
                                className="text-primary text-sm font-medium hover:text-blue-400"
                            >
                                View All
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-surface-dark shadow-sm">
                            <table className="w-full text-left border-collapse bg-white dark:bg-surface-dark transition-colors duration-300">
                                <thead className="bg-slate-50 dark:bg-background-dark text-slate-500 dark:text-text-secondary text-xs uppercase font-medium">
                                    <tr>
                                        <th className="px-4 md:px-6 py-4">Campaign Name</th>
                                        <th className="px-4 md:px-6 py-4">Status</th>
                                        <th className="px-4 md:px-6 py-4">Template</th>
                                        <th className="px-4 md:px-6 py-4">Recipients</th>
                                        <th className="px-4 md:px-6 py-4">Date</th>
                                        <th className="px-4 md:px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100 dark:divide-background-dark">
                                    {loading ? (
                                        <tr><td colSpan="6" className="p-4 text-center text-slate-500 dark:text-text-secondary">Loading...</td></tr>
                                    ) : stats.recentCampaigns.length === 0 ? (
                                        <tr><td colSpan="6" className="p-4 text-center text-slate-500 dark:text-text-secondary">No campaigns yet</td></tr>
                                    ) : (
                                        stats.recentCampaigns.map((campaign) => (
                                            <tr key={campaign.id} className="hover:bg-slate-50 dark:hover:bg-[#2f455a] transition-colors text-slate-900 dark:text-white">
                                                <td className="px-4 md:px-6 py-4 font-medium">{campaign.campaignName || 'Untitled Campaign'}</td>
                                                <td className="px-4 md:px-6 py-4">
                                                    {getStatusBadge(campaign.status)}
                                                </td>
                                                <td className="px-4 md:px-6 py-4 text-slate-500 dark:text-text-secondary">{campaign.Template?.name}</td>
                                                <td className="px-4 md:px-6 py-4 text-slate-500 dark:text-text-secondary">{campaign.recipientCount}</td>
                                                <td className="px-4 md:px-6 py-4 text-slate-500 dark:text-text-secondary">{new Date(campaign.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 md:px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => navigate(`/campaign-details/${campaign.id}`)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-text-secondary hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all text-xs font-bold group/btn"
                                                    >
                                                        <Eye className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* View Full AI Token Usage History Button */}
                        <div className="flex justify-end mt-3">
                            <button
                                onClick={() => navigate('/ai-token-history')}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-sm font-bold transition-all group"
                            >
                                <Zap className="w-4 h-4" />
                                View AI Token Usage History
                                <span className="text-indigo-400 dark:text-indigo-500 group-hover:translate-x-0.5 transition-transform">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
