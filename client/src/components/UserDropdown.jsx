import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, CreditCard, ChevronDown, Bell, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';


const UserDropdown = () => {
    const { user, logout, isImpersonating, exitImpersonation } = useAuth();
    const { unreadCount, isAdmin } = useNotifications();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        if (isImpersonating) {
            await exitImpersonation();
            // exitImpersonation already handles navigation to /superadmin/users
        } else {
            logout();
            navigate('/login');
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group relative"
            >
                <div className="size-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border-2 border-white dark:border-surface-dark shadow-sm group-hover:scale-105 transition-transform">
                    {user?.name?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
                </div>
                {/* Mobile Notification Badge on Avatar */}
                <span className="md:hidden absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white border-2 border-white dark:border-surface-dark opacity-0" style={{ opacity: unreadCount > 0 ? 1 : 0 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>

                <div className="hidden md:block text-left mr-1">
                    <p className="text-sm font-bold text-slate-700 dark:text-white leading-none mb-0.5">{user?.name?.split(' ')[0]}</p>
                    <p className="text-[10px] text-slate-500 dark:text-text-secondary font-medium uppercase tracking-wide">
                        {isImpersonating ? 'Viewing As' : (user?.isAdmin ? 'Super Admin' : 'User')}
                    </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 hidden md:block ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                {isImpersonating ? 'Impersonating User' : 'Signed in as'}
                            </p>
                            <p className="font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                        </div>

                        {/* Menu Items */}
                        <div className="p-2 space-y-1">
                            {/* Mobile Only: Notifications */}
                            <button
                                onClick={() => { setIsOpen(false); navigate(isAdmin ? '/superadmin/alerts' : '/notifications'); }}
                                className="md:hidden w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Bell className="w-4 h-4" />
                                    Notifications
                                </div>
                                {unreadCount > 0 && (
                                    <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-bold text-white">
                                        {unreadCount} New
                                    </span>
                                )}
                            </button>

                            {/* Mobile Only: Theme Toggle */}
                            <div className="md:hidden w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-3">
                                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    Appearance
                                </div>
                                <ThemeToggle />
                            </div>

                            {/* Mobile Divider */}
                            <div className="md:hidden h-px bg-slate-100 dark:bg-white/5 my-1 mx-2" />

                            <button
                                onClick={() => { setIsOpen(false); navigate('/settings', { state: { initialTab: 'profile' } }); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white transition-colors"
                            >
                                <User className="w-4 h-4" />
                                Profile
                            </button>

                            {!user?.isAdmin && !isImpersonating && (
                                <button
                                    onClick={() => { setIsOpen(false); navigate('/settings', { state: { initialTab: 'billing' } }); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white transition-colors"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Manage Subscription
                                </button>
                            )}

                            {user?.isAdmin && !isImpersonating && (
                                <button
                                    onClick={() => { setIsOpen(false); navigate('/settings', { state: { initialTab: 'general' } }); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                    System Settings
                                </button>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-slate-100 dark:border-white/5 mt-1">
                            <button
                                onClick={handleLogout}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${isImpersonating
                                        ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                        : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                    }`}
                            >
                                <LogOut className="w-4 h-4" />
                                {isImpersonating ? 'Exit Impersonation' : 'Log Out'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserDropdown;
