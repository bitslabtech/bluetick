// Loads a page's code before the user opens it, so a menu click shows the page straight away.
// These import() calls point at the same files as the React.lazy() pages in App.jsx, so the
// browser downloads each page once and React.lazy then finds it already loaded.
// Adding a page here is optional: a page that is missing is simply not prefetched.

const PAGES = {
    '/dashboard': () => import('../pages/Dashboard'),
    '/whatsapp': () => import('../pages/WhatsAppInbox'),
    '/campaigns': () => import('../pages/Campaigns'),
    '/campaign-list': () => import('../pages/CampaignList'),
    '/contacts': () => import('../pages/Contacts'),
    '/templates': () => import('../pages/Templates'),
    '/whatsapp-settings': () => import('../pages/WhatsAppSettings'),
    '/team': () => import('../pages/Team'),
    '/whatsapp-usage': () => import('../pages/WhatsAppUsage'),
    '/growth-hub': () => import('../pages/GrowthHub/GrowthHub'),
    '/ctwa-analytics': () => import('../pages/CTWAAnalytics'),
    '/vcards': () => Promise.all([import('../pages/VcardManager/VcardLayout'), import('../pages/VcardManager/VcardList')]),
    '/online-store': () => import('../pages/WaStoreManager/WaStoreList'),
    '/media-gallery': () => import('../pages/MediaGallery'),
    '/flowbot': () => import('../pages/FlowBot/FlowList'),
    '/referrals': () => import('../pages/Referrals'),
    '/marketplace': () => import('../pages/Marketplace'),
    '/reports': () => import('../pages/Reports'),
    '/support': () => import('../pages/Support'),
    '/settings': () => import('../pages/Settings'),
    '/wa-links': () => import('../pages/WALinksGenerator'),
    '/billing': () => import('../pages/Billing'),
    '/notifications': () => import('../pages/UserNotifications'),
    '/superadmin': () => import('../pages/SuperAdminDashboard'),
    '/superadmin/users': () => import('../pages/AdminUsers'),
    '/superadmin/ai-tokens': () => import('../pages/AdminAITokenUsers'),
    '/superadmin/plans': () => import('../pages/AdminPlans'),
    '/superadmin/purchases-invoices': () => import('../pages/AdminPurchasesInvoices'),
    '/superadmin/notifications': () => import('../pages/AdminNotifications'),
    '/superadmin/activity-logs': () => import('../pages/AdminActivityLogs'),
    '/superadmin/addons': () => import('../pages/AdminAddons'),
    '/superadmin/nfc': () => import('../pages/AdminNfcManager'),
    '/superadmin/system-control': () => import('../pages/AdminSystemControls'),
    '/superadmin/referral-settings': () => import('../pages/AdminReferralSettings'),
    '/superadmin/tech-partners': () => import('../pages/AdminTechPartners'),
    '/superadmin/landing-page': () => import('../pages/AdminLandingPage'),
    '/superadmin/messages': () => import('../pages/AdminMessages'),
    '/superadmin/support': () => import('../pages/AdminSupport'),
    '/superadmin/alerts': () => import('../pages/AdminAlerts'),
};

const started = new Map();

/** Start loading one page's code (no-op if unknown or already started). Safe to call often. */
export function prefetchPage(path) {
    if (!path) return;
    const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
    const load = PAGES[clean];
    if (!load || started.has(clean)) return;
    const p = load().catch(() => { started.delete(clean); }); // allow a retry after a network error
    started.set(clean, p);
}

// Data-saver or very slow connections: only prefetch on hover/tap, never in the background
function backgroundAllowed() {
    const c = typeof navigator !== 'undefined' ? navigator.connection : null;
    if (!c) return true;
    return !c.saveData && !/(^|-)2g$/.test(c.effectiveType || '');
}

const idle = (fn) => (typeof window !== 'undefined' && window.requestIdleCallback)
    ? window.requestIdleCallback(fn, { timeout: 3000 })
    : setTimeout(fn, 1500);

let scheduled = false;

/**
 * Once the current page has settled, quietly load the code for the given menu pages, a few at a time,
 * so the network stays free for the page the user is on. Runs once per app load.
 * @param {string[]} paths  menu paths the user can open (already filtered by plan, role and permissions)
 */
export function prefetchSidebarPages(paths) {
    if (scheduled || !Array.isArray(paths) || !paths.length || !backgroundAllowed()) return;
    scheduled = true;
    const queue = [...new Set(paths.map(p => (p || '').split('?')[0]))].filter(p => PAGES[p]);
    const next = () => {
        const batch = queue.splice(0, 3);
        if (!batch.length) return;
        batch.forEach(prefetchPage);
        Promise.allSettled(batch.map(p => started.get(p))).then(() => idle(next));
    };
    // Give the first page time to load its own code and data first
    setTimeout(() => idle(next), 2500);
}
