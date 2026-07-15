import { useState, useEffect } from 'react';
import TrialBanner from '../components/TrialBanner';
import axios from 'axios';
import { Store, Plus, Edit, Trash2, X, Zap, MessageSquare, Users, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';

const AdminStore = () => {
    const { user } = useAuth();
    const { showModal, showToast } = useUI();
    const [storeItems, setStoreItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        fetchStoreItems();
    }, []);

    const fetchStoreItems = async () => {
        try {
            const res = await axios.get('/api/admin/store', { headers: { Authorization: `Bearer ${token}` } });
            setStoreItems(res.data);
        } catch (err) {
            console.error("Error fetching store items:", err);
            showToast({ type: 'error', title: 'Error', message: 'Failed to load store items' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this store item? Users will no longer be able to purchase it.")) return;
        try {
            await axios.delete(`/api/admin/store/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setStoreItems(storeItems.filter(item => item.id !== id));
            showToast({ type: 'success', title: 'Deleted', message: 'Store item removed successfully.' });
        } catch (err) {
            showModal({ type: 'error', title: 'Error', message: 'Failed to delete store item', confirmText: 'Close' });
        }
    };

    const handleSave = async (formData) => {
        try {
            if (editingItem) {
                const res = await axios.put(`/api/admin/store/${editingItem.id}`, formData, { headers: { Authorization: `Bearer ${token}` } });
                setStoreItems(storeItems.map(item => item.id === editingItem.id ? res.data : item));
                showToast({ type: 'success', title: 'Updated', message: `${res.data.name} has been updated successfully!` });
            } else {
                const res = await axios.post('/api/admin/store', formData, { headers: { Authorization: `Bearer ${token}` } });
                setStoreItems([res.data, ...storeItems]);
                showToast({ type: 'success', title: 'Created', message: `${res.data.name} has been created successfully!` });
            }
            setIsModalOpen(false);
        } catch (err) {
            showModal({ type: 'error', title: 'Error', message: err.response?.data?.error || "Failed to save store item", confirmText: 'Close' });
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const filteredItems = storeItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-y-auto">
            <AdminHeader searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)}>
                <TrialBanner />
                    <ThemeToggle />
            </AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-7 sm:pb-20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Store className="w-8 h-8 text-[#0088cc]" />
                            Store & Top-ups
                        </h1>
                        <p className="text-slate-500 dark:text-text-secondary mt-1 text-lg">Manage one-time purchases like AI Tokens and extra Message limits.</p>
                    </div>
                    <button onClick={openAddModal} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#0088cc] text-white font-bold rounded-xl hover:bg-[#0077b3] transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5">
                        <Plus className="w-5 h-5 shrink-0" />
                        Create New Top-up
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-500 animate-pulse">Loading store items...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-2xl border border-dotted border-slate-300 dark:border-white/10">
                        <Store className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">No top-ups found matching "{searchTerm}"</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item) => (
                            <StoreItemCard
                                key={item.id}
                                item={item}
                                onEdit={() => openEditModal(item)}
                                onDelete={() => handleDelete(item.id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {isModalOpen && (
                <StoreItemModal
                    item={editingItem}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

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
        blue: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200' },
        indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200' },
        emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200' },
        amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200' },
        rose: { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200' },
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
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

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
                                <option value="emerald">Emerald</option>
                                <option value="amber">Amber</option>
                                <option value="rose">Rose</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <input
                            type="checkbox"
                            name="isActive"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                            className="w-5 h-5 text-[#0088cc] rounded focus:ring-[#0088cc]"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-white cursor-pointer select-none">
                            Active (Visible to users in the Store)
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                            Cancel
                        </button>
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

export default AdminStore;
