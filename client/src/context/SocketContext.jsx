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
const showBrowserNotification = (title, body) => {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logo.png', silent: false });
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

                if (notificationsEnabledRef.current && !isViewingChat) {
                    playIncomingMessageSound();
                }

                if (!isViewingChat) {
                    const safeName =
                        !conversation.contactName ||
                        conversation.contactName === conversation.phoneNumber ||
                        /^\d+$/.test(conversation.contactName.replace(/\D/g, ''))
                            ? conversation.phoneNumber
                            : conversation.contactName;
                    showBrowserNotification(safeName, message.body || '📎 Media');
                }

                window.dispatchEvent(new Event('whatsapp_unread_update'));
            });

            newSocket.on('notification_update', () => {
                window.dispatchEvent(new Event('notification_refresh'));
            });

            const unlockAudio = () => {
                const ctx = getAudioCtx();
                if (ctx && ctx.state === 'suspended') ctx.resume();
            };
            window.addEventListener('click', unlockAudio, { once: true });

            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }

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
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
