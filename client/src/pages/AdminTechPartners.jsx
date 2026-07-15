import React, { useState, useEffect } from 'react';
import TrialBanner from '../components/TrialBanner';
import axios from 'axios';
import { Briefcase, DollarSign, Users, RefreshCw, X, Check, ChevronDown, ChevronUp, Copy, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';

const Toggle = ({ enabled, onChange, danger }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-6 rounded-full p-1 transition-colors relative ${enabled
            ? (danger ? 'bg-red-500' : 'bg-green-500')
            : 'bg-slate-200 dark:bg-slate-700'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);

const AdminTechPartners = () => {
    const { showToast } = useUI();
    const [partners, setPartners] = useState([]);
    const [applications, setApplications] = useState([]);
    const [activeTab, setActiveTab] = useState('partners'); // 'partners' | 'applications' | 'assets'
    
    const [loading, setLoading] = useState(true);
    const [payoutsModal, setPayoutsModal] = useState(null);
    const [signupsModal, setSignupsModal] = useState(null);
    const [expandedPartner, setExpandedPartner] = useState(null);

    // Config for toggle
    const [config, setConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [tempCommissionRate, setTempCommissionRate] = useState(20);
    const [tempMinPayout, setTempMinPayout] = useState(10000);
    const [tempRequiresYearly, setTempRequiresYearly] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    // Form modal state
    const [showForm, setShowForm] = useState(false);
    const [editingPartner, setEditingPartner] = useState(null);
    const [applicationUserId, setApplicationUserId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', code: '', phoneNumber: '',
        commissionType: 'percentage', commissionValue: 20, notes: ''
    });

    // Asset state
    const [assetFile, setAssetFile] = useState(null);
    const [assetName, setAssetName] = useState('');
    const [uploadingAsset, setUploadingAsset] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setLoadingConfig(true);
        try {
            const [pRes, cRes, aRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/system`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/applications`)
            ]);
            setPartners(pRes.data);
            setConfig(cRes.data);
            setApplications(aRes.data);
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to load data.' });
        } finally {
            setLoading(false);
            setLoadingConfig(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (config) {
            const tp = config.settings?.techPartnerProgram || {};
            setTempCommissionRate(tp.commissionRate !== undefined ? tp.commissionRate : 20);
            setTempMinPayout(tp.minPayoutBalance !== undefined ? tp.minPayoutBalance : 10000);
            setTempRequiresYearly(tp.requiresYearlyPlan !== false);
        }
    }, [config]);

    const tpConfig = config?.settings?.techPartnerProgram || { enabled: true };

    const handleToggleProgram = async (val) => {
        if (!config) return;
        const newConfig = {
            ...config,
            settings: {
                ...config.settings,
                techPartnerProgram: { ...tpConfig, enabled: val }
            }
        };
        setConfig(newConfig);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/system/settings`, newConfig);
            showToast({ type: 'success', message: 'Program status updated.' });
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to update program status.' });
        }
    };

    const handleSaveProgramConfig = async (e) => {
        if (e) e.preventDefault();
        if (!config) return;
        setSavingSettings(true);
        const newConfig = {
            ...config,
            settings: {
                ...config.settings,
                techPartnerProgram: {
                    ...tpConfig,
                    commissionRate: tempCommissionRate,
                    minPayoutBalance: tempMinPayout,
                    requiresYearlyPlan: tempRequiresYearly
                }
            }
        };
        setConfig(newConfig);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/system/settings`, newConfig);
            showToast({ type: 'success', message: 'Program settings updated.' });
            setShowSettings(false);
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to update program settings.' });
        } finally {
            setSavingSettings(false);
        }
    };

    const openCreate = () => {
        setEditingPartner(null);
        setApplicationUserId(null);
        setForm({ name: '', email: '', code: '', phoneNumber: '', commissionType: 'percentage', commissionValue: 20, notes: '' });
        setShowForm(true);
    };

    const openEdit = (p) => {
        setEditingPartner(p);
        setApplicationUserId(null);
        setForm({ name: p.name, email: p.email, code: p.code, phoneNumber: p.phoneNumber || '', commissionType: p.commissionType, commissionValue: p.commissionValue, notes: p.notes || '' });
        setShowForm(true);
    };

    const openApprove = (app) => {
        setEditingPartner(null);
        setApplicationUserId(app.id);
        
        let parsedNotes = {};
        try {
            parsedNotes = JSON.parse(app.techPartnerNotes) || {};
        } catch(e) { }

        setForm({ 
            name: app.name, 
            email: app.email, 
            code: app.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0,6) + Math.floor(Math.random()*1000), 
            phoneNumber: parsedNotes.phoneNumber || '', 
            commissionType: 'percentage', 
            commissionValue: 20, 
            notes: parsedNotes.notes || 'Approved via Application' 
        });
        setShowForm(true);
    };

    const handleReject = async (userId) => {
        if (!window.confirm("Reject this application?")) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/applications/${userId}/reject`);
            showToast({ type: 'success', message: 'Application rejected.' });
            fetchData();
        } catch(e) {
            showToast({ type: 'error', message: 'Failed to reject.' });
        }
    };

    const handleSavePartner = async () => {
        setSaving(true);
        try {
            if (applicationUserId) {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/applications/${applicationUserId}/approve`, form);
                showToast({ type: 'success', message: 'Application Approved.' });
                setActiveTab('partners');
            } else if (editingPartner) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/${editingPartner.id}`, form);
                showToast({ type: 'success', message: 'Partner updated.' });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners`, form);
                showToast({ type: 'success', message: 'Partner created.' });
            }
            setShowForm(false);
            fetchData();
        } catch (e) { 
            showToast({ type: 'error', message: e.response?.data?.error || 'Save failed' }); 
        } finally { 
            setSaving(false); 
        }
    };

    const handleDeletePartner = async (id, name) => {
        if (!window.confirm(`Delete partner "${name}"?`)) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/${id}`);
            showToast({ type: 'success', message: 'Partner deleted.' });
            fetchData();
        } catch (e) { 
            showToast({ type: 'error', message: 'Delete failed' }); 
        }
    };

    const handleToggleEnabledState = async (p) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/${p.id}`, { enabled: !p.enabled });
            fetchData();
        } catch (e) { 
            showToast({ type: 'error', message: 'Failed to update status.' }); 
        }
    };

    const openPayouts = async (partner) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/${partner.id}/payouts`);
            setPayoutsModal(res.data);
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to load payouts.' });
        }
    };

    const openSignups = async (partner) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/${partner.id}/signups`);
            setSignupsModal({ partner, users: res.data });
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to load signups.' });
        }
    };

    const markPaid = async (partnerId, payoutId) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/${partnerId}/payouts/${payoutId}/mark-paid`);
            showToast({ type: 'success', message: 'Payout marked as paid.' });
            openPayouts({ id: partnerId });
            fetchData(); // refresh pending balances
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to mark as paid.' });
        }
    };

    const copyPartnerLink = (code) => {
        const link = `${window.location.origin}/register?partner=${code}`;
        navigator.clipboard.writeText(link);
        showToast({ type: 'success', message: 'Partner link copied!' });
    };

    const commissionLabel = (type, value) => {
        if (type === 'percentage') return `${value}%`;
        if (type === 'flat') return `₹${value}`;
        return `${value} mo.`;
    };

    const handleUploadAsset = async (e) => {
        e.preventDefault();
        if (!assetFile || !assetName) return;
        setUploadingAsset(true);
        try {
            const formData = new FormData();
            formData.append('file', assetFile);
            formData.append('name', assetName);
            
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/assets`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast({ type: 'success', message: 'Asset uploaded successfully.' });
            setAssetFile(null);
            setAssetName('');
            // Optional: reset file input using a ref, but it's simpler to just clear state
            document.getElementById('assetFileInput').value = '';
            fetchData();
        } catch (err) {
            showToast({ type: 'error', message: err.response?.data?.error || 'Upload failed.' });
        } finally {
            setUploadingAsset(false);
        }
    };

    const handleDeleteAsset = async (id) => {
        if (!window.confirm("Delete this asset?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/tech-partners/assets/${id}`);
            showToast({ type: 'success', message: 'Asset deleted.' });
            fetchData();
        } catch (err) {
            showToast({ type: 'error', message: 'Failed to delete asset.' });
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            <AdminHeader><TrialBanner />
                    <ThemeToggle /></AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-32">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Briefcase className="w-8 h-8 text-purple-500" /> Tech Partners
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage partner program, payouts, and incoming applications.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1 mr-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Program Status</span>
                            {loadingConfig ? (
                                <div className="w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                            ) : (
                                <Toggle enabled={!!tpConfig.enabled} onChange={handleToggleProgram} />
                            )}
                        </div>
                        <button onClick={() => setShowSettings(!showSettings)} className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-colors font-bold ${showSettings ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20'}`}>
                            <Edit2 className="w-4 h-4" /> Program Settings
                        </button>
                        <button onClick={openCreate} className="flex items-center gap-2 text-sm bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30 font-bold">
                            <Plus className="w-4 h-4" /> Add Partner
                        </button>
                        <button onClick={fetchData} className="p-2.5 bg-slate-100 dark:bg-white/10 rounded-xl hover:rotate-180 transition-all">
                            <RefreshCw className="w-5 h-5 text-slate-600 dark:text-white" />
                        </button>
                    </div>
                </div>

                {/* Collapsible Program Settings Card */}
                {showSettings && (
                    <form onSubmit={handleSaveProgramConfig} className="bg-white dark:bg-surface-dark border-2 border-purple-500/30 dark:border-purple-500/20 rounded-2xl p-4 md:p-6 shadow-xl mb-8 transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-purple-500" /> Tech Partner Program Settings
                            </h3>
                            <button type="button" onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Default Commission Rate (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={tempCommissionRate}
                                    onChange={(e) => setTempCommissionRate(parseFloat(e.target.value) || 0)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl dark:bg-black/20 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Minimum Payout Balance (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={tempMinPayout}
                                    onChange={(e) => setTempMinPayout(parseFloat(e.target.value) || 0)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl dark:bg-black/20 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    required
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 h-[46px]">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Require Annual Plan</span>
                                <Toggle
                                    enabled={tempRequiresYearly}
                                    onChange={(val) => setTempRequiresYearly(val)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingSettings}
                                className="px-4 md:px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-colors shadow-lg shadow-purple-500/30 flex items-center gap-2 disabled:opacity-60"
                            >
                                {savingSettings ? <div className="w-4 h-4 rounded-full border-2 border-purple-300 border-t-white animate-spin" /> : <Check className="w-4 h-4" />}
                                Save Settings
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 leading-relaxed">
                            * Changes apply globally to all future transactions and applications. Individual partner commission rates can still be customized within each partner's details page.
                        </p>
                    </form>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Active Partners', value: partners.length, icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
                        { label: 'Applications', value: applications.length, icon: Users, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' },
                        { label: 'Total Signups', value: partners.reduce((s, p) => s + (p.signups || 0), 0), icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
                        { label: 'Pending Payouts', value: `₹${partners.reduce((s, p) => s + (p.pendingBalance || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-4 md:p-6 shadow-sm flex items-center gap-4">
                            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                                <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 mb-6">
                    <button 
                        onClick={() => setActiveTab('partners')}
                        className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'partners' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}
                    >
                        Active Partners
                    </button>
                    <button 
                        onClick={() => setActiveTab('applications')}
                        className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'applications' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}
                    >
                        Pending Applications
                        {applications.length > 0 && (
                            <span className="bg-pink-500 text-white rounded-full px-2 py-0.5 text-[10px]">{applications.length}</span>
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('assets')}
                        className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'assets' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'}`}
                    >
                        Marketing Assets
                    </button>
                </div>

                {/* Content */}
                <div className={`bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden transition-opacity duration-300 ${!tpConfig.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                    {loading ? (
                        <div className="p-4 md:p-12 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto" />
                        </div>
                    ) : activeTab === 'partners' ? (
                        /* PARTNERS TABLE */
                        partners.length === 0 ? (
                            <div className="p-4 md:p-12 text-center">
                                <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <h3 className="text-slate-900 dark:text-white font-bold mb-1">No tech partners yet</h3>
                                <p className="text-slate-500 text-sm">Click "Add Partner" above to create your first tech partner.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/5">
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Partner</th>
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Code / Link</th>
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Commission</th>
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Signups</th>
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Pending</th>
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Status</th>
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {partners.map((p) => (
                                            <React.Fragment key={p.id}>
                                                <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</div>
                                                        <div className="text-xs text-slate-500">{p.email}</div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <code className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-bold">
                                                                {p.code}
                                                            </code>
                                                            <button onClick={() => copyPartnerLink(p.code)} className="p-1 text-slate-400 hover:text-purple-500 transition-colors" title="Copy partner link">
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                        {commissionLabel(p.commissionType, p.commissionValue)}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <button onClick={() => openSignups(p)} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
                                                            {p.signups || 0}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 font-bold text-amber-600 dark:text-amber-400 text-sm">
                                                        ₹{(p.pendingBalance || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <button onClick={() => handleToggleEnabledState(p)} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                                                            p.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                                                        }`}>
                                                            {p.enabled ? '● Active' : '○ Disabled'}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => openPayouts(p)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-200 transition-colors" title="Manage Payouts">
                                                                <DollarSign className="w-3 h-3" /> Payouts
                                                            </button>
                                                            <button onClick={() => openEdit(p)} className="p-1.5 bg-slate-100 dark:bg-white/10 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors" title="Edit Partner">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDeletePartner(p.id, p.name)} className="p-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors" title="Delete Partner">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setExpandedPartner(expandedPartner === p.id ? null : p.id)} className="p-1.5 bg-slate-100 dark:bg-white/10 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors ml-1">
                                                                {expandedPartner === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedPartner === p.id && (
                                                    <tr className="bg-slate-50/50 dark:bg-white/5">
                                                        <td colSpan={7} className="px-4 md:px-6 py-4">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                                {[
                                                                    { label: 'Total All-Time Payouts', value: `₹${(p.totalPayouts || 0).toLocaleString()}` },
                                                                    { label: 'Pending Balance', value: `₹${(p.pendingBalance || 0).toLocaleString()}` },
                                                                    { label: 'Phone', value: p.phoneNumber || '—' },
                                                                    { label: 'Notes', value: p.notes || '—' }
                                                                ].map((item) => (
                                                                    <div key={item.label}>
                                                                        <div className="text-xs font-bold uppercase text-slate-400 mb-1">{item.label}</div>
                                                                        <div className="font-medium text-slate-900 dark:text-white">{item.value}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : activeTab === 'applications' ? (
                        /* APPLICATIONS TABLE */
                        applications.length === 0 ? (
                            <div className="p-4 md:p-12 text-center">
                                <CheckCircle className="w-12 h-12 text-emerald-400 dark:text-emerald-500/50 mx-auto mb-3" />
                                <h3 className="text-slate-900 dark:text-white font-bold mb-1">All caught up</h3>
                                <p className="text-slate-500 text-sm">No pending applications to review right now.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/5">
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Applicant</th>
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Date Applied</th>
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Notes / Phone</th>
                                            <th className="px-4 md:px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {applications.map((app) => {
                                            let pNotes = { notes: 'N/A', phoneNumber: 'N/A' };
                                            try { pNotes = JSON.parse(app.techPartnerNotes) || pNotes; } catch(e) {}
                                            
                                            return (
                                                <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white">{app.name}</div>
                                                        <div className="text-xs text-slate-500">{app.email}</div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-sm text-slate-500">
                                                        {new Date(app.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-300 max-w-sm truncate" title={pNotes.notes}>{pNotes.notes}</div>
                                                        <div className="text-xs text-blue-500 max-w-sm truncate">{pNotes.phoneNumber}</div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => openApprove(app)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors">
                                                                <Check className="w-3 h-3" /> Approve
                                                            </button>
                                                            <button onClick={() => handleReject(app.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors">
                                                                <XCircle className="w-3 h-3" /> Reject
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : activeTab === 'assets' ? (
                        /* ASSETS TAB */
                        <div className="p-4 md:p-6">
                            {/* Upload Form */}
                            <div className="mb-8 bg-slate-50 dark:bg-white/5 rounded-2xl p-4 md:p-6 border border-slate-200 dark:border-white/10">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Upload New Asset</h3>
                                <form onSubmit={handleUploadAsset} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Asset Name</label>
                                        <input type="text" placeholder="e.g. Platform Logo" value={assetName} onChange={e => setAssetName(e.target.value)} required className="w-full px-4 py-2.5 border rounded-xl dark:bg-black/20 dark:border-white/10 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">File</label>
                                        <input type="file" id="assetFileInput" onChange={e => setAssetFile(e.target.files[0])} required className="w-full px-4 py-2 border rounded-xl dark:bg-black/20 dark:border-white/10 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                    </div>
                                    <div>
                                        <button type="submit" disabled={uploadingAsset || !assetFile || !assetName} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-60">
                                            {uploadingAsset ? <div className="w-4 h-4 rounded-full border-2 border-purple-300 border-t-white animate-spin" /> : <Plus className="w-4 h-4" />}
                                            Upload Asset
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Assets Grid */}
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Existing Assets</h3>
                            {(!tpConfig.assets || tpConfig.assets.length === 0) ? (
                                <div className="p-4 md:p-12 text-center border border-dashed border-slate-300 dark:border-white/20 rounded-2xl">
                                    <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <h3 className="text-slate-900 dark:text-white font-bold mb-1">No Assets Uploaded</h3>
                                    <p className="text-slate-500 text-sm">Upload marketing assets to share with your Tech Partners.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {tpConfig.assets.map((asset) => (
                                        <div key={asset.id} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center relative group">
                                            <button 
                                                onClick={() => handleDeleteAsset(asset.id)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-500/20"
                                                title="Delete Asset"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="w-full h-36 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center mb-4 text-slate-400 group-hover:text-purple-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-500/10 transition-colors overflow-hidden">
                                                {asset.type === 'IMG' ? (
                                                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                                                ) : asset.type === 'VIDEO' ? (
                                                    <video src={asset.url} className="w-full h-full object-cover" muted playsInline />
                                                ) : (
                                                    <Briefcase className="w-8 h-8" />
                                                )}
                                            </div>
                                            <h4 className="font-bold text-slate-900 dark:text-white mb-1 truncate w-full" title={asset.name}>{asset.name}</h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{asset.type}</p>
                                            <a
                                                href={asset.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-600 dark:text-purple-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                View/Download
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </main>

            {/* Create/Edit Partner Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-white/5">
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                                {applicationUserId ? `Approve Tech Partner` : editingPartner ? `Edit — ${editingPartner.name}` : 'New Tech Partner'}
                            </h4>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                            {[
                                { label: 'Partner Name', key: 'name', type: 'text', placeholder: 'Acme Agency' },
                                { label: 'Contact Email', key: 'email', type: 'email', placeholder: 'partner@acme.com' },
                                { label: 'Unique Code', key: 'code', type: 'text', placeholder: 'ACME2026', help: 'Used in ?partner=CODE URL. Auto-uppercased.' },
                                { label: 'WhatsApp / Phone (optional)', key: 'phoneNumber', type: 'tel', placeholder: '+91 98765 43210' }
                            ].map(({ label, key, type, placeholder, help }) => (
                                <div key={key}>
                                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{label}</label>
                                    <input
                                        type={type}
                                        value={form[key]}
                                        onChange={e => setForm({ ...form, [key]: key === 'code' ? e.target.value.toUpperCase() : e.target.value })}
                                        placeholder={placeholder}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                    {help && <p className="text-xs text-slate-400 mt-1">{help}</p>}
                                </div>
                            ))}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Commission Type</label>
                                    <select
                                        value={form.commissionType}
                                        onChange={e => setForm({ ...form, commissionType: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                        <option value="validity_months">Validity Months</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                                        {form.commissionType === 'percentage' ? 'Rate (%)' : form.commissionType === 'flat' ? 'Amount (₹)' : 'Months'}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.commissionValue}
                                        onChange={e => setForm({ ...form, commissionValue: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Internal Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Agreement details, contact info, etc."
                                    rows={2}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-4 md:p-6 border-t border-slate-100 dark:border-white/5">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePartner}
                                disabled={saving || !form.name || !form.email || !form.code}
                                className="px-4 md:px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-colors shadow-lg shadow-purple-500/30 flex items-center gap-2 disabled:opacity-60"
                            >
                                {saving ? <div className="w-4 h-4 rounded-full border-2 border-purple-300 border-t-white animate-spin" /> : <Check className="w-4 h-4" />}
                                {applicationUserId ? 'Approve & Save' : editingPartner ? 'Save Changes' : 'Create Partner'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payouts Modal */}
            {payoutsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-white/5">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payouts — {payoutsModal.partner?.name}</h3>
                                <p className="text-sm text-slate-500">Pending Balance: <span className="font-bold text-amber-500">₹{(payoutsModal.partner?.pendingBalance || 0).toLocaleString()}</span></p>
                            </div>
                            <button onClick={() => setPayoutsModal(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {!payoutsModal.payouts?.length ? (
                                <div className="p-4 md:p-8 text-center text-slate-500">No payout records yet for this partner.</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/5 sticky top-0">
                                            <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">User</th>
                                            <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Plan</th>
                                            <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Commission</th>
                                            <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Date</th>
                                            <th className="px-5 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {payoutsModal.payouts.map((payout) => (
                                            <tr key={payout.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                                <td className="px-5 py-3">
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{payout.user?.name || '—'}</div>
                                                    <div className="text-xs text-slate-400">{payout.user?.email}</div>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{payout.planName}</td>
                                                <td className="px-5 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    ₹{payout.commissionAmount}
                                                </td>
                                                <td className="px-5 py-3 text-xs text-slate-500">{new Date(payout.createdAt).toLocaleDateString()}</td>
                                                <td className="px-5 py-3">
                                                    {payout.status === 'pending' ? (
                                                        <button
                                                            onClick={() => markPaid(payoutsModal.partner.id, payout.id)}
                                                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1"
                                                        >
                                                            <Check className="w-3 h-3" /> Mark Paid
                                                        </button>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-full text-xs font-bold">
                                                            ✓ Paid {payout.paidAt && `(${new Date(payout.paidAt).toLocaleDateString()})`}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Signups Modal */}
            {signupsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Signups via <code className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 px-1.5 rounded">{signupsModal.partner?.code}</code>
                            </h3>
                            <button onClick={() => setSignupsModal(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {!signupsModal.users?.length ? (
                                <div className="p-4 md:p-8 text-center text-slate-500">No users registered via this partner link yet.</div>
                            ) : (
                                <table className="w-full text-left">
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {signupsModal.users.map((u) => (
                                            <tr key={u.id} className="px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-white/5">
                                                <td className="px-5 py-4">
                                                    <div className="font-medium text-sm text-slate-900 dark:text-white">{u.name}</div>
                                                    <div className="text-xs text-slate-400">{u.email}</div>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-slate-500">{u.plan}</td>
                                                <td className="px-5 py-4 text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTechPartners;
