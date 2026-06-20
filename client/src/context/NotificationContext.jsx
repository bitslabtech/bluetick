import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// ── Shared notification state context ─────────────────────────────────────
// Ensures ALL NotificationBell instances across pages share one source of truth
// for unread count, notifications list, and read IDs.

const NotificationContext = createContext(null);

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
};

const POLL_INTERVAL_MS = 30_000;

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevUnreadRef = useRef(null);
    const isAdminRef = useRef(user?.isAdmin);

    const isAdmin = user?.isAdmin;

    useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

    // Track read notification IDs in localStorage for standard users
    const getReadIds = useCallback(() => {
        try { return JSON.parse(localStorage.getItem(`notif_read_${user?.id}`) || '[]'); }
        catch { return []; }
    }, [user?.id]);

    const saveReadIds = useCallback((ids) => {
        localStorage.setItem(`notif_read_${user?.id}`, JSON.stringify(ids));
    }, [user?.id]);

    const fetchNotifications = useCallback(async () => {
        try {
            const admin = isAdminRef.current;
            const endpoint = admin
                ? `${import.meta.env.VITE_API_URL}/api/admin-notifications`
                : `${import.meta.env.VITE_API_URL}/api/notifications`;

            const res = await axios.get(endpoint);
            let newCount = 0;

            if (admin) {
                setNotifications(res.data.notifications || []);
                newCount = res.data.unreadCount || 0;
                setUnreadCount(newCount);
            } else {
                setNotifications(res.data);
                const readIds = getReadIds();
                newCount = res.data.filter(n => !readIds.includes(n.id)).length;
                setUnreadCount(newCount);
            }

            prevUnreadRef.current = newCount;
            return newCount;
        } catch (err) {
            if (err.response && err.response.status !== 401) {
                console.error('Error loading notifications:', err);
            }
            return 0;
        }
    }, [getReadIds]);

    // Polling — reset interval when isAdmin changes
    useEffect(() => {
        if (!user) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [user, isAdmin, fetchNotifications]);

    const markAllRead = useCallback(async () => {
        if (isAdmin) {
            try {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/admin-notifications/read-all`);
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
                prevUnreadRef.current = 0;
            } catch (err) {
                console.error(err);
            }
        } else {
            const allIds = notifications.map(n => n.id);
            saveReadIds(allIds);
            setUnreadCount(0);
            prevUnreadRef.current = 0;
        }
    }, [isAdmin, notifications, saveReadIds]);

    const markOneRead = useCallback((notifId) => {
        if (!isAdmin) {
            const currentIds = getReadIds();
            if (!currentIds.includes(notifId)) {
                saveReadIds([...currentIds, notifId]);
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        }
    }, [isAdmin, getReadIds, saveReadIds]);

    const value = {
        notifications,
        unreadCount,
        prevUnreadRef,
        fetchNotifications,
        markAllRead,
        markOneRead,
        getReadIds,
        isAdmin,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
