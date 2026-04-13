import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, AlertTriangle, XCircle, CheckCircle2, Info, UserPlus, CreditCard, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

const NotificationBell = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useUI();
    const [notifications, setNotifications] = useState([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const containerRef = useRef(null);

    const isAdmin = user?.isAdmin;

    const fetchNotifications = async () => {
        try {
            const endpoint = isAdmin
                ? 'http://127.0.0.1:5000/api/admin-notifications'
                : 'http://127.0.0.1:5000/api/notifications';

            const res = await axios.get(endpoint);

            if (isAdmin) {
                setNotifications(res.data.notifications || []);
                setUnreadCount(res.data.unreadCount || 0);
            } else {
                setNotifications(res.data);
                if (!isNotificationsOpen) {
                    setUnreadCount(res.data.length); // User API returns array
                }
            }
        } catch (err) {
            console.error("Error loading notifications:", err);
        }
    };

    const markAllRead = async () => {
        if (!isAdmin) return;
        try {
            await axios.put('http://127.0.0.1:5000/api/admin-notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            showToast('All marked as read', 'success');
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [isAdmin]); // Re-run if user role changes (unlikely) or on mount

    useEffect(() => {
        if (isNotificationsOpen) {
            fetchNotifications();
            // For regular users, we assume opening clears "count" badge visually or logic handled backend
            if (!isAdmin) setUnreadCount(0);
        }
    }, [isNotificationsOpen]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type) => {
        if (isAdmin) {
            switch (type) {
                case 'USER_REGISTER': return <UserPlus className="w-4 h-4 text-blue-500" />;
                case 'PLAN_CHANGE': return <CreditCard className="w-4 h-4 text-green-500" />;
                case 'SUPPORT_TICKET': return <Ticket className="w-4 h-4 text-amber-500" />;
                default: return <Bell className="w-4 h-4 text-slate-500" />;
            }
        } else {
            switch (type) {
                case 'Warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
                case 'Error': return <XCircle className="w-4 h-4 text-red-600" />;
                case 'Success': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
                default: return <Info className="w-4 h-4 text-blue-600" />;
            }
        }
    };

    const getBgColor = (type, isRead) => {
        if (isAdmin) {
            return !isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-white/5';
        }
        return 'hover:bg-slate-50 dark:hover:bg-white/5'; // User logic simpler
    };

    return (
        <div className="relative" ref={containerRef}>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative flex items-center justify-center size-10 rounded-lg bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-[#2f455a] transition-colors focus:outline-none"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-surface-dark"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </motion.button>

            <AnimatePresence>
                {isNotificationsOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5 backdrop-blur-sm">
                            <h3 className="font-bold text-slate-900 dark:text-white">
                                {isAdmin ? 'System ALerts' : 'Notifications'}
                            </h3>
                            {isAdmin && unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-xs text-indigo-500 font-bold hover:underline">
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 dark:text-text-secondary">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No new notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {notifications.slice(0, 5).map((notif, i) => (
                                        <div
                                            key={notif.id || i}
                                            onClick={() => {
                                                setIsNotificationsOpen(false);
                                                navigate(isAdmin ? '/superadmin/alerts' : '/notifications');
                                            }}
                                            className={`p-4 transition-colors cursor-pointer group relative ${getBgColor(notif.type, notif.isRead)}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1 size-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin
                                                        ? 'bg-slate-100 dark:bg-white/5'
                                                        : (notif.type === 'Warning' ? 'bg-amber-100 dark:bg-amber-900/20' : notif.type === 'Error' ? 'bg-red-100 dark:bg-red-900/20' : notif.type === 'Success' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-blue-100 dark:bg-blue-900/20')
                                                    }`}>
                                                    {getIcon(notif.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate pr-6">
                                                        {isAdmin ? notif.message : notif.title}
                                                    </p>
                                                    {!isAdmin && (
                                                        <p className="text-xs text-slate-500 dark:text-text-secondary mt-0.5 line-clamp-4 leading-relaxed">
                                                            {notif.message}
                                                        </p>
                                                    )}
                                                    {!isAdmin && notif.buttonName && notif.buttonUrl && (
                                                        <div className="mt-2">
                                                            <a
                                                                href={notif.buttonUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="inline-block px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-md text-[10px] font-bold transition-colors border border-indigo-200 dark:border-indigo-500/30"
                                                            >
                                                                {notif.buttonName}
                                                            </a>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                                        {new Date(notif.createdAt).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 text-center">
                            <button
                                onClick={() => navigate(isAdmin ? '/superadmin/alerts' : '/notifications')}
                                className="text-xs text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-white transition-colors"
                            >
                                {isAdmin ? 'View All Alerts' : 'See all notifications'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
