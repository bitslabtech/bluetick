import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUI } from '../context/UIContext';
import { Smartphone, Link2, Plus, Users, Search, Check, RefreshCw, Activity, ArrowRight } from 'lucide-react';

const CRMLinkingPanel = ({ config: initialConfig, onConfigUpdate }) => {
    const { showToast, showModal } = useUI();
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState(initialConfig);

    useEffect(() => {
        if (!initialConfig) {
            fetchConfig();
        } else {
            setConfig(initialConfig);
        }
    }, [initialConfig]);

    const fetchConfig = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/system`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setConfig(res.data);
        } catch (err) {
            console.error('Failed to fetch system config', err);
        }
    };
    
    // View modes: 'status', 'link_existing', 'create_new'
    const [viewMode, setViewMode] = useState('status'); 

    // Search existing users
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // New User form
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', phone: '', password: '' });

    const linkedUser = config?.linkedAdminUser;

    // Search users safely via API
    useEffect(() => {
        if (viewMode !== 'link_existing' || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        
        const delaySearch = setTimeout(async () => {
            setSearching(true);
            try {
                // Fetch all users and filter locally for simplicity, or use search endpoint if available
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                const usersList = Array.isArray(res.data) ? res.data : [];
                const filtered = usersList.filter(u => 
                    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    u.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                setSearchResults(filtered.slice(0, 5));
            } catch (err) {
                console.error(err);
            } finally {
                setSearching(false);
            }
        }, 500);

        return () => clearTimeout(delaySearch);
    }, [searchQuery, viewMode]);

    const handleLinkExisting = async (userId) => {
        showModal({
            type: 'warning',
            title: 'Link Official CRM Account',
            message: 'This will upgrade the user to "System CRM" plan with unlimited tokens and designate them as the official sender for platform notifications. Proceed?',
            confirmText: 'Yes, Link Account',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/system/actions/link-crm`, { userId }, {
                        headers: { 'x-auth-token': localStorage.getItem('token') }
                    });
                    showToast({ type: 'success', message: res.data.message });
                    if (onConfigUpdate) onConfigUpdate();
                    fetchConfig();
                    setViewMode('status');
                } catch (err) {
                    showToast({ type: 'error', message: err.response?.data?.error || 'Failed to link account' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleCreateNew = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/system/actions/create-crm`, newUserForm, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            showToast({ type: 'success', message: res.data.message });
            if (onConfigUpdate) onConfigUpdate();
            fetchConfig();
            setViewMode('status');
        } catch (err) {
            showToast({ type: 'error', message: err.response?.data?.error || 'Failed to create account' });
        } finally {
            setLoading(false);
        }
    };

    const handleSyncContacts = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/system/actions/sync-crm-contacts`, {}, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            showModal({
                type: 'success',
                title: 'Sync Complete',
                message: res.data.message,
                confirmText: 'Awesome!'
            });
        } catch (err) {
            showToast({ type: 'error', message: err.response?.data?.error || 'Sync failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                        <Smartphone className="w-5 h-5 text-indigo-500" /> Platform CRM & Communications
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Designate a standard user account to act as the official platform messenger.</p>
                </div>
            </div>

            <div className="relative z-10">
                {viewMode === 'status' && (
                    <div className="space-y-6">
                        {linkedUser ? (
                            <div className="p-5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl flex flex-col md:flex-row gap-6 items-start md:items-center">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded">Linked Account</div>
                                        <div className="px-2 py-0.5 bg-green-500/10 text-green-600 text-[10px] font-bold uppercase tracking-wider rounded border border-green-500/20 flex items-center gap-1">
                                            <Activity className="w-3 h-3" /> God Mode Active
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{linkedUser.name}</h4>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                        <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> {linkedUser.phone || 'No Phone'}</span>
                                        <span className="flex items-center gap-1 text-slate-400">✉ {linkedUser.email}</span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <button 
                                        onClick={handleSyncContacts}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-black/40 transition-colors"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync All Users to CRM
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('link_existing')}
                                        className="w-full text-xs text-center text-slate-500 hover:text-indigo-600 transition-colors font-medium mt-1"
                                    >
                                        Change Linked Account
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 border-dashed rounded-xl text-center">
                                <div className="w-12 h-12 bg-white dark:bg-black/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <Link2 className="w-6 h-6 text-slate-400" />
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-white mb-1">No Account Linked</h4>
                                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">Link a user account to enable system notifications, 2-way inbox chatting with platform users, and broadcast campaigns.</p>
                                
                                <div className="flex flex-col sm:flex-row justify-center gap-3">
                                    <button 
                                        onClick={() => setViewMode('link_existing')}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Search className="w-4 h-4" /> Select Existing User
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('create_new')}
                                        className="px-5 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Create New Account
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20">
                            <h5 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-2 flex items-center gap-1.5">
                                <Activity className="w-4 h-4" /> How this works:
                            </h5>
                            <ul className="text-xs text-blue-700 dark:text-blue-200/80 space-y-1.5 list-disc list-inside">
                                <li>The linked user receives <strong>unlimited AI tokens, messages, and contacts</strong>.</li>
                                <li>All new platform signups are <strong>automatically synced</strong> to this user's Contacts.</li>
                                <li>System notifications (Welcome emails, OTPs) will be sent via this user's configured WhatsApp API.</li>
                                <li>You can log into this user account to chat with customers in the Inbox!</li>
                            </ul>
                        </div>
                    </div>
                )}

                {viewMode === 'link_existing' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        <button onClick={() => setViewMode('status')} className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-4 flex items-center gap-1">
                            &larr; Back
                        </button>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Search User by Email or Name</label>
                                <div className="relative">
                                    <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        autoFocus
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Type to search..." 
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-white/10 dark:bg-black/20 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden min-h-[150px]">
                                {searching ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">Searching...</div>
                                ) : searchResults.length > 0 ? (
                                    <div className="divide-y divide-slate-200 dark:divide-white/10">
                                        {searchResults.map(u => (
                                            <div key={u.id} className="p-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</div>
                                                    <div className="text-xs text-slate-500">{u.email} • {u.phone || 'No phone'}</div>
                                                </div>
                                                <button 
                                                    onClick={() => handleLinkExisting(u.id)}
                                                    className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs rounded-lg transition-colors"
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery.length > 1 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">No users found.</div>
                                ) : (
                                    <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                                        <Users className="w-8 h-8 opacity-20 mb-2" />
                                        Start typing to find a user...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'create_new' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        <button onClick={() => setViewMode('status')} className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-4 flex items-center gap-1">
                            &larr; Back
                        </button>
                        <form onSubmit={handleCreateNew} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 space-y-4">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-2">Create Platform Account</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Full Name</label>
                                    <input required value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} type="text" placeholder="Official Platform" className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Email</label>
                                    <input required value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} type="email" placeholder="hello@yourplatform.com" className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">WhatsApp Number</label>
                                    <input required value={newUserForm.phone} onChange={e => setNewUserForm({...newUserForm, phone: e.target.value})} type="text" placeholder="+1234567890" className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Password</label>
                                    <input required value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} type="password" placeholder="••••••••" className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm" />
                                </div>
                            </div>
                            <button disabled={loading} type="submit" className="w-full mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create & Link Account
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CRMLinkingPanel;
