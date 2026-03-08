import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);

    // Initialize Auth State from LocalStorage
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            try {
                const userStr = localStorage.getItem('user');
                // Simple validation to ensure it's not "undefined" string
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
                // Ensure the admin header is set if we reload the page during impersonation
                axios.defaults.headers.common['x-admin-token'] = adminToken;
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            delete axios.defaults.headers.common['x-admin-token']; // Clear any residue

            setUser(user);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Login failed' };
        }
    };

    const register = async (name, email, password, selectedPlan = null) => {
        try {
            const res = await axios.post('http://localhost:5000/api/auth/register', {
                name,
                email,
                password,
                selectedPlan
            });
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            delete axios.defaults.headers.common['x-admin-token']; // Clear any residue

            setUser(user);
            return { success: true, user };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('adminToken'); // Clear admin token too
        delete axios.defaults.headers.common['Authorization'];
        delete axios.defaults.headers.common['x-admin-token'];
        setUser(null);
        setIsImpersonating(false);
    };

    const impersonate = (token, targetUser) => {
        // 1. Save Admin Token ONLY if we are not already impersonating
        // This prevents overwriting the admin token with a user token if called twice
        let adminTokenToUse = localStorage.getItem('adminToken');
        if (!adminTokenToUse) {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                localStorage.setItem('adminToken', currentToken);
                adminTokenToUse = currentToken;
            }
        }

        // 2. Set Target Token
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(targetUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // --- NEW: Set Header for Tracking ---
        if (adminTokenToUse) {
            axios.defaults.headers.common['x-admin-token'] = adminTokenToUse;
        }

        // 3. Update State
        setUser(targetUser);
        setIsImpersonating(true);
    };

    const exitImpersonation = async () => {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            console.warn("No admin token found to restore.");
            logout();
            return;
        }

        // 1. Restore Admin Token
        localStorage.setItem('token', adminToken);
        localStorage.removeItem('adminToken');
        axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

        // --- NEW: Clear Header ---
        delete axios.defaults.headers.common['x-admin-token'];

        // 2. Fetch Admin User Profile
        try {
            // We MUST fetch fresh admin data to ensure UI updates correctly
            const res = await axios.get('http://localhost:5000/api/auth/me');
            if (res && res.data) {
                localStorage.setItem('user', JSON.stringify(res.data));
                setUser(res.data);
                setIsImpersonating(false); // Only unset this AFTER success
            } else {
                console.error("Failed to fetch admin profile, logging out for safety.");
                logout();
            }
        } catch (err) {
            console.error("Failed to restore admin profile:", err);
            logout();
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, impersonate, exitImpersonation, isImpersonating }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
