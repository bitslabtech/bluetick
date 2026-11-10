const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// Track online users: { socketId: userId }
const onlineUsers = new Map();

// Track user's team room (usually their parentUserId or their own id)
const userRooms = new Map();

// ── Socket.IO CORS origin resolver ───────────────────────────────────────────
// Mirrors the same multi-origin allowlist used by Express cors() in index.js.
// Socket.IO manages its own CORS layer independently of Express middleware,
// so we must replicate the logic here to support multiple platform domains
// (e.g. bluetick.cloud AND onedash.cloud) and custom merchant domains.
function _isSocketOriginAllowed(origin) {
    if (!origin) return true; // server-to-server / no-origin — always allow

    try {
        const { hostname } = new URL(origin);
        const h = hostname.toLowerCase();

        // Always allow localhost / 127.0.0.1
        if (h === 'localhost' || h === '127.0.0.1') return true;

        // Allow primary FRONTEND_URL (exact match)
        const primary = (process.env.FRONTEND_URL || '').toLowerCase();
        if (primary && origin.toLowerCase() === primary) return true;

        // Allow root domain + all subdomains of PLATFORM_DOMAIN
        const platformDomain = (process.env.PLATFORM_DOMAIN || '').toLowerCase();
        if (platformDomain && (h === platformDomain || h.endsWith(`.${platformDomain}`))) return true;

        // EXTRA_CORS_ORIGINS: comma-separated list of additional exact-match origins
        const extraOrigins = (process.env.EXTRA_CORS_ORIGINS || '')
            .split(',').map(o => o.trim().toLowerCase()).filter(Boolean);
        if (extraOrigins.some(o => o === origin.toLowerCase())) return true;

        // EXTRA_PLATFORM_DOMAINS: comma-separated additional platform domains (+ all subdomains)
        const extraDomains = (process.env.EXTRA_PLATFORM_DOMAINS || '')
            .split(',').map(d => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean);
        if (extraDomains.some(d => h === d || h.endsWith(`.${d}`))) return true;

        // Built-in dual-domain support (both bluetick.cloud and onedash.cloud)
        if (h === 'bluetick.cloud' || h.endsWith('.bluetick.cloud')) return true;
        if (h === 'onedash.cloud' || h.endsWith('.onedash.cloud')) return true;
    } catch { }

    return false;
}

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            // Dynamic origin function — supports multiple platform domains,
            // EXTRA_CORS_ORIGINS, EXTRA_PLATFORM_DOMAINS, and localhost.
            origin: (origin, callback) => {
                if (_isSocketOriginAllowed(origin)) {
                    return callback(null, true);
                }
                callback(new Error(`Socket.IO CORS: origin not allowed: ${origin}`));
            },
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        // Extract token from HttpOnly cookie in handshake headers, fallback to auth.token
        let token = null;
        const cookieHeader = socket.handshake.headers?.cookie || '';
        if (cookieHeader) {
            const cookies = Object.fromEntries(
                cookieHeader.split('; ').filter(Boolean).map(c => {
                    const [k, ...v] = c.split('=');
                    return [k, v.join('=')];
                })
            );
            token = cookies['bt_token'];
        }
        // Fallback for backward compat (e.g., mobile clients)
        if (!token) token = socket.handshake.auth?.token;

        if (!token) return next(new Error('Authentication required'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            socket.user = decoded.user;

            // Fetch DB user to build server-authorised room identifiers.
            // join_waba and join_personal will use these instead of client-provided values.
            try {
                const User = require('./models/User');
                const dbUser = await User.findByPk(decoded.user.id, {
                    attributes: ['id', 'wabaId', 'parentUserId']
                });
                if (dbUser) {
                    const ownerId = dbUser.parentUserId || dbUser.id;
                    socket.user.authorizedPersonalRoomId = String(decoded.user.id);
                    socket.user.ownerId = String(ownerId);
                    if (dbUser.parentUserId) {
                        const parentUser = await User.findByPk(dbUser.parentUserId, {
                            attributes: ['id', 'wabaId']
                        });
                        socket.user.authorizedWabaId = parentUser?.wabaId || null;
                    } else {
                        socket.user.authorizedWabaId = dbUser.wabaId || null;
                    }
                }
            } catch (dbErr) {
                // Non-fatal — room joins will use the JWT id as a fallback
                socket.user.authorizedPersonalRoomId = String(decoded.user.id);
                socket.user.authorizedWabaId = null;
                socket.user.ownerId = String(decoded.user.id);
            }

            next();
        } catch (e) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log('New client connected: ' + socket.id);

        // Frontend will emit this when they load the WhatsApp Inbox.
        // The client-provided wabaId is IGNORED — we use the server-verified value
        // so a connected user cannot eavesdrop on another account's inbox.
        socket.on('join_waba', () => {
            const wabaId = socket.user?.authorizedWabaId;
            if (wabaId) {
                console.log(`Socket ${socket.id} joining authorised waba room: ${wabaId}`);
                socket.join(wabaId);
            }
        });

        // Join a personal room for direct notifications (chat assignment, etc.).
        // The client-provided userId is IGNORED — we use the authenticated user's id.
        socket.on('join_personal', () => {
            const roomId = socket.user?.authorizedPersonalRoomId;
            if (roomId) {
                socket.join(roomId);
                console.log(`Socket ${socket.id} joined personal room: ${roomId}`);
            }
        });

        // Team Live Status & Presence Tracking.
        // userId and parentId are taken from the verified token, not the client payload.
        socket.on('user_connected', () => {
            const userId = socket.user?.authorizedPersonalRoomId;
            const ownerId = socket.user?.ownerId || userId;
            if (userId) {
                onlineUsers.set(socket.id, userId);
                userRooms.set(socket.id, ownerId);
                socket.join(`team_${ownerId}`);
                console.log(`User ${userId} joined team room team_${ownerId}`);
                io.to(`team_${ownerId}`).emit('user_status_change', { userId, isOnline: true });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected: ' + socket.id);

            // Handle Presence Disconnect
            const userId = onlineUsers.get(socket.id);
            const roomId = userRooms.get(socket.id);

            if (userId && roomId) {
                // Broadcast to the team room that they went offline
                io.to(`team_${roomId}`).emit('user_status_change', { userId, isOnline: false });

                onlineUsers.delete(socket.id);
                userRooms.delete(socket.id);
            }
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Helper function to check if a specific user is currently online
const isUserOnline = (userId) => {
    // Check if the userId exists as a value in our Map
    for (let uId of onlineUsers.values()) {
        if (uId === userId) return true;
    }
    return false;
};

module.exports = { initSocket, getIo, isUserOnline };
