import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const StoreCustomerContext = createContext(null);

const STORAGE_KEY = (slug) => `store_token_${slug}`;

export function StoreCustomerProvider({ slug, children }) {
    const [customer, setCustomer] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY(slug)));
    const [loading, setLoading] = useState(!!localStorage.getItem(STORAGE_KEY(slug)));
    const [authConfig, setAuthConfig] = useState(null);

    // Set axios header whenever token changes
    const getAuthHeader = useCallback(() =>
        token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    // Fetch auth config (which methods are enabled, etc.)
    useEffect(() => {
        if (!slug) return;
        axios.get(`${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/config`)
            .then(res => setAuthConfig(res.data))
            .catch(() => setAuthConfig({ enabled: false }));
    }, [slug]);

    // Restore session on mount
    useEffect(() => {
        const savedToken = localStorage.getItem(STORAGE_KEY(slug));
        if (!savedToken) { setLoading(false); return; }
        axios.get(`${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
        })
            .then(res => { setCustomer(res.data); setToken(savedToken); })
            .catch(() => { localStorage.removeItem(STORAGE_KEY(slug)); setToken(null); })
            .finally(() => setLoading(false));
    }, [slug]);

    const saveSession = useCallback((token, customerData) => {
        localStorage.setItem(STORAGE_KEY(slug), token);
        setToken(token);
        setCustomer(customerData);
    }, [slug]);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY(slug));
        setToken(null);
        setCustomer(null);
    }, [slug]);

    const loginWithEmail = useCallback(async (email, password) => {
        const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/login`,
            { email, password }
        );
        saveSession(res.data.token, res.data.customer);
        return res.data;
    }, [slug, saveSession]);

    const register = useCallback(async (name, email, password, phone) => {
        const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/register`,
            { name, email, password, phone }
        );
        saveSession(res.data.token, res.data.customer);
        return res.data;
    }, [slug, saveSession]);

    const sendOtp = useCallback(async (phone) => {
        const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/send-otp`,
            { phone }
        );
        return res.data;
    }, [slug]);

    const verifyOtp = useCallback(async (phone, otp, name) => {
        const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/verify-otp`,
            { phone, otp, name }
        );
        saveSession(res.data.token, res.data.customer);
        return res.data;
    }, [slug, saveSession]);

    const updateProfile = useCallback(async (data) => {
        const res = await axios.put(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/me`,
            data,
            { headers: getAuthHeader() }
        );
        setCustomer(prev => ({ ...prev, ...res.data }));
        return res.data;
    }, [slug, getAuthHeader]);

    const fetchOrders = useCallback(async () => {
        const res = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/orders`,
            { headers: getAuthHeader() }
        );
        return res.data;
    }, [slug, getAuthHeader]);

    const fetchOrder = useCallback(async (id) => {
        const res = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/orders/${id}`,
            { headers: getAuthHeader() }
        );
        return res.data;
    }, [slug, getAuthHeader]);

    const addAddress = useCallback(async (address) => {
        const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/addresses`,
            address,
            { headers: getAuthHeader() }
        );
        setCustomer(prev => ({ ...prev, savedAddresses: res.data }));
        return res.data;
    }, [slug, getAuthHeader]);

    const updateAddress = useCallback(async (idx, address) => {
        const res = await axios.put(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/addresses/${idx}`,
            address,
            { headers: getAuthHeader() }
        );
        setCustomer(prev => ({ ...prev, savedAddresses: res.data }));
        return res.data;
    }, [slug, getAuthHeader]);

    const deleteAddress = useCallback(async (idx) => {
        const res = await axios.delete(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/addresses/${idx}`,
            { headers: getAuthHeader() }
        );
        setCustomer(prev => ({ ...prev, savedAddresses: res.data }));
        return res.data;
    }, [slug, getAuthHeader]);

    const changePassword = useCallback(async (currentPassword, newPassword) => {
        const res = await axios.put(
            `${import.meta.env.VITE_API_URL}/api/store-customer/${slug}/me/password`,
            { currentPassword, newPassword },
            { headers: getAuthHeader() }
        );
        return res.data;
    }, [slug, getAuthHeader]);

    return (
        <StoreCustomerContext.Provider value={{
            customer, token, loading, authConfig,
            isLoggedIn: !!customer,
            logout, loginWithEmail, register,
            sendOtp, verifyOtp,
            updateProfile, fetchOrders, fetchOrder,
            addAddress, updateAddress, deleteAddress,
            changePassword,
            getAuthHeader,
        }}>
            {children}
        </StoreCustomerContext.Provider>
    );
}

export const useStoreCustomer = () => {
    const ctx = useContext(StoreCustomerContext);
    if (!ctx) throw new Error('useStoreCustomer must be used inside StoreCustomerProvider');
    return ctx;
};

/**
 * Safe version — returns null when called outside StoreCustomerProvider.
 * Used by components (e.g. WaStoreCheckoutModal) that may render in both
 * authenticated and guest contexts.
 */
export const useStoreCustomerOptional = () => {
    return useContext(StoreCustomerContext);
};
