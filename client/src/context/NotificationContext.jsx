import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
    return ctx;
};

const POLL_INTERVAL_MS = 30_000;
const ACTIVITY_TYPES = ["USER_REGISTER", "PLAN_CHANGE", "SUPPORT_TICKET"];

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const [errorNotifs, setErrorNotifs] = useState([]);
    const [unreadErrorCount, setUnreadErrorCount] = useState(0);

    const prevUnreadRef = useRef(null);
    const prevErrorUnreadRef = useRef(null);
    const isAdminRef = useRef(user?.isAdmin);
    const isAdmin = user?.isAdmin;

    useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

    const getReadIds = useCallback(() => {
        try { return JSON.parse(localStorage.getItem("notif_read_" + user?.id) || "[]"); }
        catch { return []; }
    }, [user?.id]);

    const saveReadIds = useCallback((ids) => {
        localStorage.setItem("notif_read_" + user?.id, JSON.stringify(ids));
    }, [user?.id]);

    const fetchNotifications = useCallback(async () => {
        try {
            const admin = isAdminRef.current;
            const endpoint = admin
                ? import.meta.env.VITE_API_URL + "/api/admin-notifications"
                : import.meta.env.VITE_API_URL + "/api/notifications";

            const res = await axios.get(endpoint);
            let newCount = 0;
            let newErrorCount = 0;

            if (admin) {
                const all = res.data.notifications || [];
                const activity = all.filter(n => ACTIVITY_TYPES.includes(n.type));
                const errors   = all.filter(n => n.type === "SYSTEM_ERROR");
                setNotifications(activity);
                setErrorNotifs(errors);
                newCount      = activity.filter(n => !n.isRead).length;
                newErrorCount = errors.filter(n => !n.isRead).length;
                setUnreadCount(newCount);
                setUnreadErrorCount(newErrorCount);
            } else {
                setNotifications(res.data);
                const readIds = getReadIds();
                newCount = res.data.filter(n => !readIds.includes(n.id)).length;
                setUnreadCount(newCount);
            }

            prevUnreadRef.current      = newCount;
            prevErrorUnreadRef.current = newErrorCount;
            return { newCount, newErrorCount };
        } catch (err) {
            if (err.response && err.response.status !== 401) {
                console.error("Error loading notifications:", err);
            }
            return { newCount: 0, newErrorCount: 0 };
        }
    }, [getReadIds]);

    useEffect(() => {
        if (!user) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [user, isAdmin, fetchNotifications]);

    useEffect(() => {
        if (!user) return;
        const handler = () => fetchNotifications();
        window.addEventListener("notification_refresh", handler);
        return () => window.removeEventListener("notification_refresh", handler);
    }, [user, fetchNotifications]);

    const markAllRead = useCallback(async () => {
        if (isAdmin) {
            try {
                await axios.put(import.meta.env.VITE_API_URL + "/api/admin-notifications/read-all");
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
                prevUnreadRef.current = 0;
            } catch (err) { console.error(err); }
        } else {
            const allIds = notifications.map(n => n.id);
            saveReadIds(allIds);
            setUnreadCount(0);
            prevUnreadRef.current = 0;
        }
    }, [isAdmin, notifications, saveReadIds]);

    const resolveError = useCallback(async (id) => {
        try {
            await axios.put(import.meta.env.VITE_API_URL + "/api/admin-notifications/" + id + "/read");
            setErrorNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadErrorCount(prev => Math.max(0, prev - 1));
        } catch (err) { console.error("Failed to resolve error:", err); }
    }, []);

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
        notifications, unreadCount, prevUnreadRef, markAllRead, markOneRead, getReadIds,
        errorNotifs, unreadErrorCount, prevErrorUnreadRef, resolveError,
        fetchNotifications, isAdmin,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
