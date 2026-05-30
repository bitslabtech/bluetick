import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Plus, Check, X, Edit, Trash2, ShieldCheck, Users, Store, Zap, MessageSquare, FileText, Sparkles, Save, Loader2, Settings, DollarSign, Activity, Layers, List, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';

const AdminPlans = () => {
    const { user } = useAuth();
    const { showModal, showToast } = useUI();
    const [activeTab, setActiveTab] = useState('plans');
    const [searchTerm, setSearchTerm] = useState('');

    // ────── Plans State ──────
    const [plans, setPlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [availableAddons, setAvailableAddons] = useState([]);

    // ────── Store State ──────
    const [storeItems, setStoreItems] = useState([]);
    const [storeLoading, setStoreLoading] = useState(true);
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [editingStoreItem, setEditingStoreItem] = useState(null);

    useEffect(() => {
        fetchPlans();
        fetchStoreItems();
    }, []);

    // ════════════════════════════════════
    //  PLANS HANDLERS
    // ════════════════════════════════════
    const fetchPlans = async () => {
        try {
            const res = await axios.get('/api/plans');
            setPlans(res.data);
            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const addonsRes = await axios.get('/api/admin/addons', config);
                setAvailableAddons(Array.isArray(addonsRes.data) ? addonsRes.data.filter(a => a.isActive) : []);
            } catch { }
        } catch (err) {
            console.error("Error fetching plans:", err);
        } finally {
            setPlansLoading(false);
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm("Are you sure? This might affect users on this plan.")) return;
        try {
            await axios.delete(`/api/plans/${id}`);
            setPlans(plans.filter(p => p.id !== id));
            showToast({ type: 'success', message: 'Plan deleted.' });
        } catch (err) {
            showModal({ type: 'error', title: 'Error', message: 'Failed to delete plan', confirmText: 'Close' });
        }
    };

    const handleSavePlan = async (formData) => {
        try {
            if (editingPlan) {
                const res = await axios.put(`/api/plans/${editingPlan.id}`, formData);
                setPlans(plans.map(p => p.id === editingPlan.id ? res.data : p));
                showToast({ type: 'success', message: `${res.data.name} plan updated!` });
            } else {
                const res = await axios.post('/api/plans', formData);
                setPlans([...plans, res.data]);
                showToast({ type: 'success', message: `${res.data.name} plan created!` });
            }
            setIsPlanModalOpen(false);
        } catch (err) {
            showModal({ type: 'error', title: 'Error', message: err.response?.data?.error || "Failed to save plan", confirmText: 'Close' });
        }
    };

    // ════════════════════════════════════
    //  STORE HANDLERS
    // ════════════════════════════════════
    const fetchStoreItems = async () => {
        try {
            const res = await axios.get('/api/admin/store', { headers: { Authorization: `Bearer ${token}` } });
            setStoreItems(res.data);
        } catch (err) {
            console.error("Error fetching store items:", err);
        } finally {
            setStoreLoading(false);
        }
    };

    const handleDeleteStoreItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this top-up?")) return;
        try {
            await axios.delete(`/api/admin/store/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setStoreItems(storeItems.filter(item => item.id !== id));
            showToast({ type: 'success', message: 'Top-up deleted.' });
        } catch (err) {
            showModal({ type: 'error', title: 'Error', message: 'Failed to delete top-up', confirmText: 'Close' });
        }
    };

    const handleSaveStoreItem = async (formData) => {
        try {
            if (editingStoreItem) {
                const res = await axios.put(`/api/admin/store/${editingStoreItem.id}`, formData, { headers: { Authorization: `Bearer ${token}` } });
                setStoreItems(storeItems.map(item => item.id === editingStoreItem.id ? res.data : item));
                showToast({ type: 'success', message: `${res.data.name} updated!` });
            } else {
                const res = await axios.post('/api/admin/store', formData, { headers: { Authorization: `Bearer ${token}` } });
                setStoreItems([res.data, ...storeItems]);
                showToast({ type: 'success', message: `${res.data.name} created!` });
            }
            setIsStoreModalOpen(false);
        } catch (err) {
            showModal({ type: 'error', title: 'Error', message: err.response?.data?.error || "Failed to save top-up", confirmText: 'Close' });
        }
    };

    // ────── Filtered Data ──────
    const filteredPlans = plans.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredStoreItems = storeItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tabs = [
        { key: 'plans', label: 'Subscription Plans', icon: CreditCard, count: plans.length },
        { key: 'topups', label: 'Store Top-ups', icon: Store, count: storeItems.length }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            <AdminHeader searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)}>
                <ThemeToggle />
            </AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Plans & Pricing</h1>
                        <p className="text-slate-500 dark:text-text-secondary mt-1 text-lg">Manage subscription tiers and one-time top-ups.</p>
                    </div>
                    <button
                        onClick={() => {
                            if (activeTab === 'plans') { setEditingPlan(null); setIsPlanModalOpen(true); }
                            else { setEditingStoreItem(null); setIsStoreModalOpen(true); }
                        }}
                        className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#0088cc] text-white font-bold rounded-xl hover:bg-[#0077b3] transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5 shrink-0" />
                        {activeTab === 'plans' ? 'Create New Plan' : 'Create New Top-up'}
                    </button>
                </div>

                {/* ════════ Tab Bar ════════ */}
                <div className="flex items-center gap-1 p-1 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 shadow-sm mb-8 w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === tab.key
                                    ? 'bg-[#0088cc] text-white shadow-md shadow-blue-500/20'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ════════ Plans Tab ════════ */}
                {activeTab === 'plans' && (
                    <>
                        {plansLoading ? (
                            <div className="text-center py-20 text-slate-500 animate-pulse">Loading plans...</div>
                        ) : filteredPlans.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-2xl border border-dotted border-slate-300 dark:border-white/10">
                                <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500">No plans found{searchTerm ? ` matching "${searchTerm}"` : ''}.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredPlans.map((plan) => (
                                    <PlanCard
                                        key={plan.id}
                                        plan={plan}
                                        onEdit={() => { setEditingPlan(plan); setIsPlanModalOpen(true); }}
                                        onDelete={() => handleDeletePlan(plan.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ════════ Store Top-ups Tab ════════ */}
                {activeTab === 'topups' && (
                    <>
                        {storeLoading ? (
                            <div className="text-center py-20 text-slate-500 animate-pulse">Loading top-ups...</div>
                        ) : filteredStoreItems.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-2xl border border-dotted border-slate-300 dark:border-white/10">
                                <Store className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500">No top-ups found{searchTerm ? ` matching "${searchTerm}"` : ''}.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredStoreItems.map((item) => (
                                    <StoreItemCard
                                        key={item.id}
                                        item={item}
                                        onEdit={() => { setEditingStoreItem(item); setIsStoreModalOpen(true); }}
                                        onDelete={() => handleDeleteStoreItem(item.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}


            </main>

            {/* ════════ Modals ════════ */}
            {isPlanModalOpen && (
                <PlanModal
                    plan={editingPlan}
                    availableAddons={availableAddons}
                    masterCoreFeatures={Array.from(new Set(plans.flatMap(p => p.coreFeatures?.map(f => f.name) || [])))}
                    onClose={() => setIsPlanModalOpen(false)}
                    onSave={handleSavePlan}
                />
            )}
            {isStoreModalOpen && (
                <StoreItemModal
                    item={editingStoreItem}
                    onClose={() => setIsStoreModalOpen(false)}
                    onSave={handleSaveStoreItem}
                />
            )}
        </div>
    );
};

// ════════════════════════════════════════════
//  PLAN CARD
// ════════════════════════════════════════════
const PlanCard = ({ plan, onEdit, onDelete }) => {
    const isPopular = plan.isPopular;
    const themeColors = {
        blue: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200' },
        green: { bg: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200' },
        amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200' },
        emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200' },
    };
    const theme = themeColors[plan.color] || themeColors.blue;

    return (
        <div className={`relative bg-white dark:bg-surface-dark rounded-2xl p-8 border ${isPopular ? 'border-indigo-500 dark:border-indigo-500 shadow-xl shadow-indigo-500/10' : 'border-slate-200 dark:border-white/5 shadow-sm'} flex flex-col transition-all hover:scale-[1.02]`}>
            {isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                    Most Popular
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${theme.light} ${theme.text}`}>
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                    <button onClick={onEdit} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{plan.description}</p>

                <div className="flex flex-wrap gap-2 mt-3">
                    {plan.isDefault && (
                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-200 dark:border-blue-800">
                            DEFAULT PLAN
                        </span>
                    )}
                    {!plan.isPublic && (
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 text-xs font-bold rounded-full border border-gray-200 dark:border-gray-700">
                            HIDDEN
                        </span>
                    )}
                    {plan.allowApiAccess && (
                        <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> API ACCESS
                        </span>
                    )}
                    {plan.isPublic && (
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full border border-green-200 dark:border-green-800">
                            PUBLIC
                        </span>
                    )}
                </div>
            </div>
            {/* Multi-tier pricing display */}
            <div className="mb-6 space-y-2">
                <div className="flex gap-2">
                    {parseFloat(plan.monthlyPrice) > 0 && (
                        <div className="flex-1 text-center p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                                {plan.currency === 'INR' ? '₹' : '$'}{parseFloat(plan.monthlyPrice).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Monthly</div>
                        </div>
                    )}
                    {parseFloat(plan.halfYearlyPrice) > 0 && (
                        <div className="flex-1 text-center p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30">
                            <div className="text-lg font-extrabold text-indigo-700 dark:text-indigo-300">
                                {plan.currency === 'INR' ? '₹' : '$'}{parseFloat(plan.halfYearlyPrice).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">6-Month</div>
                        </div>
                    )}
                    {parseFloat(plan.yearlyPrice) > 0 && (
                        <div className="flex-1 text-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                                {plan.currency === 'INR' ? '₹' : '$'}{parseFloat(plan.yearlyPrice).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Yearly</div>
                        </div>
                    )}
                    {!parseFloat(plan.monthlyPrice) && !parseFloat(plan.halfYearlyPrice) && !parseFloat(plan.yearlyPrice) && (
                        <div className="text-sm text-slate-400 italic">No pricing set</div>
                    )}
                </div>
                {plan.trialDays > 0 && (
                    <span className="inline-block px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        {plan.trialDays} Day Free Trial
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6 border-y border-slate-100 dark:border-white/5 py-4">
                <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                    <div className="flex justify-center text-slate-400 mb-1"><CreditCard className="w-4 h-4" /></div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{plan.messageLimit}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Msgs</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                    <div className="flex justify-center text-slate-400 mb-1"><Users className="w-4 h-4" /></div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{plan.contactLimit}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Contacts</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                    <div className="flex justify-center text-slate-400 mb-1"><FileText className="w-4 h-4" /></div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{plan.templateLimit}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Templates</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                    <div className="flex justify-center text-slate-400 mb-1"><Users className="w-4 h-4" /></div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{plan.teamMemberLimit || 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Team</div>
                </div>
            </div>

            {(plan.aiTokensAllowance > 0 || (plan.includedAddons && plan.includedAddons.length > 0)) && (
                <div className="mb-4 pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                    {plan.aiTokensAllowance > 0 && (
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 py-1.5 px-3 rounded-lg flex justify-between">
                            <span>AI Tokens Included:</span>
                            <span>{plan.aiTokensAllowance.toLocaleString()}</span>
                        </div>
                    )}
                    {plan.includedAddons && plan.includedAddons.length > 0 && (
                        <div className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 py-1.5 px-3 rounded-lg flex justify-between">
                            <span>Add-ons Included:</span>
                            <span>{plan.includedAddons.length}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-4 mb-8 flex-1">
                {plan.features?.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className="mt-1 p-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                            <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">{feature}</span>
                    </div>
                ))}
            </div>

            <button className={`w-full py-3 rounded-xl font-bold transition-all ${isPopular ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25' : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20'}`}>
                Choose {plan.name}
            </button>
        </div>
    );
};

// ════════════════════════════════════════════
//  STORE ITEM CARD
// ════════════════════════════════════════════
const StoreItemCard = ({ item, onEdit, onDelete }) => {
    const getIcon = () => {
        switch (item.icon) {
            case 'MessageSquare': return <MessageSquare className="w-6 h-6" />;
            case 'Users': return <Users className="w-6 h-6" />;
            case 'FileText': return <FileText className="w-6 h-6" />;
            case 'Zap':
            default: return <Zap className="w-6 h-6" />;
        }
    };

    const themeColors = {
        blue: { text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20' },
        indigo: { text: 'text-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-900/20' },
        emerald: { text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20' },
        amber: { text: 'text-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20' },
        rose: { text: 'text-rose-600', light: 'bg-rose-50 dark:bg-rose-900/20' },
    };
    const theme = themeColors[item.color] || themeColors.indigo;

    return (
        <div className={`relative bg-white dark:bg-surface-dark rounded-2xl p-6 border ${!item.isActive ? 'opacity-70 grayscale border-slate-200' : 'border-slate-200 dark:border-white/5 shadow-sm'} flex flex-col transition-all hover:scale-[1.02]`}>
            {!item.isActive && (
                <div className="absolute top-0 right-0 bg-slate-500 text-white px-3 py-1 rounded-bl-xl rounded-tr-xl text-xs font-bold uppercase">
                    Inactive
                </div>
            )}
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${theme.light} ${theme.text}`}>
                    {getIcon()}
                </div>
                <div className="flex gap-1">
                    <button onClick={onEdit} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="mb-4 flex-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {item.itemType.replace('_', ' ')}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-2">{item.name}</h3>
                {item.description && <p className="text-slate-500 dark:text-slate-400 text-sm">{item.description}</p>}

                <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${theme.light} ${theme.text} text-sm font-bold`}>
                    <Plus className="w-4 h-4" /> {item.amount.toLocaleString()} {item.itemType === 'ai_tokens' ? 'Tokens' : 'Credits'}
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-baseline justify-between">
                <div>
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        {item.currency === 'USD' ? '$' : '₹'}{item.price}
                    </span>
                    <span className="text-slate-500 dark:text-text-secondary ml-1 text-sm">/ one-time</span>
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════
//  MODERN TOGGLE COMPONENT
// ════════════════════════════════════════════
const ModernToggle = ({ checked, onChange, name, label, description, icon: Icon, colorClass = "bg-[#0088cc]" }) => {
    return (
        <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl transition-all hover:border-slate-300 dark:hover:border-white/20">
            <div className={`p-2.5 rounded-xl ${checked ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                {Icon && <Icon className="w-5 h-5" />}
            </div>
            <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer select-none" onClick={() => onChange({ target: { name, checked: !checked, type: 'checkbox' } })}>
                        {label}
                    </label>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        onClick={() => onChange({ target: { name, checked: !checked, type: 'checkbox' } })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? colorClass : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm`} />
                    </button>
                </div>
                {description && <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{description}</p>}
            </div>
        </div>
    );
};

// ════════════════════════════════════════════
//  PLAN MODAL
// ════════════════════════════════════════════
const PlanModal = ({ plan, availableAddons = [], masterCoreFeatures = [], onClose, onSave }) => {
    const initializeCoreFeatures = () => {
        const planFeatures = plan?.coreFeatures || [];
        const merged = masterCoreFeatures.map(name => {
            const existing = planFeatures.find(f => f.name === name);
            return { name, qty: existing ? existing.qty : '' };
        });
        planFeatures.forEach(f => {
            if (!merged.find(m => m.name === f.name)) {
                merged.push(f);
            }
        });
        return merged;
    };

    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({
        name: plan?.name || '',
        description: plan?.description || '',
        price: plan?.monthlyPrice || plan?.price || '',
        monthlyPrice: plan?.monthlyPrice || '',
        halfYearlyPrice: plan?.halfYearlyPrice || '',
        yearlyPrice: plan?.yearlyPrice || '',
        currency: plan?.currency || 'INR',
        isPopular: plan?.isPopular || false,
        isDefault: plan?.isDefault || false,
        isPublic: plan?.isPublic !== undefined ? plan.isPublic : true,
        color: plan?.color || 'blue',
        features: plan?.features || [''],
        coreFeatures: initializeCoreFeatures(),
        messageLimit: plan?.messageLimit || 30,
        contactLimit: plan?.contactLimit || 10,
        templateLimit: plan?.templateLimit || 2,
        teamMemberLimit: plan?.teamMemberLimit || 0,
        aiTokensAllowance: plan?.aiTokensAllowance || 0,
        includedAddons: plan?.includedAddons || [],
        allowApiAccess: plan?.allowApiAccess || false,
        trialDays: plan?.trialDays || 0,
        quickReplyLimit: plan?.quickReplyLimit || 10,
        tagLimit: plan?.tagLimit || 10,
        groupLimit: plan?.groupLimit || 5,
        allowCtwaAnalytics: plan?.allowCtwaAnalytics || false,
        allowMetaAds: plan?.allowMetaAds || false,
        allowVcard: plan?.allowVcard || false,
        vcardLimit: plan?.vcardLimit || 0,
        allowWaStore: plan?.allowWaStore || false,
        waStoreLimit: plan?.waStoreLimit || 0,
        flowBotEnabled: plan?.flowBotEnabled || false,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFeatureChange = (idx, value) => {
        const newFeatures = [...formData.features];
        newFeatures[idx] = value;
        setFormData({ ...formData, features: newFeatures });
    };

    const addFeature = () => setFormData({ ...formData, features: [...formData.features, ''] });
    const removeFeature = (idx) => setFormData({ ...formData, features: formData.features.filter((_, i) => i !== idx) });

    const handleAddonChange = (moduleKey) => {
        setFormData(prev => ({
            ...prev,
            includedAddons: prev.includedAddons.includes(moduleKey)
                ? prev.includedAddons.filter(key => key !== moduleKey)
                : [...prev.includedAddons, moduleKey]
        }));
    };

    const handleCoreFeatureChange = (idx, field, value) => {
        const newCore = [...formData.coreFeatures];
        newCore[idx] = { ...newCore[idx], [field]: value };
        setFormData({ ...formData, coreFeatures: newCore });
    };

    const addCoreFeature = () => setFormData({ ...formData, coreFeatures: [...formData.coreFeatures, { name: '', qty: '' }] });
    const removeCoreFeature = (idx) => setFormData({ ...formData, coreFeatures: formData.coreFeatures.filter((_, i) => i !== idx) });

    const handleSubmit = (e) => {
        e.preventDefault();
        const cleaned = { 
            ...formData, 
            features: formData.features.filter(f => f.trim() !== ''),
            coreFeatures: formData.coreFeatures.filter(f => f.name && f.name.trim() !== '')
        };
        cleaned.price = parseFloat(cleaned.monthlyPrice) || parseFloat(cleaned.halfYearlyPrice) || parseFloat(cleaned.yearlyPrice) || 0;
        cleaned.interval = cleaned.monthlyPrice > 0 ? 'month' : cleaned.halfYearlyPrice > 0 ? 'half-year' : 'year';
        onSave(cleaned);
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'pricing', label: 'Pricing & Trial', icon: DollarSign },
        { id: 'limits', label: 'Usage Limits', icon: Activity },
        { id: 'modules', label: 'Modules & Access', icon: Layers },
        { id: 'features', label: 'Features List', icon: List },
    ];

    const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
    const isLastTab = currentTabIndex === tabs.length - 1;
    const isFirstTab = currentTabIndex === 0;

    const handleNext = (e) => {
        if (e) e.preventDefault();
        if (!isLastTab) setActiveTab(tabs[currentTabIndex + 1].id);
    };

    const handlePrev = (e) => {
        if (e) e.preventDefault();
        if (!isFirstTab) setActiveTab(tabs[currentTabIndex - 1].id);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark rounded-[24px] shadow-2xl max-w-6xl w-full h-[85vh] min-h-[650px] max-h-[900px] flex flex-col md:flex-row overflow-hidden border border-slate-200 dark:border-white/10">

                {/* ────── SIDEBAR TABS ────── */}
                <div className="w-full md:w-64 bg-slate-50 dark:bg-black/20 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0">
                    <div className="p-4 md:p-6">
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                            {plan ? 'Edit Plan' : 'Create Plan'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Configure subscription tiers.</p>
                    </div>
                    <div className="flex-1 overflow-x-auto md:overflow-y-auto px-4 pb-4 flex md:flex-col gap-2 no-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-white dark:bg-white/10 text-[#0088cc] dark:text-white shadow-sm border border-slate-200 dark:border-white/5'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300 border border-transparent'
                                    }`}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-[#0088cc]' : 'text-slate-400'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ────── MAIN CONTENT AREA ────── */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-surface-dark">
                    <div className="flex-1 overflow-y-auto p-6 md:p-4 md:p-8">

                        {/* ════ GENERAL TAB ════ */}
                        {activeTab === 'general' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Basic Information</h4>
                                    <div className="grid md:grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Plan Name</label>
                                            <input name="name" value={formData.name} onChange={handleChange} required className="modern-input" placeholder="e.g. Starter / Pro / Enterprise" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Color Theme</label>
                                            <select name="color" value={formData.color} onChange={handleChange} className="modern-input">
                                                <option value="blue">Blue (Standard)</option>
                                                <option value="green">Green (Success)</option>
                                                <option value="amber">Amber (Gold)</option>
                                                <option value="emerald">Emerald (Growth)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-6 space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Description Tagline</label>
                                        <input name="description" value={formData.description} onChange={handleChange} className="modern-input" placeholder="Brief tagline shown under the plan name..." />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Visibility & Badges</h4>
                                    <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
                                        <ModernToggle
                                            name="isPublic" checked={formData.isPublic} onChange={handleChange}
                                            label="Public Visibility" description="Show this plan on the public pricing page."
                                            icon={Store} colorClass="bg-green-500"
                                        />
                                        <ModernToggle
                                            name="isPopular" checked={formData.isPopular} onChange={handleChange}
                                            label="Most Popular Badge" description="Highlight this plan visually as the recommended tier."
                                            icon={Star} colorClass="bg-indigo-500"
                                        />
                                        <ModernToggle
                                            name="isDefault" checked={formData.isDefault} onChange={handleChange}
                                            label="Default Plan" description="Auto-assigned to direct signups without a selected plan."
                                            icon={ShieldCheck} colorClass="bg-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════ PRICING & TRIAL TAB ════ */}
                        {activeTab === 'pricing' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Multi-Interval Pricing</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Leave an interval empty or at 0 to hide it. If all are 0, it acts as a Free plan.</p>

                                    <div className="grid md:grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly Price</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{formData.currency === 'INR' ? '₹' : formData.currency === 'EUR' ? '€' : '$'}</span>
                                                <input type="number" step="0.01" name="monthlyPrice" value={formData.monthlyPrice} onChange={handleChange} className="modern-input pl-8" placeholder="0.00" />
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Half-Yearly Price</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{formData.currency === 'INR' ? '₹' : formData.currency === 'EUR' ? '€' : '$'}</span>
                                                <input type="number" step="0.01" name="halfYearlyPrice" value={formData.halfYearlyPrice} onChange={handleChange} className="modern-input pl-8" placeholder="0.00" />
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Yearly Price</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{formData.currency === 'INR' ? '₹' : formData.currency === 'EUR' ? '€' : '$'}</span>
                                                <input type="number" step="0.01" name="yearlyPrice" value={formData.yearlyPrice} onChange={handleChange} className="modern-input pl-8" placeholder="0.00" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Currency</label>
                                        <select name="currency" value={formData.currency} onChange={handleChange} className="modern-input">
                                            <option value="INR">INR (₹)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Free Trial Duration</label>
                                        <div className="relative">
                                            <input type="number" name="trialDays" value={formData.trialDays} onChange={handleChange} min="0" className="modern-input pr-16" placeholder="0" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Days</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Set to 0 to disable free trials for this plan.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════ LIMITS TAB ════ */}
                        {activeTab === 'limits' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Usage & Quota Limits</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                        <div className="limit-card">
                                            <div className="flex items-center gap-2 mb-3 text-indigo-500"><MessageSquare className="w-4 h-4" /> <span className="font-bold text-xs uppercase">Messages/mo</span></div>
                                            <input type="number" name="messageLimit" value={formData.messageLimit} onChange={handleChange} required className="limit-input" />
                                        </div>
                                        <div className="limit-card">
                                            <div className="flex items-center gap-2 mb-3 text-blue-500"><Users className="w-4 h-4" /> <span className="font-bold text-xs uppercase">Contacts</span></div>
                                            <input type="number" name="contactLimit" value={formData.contactLimit} onChange={handleChange} required className="limit-input" />
                                        </div>
                                        <div className="limit-card">
                                            <div className="flex items-center gap-2 mb-3 text-emerald-500"><FileText className="w-4 h-4" /> <span className="font-bold text-xs uppercase">Templates</span></div>
                                            <input type="number" name="templateLimit" value={formData.templateLimit} onChange={handleChange} required className="limit-input" />
                                        </div>
                                        <div className="limit-card">
                                            <div className="flex items-center gap-2 mb-3 text-purple-500"><Users className="w-4 h-4" /> <span className="font-bold text-xs uppercase">Team Members</span></div>
                                            <input type="number" name="teamMemberLimit" value={formData.teamMemberLimit} onChange={handleChange} required className="limit-input" />
                                        </div>
                                        <div className="limit-card">
                                            <div className="flex items-center gap-2 mb-3 text-amber-500"><Zap className="w-4 h-4" /> <span className="font-bold text-xs uppercase">Quick Replies</span></div>
                                            <input type="number" name="quickReplyLimit" value={formData.quickReplyLimit} onChange={handleChange} required className="limit-input" />
                                        </div>
                                        <div className="limit-card">
                                            <div className="flex items-center gap-2 mb-3 text-rose-500"><Layers className="w-4 h-4" /> <span className="font-bold text-xs uppercase">Tags</span></div>
                                            <input type="number" name="tagLimit" value={formData.tagLimit} onChange={handleChange} required className="limit-input" />
                                        </div>
                                        <div className="limit-card">
                                            <div className="flex items-center gap-2 mb-3 text-teal-500"><Users className="w-4 h-4" /> <span className="font-bold text-xs uppercase">Groups</span></div>
                                            <input type="number" name="groupLimit" value={formData.groupLimit} onChange={handleChange} required className="limit-input" />
                                        </div>
                                        <div className="limit-card">
                                            <div className="flex items-center gap-2 mb-3 text-cyan-500"><CreditCard className="w-4 h-4" /> <span className="font-bold text-xs uppercase">VeCards</span></div>
                                            <input type="number" name="vcardLimit" value={formData.vcardLimit} onChange={handleChange} required className="limit-input" />
                                        </div>
                                        <div className="limit-card">
                                            <div className="flex items-center gap-2 mb-3 text-orange-500"><Store className="w-4 h-4" /> <span className="font-bold text-xs uppercase">Online Stores</span></div>
                                            <input type="number" name="waStoreLimit" value={formData.waStoreLimit} onChange={handleChange} required className="limit-input" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════ MODULES & ACCESS TAB ════ */}
                        {activeTab === 'modules' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Platform Capabilities</h4>
                                    <div className="grid md:grid-cols-1 md:grid-cols-2 gap-4">
                                        <ModernToggle
                                            name="flowBotEnabled" checked={formData.flowBotEnabled} onChange={handleChange}
                                            label="FlowBot Builder" description="Drag & Drop automation flow builder."
                                            icon={Layers} colorClass="bg-purple-500"
                                        />
                                        <ModernToggle
                                            name="allowApiAccess" checked={formData.allowApiAccess} onChange={handleChange}
                                            label="Developer API" description="API Keys and Webhook integrations."
                                            icon={Zap} colorClass="bg-emerald-500"
                                        />
                                        <ModernToggle
                                            name="allowVcard" checked={formData.allowVcard} onChange={handleChange}
                                            label="veCard Builder" description="Digital business card SaaS module."
                                            icon={CreditCard} colorClass="bg-teal-500"
                                        />
                                        <ModernToggle
                                            name="allowWaStore" checked={formData.allowWaStore} onChange={handleChange}
                                            label="Online Store" description="E-commerce store builder module."
                                            icon={Store} colorClass="bg-amber-500"
                                        />
                                        <ModernToggle
                                            name="allowMetaAds" checked={formData.allowMetaAds} onChange={handleChange}
                                            label="Meta Ads Manager" description="Create and run Facebook/Instagram Ads."
                                            icon={Activity} colorClass="bg-blue-600"
                                        />
                                        <ModernToggle
                                            name="allowCtwaAnalytics" checked={formData.allowCtwaAnalytics} onChange={handleChange}
                                            label="CTWA Analytics" description="Click-to-WhatsApp Ads performance dashboard."
                                            icon={Activity} colorClass="bg-rose-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">AI & Add-ons</h4>
                                    <div className="grid md:grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                            <label className="flex items-center gap-2 text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2">
                                                <Sparkles className="w-4 h-4" /> Default AI Tokens
                                            </label>
                                            <input type="number" name="aiTokensAllowance" value={formData.aiTokensAllowance} onChange={handleChange} className="modern-input border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500" placeholder="e.g. 50000" />
                                            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-2">One-time bulk grant upon subscription.</p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-3">
                                                <Plus className="w-4 h-4 text-[#0088cc]" /> Included Add-ons
                                            </label>
                                            {availableAddons.length === 0 ? (
                                                <p className="text-sm text-slate-500 italic">No active add-ons available.</p>
                                            ) : (
                                                <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                                    {availableAddons.map(addon => (
                                                        <label key={addon.id} className="flex items-center gap-3 cursor-pointer group">
                                                            <div className="relative flex items-center justify-center">
                                                                <input type="checkbox" checked={formData.includedAddons.includes(addon.module_key)} onChange={() => handleAddonChange(addon.module_key)} className="peer sr-only" />
                                                                <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 peer-checked:bg-[#0088cc] peer-checked:border-[#0088cc] transition-colors"></div>
                                                                <Check className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-[#0088cc] transition-colors">{addon.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════ FEATURES TAB ════ */}
                        {activeTab === 'features' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Marketing Features</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">These bullets will be displayed prominently on the pricing card.</p>

                                    <div className="space-y-3">
                                        {formData.features.map((feature, idx) => (
                                            <div key={idx} className="flex gap-3 items-center group">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-white/10">
                                                    {idx + 1}
                                                </div>
                                                <input
                                                    value={feature}
                                                    onChange={(e) => handleFeatureChange(idx, e.target.value)}
                                                    className="modern-input flex-1"
                                                    placeholder="e.g. Dedicated Account Manager"
                                                />
                                                {formData.features.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFeature(idx)}
                                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={addFeature}
                                            className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-[#0088cc] dark:text-[#33aadd] font-bold rounded-xl border border-dashed border-slate-300 dark:border-white/20 transition-all w-full justify-center"
                                        >
                                            <Plus className="w-5 h-5" /> Add Another Feature
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10">
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Core Features (Cross-Plan Sync)</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Features added here will appear on all plans. Set a quantity or leave empty to show as "not included".</p>

                                    <div className="space-y-3">
                                        {formData.coreFeatures.map((feature, idx) => (
                                            <div key={idx} className="flex gap-3 items-center group">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-white/10">
                                                    {idx + 1}
                                                </div>
                                                <input
                                                    value={feature.qty || ''}
                                                    onChange={(e) => handleCoreFeatureChange(idx, 'qty', e.target.value)}
                                                    className="modern-input w-24 md:w-40"
                                                    placeholder="Qty (e.g. 2)"
                                                />
                                                <input
                                                    value={feature.name || ''}
                                                    onChange={(e) => handleCoreFeatureChange(idx, 'name', e.target.value)}
                                                    className="modern-input flex-1"
                                                    placeholder="Feature Name (e.g. Business Cards)"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeCoreFeature(idx)}
                                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={addCoreFeature}
                                            className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 transition-all w-full justify-center"
                                        >
                                            <Plus className="w-5 h-5" /> Add New Core Feature
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* ────── FOOTER ACTION BAR ────── */}
                    <div className="p-4 md:p-4 md:p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={onClose} className="px-4 md:px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                                Cancel
                            </button>
                            {!isFirstTab && (
                                <button type="button" onClick={handlePrev} className="px-4 md:px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors hidden sm:block">
                                    Previous
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {!isLastTab ? (
                                <button key="btn-next" type="button" onClick={handleNext} className="flex items-center gap-2 px-4 md:px-8 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
                                    Next Step
                                </button>
                            ) : (
                                <button key="btn-save" type="submit" className="flex items-center gap-2 px-4 md:px-8 py-3 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                                    <Save className="w-5 h-5" />
                                    {plan ? 'Save Changes' : 'Create Plan'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            <style>{`
                .modern-input {
                    width: 100%;
                    padding: 0.875rem 1.25rem;
                    background-color: white;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 1rem;
                    color: #0f172a;
                    font-size: 0.875rem;
                    font-weight: 600;
                    outline: none;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
                }
                .modern-input::placeholder {
                    color: #94a3b8;
                    font-weight: 500;
                }
                :global(.dark) .modern-input {
                    background-color: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.1);
                    color: white;
                }
                .modern-input:focus {
                    border-color: #0088cc;
                    box-shadow: 0 0 0 4px rgba(0, 136, 204, 0.1);
                    background-color: white;
                }
                :global(.dark) .modern-input:focus {
                    background-color: rgba(0, 0, 0, 0.2);
                    box-shadow: 0 0 0 4px rgba(0, 136, 204, 0.2);
                }

                .limit-card {
                    background-color: rgb(248 250 252);
                    padding: 1rem;
                    border-radius: 1rem;
                    border: 1px solid rgb(226 232 240);
                    transition: all 0.2s;
                }
                :global(.dark) .limit-card {
                    background-color: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.05);
                }
                .limit-card:focus-within {
                    border-color: #0088cc;
                    background-color: white;
                    box-shadow: 0 4px 6px -1px rgba(0, 136, 204, 0.1), 0 2px 4px -1px rgba(0, 136, 204, 0.06);
                }
                :global(.dark) .limit-card:focus-within {
                    background-color: rgba(0,0,0,0.2);
                }
                
                .limit-input {
                    width: 100%;
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #0f172a;
                    padding: 0;
                }
                :global(.dark) .limit-input {
                    color: white;
                }
                
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 10px;
                }
                :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(255,255,255,0.2);
                }
            `}</style>
        </div>
    );
};

// ════════════════════════════════════════════
//  STORE ITEM MODAL
// ════════════════════════════════════════════
const StoreItemModal = ({ item, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: item?.name || '',
        description: item?.description || '',
        price: item?.price || '',
        currency: item?.currency || 'USD',
        itemType: item?.itemType || 'ai_tokens',
        amount: item?.amount || '',
        icon: item?.icon || 'Zap',
        color: item?.color || 'indigo',
        isActive: item?.isActive !== false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-white/10">
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Store className="w-5 h-5 text-[#0088cc]" />
                        {item ? 'Edit Top-up Pack' : 'Create Top-up Pack'}
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 md:p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pack Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} required className="input-field" placeholder="e.g. 5K AI Tokens Pack" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Resource Type</label>
                            <select name="itemType" value={formData.itemType} onChange={handleChange} required className="input-field">
                                <option value="ai_tokens">AI Tokens</option>
                                <option value="messages">Message Limit (+ per month)</option>
                                <option value="contacts">Contact Limit (+ per month)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                        <input name="description" value={formData.description} onChange={handleChange} className="input-field" placeholder="Brief tagline or description..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Resource Amount</label>
                            <input type="number" name="amount" value={formData.amount} onChange={handleChange} required className="input-field" placeholder="e.g. 5000" title="The exact number of units to add to the user's balance" />
                            <p className="text-[10px] text-slate-500 mt-1">Quantity added to balance.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price</label>
                            <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required className="input-field" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                            <select name="currency" value={formData.currency} onChange={handleChange} className="input-field">
                                <option value="USD">USD ($)</option>
                                <option value="INR">INR (₹)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display Icon</label>
                            <select name="icon" value={formData.icon} onChange={handleChange} className="input-field">
                                <option value="Zap">Zap (Best for AI Tokens)</option>
                                <option value="MessageSquare">Message (Best for Messages)</option>
                                <option value="Users">Users (Best for Contacts)</option>
                                <option value="FileText">File (Best for Templates)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color Theme</label>
                            <select name="color" value={formData.color} onChange={handleChange} className="input-field">
                                <option value="indigo">Indigo</option>
                                <option value="blue">Blue</option>
                                <option value="green">Green</option>
                                <option value="emerald">Emerald</option>
                                <option value="amber">Amber</option>
                                <option value="rose">Rose</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <input type="checkbox" name="isActive" id="isActiveStore" checked={formData.isActive} onChange={handleChange} className="w-5 h-5 text-[#0088cc] rounded focus:ring-[#0088cc]" />
                        <label htmlFor="isActiveStore" className="text-sm font-medium text-slate-700 dark:text-white cursor-pointer select-none">
                            Active (Visible to users in the Store)
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-colors">
                            {item ? 'Save Changes' : 'Create Top-up'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .input-field {
                    width: 100%;
                    padding: 0.625rem 1rem;
                    background-color: rgb(248 250 252);
                    border: 1px solid rgb(203 213 225);
                    border-radius: 0.75rem;
                    color: rgb(15 23 42);
                    outline: none;
                    transition: all 0.2s;
                }
                :global(.dark) .input-field {
                    background-color: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.1);
                    color: white;
                }
                .input-field:focus {
                    border-color: #0088cc;
                    box-shadow: 0 0 0 1px #0088cc;
                }
            `}</style>
        </div>
    );
};

export default AdminPlans;
