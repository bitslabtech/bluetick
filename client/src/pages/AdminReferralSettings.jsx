import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, X, Check } from 'lucide-react';
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

const ReferralConfigPanel = ({ config, setConfig, onSave }) => {
    if (!config?.settings) return null;

    // Ensure referral rules structure exists for rendering
    const rRules = config.settings.referralRules || { enabled: false, referrerRewards: [], refereeRewards: [] };

    const setRules = (newRules) => {
        setConfig({
            ...config,
            settings: { ...config.settings, referralRules: newRules }
        });
    };

    const addReward = (target) => {
        const key = target === 'referrer' ? 'referrerRewards' : 'refereeRewards';
        const arr = [...(rRules[key] || [])];
        arr.push({ type: 'validity_months', value: 1 });
        setRules({ ...rRules, [key]: arr });
    };

    const removeReward = (target, idx) => {
        const key = target === 'referrer' ? 'referrerRewards' : 'refereeRewards';
        const arr = [...(rRules[key] || [])];
        arr.splice(idx, 1);
        setRules({ ...rRules, [key]: arr });
    };

    const updateReward = (target, idx, field, val) => {
        const key = target === 'referrer' ? 'referrerRewards' : 'refereeRewards';
        const arr = [...(rRules[key] || [])];
        arr[idx] = { ...arr[idx], [field]: val };
        setRules({ ...rRules, [key]: arr });
    };

    const rewardTypes = [
        { id: 'validity_months', label: 'Plan Validity (Months)' },
        { id: 'ai_tokens', label: 'Give AI Tokens' },
        { id: 'extra_messages', label: 'Msg Limit (Bonus)' },
        { id: 'extra_contacts', label: 'Contact Limit (Bonus)' }
    ];

    const renderList = (target) => {
        const key = target === 'referrer' ? 'referrerRewards' : 'refereeRewards';
        const arr = rRules[key] || [];
        return (
            <div className="space-y-3 mt-3">
                {arr.map((rew, i) => (
                    <div key={i} className="flex gap-2 items-center bg-slate-50 dark:bg-black/20 p-2 rounded-xl border border-slate-200 dark:border-white/10">
                        <select
                            value={rew.type}
                            onChange={e => updateReward(target, i, 'type', e.target.value)}
                            className="flex-1 bg-transparent text-sm font-bold text-slate-700 dark:text-white p-2 border-none outline-none focus:ring-0"
                        >
                            {rewardTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
                        </select>
                        <input
                            type="number"
                            value={rew.value}
                            onChange={e => updateReward(target, i, 'value', Number(e.target.value))}
                            className="w-20 bg-white dark:bg-black/40 text-center text-sm font-bold p-2 rounded-lg border border-slate-200 dark:border-white/10 dark:text-white"
                        />
                        <button onClick={() => removeReward(target, i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-surface-dark border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                        <Users className="w-5 h-5 text-indigo-500" /> Referral Program Engine
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mt-1">Assign platform resources dynamically when a referred user buys a paid plan.</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Refferal Program Status</span>
                    <Toggle enabled={rRules.enabled} onChange={val => setRules({ ...rRules, enabled: val })} />
                </div>
            </div>

            <div className={`transition-opacity duration-300 ${!rRules.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Referrer */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 p-5 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm tracking-wide uppercase">Referrer Rewarded</h4>
                            <button onClick={() => addReward('referrer')} className="text-xs bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-200 transition-colors">
                                <Plus className="w-3 h-3" /> Add Yield
                            </button>
                        </div>
                        <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 leading-relaxed pr-8">What does the user get when their invitee buys a plan?</p>
                        {renderList('referrer')}
                    </div>

                    {/* Referee */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-5 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm tracking-wide uppercase">Invitee Rewarded</h4>
                            <button onClick={() => addReward('referee')} className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-emerald-200 transition-colors">
                                <Plus className="w-3 h-3" /> Add Yield
                            </button>
                        </div>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 leading-relaxed pr-8">What bonus does the new user get upon checkout?</p>
                        {renderList('referee')}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={() => onSave()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2">
                        <Check className="w-4 h-4" /> Save settings
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminReferralSettings = () => {
    const { showToast } = useUI();
    const [config, setConfig] = useState(null);
    const [stats, setStats] = useState({ totalJoined: 0, totalRewards: 0, uniqueReferrers: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [resConfig, resStats] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/system`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/system/referral-stats`)
            ]);
            setConfig(resConfig.data);
            setStats(resStats.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (newConfig = config) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/system/settings`, newConfig);
            setConfig(newConfig);
            showToast({ type: 'success', message: 'Referral settings updated successfully.' });
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', message: 'Failed to update referral settings.' });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!config) return null;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            <AdminHeader><ThemeToggle /></AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-32">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Users className="w-8 h-8 text-indigo-500" /> Referral Settings
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure global referral rules and rewards.</p>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center text-xl">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalJoined}</div>
                            <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Referred Users</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center text-xl">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalRewards}</div>
                            <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Rewards Given</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center text-xl">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.uniqueReferrers}</div>
                            <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Active Referrers</div>
                        </div>
                    </div>
                </div>

                <ReferralConfigPanel config={config} setConfig={setConfig} onSave={() => handleSave(config)} />
            </main>
        </div>
    );
};

export default AdminReferralSettings;
