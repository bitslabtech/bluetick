import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);
    // Prevents route guards from firing during mid-swap auth transitions (impersonation)
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Initialize Auth State from LocalStorage
    useEffect(() => {
        const isExitingImpersonation = sessionStorage.getItem('bt_exit_impersonation');

        if (isExitingImpersonation) {
            // We just came back from an impersonation exit reload.
            // Don't load the stale impersonated user from localStorage.
            // fetchUser() below will read the restored admin cookie and set the real admin.
            sessionStorage.removeItem('bt_exit_impersonation');
        } else {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr && userStr !== "undefined") {
                    const savedUser = JSON.parse(userStr);
                    if (savedUser) {
                        setUser(savedUser);
                        
                        // We can infer impersonation state if the cached user has the origRole flag set by admin.js
                        if (savedUser.origRole === 'Admin') {
                            setIsImpersonating(true);
                        }
                    }
                }
            } catch (e) {
                console.error("Auth Init Error", e);
                localStorage.removeItem('user');
            }
        }

        // Always attempt to fetch fresh data. The browser will auto-send the HttpOnly cookie.
        fetchUser().finally(() => {
            setLoading(false);
        });
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

    const register = async (name, email, password, selectedPlan = null, referralCode = null, partnerCode = null, phone = '', startTrial = false, turnstileToken = '') => {
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
                'cf-turnstile-response': turnstileToken
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
            
            // 3. Hard-navigate to dashboard
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
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/exit-impersonation`);
            
            if (res.data?.success) {
                // 2. Mark that we are mid-transition so the reload doesn't kick to /login
                //    sessionStorage survives same-tab navigations but not new tabs
                sessionStorage.setItem('bt_exit_impersonation', 'true');

                // 3. Don't clear localStorage.user here — the reload's fetchUser() will
                //    read the restored admin cookie and overwrite it with the real admin.
                //    Clearing it causes user=null → ProtectedRoute redirects to /login
                //    before fetchUser() can finish.

                // 4. Hard-navigate to superadmin users to clear any user-specific state
                window.location.href = '/superadmin/users';
            } else {
                throw new Error('Server did not confirm session restore');
            }
        } catch (err) {
            console.error("Failed to restore admin profile:", err);
            // Only logout as last resort if the server actually failed
            sessionStorage.removeItem('bt_exit_impersonation');
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
            console.error("Failed to fetch user profile:", err);
            if (err.response && (err.response.status === 401 || err.response.status === 404)) {
                localStorage.removeItem('user');
                setUser(null);
                setIsImpersonating(false);
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, impersonate, exitImpersonation, isImpersonating, isTransitioning, fetchUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
