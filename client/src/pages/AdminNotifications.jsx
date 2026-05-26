import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    CheckCircle2, AlertTriangle, XCircle, Info,
    CheckCheck, Bell, Send, Trash2, Users, Layers, User, Eye, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AdminHeader from '../components/AdminHeader';
import ThemeToggle from '../components/ThemeToggle';

const AdminNotifications = () => {
    const { user } = useAuth();
    const { showToast } = useUI();
    const [searchTerm, setSearchTerm] = useState('');

    // Data States
    const [broadcasts, setBroadcasts] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [plansList, setPlansList] = useState([]);

    // UI States
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        buttonName: '',
        buttonUrl: '',
        type: 'Info', // Info, Success, Warning, Error
        targetType: 'All Users', // All Users, Specific User, Plan Subscribers
        targetValue: ''
    });

    useEffect(() => {
        fetchBroadcasts();
        fetchMetadata();
    }, []);

    const fetchBroadcasts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications`);
            setBroadcasts(res.data);
        } catch (err) {
            console.error("Error fetching broadcasts:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const [usersRes, plansRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/plans`)
            ]);
            setUsersList(usersRes.data);
            setPlansList(plansRes.data);
        } catch (err) {
            console.error("Error fetching metadata:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this broadcast?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/notifications/${id}`);
            setBroadcasts(prev => prev.filter(b => b.id !== id));
            showToast({ type: 'success', title: 'Deleted', message: 'Broadcast deleted successfully.' });
        } catch (err) {
            showToast({ type: 'error', title: 'Delete Failed', message: 'Failed to delete broadcast.' });
        }
    };

    const handleSend = async () => {
        setSending(true);
        try {
            const payload = { ...formData };

            await axios.post(`${import.meta.env.VITE_API_URL}/api/notifications`, payload);
            showToast({ type: 'success', title: 'Sent', message: 'Broadcast sent successfully!' });
            setShowPreview(false);
            setFormData({
                title: '',
                message: '',
                buttonName: '',
                buttonUrl: '',
                type: 'Info',
                targetType: 'All Users',
                targetValue: ''
            });
            fetchBroadcasts();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Send Failed', message: 'Failed to send broadcast.' });
        } finally {
            setSending(false);
        }
    };

    const getTypeStyles = (type) => {
        switch (type) {
            case 'Success': return {
                color: 'text-green-700 dark:text-green-300',
                bg: 'bg-green-100 dark:bg-green-500/20',
                border: 'border-green-200 dark:border-green-500/20',
                icon: <CheckCircle2 className="w-5 h-5" />
            };
            case 'Warning': return {
                color: 'text-amber-700 dark:text-amber-300',
                bg: 'bg-amber-100 dark:bg-amber-500/20',
                border: 'border-amber-200 dark:border-amber-500/20',
                icon: <AlertTriangle className="w-5 h-5" />
            };
            case 'Error': return {
                color: 'text-red-700 dark:text-red-300',
                bg: 'bg-red-100 dark:bg-red-500/20',
                border: 'border-red-200 dark:border-red-500/20',
                icon: <XCircle className="w-5 h-5" />
            };
            default: return {
                color: 'text-indigo-700 dark:text-indigo-300',
                bg: 'bg-indigo-100 dark:bg-indigo-500/20',
                border: 'border-indigo-200 dark:border-indigo-500/20',
                icon: <Info className="w-5 h-5" />
            };
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark font-display overflow-hidden">
            <AdminHeader searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)}>
                <ThemeToggle />
            </AdminHeader>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] max-w-full mx-auto w-full pb-20">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Broadcast Manager</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Send and manage system-wide notifications.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                    {/* LEFT PANEL: CREATOR */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 md:p-6 border border-slate-200 dark:border-white/5 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <Send className="w-5 h-5 text-indigo-500" /> Create Broadcast
                            </h2>

                            <div className="space-y-5">
                                {/* Type Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Notification Type</label>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                        {['Info', 'Success', 'Warning', 'Error'].map(type => {
                                            const activeStyles = getTypeStyles(type);
                                            const isActive = formData.type === type;
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => setFormData({ ...formData, type })}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isActive
                                                        ? `${activeStyles.border} ${activeStyles.bg}`
                                                        : 'border-transparent bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className={`${isActive ? activeStyles.color : 'text-slate-400'}`}>
                                                        {type === 'Info' && <Info className="w-6 h-6" />}
                                                        {type === 'Success' && <CheckCircle2 className="w-6 h-6" />}
                                                        {type === 'Warning' && <AlertTriangle className="w-6 h-6" />}
                                                        {type === 'Error' && <XCircle className="w-6 h-6" />}
                                                    </div>
                                                    <span className={`text-xs mt-2 font-bold ${isActive ? activeStyles.color : 'text-slate-500'}`}>{type}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Target Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Target Audience</label>
                                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-4">
                                        {['All Users', 'Specific User', 'Plan Subscribers'].map(target => (
                                            <button
                                                key={target}
                                                onClick={() => setFormData({ ...formData, targetType: target, targetValue: '' })}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.targetType === target
                                                    ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                {target}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Dynamic Inputs Based on Target */}
                                    <AnimatePresence mode='wait'>
                                        {formData.targetType === 'Specific User' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                                    <select
                                                        value={formData.targetValue}
                                                        onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white appearance-none"
                                                    >
                                                        <option value="" className="bg-white dark:bg-[#1e293b]">Select User...</option>
                                                        {usersList.map(u => (
                                                            <option key={u.id} value={u.id} className="bg-white dark:bg-[#1e293b]">{u.name} ({u.email})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        )}
                                        {formData.targetType === 'Plan Subscribers' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <div className="relative">
                                                    <Layers className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                                    <select
                                                        value={formData.targetValue}
                                                        onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white appearance-none"
                                                    >
                                                        <option value="" className="bg-white dark:bg-[#1e293b]">Select Plan...</option>
                                                        {plansList.map(p => (
                                                            <option key={p.id} value={p.name} className="bg-white dark:bg-[#1e293b]">{p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Content Inputs */}
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Broadcast Title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 dark:text-white placeholder-slate-400"
                                    />
                                    <textarea
                                        placeholder="Type your message here..."
                                        rows={4}
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 resize-none"
                                    />
                                    <div className="flex gap-4">
                                        <input
                                            type="text"
                                            placeholder="Button Name (Optional)"
                                            value={formData.buttonName}
                                            onChange={(e) => setFormData({ ...formData, buttonName: e.target.value })}
                                            className="w-1/3 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                        />
                                        <input
                                            type="url"
                                            placeholder="Button URL (Optional)"
                                            value={formData.buttonUrl}
                                            onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                                            className="w-2/3 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                        />
                                    </div>
                                </div>

                                <button
                                    disabled={!formData.title || !formData.message || (formData.targetType !== 'All Users' && !formData.targetValue)}
                                    onClick={() => setShowPreview(true)}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Eye className="w-5 h-5" /> Preview & Send
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: HISTORY */}
                    <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
                        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-dark shadow-sm flex flex-col h-full overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <History className="w-5 h-5 text-indigo-500" /> Broadcast History
                                </h2>
                                <span className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                                    {broadcasts.length} Sent
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                                {loading ? (
                                    <div className="flex justify-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                    </div>
                                ) : broadcasts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-10 opacity-60">
                                        <Bell className="w-16 h-16 text-slate-300 mb-4" />
                                        <p className="text-slate-500 font-medium">No broadcasts sent yet.</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {broadcasts.map((b) => {
                                            const styles = getTypeStyles(b.type);
                                            return (
                                                <motion.div
                                                    key={b.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="group relative bg-white dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`p-3 rounded-xl ${styles.bg} ${styles.color} shrink-0`}>
                                                            {styles.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{b.title}</h3>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                                                                        {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleDelete(b.id)}
                                                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">{b.message}</p>

                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                                    Target: {b.target}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* PREVIEW MODAL */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPreview(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 md:p-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Broadcast</h3>
                                <p className="text-slate-500 text-sm mb-6">Review your message before sending. This will be visible to users immediately.</p>

                                {/* Preview Card */}
                                <div className={`p-5 rounded-xl border ${getTypeStyles(formData.type).border} ${getTypeStyles(formData.type).bg} bg-opacity-50 mb-6`}>
                                    <div className="flex gap-3">
                                        <div className={getTypeStyles(formData.type).color}>{getTypeStyles(formData.type).icon}</div>
                                        <div>
                                            <h4 className={`font-bold ${getTypeStyles(formData.type).color} mb-1`}>{formData.title}</h4>
                                            <p className="text-sm text-slate-700 dark:text-slate-200">{formData.message}</p>
                                            {formData.buttonName && formData.buttonUrl && (
                                                <div className="mt-3">
                                                    <a
                                                        href={formData.buttonUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
                                                    >
                                                        {formData.buttonName}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Target Audience:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{formData.targetType}</span>
                                    </div>
                                    {formData.targetValue && (
                                        <div className="flex justify-between gap-4">
                                            <span className="text-slate-500 shrink-0">Specific Target:</span>
                                            <span className="font-bold text-slate-900 dark:text-white truncate text-right">
                                                {formData.targetType === 'Specific User' 
                                                    ? usersList.find(u => u.id === formData.targetValue)?.name + ' (' + usersList.find(u => u.id === formData.targetValue)?.email + ')'
                                                    : formData.targetValue
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleSend}
                                        disabled={sending}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                                        Confirm Send
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminNotifications;
