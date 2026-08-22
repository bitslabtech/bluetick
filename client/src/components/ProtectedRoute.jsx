import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ProtectedRoute = () => {
    const { user, loading, isTransitioning } = useAuth();
    const location = useLocation();

    // Show spinner during initial load OR during mid-swap transitions (impersonation)
    if (loading || isTransitioning) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-background-dark">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Option A: Non-admins are locked if they have expired plans or pending checkouts
    if (user && !user.isAdmin) {
        let pendingPlan = localStorage.getItem('pendingPlan');

        // Check if user has a currently-valid plan (Active OR Trial with a future expiry).
        // This is used to clear any stale pendingPlan that may have been written to
        // localStorage during the brief window when the cached user had old/expired data
        // (e.g., right after a superadmin grants a trial — the server DB is updated but
        // the browser still holds the old planStatus/planExpiry until /auth/me refreshes).
        const hasValidActivePlan = user.plan !== 'Free'
            && user.planExpiry
            && new Date(user.planExpiry) >= new Date()
            && (user.planStatus === 'Active' || user.planStatus === 'Trial');

        // Clear stale pendingPlan for any user whose plan is currently valid.
        // Without this, a stale pendingPlan written during the expired-state window
        // would keep trapping Trial users in /checkout even after fetchUser() refreshes.
        if (hasValidActivePlan && pendingPlan && location.pathname !== '/checkout' && location.pathname !== '/billing') {
            localStorage.removeItem('pendingPlan');
            pendingPlan = null;
        }

        // 1. If they have a pending checkout from registration, lock them to /checkout or /billing
        if (pendingPlan && location.pathname !== '/checkout' && location.pathname !== '/billing') {
            return <Navigate to="/checkout" replace />;
        }

        // 2. If user's plan is explicitly Expired, lock them to /checkout or /billing
        if (user.planStatus === 'Expired') {
            if (location.pathname !== '/checkout' && location.pathname !== '/billing') {
                if (!pendingPlan && user.planDetails) {
                    localStorage.setItem('pendingPlan', JSON.stringify(user.planDetails));
                }
                return <Navigate to="/checkout" replace />;
            }
        }

        // 3. If planExpiry date is in the past, lock them (covers Trial AND paid plans)
        //    True Free plans have planExpiry = null so they are naturally excluded.
        if (user.planExpiry) {
            const expiryDate = new Date(user.planExpiry);
            if (expiryDate < new Date() && location.pathname !== '/checkout' && location.pathname !== '/billing') {
                // Give them a pending plan based on their current plan so they can renew
                if (!pendingPlan) {
                    if (user.planDetails) {
                        localStorage.setItem('pendingPlan', JSON.stringify(user.planDetails));
                    } else {
                        // Failsafe: if the plan doesn't exist anymore
                        localStorage.setItem('pendingPlan', JSON.stringify({ name: 'Default', price: 0 }));
                    }
                }
                return <Navigate to="/checkout" replace />;
            }
        }

        // 4. If user is on a non-Free plan with no planExpiry at all and status is Pending, lock them
        if (user.planStatus === 'Pending' && location.pathname !== '/checkout' && location.pathname !== '/billing') {
            if (!pendingPlan) {
                if (user.planDetails) {
                    localStorage.setItem('pendingPlan', JSON.stringify(user.planDetails));
                } else {
                    // Failsafe: set a dummy plan to avoid loop if planDetails is missing
                    localStorage.setItem('pendingPlan', JSON.stringify({ name: 'Default', price: 0 }));
                }
            }
            return <Navigate to="/checkout" replace />;
        }
    }

    return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
