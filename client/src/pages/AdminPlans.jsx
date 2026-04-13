import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Plus, Check, X, Edit, Trash2, ShieldCheck, Users, Store, Zap, MessageSquare, FileText, Sparkles, Save, Loader2 } from 'lucide-react';
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
                const token = localStorage.getItem('token');
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
            const token = localStorage.getItem('token');
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
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/store/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setStoreItems(storeItems.filter(item => item.id !== id));
            showToast({ type: 'success', message: 'Top-up deleted.' });
        } catch (err) {
            showModal({ type: 'error', title: 'Error', message: 'Failed to delete top-up', confirmText: 'Close' });
        }
    };

    const handleSaveStoreItem = async (formData) => {
        try {
            const token = localStorage.getItem('token');
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
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                                activeTab === tab.key
                                    ? 'bg-[#0088cc] text-white shadow-md shadow-blue-500/20'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                activeTab === tab.key
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
        purple: { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200' },
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

            <div className="grid grid-cols-4 gap-2 mb-6 border-y border-slate-100 dark:border-white/5 py-4">
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
//  PLAN MODAL
// ════════════════════════════════════════════
const PlanModal = ({ plan, availableAddons = [], onClose, onSave }) => {
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
        groupLimit: plan?.groupLimit || 5
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
    const handleSubmit = (e) => {
        e.preventDefault();
        const cleaned = { ...formData, features: formData.features.filter(f => f.trim() !== '') };
        // Auto-sync legacy price field from monthly price for backend compatibility
        cleaned.price = parseFloat(cleaned.monthlyPrice) || parseFloat(cleaned.halfYearlyPrice) || parseFloat(cleaned.yearlyPrice) || 0;
        cleaned.interval = cleaned.monthlyPrice > 0 ? 'month' : cleaned.halfYearlyPrice > 0 ? 'half-year' : 'year';
        onSave(cleaned);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-white/10">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan ? 'Edit Plan' : 'Create New Plan'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plan Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} required className="input-field" placeholder="e.g. Starter" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color Theme</label>
                            <select name="color" value={formData.color} onChange={handleChange} className="input-field">
                                <option value="blue">Blue (Standard)</option>
                                <option value="purple">Purple (Premium)</option>
                                <option value="amber">Amber (Gold)</option>
                                <option value="emerald">Emerald (Green)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <input name="description" value={formData.description} onChange={handleChange} className="input-field" placeholder="Brief tagline..." />
                    </div>

                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                        <h4 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm uppercase tracking-wider">Multi-Interval Pricing</h4>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Set the price for each interval. Leave empty or 0 to hide that interval on the landing page.</p>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monthly Price</label>
                                <input type="number" step="0.01" name="monthlyPrice" value={formData.monthlyPrice} onChange={handleChange} className="input-field" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Half-Yearly Price</label>
                                <input type="number" step="0.01" name="halfYearlyPrice" value={formData.halfYearlyPrice} onChange={handleChange} className="input-field" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Yearly Price</label>
                                <input type="number" step="0.01" name="yearlyPrice" value={formData.yearlyPrice} onChange={handleChange} className="input-field" placeholder="0.00" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-indigo-200 dark:border-indigo-800">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                                <select name="currency" value={formData.currency} onChange={handleChange} className="input-field">
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Free Trial (Days)</label>
                                <input type="number" name="trialDays" value={formData.trialDays} onChange={handleChange} min="0" className="input-field" placeholder="e.g. 7" title="Set to 0 to disable trial." />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">Plan Limits</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Messages/mo</label>
                                <input type="number" name="messageLimit" value={formData.messageLimit} onChange={handleChange} required className="input-field" placeholder="e.g. 1000" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contacts</label>
                                <input type="number" name="contactLimit" value={formData.contactLimit} onChange={handleChange} required className="input-field" placeholder="e.g. 500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Templates</label>
                                <input type="number" name="templateLimit" value={formData.templateLimit} onChange={handleChange} required className="input-field" placeholder="e.g. 10" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Team</label>
                                <input type="number" name="teamMemberLimit" value={formData.teamMemberLimit} onChange={handleChange} required className="input-field" placeholder="e.g. 3" title="Number of team members allowed" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quick Replies</label>
                                <input type="number" name="quickReplyLimit" value={formData.quickReplyLimit} onChange={handleChange} required className="input-field" placeholder="e.g. 10" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tags</label>
                                <input type="number" name="tagLimit" value={formData.tagLimit} onChange={handleChange} required className="input-field" placeholder="e.g. 10" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Groups</label>
                                <input type="number" name="groupLimit" value={formData.groupLimit} onChange={handleChange} required className="input-field" placeholder="e.g. 5" />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                        <h4 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm uppercase tracking-wider">Add-ons & AI Allowance</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-indigo-500 uppercase mb-1">AI Tokens Included</label>
                                <input type="number" name="aiTokensAllowance" value={formData.aiTokensAllowance} onChange={handleChange} className="input-field" placeholder="e.g. 50000" title="One-time bulk token grant on purchase" />
                                <p className="text-[10px] text-slate-500 mt-1">Granted instantly upon plan purchase. Tokens do not expire.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-500 uppercase mb-1">Free Included Add-ons</label>
                                {availableAddons.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic mt-2">No active add-ons available.</p>
                                ) : (
                                    <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-slate-200 dark:border-white/10 rounded-lg">
                                        {availableAddons.map(addon => (
                                            <label key={addon.id} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={formData.includedAddons.includes(addon.module_key)} onChange={() => handleAddonChange(addon.module_key)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">{addon.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Features List</label>
                        <div className="space-y-3">
                            {formData.features.map((feature, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input value={feature} onChange={(e) => handleFeatureChange(idx, e.target.value)} className="input-field flex-1" placeholder={`Feature ${idx + 1}`} />
                                    {formData.features.length > 1 && (
                                        <button type="button" onClick={() => removeFeature(idx)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addFeature} className="text-sm text-[#0088cc] font-medium hover:underline flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Add Another Feature
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                            <input type="checkbox" name="isPopular" id="isPopular" checked={formData.isPopular} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                            <label htmlFor="isPopular" className="text-sm font-medium text-slate-700 dark:text-white cursor-pointer select-none">Mark as "Most Popular" plan</label>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                            <input type="checkbox" name="flowBotEnabled" id="flowBotEnabled" checked={formData.flowBotEnabled} onChange={handleChange} className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500" />
                            <div className="flex-1">
                                <label htmlFor="flowBotEnabled" className="text-sm font-bold text-purple-900 dark:text-purple-300 cursor-pointer select-none block">Enable FlowBot Builder</label>
                                <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">Grants users on this plan access to the Drag & Drop automation builder.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <input type="checkbox" name="allowApiAccess" id="allowApiAccess" checked={formData.allowApiAccess} onChange={handleChange} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500" />
                            <div className="flex-1">
                                <label htmlFor="allowApiAccess" className="text-sm font-bold text-emerald-900 dark:text-emerald-300 cursor-pointer select-none block">Developer API & Webhooks Access</label>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Allows plan subscribers to generate API keys, configure webhooks, and use 3rd-party connectors.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <input type="checkbox" name="isDefault" id="isDefault" checked={formData.isDefault} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                            <div className="flex-1">
                                <label htmlFor="isDefault" className="text-sm font-bold text-blue-900 dark:text-blue-300 cursor-pointer select-none block">Set as Default Plan</label>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">Hidden from public. Assigned to users who register directly without selecting a plan.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                            <input type="checkbox" name="isPublic" id="isPublic" checked={formData.isPublic} onChange={handleChange} className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                            <label htmlFor="isPublic" className="text-sm font-medium text-slate-700 dark:text-white cursor-pointer select-none">Show on Public Pricing Page</label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-colors">
                            {plan ? 'Save Changes' : 'Create Plan'}
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
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Store className="w-5 h-5 text-[#0088cc]" />
                        {item ? 'Edit Top-up Pack' : 'Create Top-up Pack'}
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-2 gap-6">
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

                    <div className="grid grid-cols-3 gap-6">
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

                    <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
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
