import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import WhatsAppInbox from './pages/WhatsAppInbox'; // NEW
import Login from './pages/Login';
import Register from './pages/Register';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminPlans from './pages/AdminPlans';
import AdminPurchases from './pages/AdminPurchases';
import AdminNotifications from './pages/AdminNotifications';
import AdminActivityLogs from './pages/AdminActivityLogs';
import AdminSupport from './pages/AdminSupport';
import AdminLandingPage from './pages/AdminLandingPage';

const AdminSystemControls = React.lazy(() => import('./pages/AdminSystemControls')); // NEW
import Support from './pages/Support';
import UserNotifications from './pages/UserNotifications'; // NEW

import AdminAlerts from './pages/AdminAlerts'; // NEW

import CampaignList from './pages/CampaignList';
import CampaignDetails from './pages/CampaignDetails';

import LandingPage from './pages/LandingPage'; // NEW
import Checkout from './pages/Checkout'; // NEW
import Billing from './pages/Billing'; // NEW



// Simple Loading Component
const Loading = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
);

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
                            <Suspense fallback={<Loading />}>
                                <Routes>
                                    <Route path="/" element={<LandingPage />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />

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
                                            <Route path="/superadmin" element={<SuperAdminDashboard />} />
                                            <Route path="/superadmin/users" element={<AdminUsers />} />
                                            <Route path="/superadmin/plans" element={<AdminPlans />} />
                                            <Route path="/superadmin/purchases" element={<AdminPurchases />} />
                                            <Route path="/superadmin/notifications" element={<AdminNotifications />} />
                                            <Route path="/superadmin/alerts" element={<AdminAlerts />} />
                                            <Route path="/superadmin/activity-logs" element={<AdminActivityLogs />} />
                                            <Route path="/superadmin/support" element={<AdminSupport />} />
                                            <Route path="/superadmin/landing-page" element={<AdminLandingPage />} />

                                            <Route path="/superadmin/system-control" element={<AdminSystemControls />} />
                                            <Route path="/support" element={<Support />} />

                                            <Route path="/notifications" element={<UserNotifications />} />
                                            <Route path="/checkout" element={<Checkout />} />
                                            <Route path="/billing" element={<Billing />} />
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
