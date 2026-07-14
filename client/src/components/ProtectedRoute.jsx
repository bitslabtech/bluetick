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
        // If this is an impersonated admin session, NEVER lock to /checkout.
        // Clear any stale pendingPlan that could be left in Brave's isolated localStorage.
        if (user.origRole === 'Admin') {
            localStorage.removeItem('pendingPlan');
        } else {
            let pendingPlan = localStorage.getItem('pendingPlan');

            // Check if user has an active, valid plan or trial (not Free and not expired)
            const hasActiveValidPlan = user.plan !== 'Free' && user.planExpiry && new Date(user.planExpiry) >= new Date();


            // Clear out any stale pending checkouts silently, 
            // EXCEPT when the user is actively navigating to checkout to upgrade
            // OR when they are on the billing page (about to select a plan).
            if (hasActiveValidPlan && pendingPlan && location.pathname !== '/checkout' && location.pathname !== '/billing') {
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

            // 3. If planExpiry date is in the past on a non-Free paid plan, lock them
            if (user.planExpiry && user.plan !== 'Free') {
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
    }

    return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
