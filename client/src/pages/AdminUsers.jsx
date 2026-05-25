import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Trash2, MoreVertical, History, Edit, Eye, Clock, ShieldCheck, User, ChevronDown, ChevronUp, Settings, Plus, CreditCard, Activity, Server, DollarSign, Calendar, MapPin, Hash, Share2, Package, Layers, Zap, ExternalLink, Users, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../context/UIContext';

const AdminUsers = () => {
    const { user, login, impersonate } = useAuth();

    const { showModal, formatDate } = useUI();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    
    // View User State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewUserDetails, setViewUserDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Fetch Users
    useEffect(() => {
        if (!user?.isAdmin) return;
        const fetchUsers = async () => {
            try {
                const [usersRes, plansRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/plans`)
                ]);

                if (Array.isArray(usersRes.data)) {
                    setUsers(usersRes.data);
                } else {
                    console.error("API did not return an array:", usersRes.data);
                    setUsers([]);
                }

                // Store plans in state (need to add state for this)
                if (Array.isArray(plansRes.data)) {
                    setAvailablePlans(plansRes.data);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [user]);



    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/users/${deleteId}`);
            setUsers(users.filter(u => u.id !== deleteId));
            setDeleteId(null);
        } catch (err) {
            console.error("Error deleting user:", err);
            showModal({
                type: 'warning',
                title: 'Operation Denied',
                message: 'Failed to delete user. They might be an admin.',
                confirmText: 'OK'
            });
        }
    };

    // Guard: skip redirect while isTransitioning is true (impersonate sets it before user swap)
    if (!user?.isAdmin) return <Navigate to="/" />;


    // Safety check for map/filter
    const safeUsers = Array.isArray(users) ? users : [];
    const filteredUsers = safeUsers.filter(u =>
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handlers
    const handleImpersonate = async (targetUser) => {
        showModal({
            type: 'warning',
            title: 'Impersonate User',
            message: `Are you sure you want to login as ${targetUser.name}?\n\nYou will see their dashboard and have access to their data.`,
            confirmText: 'Impersonate',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users/${targetUser.id}/impersonate`);
                    const { token, user } = res.data;

                    // impersonate() swaps tokens in localStorage and does window.location.href
                    // to /dashboard — no React render races possible.
                    await impersonate(token, user);
                } catch (err) {
                    console.error("Impersonation failed:", err);
                    showModal({
                        type: 'error',
                        title: 'Error',
                        message: err.response?.data?.error || "Impersonation failed",
                        confirmText: 'Close'
                    });
                }
            }
        });
    };

    const handleHistory = async (targetUser) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users/${targetUser.id}/impersonation-history`);
            setHistoryLogs(res.data);
            setEditingUser(targetUser); // Reuse this state just to track which user we are viewing
            setIsHistoryOpen(true);
            setActiveMenu(null);
        } catch (err) {
            console.error("Failed to fetch history:", err);
            showModal({
                type: 'error',
                title: 'Error',
                message: 'Failed to load history.',
                confirmText: 'Close'
            });
        }
    };

    const handleViewUser = async (targetUser) => {
        setEditingUser(targetUser);
        setViewUserDetails(null);
        setIsViewModalOpen(true);
        setDetailsLoading(true);
        setActiveMenu(null);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users/${targetUser.id}/details`);
            setViewUserDetails(res.data);
        } catch (err) {
            console.error("Failed to load user details", err);
            showModal({
                type: 'error',
                title: 'Error',
                message: 'Failed to load details.',
                confirmText: 'Close'
            });
            setIsViewModalOpen(false);
        } finally {
            setDetailsLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (u) => {
        setEditingUser(u);
        setIsModalOpen(true);
        setActiveMenu(null);
    };

    const openTrialModal = (u) => {
        setEditingUser(u);
        setIsTrialModalOpen(true);
        setActiveMenu(null);
    };

    const handleSaveUser = async (formData) => {
        try {
            if (editingUser) {
                // Update
                const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/users/${editingUser.id}`, formData);
                setUsers(users.map(u => u.id === editingUser.id ? res.data : u));
            } else {
                // Create
                const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users`, formData);
                setUsers([res.data, ...users]);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error("Save Error:", err);
            showModal({
                type: 'error',
                title: 'Error',
                message: err.response?.data?.error || "Failed to save user",
                confirmText: 'Close'
            });
        }
    };

    const handleGrantTrial = async (planName) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users/${editingUser.id}/grant-trial`, { planName });
            setUsers(users.map(u => u.id === editingUser.id ? { ...u, plan: res.data.user.plan, planStatus: res.data.user.planStatus, planExpiry: res.data.user.planExpiry } : u));
            setIsTrialModalOpen(false);
            showModal({
                type: 'success',
                title: 'Trial Granted',
                message: res.data.message,
                confirmText: 'Awesome'
            });
        } catch (err) {
            console.error("Grant Trial Error:", err);
            showModal({
                type: 'error',
                title: 'Failed',
                message: err.response?.data?.error || "Failed to grant trial",
                confirmText: 'Close'
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark overflow-y-auto fade-in transition-colors duration-300 font-sans">
            {/* Top Bar */}
            <AdminHeader
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
            >
                <ThemeToggle />
            </AdminHeader>

            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
                        <p className="text-slate-500 dark:text-text-secondary mt-1">View, edit, and manage all users on the platform.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm text-sm whitespace-nowrap">
                            <Settings className="w-4 h-4 shrink-0" />
                            Manage Permissions
                        </button>
                        <button onClick={openAddModal} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#0088cc] text-white font-bold rounded-lg hover:bg-[#0077b3] transition-colors shadow-sm text-sm whitespace-nowrap">
                            <Plus className="w-4 h-4 shrink-0" />
                            Add User
                        </button>
                    </div>
                </div>

                {/* Content Card */}
                {/* Fixed: Removed Search Bar from here, moved to Header */}
                <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-white/5 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-text-secondary">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Companies</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Current Plan</th>
                                    <th className="px-6 py-4">Plan Expiry</th>
                                    <th className="px-6 py-4">Last Login</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading users...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-500">No users found matching "{searchTerm}"</td></tr>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            {/* User Info */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white text-[15px]">{u.name}</div>
                                                <div className="text-slate-500 text-xs mt-0.5">{u.email}</div>
                                            </td>

                                            {/* Company */}
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                {u.company || '-'}
                                            </td>

                                            {/* Role Badge */}
                                            {/* Role Badge */}
                                            <td className="px-6 py-4">
                                                {u.isAdmin ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                                        <ShieldCheck className="w-3 h-3" /> Superadmin
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400">
                                                        <User className="w-3 h-3" /> {u.isAdmin ? 'Admin' : 'User'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Current Plan */}
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const plan = availablePlans.find(p => p.name === u.plan);
                                                    const color = plan?.color || 'blue'; // Default to blue

                                                    const colorMap = {
                                                        blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50',
                                                        purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900/50',
                                                        amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/50',
                                                        green: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50',
                                                        red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50',
                                                        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-900/50',
                                                        pink: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-900/50',
                                                        slate: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
                                                    };

                                                    const styleClass = colorMap[color] || colorMap['blue'];

                                                    return (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${styleClass}`}>
                                                            {u.plan || 'Free'}
                                                        </span>
                                                    );
                                                })()}
                                            </td>

                                            {/* Plan Expiry */}
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                {u.planExpiry ? formatDate(u.planExpiry) : 'N/A'}
                                            </td>

                                            {/* Last Login */}
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                {u.lastLogin ? formatDate(u.lastLogin) : 'Never'}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 relative">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleViewUser(u)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold px-3 shadow-sm border border-blue-200 dark:border-blue-800">
                                                        <Eye className="w-4 h-4" /> View
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Calculate position
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setActiveMenu(activeMenu?.id === u.id ? null : {
                                                            id: u.id,
                                                            top: rect.bottom + window.scrollY,
                                                            left: rect.left + window.scrollX - 200 // Align to left of button approx
                                                        });
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Floating Action Menu - Rendered outside table to avoid clipping */}
                {activeMenu && (
                    <>
                        {/* Backdrop to close menu */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setActiveMenu(null)}
                        />
                        <div
                            style={{
                                top: `${activeMenu.top + 5}px`,
                                left: `${activeMenu.left}px`,
                                position: 'fixed' // Use fixed to escape all stacking contexts
                            }}
                            className="z-50 w-52 bg-white dark:bg-surface-dark rounded-lg shadow-xl border border-slate-100 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 py-1"
                        >
                            {/* Find the user object based on ID */}
                            {(() => {
                                const u = users.find(user => user.id === activeMenu.id);
                                if (!u) return null;

                                return (
                                    <>
                                        {!u.isAdmin && (
                                            <button onClick={() => { handleImpersonate(u); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-500 hover:bg-slate-50 dark:hover:bg-white/5 font-medium text-left">
                                                <Eye className="w-4 h-4" /> Impersonate
                                            </button>
                                        )}
                                        <button onClick={() => { handleHistory(u); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-white/5 font-medium text-left">
                                            <History className="w-4 h-4" /> Impersonation History
                                        </button>
                                        <div className="my-1 border-t border-slate-100 dark:border-white/5"></div>
                                        <button onClick={() => { openEditModal(u); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-white/5 font-medium text-left">
                                            <Edit className="w-4 h-4" /> Edit User
                                        </button>
                                        <button onClick={() => { openTrialModal(u); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-medium text-left">
                                            <ShieldCheck className="w-4 h-4" /> Grant Trial
                                        </button>
                                        {!u.isAdmin && (
                                            <button
                                                onClick={() => {
                                                    setDeleteId(u.id);
                                                    setActiveMenu(null);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-left"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete User
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </>
                )}

            </main >

            {/* Delete Modal */}
            {
                deleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-white/10">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete User?</h3>
                            <p className="text-slate-500 dark:text-text-secondary mb-6 text-sm">
                                This action cannot be undone. Usually we recommend deactivating instead of deleting.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg shadow-red-500/30 transition-colors text-sm"
                                >
                                    Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* History Modal */}
            {
                isHistoryOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-white/10 max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Impersonation History {editingUser ? `for ${editingUser.name}` : ''}
                                </h3>
                                <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">Close</button>
                            </div>
                            <div className="overflow-y-auto flex-1 pr-2">
                                {historyLogs.length === 0 ? (
                                    <p className="text-slate-500 text-center py-6">No impersonation history found.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {(() => {
                                            // Group logs by session
                                            const sessions = [];
                                            let currentSession = { startLog: null, actions: [] };

                                            // Logs are DESC (Newest first)
                                            historyLogs.forEach(log => {
                                                if (log.action === 'Impersonation') {
                                                    currentSession.startLog = log;
                                                    sessions.push(currentSession);
                                                    currentSession = { startLog: null, actions: [] };
                                                } else {
                                                    currentSession.actions.push(log);
                                                }
                                            });

                                            if (currentSession.actions.length > 0) {
                                                currentSession.startLog = {
                                                    createdAt: currentSession.actions[0].createdAt,
                                                    User: { name: 'Unknown/Active Session' },
                                                    details: 'Ongoing or legacy session'
                                                };
                                                sessions.push(currentSession);
                                            }

                                            return sessions.map((session, idx) => (
                                                <HistorySessionCard key={idx} session={session} />
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* User Modal */}
            {
                isModalOpen && (
                    <UserModal
                        user={editingUser}
                        plans={availablePlans}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveUser}
                    />
                )
            }

            {/* Trial Modal */}
            {
                isTrialModalOpen && (
                    <GrantTrialModal
                        user={editingUser}
                        plans={availablePlans.filter(p => p.trialDays && p.trialDays > 0)}
                        onClose={() => setIsTrialModalOpen(false)}
                        onSave={handleGrantTrial}
                    />
                )
            }

            {/* View User Modal */}
            {
                isViewModalOpen && (
                    <ViewUserModal 
                        user={editingUser} 
                        details={viewUserDetails} 
                        loading={detailsLoading} 
                        onClose={() => setIsViewModalOpen(false)} 
                    />
                )
            }
        </div >
    );
};

// User Modal Component
const UserModal = ({ user, plans, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        password: '', // Only for new user or password reset
        role: user?.isAdmin ? 'Admin' : 'User',
        plan: user?.plan || 'Free'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-white/10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                    {user ? 'Edit User' : 'Add New User'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {user ? 'New Password (Leave blank to keep current)' : 'Password'}
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required={!user} // Required only for new users
                            placeholder={user ? "********" : ""}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                            >
                                <option value="User" className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-white">User</option>
                                <option value="Admin" className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-white">Admin</option>
                            </select>
                        </div>

                        {/* Plan */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plan</label>
                            <select
                                name="plan"
                                value={formData.plan}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                            >
                                <option value="Free" className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-white">Free</option>
                                {plans?.map(p => (
                                    <option key={p.id} value={p.name} className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-white">{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white font-medium rounded-lg shadow-lg shadow-blue-500/30 transition-colors text-sm"
                        >
                            {user ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Sub-component for individual session card
const HistorySessionCard = ({ session }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { startLog, actions } = session;
    const adminName = startLog?.User?.name || 'Unknown Admin';
    const date = new Date(startLog.createdAt).toLocaleString();

    return (
        <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden transition-all bg-slate-50 dark:bg-white/5">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
            >
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="size-2 rounded-full bg-amber-500"></span>
                        Session by {adminName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-text-secondary pl-4 mt-1">
                        {date} • {actions.length} Actions
                    </span>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {isExpanded && (
                <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                    {actions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic pl-4">No actions recorded in this session.</p>
                    ) : (
                        <div className="relative pl-4 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-white/10">
                            {actions.map(log => (
                                <div key={log.id} className="relative">
                                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-slate-50 dark:border-surface-dark bg-slate-300 dark:bg-slate-600"></span>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {log.action}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-text-secondary mt-0.5 whitespace-pre-wrap">
                                            {log.details.replace(/\(Impersonated by .*?\)/, '').trim()}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {new Date(log.createdAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Grant Trial Modal Component
const GrantTrialModal = ({ user, plans, onClose, onSave }) => {
    const [selectedPlan, setSelectedPlan] = useState(plans.length > 0 ? plans[0].name : '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(selectedPlan);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-white/10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Grant Trial to {user.name}
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                    This will immediately override their existing plan and start a new time-restricted trial.
                </p>

                {plans.length === 0 ? (
                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-4 rounded-xl border border-amber-200 dark:border-amber-800/30 text-sm">
                        No plans currently offer free trials. You must configure &quot;Free Trial Days&quot; on a plan via the Plans Settings first.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Trial Plan</label>
                            <select
                                value={selectedPlan}
                                onChange={e => setSelectedPlan(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-white"
                            >
                                {plans.map(p => (
                                    <option key={p.id} value={p.name} className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-white">
                                        {p.name} ({p.trialDays} Days)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-lg shadow-green-500/30 transition-colors text-sm flex items-center gap-2"
                            >
                                <ShieldCheck className="w-4 h-4" /> Grant Trial
                            </button>
                        </div>
                    </form>
                )}
                
                {plans.length === 0 && (
                     <div className="flex justify-end mt-6">
                         <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm">Close</button>
                     </div>
                )}
            </div>
        </div>
    );
};

// ════════════════════════════════════════════
// VIEW USER MODAL (Tabbed)
// ════════════════════════════════════════════
const ViewUserModal = ({ user, details, loading, onClose }) => {
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'usage', label: 'Usage & Quotas', icon: Activity },
        { id: 'purchases', label: 'Purchases', icon: CreditCard },
        { id: 'referrals', label: 'Referrals', icon: Share2 }
    ];

    // Helpers
    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark rounded-[24px] shadow-2xl max-w-5xl w-full h-[85vh] min-h-[600px] max-h-[900px] flex flex-col md:flex-row overflow-hidden border border-slate-200 dark:border-white/10">
                
                {/* ────── SIDEBAR TABS ────── */}
                <div className="w-full md:w-64 bg-slate-50 dark:bg-black/20 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0">
                    <div className="p-6">
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                            {user?.name || 'Loading...'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500"/> {user?.plan || 'Free Plan'}</p>
                    </div>
                    <div className="flex-1 overflow-x-auto md:overflow-y-auto px-4 pb-4 flex md:flex-col gap-2 no-scrollbar">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm whitespace-nowrap md:whitespace-normal text-left ${
                                        isActive 
                                            ? 'bg-white dark:bg-surface-dark text-[#0088cc] shadow-sm border border-slate-200 dark:border-white/10' 
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#0088cc]' : 'text-slate-400'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ────── MAIN CONTENT AREA ────── */}
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-surface-dark relative">
                    
                    {loading && (
                        <div className="absolute inset-0 z-10 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0088cc]"></div>
                            <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Fetching deep user metrics...</p>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                        
                        {/* ════ PROFILE TAB ════ */}
                        {activeTab === 'profile' && details && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Identity Overview</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Email</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white break-all">{details.user?.email}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Company</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{details.user?.company || 'N/A'}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Phone</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{details.user?.phone || 'N/A'}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Role</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{details.user?.isAdmin ? 'Superadmin' : 'User'}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Account Status</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Join Date</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(details.user?.createdAt)}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Last Login</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(details.user?.lastLogin)}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Plan Expiry</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(details.user?.planExpiry)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════ USAGE TAB ════ */}
                        {activeTab === 'usage' && details && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">SaaS Usage Metrics</h4>
                                    <p className="text-sm text-slate-500 mb-6">Total assets and resources generated by this user.</p>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-3"><Users className="w-6 h-6"/></div>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">{details.usage?.contactsCount}</p>
                                            <p className="text-xs font-bold text-slate-500 uppercase mt-1">Contacts</p>
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-3"><ExternalLink className="w-6 h-6"/></div>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">{details.usage?.campaignsCount}</p>
                                            <p className="text-xs font-bold text-slate-500 uppercase mt-1">Campaigns</p>
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center mb-3"><Zap className="w-6 h-6"/></div>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">{details.usage?.totalAiTokens}</p>
                                            <p className="text-xs font-bold text-slate-500 uppercase mt-1">AI Tokens Used</p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 flex items-center justify-center mb-3"><CreditCard className="w-6 h-6"/></div>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">{details.usage?.vcardsCount}</p>
                                            <p className="text-xs font-bold text-slate-500 uppercase mt-1">veCards Built</p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mb-3"><Store className="w-6 h-6"/></div>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">{details.usage?.waStoreCount}</p>
                                            <p className="text-xs font-bold text-slate-500 uppercase mt-1">Stores Built</p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-colors"></div>
                                            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mb-3 relative z-10"><Server className="w-6 h-6"/></div>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white relative z-10">{formatBytes(details.usage?.storageUsed)}</p>
                                            <p className="text-xs font-bold text-slate-500 uppercase mt-1 relative z-10">Disk Storage</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════ PURCHASES TAB ════ */}
                        {activeTab === 'purchases' && details && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Transaction History</h4>
                                    
                                    {details.purchases?.length === 0 ? (
                                        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-8 text-center border border-slate-200 dark:border-white/10">
                                            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500 font-medium">No purchase history found for this user.</p>
                                        </div>
                                    ) : (
                                        <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 uppercase text-xs font-bold">
                                                    <tr>
                                                        <th className="px-4 py-3">Date</th>
                                                        <th className="px-4 py-3">Plan/Item</th>
                                                        <th className="px-4 py-3">Amount</th>
                                                        <th className="px-4 py-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                    {details.purchases?.map((tx, i) => (
                                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(tx.createdAt)}</td>
                                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{tx.planName}</td>
                                                            <td className="px-4 py-3 font-bold text-emerald-600">{tx.currency} {tx.amount}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                                    tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                    {tx.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ════ REFERRALS TAB ════ */}
                        {activeTab === 'referrals' && details && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                                    <h4 className="text-lg font-bold mb-1 opacity-90">Affiliate / Referrals</h4>
                                    <p className="text-sm opacity-80 mb-6">Users who registered using this account's referral link.</p>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-4xl font-black">{details.referralsCount}</p>
                                            <p className="text-sm font-medium opacity-90 mt-1">Total Referees Joined</p>
                                        </div>
                                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                            <Share2 className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800/30 text-sm">
                                    Detailed referral breakdown and commission history is available via the Tech Partner / Affiliate manager section.
                                </div>
                            </div>
                        )}

                    </div>

                    {/* ────── FOOTER ACTION BAR ────── */}
                    <div className="p-4 md:p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 flex justify-end shrink-0">
                        <button type="button" onClick={onClose} className="px-8 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5">
                            Close Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
