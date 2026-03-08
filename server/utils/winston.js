const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}] ${message}`)
    ),
    transports: [
        // Console output (existing behavior)
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}] ${message}`)
            )
        }),
        // Rotate file: logs/server-YYYY-MM-DD.log, kept for 7 days, max 5MB each
        new transports.DailyRotateFile({
            filename: path.join(logsDir, 'server-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '5m',
            maxFiles: '7d',
            zippedArchive: false
        }),
        // Flat file for easy tail reading by the API
        new transports.File({
            filename: path.join(logsDir, 'server.log'),
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 1,
            tailable: true
        })
    ]
});

// Override console methods so existing console.log/error calls also appear in the file
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
    logger.info(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
};
console.error = (...args) => {
    logger.error(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
};
console.warn = (...args) => {
    logger.warn(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
};

module.exports = logger;
