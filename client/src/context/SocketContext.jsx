import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

// ── Shared, unlocked AudioContext ──────────────────────────────────────────────
// Keep ONE AudioContext alive for the session. Browsers block audio until a user
// gesture has been fired. After the first click anywhere on the page, the context
// is resumed and subsequent sounds play without issue across all page navigations.
let _audioCtx = null;
const getAudioCtx = () => {
    try {
        if (!_audioCtx || _audioCtx.state === 'closed') {
            _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return _audioCtx;
    } catch {
        return null;
    }
};

// ── Notification sound — ascending two-tone chime ──────────────────────────────
export const playIncomingMessageSound = async () => {
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') await ctx.resume();

        const playTone = (freq, startTime, duration, gainVal) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        playTone(880, now, 0.35, 0.18);
        playTone(1174.66, now + 0.18, 0.45, 0.14);
    } catch {
        // Audio is non-critical — silently ignore errors
    }
};

// ── Browser desktop notification ────────────────────────────────────────────────
const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;
// 'granted' | 'denied' | 'default' (never asked) | 'unsupported'
const readNotificationPermission = () => (notificationsSupported() ? Notification.permission : 'unsupported');

// Works with both the promise and the old callback form (older Safari).
const requestNotificationPermission = () => new Promise((resolve) => {
    try {
        const result = Notification.requestPermission(resolve);
        if (result && typeof result.then === 'function') {
            result.then(resolve, () => resolve(readNotificationPermission()));
        }
    } catch {
        resolve(readNotificationPermission());
    }
});

const showBrowserNotification = (title, body, conversationId) => {
    if (readNotificationPermission() !== 'granted') return;
    try {
        // silent: our chime is the one alert sound (no second sound from the OS).
        // tag: a newer message from the same chat replaces the older pop-up.
        const n = new Notification(title, {
            body,
            icon: '/logo.png',
            silent: true,
            ...(conversationId ? { tag: `chat-${conversationId}` } : {})
        });
        // Clicking the pop-up brings OneDash to the front and opens that chat (Layout listens)
        n.onclick = () => {
            window.focus();
            window.dispatchEvent(new CustomEvent('whatsapp_open_chat', { detail: { conversationId } }));
            n.close();
        };
    } catch {
        // e.g. Android Chrome only allows notifications from a service worker — never break message handling
    }
};

// ── Context ────────────────────────────────────────────────────────────────────
const SocketContext = createContext(null);

export const useSocket = () => {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used within SocketProvider');
    return ctx;
};

