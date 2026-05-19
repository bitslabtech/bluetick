const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// Track online users: { socketId: userId }
const onlineUsers = new Map();

// Track user's team room (usually their parentUserId or their own id)
const userRooms = new Map();

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173', // allow frontend
            methods: ["GET", "POST"]
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
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
