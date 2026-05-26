import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity, Shield, Bell, CheckCircle2, UserPlus, CreditCard, Ticket, Trash2, Check, X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';
import { useUI } from '../context/UIContext';

const AdminAlerts = () => {
    const { showToast } = useUI();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin-notifications`);
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error("Error fetching notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin-notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            showToast('Failed to mark read', 'error');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin-notifications/read-all`);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            showToast('All marked as read', 'success');
        } catch (err) {
            showToast('Failed to update', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this notification?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin-notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            showToast('Notification deleted', 'success');
        } catch (err) {
            showToast('Failed to delete', 'error');
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm("Are you sure you want to delete ALL notifications? This cannot be undone.")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin-notifications/clear-all`);
            setNotifications([]);
            showToast('All notifications cleared', 'success');
        } catch (err) {
            showToast('Failed to clear', 'error');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'USER_REGISTER': return <UserPlus className="w-5 h-5 text-blue-500" />;
            case 'PLAN_CHANGE': return <CreditCard className="w-5 h-5 text-green-500" />;
            case 'SUPPORT_TICKET': return <Ticket className="w-5 h-5 text-amber-500" />;
            default: return <Bell className="w-5 h-5 text-slate-500" />;
        }
    };

    const filtered = notifications.filter(n =>
        n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-hidden">
            <AdminHeader searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)}>
                <ThemeToggle />
            </AdminHeader>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full pb-20">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Alerts</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Updates on users, plans, and support tickets.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleMarkAllRead}
                            className="px-4 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 font-medium transition-colors text-sm flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Mark All Read
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="px-4 py-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 font-medium transition-colors text-sm flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Clear All
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-4 md:p-20 text-center">
                            <Shield className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">All Caught Up!</h3>
                            <p className="text-slate-500 dark:text-slate-400">No new system alerts at the moment.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {filtered.map(n => (
                                <div
                                    key={n.id}
                                    className={`p-5 flex items-start gap-4 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${!n.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                >
                                    <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-full shrink-0">
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className={`text-sm font-medium ${!n.isRead ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                                                {n.message}
                                            </p>
                                            <div className="flex flex-col items-end whitespace-nowrap ml-2">
                                                <span className="text-xs font-medium text-slate-400">
                                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                </span>
                                                <span className="text-[10px] text-slate-500 mt-0.5">
                                                    {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/10 text-slate-500 uppercase font-bold tracking-wider">
                                                {n.type.replace('_', ' ')}
                                            </span>
                                            {!n.isRead && (
                                                <button
                                                    onClick={() => handleMarkRead(n.id)}
                                                    className="text-xs text-indigo-500 hover:underline"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(n.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminAlerts;
