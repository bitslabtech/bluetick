import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Plus, Check, X, Edit, Trash2, MoreVertical, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';

const AdminPlans = () => {
    const { user } = useAuth();
    const { showModal, showToast } = useUI();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    // Fetch Plans
    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/plans');
            setPlans(res.data);
        } catch (err) {
            console.error("Error fetching plans:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This might affect users on this plan.")) return;
        try {
            await axios.delete(`http://localhost:5000/api/plans/${id}`);
            setPlans(plans.filter(p => p.id !== id));
        } catch (err) {
            showModal({
                type: 'error',
                title: 'Error',
                message: 'Failed to delete plan',
                confirmText: 'Close'
            });
        }
    };

    const handleSave = async (formData) => {
        try {
            if (editingPlan) {
                const res = await axios.put(`http://localhost:5000/api/plans/${editingPlan.id}`, formData);
                setPlans(plans.map(p => p.id === editingPlan.id ? res.data : p));
                showToast({
                    type: 'success',
                    title: 'Plan Updated',
                    message: `${res.data.name} plan has been updated successfully!`
                });
            } else {
                const res = await axios.post('http://localhost:5000/api/plans', formData);
                setPlans([...plans, res.data]);
                showToast({
                    type: 'success',
                    title: 'Plan Created',
                    message: `${res.data.name} plan has been created successfully!`
                });
            }
            setIsModalOpen(false);
        } catch (err) {
            showModal({
                type: 'error',
                title: 'Error',
                message: err.response?.data?.error || "Failed to save plan",
                confirmText: 'Close'
            });
        }
    };

    const openAddModal = () => {
        setEditingPlan(null);
        setIsModalOpen(true);
    };

    const openEditModal = (plan) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const filteredPlans = plans.filter(plan =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            {/* Top Bar */}
            <AdminHeader
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
            >
                <ThemeToggle />
            </AdminHeader>

            <main className="p-8 max-w-7xl mx-auto w-full pb-20">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Plans & Pricing</h1>
                        <p className="text-slate-500 dark:text-text-secondary mt-1 text-lg">Manage your subscription tiers and features.</p>
                    </div>
                    <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-[#0088cc] text-white font-bold rounded-xl hover:bg-[#0077b3] transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5">
                        <Plus className="w-5 h-5" />
                        Create New Plan
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-500 animate-pulse">Loading plans...</div>
                ) : filteredPlans.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-2xl border border-dotted border-slate-300 dark:border-white/10">
                        <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">No plans found matching "{searchTerm}"</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPlans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                onEdit={() => openEditModal(plan)}
                                onDelete={() => handleDelete(plan.id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {isModalOpen && (
                <PlanModal
                    plan={editingPlan}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

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

                {/* Status Badges */}
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
                    {plan.isPublic && (
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full border border-green-200 dark:border-green-800">
                            PUBLIC
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-baseline mb-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    {plan.currency === 'USD' ? '$' : '₹'}{plan.price}
                </span>
                <span className="text-slate-500 dark:text-text-secondary ml-2">/{plan.interval}</span>
            </div>

            {/* Limits Section */}
            <div className="grid grid-cols-3 gap-2 mb-6 border-y border-slate-100 dark:border-white/5 py-4">
                <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                    <div className="flex justify-center text-slate-400 mb-1"><CreditCard className="w-4 h-4" /></div> {/* Reusing icon for generic, ideally MessageSquare */}
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{plan.messageLimit}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Msgs</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                    <div className="flex justify-center text-slate-400 mb-1"><Plus className="w-4 h-4" /></div> {/* Ideally Users icon */}
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{plan.contactLimit}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Contacts</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                    <div className="flex justify-center text-slate-400 mb-1"><Check className="w-4 h-4" /></div> {/* Ideally FileText icon */}
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{plan.templateLimit}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Templates</div>
                </div>
            </div>

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

const PlanModal = ({ plan, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: plan?.name || '',
        description: plan?.description || '',
        price: plan?.price || '',
        interval: plan?.interval || 'month',
        currency: plan?.currency || 'USD',
        isPopular: plan?.isPopular || false,
        isDefault: plan?.isDefault || false,
        isPublic: plan?.isPublic !== undefined ? plan.isPublic : true,
        color: plan?.color || 'blue',
        features: plan?.features || [''],
        messageLimit: plan?.messageLimit || 30,
        contactLimit: plan?.contactLimit || 10,
        templateLimit: plan?.templateLimit || 2
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFeatureChange = (idx, value) => {
        const newFeatures = [...formData.features];
        newFeatures[idx] = value;
        setFormData({ ...formData, features: newFeatures });
    };

    const addFeature = () => setFormData({ ...formData, features: [...formData.features, ''] });
    const removeFeature = (idx) => setFormData({ ...formData, features: formData.features.filter((_, i) => i !== idx) });

    const handleSubmit = (e) => {
        e.preventDefault();
        // filter empty features
        const cleanData = { ...formData, features: formData.features.filter(f => f.trim() !== '') };
        onSave(cleanData);
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

                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price</label>
                            <input type="number" name="price" value={formData.price} onChange={handleChange} required className="input-field" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                            <select name="currency" value={formData.currency} onChange={handleChange} className="input-field">
                                <option value="USD">USD ($)</option>
                                <option value="INR">INR (₹)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Billing Interval</label>
                            <select name="interval" value={formData.interval} onChange={handleChange} className="input-field">
                                <option value="month">Monthly</option>
                                <option value="year">Yearly</option>
                                <option value="lifetime">Lifetime</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">Plan Limits</h4>
                        <div className="grid grid-cols-3 gap-6">
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
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Features List</label>
                        <div className="space-y-3">
                            {formData.features.map((feature, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={feature}
                                        onChange={(e) => handleFeatureChange(idx, e.target.value)}
                                        className="input-field flex-1"
                                        placeholder={`Feature ${idx + 1}`}
                                    />
                                    {formData.features.length > 1 && (
                                        <button type="button" onClick={() => removeFeature(idx)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
                            <input
                                type="checkbox"
                                name="isPopular"
                                id="isPopular"
                                checked={formData.isPopular}
                                onChange={handleChange}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="isPopular" className="text-sm font-medium text-slate-700 dark:text-white cursor-pointer select-none">
                                Mark as "Most Popular" plan
                            </label>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <input
                                type="checkbox"
                                name="isDefault"
                                id="isDefault"
                                checked={formData.isDefault}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <label htmlFor="isDefault" className="text-sm font-bold text-blue-900 dark:text-blue-300 cursor-pointer select-none block">
                                    Set as Default Plan
                                </label>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                                    Hidden from public. Assigned to users who register directly without selecting a plan.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                            <input
                                type="checkbox"
                                name="isPublic"
                                id="isPublic"
                                checked={formData.isPublic}
                                onChange={handleChange}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                            />
                            <label htmlFor="isPublic" className="text-sm font-medium text-slate-700 dark:text-white cursor-pointer select-none">
                                Show on Public Pricing Page
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                            Cancel
                        </button>
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

export default AdminPlans;
