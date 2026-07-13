import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import { Save, RefreshCw, LayoutTemplate, MessageSquare, BarChart, Users, Type, Image as ImageIcon, Plus, Trash2, CheckCircle, Smartphone, Globe, Monitor, Target, Zap, Tag, DollarSign, Percent, Calendar, FileText, Palette, Key, Server, Edit, X, Phone, Upload, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';
import BlogManager from '../components/landing/BlogManager';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { advancedFeatures, FEATURE_CATEGORIES, industries } from './LandingPage';

const InputGroup = ({ label, value, onChange, placeholder, type = "text" }) => (
    <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">{label}</label>
        {type === 'textarea' ? (
            <textarea
                className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none dark:text-white"
                rows={3}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
            />
        ) : (
            <input
                className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
            />
        )}
    </div>
);

const MultiSelectDropdown = ({ options, value, onChange, placeholder, allowCreate = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    const exactMatch = options.find(o => o.label.toLowerCase() === search.toLowerCase());
    const showCreate = allowCreate && search.trim() !== '' && !exactMatch;

    const handleSelect = (val) => {
        if (value.includes(val)) {
            onChange(value.filter(v => v !== val));
        } else {
            onChange([...value, val]);
        }
    };

    const handleCreate = () => {
        const newVal = search.trim();
        if (!value.includes(newVal)) {
            onChange([...value, newVal]);
        }
        setSearch('');
    };

    const removeValue = (val, e) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== val));
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full min-h-[46px] bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 flex flex-wrap gap-1 items-center cursor-pointer transition-all focus-within:ring-2 focus-within:ring-indigo-500"
            >
                {value.length === 0 && <span className="text-slate-400 text-sm px-1">{placeholder}</span>}
                {value.map(val => {
                    const opt = options.find(o => o.value === val);
                    return (
                        <span key={val} className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                            {opt?.label || val}
                            <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={(e) => removeValue(val, e)} />
                        </span>
                    );
                })}
            </div>
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
                    <div className="sticky top-0 bg-white dark:bg-surface-dark p-2 border-b border-slate-200 dark:border-white/10 z-10">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-black/20 text-slate-700 dark:text-white text-sm px-3 py-2 rounded-lg outline-none"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="p-1 overflow-y-auto">
                        {showCreate && (
                            <div
                                onClick={handleCreate}
                                className="px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer rounded-lg flex items-center gap-2 font-medium"
                            >
                                <Plus className="w-4 h-4" /> Create "{search}"
                            </div>
                        )}
                        {!showCreate && filteredOptions.length === 0 && (
                            <div className="p-2 text-sm text-slate-500 text-center">No results found</div>
                        )}
                        {filteredOptions.map(opt => (
                            <div
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer rounded-lg flex items-center gap-2"
                            >
                                <input type="checkbox" checked={value.includes(opt.value)} readOnly className="rounded border-slate-300 text-indigo-600 focus:ring-0" />
                                <div className="flex items-center gap-2">
                                    {opt.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.color }}></div>}
                                    {opt.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminLandingPage = () => {
    const { user } = useAuth();
    const { showModal, showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState(null);
    const [mainTab, setMainTab] = useState('content'); // content | seo | coupons
    const [contentTab, setContentTab] = useState('hero'); // hero | features | testimonials | cta | brand
    const [advFeatureTab, setAdvFeatureTab] = useState('whatsapp');

    // Public Pages Modal State
    const [showPageEditor, setShowPageEditor] = useState(false);
    const [editingPageKey, setEditingPageKey] = useState(null);
    const [pageEditorTitle, setPageEditorTitle] = useState('');
    const [pageEditorContent, setPageEditorContent] = useState('');
    const [showHtmlEditor, setShowHtmlEditor] = useState(false);

    // Branding Settings (from /api/settings)
    const [brandingSettings, setBrandingSettings] = useState({
        appName: 'Bluetick',
        appTagline: 'Business API',
        supportEmail: '',
        currency: 'USD',
        timezone: 'UTC',
        primaryColor: '#4f46e5',
        logoUrl: '',
        faviconUrl: '',
        registerBannerUrl: '',
    });
    const [logoUploading, setLogoUploading] = useState(false);
    const logoInputRef = useRef(null);
    const [faviconUploading, setFaviconUploading] = useState(false);
    const faviconInputRef = useRef(null);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const fd = new FormData();
            fd.append('logo', file);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/settings/upload-logo`, fd, {
                headers: {  'Content-Type': 'multipart/form-data' }
            });
            setBrandingSettings(prev => ({ ...prev, logoUrl: res.data.logoUrl }));
            showToast({ type: 'success', title: 'Logo Uploaded', message: 'Logo uploaded successfully.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Upload Failed', message: err.response?.data?.error || 'Failed to upload logo.' });
        } finally {
            setLogoUploading(false);
        }
    };

    const handleFaviconUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFaviconUploading(true);
        try {
            const fd = new FormData();
            fd.append('favicon', file);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/settings/upload-favicon`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBrandingSettings(prev => ({ ...prev, faviconUrl: res.data.faviconUrl }));
            showToast({ type: 'success', title: 'Favicon Uploaded', message: 'Favicon uploaded successfully.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Upload Failed', message: err.response?.data?.error || 'Failed to upload favicon.' });
        } finally {
            setFaviconUploading(false);
        }
    };

    const [bannerUploading, setBannerUploading] = useState(false);
    const bannerInputRef = useRef(null);

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBannerUploading(true);
        try {
            const fd = new FormData();
            fd.append('banner', file);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/settings/upload-register-banner`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBrandingSettings(prev => ({ ...prev, registerBannerUrl: res.data.registerBannerUrl }));
            showToast({ type: 'success', title: 'Banner Uploaded', message: 'Register banner uploaded successfully.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Upload Failed', message: err.response?.data?.error || 'Failed to upload register banner.' });
        } finally {
            setBannerUploading(false);
        }
    };

    const handleGenerateSitemap = async () => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/sitemap.xml/generate`, {}, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            if (res.data.success) {
                showToast({ type: 'success', title: 'Sitemap Generated', message: 'Sitemap generated successfully.' });
            }
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Generation Failed', message: 'Failed to generate sitemap.' });
        }
    };

    // Coupons & Plans State
    const [coupons, setCoupons] = useState([]);
    const [plans, setPlans] = useState([]);
    const [blogsList, setBlogsList] = useState([]);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [couponForm, setCouponForm] = useState({
        code: '', discountType: 'percentage', discountValue: 0,
        startDate: '', expiryDate: '', maxUses: 0,
        userLimit: 1, minPurchaseAmount: 0, isValidForUpgrades: false,
        isFirstPurchaseOnly: false, validIntervals: '', maxDiscountCap: 0, allowedEmails: ''
    });

    const [teamMembers, setTeamMembers] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [crmTagsList, setCrmTagsList] = useState([]);
    const [crmGroupsList, setCrmGroupsList] = useState([]);
    const [crmLinkedUser, setCrmLinkedUser] = useState(null);

    useEffect(() => {
        fetchConfig();
        fetchCoupons();
        fetchPlans();
        fetchBrandingSettings();
        fetchBlogsList();
        fetchTeamAndTemplates();
    }, []);

    const fetchTeamAndTemplates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/system/crm-data`);
            setCrmLinkedUser(res.data.linkedUserId);
            setTeamMembers(res.data.teamMembers || []);
            setTemplates(res.data.templates || []);
            setCrmTagsList(res.data.crmTags || []);
            setCrmGroupsList(res.data.crmGroups || []);
        } catch (err) {
            console.error("Failed to fetch CRM data for chatbot config", err);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/plans`);
            setPlans(res.data);
        } catch (err) {
            console.error("Error fetching plans:", err);
        }
    };

    const fetchCoupons = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/coupons`);
            setCoupons(res.data);
        } catch (err) {
            console.error('Failed to fetch coupons:', err);
        }
    };

    const fetchBlogsList = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/landing/blogs?admin=true`);
            setBlogsList(res.data);
        } catch (err) {
            console.error('Failed to fetch blogs:', err);
        }
    };

    // Coupons Helpers
    const handleSaveCoupon = async () => {
        try {
            setSaving(true);
            const hdrs = { };
            // Original payload creation
            // const payload = { ...couponForm };
            // if (!payload.startDate) payload.startDate = null;
            // if (!payload.expiryDate) payload.expiryDate = null;

            // Updated payload creation with v2 constraints processing
            const payload = {
                ...couponForm,
                validIntervals: couponForm.validIntervals ? couponForm.validIntervals.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [],
                allowedEmails: couponForm.allowedEmails ? couponForm.allowedEmails.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : []
            };
            if (!payload.startDate) payload.startDate = null;
            if (!payload.expiryDate) payload.expiryDate = null;


            if (editingCoupon) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/coupons/${editingCoupon.id}`, payload, hdrs);
                showToast({ type: 'success', title: 'Updated', message: 'Coupon updated!' });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/coupons`, payload, hdrs);
                showToast({ type: 'success', title: 'Created', message: 'Coupon created!' });
            }
            setShowCouponModal(false);
            setEditingCoupon(null);
            fetchCoupons();
            setSaving(false);
        } catch (err) {
            setSaving(false);
            showToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to save coupon' });
        }
    };

    const handleDeleteCoupon = async (id) => {
        showModal({
            type: 'warning', title: 'Delete Coupon', message: 'Are you sure you want to delete this coupon? This cannot be undone.',
            confirmText: 'Delete', cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL}/api/coupons/${id}`);
                    showToast({ type: 'success', title: 'Deleted', message: 'Coupon deleted.' });
                    fetchCoupons();
                } catch (err) {
                    showToast({ type: 'error', title: 'Error', message: 'Failed to delete coupon' });
                }
            }
        });
    };

    const handleToggleCoupon = async (id, currentStatus) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/coupons/${id}`, { isActive: !currentStatus });
            fetchCoupons();
            showToast({ type: 'success', title: 'Updated', message: `Coupon turned ${!currentStatus ? 'ON' : 'OFF'}` });
        } catch (err) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to update coupon status' });
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/landing`);
            const data = res.data;

            // Auto-migrate to inject the missing 14 advanced features into the admin config
            if (data?.advancedFeatures?.features) {
                const dbFeatures = data.advancedFeatures.features;
                const finalFeatures = [];

                dbFeatures.forEach(dbFeat => {
                    const baseFeat = advancedFeatures.find(af => af.id === dbFeat.id || (af.id === 'analytics_wa' && dbFeat.id === 'analytics'));
                    if (baseFeat) {
                        finalFeatures.push({ ...baseFeat, ...dbFeat, id: baseFeat.id, category: baseFeat.category, preview: baseFeat.preview });
                    }
                });

                advancedFeatures.forEach(af => {
                    if (!finalFeatures.find(f => f.id === af.id || (f.id === 'analytics' && af.id === 'analytics_wa'))) {
                        finalFeatures.push(af);
                    }
                });

                // Group by category to ensure autoplay doesn't jump
                const groupedFeatures = [];
                ['whatsapp', 'meta', 'store', 'vcard'].forEach(cat => {
                    groupedFeatures.push(...finalFeatures.filter(f => f.category === cat));
                });

                data.advancedFeatures.features = groupedFeatures;
            }

            // Auto-migrate industries — always ensure all 16 are present
            if (data?.industries) {
                const dbItems = data.industries.items || [];
                const merged = dbItems.map(dbInd => {
                    const base = industries.find(i => i.id === dbInd.id);
                    return base ? { ...base, ...dbInd } : dbInd;
                });
                // Append any hardcoded industries missing from DB
                industries.forEach(ind => {
                    if (!merged.find(m => m.id === ind.id)) merged.push(ind);
                });
                data.industries.items = merged;
            } else {
                // No industries in DB at all — inject defaults
                data.industries = {
                    title: 'Built for every industry',
                    subtitle: 'See how leading verticals leverage WhatsApp to cut costs and drive unprecedented revenue.',
                    items: industries
                };
            }

            setConfig(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchBrandingSettings = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings`);
            const d = res.data;
            setBrandingSettings({
                appName: d.appName || 'Bluetick',
                appTagline: d.appTagline || 'Business API',
                supportEmail: d.supportEmail || '',
                currency: d.currency || 'USD',
                timezone: d.timezone || 'UTC',
                primaryColor: d.primaryColor || '#4f46e5',
                logoUrl: d.logoUrl || '',
                faviconUrl: d.faviconUrl || '',
                registerBannerUrl: d.registerBannerUrl || '',
            });
        } catch (err) {
            console.error('Failed to fetch branding settings:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save landing page config
            await axios.put(`${import.meta.env.VITE_API_URL}/api/landing`, config);
            // If on branding tab, also save branding settings
            if (mainTab === 'content' && contentTab === 'brand') {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/settings`, brandingSettings);
            }
            showToast({ type: 'success', title: 'Saved', message: 'Configuration saved successfully.' });
            setTimeout(() => setSaving(false), 800);
        } catch (err) {
            console.error(err);
            setSaving(false);
            showToast({ type: 'error', title: 'Error', message: 'Failed to save changes' });
        }
    };

    const handleReset = async () => {
        showModal({
            type: 'warning',
            title: 'Reset Configuration',
            message: 'Are you sure? This will reset the landing page to default content.',
            confirmText: 'Reset',
            cancelText: 'Cancel',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/landing/reset`);
                    setConfig(res.data);
                    setLoading(false);
                    showToast({ type: 'success', title: 'Reset', message: 'Configuration reset to defaults.' });
                } catch (err) {
                    console.error(err);
                    setLoading(false);
                    showToast({ type: 'error', title: 'Error', message: 'Failed to reset configuration.' });
                }
            }
        });
    };

    if (loading) return <div className="p-4 md:p-10 text-center text-slate-500">Loading configuration...</div>;
    if (!config) return <div className="p-4 md:p-10 text-center text-red-500">Failed to load configuration. Please check backend connection.</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            {/* Top Bar */}
            {/* Top Bar */}
            <AdminHeader>
                <ThemeToggle />
            </AdminHeader>
            <main className="w-full p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 pb-32">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Landing Page</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Design your public facing marketing page.</p>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleReset}
                            className="flex-1 sm:flex-none justify-center px-4 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-sm font-bold flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Reset Defaults
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 sm:flex-none justify-center px-4 md:px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all font-bold flex items-center gap-2 disabled:opacity-70"
                        >
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <a
                            href="/"
                            target="_blank"
                            className="flex-1 sm:flex-none justify-center px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                        >
                            <Globe className="w-4 h-4" /> View Live
                        </a>
                    </div>
                </div>

                {/* Main Tabs (Top Level) */}
                <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 overflow-x-auto scrollbar-hide w-full max-w-full">
                    <button
                        onClick={() => setMainTab('content')}
                        className={`px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${mainTab === 'content'
                            ? 'text-indigo-600 border-indigo-600'
                            : 'text-slate-500 border-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                            }`}
                    >
                        <LayoutTemplate className="w-5 h-5 shrink-0" /> Landing Page Content
                    </button>
                    <button
                        onClick={() => setMainTab('seo')}
                        className={`px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${mainTab === 'seo'
                            ? 'text-indigo-600 border-indigo-600'
                            : 'text-slate-500 border-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                            }`}
                    >
                        <Monitor className="w-5 h-5" /> SEO & Social
                    </button>
                    <button
                        onClick={() => setMainTab('coupons')}
                        className={`px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${mainTab === 'coupons'
                            ? 'text-indigo-600 border-indigo-600'
                            : 'text-slate-500 border-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                            }`}
                    >
                        <Tag className="w-5 h-5" /> Coupons
                    </button>
                    <button
                        onClick={() => setMainTab('blogs')}
                        className={`px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${mainTab === 'blogs'
                            ? 'text-indigo-600 border-indigo-600'
                            : 'text-slate-500 border-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                            }`}
                    >
                        <FileText className="w-5 h-5 shrink-0" /> Blogs
                    </button>
                </div>

                {/* CONTENT EDITOR TAB */}
                {mainTab === 'content' && (
                    <div className="w-full animate-in fade-in zoom-in-95 duration-300">
                        {/* Vertical split layout */}
                        <div className="w-full flex bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden" style={{ height: '680px' }}>

                            {/* LEFT: Vertical Tab Nav */}
                            <div className="w-56 shrink-0 flex flex-col border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 p-2 gap-0.5 overflow-y-auto">
                                <div className="px-3 py-2 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sections</span>
                                </div>
                                {[
                                    { id: 'hero', icon: LayoutTemplate, label: 'Hero Section', desc: 'Title, CTA, colors' },
                                    { id: 'capabilities', icon: Zap, label: 'Capabilities', desc: 'Bento grid section' },
                                    { id: 'advanced_features', icon: BarChart, label: 'Advanced Features', desc: 'Feature tabs showcase' },
                                    { id: 'industries', icon: Globe, label: 'Industries', desc: 'Built for every industry' },
                                    { id: 'features', icon: BarChart, label: 'Features', desc: 'Feature cards' },
                                    { id: 'steps', icon: Smartphone, label: 'Setup Steps', desc: '"5 minutes" section' },
                                    { id: 'testimonials', icon: MessageSquare, label: 'Testimonials', desc: 'Customer reviews' },
                                    { id: 'faqs', icon: MessageSquare, label: 'FAQs', desc: 'Frequently asked questions' },
                                    { id: 'cta', icon: Zap, label: 'Call to Action', desc: 'Bottom CTA block' },
                                    { id: 'brand', icon: Target, label: 'Branding', desc: 'Name, theme' },
                                    { id: 'footer', icon: LayoutTemplate, label: 'Footer Menu', desc: 'Columns & bottom text' },
                                    { id: 'public_pages', icon: FileText, label: 'Custom Pages', desc: 'About, Privacy, Terms...' },
                                    { id: 'contact_page', icon: Phone, label: 'Contact Settings', desc: 'Email, Address, Phone' },
                                    { id: 'ai_chatbot', icon: MessageSquare, label: 'AI Chatbot', desc: 'Public Gemini assistant' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setContentTab(tab.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-3 group ${contentTab === tab.id
                                            ? 'bg-white dark:bg-white/10 shadow-sm border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white border border-transparent'
                                            }`}
                                    >
                                        <tab.icon className={`w-4 h-4 mt-0.5 shrink-0 ${contentTab === tab.id ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm leading-tight">{tab.label}</div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{tab.desc}</div>
                                        </div>
                                        {contentTab === tab.id && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* RIGHT: Content Panel */}
                            <div className="flex-1 min-w-0 w-full overflow-y-auto p-4 md:p-8">

                                {/* HERO SECTION */}
                                {contentTab === 'hero' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Hero Section</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">The first section visitors see — make it count.</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 block">Layout Style</label>
                                                <div className="flex gap-4">
                                                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${(!config.hero.layout || config.hero.layout === 'type1') ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-white/10 hover:border-slate-300'}`}>
                                                        <input type="radio" name="heroLayout" className="hidden" checked={!config.hero.layout || config.hero.layout === 'type1'} onChange={() => setConfig({ ...config, hero: { ...config.hero, layout: 'type1' } })} />
                                                        <div className="font-bold text-slate-700 dark:text-slate-200 text-center">Type 1 (Side-by-side)</div>
                                                    </label>
                                                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${config.hero.layout === 'type2' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-white/10 hover:border-slate-300'}`}>
                                                        <input type="radio" name="heroLayout" className="hidden" checked={config.hero.layout === 'type2'} onChange={() => setConfig({ ...config, hero: { ...config.hero, layout: 'type2' } })} />
                                                        <div className="font-bold text-slate-700 dark:text-slate-200 text-center">Type 2 (Centered + Image)</div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                            <div className="col-span-2">
                                                <InputGroup label="Headline Title" value={config.hero.title}
                                                    onChange={v => setConfig({ ...config, hero: { ...config.hero, title: v } })}
                                                    placeholder="e.g. Connect with Customers" />
                                            </div>
                                            <div className="col-span-2">
                                                <InputGroup label="Subtitle Description" type="textarea" value={config.hero.subtitle}
                                                    onChange={v => setConfig({ ...config, hero: { ...config.hero, subtitle: v } })}
                                                    placeholder="Brief explanation..." />
                                            </div>
                                            <InputGroup label="Primary Button Text" value={config.hero.ctaText}
                                                onChange={v => setConfig({ ...config, hero: { ...config.hero, ctaText: v } })} />
                                            <InputGroup label="Primary Button Link" value={config.hero.ctaLink}
                                                onChange={v => setConfig({ ...config, hero: { ...config.hero, ctaLink: v } })} />
                                        </div>
                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Hero Image ({config.hero.layout === 'type2' ? 'Type 2' : 'Type 1'})</label>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{config.hero.layout === 'type2' ? 'Shows full-width below text in Type 2.' : 'Replaces default mockup on the right side in Type 1.'}</p>
                                            {(config.hero.layout === 'type2' ? config.hero.imageType2 : config.hero.imageType1) ? (
                                                <div className="relative group w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                                                    <img src={config.hero.layout === 'type2' ? config.hero.imageType2 : config.hero.imageType1} className="w-full h-full object-cover" alt="Hero" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button onClick={() => setConfig({ ...config, hero: { ...config.hero, [config.hero.layout === 'type2' ? 'imageType2' : 'imageType1']: '' } })} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 flex items-center gap-2">
                                                            <X className="w-3.5 h-3.5" /> Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl p-4 md:p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-slate-400 hover:text-indigo-500 h-32">
                                                    <Upload className="w-6 h-6 mb-1" />
                                                    <span className="text-sm font-bold">Click to Upload Hero Image ({config.hero.layout === 'type2' ? 'Type 2' : 'Type 1'})</span>
                                                    <span className="text-xs opacity-70">High resolution recommended. PNG, JPG up to 5MB</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        const fd = new FormData();
                                                        fd.append('image', file);
                                                        try {
                                                            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/landing/upload-hero`, fd);
                                                            const key = config.hero.layout === 'type2' ? 'imageType2' : 'imageType1';
                                                            setConfig({ ...config, hero: { ...config.hero, [key]: res.data.imageUrl } });
                                                            showToast({ type: 'success', title: 'Uploaded', message: 'Hero image uploaded.' });
                                                        } catch (err) {
                                                            showToast({ type: 'error', title: 'Error', message: 'Failed to upload image.' });
                                                        }
                                                    }} />
                                                </label>
                                            )}
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                                            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Visual Style</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Gradient Start</label>
                                                    <div className="flex gap-3 items-center">
                                                        <input type="color" value={config.hero.gradientStart}
                                                            onChange={e => setConfig({ ...config, hero: { ...config.hero, gradientStart: e.target.value } })}
                                                            className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                                                        <span className="text-sm font-mono text-slate-500">{config.hero.gradientStart}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Gradient End</label>
                                                    <div className="flex gap-3 items-center">
                                                        <input type="color" value={config.hero.gradientEnd}
                                                            onChange={e => setConfig({ ...config, hero: { ...config.hero, gradientEnd: e.target.value } })}
                                                            className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                                                        <span className="text-sm font-mono text-slate-500">{config.hero.gradientEnd}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CAPABILITIES SECTION */}
                                {contentTab === 'capabilities' && config.capabilities && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Capabilities Grid</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Edit the 5-card Bento grid section.</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <InputGroup label="Section Title" value={config.capabilities.title}
                                                onChange={v => setConfig({ ...config, capabilities: { ...config.capabilities, title: v } })} />
                                            <InputGroup label="Section Subtitle" type="textarea" value={config.capabilities.subtitle}
                                                onChange={v => setConfig({ ...config, capabilities: { ...config.capabilities, subtitle: v } })} />
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-6">
                                            <h4 className="font-bold text-slate-900 dark:text-white">Cards</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                {config.capabilities.cards.map((card, idx) => (
                                                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-3">
                                                        <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b border-slate-200 dark:border-white/10 pb-2">Card: {card.id.toUpperCase()}</div>
                                                        <InputGroup label="Tag" value={card.tag} onChange={v => { const nc = [...config.capabilities.cards]; nc[idx].tag = v; setConfig({ ...config, capabilities: { ...config.capabilities, cards: nc } }); }} />
                                                        <InputGroup label="Title" value={card.title} onChange={v => { const nc = [...config.capabilities.cards]; nc[idx].title = v; setConfig({ ...config, capabilities: { ...config.capabilities, cards: nc } }); }} />

                                                        {card.desc !== undefined && (
                                                            <InputGroup label="Description" type="textarea" value={card.desc} onChange={v => { const nc = [...config.capabilities.cards]; nc[idx].desc = v; setConfig({ ...config, capabilities: { ...config.capabilities, cards: nc } }); }} />
                                                        )}

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Linked Article (Learn More)</label>
                                                            <select
                                                                className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                                                value={card.linkedBlog || ''}
                                                                onChange={e => {
                                                                    const nc = [...config.capabilities.cards];
                                                                    nc[idx].linkedBlog = e.target.value;
                                                                    setConfig({ ...config, capabilities: { ...config.capabilities, cards: nc } });
                                                                }}
                                                            >
                                                                <option value="">-- No Link --</option>
                                                                {blogsList.map(b => (
                                                                    <option key={b.id} value={b.slug}>{b.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="space-y-2 pt-2">
                                                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Card Image</label>
                                                            <div className="flex items-center gap-4">
                                                                {card.image ? (
                                                                    <div className="relative group w-full h-32 rounded-xl bg-white dark:bg-black/40 overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                                                                        <img src={card.image} className="w-full h-full object-cover" alt="Card" />
                                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <button onClick={() => { const nc = [...config.capabilities.cards]; nc[idx].image = ''; setConfig({ ...config, capabilities: { ...config.capabilities, cards: nc } }); }} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 shadow-xl flex items-center gap-2">
                                                                                <X className="w-3.5 h-3.5" /> Remove Image
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <label className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-slate-400 hover:text-indigo-500 h-32">
                                                                        <Upload className="w-6 h-6 mb-1" />
                                                                        <span className="text-xs font-bold">Click to Upload Image</span>
                                                                        <span className="text-[10px] opacity-70">PNG, JPG up to 5MB</span>
                                                                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                                            const file = e.target.files[0];
                                                                            if (!file) return;
                                                                            const fd = new FormData();
                                                                            fd.append('image', file);
                                                                            try {
                                                                                const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/landing/upload-capability`, fd);
                                                                                const nc = [...config.capabilities.cards];
                                                                                nc[idx].image = res.data.imageUrl;
                                                                                setConfig({ ...config, capabilities: { ...config.capabilities, cards: nc } });
                                                                                showToast({ type: 'success', title: 'Uploaded', message: 'Image uploaded successfully.' });
                                                                            } catch (err) {
                                                                                showToast({ type: 'error', title: 'Error', message: 'Failed to upload image.' });
                                                                            }
                                                                        }} />
                                                                    </label>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ADVANCED FEATURES SECTION */}
                                {contentTab === 'advanced_features' && config.advancedFeatures && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Advanced Features Showcase</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Edit the tabbed feature showcase section — text, stats and optional image override per feature.</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-5">
                                            <InputGroup label="Section Title" value={config.advancedFeatures.title}
                                                onChange={v => setConfig({ ...config, advancedFeatures: { ...config.advancedFeatures, title: v } })} />
                                            <InputGroup label="Section Subtitle" type="textarea" value={config.advancedFeatures.subtitle}
                                                onChange={v => setConfig({ ...config, advancedFeatures: { ...config.advancedFeatures, subtitle: v } })} />
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-5">
                                            <div className="flex flex-col gap-4">
                                                <h4 className="font-bold text-slate-900 dark:text-white">Feature Cards</h4>

                                                {/* TABS */}
                                                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                                    {FEATURE_CATEGORIES.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => setAdvFeatureTab(cat.id)}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${advFeatureTab === cat.id
                                                                ? 'bg-indigo-600 text-white shadow-md'
                                                                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                                                                }`}
                                                        >
                                                            <cat.icon className="w-4 h-4" /> {cat.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {(() => {
                                                    const moveFeature = (currentIndex, direction) => {
                                                        const nf = [...config.advancedFeatures.features];
                                                        let targetIndex = -1;
                                                        if (direction === 'up') {
                                                            for (let i = currentIndex - 1; i >= 0; i--) {
                                                                if (nf[i].category === nf[currentIndex].category) {
                                                                    targetIndex = i;
                                                                    break;
                                                                }
                                                            }
                                                        } else {
                                                            for (let i = currentIndex + 1; i < nf.length; i++) {
                                                                if (nf[i].category === nf[currentIndex].category) {
                                                                    targetIndex = i;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                        if (targetIndex !== -1) {
                                                            const temp = nf[currentIndex];
                                                            nf[currentIndex] = nf[targetIndex];
                                                            nf[targetIndex] = temp;
                                                            setConfig({ ...config, advancedFeatures: { ...config.advancedFeatures, features: nf } });
                                                        }
                                                    };

                                                    return config.advancedFeatures.features.map((feat, idx) => {
                                                        if (feat.category !== advFeatureTab) return null;

                                                        const updateFeat = (key, val) => {
                                                            const nf = [...config.advancedFeatures.features];
                                                            nf[idx] = { ...nf[idx], [key]: val };
                                                            setConfig({ ...config, advancedFeatures: { ...config.advancedFeatures, features: nf } });
                                                        };
                                                        return (
                                                            <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-4">
                                                                <div className="flex items-center gap-3 mb-1 pb-3 border-b border-slate-200 dark:border-white/10">
                                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{feat.label || feat.id}</span>

                                                                    <div className="ml-auto flex items-center gap-1">
                                                                        <button onClick={() => moveFeature(idx, 'up')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Move Up">
                                                                            <ChevronUp className="w-4 h-4 text-slate-500" />
                                                                        </button>
                                                                        <button onClick={() => moveFeature(idx, 'down')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Move Down">
                                                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                                                        </button>
                                                                    </div>

                                                                    <span className="text-[10px] text-slate-400 font-mono uppercase ml-2">{feat.id}</span>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <InputGroup label="Tab Label" value={feat.label} onChange={v => updateFeat('label', v)} />
                                                                    <InputGroup label="Tag" value={feat.tagText} onChange={v => updateFeat('tagText', v)} />
                                                                </div>
                                                                <InputGroup label="Feature Title" value={feat.title} onChange={v => updateFeat('title', v)} />
                                                                <InputGroup label="Description" type="textarea" value={feat.desc} onChange={v => updateFeat('desc', v)} />
                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Stats Chips <span className="font-normal normal-case opacity-60">(comma-separated)</span></label>
                                                                    <input
                                                                        className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
                                                                        value={Array.isArray(feat.stats) ? feat.stats.join(', ') : feat.stats}
                                                                        onChange={e => updateFeat('stats', e.target.value)}
                                                                        placeholder="e.g. 98% Open Rate, 45% CTR, 3x Revenue"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Preview Image <span className="font-normal normal-case opacity-60">(replaces animated mockup)</span></label>
                                                                    {feat.image ? (
                                                                        <div className="relative group w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                                                                            <img src={feat.image} className="w-full h-full object-cover" alt="Feature preview" />
                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                <button onClick={() => updateFeat('image', '')} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 flex items-center gap-2">
                                                                                    <X className="w-3.5 h-3.5" /> Remove Image
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <label className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-slate-400 hover:text-indigo-500 h-28">
                                                                            <Upload className="w-6 h-6 mb-1" />
                                                                            <span className="text-xs font-bold">Click to Upload Preview Image</span>
                                                                            <span className="text-[10px] opacity-70">PNG, JPG up to 5MB · Replaces animated mockup</span>
                                                                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                                                const file = e.target.files[0];
                                                                                if (!file) return;
                                                                                const fd = new FormData();
                                                                                fd.append('image', file);
                                                                                try {
                                                                                    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/landing/upload-feature`, fd);
                                                                                    updateFeat('image', res.data.imageUrl);
                                                                                    showToast({ type: 'success', title: 'Uploaded', message: 'Image uploaded successfully.' });
                                                                                } catch (err) {
                                                                                    showToast({ type: 'error', title: 'Error', message: 'Failed to upload image.' });
                                                                                }
                                                                            }} />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* INDUSTRIES SECTION */}
                                {contentTab === 'industries' && config.industries && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Built for Every Industry</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Customize the section heading and each industry card's text, metrics, and optional image.</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-5">
                                            <InputGroup label="Section Title" value={config.industries.title}
                                                onChange={v => setConfig({ ...config, industries: { ...config.industries, title: v } })} />
                                            <InputGroup label="Section Subtitle" type="textarea" value={config.industries.subtitle}
                                                onChange={v => setConfig({ ...config, industries: { ...config.industries, subtitle: v } })} />
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                                            <h4 className="font-bold text-slate-900 dark:text-white">Industry Cards</h4>
                                            <div className="space-y-4">
                                                {config.industries.items.map((ind, idx) => {
                                                    const updateInd = (key, val) => {
                                                        const ni = [...config.industries.items];
                                                        ni[idx] = { ...ni[idx], [key]: val };
                                                        setConfig({ ...config, industries: { ...config.industries, items: ni } });
                                                    };
                                                    return (
                                                        <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-4">
                                                            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                                                                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                                <span className="font-bold text-slate-700 dark:text-slate-200">{ind.title}</span>
                                                                <span className="ml-auto text-[10px] text-slate-400 font-mono uppercase">{ind.id}</span>
                                                            </div>
                                                            <InputGroup label="Title" value={ind.title} onChange={v => updateInd('title', v)} />
                                                            <InputGroup label="Description" type="textarea" value={ind.desc} onChange={v => updateInd('desc', v)} />
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Metrics <span className="font-normal normal-case opacity-60">(one per line)</span></label>
                                                                <textarea
                                                                    className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white resize-none text-sm"
                                                                    rows={3}
                                                                    value={Array.isArray(ind.metrics) ? ind.metrics.join('\n') : ind.metrics}
                                                                    onChange={e => updateInd('metrics', e.target.value.split('\n').filter(m => m.trim()))}
                                                                    placeholder={`e.g. 80% higher cart recovery\n3x repeat purchase rate`}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Illustration Image <span className="font-normal normal-case opacity-60">(replaces color placeholder)</span></label>
                                                                {ind.image ? (
                                                                    <div className="relative group w-full h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                                                                        <img src={ind.image} className="w-full h-full object-cover" alt={ind.title} />
                                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <button onClick={() => updateInd('image', '')} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 flex items-center gap-2">
                                                                                <X className="w-3.5 h-3.5" /> Remove
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <label className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-slate-400 hover:text-indigo-500 h-24">
                                                                        <Upload className="w-6 h-6 mb-1" />
                                                                        <span className="text-xs font-bold">Click to Upload Illustration</span>
                                                                        <span className="text-[10px] opacity-70">PNG, JPG up to 5MB</span>
                                                                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                                            const file = e.target.files[0];
                                                                            if (!file) return;
                                                                            const fd = new FormData();
                                                                            fd.append('image', file);
                                                                            try {
                                                                                const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/landing/upload-industry`, fd);
                                                                                updateInd('image', res.data.imageUrl);
                                                                                showToast({ type: 'success', title: 'Uploaded', message: 'Image uploaded successfully.' });
                                                                            } catch (err) {
                                                                                showToast({ type: 'error', title: 'Error', message: 'Failed to upload image.' });
                                                                            }
                                                                        }} />
                                                                    </label>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* FEATURES SECTION */}
                                {contentTab === 'features' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Feature Cards</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Highlight your platform's key capabilities.</p>
                                            </div>
                                            <button onClick={() => setConfig({ ...config, features: [...config.features, { title: 'New Feature', description: 'Description here', icon: 'Star' }] })}
                                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors shrink-0">
                                                <Plus className="w-3 h-3" /> Add Feature
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {config.features.map((feature, idx) => (
                                                <div key={idx} className="relative group p-5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-colors">
                                                    <button onClick={() => { const nf = config.features.filter((_, i) => i !== idx); setConfig({ ...config, features: nf }); }}
                                                        className="absolute top-2 right-2 p-1.5 bg-white dark:bg-surface-dark rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <div className="space-y-3">
                                                        <InputGroup label="Icon (Lucide)" value={feature.icon} onChange={v => { const nf = [...config.features]; nf[idx].icon = v; setConfig({ ...config, features: nf }); }} />
                                                        <InputGroup label="Title" value={feature.title} onChange={v => { const nf = [...config.features]; nf[idx].title = v; setConfig({ ...config, features: nf }); }} />
                                                        <InputGroup label="Description" type="textarea" value={feature.description} onChange={v => { const nf = [...config.features]; nf[idx].description = v; setConfig({ ...config, features: nf }); }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* SETUP STEPS */}
                                {contentTab === 'steps' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Setup Steps</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Edit the "f:\Bitslab\Whatsapp cloud" section on the landing page.</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Edit the "f:\Bitslab\Whatsapp cloud" section on the landing page.</p>
                                            </div>
                                            <button onClick={() => setConfig({ ...config, steps: [...(config.steps || []), { title: 'New Step', description: 'Describe this step.', icon: 'Zap' }] })}
                                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors shrink-0">
                                                <Plus className="w-3 h-3" /> Add Step
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {(config.steps || []).map((step, idx) => (
                                                <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-colors">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</div>
                                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Step {idx + 1}</span>
                                                        <button onClick={() => { const ns = (config.steps || []).filter((_, i) => i !== idx); setConfig({ ...config, steps: ns }); }}
                                                            className="ml-auto p-1.5 bg-white dark:bg-surface-dark rounded-lg text-slate-400 hover:text-red-500 transition-colors shadow-sm border border-slate-200 dark:border-white/10">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <InputGroup label="Icon (Lucide)" value={step.icon} onChange={v => { const ns = [...(config.steps || [])]; ns[idx] = { ...ns[idx], icon: v }; setConfig({ ...config, steps: ns }); }} placeholder="e.g. Smartphone" />
                                                        <InputGroup label="Title" value={step.title} onChange={v => { const ns = [...(config.steps || [])]; ns[idx] = { ...ns[idx], title: v }; setConfig({ ...config, steps: ns }); }} placeholder="e.g. Create Account" />
                                                        <InputGroup label="Description" type="textarea" value={step.description} onChange={v => { const ns = [...(config.steps || [])]; ns[idx] = { ...ns[idx], description: v }; setConfig({ ...config, steps: ns }); }} placeholder="Brief description..." />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
                                            <Zap className="w-4 h-4 shrink-0" />
                                            <span>Icons use <strong>Lucide React</strong> names: <code className="bg-white/60 dark:bg-black/20 px-1 rounded">UserPlus</code>, <code className="bg-white/60 dark:bg-black/20 px-1 rounded">Smartphone</code>, <code className="bg-white/60 dark:bg-black/20 px-1 rounded">Send</code>, <code className="bg-white/60 dark:bg-black/20 px-1 rounded">CheckCircle</code></span>
                                        </div>
                                    </div>
                                )}

                                {/* TESTIMONIALS */}
                                {contentTab === 'testimonials' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Customer Reviews</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Social proof testimonials displayed on the landing page.</p>
                                            </div>
                                            <button onClick={() => setConfig({ ...config, testimonials: [...config.testimonials, { name: 'John Doe', role: 'Customer', quote: 'Amazing service!', avatar: '' }] })}
                                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors shrink-0">
                                                <Plus className="w-3 h-3" /> Add Review
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {config.testimonials.map((t, idx) => (
                                                <div key={idx} className="relative group p-5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-colors">
                                                    <button onClick={() => { const nt = config.testimonials.filter((_, i) => i !== idx); setConfig({ ...config, testimonials: nt }); }}
                                                        className="absolute top-2 right-2 p-1.5 bg-white dark:bg-surface-dark rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <InputGroup label="Name" value={t.name} onChange={v => { const nt = [...config.testimonials]; nt[idx].name = v; setConfig({ ...config, testimonials: nt }); }} />
                                                            <InputGroup label="Role" value={t.role} onChange={v => { const nt = [...config.testimonials]; nt[idx].role = v; setConfig({ ...config, testimonials: nt }); }} />
                                                        </div>
                                                        <InputGroup label="Quote" type="textarea" value={t.quote} onChange={v => { const nt = [...config.testimonials]; nt[idx].quote = v; setConfig({ ...config, testimonials: nt }); }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* FAQS */}
                                {contentTab === 'faqs' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">FAQ Section</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Add questions and answers that appear in the FAQ accordion on the landing page.</p>
                                            </div>
                                            <button onClick={() => setConfig({ ...config, faqs: [...(config.faqs || []), { question: 'New Question?', answer: 'Your answer here.' }] })}
                                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors shrink-0">
                                                <Plus className="w-3 h-3" /> Add FAQ
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {(config.faqs || []).map((faq, idx) => (
                                                <div key={idx} className="relative group p-5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate flex-1">FAQ #{idx + 1}</span>
                                                        <button onClick={() => { const nf = (config.faqs || []).filter((_, i) => i !== idx); setConfig({ ...config, faqs: nf }); }}
                                                            className="p-1.5 bg-white dark:bg-surface-dark rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-slate-200 dark:border-white/10">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <InputGroup label="Question" value={faq.question}
                                                        onChange={v => { const nf = [...(config.faqs || [])]; nf[idx] = { ...nf[idx], question: v }; setConfig({ ...config, faqs: nf }); }}
                                                        placeholder="e.g. Is there a free trial?" />
                                                    <InputGroup label="Answer" type="textarea" value={faq.answer}
                                                        onChange={v => { const nf = [...(config.faqs || [])]; nf[idx] = { ...nf[idx], answer: v }; setConfig({ ...config, faqs: nf }); }}
                                                        placeholder="Your detailed answer..." />
                                                </div>
                                            ))}
                                            {(!config.faqs || config.faqs.length === 0) && (
                                                <div className="text-center py-12 text-slate-400 dark:text-slate-600">
                                                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                                    <p className="font-medium text-sm">No FAQs yet. Click "Add FAQ" to get started.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* CTA */}
                                {contentTab === 'cta' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Call to Action</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">The bottom conversion block encouraging sign-ups.</p>
                                        </div>
                                        <InputGroup label="Heading" value={config.cta.title} onChange={v => setConfig({ ...config, cta: { ...config.cta, title: v } })} />
                                        <InputGroup label="Subtext" type="textarea" value={config.cta.subtitle} onChange={v => setConfig({ ...config, cta: { ...config.cta, subtitle: v } })} />
                                        <InputGroup label="Button Text" value={config.cta.buttonText} onChange={v => setConfig({ ...config, cta: { ...config.cta, buttonText: v } })} />
                                    </div>
                                )}

                                {/* BRANDING */}
                                {contentTab === 'brand' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Branding & App Identity</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Configure your platform's identity, colours, and landing page theme.</p>
                                        </div>

                                        {/* App Identity */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Type className="w-4 h-4 text-indigo-500" />
                                                <span className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">App Identity</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InputGroup
                                                    label="Application Name"
                                                    value={brandingSettings.appName}
                                                    onChange={v => setBrandingSettings(prev => ({ ...prev, appName: v }))}
                                                    placeholder="e.g. Acme Corp"
                                                />
                                                <InputGroup
                                                    label="App Tagline"
                                                    value={brandingSettings.appTagline}
                                                    onChange={v => setBrandingSettings(prev => ({ ...prev, appTagline: v }))}
                                                    placeholder="e.g. Business API"
                                                />
                                                <InputGroup
                                                    label="Support Email"
                                                    value={brandingSettings.supportEmail}
                                                    onChange={v => setBrandingSettings(prev => ({ ...prev, supportEmail: v }))}
                                                    placeholder="support@example.com"
                                                />
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Currency</label>
                                                    <select value={brandingSettings.currency}
                                                        onChange={e => setBrandingSettings(prev => ({ ...prev, currency: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm">
                                                        <option value="USD">USD ($)</option>
                                                        <option value="EUR">EUR (€)</option>
                                                        <option value="INR">INR (₹)</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Timezone</label>
                                                    <select value={brandingSettings.timezone}
                                                        onChange={e => setBrandingSettings(prev => ({ ...prev, timezone: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm">
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
                                        </div>

                                        {/* Logo */}
                                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ImageIcon className="w-4 h-4 text-indigo-500" />
                                                <span className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Company Logo</span>
                                            </div>
                                            <div className="flex items-start gap-6">
                                                <div
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center relative overflow-hidden group cursor-pointer shrink-0">
                                                    {logoUploading ? (
                                                        <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                                                    ) : brandingSettings.logoUrl ? (
                                                        <img src={brandingSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <ImageIcon className="w-7 h-7 text-slate-400" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                                        {logoUploading ? 'Uploading...' : 'Upload'}
                                                    </div>
                                                </div>
                                                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Click the preview to upload. PNG, JPG, SVG or WEBP (max 5MB).</p>
                                                    <p className="text-xs text-slate-400">Or paste a direct URL:</p>
                                                    <input
                                                        type="text"
                                                        value={brandingSettings.logoUrl}
                                                        onChange={e => setBrandingSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                                                        placeholder="https://example.com/logo.png"
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                                    />
                                                    {brandingSettings.logoUrl && (
                                                        <button type="button" onClick={() => setBrandingSettings(prev => ({ ...prev, logoUrl: '' }))} className="text-xs text-red-500 hover:text-red-600 font-semibold">Remove Logo</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Favicon */}
                                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Globe className="w-4 h-4 text-indigo-500" />
                                                <span className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Site Favicon</span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">The small icon shown in browser tabs, bookmarks, and mobile home screens. Recommended: 32×32 or 64×64 PNG/ICO.</p>
                                            <div className="flex items-start gap-6">
                                                <div
                                                    onClick={() => faviconInputRef.current?.click()}
                                                    className="w-16 h-16 rounded-xl bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center relative overflow-hidden group cursor-pointer shrink-0">
                                                    {faviconUploading ? (
                                                        <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                                                    ) : brandingSettings.faviconUrl ? (
                                                        <img src={brandingSettings.faviconUrl} alt="Favicon" className="w-full h-full object-contain p-1" />
                                                    ) : (
                                                        <Globe className="w-5 h-5 text-slate-400" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                                                        {faviconUploading ? '...' : 'Upload'}
                                                    </div>
                                                </div>
                                                <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/svg+xml,image/webp,image/jpeg,image/ico" className="hidden" onChange={handleFaviconUpload} />
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Click the preview to upload. PNG, ICO, SVG or WEBP (max 1MB).</p>
                                                    <p className="text-xs text-slate-400">Or paste a direct URL:</p>
                                                    <input
                                                        type="text"
                                                        value={brandingSettings.faviconUrl}
                                                        onChange={e => setBrandingSettings(prev => ({ ...prev, faviconUrl: e.target.value }))}
                                                        placeholder="https://example.com/favicon.ico"
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                                    />
                                                    {brandingSettings.faviconUrl && (
                                                        <button type="button" onClick={() => setBrandingSettings(prev => ({ ...prev, faviconUrl: '' }))} className="text-xs text-red-500 hover:text-red-600 font-semibold">Remove Favicon</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Register Banner */}
                                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ImageIcon className="w-4 h-4 text-emerald-500" />
                                                <span className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Register Page Banner</span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Overrides the default glassmorphism layout on the left side of the registration page. Recommended aspect ratio 9:16 or 3:4.</p>
                                            <div className="flex items-start gap-6">
                                                <div
                                                    onClick={() => bannerInputRef.current?.click()}
                                                    className="w-16 h-24 rounded-xl bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center relative overflow-hidden group cursor-pointer shrink-0">
                                                    {bannerUploading ? (
                                                        <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                                                    ) : brandingSettings.registerBannerUrl ? (
                                                        <img src={brandingSettings.registerBannerUrl} alt="Banner" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="w-5 h-5 text-slate-400" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                                                        {bannerUploading ? '...' : 'Upload'}
                                                    </div>
                                                </div>
                                                <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleBannerUpload} />
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Click the preview to upload. PNG, JPG, or WEBP (max 5MB).</p>
                                                    <p className="text-xs text-slate-400">Or paste a direct URL:</p>
                                                    <input
                                                        type="text"
                                                        value={brandingSettings.registerBannerUrl}
                                                        onChange={e => setBrandingSettings(prev => ({ ...prev, registerBannerUrl: e.target.value }))}
                                                        placeholder="https://example.com/banner.jpg"
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                                    />
                                                    {brandingSettings.registerBannerUrl && (
                                                        <button type="button" onClick={() => setBrandingSettings(prev => ({ ...prev, registerBannerUrl: '' }))} className="text-xs text-red-500 hover:text-red-600 font-semibold">Remove Banner</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Visual & Landing */}
                                        <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Palette className="w-4 h-4 text-indigo-500" />
                                                <span className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Visual & Landing Page</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Primary Color</label>
                                                    <div className="flex items-center gap-3">
                                                        <input type="color" value={brandingSettings.primaryColor}
                                                            onChange={e => setBrandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                                                            className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 shrink-0" />
                                                        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{brandingSettings.primaryColor}</span>
                                                    </div>
                                                </div>
                                                <InputGroup label="Brand Name (Landing Footer)" value={config.brand?.name || ''} onChange={v => setConfig({ ...config, brand: { ...config.brand, name: v } })} />
                                                <InputGroup label="Footer Copyright Text" value={config.brand?.footerText || ''} onChange={v => setConfig({ ...config, brand: { ...config.brand, footerText: v } })} />
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Landing Page Theme</label>
                                                    <select value={config.theme || 'light'}
                                                        onChange={e => setConfig({ ...config, theme: e.target.value })}
                                                        className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm">
                                                        <option value="light">Light Mode</option>
                                                        <option value="dark">Dark Mode</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-indigo-700 dark:text-indigo-400 text-sm">
                                            <Save className="w-4 h-4 shrink-0" />
                                            <span>Click <strong>Save Changes</strong> above to apply branding and landing page settings together.</span>
                                        </div>
                                    </div>
                                )}

                                {/* FOOTER */}
                                {contentTab === 'footer' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Footer Configuration</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Manage columns, links, and bottom bar text.</p>
                                            </div>
                                            <button onClick={() => setConfig({ ...config, footer: { ...config.footer, columns: [...(config.footer?.columns || []), { heading: 'New Column', links: [] }] } })}
                                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors shrink-0">
                                                <Plus className="w-3 h-3" /> Add Column
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            {(config.footer?.columns || []).map((col, cIdx) => (
                                                <div key={cIdx} className="p-5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <input
                                                            value={col.heading}
                                                            onChange={e => { const nc = [...config.footer.columns]; nc[cIdx].heading = e.target.value; setConfig({ ...config, footer: { ...config.footer, columns: nc } }); }}
                                                            className="font-bold text-lg bg-transparent border-none outline-none focus:ring-0 text-slate-900 dark:text-white w-[200px] max-w-full"
                                                            placeholder="Column Heading"
                                                        />
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                onClick={() => { const nc = [...config.footer.columns]; nc[cIdx].links.push({ label: 'New Link', href: '/' }); setConfig({ ...config, footer: { ...config.footer, columns: nc } }); }}
                                                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
                                                                + Add Link
                                                            </button>
                                                            <button
                                                                onClick={() => { const nc = config.footer.columns.filter((_, i) => i !== cIdx); setConfig({ ...config, footer: { ...config.footer, columns: nc } }); }}
                                                                className="p-1.5 text-slate-400 rounded-lg hover:bg-white dark:hover:bg-surface-dark hover:text-red-500 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all shadow-sm">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 pl-4 border-l-2 border-slate-200 dark:border-white/10">
                                                        {col.links.length === 0 && <p className="text-sm text-slate-400 italic mb-2">No links in this column.</p>}
                                                        {col.links.map((link, lIdx) => (
                                                            <div key={lIdx} className="flex gap-3 items-center group">
                                                                <input
                                                                    value={link.label}
                                                                    onChange={e => { const nc = [...config.footer.columns]; nc[cIdx].links[lIdx].label = e.target.value; setConfig({ ...config, footer: { ...config.footer, columns: nc } }); }}
                                                                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-indigo-500 dark:text-white"
                                                                    placeholder="Link Label"
                                                                />
                                                                <input
                                                                    value={link.href}
                                                                    onChange={e => { const nc = [...config.footer.columns]; nc[cIdx].links[lIdx].href = e.target.value; setConfig({ ...config, footer: { ...config.footer, columns: nc } }); }}
                                                                    className="flex-[1.5] px-3 py-2 text-sm bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-indigo-500 text-slate-500 dark:text-slate-400"
                                                                    placeholder="URL or /path"
                                                                />
                                                                <button
                                                                    onClick={() => { const nc = [...config.footer.columns]; nc[cIdx].links = nc[cIdx].links.filter((_, i) => i !== lIdx); setConfig({ ...config, footer: { ...config.footer, columns: nc } }); }}
                                                                    className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                                            <h4 className="font-bold text-slate-900 dark:text-white">Bottom Bar</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InputGroup label="Left Text (Copyright)" value={config.footer?.bottomBarLeft || ''} onChange={v => setConfig({ ...config, footer: { ...config.footer, bottomBarLeft: v } })} placeholder="© {year} {brand}. All rights reserved." />
                                                <InputGroup label="Right Text (Stats/Links)" value={config.footer?.bottomBarRight || ''} onChange={v => setConfig({ ...config, footer: { ...config.footer, bottomBarRight: v } })} placeholder="Built for Scale • 99.9% Uptime" />
                                            </div>
                                            <p className="text-xs text-slate-400 flex items-center gap-2 mt-2">
                                                <Globe className="w-3.5 h-3.5" /> Note: Social icons are managed from the <strong>SEO & Social</strong> tab.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* PUBLIC PAGES */}
                                {contentTab === 'public_pages' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Company & Legal Pages</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Edit the content for public pages like About Us, Privacy Policy, etc.</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                { key: 'about', title: 'About Us', path: '/about' },
                                                { key: 'partner', title: 'Partner with Us', path: '/partner' },
                                                { key: 'privacy', title: 'Privacy Policy', path: '/privacy' },
                                                { key: 'terms', title: 'Terms of Service', path: '/terms' },
                                                { key: 'refund-policy', title: 'Refund Policy', path: '/refund-policy' }
                                            ].map((page) => (
                                                <div key={page.key} className="p-5 rounded-2xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-colors shadow-sm">
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white">{page.title}</h4>
                                                        <p className="text-sm text-slate-500 font-mono mt-1">{page.path}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingPageKey(page.key);
                                                                setPageEditorTitle(page.title);
                                                                setPageEditorContent(config.publicPages?.[page.key] || '');
                                                                setShowPageEditor(true);
                                                            }}
                                                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" /> Edit Content
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CONTACT SETTINGS */}
                                {contentTab === 'contact_page' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Contact Information</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Configure the details for your public contact page.</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-2">
                                                <InputGroup label="Email Address" value={config.contactInfo?.email || ''}
                                                    onChange={v => setConfig({ ...config, contactInfo: { ...config.contactInfo, email: v } })}
                                                    placeholder="hello@example.com" />
                                            </div>
                                            <div className="col-span-2">
                                                <InputGroup label="Support Email" value={config.contactInfo?.supportEmail || ''}
                                                    onChange={v => setConfig({ ...config, contactInfo: { ...config.contactInfo, supportEmail: v } })}
                                                    placeholder="support@example.com" />
                                            </div>
                                            <div className="col-span-2">
                                                <InputGroup label="Phone Number" value={config.contactInfo?.phone || ''}
                                                    onChange={v => setConfig({ ...config, contactInfo: { ...config.contactInfo, phone: v } })}
                                                    placeholder="+1 234 567 8900" />
                                            </div>
                                            <div className="col-span-2">
                                                <InputGroup label="Headquarters Address Line 1" value={config.contactInfo?.addressLine1 || ''}
                                                    onChange={v => setConfig({ ...config, contactInfo: { ...config.contactInfo, addressLine1: v } })}
                                                    placeholder="Global remote team" />
                                            </div>
                                            <div className="col-span-2">
                                                <InputGroup label="Headquarters Address Line 2" value={config.contactInfo?.addressLine2 || ''}
                                                    onChange={v => setConfig({ ...config, contactInfo: { ...config.contactInfo, addressLine2: v } })}
                                                    placeholder="Building the future of messaging" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* AI CHATBOT SETTINGS */}
                                {contentTab === 'ai_chatbot' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">AI Chatbot</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Configure the public Gemini AI assistant.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={config.aiChatbot?.enabled || false}
                                                    onChange={e => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, enabled: e.target.checked } })} />
                                                <div className="w-11 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                <span className="ml-3 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{config.aiChatbot?.enabled ? 'Enabled' : 'Disabled'}</span>
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="col-span-1 border border-indigo-100 dark:border-indigo-500/20 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">CRM Lead Funnel</h4>
                                                        <p className="text-xs text-indigo-700 dark:text-indigo-400">Capture phone numbers and push directly into Contacts</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked={config.aiChatbot?.leadCaptureEnabled || false}
                                                            onChange={e => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, leadCaptureEnabled: e.target.checked } })} />
                                                        <div className="w-9 h-5 bg-slate-300 dark:bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>

                                                {config.aiChatbot?.leadCaptureEnabled && !crmLinkedUser && (
                                                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm font-medium mt-4 mb-2">
                                                        ⚠️ Warning: No System CRM account is linked. Please go to the CRM section and link a Platform CRM account first. Lead routing and auto-triggers require a linked CRM.
                                                    </div>
                                                )}

                                                {config.aiChatbot?.leadCaptureEnabled && (
                                                    <div className={`space-y-4 pt-2 border-t border-indigo-100 dark:border-indigo-500/20 ${!crmLinkedUser ? 'opacity-50 pointer-events-none' : ''}`}>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Assign Chats To (Team Members)</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {teamMembers.map(member => {
                                                                    const isSelected = (config.aiChatbot?.crmOwners || []).includes(member.id);
                                                                    return (
                                                                        <button key={member.id} type="button"
                                                                            onClick={() => {
                                                                                const owners = config.aiChatbot?.crmOwners || [];
                                                                                if (isSelected) setConfig({ ...config, aiChatbot: { ...config.aiChatbot, crmOwners: owners.filter(id => id !== member.id) } });
                                                                                else setConfig({ ...config, aiChatbot: { ...config.aiChatbot, crmOwners: [...owners, member.id] } });
                                                                            }}
                                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-black/20 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-indigo-400'}`}>
                                                                            {member.name} {isSelected && '✓'}
                                                                        </button>
                                                                    );
                                                                })}
                                                                {teamMembers.length === 0 && <span className="text-xs text-slate-400">No team members found.</span>}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">CRM Tags</label>
                                                            <MultiSelectDropdown
                                                                options={crmTagsList.map(t => ({ value: t, label: t }))}
                                                                value={typeof config.aiChatbot?.crmTags === 'string' ? config.aiChatbot?.crmTags.split(',').map(t => t.trim()).filter(Boolean) : (config.aiChatbot?.crmTags || [])}
                                                                onChange={val => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, crmTags: val } })}
                                                                placeholder="Select or create tags..."
                                                                allowCreate={true}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">CRM Groups</label>
                                                            <MultiSelectDropdown
                                                                options={crmGroupsList.map(g => ({ value: g.name, label: g.name, color: g.color }))}
                                                                value={typeof config.aiChatbot?.crmGroups === 'string' ? config.aiChatbot?.crmGroups.split(',').map(t => t.trim()).filter(Boolean) : (config.aiChatbot?.crmGroups || [])}
                                                                onChange={val => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, crmGroups: val } })}
                                                                placeholder="Select groups..."
                                                                allowCreate={false}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider flex justify-between items-center">
                                                                <span>Auto-Trigger Template</span>
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={config.aiChatbot?.autoTriggerTemplate || false} onChange={e => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, autoTriggerTemplate: e.target.checked } })} />
                                                                    <div className="w-7 h-4 bg-slate-300 dark:bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                                                                </label>
                                                            </label>
                                                            {config.aiChatbot?.autoTriggerTemplate && (
                                                                <select value={config.aiChatbot?.templateName || ''} onChange={e => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, templateName: e.target.value } })}
                                                                    className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white">
                                                                    <option value="">Select a template...</option>
                                                                    {templates.map(tpl => (
                                                                        <option key={tpl.id} value={tpl.name}>{tpl.name} ({tpl.language})</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Qualification Questions</label>
                                                            <textarea value={config.aiChatbot?.qualificationQuestions || ''} onChange={e => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, qualificationQuestions: e.target.value } })}
                                                                placeholder="What is your main requirement?\nHow can our platform be helpful to you?" rows={3}
                                                                className="w-full px-4 py-3 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white resize-none" />
                                                            <p className="text-[10px] text-slate-500">The AI will ask these questions naturally before asking for the phone number.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-span-1">
                                                <InputGroup label="Bot Name" value={config.aiChatbot?.botName || ''}
                                                    onChange={v => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, botName: v } })}
                                                    placeholder="AI Assistant" />
                                            </div>
                                            <div className="col-span-1">
                                                <InputGroup label="Bot Icon URL (Optional Image Link)" value={config.aiChatbot?.botIconUrl || ''}
                                                    onChange={v => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, botIconUrl: v } })}
                                                    placeholder="https://example.com/bot-avatar.png" />
                                                <p className="text-[10px] text-slate-500 mt-1">Provide a direct link to an image (PNG/JPG) to show as the bot's avatar. Leave empty for default icon.</p>
                                            </div>

                                            {/* Auto Open Settings */}
                                            <div className="col-span-1 md:col-span-2 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Auto-Open Chatbot</h4>
                                                        <p className="text-xs text-slate-500">Automatically pop open the chat window when a visitor lands on the page.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer"
                                                            checked={config.aiChatbot?.autoOpen || false}
                                                            onChange={e => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, autoOpen: e.target.checked } })} />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>

                                                {config.aiChatbot?.autoOpen && (
                                                    <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                                                        <InputGroup type="number" label="Delay Before Opening (Seconds)" value={config.aiChatbot?.autoOpenDelay ?? 5}
                                                            onChange={v => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, autoOpenDelay: parseInt(v) || 0 } })}
                                                            placeholder="5" />
                                                        <p className="text-[10px] text-slate-500 mt-1">Wait this many seconds before popping up. Gives the user time to look at the site first.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <InputGroup label="Welcome Message" value={config.aiChatbot?.welcomeMessage || ''}
                                                    onChange={v => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, welcomeMessage: v } })}
                                                    placeholder="Hi there! How can I help you learn more about our platform?" />
                                            </div>
                                            <div className="col-span-1">
                                                <InputGroup type="textarea" label="Knowledge Base Data (Instructions & Facts)" value={config.aiChatbot?.knowledgeBase || ''}
                                                    onChange={v => setConfig({ ...config, aiChatbot: { ...config.aiChatbot, knowledgeBase: v } })}
                                                    placeholder="Paste all pricing details, features, and FAQs here. The AI will strictly use this data to answer questions." />
                                                <p className="text-xs text-slate-500 mt-2">The Gemini AI model is instructed to strictly answer questions based on this knowledge base and refuse off-topic inquiries.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>{/* end right panel */}
                        </div>{/* end split layout */}
                    </div>
                )}

                {/* SEO TAB */}
                {mainTab === 'seo' && (
                    <div className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-y-auto" style={{ height: '680px' }}>
                        <div className="p-4 md:p-8 w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-start gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-indigo-700 dark:text-indigo-300">
                                <Monitor className="w-6 h-6 shrink-0 mt-1" />
                                <div>
                                    <div className="font-bold mb-1">Search Engine Optimization</div>
                                    <p className="text-sm opacity-80">Configure how your site appears in Google searches and when shared on social media (Facebook, Twitter, WhatsApp).</p>
                                </div>
                            </div>

                            <InputGroup
                                label="Meta Title"
                                value={config.seo?.title || ''}
                                onChange={v => setConfig({ ...config, seo: { ...config.seo, title: v } })}
                                placeholder="e.g. Bluetick - Best Bulk Sender"
                            />

                            <InputGroup
                                label="Meta Description"
                                type="textarea"
                                value={config.seo?.description || ''}
                                onChange={v => setConfig({ ...config, seo: { ...config.seo, description: v } })}
                                placeholder="A brief summary of your page..."
                            />

                            <InputGroup
                                label="Keywords (Comma separated)"
                                value={config.seo?.keywords || ''}
                                onChange={v => setConfig({ ...config, seo: { ...config.seo, keywords: v } })}
                                placeholder="e.g. marketing, automation, whatsapp api"
                            />

                            <InputGroup
                                label="Social Share Image URL (OG:Image)"
                                value={config.seo?.ogImage || ''}
                                onChange={v => setConfig({ ...config, seo: { ...config.seo, ogImage: v } })}
                                placeholder="https://example.com/share-image.jpg"
                            />

                            <div className="pt-8 border-t border-slate-100 dark:border-white/5 space-y-6">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" /> Advanced SEO
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputGroup
                                        label="Canonical URL"
                                        value={config.seo?.canonicalUrl || ''}
                                        onChange={v => setConfig({ ...config, seo: { ...config.seo, canonicalUrl: v } })}
                                        placeholder="https://yourdomain.com/"
                                    />
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Robots Meta</label>
                                        <select
                                            value={config.seo?.robots || 'index, follow'}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, robots: e.target.value } })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                        >
                                            <option value="index, follow">Index, Follow (Recommended)</option>
                                            <option value="noindex, follow">NoIndex, Follow</option>
                                            <option value="index, nofollow">Index, NoFollow</option>
                                            <option value="noindex, nofollow">NoIndex, NoFollow (Private)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Social Profiles */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Social Profiles (for Knowledge Graph)</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                            placeholder="Facebook URL"
                                            value={config.seo?.socialLinks?.facebook || ''}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, socialLinks: { ...config.seo.socialLinks, facebook: e.target.value } } })}
                                        />
                                        <input
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                            placeholder="Twitter URL"
                                            value={config.seo?.socialLinks?.twitter || ''}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, socialLinks: { ...config.seo.socialLinks, twitter: e.target.value } } })}
                                        />
                                        <input
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                            placeholder="Instagram URL"
                                            value={config.seo?.socialLinks?.instagram || ''}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, socialLinks: { ...config.seo.socialLinks, instagram: e.target.value } } })}
                                        />
                                        <input
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                            placeholder="LinkedIn URL"
                                            value={config.seo?.socialLinks?.linkedin || ''}
                                            onChange={e => setConfig({ ...config, seo: { ...config.seo, socialLinks: { ...config.seo.socialLinks, linkedin: e.target.value } } })}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl flex justify-between items-center border border-slate-100 dark:border-white/5">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">Sitemap URL</div>
                                        <div className="text-xs text-slate-500 mb-3">Submit this to Google Search Console</div>
                                        <button 
                                            onClick={handleGenerateSitemap}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" /> Generate Latest Sitemap
                                        </button>
                                    </div>
                                    <a
                                        href={`${import.meta.env.VITE_API_URL}/sitemap.xml`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 dark:text-indigo-400 text-sm font-mono underline hover:text-indigo-500"
                                    >
                                        /sitemap.xml
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* COUPONS TAB */}
                {mainTab === 'coupons' && (
                    <div className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-y-auto" style={{ height: '680px' }}>
                        <div className="p-4 md:p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Tag className="w-6 h-6 text-indigo-500" /> Discount Coupons
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage promo codes and checkout discounts.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingCoupon(null);
                                        setCouponForm({
                                            code: '', discountType: 'percentage', discountValue: 0, startDate: '', expiryDate: '',
                                            maxUses: 0, userLimit: 1, minPurchaseAmount: 0, isValidForUpgrades: false,
                                            isFirstPurchaseOnly: false, validIntervals: '', maxDiscountCap: 0, allowedEmails: ''
                                        });
                                        setShowCouponModal(true);
                                    }}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all font-bold flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Plus className="w-4 h-4" /> Create Coupon
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                                <table className="w-full text-left border-collapse min-w-[700px] max-w-full">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                            <th className="p-4">Code</th>
                                            <th className="p-4">Discount</th>
                                            <th className="p-4">Global Uses</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {coupons.length === 0 ? (
                                            <tr><td colSpan="5" className="p-4 md:p-8 text-center text-slate-500 font-medium">No coupons created yet.</td></tr>
                                        ) : coupons.map(c => (
                                            <tr key={c.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white mb-1">{c.code}</span>
                                                        {(c.startDate || c.expiryDate) && (
                                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'No expiry'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-600 dark:text-slate-300 font-bold">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs">
                                                        {c.discountType === 'percentage' ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                                        {c.discountType === 'percentage' ? `${c.discountValue}% Off` : `₹${c.discountValue} Off`}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-slate-700 dark:text-slate-300 text-sm font-bold mb-0.5">{c.usesCount} / {c.maxUses === 0 ? '∞' : c.maxUses}</div>
                                                    <div className="text-[10px] text-slate-400">Limit per user: {c.userLimit}</div>
                                                </td>
                                                <td className="p-4">
                                                    <button onClick={() => handleToggleCoupon(c.id, c.isActive)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none ring-2 ring-transparent transition-colors duration-200 ease-in-out ${c.isActive ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${c.isActive ? 'translate-x-2' : '-translate-x-2'}`} />
                                                    </button>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCoupon(c);
                                                                setCouponForm({
                                                                    code: c.code, discountType: c.discountType, discountValue: c.discountValue,
                                                                    startDate: c.startDate ? c.startDate.substring(0, 16) : '',
                                                                    expiryDate: c.expiryDate ? c.expiryDate.substring(0, 16) : '',
                                                                    maxUses: c.maxUses, userLimit: c.userLimit, minPurchaseAmount: c.minPurchaseAmount,
                                                                    isValidForUpgrades: c.isValidForUpgrades || false,
                                                                    isFirstPurchaseOnly: c.isFirstPurchaseOnly || false,
                                                                    validIntervals: c.validIntervals ? c.validIntervals.join(', ') : '',
                                                                    maxDiscountCap: c.maxDiscountCap || 0,
                                                                    allowedEmails: c.allowedEmails ? c.allowedEmails.join(', ') : ''
                                                                });
                                                                setShowCouponModal(true);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 dark:bg-black/20 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-transparent dark:border-white/5"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCoupon(c.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 dark:bg-black/20 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent dark:border-white/5"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>{/* end table overflow */}
                        </div>{/* end p-8 */}
                    </div>
                )}


                {/* BLOGS TAB */}
                {mainTab === 'blogs' && (
                    <div className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ height: '680px' }}>
                        <BlogManager />
                    </div>
                )}

                {/* Coupon Form Modal */}
                {showCouponModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
                            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-black/10">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-indigo-500" />
                                    {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                                </h3>
                                <button onClick={() => setShowCouponModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                                    ✕
                                </button>
                            </div>
                            <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Coupon Code *</label>
                                        <input
                                            value={couponForm.code}
                                            onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase text-lg tracking-widest text-indigo-600 dark:text-indigo-400 shadow-sm"
                                            placeholder="e.g. SUMMER2024"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Discount Type</label>
                                        <select
                                            value={couponForm.discountType}
                                            onChange={e => setCouponForm({ ...couponForm, discountType: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                                        >
                                            <option value="percentage">Percentage (%)</option>
                                            <option value="fixed">Fixed Amount</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Discount Value *</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 font-bold">
                                                {couponForm.discountType === 'percentage' ? '%' : '₹'}
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={couponForm.discountValue}
                                                onChange={e => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                                                className="w-full px-4 py-3 pl-10 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Start Date</label>
                                        <input
                                            type="datetime-local"
                                            value={couponForm.startDate}
                                            onChange={e => setCouponForm({ ...couponForm, startDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Expiry Date</label>
                                        <input
                                            type="datetime-local"
                                            value={couponForm.expiryDate}
                                            onChange={e => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Global Max Uses (0 = unlimited)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={couponForm.maxUses}
                                            onChange={e => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Limit Per User</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={couponForm.userLimit}
                                            onChange={e => setCouponForm({ ...couponForm, userLimit: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                            Min Purchase Amount <span className="text-slate-400 lowercase normal-case text-[10px]">(0 for no minimum)</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={couponForm.minPurchaseAmount}
                                            onChange={e => setCouponForm({ ...couponForm, minPurchaseAmount: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                                        />
                                    </div>
                                    {couponForm.discountType === 'percentage' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                                Max Discount Cap <span className="text-slate-400 lowercase normal-case text-[10px]">(0 = no limit)</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={couponForm.maxDiscountCap}
                                                    onChange={e => setCouponForm({ ...couponForm, maxDiscountCap: e.target.value })}
                                                    className="w-full px-4 py-3 pl-10 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm font-bold"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Valid Billing Cycles</label>
                                        <div className="flex flex-wrap gap-4 mt-2">
                                            {[...new Set(plans.map(p => p.interval))].filter(Boolean).map(interval => {
                                                const selectedIntervals = couponForm.validIntervals ? couponForm.validIntervals.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
                                                const isChecked = selectedIntervals.includes(interval.toLowerCase());

                                                return (
                                                    <label key={interval} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    selectedIntervals.push(interval);
                                                                } else {
                                                                    const idx = selectedIntervals.indexOf(interval.toLowerCase());
                                                                    if (idx > -1) selectedIntervals.splice(idx, 1);
                                                                }
                                                                setCouponForm({ ...couponForm, validIntervals: selectedIntervals.join(', ') });
                                                            }}
                                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{interval}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1">Leave all unchecked to allow any billing cycle.</div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Allowed Emails/Domains (Comma separated)</label>
                                        <input
                                            value={couponForm.allowedEmails}
                                            onChange={e => setCouponForm({ ...couponForm, allowedEmails: e.target.value })}
                                            placeholder="e.g. vip@test.com, @partner.com (Leave blank for all)"
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2 mt-2">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={couponForm.isFirstPurchaseOnly}
                                                    onChange={e => setCouponForm({ ...couponForm, isFirstPurchaseOnly: e.target.checked })}
                                                />
                                                <div className={`w-11 h-6 rounded-full transition-colors ${couponForm.isFirstPurchaseOnly ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${couponForm.isFirstPurchaseOnly ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">First Purchase Only</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">If enabled, this coupon can only be used by users with 0 prior successful transactions.</div>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="space-y-2 md:col-span-2 mt-2">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={couponForm.isValidForUpgrades}
                                                    onChange={e => setCouponForm({ ...couponForm, isValidForUpgrades: e.target.checked })}
                                                />
                                                <div className={`w-11 h-6 rounded-full transition-colors ${couponForm.isValidForUpgrades ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${couponForm.isValidForUpgrades ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">Allow usage on Plan Upgrades</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">If disabled, this coupon cannot be applied if the user already has pro-rated credit for upgrading logic.</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-black/20">
                                <button
                                    onClick={() => setShowCouponModal(false)}
                                    className="px-4 md:px-6 py-2.5 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveCoupon}
                                    disabled={saving || !couponForm.code || couponForm.discountValue <= 0}
                                    className="px-4 md:px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all font-bold flex items-center gap-2"
                                >
                                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Saving...' : 'Save Coupon'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Page Editor Modal */}
                {showPageEditor && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={() => setShowPageEditor(false)}></div>
                        <div className="relative bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col flex-shrink-0 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-white/10">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editing: {pageEditorTitle}</h2>
                                    <p className="text-sm text-slate-500 mt-1">Make changes using the editor below.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                                        <button
                                            onClick={() => setShowHtmlEditor(false)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${!showHtmlEditor ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            Visual
                                        </button>
                                        <button
                                            onClick={() => setShowHtmlEditor(true)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${showHtmlEditor ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                            HTML Source
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowPageEditor(false)}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 md:p-6 overflow-y-auto flex-1">
                                {!showHtmlEditor ? (
                                    <ReactQuill
                                        theme="snow"
                                        value={pageEditorContent}
                                        onChange={setPageEditorContent}
                                        className="bg-white dark:bg-surface-dark dark:text-white h-[400px] mb-12"
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, 3, false] }],
                                                ['bold', 'italic', 'underline', 'strike'],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                ['link', 'image'],
                                                ['clean']
                                            ]
                                        }}
                                    />
                                ) : (
                                    <textarea
                                        value={pageEditorContent}
                                        onChange={(e) => setPageEditorContent(e.target.value)}
                                        className="w-full h-[400px] p-4 font-mono text-sm bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none dark:text-slate-900 dark:text-slate-300"
                                        placeholder="Enter HTML source code here..."
                                    />
                                )}
                            </div>

                            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-black/20 rounded-b-2xl">
                                <button
                                    onClick={() => setShowPageEditor(false)}
                                    className="px-4 md:px-6 py-2.5 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    Done
                                </button>
                                <button
                                    onClick={() => {
                                        setConfig({
                                            ...config,
                                            publicPages: {
                                                ...config.publicPages,
                                                [editingPageKey]: pageEditorContent
                                            }
                                        });
                                        setShowPageEditor(false);
                                        showToast({ type: 'success', title: 'Content Updated', message: 'Click Save Changes to publish your changes.' });
                                    }}
                                    className="px-4 md:px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all font-bold flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save to Config
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};



export default AdminLandingPage;
