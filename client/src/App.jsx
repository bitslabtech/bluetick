import React, { Suspense, useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import { UIProvider } from './context/UIContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import { PaymentRedirectHandler } from './components/PaymentRedirectHandler';

// ── Code-Split Pages (React.lazy) ──────────────────────────────────────────
// Each page loads as a separate JS chunk (~20-150KB) only when navigated to.
// This reduces the initial bundle from ~3.5MB to ~300-500KB.
const Setup = React.lazy(() => import('./pages/Setup'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Contacts = React.lazy(() => import('./pages/Contacts'));
const Templates = React.lazy(() => import('./pages/Templates'));
const Campaigns = React.lazy(() => import('./pages/Campaigns'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Marketplace = React.lazy(() => import('./pages/Marketplace'));
const AddonDetail = React.lazy(() => import('./pages/AddonDetail'));
const Integrations = React.lazy(() => import('./pages/Integrations'));
const WhatsAppInbox = React.lazy(() => import('./pages/WhatsAppInbox'));
const WhatsAppSettings = React.lazy(() => import('./pages/WhatsAppSettings'));
const PublicForm = React.lazy(() => import('./pages/PublicForm'));
const Login = React.lazy(() => import('./pages/Login'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const Register = React.lazy(() => import('./pages/Register'));
const SuperAdminDashboard = React.lazy(() => import('./pages/SuperAdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminPlans = React.lazy(() => import('./pages/AdminPlans'));
const AdminPurchases = React.lazy(() => import('./pages/AdminPurchases'));
const AdminNotifications = React.lazy(() => import('./pages/AdminNotifications'));
const AdminActivityLogs = React.lazy(() => import('./pages/AdminActivityLogs'));
const AdminAITokenUsers = React.lazy(() => import('./pages/AdminAITokenUsers'));
const AdminTechPartners = React.lazy(() => import('./pages/AdminTechPartners'));
const AdminNfcManager = React.lazy(() => import('./pages/AdminNfcManager'));
const Team = React.lazy(() => import('./pages/Team'));
const TeamMemberAnalytics = React.lazy(() => import('./pages/TeamMemberAnalytics'));
const AdminSupport = React.lazy(() => import('./pages/AdminSupport'));
const AdminLandingPage = React.lazy(() => import('./pages/AdminLandingPage'));
const AdminMessages = React.lazy(() => import('./pages/AdminMessages'));
const AdminAddons = React.lazy(() => import('./pages/AdminAddons'));
const AdminAddonConfig = React.lazy(() => import('./pages/AdminAddonConfig'));
const AiBotSettings = React.lazy(() => import('./pages/AiBotSettings'));
const WhatsAppFormsBuilder = React.lazy(() => import('./pages/addons/WhatsAppFormsBuilder'));
const StorePage = React.lazy(() => import('./pages/Store'));
const FlowBotBuilder = React.lazy(() => import('./pages/FlowBot'));
const FlowList = React.lazy(() => import('./pages/FlowBot/FlowList'));
const AdminSystemControls = React.lazy(() => import('./pages/AdminSystemControls'));
const AdminReferralSettings = React.lazy(() => import('./pages/AdminReferralSettings'));
const Support = React.lazy(() => import('./pages/Support'));
const UserNotifications = React.lazy(() => import('./pages/UserNotifications'));
const AdminAlerts = React.lazy(() => import('./pages/AdminAlerts'));
const CampaignList = React.lazy(() => import('./pages/CampaignList'));
const CampaignDetails = React.lazy(() => import('./pages/CampaignDetails'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const BlogList = React.lazy(() => import('./pages/BlogList'));
const BlogPost = React.lazy(() => import('./pages/BlogPost'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const Billing = React.lazy(() => import('./pages/Billing'));
const UpgradeFunnel = React.lazy(() => import('./pages/UpgradeFunnel'));
const AiTokenHistory = React.lazy(() => import('./pages/AiTokenHistory'));
const Referrals = React.lazy(() => import('./pages/Referrals'));
const TechPartner = React.lazy(() => import('./pages/TechPartner'));
const NfcSetup = React.lazy(() => import('./pages/NfcSetup'));
const CTWAAnalytics = React.lazy(() => import('./pages/CTWAAnalytics'));
const GoogleRelay = React.lazy(() => import('./pages/GoogleRelay'));
const WALinksGenerator = React.lazy(() => import('./pages/WALinksGenerator'));
const MetaAdsDashboard = React.lazy(() => import('./pages/MetaAdsManager/MetaAdsDashboard'));
const MetaAdsWizard = React.lazy(() => import('./pages/MetaAdsManager/MetaAdsWizard'));
const MetaAdCampaignDetails = React.lazy(() => import('./pages/MetaAdsManager/MetaAdCampaignDetails'));
const GrowthHub = React.lazy(() => import('./pages/GrowthHub/GrowthHub'));
const WaStoreList = React.lazy(() => import('./pages/WaStoreManager/WaStoreList'));
const WaStoreLayout = React.lazy(() => import('./pages/WaStoreManager/WaStoreLayout'));
const WaProductList = React.lazy(() => import('./pages/WaStoreManager/WaProductList'));
const WaStoreThemes = React.lazy(() => import('./pages/WaStoreManager/WaStoreThemes'));
const WaStoreSettings = React.lazy(() => import('./pages/WaStoreManager/WaStoreSettings'));
const WaStoreInventory = React.lazy(() => import('./pages/WaStoreManager/WaStoreInventory'));
const WaStoreBasicDetails = React.lazy(() => import('./pages/WaStoreManager/WaStoreBasicDetails'));
const WaStoreOrders = React.lazy(() => import('./pages/WaStoreManager/WaStoreOrders'));
const WaStorePOS = React.lazy(() => import('./pages/WaStoreManager/WaStorePOS'));
const WaStoreCategories = React.lazy(() => import('./pages/WaStoreManager/WaStoreCategories'));
const WaStoreCoupons = React.lazy(() => import('./pages/WaStoreManager/WaStoreCoupons'));
const WaStoreSEO = React.lazy(() => import('./pages/WaStoreManager/WaStoreSEO'));
const WaStoreNavigation = React.lazy(() => import('./pages/WaStoreManager/WaStoreNavigation'));
const WaStorePolicies = React.lazy(() => import('./pages/WaStoreManager/WaStorePolicies'));
const WaStoreAnalytics = React.lazy(() => import('./pages/WaStoreManager/WaStoreAnalytics'));
const WaStoreNotifications = React.lazy(() => import('./pages/WaStoreManager/WaStoreNotifications'));
const PublicWaStore = React.lazy(() => import('./pages/PublicWaStore'));
const PublicWaStoreCategory = React.lazy(() => import('./pages/PublicWaStoreCategory'));
const PublicWaProduct = React.lazy(() => import('./pages/PublicWaProduct'));
const PublicWaStoreVerify = React.lazy(() => import('./pages/PublicWaStoreVerify'));
const VcardLayout = React.lazy(() => import('./pages/VcardManager/VcardLayout'));
const VcardDashboard = React.lazy(() => import('./pages/VcardManager/VcardDashboard'));
const VcardList = React.lazy(() => import('./pages/VcardManager/VcardList'));
const VcardEnquiries = React.lazy(() => import('./pages/VcardManager/VcardEnquiries'));
const VcardBookings = React.lazy(() => import('./pages/VcardManager/VcardBookings'));
const VcardSettings = React.lazy(() => import('./pages/VcardManager/VcardSettings'));
const VcardBuilder = React.lazy(() => import('./pages/VcardManager/VcardBuilder'));
const PublicVcard = React.lazy(() => import('./pages/PublicVcard'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const RefundPolicy = React.lazy(() => import('./pages/RefundPolicy'));
const AboutUs = React.lazy(() => import('./pages/AboutUs'));
const ContactUs = React.lazy(() => import('./pages/ContactUs'));
const PartnerWithUs = React.lazy(() => import('./pages/PartnerWithUs'));
const MediaGallery = React.lazy(() => import('./pages/MediaGallery'));
const NotFound404 = React.lazy(() => import('./pages/NotFound404'));

// Simple Loading Component
const Loading = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
);

// ── Global Referral Code Capture ──────────────────────────────────────────────
// Persists ?ref= from ANY page into localStorage for 30 days.
// So even if a user clicks a referral link that goes to the homepage or blog,
// the code is captured and used automatically when they later register.
const REF_KEY = 'referral_code';
const REF_EXPIRY_KEY = 'referral_code_expiry';
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const PARTNER_KEY = 'partner_code';
const PARTNER_EXPIRY_KEY = 'partner_code_expiry';
const PARTNER_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

function ReferralCapture() {
    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);

        // Capture ?ref= for user-to-user referral
        const ref = params.get('ref');
        if (ref) {
            localStorage.setItem(REF_KEY, ref);
            localStorage.setItem(REF_EXPIRY_KEY, (Date.now() + REF_TTL_MS).toString());
        }

        // Capture ?partner= for B2B Tech Partner attribution
        const partner = params.get('partner');
        if (partner) {
            localStorage.setItem(PARTNER_KEY, partner.toUpperCase());
            localStorage.setItem(PARTNER_EXPIRY_KEY, (Date.now() + PARTNER_TTL_MS).toString());
        }
    }, [location.search]);
    return null;
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Setup Redirect ────────────────────────────────────────────────────────────
// Checks if the app has been configured. If not, redirects to /setup.
// Skipped on public-facing routes that don't require setup to function.
function SetupRedirect() {
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        // Skip on /setup (already there) and public-facing routes that need no check
        const publicPrefixes = ['/store/', '/v/', '/n/', '/form/', '/verify', '/blog'];
        if (location.pathname === '/setup') return;
        if (publicPrefixes.some(prefix => location.pathname.startsWith(prefix))) return;
        axios.get(`${import.meta.env.VITE_API_URL}/api/setup/status`)
            .then(r => {
                if (!r.data.setupComplete) {
                    navigate('/setup', { replace: true });
                }
            })
            .catch(() => {
                // If backend is unreachable, let app load normally
            });
    }, []); // eslint-disable-line
    return null;
}
// ─────────────────────────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null, isChunkLoadError: false };
    }

    static getDerivedStateFromError(error) {
        const isChunkLoadError = error?.name === 'ChunkLoadError' || 
            (error?.message && (
                error.message.includes('Failed to fetch dynamically imported module') ||
                error.message.includes('Importing a module script failed')
            ));
        return { hasError: true, error, isChunkLoadError };
    }

    componentDidCatch(error, errorInfo) {
        if (this.state.isChunkLoadError) {
            const lastReload = parseInt(sessionStorage.getItem('last_chunk_error_reload') || '0', 10);
            const now = Date.now();
            if (now - lastReload > 10000) {
                sessionStorage.setItem('last_chunk_error_reload', now.toString());
                window.location.reload(true);
                return;
            }
        }
        
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            if (this.state.isChunkLoadError) {
                return (
                    <div className="flex items-center justify-center min-h-screen">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Updating application to the latest version...</p>
                        </div>
                    </div>
                );
            }
            return (
                <div className="p-8 bg-red-50 text-red-900 h-screen overflow-auto">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
                    <details className="whitespace-pre-wrap">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

function CustomDomainRouter({ children }) {
    const [storeSlug, setStoreSlug] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hostname = window.location.hostname;
        // Ignore local development domains and the main SaaS platform domain
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'whatsapp-cloud.com' || hostname === 'bluetick.cloud' || hostname === 'www.bluetick.cloud' || hostname.includes('ngrok.io')) {
            setLoading(false);
            return;
        }

        // It's a custom domain, check backend to see if it maps to any store
        axios.get(`${import.meta.env.VITE_API_URL}/api/wastore/public/domain/${hostname}`)
            .then(res => {
                setStoreSlug(res.data.store.slug);
            })
            .catch(() => {
                console.warn('Custom domain not recognized by platform');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) return <Loading />;

    if (storeSlug) {
        // Render custom domain store routing
        return (
            <Routes>
                <Route path="/verify" element={<PublicWaStoreVerify />} />
                <Route path="/product/:productId" element={<PublicWaProduct customSlug={storeSlug} />} />
                <Route path="/category/:categoryName" element={<PublicWaStoreCategory customSlug={storeSlug} />} />
                <Route path="*" element={<PublicWaStore customSlug={storeSlug} />} />
            </Routes>
        );
    }

    return children;
}

function App() {
    return (
        <ThemeProvider>
            <ErrorBoundary>
                <AuthProvider>
                    <UIProvider>
                        <NotificationProvider>
                            <Router>
                                <ReferralCapture />
                                <Toaster position="top-right" />
                                <PaymentRedirectHandler />
                                <Suspense fallback={<Loading />}>
                                    <SetupRedirect />
                                    <CustomDomainRouter>
                                        <Routes>
                                        <Route path="/setup" element={<Setup />} />
                                        <Route path="/" element={<LandingPage />} />
                                        <Route path="/blog" element={<BlogList />} />
                                        <Route path="/blog/:slug" element={<BlogPost />} />
                                        <Route path="/f/:id" element={<PublicForm />} /> {/* NEW: Public form viewer */}
                                        <Route path="/vcard/:slug" element={<PublicVcard />} /> {/* NEW: Public Digital Business Card */}
                                        <Route path="/nfc/setup/:shortCode" element={<NfcSetup />} /> {/* NEW: NFC Setup */}
                                        <Route path="/store/:slug" element={<PublicWaStore />} /> {/* NEW: Public WhatsApp Store */}
                                        <Route path="/store/:slug/verify" element={<PublicWaStoreVerify />} />
                                        <Route path="/store/:slug/product/:productId" element={<PublicWaProduct />} /> {/* NEW: Single Product */}
                                        <Route path="/store/:slug/category/:categoryName" element={<PublicWaStoreCategory />} /> {/* NEW: Category Page */}
                                        <Route element={<GuestRoute />}>
                                            <Route path="/login" element={<Login />} />
                                            <Route path="/forgot-password" element={<ForgotPassword />} />
                                            <Route path="/register" element={<Register />} />
                                        </Route>
                                        <Route path="/privacy" element={<PrivacyPolicy />} />
                                        <Route path="/terms" element={<TermsOfService />} />
                                        <Route path="/refund-policy" element={<RefundPolicy />} />
                                        <Route path="/about" element={<AboutUs />} />
                                        <Route path="/contact" element={<ContactUs />} />
                                        <Route path="/partner" element={<PartnerWithUs />} />

                                        {/* Google OAuth Relay — must be public, no auth */}
                                        <Route path="/google-relay" element={<GoogleRelay />} />

                                        <Route element={<ProtectedRoute />}>
                                            <Route element={<Layout />}>
                                                <Route path="/locked-feature" element={<UpgradeFunnel />} />
                                                <Route path="/dashboard" element={<Dashboard />} /> {/* Changed default dashboard path */}
                                                <Route path="/contacts" element={<Contacts />} />
                                                <Route path="/templates" element={<Templates />} />
                                                <Route path="/campaigns" element={<Campaigns />} />
                                                <Route path="/campaign-list" element={<CampaignList />} />
                                                <Route path="/campaign-details/:id" element={<CampaignDetails />} />
                                                <Route path="/growth-hub" element={<GrowthHub />} />
                                                <Route path="/ctwa-analytics" element={<CTWAAnalytics />} />
                                                <Route path="/meta-ads" element={<MetaAdsDashboard />} />
                                                <Route path="/meta-ads/wizard" element={<MetaAdsWizard />} />
                                                <Route path="/meta-ads/campaigns/:id" element={<MetaAdCampaignDetails />} />
                                                <Route path="/vcards" element={<VcardLayout />}>
                                                    <Route index element={<VcardDashboard />} />
                                                    <Route path="list" element={<VcardList />} />
                                                    <Route path="enquiries" element={<VcardEnquiries />} />
                                                    <Route path="bookings" element={<VcardBookings />} />
                                                    <Route path="settings" element={<VcardSettings />} />
                                                </Route>
                                                <Route path="/vcards/builder" element={<VcardBuilder />} />
                                                <Route path="/vcards/builder/:id" element={<VcardBuilder />} />
                                                <Route path="/online-store" element={<WaStoreList />} />
                                                <Route path="/online-store/:slug" element={<WaStoreLayout />}>
                                                    <Route index element={<Navigate to="analytics" replace />} />
                                                    <Route path="analytics" element={<WaStoreAnalytics />} />
                                                    <Route path="details" element={<WaStoreBasicDetails />} />
                                                    <Route path="products" element={<WaProductList />} />
                                                    <Route path="inventory" element={<WaStoreInventory />} />
                                                    <Route path="categories" element={<WaStoreCategories />} />
                                                    <Route path="orders" element={<WaStoreOrders />} />
                                                    <Route path="pos" element={<WaStorePOS />} />
                                                    <Route path="notifications" element={<WaStoreNotifications />} />
                                                    <Route path="coupons" element={<WaStoreCoupons />} />
                                                    <Route path="seo" element={<WaStoreSEO />} />
                                                    <Route path="themes" element={<WaStoreThemes />} />
                                                    <Route path="navigation" element={<WaStoreNavigation />} />
                                                    <Route path="policies" element={<WaStorePolicies />} />
                                                    <Route path="media" element={<MediaGallery accessMode="restricted" />} />
                                                    <Route path="settings" element={<WaStoreSettings />} />
                                                </Route>
                                                <Route path="/wa-links" element={<WALinksGenerator />} />
                                                <Route path="/reports" element={<Reports />} />
                                                <Route path="/settings" element={<Settings />} />
                                                <Route path="/whatsapp" element={<WhatsAppInbox />} />
                                                <Route path="/whatsapp-settings" element={<WhatsAppSettings />} />
                                                <Route path="/marketplace" element={<Marketplace />} />
                                                <Route path="/integrations" element={<Integrations />} />
                                                <Route path="/marketplace/:id" element={<AddonDetail />} />
                                                <Route path="/store" element={<StorePage />} />
                                                <Route path="/addons/ai_bot" element={<AiBotSettings />} />
                                                <Route path="/addons/forms" element={<WhatsAppFormsBuilder />} />
                                                <Route path="/flowbot" element={<FlowList />} />
                                                <Route path="/flowbot/create" element={<FlowBotBuilder />} />
                                                <Route path="/flowbot/edit/:id" element={<FlowBotBuilder />} />
                                                <Route path="/team" element={<Team />} />
                                                <Route path="/team/:id/analytics" element={<TeamMemberAnalytics />} />
                                                <Route path="/superadmin" element={<SuperAdminDashboard />} />
                                                <Route path="/superadmin/users" element={<AdminUsers />} />
                                                <Route path="/superadmin/plans" element={<AdminPlans />} />
                                                <Route path="/superadmin/purchases" element={<AdminPurchases />} />
                                                <Route path="/superadmin/notifications" element={<AdminNotifications />} />
                                                <Route path="/superadmin/alerts" element={<AdminAlerts />} />
                                                <Route path="/superadmin/activity-logs" element={<AdminActivityLogs />} />
                                                <Route path="/superadmin/ai-tokens" element={<AdminAITokenUsers />} />
                                                <Route path="/superadmin/tech-partners" element={<AdminTechPartners />} />
                                                <Route path="/superadmin/nfc" element={<AdminNfcManager />} />
                                                <Route path="/superadmin/addons" element={<AdminAddons />} />
                                                <Route path="/superadmin/addons/:id/config" element={<AdminAddonConfig />} />
                                                <Route path="/superadmin/support" element={<AdminSupport />} />
                                                <Route path="/superadmin/landing-page" element={<AdminLandingPage />} />
                                                <Route path="/superadmin/messages" element={<AdminMessages />} />

                                                <Route path="/superadmin/system-control" element={<AdminSystemControls />} />
                                                <Route path="/superadmin/referral-settings" element={<AdminReferralSettings />} />
                                                <Route path="/support" element={<Support />} />
                                                <Route path="/referrals" element={<Referrals />} />
                                                <Route path="/tech-partner" element={<TechPartner />} />
                                                
                                                <Route path="/notifications" element={<UserNotifications />} />
                                                <Route path="/checkout" element={<Checkout />} />
                                                <Route path="/billing" element={<Billing />} />
                                                 <Route path="/ai-token-history" element={<AiTokenHistory />} />
                                                 <Route path="/media-gallery" element={<MediaGallery />} />
                                             </Route>
                                        </Route>
                                        <Route path="*" element={<NotFound404 />} />
                                    </Routes>
                                    </CustomDomainRouter>
                                </Suspense>
                            </Router>
                        </NotificationProvider>
                    </UIProvider>
                </AuthProvider>
            </ErrorBoundary>
        </ThemeProvider>
    );
}

export default App;

