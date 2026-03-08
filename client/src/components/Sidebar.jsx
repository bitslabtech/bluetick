import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Send, Settings, LogOut, MessageSquare, BarChart3, ShieldCheck, CreditCard, ShoppingBag, Bell, Activity, LifeBuoy, LayoutTemplate, Settings2, Terminal, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

const userNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: MessageSquare, label: 'WhatsApp', path: '/whatsapp', requiredModule: 'whatsapp_inbox' }, // PROTECTED
    { icon: Send, label: 'Send Message', path: '/campaigns' },
    { icon: MessageSquare, label: 'Campaigns', path: '/campaign-list' },
    { icon: Users, label: 'Contacts', path: '/contacts' },
    { icon: FileText, label: 'Templates', path: '/templates' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },

    { icon: LifeBuoy, label: 'Support', path: '/support' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

const adminNavItems = [
    { icon: ShieldCheck, label: 'Dashboard', path: '/superadmin' },
    { icon: Users, label: 'Users', path: '/superadmin/users' },
    { icon: CreditCard, label: 'Plans', path: '/superadmin/plans' },
    { icon: ShoppingBag, label: 'Purchases', path: '/superadmin/purchases' },
    { icon: Bell, label: 'Broadcast Manager', path: '/superadmin/notifications' },
    { icon: Activity, label: 'Activity Logs', path: '/superadmin/activity-logs' }, // Fixed path for logs too
    { icon: Settings2, label: 'System Controls', path: '/superadmin/system-control' },
    { icon: LayoutTemplate, label: 'Landing Page', path: '/superadmin/landing-page' },

    { icon: LifeBuoy, label: 'Support', path: '/superadmin/support' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
    const location = useLocation();
    const { user, logout } = useAuth();
    const { settings, publicSettings } = useUI();

    // Decide which items to show based on role
    // Filter out items the user doesn't have the requiredModule for
    const baseItems = user?.isAdmin ? adminNavItems : userNavItems;

    // Admins see everything in their list. Users see their list.
    const items = baseItems;

    return (
        <aside className="w-72 flex-col justify-between border-r border-slate-200 dark:border-surface-dark bg-white dark:bg-background-dark p-4 hidden md:flex sticky top-0 h-screen transition-colors duration-300">
            <div className="flex flex-col gap-8">
                {/* Logo Area */}
                <div className="flex gap-3 items-center px-2">
                    {publicSettings?.logoUrl ? (
                        <img src={publicSettings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                    ) : (
                        <div className="flex items-center justify-center rounded-lg bg-primary size-10 text-white shadow-lg shadow-blue-500/20">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <h1 className="text-slate-900 dark:text-white text-base font-bold leading-normal truncate max-w-[140px]">
                            {publicSettings?.appName || 'WaManager'}
                        </h1>
                        <p className="text-slate-500 dark:text-text-secondary text-xs font-normal leading-normal truncate max-w-[140px]">{publicSettings?.appTagline || 'Business API'}</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                    {items.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                                    isActive
                                        ? "bg-primary text-white shadow-md shadow-blue-500/20"
                                        : "text-slate-500 dark:text-text-secondary hover:bg-slate-100 dark:hover:bg-surface-dark hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <item.icon className="text-[22px]" />
                                <p className="text-sm font-medium leading-normal">{item.label}</p>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User/System Status */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-3 py-3 rounded-lg bg-slate-50 dark:bg-surface-dark/50 border border-slate-200 dark:border-surface-dark transition-colors duration-300">
                    <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-900 dark:text-white">{user?.name || 'User'}</span>
                            <span className="text-[10px] text-slate-500 dark:text-text-secondary">
                                {user?.isAdmin ? 'Superadmin' : 'API Connected'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="text-slate-400 dark:text-text-secondary hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
