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

        // Direct IP address access
        if (/(\d{1,3}\.){3}\d{1,3}$/.test(h)) return true;

        // PaaS / Dynamic DNS domains
        const paasPatterns = ['sslip.io', 'nip.io', 'traefik.me', 'ngrok.io', 'ngrok-free.app', 'railway.app', 'onrender.com', 'vercel.app', 'netlify.app'];
        if (paasPatterns.some(p => h.includes(p))) return true;

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
            .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
        if (extraDomains.some(d => h === d || h.endsWith(`.${d}`))) return true;
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

    io.use((socket, next) => {
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
            next();
        } catch (e) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log('New client connected: ' + socket.id);

        // Frontend will emit this when they load the WhatsApp Inbox
        socket.on('join_waba', (wabaId) => {
            if (wabaId) {
                console.log(`Socket ${socket.id} joining room: ${wabaId}`);
                socket.join(wabaId);
            }
        });

        // Join a personal room (userId) for direct targeted notifications like chat assignment
        socket.on('join_personal', (userId) => {
            if (userId) {
                socket.join(userId);
                console.log(`Socket ${socket.id} joined personal room: ${userId}`);
            }
        });

        // Team Live Status & Presence Tracking
        socket.on('user_connected', (data) => {
            const { userId, parentId } = data;
            if (userId) {
                onlineUsers.set(socket.id, userId);

                // The "room" is based on the parent account. If they are the parent, they use their own ID.
                const roomToJoin = parentId || userId;
                userRooms.set(socket.id, roomToJoin);

                socket.join(`team_${roomToJoin}`);
                console.log(`User ${userId} joined team room team_${roomToJoin}`);

                // Broadcast to the team room that this specific user is now online
                io.to(`team_${roomToJoin}`).emit('user_status_change', { userId, isOnline: true });
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
