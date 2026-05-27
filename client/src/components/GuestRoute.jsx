import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * GuestRoute – the inverse of ProtectedRoute.
 * Renders child routes only for unauthenticated visitors.
 * If the user is already logged in, redirects them to /dashboard.
 */
const GuestRoute = () => {
    const { user, loading } = useAuth();

    // While auth state is resolving, show spinner (matches ProtectedRoute style)
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-background-dark">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Authenticated users get redirected to dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    // Not logged in – render the guest page (Login, Register, etc.)
    return <Outlet />;
};

export default GuestRoute;
