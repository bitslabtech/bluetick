import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { UIProvider } from './context/UIContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Templates from './pages/Templates';
import Campaigns from './pages/Campaigns';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Marketplace from './pages/Marketplace'; // NEW
import AddonDetail from './pages/AddonDetail'; // NEW
import Integrations from './pages/Integrations'; // NEW Developer Ecosystem
import WhatsAppInbox from './pages/WhatsAppInbox'; // NEW
import WhatsAppSettings from './pages/WhatsAppSettings'; // NEW
import PublicForm from './pages/PublicForm'; // NEW
import Login from './pages/Login';
import Register from './pages/Register';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminPlans from './pages/AdminPlans';
import AdminPurchases from './pages/AdminPurchases';
import AdminNotifications from './pages/AdminNotifications';
import AdminActivityLogs from './pages/AdminActivityLogs';
import AdminAITokenUsers from './pages/AdminAITokenUsers'; // NEW
import AdminTechPartners from './pages/AdminTechPartners'; // NEW Tech Partner Program
import Team from './pages/Team'; // NEW
import TeamMemberAnalytics from './pages/TeamMemberAnalytics'; // NEW
import AdminSupport from './pages/AdminSupport';
import AdminLandingPage from './pages/AdminLandingPage';
import AdminMessages from './pages/AdminMessages';
import AdminAddons from './pages/AdminAddons'; // NEW
import AdminAddonConfig from './pages/AdminAddonConfig';
import AiBotSettings from './pages/AiBotSettings'; // NEW
import WhatsAppFormsBuilder from './pages/addons/WhatsAppFormsBuilder'; // NEW
import StorePage from './pages/Store'; // NEW
import FlowBotBuilder from './pages/FlowBot'; // NEW

const AdminSystemControls = React.lazy(() => import('./pages/AdminSystemControls')); // NEW
const AdminReferralSettings = React.lazy(() => import('./pages/AdminReferralSettings')); // NEW
import Support from './pages/Support';
import UserNotifications from './pages/UserNotifications'; // NEW

import AdminAlerts from './pages/AdminAlerts'; // NEW

import CampaignList from './pages/CampaignList';
import CampaignDetails from './pages/CampaignDetails';

import LandingPage from './pages/LandingPage'; // NEW
import BlogList from './pages/BlogList'; // NEW
import BlogPost from './pages/BlogPost'; // NEW
import Checkout from './pages/Checkout'; // NEW
import Billing from './pages/Billing'; // NEW
import AiTokenHistory from './pages/AiTokenHistory'; // NEW
import Referrals from './pages/Referrals'; // NEW
import TechPartner from './pages/TechPartner'; // NEW Tech Partner Program

import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import PartnerWithUs from './pages/PartnerWithUs';

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


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
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

function App() {
    return (
        <ThemeProvider>
            <ErrorBoundary>
                <AuthProvider>
                    <UIProvider>
                        <Router>
                            <ReferralCapture />
                            <Toaster position="top-right" />
                            <Suspense fallback={<Loading />}>
                                <Routes>
                                    <Route path="/" element={<LandingPage />} />
                                    <Route path="/blog" element={<BlogList />} />
                                    <Route path="/blog/:slug" element={<BlogPost />} />
                                    <Route path="/f/:id" element={<PublicForm />} /> {/* NEW: Public form viewer */}
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/privacy" element={<PrivacyPolicy />} />
                                    <Route path="/terms" element={<TermsOfService />} />
                                    <Route path="/about" element={<AboutUs />} />
                                    <Route path="/contact" element={<ContactUs />} />
                                    <Route path="/partner" element={<PartnerWithUs />} />

                                    <Route element={<ProtectedRoute />}>
                                        <Route element={<Layout />}>
                                            <Route path="/dashboard" element={<Dashboard />} /> {/* Changed default dashboard path */}
                                            <Route path="/contacts" element={<Contacts />} />
                                            <Route path="/templates" element={<Templates />} />
                                            <Route path="/campaigns" element={<Campaigns />} />
                                            <Route path="/campaign-list" element={<CampaignList />} />
                                            <Route path="/campaign-details/:id" element={<CampaignDetails />} />
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
                                            <Route path="/flowbot" element={<FlowBotBuilder />} />
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
                                        </Route>
                                    </Route>
                                </Routes>
                            </Suspense>
                        </Router>
                    </UIProvider>
                </AuthProvider>
            </ErrorBoundary>
        </ThemeProvider>
    );
}

export default App;