// ── Provider ───────────────────────────────────────────────────────────────────
export const SocketProvider = ({ children }) => {
    const { user } = useAuth();

    // socket is stored as state so consumers can use it as a reactive dependency.
    // When it changes (login/logout/reconnect), dependent effects in child
    // components automatically re-run.
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // activeChatId — set by WhatsAppInbox when a conversation is open.
    // Suppresses sound/browser-notification for the currently viewed conversation.
    const [activeChatId, setActiveChatId] = useState(null);
    const activeChatIdRef = useRef(null);
    useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

    // notificationsEnabled — mirrors the toggle in the WhatsAppInbox sidebar header.
    // Stored in localStorage so the preference survives page navigation.
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        const saved = localStorage.getItem('whatsapp_notifications_enabled');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const notificationsEnabledRef = useRef(notificationsEnabled);
    useEffect(() => {
        notificationsEnabledRef.current = notificationsEnabled;
        localStorage.setItem('whatsapp_notifications_enabled', JSON.stringify(notificationsEnabled));
    }, [notificationsEnabled]);

    // ── Live alert status (shown by the inbox bell) ───────────────────────────────
    // notificationPermission: what the browser allows for desktop pop-ups.
    // soundUnlocked: browsers block audio until the user clicks/taps/types on the page.
    const [notificationPermission, setNotificationPermission] = useState(readNotificationPermission);
    const [soundUnlocked, setSoundUnlocked] = useState(false);

    useEffect(() => {
        // Only for logged-in users — public pages (stores, vCards) never create audio
        if (!user?.id) return;

        const ctx = getAudioCtx();
        const syncSound = () => setSoundUnlocked(!!ctx && ctx.state === 'running');
        const unlock = () => {
            if (ctx && ctx.state === 'suspended') ctx.resume().then(syncSound).catch(() => {});
        };
        syncSound();
        ctx?.addEventListener?.('statechange', syncSound);
        // Any interaction unlocks sound (kept, not "once": some browsers suspend audio again)
        const gestures = ['pointerdown', 'keydown', 'touchstart'];
        gestures.forEach(ev => window.addEventListener(ev, unlock, { passive: true }));

        // Permission can change in the browser's site settings at any time
        const syncPermission = () => setNotificationPermission(readNotificationPermission());
        let permissionStatus = null;
        navigator.permissions?.query?.({ name: 'notifications' })
            .then(status => { permissionStatus = status; status.onchange = syncPermission; })
            .catch(() => {});
        window.addEventListener('focus', syncPermission);
        document.addEventListener('visibilitychange', syncPermission);

        return () => {
            ctx?.removeEventListener?.('statechange', syncSound);
            gestures.forEach(ev => window.removeEventListener(ev, unlock));
            if (permissionStatus) permissionStatus.onchange = null;
            window.removeEventListener('focus', syncPermission);
            document.removeEventListener('visibilitychange', syncPermission);
        };
    }, [user?.id]);

    // Called from the bell / "Turn on" click — browsers only allow the permission
    // pop-up and audio during a user's click, so this must run inside a click handler.
    const enableAlerts = async () => {
        // Ask first, while the click still counts as a user gesture
        const permissionPromise = readNotificationPermission() === 'default'
            ? requestNotificationPermission()
            : Promise.resolve(readNotificationPermission());

        const ctx = getAudioCtx();
        try { if (ctx && ctx.state === 'suspended') await ctx.resume(); } catch { /* ignore */ }
        const soundOk = !!ctx && ctx.state === 'running';
        setSoundUnlocked(soundOk);
        if (soundOk) playIncomingMessageSound(); // test chime: the user hears that sound works

        await permissionPromise;
        const permission = readNotificationPermission();
        setNotificationPermission(permission);
        return { permission, soundOk };
    };

    const testSound = async () => {
        const ctx = getAudioCtx();
        try { if (ctx && ctx.state === 'suspended') await ctx.resume(); } catch { /* ignore */ }
        const soundOk = !!ctx && ctx.state === 'running';
        setSoundUnlocked(soundOk);
        if (soundOk) playIncomingMessageSound();
        return soundOk;
    };

    // ── Socket lifecycle ────────────────────────────────────────────────────────
    useEffect(() => {
        // Only connect when a user is logged in
        if (!user?.id) {
            setSocket(null);
            setIsConnected(false);
            return;
        }

        let isMounted = true;
        let activeSocket = null;

        // Dynamically import socket.io-client only for authenticated users.
        // This completely eliminates socket.io-client from the critical bundle for
        // public visitors on mobile (Landing page, Blog, Storefront, etc.)
        import('socket.io-client').then(({ io }) => {
            if (!isMounted) return;

            const API_BASE = import.meta.env.VITE_API_URL || '';
            const newSocket = io(API_BASE, { withCredentials: true });
            activeSocket = newSocket;

            // ── Join rooms ────────────────────────────────────────────────────────
            const joinRooms = () => {
                newSocket.emit('join_waba', user.id);
                newSocket.emit('join_personal', user.id);
                newSocket.emit('user_connected', {
                    userId: user.id,
                    parentId: user.parentUserId || null,
                });
            };

            newSocket.on('connect', () => {
                if (isMounted) setIsConnected(true);
                joinRooms();
            });

            newSocket.on('disconnect', () => {
                if (isMounted) setIsConnected(false);
            });

            // ── Global incoming WhatsApp message handler ──────────────────────────
            newSocket.on('new_message', ({ conversation, message }) => {
                if (message.direction !== 'INBOUND') return;

                const isViewingChat =
                    activeChatIdRef.current === conversation.id && !document.hidden;

                // The bell controls BOTH the chime and the desktop pop-up ("off" means fully off)
                if (notificationsEnabledRef.current && !isViewingChat) {
                    playIncomingMessageSound();
                    const safeName =
                        !conversation.contactName ||
                        conversation.contactName === conversation.phoneNumber ||
                        /^\d+$/.test(conversation.contactName.replace(/\D/g, ''))
                            ? conversation.phoneNumber
                            : conversation.contactName;
                    showBrowserNotification(safeName, message.body || '📎 Media', conversation.id);
                }

                window.dispatchEvent(new Event('whatsapp_unread_update'));
            });

            newSocket.on('notification_update', () => {
                window.dispatchEvent(new Event('notification_refresh'));
            });

            // Sound unlocking and the permission request now happen on user clicks
            // (see the alert-status effect and enableAlerts above). Asking on page load
            // is blocked or hidden by browsers, so it is no longer done here.

            if (isMounted) {
                setSocket(newSocket);
            }
        }).catch(err => {
            console.error('Failed to load socket client:', err);
        });

        return () => {
            isMounted = false;
            if (activeSocket) {
                activeSocket.disconnect();
            }
            setSocket(null);
            setIsConnected(false);
        };
    }, [user?.id]);

    const value = {
        socket,
        isConnected,
        activeChatId,
        setActiveChatId,
        notificationsEnabled,
        setNotificationsEnabled,
        playIncomingMessageSound,
        notificationPermission,
        soundUnlocked,
        enableAlerts,
        testSound,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
