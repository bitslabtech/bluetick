const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // allow frontend
            methods: ["GET", "POST"]
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

        socket.on('disconnect', () => {
            console.log('Client disconnected: ' + socket.id);
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

module.exports = { initSocket, getIo };
