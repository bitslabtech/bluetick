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
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            try {
                const userStr = localStorage.getItem('user');
                if (userStr && userStr !== "undefined") {
                    const savedUser = JSON.parse(userStr);
                    if (savedUser) setUser(savedUser);
                }
            } catch (e) {
                console.error("Auth Init Error", e);
                localStorage.removeItem('user');
            }

            // Check for impersonation state
            const adminToken = localStorage.getItem('adminToken');
            if (adminToken) {
                setIsImpersonating(true);
                axios.defaults.headers.common['x-admin-token'] = adminToken;
            }

            // Sync fresh data from server
            fetchUser();
        }
        setLoading(false);
    }, []);

    const login = async (email, password, turnstileToken = '') => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { email, password, 'cf-turnstile-response': turnstileToken });
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.removeItem('adminToken');
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            delete axios.defaults.headers.common['x-admin-token'];

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
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            delete axios.defaults.headers.common['x-admin-token'];

            setUser(user);
            return { success: true, user };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('adminToken');
        delete axios.defaults.headers.common['Authorization'];
        delete axios.defaults.headers.common['x-admin-token'];
        setUser(null);
        setIsImpersonating(false);
    };

    const impersonate = async (token, targetUser) => {
        // 1. Save Admin Token ONLY if we are not already impersonating
        let adminTokenToUse = localStorage.getItem('adminToken');
        if (!adminTokenToUse) {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                localStorage.setItem('adminToken', currentToken);
                adminTokenToUse = currentToken;
            }
        }

        // 2. Swap tokens and user in localStorage + axios headers
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(targetUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        if (adminTokenToUse) {
            axios.defaults.headers.common['x-admin-token'] = adminTokenToUse;
        }

        // 3. Hard-navigate to dashboard — avoids all React render race conditions
        //    between React Router state and AuthContext state that cause
        //    admin guards to briefly fire with the swapped non-admin user.
        //    On reload, AuthContext initializes from localStorage (already correct).
        window.location.href = '/dashboard';
    };

    const exitImpersonation = async () => {
        // 1. Lock UI during exit transition
        setIsTransitioning(true);

        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            console.warn("No admin token found to restore.");
            setIsTransitioning(false);
            logout();
            return;
        }

        // 2. Restore Admin Token
        localStorage.setItem('token', adminToken);
        localStorage.removeItem('adminToken');
        axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
        delete axios.defaults.headers.common['x-admin-token'];

        // 3. Fetch Admin User Profile
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`);
            if (res && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                setUser(res.data);
                setIsImpersonating(false); // Clear impersonation AFTER user state is set to prevent flash
            } else {
                console.error("Failed to fetch admin profile, logging out for safety.");
                logout();
            }
        } catch (err) {
            console.error("Failed to restore admin profile:", err);
            logout();
        }

        // 4. Unlock UI
        setIsTransitioning(false);
    };

    const fetchUser = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`);
            if (res && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                setUser(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch user profile:", err);
            if (err.response && (err.response.status === 401 || err.response.status === 404)) {
                logout();
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, impersonate, exitImpersonation, isImpersonating, isTransitioning, fetchUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
