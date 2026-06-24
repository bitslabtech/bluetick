import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Send, Settings, LogOut, MessageSquare, BarChart3, ShieldCheck, CreditCard, ShoppingBag, Bell, Activity, LifeBuoy, LayoutTemplate, Settings2, Package, X, ChevronDown, ChevronRight, Layers, Tag, Sparkles, Calendar, Terminal, Briefcase, TrendingUp, Gift, Contact, Store, Lock, Image } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import axios from 'axios';
import UserDropdown from './UserDropdown';

const userNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', perm: 'menu_dashboard' },

    // WhatsApp — Inbox, Broadcasts, Contacts, Templates, Profile, Team
    {
        icon: MessageSquare,
        label: 'WhatsApp',
        requiredModule: 'whatsapp_inbox',
        subItems: [
            { label: 'Live Chat', path: '/whatsapp', perm: 'menu_whatsapp_inbox' },
            { label: 'Bulk Broadcast', path: '/campaigns', perm: 'menu_send_message' },
            { label: 'Campaigns History', path: '/campaign-list', perm: 'menu_campaigns' },
            { label: 'Contacts', path: '/contacts', perm: 'menu_contacts' },
            { label: 'Templates', path: '/templates', perm: 'menu_templates' },
            { label: 'WhatsApp Profile', path: '/whatsapp-settings', perm: 'menu_whatsapp_settings' },
            { label: 'Team', path: '/team', ownerOnly: true },
        ]
    },

    // Growth Hub — Unified Ads Command Center
    {
        icon: TrendingUp,
        label: 'Growth Hub',
        subItems: [
            { label: 'Ads Command Center', path: '/growth-hub', perm: 'menu_meta_ads', requiresMetaAds: true },
            { label: 'CTWA Connect', path: '/ctwa-analytics', perm: 'menu_ctwa', requiresCtwa: true },
        ]
    },

    // Digital veCard SaaS Module
    {
        icon: Contact,
        label: 'Digital veCard',
        path: '/vcards',
        perm: 'menu_vcard',
        requiresVcard: true
    },

    // Online Store Builder
    {
        icon: Store,
        label: 'Online Store',
        path: '/online-store',
        perm: 'menu_wastore',
        requiresWaStore: true
    },

    // Media Manager (for Store & vCard uploads + quota tracking)
    {
        icon: Image,
        label: 'Media Manager',
        path: '/media-gallery',
        perm: 'menu_media_gallery'
    },

    // Automation suite
    {
        icon: LayoutTemplate,
        label: 'Automation',
        subItems: [
            { label: 'FlowBot Builder', path: '/flowbot', perm: 'menu_flowbot', requiresFlowbot: true },
        ]
    },

    { icon: Gift, label: 'Refer & Earn', path: '/referrals', perm: 'menu_referrals' },

    { icon: Package, label: 'Add-ons Market', path: '/marketplace', perm: 'menu_addons' },
    { icon: Terminal, label: 'Integrations & API', path: '/integrations', perm: 'menu_integrations', requiresApiAccess: true },

    { icon: BarChart3, label: 'Reports', path: '/reports', perm: 'menu_reports' },

    { icon: LifeBuoy, label: 'Support', path: '/support', perm: 'menu_support' },
    { icon: Settings, label: 'Settings', path: '/settings', perm: 'menu_settings' },
];

