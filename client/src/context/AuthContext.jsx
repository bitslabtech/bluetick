import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // ── Synchronously initialize state from localStorage to prevent flicker ──
    const [user, setUser] = useState(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr && userStr !== "undefined") return JSON.parse(userStr);
        } catch (e) {
            console.error("Auth Init Error", e);
            localStorage.removeItem('user');
        }
        return null;
    });

    // loading = true only when we have a cached user that needs server-side verification.
    // Anonymous visitors (no localStorage user) start with loading: false immediately —
    // they cannot be authenticated so /auth/me would always return 401 (wasted round-trip).
    // This eliminates GET /auth/me from the critical path on public store pages.
    const [loading, setLoading] = useState(() => {
        try {
            const userStr = localStorage.getItem('user');
            return !!(userStr && userStr !== 'undefined');
        } catch { return false; }
    });

    const [isImpersonating, setIsImpersonating] = useState(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr && userStr !== "undefined") {
                const savedUser = JSON.parse(userStr);
                return savedUser?.origRole === 'Admin';
            }
        } catch (e) { }
        return false;
    });

    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        // Only verify session with the server if there's a cached user in localStorage.
        // Anonymous visitors skip this entirely — they have no cookie so /auth/me would
        // just return 401 after a full network round-trip for zero benefit.
        const hasLocalUser = (() => {
            try {
                const u = localStorage.getItem('user');
                return !!(u && u !== 'undefined');
            } catch { return false; }
        })();

        if (hasLocalUser) {
            // Verify cached session is still valid. Runs in background for public pages;
            // ProtectedRoute waits for loading=false before allowing access.
            fetchUser().finally(() => {
                setLoading(false);
            });
        }
        // No-op for anonymous visitors — loading is already false, /auth/me never fires.
    }, []);

    const login = async (email, password, turnstileToken = '') => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { email, password, 'cf-turnstile-response': turnstileToken });
            // Cookie is set automatically by the server response
            const { user } = res.data;

            localStorage.setItem('user', JSON.stringify(user));

            setUser(user);
            setIsImpersonating(false);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Login failed' };
        }
    };

    const register = async (name, email, password, selectedPlan = null, referralCode = null, partnerCode = null, phone = '', startTrial = false, turnstileToken = '', phoneVerifiedToken = null) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
                name,
                email,
                password,
                selectedPlan,
                startTrial,
                ref: referralCode,
                partnerCode: partnerCode || undefined,
                phone,
                'cf-turnstile-response': turnstileToken,
                phoneVerifiedToken: phoneVerifiedToken || undefined
            });
            // Cookie is set automatically by the server response
            const { user } = res.data;

            localStorage.setItem('user', JSON.stringify(user));

            setUser(user);
            return { success: true, user };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Registration failed' };
        }
    };

    const logout = async () => {
        try {
            // Tell server to clear cookies
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`);
        } catch (e) {
            console.error("Logout request failed", e);
        }
        localStorage.removeItem('user');
        setUser(null);
        setIsImpersonating(false);
    };

    const impersonate = async (targetUserId) => {
        try {
            // 1. Call server API to set both cookies
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users/${targetUserId}/impersonate`);
            const { user: targetUser } = res.data;

            // 2. Update local state
            localStorage.setItem('user', JSON.stringify(targetUser));

            // 3. Clear any stale pendingPlan so browsers with isolated storage (e.g. Brave)
            //    don't lock the impersonated session to /checkout
            localStorage.removeItem('pendingPlan');
            
            // 4. Hard-navigate to dashboard
            window.location.href = '/dashboard';
        } catch (err) {
            console.error("Impersonation failed:", err);
            throw err;
        }
    };

    const exitImpersonation = async () => {
        setIsTransitioning(true);

        try {
            // 1. Call server API to restore admin cookie as primary bt_token
            //    The server also returns the admin user data so we can set it directly.
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/exit-impersonation`);
            
            if (res.data?.success && res.data?.adminUser) {
                // 2. Immediately set admin user in state and localStorage BEFORE navigating.
                //    This prevents any race condition where ProtectedRoute sees user=null.
                const adminUser = res.data.adminUser;
                localStorage.setItem('user', JSON.stringify(adminUser));
                setUser(adminUser);
                setIsImpersonating(false);

                // 3. Hard-navigate to superadmin users page to clear all impersonated-user state
                //    (socket connections, cached API data, etc.)
                window.location.href = '/superadmin/users';
            } else {
                throw new Error('Server did not confirm session restore');
            }
        } catch (err) {
            console.error("Failed to restore admin profile:", err);
            // Only logout as last resort if the server actually failed
            localStorage.removeItem('user');
            await logout();
        } finally {
            setIsTransitioning(false);
        }
    };

    const fetchUser = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`);
            if (res && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                setUser(res.data);
                if (res.data.origRole === 'Admin') {
                    setIsImpersonating(true);
                } else {
                    setIsImpersonating(false);
                }
            }
        } catch (err) {
            if (err.response && (err.response.status === 401 || err.response.status === 404)) {
                localStorage.removeItem('user');
                setUser(null);
                setIsImpersonating(false);
            } else {
                console.error("Failed to fetch user profile:", err);
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, impersonate, exitImpersonation, isImpersonating, isTransitioning, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};
