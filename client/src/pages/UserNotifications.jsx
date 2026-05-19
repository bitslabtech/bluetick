import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Bell, CheckCircle2, AlertTriangle, XCircle, Info,
    Trash2, CheckCheck, Search, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const UserNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All'); // All, Info, Success, Warning, Error

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications`);
            setNotifications(res.data);
        } catch (err) {
            console.error("Error fetching notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const getTypeStyles = (type) => {
        switch (type) {
            case 'Success':
                return {
                    border: 'border-green-200 dark:border-green-900',
                    bg: 'bg-green-50/50 dark:bg-green-900/10',
                    iconBg: 'bg-green-100 dark:bg-green-900/20',
                    text: 'text-green-700 dark:text-green-400',
                    icon: <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                };
            case 'Warning':
                return {
                    border: 'border-amber-200 dark:border-amber-900',
                    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
                    iconBg: 'bg-amber-100 dark:bg-amber-900/20',
                    text: 'text-amber-700 dark:text-amber-400',
                    icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                };
            case 'Error':
                return {
                    border: 'border-red-200 dark:border-red-900',
                    bg: 'bg-red-50/50 dark:bg-red-900/10',
                    iconBg: 'bg-red-100 dark:bg-red-900/20',
                    text: 'text-red-700 dark:text-red-400',
                    icon: <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                };
            default:
                return {
                    border: 'border-blue-200 dark:border-blue-900',
                    bg: 'bg-blue-50/50 dark:bg-blue-900/10',
                    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
                    text: 'text-blue-700 dark:text-blue-400',
                    icon: <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                };
        }
    };

    const filteredNotifications = filter === 'All'
        ? notifications
        : notifications.filter(n => n.type === filter);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background-dark min-h-screen">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-8 py-5 bg-white dark:bg-background-dark sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Bell className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notifications</h1>
                        <p className="text-sm text-slate-500 dark:text-text-secondary">Stay updated with system alerts and messages.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <div className="size-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
                        {user?.name?.[0]}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-8 max-w-5xl mx-auto w-full flex-1">

                {/* Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">

                    {/* Filter Tabs */}
                    <div className="flex p-1 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                        {['All', 'Info', 'Success', 'Warning', 'Error'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === type
                                        ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <CheckCheck className="w-4 h-4" /> Mark all read
                        </button>
                    </div>
                </div>

                {/* Notifications Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-surface-dark rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">All caught up!</h3>
                        <p className="text-slate-500">No notifications found.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence>
                            {filteredNotifications.map((n, i) => {
                                const style = getTypeStyles(n.type);
                                return (
                                    <motion.div
                                        key={n.id || i}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: i * 0.05 }}
                                        className={`relative group p-6 rounded-2xl border ${style.border} ${style.bg} hover:shadow-md transition-all duration-300 backdrop-blur-sm`}
                                    >
                                        <div className="flex items-start gap-5">
                                            <div className={`p-3 rounded-xl ${style.iconBg} flex-shrink-0`}>
                                                {style.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className={`text-lg font-bold ${style.text} mb-1`}>{n.title}</h3>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs font-medium text-slate-400 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-md">
                                                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">
                                                            {new Date(n.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                                                    {n.message}
                                                </p>
                                                {n.buttonName && n.buttonUrl && (
                                                    <div className="mt-4">
                                                        <a
                                                            href={n.buttonUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`inline-block px-4 py-2 ${style.iconBg} text-slate-800 dark:text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all border ${style.border}`}
                                                        >
                                                            {n.buttonName}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
};

export default UserNotifications;