const adminNavItems = [
    { icon: ShieldCheck, label: 'Dashboard', path: '/superadmin' },
    { icon: Users, label: 'Users', path: '/superadmin/users' },
    { icon: Sparkles, label: 'AI Tokens', path: '/superadmin/ai-tokens' },
    { icon: CreditCard, label: 'Plans', path: '/superadmin/plans' },
    { icon: ShoppingBag, label: 'Purchases', path: '/superadmin/purchases' },
    { icon: Bell, label: 'Broadcast Manager', path: '/superadmin/notifications' },
    { icon: Activity, label: 'Activity Logs', path: '/superadmin/activity-logs' }, // Fixed path for logs too
    { icon: Layers, label: 'Add-ons Market', path: '/superadmin/addons' },
    { icon: CreditCard, label: 'NFC Products', path: '/superadmin/nfc' },
    {
        icon: Settings2,
        label: 'System Controls',
        subItems: [
            { label: 'General', path: '/superadmin/system-control' },
            { label: 'Referral', path: '/superadmin/referral-settings' },
            { label: 'Tech Partner', path: '/superadmin/tech-partners' }
        ]
    },
    { icon: LayoutTemplate, label: 'Landing Page', path: '/superadmin/landing-page' },
    { icon: MessageSquare, label: 'Contact Messages', path: '/superadmin/messages' },

    { icon: LifeBuoy, label: 'Support', path: '/superadmin/support' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

// Sub-item Component
function NavItem({ item, location, setIsOpen, unreadCount }) {
    const { user } = useAuth();
    
    const { publicSettings } = useUI();
    const showLockedMenus = publicSettings?.settings?.showLockedMenus !== false && publicSettings?.settings?.showLockedMenus !== 'false';

    // Pre-calculate visible sub-items so we know if the parent should even render
    let visibleSubItems = null;
    if (item.subItems) {
        visibleSubItems = item.subItems.map(sub => {
            let locked = false;
            const isSubUser = !!user?.parentUserId;
            const isAdmin = user?.teamRole === 'admin';

            if (sub.ownerOnly && isSubUser && !isAdmin) return null; // Always hide owner-only from sub-users

            // Plan level feature restrictions
            if (sub.requiresCtwa && !user?.planDetails?.allowCtwaAnalytics && !user?.isAdmin) locked = true;
            if (sub.requiresMetaAds && !user?.planDetails?.allowMetaAds && !user?.isAdmin) locked = true;
            if (sub.requiresWaLinks && !user?.planDetails?.allowWaLinks && !user?.isAdmin) locked = true;
            if (sub.requiresFlowbot && !user?.planDetails?.flowBotEnabled && !user?.isAdmin) locked = true;

            // Custom permissions check for sub-items (team member restrictions)
            if (isSubUser && user?.teamRole === 'custom' && sub.perm) {
                if (!user.teamPermissions?.includes(sub.perm)) return null; // Hide if they lack team permission
            }

            if (locked && !showLockedMenus) return null;
            return { ...sub, isLocked: locked };
        }).filter(Boolean);
    }

    // If it's supposed to be a submenu, but ALL sub-items got filtered out, hide parent completely
    if (item.subItems && (!visibleSubItems || visibleSubItems.length === 0)) {
        return null;
    }

    const isActive = item.path === location.pathname || (visibleSubItems && visibleSubItems.some(sub => sub.path === location.pathname));
    const [expanded, setExpanded] = useState(isActive);
    const isSubMenu = !!visibleSubItems;

    return (
        <div className="flex flex-col gap-1">
            {isSubMenu ? (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={cn(
                        "flex justify-between items-center px-3 py-3 rounded-lg transition-all duration-200 w-full",
                        isActive && !expanded
                            ? "bg-primary/10 text-primary dark:text-white"
                            : "text-slate-500 dark:text-text-secondary hover:bg-slate-100 dark:hover:bg-surface-dark hover:text-slate-900 dark:hover:text-white"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <item.icon className="text-[22px]" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-background-dark"></span>
                            )}
                        </div>
                        <p className="text-sm font-medium leading-normal">{item.label}</p>
                    </div>
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            ) : (
                <Link
                    to={item.isLocked ? `/locked-feature?feature=${encodeURIComponent(item.label)}` : item.path}
                    onClick={() => setIsOpen && setIsOpen(false)}
                    className={cn(
                        "flex items-center justify-between px-3 py-3 rounded-lg transition-all duration-200",
                        item.path === location.pathname && !item.isLocked
                            ? "bg-primary text-white shadow-md shadow-blue-500/20"
                            : "text-slate-500 dark:text-text-secondary hover:bg-slate-100 dark:hover:bg-surface-dark hover:text-slate-900 dark:hover:text-white",
                        item.isLocked && "opacity-75"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <item.icon className="text-[22px]" />
                        <p className="text-sm font-medium leading-normal flex items-center gap-2">
                            {item.label}
                            {item.isLocked && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        </p>
                    </div>
                    {unreadCount > 0 && !item.isLocked && (
                        <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </div>
                    )}
                </Link>
            )}

            {/* Sub-items */}
            {isSubMenu && expanded && (
                <div className="flex flex-col gap-1 ml-9 border-l-2 border-slate-100 dark:border-white/10 pl-2">
                    {visibleSubItems.map((sub) => (
                        <Link
                            key={sub.path}
                            to={sub.isLocked ? `/locked-feature?feature=${encodeURIComponent(sub.label)}` : sub.path}
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={cn(
                                "flex items-center px-3 py-2 rounded-lg transition-all text-sm font-medium gap-2",
                                sub.path === location.pathname && !sub.isLocked
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-slate-500 dark:text-text-secondary hover:bg-slate-100 dark:hover:bg-surface-dark hover:text-slate-900 dark:hover:text-white",
                                sub.isLocked && "opacity-75"
                            )}
                        >
                            {sub.label}
                            {sub.isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0 ml-auto" />}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Sidebar({ isOpen, setIsOpen }) {
    const location = useLocation();
    const { user, logout } = useAuth();
    const { settings, publicSettings, publicSettingsLoading } = useUI();

    // ── Version & Changelog state (user sidebar) ──
    const [currentVersion, setCurrentVersion] = useState(null);
    const [changelogOpen, setChangelogOpen] = useState(false);
    const [changelog, setChangelog] = useState([]);
    const [changelogLoading, setChangelogLoading] = useState(false);
    const [hasNewVersion, setHasNewVersion] = useState(false);
    const [unreadContactMsgs, setUnreadContactMsgs] = useState(0);
    const [unreadSupportTickets, setUnreadSupportTickets] = useState(0);

    // Fetch latest version on mount
    useEffect(() => {
        if (user) {
            axios.get(`${import.meta.env.VITE_API_URL}/api/versioning/latest`)
                .then(res => {
                    setCurrentVersion(res.data);
                    // Check if the user has seen this version
                    const lastSeen = localStorage.getItem('lastSeenVersion');
                    if (lastSeen !== res.data.version) {
                        setHasNewVersion(true);
                    }
                })
                .catch(() => setCurrentVersion({ version: '1.0.0' }));
        }
    }, [user]);

    // Fetch unread count for admins
    useEffect(() => {
        if (user?.isAdmin) {
            const fetchContactCount = () => {
                axios.get(`${import.meta.env.VITE_API_URL}/api/contact/unread-count`)
                    .then(res => setUnreadContactMsgs(res.data.count))
                    .catch(err => console.error(err));
            };
            fetchContactCount();
            const interval = setInterval(fetchContactCount, 60000); // 1 min poll
            return () => clearInterval(interval);
        }
    }, [user]);

    // Fetch unread support ticket count for both users and admins (sidebar red dot)
    useEffect(() => {
        if (!user) return;
        const fetchSupportUnread = () => {
            axios.get(`${import.meta.env.VITE_API_URL}/api/support/tickets/unread-count`)
                .then(res => setUnreadSupportTickets(res.data.count || 0))
                .catch(() => {}); // silently fail
        };
        fetchSupportUnread();
        const interval = setInterval(fetchSupportUnread, 60000); // 1 min poll
        return () => clearInterval(interval);
    }, [user]);

    const openChangelog = async () => {
        setChangelogOpen(true);
        setChangelogLoading(true);
        // Mark version as seen
        if (currentVersion?.version) {
            localStorage.setItem('lastSeenVersion', currentVersion.version);
            setHasNewVersion(false);
        }
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/versioning/changelog`);
            setChangelog(res.data);
        } catch {
            setChangelog([]);
        } finally {
            setChangelogLoading(false);
        }
    };

    // Decide which items to show based on role
    // Filter out items the user doesn't have the requiredModule for
    const baseItems = user?.isAdmin ? adminNavItems : userNavItems;
    const isSubUser = !!user?.parentUserId;

    const showLockedMenus = publicSettings?.settings?.showLockedMenus !== false && publicSettings?.settings?.showLockedMenus !== 'false';

    // Filter nav items: hide ownerOnly items for sub-users
    let items = baseItems.map(item => {
        let locked = false;
        if (item.ownerOnly && isSubUser && user?.teamRole !== 'admin') return null;
        
        // Plan Restrictions
        if (item.requiresFlowbot && !user?.planDetails?.flowBotEnabled && !user?.isAdmin) locked = true;
        if (item.requiresApiAccess && !user?.planDetails?.allowApiAccess && !user?.isAdmin) locked = true;
        if (item.requiresVcard && !user?.planDetails?.allowVcard && !user?.isAdmin) locked = true;
        if (item.requiresWaStore && !user?.planDetails?.allowWaStore && !user?.isAdmin) locked = true;

        // Custom Permissions check for main level items
        if (isSubUser && user?.teamRole === 'custom' && !user?.isAdmin) {
            if (item.subItems) {
                // Keep parent if at least one sub-item is allowed, or if it's ownerOnly (which we handle)
                const hasAllowedSub = item.subItems.some(sub => {
                    if (sub.ownerOnly) return false;
                    if (sub.perm) return user.teamPermissions?.includes(sub.perm);
                    return true;
                });
                if (!hasAllowedSub) return null;
            } else if (item.perm) {
                if (!user.teamPermissions?.includes(item.perm)) return null;
            }
        }

        if (locked && !showLockedMenus) return null;
        return { ...item, isLocked: locked };
    }).filter(Boolean);

    // Reorder based on global system config menuOrder (if it exists)
    // Only apply for non-admins so superadmin retains the default structured view
    if (!user?.isAdmin && publicSettings?.menuOrder && Array.isArray(publicSettings.menuOrder) && publicSettings.menuOrder.length > 0) {
        // Create a map for O(1) index lookup
        const orderMap = new Map();
        publicSettings.menuOrder.forEach((label, index) => {
            orderMap.set(label, index);
        });

        items.sort((a, b) => {
            const indexA = orderMap.has(a.label) ? orderMap.get(a.label) : 999;
            const indexB = orderMap.has(b.label) ? orderMap.get(b.label) : 999;
            return indexA - indexB;
        });
    }

    if (publicSettingsLoading) {
        return (
            <aside className={cn(
                "flex flex-col border-r border-slate-200 dark:border-surface-dark bg-white dark:bg-background-dark p-4 transition-all duration-300",
                "fixed inset-y-0 left-0 z-[60] w-64 transform overflow-y-auto",
                isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
                "md:translate-x-0 md:sticky md:top-0 md:h-screen md:shadow-none"
            )}>
                <div className="flex flex-col gap-8">
                    <div className="flex gap-3 items-center px-2 animate-pulse">
                        <div className="w-10 h-10 bg-slate-200 dark:bg-surface-dark rounded-lg shrink-0"></div>
                        <div className="flex flex-col gap-2 justify-center">
                            <div className="w-24 h-4 bg-slate-200 dark:bg-surface-dark rounded"></div>
                            <div className="w-16 h-3 bg-slate-200 dark:bg-surface-dark rounded"></div>
                        </div>
                    </div>
                    <nav className="flex flex-col gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <div key={i} className="h-11 bg-slate-50 dark:bg-surface-dark rounded-lg animate-pulse"></div>
                        ))}
                    </nav>
                </div>
            </aside>
        );
    }

    return (<>
        <aside className={cn(
            "flex flex-col justify-between border-r border-slate-200 dark:border-surface-dark bg-white dark:bg-background-dark p-4 transition-all duration-300",
            "fixed inset-y-0 left-0 z-[60] w-64 transform overflow-y-auto",
            isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
            "md:translate-x-0 md:sticky md:top-0 md:h-screen md:shadow-none"
        )}>
            <div className="flex flex-col gap-8">
                {/* Logo Area */}
                <div className="flex gap-3 items-center px-2">
                    {publicSettings?.logoUrl ? (
                        <img 
                            src={publicSettings.logoUrl} 
                            alt="Logo" 
                            className="h-10 max-w-[200px] object-contain" 
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                    ) : null}
                    <div className="flex items-center justify-center rounded-lg bg-primary size-10 text-white shadow-lg shadow-blue-500/20" style={{ display: publicSettings?.logoUrl ? 'none' : 'flex' }}>
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsOpen && setIsOpen(false)}
                        className="md:hidden ml-auto p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                    {items.map((item, index) => (
                        <NavItem
                            key={item.path || index}
                            item={item}
                            location={location}
                            setIsOpen={setIsOpen}
                            unreadCount={
                                item.path === '/superadmin/messages'
                                    ? unreadContactMsgs
                                    : (item.path === '/support' || item.path === '/superadmin/support')
                                        ? unreadSupportTickets
                                        : null
                            }
                        />
                    ))}
                </nav>
            </div>

            <div className="flex flex-col mt-auto shrink-0">

            {/* ── Version Badge (all users) ── */}
            {currentVersion && (
                <div className="px-3 pb-3">
                    <button
                        onClick={openChangelog}
                        className="group flex items-center justify-center gap-2 py-3 mt-2 w-full rounded-xl relative overflow-hidden transition-all duration-300 hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative">
                            <Sparkles className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-purple-500 transition-colors duration-300" />
                            {hasNewVersion && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors duration-300">
                                Version
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 group-hover:bg-purple-500/10 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                                v{currentVersion.version}
                            </span>
                            {hasNewVersion && (
                                <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider animate-pulse">New!</span>
                            )}
                        </div>
                    </button>
                </div>
            )}
            </div>

        </aside>

        {/* ── Changelog Modal ── */}
        {changelogOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setChangelogOpen(false)}>
                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Tag className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Changelog</h3>
                                <p className="text-xs text-slate-500 dark:text-text-secondary">What's new in every update</p>
                            </div>
                        </div>
                        <button onClick={() => setChangelogOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="overflow-y-auto flex-1 p-4 md:p-6">
                        {changelogLoading ? (
                            <div className="flex flex-col gap-6">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-24 mb-2"></div>
                                        <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-48 mb-1"></div>
                                        <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-64"></div>
                                    </div>
                                ))}
                            </div>
                        ) : changelog.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Tag className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No changelogs yet.</p>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-white/10"></div>

                                <div className="flex flex-col gap-6">
                                    {changelog.map((v, i) => (
                                        <div key={v.id} className="relative pl-7">
                                            {/* Timeline dot */}
                                            <div className={cn(
                                                "absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-white dark:border-surface-dark z-10",
                                                v.isCurrent
                                                    ? "bg-purple-500 shadow-md shadow-purple-500/30"
                                                    : "bg-slate-300 dark:bg-slate-600"
                                            )}></div>

                                            {/* Content */}
                                            <div className={cn(
                                                "p-4 rounded-xl border transition-colors",
                                                v.isCurrent
                                                    ? "bg-purple-50/50 dark:bg-purple-500/5 border-purple-200 dark:border-purple-500/20"
                                                    : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5"
                                            )}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold",
                                                            v.isCurrent
                                                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                                                                : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                                                        )}>
                                                            v{v.version}
                                                        </span>
                                                        {v.isCurrent && (
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">Current</span>
                                                        )}
                                                    </div>
                                                    {v.releasedAt && (
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(v.releasedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{v.title}</h4>
                                                {v.changelog && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">{v.changelog}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </>);
}
