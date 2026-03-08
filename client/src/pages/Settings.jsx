
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import {
    Save, Monitor, Moon, Sun, Globe, Clock, Calendar,
    Layout, Type, Palette, Image as ImageIcon, Check, RefreshCw,
    Bell, Mail, MessageCircle, UserPlus, CreditCard, AlertTriangle, BarChart, Zap,
    Server, Smartphone, Send, Terminal, Shield, Key, Search, User, Sparkles,
    FileText, Download, CheckCircle2, TrendingUp, Menu
} from 'lucide-react';
import BillingTab from '../components/BillingTab';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import NotificationBell from '../components/NotificationBell';
import ThemeToggle from '../components/ThemeToggle';
import UserDropdown from '../components/UserDropdown';
import GlobalSearch from '../components/GlobalSearch';

const Settings = () => {
    const { user, logout } = useAuth();
    const { showModal, showToast } = useUI();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(() => {
        return location.state?.initialTab || 'profile';
    });

    useEffect(() => {
        sessionStorage.setItem('settingsActiveTab', activeTab);
    }, [activeTab]);
    const [activeSubTab, setActiveSubTab] = useState('email'); // email | whatsapp
    const [waGatewayTab, setWaGatewayTab] = useState('embedded'); // embedded | manual
    const [activePaymentGateway, setActivePaymentGateway] = useState(null); // razorpay | stripe | phonepe | cashfree
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [testPhoneNumber, setTestPhoneNumber] = useState('');
    const originalSettings = useRef(null);

    // Profile Form State (separate from settings)
    const [profileData, setProfileData] = useState({
        name: '',
        phone: '',
        company: ''
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);

    // Facebook Login State
    const [fbLoading, setFbLoading] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const logoInputRef = useRef(null);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const fd = new FormData();
            fd.append('logo', file);
            const res = await axios.post('http://localhost:5000/api/settings/upload-logo', fd, {
                headers: { 'x-auth-token': localStorage.getItem('token'), 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, logoUrl: res.data.logoUrl }));
            showToast({ type: 'success', title: 'Logo Uploaded', message: 'Logo uploaded and saved successfully.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Upload Failed', message: err.response?.data?.error || 'Failed to upload logo.' });
        } finally {
            setLogoUploading(false);
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        // General
        theme: 'system',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        // Branding
        appName: 'WhatsApp Cloud',
        appTagline: 'Business API',
        supportEmail: '',
        currency: 'USD',
        timezone: 'UTC',
        primaryColor: '#4f46e5',
        secondaryColor: '#ec4899',
        logoUrl: '',
        // Notifications
        notificationTemplates: {
            email: {
                newUser: { subject: 'Welcome!', body: 'Welcome to our platform...' },
                planPurchase: { subject: 'Purchase Confirmed', body: 'Thank you for your purchase...' },
                expiryAlert: { subject: 'Subscription Expiring', body: 'Your plan is expiring soon...' },
                systemUpdate: { subject: 'System Update', body: 'We have updated our system...' },
                features: { subject: 'New Features', body: 'Check out our new features...' }
            },
            whatsapp: {
                newUser: { templateName: 'welcome_message_v1', languageCode: 'en_US', enabled: true },
                planPurchase: { templateName: 'payment_confirmation_v2', languageCode: 'en_US', enabled: true },
                expiryAlert: { templateName: 'expiry_alert_v1', languageCode: 'en_US', enabled: true },
                quotaLimit: { templateName: 'quota_alert_v1', languageCode: 'en_US', enabled: true },
                systemUpdate: { templateName: 'system_update_v1', languageCode: 'en_US', enabled: false },
                features: { templateName: 'feature_announcement_v1', languageCode: 'en_US', enabled: false }
            }
        }
    });

    useEffect(() => {
        fetchSettings();

        // Initialize Facebook JS SDK
        if (window.FB) {
            console.log('FB SDK already loaded');
        } else {
            console.log('Loading FB SDK...');
            window.fbAsyncInit = function () {
                window.FB.init({
                    appId: import.meta.env.VITE_FB_APP_ID, // Ensure this is in your .env
                    cookie: true,
                    xfbml: true,
                    version: 'v22.0'
                });
                console.log('FB SDK Initialized');
            };

            (function (d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        }
    }, []);

    // Initialize profile data from user
    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || '',
                phone: user.phone || '',
                company: user.company || ''
            });

            // If createdAt isn't available (old session), fetch full profile
            if (!user.createdAt) {
                axios.get('http://localhost:5000/api/auth/me', {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                }).then(res => {
                    if (res.data) {
                        try {
                            const updatedUser = { ...user, ...res.data };
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                            // A reload might be needed for context to pick it up, or it just reads from localStorage on next load.
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }).catch(err => console.error(err));
            }
        }
    }, [user]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/settings', {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            if (res.data) {
                originalSettings.current = res.data;
                // Merge data carefully to preserve deep defaults if API returns partial objects
                setFormData(prev => ({
                    ...prev,
                    ...res.data,
                    notificationTemplates: {
                        email: { ...prev.notificationTemplates.email, ...(res.data.notificationTemplates?.email || {}) },
                        whatsapp: { ...prev.notificationTemplates.whatsapp, ...(res.data.notificationTemplates?.whatsapp || {}) }
                    },
                    paymentGateways: {
                        razorpay: { enabled: false, keyId: '', keySecret: '', ...(res.data.paymentGateways?.razorpay || {}) },
                        stripe: { enabled: false, publishableKey: '', secretKey: '', ...(res.data.paymentGateways?.stripe || {}) },
                        phonepe: { enabled: false, merchantId: '', saltKey: '', saltIndex: '', mode: 'TEST', ...(res.data.paymentGateways?.phonepe || {}) },
                        cashfree: { enabled: false, appId: '', secretKey: '', mode: 'TEST', ...(res.data.paymentGateways?.cashfree || {}) }
                    },
                    smtpConfig: {
                        host: '', port: '587', user: '', pass: '', secure: false, fromEmail: '', fromName: '',
                        ...(res.data.smtpConfig || {})
                    },
                    securityConfig: {
                        allowRegistration: true,
                        requireEmailVerification: true,
                        enforce2FA: false,
                        minPasswordLength: 8,
                        ...(res.data.securityConfig || {})
                    }
                }));
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleThemeChange = (theme) => {
        setFormData(prev => ({ ...prev, theme }));
    };

    const handleTemplateChange = (type, key, field, value) => {
        setFormData(prev => ({
            ...prev,
            notificationTemplates: {
                ...prev.notificationTemplates,
                [type]: {
                    ...prev.notificationTemplates[type],
                    [key]: {
                        ...prev.notificationTemplates[type][key],
                        [field]: value
                    }
                }
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Mutually Exclusive WhatsApp Configuration Logic
        if (activeTab === 'whatsapp_gateway' && waGatewayTab === 'manual') {
            // Check if there's an existing configuration that is likely Embedded
            const wasConfigured = originalSettings.current && (originalSettings.current.metaBusinessAccountId || originalSettings.current.metaPhoneNumberId || originalSettings.current.metaAccessToken);
            const isCurrentlyEmbedded = originalSettings.current?.metaBusinessAccountId && !originalSettings.current?.metaAccessToken;

            if (wasConfigured && isCurrentlyEmbedded) {
                showModal({
                    type: 'warning',
                    title: 'Overwrite Configuration',
                    message: 'You currently have an Embedded Onboarding configuration active. Saving these Manual API keys will permanently disconnect and remove your Embedded Onboarding setup. Do you want to proceed?',
                    confirmText: 'Yes, Save Manual Keys',
                    cancelText: 'Cancel',
                    onConfirm: async () => {
                        // Backend will overwrite Settings model on post. 
                        // To clear Embedded (which might reside in User model like fbAccessToken), we may optionally call disconnect first.
                        try {
                            setSaving(true);
                            await axios.delete('http://localhost:5000/api/whatsapp/disconnect', { headers: { 'x-auth-token': localStorage.getItem('token') } });
                            await saveSettingsData();
                        } catch (err) {
                            console.error(err);
                            setSaving(false);
                        }
                    }
                });
                return;
            }
        }

        await saveSettingsData();
    };

    const saveSettingsData = async () => {
        setSaving(true);
        try {
            const res = await axios.post('http://localhost:5000/api/settings', formData, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            originalSettings.current = res.data;
            showToast({
                type: 'success',
                title: 'Settings Saved',
                message: 'Your configuration has been updated successfully.'
            });
        } catch (err) {
            console.error(err);
            showModal({
                type: 'error',
                title: 'Error',
                message: 'Failed to save settings',
                confirmText: 'Close'
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showModal({ type: 'warning', title: 'Error', message: 'New passwords do not match.', confirmText: 'Close' });
            return;
        }
        if (passwordData.newPassword.length < 8) {
            showModal({ type: 'warning', title: 'Error', message: 'Password must be at least 8 characters.', confirmText: 'Close' });
            return;
        }

        setChangingPassword(true);
        try {
            await axios.put('http://localhost:5000/api/auth/password',
                { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword },
                { headers: { 'x-auth-token': localStorage.getItem('token') } }
            );
            showToast({ type: 'success', title: 'Password Updated', message: 'Your password has been changed.' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            showModal({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to change password.', confirmText: 'Close' });
        } finally {
            setChangingPassword(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put('http://localhost:5000/api/auth/profile', profileData, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            showToast({
                type: 'success',
                title: 'Profile Updated',
                message: 'Your profile has been updated successfully.'
            });
        } catch (err) {
            console.error(err);
            showModal({
                type: 'error',
                title: 'Error',
                message: 'Failed to update profile',
                confirmText: 'Close'
            });
        } finally {
            setSaving(false);
        }
    };

    const allTabs = [
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'billing', label: 'Subscription', icon: Sparkles },
        { id: 'general', label: 'System Settings', icon: Layout },
        { id: 'branding', label: 'Branding', icon: Palette },
        { id: 'notifications', label: 'Notification Config', icon: Bell },
        { id: 'whatsapp_gateway', label: 'WhatsApp Gateway', icon: Server },
        { id: 'payment_gateway', label: 'Payment Gateway', icon: CreditCard },
        { id: 'smtp', label: 'Email SMTP', icon: Mail },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    const tabs = user?.isAdmin
        // Admins see everything EXCEPT billing/subscription
        ? allTabs.filter(tab => tab.id !== 'billing')
        : allTabs.filter(tab => ['profile', 'billing', 'general', 'whatsapp_gateway'].includes(tab.id));

    const handleTestMessage = async () => {
        if (!formData.metaPhoneNumberId || !formData.metaAccessToken || !testPhoneNumber) {
            showModal({
                type: 'warning',
                title: 'Missing Credentials',
                message: 'Please fill in all API credentials and a test phone number first.',
                confirmText: 'OK'
            });
            return;
        }

        setTestLoading(true);
        try {
            const response = await axios.post('http://localhost:5000/api/settings/test', {
                metaPhoneNumberId: formData.metaPhoneNumberId,
                metaAccessToken: formData.metaAccessToken,
                testPhoneNumber
            });
            showModal({
                type: 'success',
                title: 'Test Successful',
                message: response.data.message || 'Test message sent successfully.',
                confirmText: 'OK'
            });
        } catch (error) {
            showModal({
                type: 'error',
                title: 'Test Failed',
                message: 'Test failed: ' + (error.response?.data?.error || error.message),
                confirmText: 'Close'
            });
        } finally {
            setTestLoading(false);
        }
    };

    const handleFacebookLogin = () => {
        if (!window.FB) {
            showToast({ type: 'error', message: 'Facebook SDK not loaded. Please try again.' });
            return;
        }

        const hasManualKeys = formData.metaAccessToken || formData.metaPhoneNumberId;

        if (hasManualKeys) {
            showModal({
                type: 'warning',
                title: 'Overwrite Configuration',
                message: 'You currently have Manual API keys configured. Connecting via Embedded Onboarding will permanently remove your Manual API keys. Do you want to proceed?',
                confirmText: 'Yes, Connect',
                cancelText: 'Cancel',
                onConfirm: () => {
                    executeFacebookLogin(true); // pass true to indicate manual wipe needed
                }
            });
            return;
        }

        executeFacebookLogin(false);
    };

    const executeFacebookLogin = (wipeManual) => {
        setFbLoading(true);

        window.FB.login(function (response) {
            if (response.authResponse && response.authResponse.code) {
                // We received the OAuth code, now exchange it on the backend
                exchangeFbCode(response.authResponse.code, wipeManual);
            } else {
                setFbLoading(false);
                console.log('User cancelled login or did not fully authorize.');
                showToast({ type: 'warning', message: 'WhatsApp connection was cancelled.' });
            }
        }, {
            // These parameters trigger the WhatsApp Embedded Signup flow
            config_id: import.meta.env.VITE_FB_CONFIG_ID, // Optional: if you pre-configured a config ID in Meta Developer Portal
            response_type: 'code',
            override_default_response_type: true,
            extras: { feature: 'whatsapp_embedded_signup' },
            scope: 'whatsapp_business_management,whatsapp_business_messaging'
        });
    };

    const exchangeFbCode = async (code, wipeManual) => {
        try {
            const res = await axios.post('http://localhost:5000/api/whatsapp/exchange-token', { code }, {
                headers: { 'x-auth-token': localStorage.getItem('token') } // Authenticate request
            });

            // If wiping manual configuration, let's clear the settings on the backend
            if (wipeManual) {
                await axios.post('http://localhost:5000/api/settings', {
                    ...formData,
                    metaAccessToken: '',
                    metaPhoneNumberId: '',
                    metaBusinessAccountId: res.data.wabaId || ''
                }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
            }

            showToast({ type: 'success', title: 'WhatsApp Connected', message: res.data.message });

            // Update local UI state
            setFormData(prev => ({
                ...prev,
                ...(wipeManual && { metaAccessToken: '', metaPhoneNumberId: '' }),
                ...(res.data.wabaId && { metaBusinessAccountId: res.data.wabaId })
            }));
        } catch (error) {
            console.error('FB Exchange Error', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to connect WhatsApp account.';
            showModal({ type: 'error', title: 'Connection Failed', message: errorMessage, confirmText: 'Close' });
        } finally {
            setFbLoading(false);
        }
    };

    const handleDisconnect = async () => {
        showModal({
            type: 'warning',
            title: 'Disconnect WhatsApp',
            message: 'Are you sure you want to disconnect WhatsApp? This will stop all outgoing messages.',
            confirmText: 'Disconnect',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    setFbLoading(true);
                    await axios.delete('http://localhost:5000/api/whatsapp/disconnect', {
                        headers: { 'x-auth-token': localStorage.getItem('token') }
                    });

                    showToast({ type: 'success', title: 'Disconnected', message: 'WhatsApp connection removed.' });

                    // Clear UI state related to WhatsApp connection
                    setFormData(prev => ({
                        ...prev,
                        metaPhoneNumberId: '',
                        metaAccessToken: '',
                        metaBusinessAccountId: ''
                    }));
                } catch (error) {
                    console.error('Disconnect Error', error);
                    showModal({ type: 'error', title: 'Disconnect Failed', message: 'Failed to disconnect WhatsApp account.', confirmText: 'Close' });
                } finally {
                    setFbLoading(false);
                }
            }
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

    const emailCategories = [
        {
            id: 'newUser',
            label: 'New User Registration',
            variables: ['{name}', '{email}', '{app_name}', '{login_url}']
        },
        {
            id: 'planPurchase',
            label: 'Plan Purchase Confirmation',
            variables: ['{name}', '{plan_name}', '{amount}', '{transaction_id}', '{expiry_date}']
        },
        {
            id: 'expiryAlert',
            label: 'Plan/Subscription Expiry Alert',
            variables: ['{name}', '{plan_name}', '{expiry_date}', '{renewal_link}']
        },
        {
            id: 'systemUpdate',
            label: 'System Update',
            variables: ['{name}', '{update_details}', '{action_link}']
        },
        {
            id: 'features',
            label: 'New Features Announcement',
            variables: ['{name}', '{feature_name}', '{feature_details}', '{link}']
        }
    ];

    const whatsappCategories = [
        {
            id: 'newUser',
            label: 'New User Registration',
            icon: UserPlus,
            description: 'Sent immediately after a new user creates an account.',
            variables: ['{name}', '{email}', '{app_name}', '{login_url}']
        },
        {
            id: 'planPurchase',
            label: 'Plan Purchase Confirmation',
            icon: CreditCard,
            description: 'Sent when a subscription plan payment is successful.',
            variables: ['{name}', '{plan_name}', '{amount}', '{transaction_id}', '{expiry_date}']
        },
        {
            id: 'expiryAlert',
            label: 'Subscription Expiry Alert',
            icon: AlertTriangle,
            description: 'Sent 3 days before a subscription plan expires.',
            variables: ['{name}', '{plan_name}', '{expiry_date}', '{renewal_link}']
        },
        {
            id: 'quotaLimit',
            label: 'Quota Limit Reached',
            icon: BarChart,
            description: 'Sent when a user reaches 80% or 100% of their plan limits.',
            variables: ['{name}', '{limit_type}', '{current_usage}', '{upgrade_link}']
        },
        {
            id: 'systemUpdate',
            label: 'System Update',
            icon: RefreshCw,
            description: 'Sent to notify users about important system maintenance or updates.',
            variables: ['{name}', '{update_details}', '{action_link}']
        },
        {
            id: 'features',
            label: 'New Features Announcement',
            icon: Zap,
            description: 'Sent when new features are added to the platform.',
            variables: ['{name}', '{feature_name}', '{feature_details}', '{link}']
        }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark overflow-y-auto">
            {/* Top Bar */}
            {/* Top Bar matching Support.jsx */}
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300 sticky top-0 z-10">
                <div className="flex items-center gap-6 w-full">
                    <button className="md:hidden text-slate-900 dark:text-white">
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Search Bar */}
                    <div className="hidden md:flex items-center w-full max-w-md transition-colors">
                        <GlobalSearch />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <NotificationBell />
                    <UserDropdown />
                </div>
            </header>

            <main className="w-full px-24 pt-8 space-y-8 pb-32">
                {/* Page Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            Settings
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage global configuration.</p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all font-bold flex items-center gap-2 disabled:opacity-70"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <aside className="w-64 bg-white dark:bg-background-dark border-r border-slate-200 dark:border-white/5 py-6 px-4 flex-shrink-0">
                        <nav className="space-y-1">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                                            ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                            } `}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* PROFILE TAB */}
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    {/* Personal Info Header */}
                                    <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-8 shadow-sm">
                                        <div className="flex flex-col md:flex-row items-center gap-6">
                                            <div className="relative group">
                                                <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-slate-100 dark:border-surface-dark shadow-lg overflow-hidden">
                                                    {user?.name?.[0]}
                                                </div>
                                                <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-700 rounded-full shadow-md border border-slate-200 dark:border-white/10 text-slate-500 hover:text-indigo-600 dark:text-slate-300 transition-colors">
                                                    <ImageIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="text-center md:text-left">
                                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                                                <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
                                                <div className="mt-2 flex items-center gap-2 justify-center md:justify-start">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                        {user?.isAdmin ? 'Administrator' : 'Standard User'}
                                                    </span>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                        Active
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Personal Details Form */}
                                        <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-8 shadow-sm h-full">
                                            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
                                                <User className="w-5 h-5 text-indigo-500" />
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Personal Information</h3>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                                                        <input
                                                            type="text"
                                                            value={profileData.name}
                                                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                                                        <input
                                                            type="tel"
                                                            placeholder="+1 (555) 000-0000"
                                                            value={profileData.phone}
                                                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-1 gap-5">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company / Organization</label>
                                                        <input
                                                            type="text"
                                                            name="company"
                                                            value={profileData.company}
                                                            onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                                                            placeholder="Your company name"
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input
                                                            type="email"
                                                            value={user?.email || ''}
                                                            disabled
                                                            className="w-full pl-10 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                                        <Shield className="w-3 h-3" /> Contact admin to change email
                                                    </p>
                                                </div>

                                                {/* Save Profile Button */}
                                                <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                                                    <button
                                                        onClick={handleProfileUpdate}
                                                        disabled={saving}
                                                        className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                                                    >
                                                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        {saving ? 'Saving...' : 'Save Profile'}
                                                    </button>
                                                </div>

                                            </div>
                                        </section>

                                        {/* Security & Password */}
                                        <div className="space-y-6">
                                            <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-8 shadow-sm">
                                                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
                                                    <Key className="w-5 h-5 text-indigo-500" />
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security</h3>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                                                        <input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            value={passwordData.currentPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                                                            <input
                                                                type="password"
                                                                placeholder="New password"
                                                                value={passwordData.newPassword}
                                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm New</label>
                                                            <input
                                                                type="password"
                                                                placeholder="Confirm password"
                                                                value={passwordData.confirmPassword}
                                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="pt-2">
                                                        <button
                                                            onClick={handlePasswordChange}
                                                            disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                                                            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer disabled:opacity-50"
                                                        >
                                                            {changingPassword ? 'Changing out...' : 'Change Password'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-8 shadow-sm">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Clock className="w-5 h-5 text-slate-400" />
                                                    <h3 className="text-md font-bold text-slate-900 dark:text-white">Account Activity</h3>
                                                </div>
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-slate-400">Member Since</span>
                                                        <span className="font-mono text-slate-900 dark:text-white">
                                                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Loading...'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between py-2">
                                                        <span className="text-slate-500 dark:text-slate-400">Last Login</span>
                                                        <span className="font-mono text-slate-900 dark:text-white">
                                                            {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Just now'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </div>

                                    {/* Danger Zone */}
                                    <section className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Delete Account</h3>
                                                <p className="text-sm text-red-600 dark:text-red-300/80 mt-1">
                                                    Permanently remove your account and all associated data. This action cannot be undone.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => showModal({
                                                    type: 'error',
                                                    title: 'Delete Account',
                                                    message: 'This will permanently delete your account, all contacts, campaigns, and templates. This action CANNOT be undone. Are you absolutely sure?',
                                                    confirmText: 'Yes, Delete My Account',
                                                    cancelText: 'Cancel',
                                                    onConfirm: async () => {
                                                        try {
                                                            await axios.delete('http://localhost:5000/api/auth/me', {
                                                                headers: { 'x-auth-token': localStorage.getItem('token') }
                                                            });
                                                            showToast({ type: 'success', title: 'Account Deleted', message: 'Your account has been permanently deleted.' });
                                                            logout();
                                                        } catch (err) {
                                                            showModal({ type: 'error', title: 'Deletion Failed', message: err.response?.data?.error || 'Failed to delete account.', confirmText: 'Close' });
                                                        }
                                                    }
                                                })}
                                                className="px-4 py-2 bg-white dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                                            >
                                                Delete Account
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* BILLING TAB */}
                            {activeTab === 'billing' && (
                                <BillingTab />
                            )}

                            {/* GENERAL TAB */}

                            {activeTab === 'general' && (
                                <>
                                    {/* Appearance Section */}
                                    <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                            <Monitor className="w-5 h-5 text-indigo-500" /> Default Appearance
                                        </h2>
                                        <div className="grid grid-cols-3 gap-6">
                                            {[
                                                { id: 'light', label: 'Light', icon: Sun },
                                                { id: 'dark', label: 'Dark', icon: Moon },
                                                { id: 'system', label: 'System', icon: Monitor }
                                            ].map(theme => {
                                                const Icon = theme.icon;
                                                const isSelected = formData.theme === theme.id;
                                                return (
                                                    <button
                                                        key={theme.id}
                                                        onClick={() => handleThemeChange(theme.id)}
                                                        className={`group relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${isSelected
                                                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10'
                                                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                                            } `}
                                                    >
                                                        <div className={`p-3 rounded-full ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'} `}>
                                                            <Icon className="w-6 h-6" />
                                                        </div>
                                                        <span className={`font-medium ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'} `}>
                                                            {theme.label}
                                                        </span>
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 text-indigo-500">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </section>

                                    {/* Regional Settings */}
                                    <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                            <Globe className="w-5 h-5 text-indigo-500" /> Regional Settings
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Language</label>
                                                <select
                                                    name="language"
                                                    value={formData.language}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                >
                                                    <option value="en">English (US)</option>
                                                    <option value="es">Spanish</option>
                                                    <option value="fr">French</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date Format</label>
                                                <select
                                                    name="dateFormat"
                                                    value={formData.dateFormat}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                >
                                                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2023)</option>
                                                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2023)</option>
                                                    <option value="YYYY-MM-DD">YYYY-MM-DD (2023-12-31)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}

                            {/* BRANDING TAB */}
                            {activeTab === 'branding' && (
                                <>
                                    {/* App Identity */}
                                    <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                            <Type className="w-5 h-5 text-indigo-500" /> App Identity
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Application Name</label>
                                                <input
                                                    type="text"
                                                    name="appName"
                                                    value={formData.appName}
                                                    onChange={handleChange}
                                                    placeholder="e.g. Acme Corp"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">App Tagline</label>
                                                <input
                                                    type="text"
                                                    name="appTagline"
                                                    value={formData.appTagline || ''}
                                                    onChange={handleChange}
                                                    placeholder="e.g. Business API"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                />
                                                <p className="text-xs text-slate-400 mt-1">Shown below the app name in the sidebar.</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Support Email</label>
                                                <input
                                                    type="email"
                                                    name="supportEmail"
                                                    value={formData.supportEmail}
                                                    onChange={handleChange}
                                                    placeholder="support@example.com"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Currency</label>
                                                <select
                                                    name="currency"
                                                    value={formData.currency}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                >
                                                    <option value="USD">USD ($)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                    <option value="INR">INR (₹)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Timezone</label>
                                                <select
                                                    name="timezone"
                                                    value={formData.timezone}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                >
                                                    <option value="UTC">UTC (Universal Time)</option>
                                                    <option value="IST">IST (Indian Standard Time - GMT+5:30)</option>
                                                    <option value="GMT">GMT (Greenwich Mean Time)</option>
                                                    <option value="CET">CET (Central European Time - GMT+1:00)</option>
                                                    <option value="GST">GST (Gulf Standard Time - GMT+4:00)</option>
                                                    <option value="JST">JST (Japan Standard Time - GMT+9:00)</option>
                                                    <option value="AEST">AEST (Australian Eastern Time - GMT+10:00)</option>
                                                    <option value="PST">PST (Pacific Standard Time - GMT-8:00)</option>
                                                    <option value="EST">EST (Eastern Standard Time - GMT-5:00)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 dark:border-white/5 pt-6 mt-6">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Company Logo</label>
                                            <div className="flex items-start gap-6">

                                                {/* Clickable Preview / Upload Target */}
                                                <div
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="w-24 h-24 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center relative overflow-hidden group cursor-pointer shrink-0"
                                                >
                                                    {logoUploading ? (
                                                        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                                                    ) : formData.logoUrl ? (
                                                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <ImageIcon className="w-8 h-8 text-slate-400" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                                        {logoUploading ? 'Uploading...' : 'Click to Upload'}
                                                    </div>
                                                </div>

                                                {/* Hidden file input */}
                                                <input
                                                    ref={logoInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                                    className="hidden"
                                                    onChange={handleLogoUpload}
                                                />

                                                <div className="flex-1 space-y-2">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        Click the image preview to upload a file directly. PNG, JPG, SVG or WEBP (max 5MB).
                                                    </p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500">Or paste a direct URL below:</p>
                                                    <input
                                                        type="text"
                                                        name="logoUrl"
                                                        value={formData.logoUrl}
                                                        onChange={handleChange}
                                                        placeholder="https://example.com/logo.png"
                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                    {formData.logoUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                                                            className="text-xs text-red-500 hover:text-red-600 font-semibold"
                                                        >
                                                            Remove Logo
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Visual Styles */}
                                    <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                            <Palette className="w-5 h-5 text-indigo-500" /> Visual Styles
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Primary Color</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="color"
                                                        name="primaryColor"
                                                        value={formData.primaryColor}
                                                        onChange={handleChange}
                                                        className="w-16 h-16 rounded-xl cursor-pointer border-0 p-0"
                                                    />
                                                    <div>
                                                        <p className="font-mono text-sm uppercase text-slate-900 dark:text-white">{formData.primaryColor}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Main brand color</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Secondary Color</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="color"
                                                        name="secondaryColor"
                                                        value={formData.secondaryColor}
                                                        onChange={handleChange}
                                                        className="w-16 h-16 rounded-xl cursor-pointer border-0 p-0"
                                                    />
                                                    <div>
                                                        <p className="font-mono text-sm uppercase text-slate-900 dark:text-white">{formData.secondaryColor}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Accent color</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}

                            {/* NOTIFICATIONS TAB */}
                            {activeTab === 'notifications' && (
                                <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                                    {/* Sub-tabs Header */}
                                    <div className="border-b border-slate-200 dark:border-white/5 flex">
                                        <button
                                            onClick={() => setActiveSubTab('email')}
                                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeSubTab === 'email'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                                                } `}
                                        >
                                            <Mail className="w-4 h-4" /> Email Templates
                                        </button>
                                        <button
                                            onClick={() => setActiveSubTab('whatsapp')}
                                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeSubTab === 'whatsapp'
                                                ? 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border-b-2 border-green-600'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                                                } `}
                                        >
                                            <MessageCircle className="w-4 h-4" /> WhatsApp Templates
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-8">
                                        {activeSubTab === 'email' && emailCategories.map(cat => (
                                            <div key={cat.id} className="p-6 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-4">{cat.label}</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Subject</label>
                                                        <input
                                                            type="text"
                                                            value={formData.notificationTemplates.email[cat.id]?.subject || ''}
                                                            onChange={(e) => handleTemplateChange('email', cat.id, 'subject', e.target.value)}
                                                            className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Body Content</label>
                                                        <textarea
                                                            rows="3"
                                                            value={formData.notificationTemplates.email[cat.id]?.body || ''}
                                                            onChange={(e) => handleTemplateChange('email', cat.id, 'body', e.target.value)}
                                                            className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none resize-y"
                                                        />
                                                    </div>
                                                    {/* Available Variables for Email */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">Available Variables:</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {cat.variables.map(variable => (
                                                                <div key={variable} className="px-2.5 py-1 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-300 select-all">
                                                                    {variable}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {activeSubTab === 'whatsapp' && whatsappCategories.map(cat => (
                                            <div key={cat.id} className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                {/* Card Header */}
                                                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-start justify-between gap-4">
                                                    <div className="flex gap-4">
                                                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg text-green-600 dark:text-green-400 shrink-0">
                                                            <cat.icon className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{cat.label}</h3>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cat.description}</p>
                                                        </div>
                                                    </div>
                                                    {/* Toggle Switch */}
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-xs font-bold uppercase tracking-wider ${formData.notificationTemplates.whatsapp[cat.id]?.enabled ? 'text-green-600' : 'text-slate-400'} `}>
                                                            {formData.notificationTemplates.whatsapp[cat.id]?.enabled ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleTemplateChange('whatsapp', cat.id, 'enabled', !formData.notificationTemplates.whatsapp[cat.id]?.enabled)}
                                                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${formData.notificationTemplates.whatsapp[cat.id]?.enabled ? 'bg-green-500' : 'bg-slate-200 dark:bg-white/10'
                                                                }`}
                                                        >
                                                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${formData.notificationTemplates.whatsapp[cat.id]?.enabled ? 'translate-x-6' : 'translate-x-0'
                                                                }`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-6 space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                                Meta Template Name
                                                            </label>
                                                            <div className="relative">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs border border-slate-200 dark:border-white/10 rounded px-1 min-w-[24px] text-center bg-slate-50 dark:bg-white/5">ID</div>
                                                                <input
                                                                    type="text"
                                                                    value={formData.notificationTemplates.whatsapp[cat.id]?.templateName || ''}
                                                                    onChange={(e) => handleTemplateChange('whatsapp', cat.id, 'templateName', e.target.value)}
                                                                    placeholder="e.g. welcome_message_v1"
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-12 pr-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none transition-all placeholder:text-slate-400"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                                Language Code
                                                            </label>
                                                            <div className="relative">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                                    <Globe className="w-4 h-4" />
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={formData.notificationTemplates.whatsapp[cat.id]?.languageCode || ''}
                                                                    onChange={(e) => handleTemplateChange('whatsapp', cat.id, 'languageCode', e.target.value)}
                                                                    placeholder="e.g. en_US"
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none transition-all placeholder:text-slate-400"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Info Alert */}
                                                    <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20 rounded-lg p-4 text-xs text-green-800 dark:text-green-300">
                                                        <span className="font-bold">Note:</span> WhatsApp templates must be pre-approved in your Meta Business Manager.
                                                        Ensure the template accepts <span className="font-bold">{cat.variables.length} variables</span> in the correct order.
                                                    </div>

                                                    {/* Variables */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">Available Variables:</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {cat.variables.map(variable => (
                                                                <div key={variable} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-300 select-all">
                                                                    {variable}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}



                            {/* WHATSAPP GATEWAY TAB */}
                            {activeTab === 'whatsapp_gateway' && (
                                <div className="space-y-6">
                                    {/* Sub-tabs Header for WhatsApp Config */}
                                    <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-2 flex gap-2 shadow-inner">
                                        <button
                                            onClick={() => setWaGatewayTab('embedded')}
                                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm ${waGatewayTab === 'embedded'
                                                ? 'bg-white text-[#1877F2] dark:bg-slate-900 border border-slate-200 dark:border-slate-600'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-300 border border-transparent'
                                                }`}
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                            Embedded Signup
                                        </button>
                                        <button
                                            onClick={() => setWaGatewayTab('manual')}
                                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm ${waGatewayTab === 'manual'
                                                ? 'bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400 border border-slate-200 dark:border-slate-600'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-300 border border-transparent'
                                                }`}
                                        >
                                            <Key className="w-5 h-5" />
                                            Manual API KEY
                                        </button>
                                    </div>

                                    {/* Embedded Signup Flow Section */}
                                    {waGatewayTab === 'embedded' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                                                <div className="p-8 pb-10 border-b border-slate-100 dark:border-white/5 bg-gradient-to-br from-[#1877F2]/5 to-transparent relative">
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#1877F2]/5 rounded-full blur-3xl -mb-10 -mr-10"></div>
                                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <div className="p-3 bg-[#1877F2]/10 rounded-xl">
                                                                    <MessageCircle className="w-8 h-8 text-[#1877F2]" />
                                                                </div>
                                                                <div>
                                                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Connect Meta Business</h2>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className={`w-2 h-2 rounded-full ${formData.metaBusinessAccountId ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{formData.metaBusinessAccountId ? 'Connected' : 'Not Connected'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <p className="text-slate-600 dark:text-slate-300">
                                                                Use Meta Embedded Signup to quickly connect your existing WhatsApp Business number or create a new one.
                                                            </p>
                                                        </div>
                                                        {formData.metaBusinessAccountId ? (
                                                            <button
                                                                onClick={handleDisconnect}
                                                                disabled={fbLoading}
                                                                className="px-8 py-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 font-bold rounded-xl transition-all flex items-center justify-center gap-3 w-full md:w-auto text-lg disabled:opacity-75 disabled:cursor-not-allowed transform hover:-translate-y-1 border border-red-200 dark:border-red-500/20"
                                                            >
                                                                {fbLoading ? (
                                                                    <RefreshCw className="w-6 h-6 animate-spin" />
                                                                ) : (
                                                                    <Shield className="w-6 h-6" /> // A shield or alert icon fits "disconnecting"
                                                                )}
                                                                {fbLoading ? 'Disconnecting...' : 'Disconnect'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={handleFacebookLogin}
                                                                disabled={fbLoading}
                                                                className="px-8 py-4 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 w-full md:w-auto text-lg disabled:opacity-75 disabled:cursor-not-allowed transform hover:-translate-y-1"
                                                            >
                                                                {fbLoading ? (
                                                                    <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                                    </svg>
                                                                )}
                                                                {fbLoading ? 'Connecting...' : 'Connect WhatsApp'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>

                                            {/* Connection Details */}
                                            <div className="p-8 bg-slate-50 dark:bg-background-dark/50">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-wider">Account Information</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-white/5 flex items-start gap-4 shadow-sm">
                                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-lg"><Smartphone className="w-5 h-5" /></div>
                                                        <div>
                                                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Phone Number ID</p>
                                                            <p className="font-mono text-sm text-slate-900 dark:text-white break-all">{formData.metaPhoneNumberId || "Pending configuration..."}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-white/5 flex items-start gap-4 shadow-sm">
                                                        <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-lg"><Server className="w-5 h-5" /></div>
                                                        <div>
                                                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Business Account ID (WABA)</p>
                                                            <p className="font-mono text-sm text-slate-900 dark:text-white break-all">{formData.metaBusinessAccountId || "Pending configuration..."}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Webhook Configuration for Embedded */}
                                            <div className="p-8 border-t border-slate-100 dark:border-white/5">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                                    <Globe className="w-5 h-5 text-green-500" /> Webhook Configuration
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                                    If you are using your own Meta App, you must configure this Webhook URL in your Meta Developer Dashboard to receive incoming messages.
                                                </p>
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Callback URL</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={`${window.location.origin.replace('5173', '5000')}/api/webhook/${user?.id}`}
                                                                className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-sm focus:outline-none cursor-copy"
                                                                onClick={(e) => { e.target.select(); navigator.clipboard.writeText(e.target.value); showToast({ type: 'success', title: 'Copied', message: 'Webhook URL copied to clipboard.' }); }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Verify Token</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value="12345678"
                                                                className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-sm focus:outline-none cursor-copy"
                                                                onClick={(e) => { e.target.select(); navigator.clipboard.writeText(e.target.value); showToast({ type: 'success', title: 'Copied', message: 'Token copied to clipboard.' }); }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Manual Implementation Section */}
                                    {waGatewayTab === 'manual' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {/* API Configuration */}
                                            <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-8 shadow-sm">
                                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                                    <Server className="w-5 h-5 text-indigo-500" /> WhatsApp Cloud API
                                                </h2>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Input API keys manually from your Meta developer app.</p>
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone Number ID</label>
                                                        <input
                                                            type="text"
                                                            name="metaPhoneNumberId"
                                                            value={formData.metaPhoneNumberId}
                                                            onChange={handleChange}
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                            placeholder="e.g. 1045618..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Access Token</label>
                                                        <div className="relative">
                                                            <input
                                                                type="password"
                                                                name="metaAccessToken"
                                                                value={formData.metaAccessToken}
                                                                onChange={handleChange}
                                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-4 pr-12 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                placeholder="Permanent Access Token"
                                                            />
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Ensure you generate a permanent system user token instead of a 24-hr token.</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Business Account ID (WABA)</label>
                                                        <input
                                                            type="text"
                                                            name="metaBusinessAccountId"
                                                            value={formData.metaBusinessAccountId}
                                                            onChange={handleChange}
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                            placeholder="e.g. 10145..."
                                                        />
                                                    </div>
                                                </div>
                                            </section>

                                            {/* Webhook Configuration */}
                                            <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-8 shadow-sm">
                                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                                    <Globe className="w-5 h-5 text-green-500" /> Webhook Configuration
                                                </h2>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Set up your Webhook to receive incoming messages, delivery, and read receipts.</p>
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Callback URL</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={`${window.location.origin.replace('5173', '5000')}/api/webhook/${user?.id}`}
                                                                className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-sm focus:outline-none cursor-copy"
                                                                onClick={(e) => { e.target.select(); navigator.clipboard.writeText(e.target.value); showToast({ type: 'success', title: 'Copied', message: 'Webhook URL copied to clipboard.' }); }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Verify Token</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value="12345678"
                                                                className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-sm focus:outline-none cursor-copy"
                                                                onClick={(e) => { e.target.select(); navigator.clipboard.writeText(e.target.value); showToast({ type: 'success', title: 'Copied', message: 'Token copied to clipboard.' }); }}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-2">Required by Meta when verifying your webhook endpoints in the dashboard.</p>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    )}

                                    {/* Unified Test Console */}
                                    <section className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
                                        <div className="bg-slate-800/80 px-6 py-4 flex items-center justify-between border-b border-slate-700/50">
                                            <div className="flex items-center gap-3">
                                                <Terminal className="w-5 h-5 text-indigo-400" />
                                                <h3 className="text-slate-300 font-bold uppercase tracking-wider text-sm">Send Test Message</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 rounded-full bg-slate-700" />
                                                <div className="w-3 h-3 rounded-full bg-slate-700" />
                                                <div className="w-3 h-3 rounded-full bg-slate-700" />
                                            </div>
                                        </div>
                                        <div className="p-8">
                                            <div className="flex flex-col sm:flex-row items-end gap-4">
                                                <div className="flex-1 w-full">
                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Destination WhatsApp Number</label>
                                                    <input
                                                        type="text"
                                                        value={testPhoneNumber}
                                                        onChange={(e) => setTestPhoneNumber(e.target.value)}
                                                        className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-5 py-4 text-green-400 font-mono text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500/50 focus:outline-none placeholder:text-slate-700 transition-all"
                                                        placeholder="e.g. 15550000000 (include country code)"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleTestMessage}
                                                    disabled={testLoading}
                                                    className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                                                >
                                                    {testLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                                    Send Test
                                                </button>
                                            </div>
                                            <div className="mt-8 bg-slate-950/80 rounded-xl p-5 font-mono text-sm text-slate-400 border border-slate-800/80">
                                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                                                    <Zap className="w-4 h-4 text-yellow-500" />
                                                    <span className="text-slate-300 font-bold">System Output Console</span>
                                                </div>
                                                <p className="text-green-500/80">&gt; System initialized. Ready to test connection.</p>
                                                {testLoading && (
                                                    <p className="text-yellow-400 mt-2 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
                                                        Initiating request to Meta Graph API...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}
                            {/* PAYMENT GATEWAY TAB */}
                            {
                                activeTab === 'payment_gateway' && (
                                    <div className="space-y-8">
                                        {/* Gateway Selection Grid */}
                                        <section>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Select Payment Provider</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                {[
                                                    { id: 'razorpay', name: 'Razorpay', color: 'blue' },
                                                    { id: 'stripe', name: 'Stripe', color: 'indigo' },
                                                    { id: 'phonepe', name: 'PhonePe', color: 'purple' },
                                                    { id: 'cashfree', name: 'Cashfree', color: 'orange' }
                                                ].map((gateway) => (
                                                    <div
                                                        key={gateway.id}
                                                        onClick={() => setActivePaymentGateway(gateway.id)}
                                                        className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all shadow-sm ${activePaymentGateway === gateway.id
                                                            ? `border-${gateway.color}-500 bg-${gateway.color}-50 dark:bg-slate-900`
                                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                                            }`}
                                                    >
                                                        <div className="flex flex-col items-center gap-4 text-center">
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activePaymentGateway === gateway.id ? `bg-${gateway.color}-500 text-white` : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-600'
                                                                }`}>
                                                                <CreditCard className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 dark:text-white">{gateway.name}</h4>
                                                                <p className="text-xs text-slate-500 mt-1">
                                                                    {formData.paymentGateways?.[gateway.id]?.enabled ? (
                                                                        <span className="text-green-500 font-bold flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Enabled</span>
                                                                    ) : 'Disabled'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {activePaymentGateway === gateway.id && (
                                                            <div className={`absolute top-4 right-4 text-${gateway.color}-500`}>
                                                                <Check className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Configuration Form */}
                                        {activePaymentGateway && formData.paymentGateways && (
                                            <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-8 shadow-sm">
                                                <div className="flex items-center justify-between mb-8">
                                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <Shield className="w-6 h-6 text-indigo-500" />
                                                        Configure {activePaymentGateway.charAt(0).toUpperCase() + activePaymentGateway.slice(1)}
                                                    </h2>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable Gateway</span>
                                                        <button
                                                            onClick={() => setFormData(prev => ({
                                                                ...prev,
                                                                paymentGateways: {
                                                                    ...prev.paymentGateways,
                                                                    [activePaymentGateway]: {
                                                                        ...prev.paymentGateways[activePaymentGateway],
                                                                        enabled: !prev.paymentGateways[activePaymentGateway].enabled
                                                                    }
                                                                }
                                                            }))}
                                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.paymentGateways[activePaymentGateway].enabled
                                                                ? 'bg-green-500'
                                                                : 'bg-slate-300 dark:bg-slate-700'
                                                                }`}
                                                        >
                                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.paymentGateways[activePaymentGateway].enabled ? 'translate-x-6' : 'translate-x-0'
                                                                }`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-6 max-w-3xl">
                                                    {/* Razorpay Form */}
                                                    {activePaymentGateway === 'razorpay' && (
                                                        <>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Key ID</label>
                                                                <input
                                                                    type="text"
                                                                    value={formData.paymentGateways.razorpay.keyId}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        paymentGateways: { ...prev.paymentGateways, razorpay: { ...prev.paymentGateways.razorpay, keyId: e.target.value } }
                                                                    }))}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    placeholder="rzp_test_..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Key Secret</label>
                                                                <input
                                                                    type="password"
                                                                    value={formData.paymentGateways.razorpay.keySecret}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        paymentGateways: { ...prev.paymentGateways, razorpay: { ...prev.paymentGateways.razorpay, keySecret: e.target.value } }
                                                                    }))}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    placeholder="••••••••••••••••"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Stripe Form */}
                                                    {activePaymentGateway === 'stripe' && (
                                                        <>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Publishable Key</label>
                                                                <input
                                                                    type="text"
                                                                    value={formData.paymentGateways.stripe.publishableKey}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        paymentGateways: { ...prev.paymentGateways, stripe: { ...prev.paymentGateways.stripe, publishableKey: e.target.value } }
                                                                    }))}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    placeholder="pk_test_..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Secret Key</label>
                                                                <input
                                                                    type="password"
                                                                    value={formData.paymentGateways.stripe.secretKey}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        paymentGateways: { ...prev.paymentGateways, stripe: { ...prev.paymentGateways.stripe, secretKey: e.target.value } }
                                                                    }))}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    placeholder="sk_test_..."
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* PhonePe Form */}
                                                    {activePaymentGateway === 'phonepe' && (
                                                        <>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Merchant ID</label>
                                                                <input
                                                                    type="text"
                                                                    value={formData.paymentGateways.phonepe.merchantId}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        paymentGateways: { ...prev.paymentGateways, phonepe: { ...prev.paymentGateways.phonepe, merchantId: e.target.value } }
                                                                    }))}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    placeholder="MERCHANTUAT"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Salt Key</label>
                                                                <input
                                                                    type="password"
                                                                    value={formData.paymentGateways.phonepe.saltKey}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        paymentGateways: { ...prev.paymentGateways, phonepe: { ...prev.paymentGateways.phonepe, saltKey: e.target.value } }
                                                                    }))}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    placeholder="099ebbf4-..."
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-6">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Salt Index</label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.paymentGateways.phonepe.saltIndex}
                                                                        onChange={(e) => setFormData(prev => ({
                                                                            ...prev,
                                                                            paymentGateways: { ...prev.paymentGateways, phonepe: { ...prev.paymentGateways.phonepe, saltIndex: e.target.value } }
                                                                        }))}
                                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                        placeholder="1"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Environment</label>
                                                                    <select
                                                                        value={formData.paymentGateways.phonepe.mode}
                                                                        onChange={(e) => setFormData(prev => ({
                                                                            ...prev,
                                                                            paymentGateways: { ...prev.paymentGateways, phonepe: { ...prev.paymentGateways.phonepe, mode: e.target.value } }
                                                                        }))}
                                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    >
                                                                        <option value="TEST">Sandbox / UAT</option>
                                                                        <option value="PROD">Production</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Cashfree Form */}
                                                    {activePaymentGateway === 'cashfree' && (
                                                        <>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">App ID</label>
                                                                <input
                                                                    type="text"
                                                                    value={formData.paymentGateways.cashfree.appId}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        paymentGateways: { ...prev.paymentGateways, cashfree: { ...prev.paymentGateways.cashfree, appId: e.target.value } }
                                                                    }))}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    placeholder="your_app_id"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Secret Key</label>
                                                                <input
                                                                    type="password"
                                                                    value={formData.paymentGateways.cashfree.secretKey}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        paymentGateways: { ...prev.paymentGateways, cashfree: { ...prev.paymentGateways.cashfree, secretKey: e.target.value } }
                                                                    }))}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                    placeholder="your_secret_key"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Environment</label>
                                                                <select
                                                                    value={formData.paymentGateways.cashfree.mode}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        paymentGateways: { ...prev.paymentGateways, cashfree: { ...prev.paymentGateways.cashfree, mode: e.target.value } }
                                                                    }))}
                                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                                >
                                                                    <option value="TEST">Sandbox</option>
                                                                    <option value="PROD">Production</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )
                            }

                            {/* SMTP SETTINGS TAB */}
                            {
                                activeTab === 'smtp' && (
                                    <div className="space-y-8">
                                        <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-8 shadow-sm">
                                            <div className="flex items-center justify-between mb-8">
                                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <Mail className="w-6 h-6 text-indigo-500" />
                                                    SMTP Configuration
                                                </h2>
                                                <button
                                                    onClick={async () => {
                                                        setTestLoading(true);
                                                        try {
                                                            await axios.post('http://localhost:5000/api/settings/test-smtp', formData.smtpConfig);
                                                            showModal({
                                                                type: 'success',
                                                                title: 'Success',
                                                                message: 'Connection Successful! Test email sent.',
                                                                confirmText: 'OK'
                                                            });
                                                        } catch (err) {
                                                            showModal({
                                                                type: 'error',
                                                                title: 'Connection Failed',
                                                                message: err.response?.data?.error || 'Connection Failed',
                                                                confirmText: 'Close'
                                                            });
                                                        } finally {
                                                            setTestLoading(false);
                                                        }
                                                    }}
                                                    disabled={testLoading}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {testLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    Test Connection
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">SMTP Host</label>
                                                    <input
                                                        type="text"
                                                        value={formData.smtpConfig.host}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            smtpConfig: { ...prev.smtpConfig, host: e.target.value }
                                                        }))}
                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="smtp.gmail.com"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Port</label>
                                                    <input
                                                        type="text"
                                                        value={formData.smtpConfig.port}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            smtpConfig: { ...prev.smtpConfig, port: e.target.value }
                                                        }))}
                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="587"
                                                    />
                                                </div>

                                                <div className="flex items-end mb-2">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.smtpConfig.secure}
                                                                onChange={(e) => setFormData(prev => ({
                                                                    ...prev,
                                                                    smtpConfig: { ...prev.smtpConfig, secure: e.target.checked }
                                                                }))}
                                                                className="sr-only"
                                                            />
                                                            <div className={`w-12 h-6 rounded-full transition-colors ${formData.smtpConfig.secure ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.smtpConfig.secure ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Secure (SSL/TLS)</span>
                                                    </label>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Username / Email</label>
                                                    <input
                                                        type="text"
                                                        value={formData.smtpConfig.user}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            smtpConfig: { ...prev.smtpConfig, user: e.target.value }
                                                        }))}
                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="you@company.com"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
                                                    <input
                                                        type="password"
                                                        value={formData.smtpConfig.pass}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            smtpConfig: { ...prev.smtpConfig, pass: e.target.value }
                                                        }))}
                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="••••••••••••"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">From Name</label>
                                                    <input
                                                        type="text"
                                                        value={formData.smtpConfig.fromName}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            smtpConfig: { ...prev.smtpConfig, fromName: e.target.value }
                                                        }))}
                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="Support Team"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">From Email</label>
                                                    <input
                                                        type="text"
                                                        value={formData.smtpConfig.fromEmail}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            smtpConfig: { ...prev.smtpConfig, fromEmail: e.target.value }
                                                        }))}
                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="support@company.com"
                                                    />
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                )
                            }

                            {/* SECURITY SETTINGS TAB */}
                            {
                                activeTab === 'security' && (
                                    <div className="space-y-8">
                                        <section className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 p-8 shadow-sm">
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-8">
                                                <Shield className="w-6 h-6 text-red-500" />
                                                System Security
                                            </h2>

                                            <div className="grid grid-cols-1 gap-8 max-w-4xl">
                                                {/* Allow Registration */}
                                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white">Allow User Registration</h3>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            Allow new users to sign up for an account independently.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            securityConfig: { ...prev.securityConfig, allowRegistration: !prev.securityConfig.allowRegistration }
                                                        }))}
                                                        className={`w-14 h-8 rounded-full p-1 transition-colors ${formData.securityConfig.allowRegistration ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${formData.securityConfig.allowRegistration ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

                                                {/* Email Verification */}
                                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white">Require Email Verification</h3>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            New users must verify their email address before accessing the dashboard.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            securityConfig: { ...prev.securityConfig, requireEmailVerification: !prev.securityConfig.requireEmailVerification }
                                                        }))}
                                                        className={`w-14 h-8 rounded-full p-1 transition-colors ${formData.securityConfig.requireEmailVerification ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${formData.securityConfig.requireEmailVerification ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

                                                {/* Enforce 2FA */}
                                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white">Enforce 2FA for Admins</h3>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            Require Two-Factor Authentication for all Admin and Manager accounts.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            securityConfig: { ...prev.securityConfig, enforce2FA: !prev.securityConfig.enforce2FA }
                                                        }))}
                                                        className={`w-14 h-8 rounded-full p-1 transition-colors ${formData.securityConfig.enforce2FA ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${formData.securityConfig.enforce2FA ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

                                                {/* Minimum Password Length */}
                                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-slate-900 dark:text-white">Minimum Password Length</h3>
                                                            <p className="text-sm text-slate-500 mt-1">
                                                                Enforce a minimum character count for user passwords.
                                                            </p>
                                                        </div>
                                                        <Key className="w-6 h-6 text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="number"
                                                        min="6"
                                                        max="32"
                                                        value={formData.securityConfig.minPasswordLength}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            securityConfig: { ...prev.securityConfig, minPasswordLength: parseInt(e.target.value) }
                                                        }))}
                                                        className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                )}
                        </div>
                    </div>
                </div >
            </main >
        </div >
    );
};

export default Settings;
