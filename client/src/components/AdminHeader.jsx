import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Settings, User, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserDropdown from './UserDropdown';

const AdminHeader = ({ title, subtitle, children, showSearch = true, searchTerm = '', onSearchChange }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // Profile logic moved to UserDropdown

    // Notification Logic
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationRef = useRef(null);

    const fetchNotifications = async () => {
        if (!user?.isAdmin) return;
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/admin-notifications');
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch (err) {
            console.error("Error fetching admin notifications:", err);
        }
    };

    const markAllRead = async () => {
        try {
            await axios.put('http://127.0.0.1:5000/api/admin-notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Error marking read:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdowns when clicking outside (Notifications Only)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);



    return (
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-surface-dark px-6 py-4 bg-white dark:bg-background-dark shrink-0 transition-colors duration-300 sticky top-0 z-10">
            <div className="flex items-center gap-6 w-full">
                {showSearch && (
                    <div className="flex items-center rounded-lg bg-slate-100 dark:bg-surface-dark h-10 w-full max-w-md px-3 border border-transparent focus-within:border-primary transition-colors hidden md:flex">
                        <input
                            value={searchTerm}
                            onChange={onSearchChange}
                            className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-secondary text-sm focus:outline-none ml-2"
                            placeholder="Search..."
                        />
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4">
                {/* Custom actions passed from parent */}
                {children}

                {/* Notification Bell */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                        className="relative flex items-center justify-center size-10 rounded-lg bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-[#2f455a] transition-colors"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
                        )}
                    </button>

                    {isNotificationOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-dark rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-xs text-indigo-500 font-bold hover:underline">
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                        No new notifications
                                    </div>
                                ) : (
                                    notifications.slice(0, 5).map(n => (
                                        <div key={n.id} className={`p-4 border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!n.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                            <div className="flex gap-3">
                                                <div className="mt-1">
                                                    {n.type === 'USER_REGISTER' && <div className="size-2 rounded-full bg-blue-500"></div>}
                                                    {n.type === 'PLAN_CHANGE' && <div className="size-2 rounded-full bg-green-500"></div>}
                                                    {n.type === 'SUPPORT_TICKET' && <div className="size-2 rounded-full bg-amber-500"></div>}
                                                </div>
                                                <div>
                                                    <p className={`text-sm ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                        {n.message}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {new Date(n.createdAt).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 text-center">
                                <button
                                    onClick={() => {
                                        setIsNotificationOpen(false);
                                        navigate('/superadmin/alerts');
                                    }}
                                    className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    View All Notifications
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <UserDropdown />
            </div>
        </header>
    );
};

export default AdminHeader;
