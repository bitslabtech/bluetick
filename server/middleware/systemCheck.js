const jwt = require('jsonwebtoken');
const SystemConfig = require('../models/SystemConfig');

const systemCheck = async (req, res, next) => {
    try {
        const config = await SystemConfig.getConfig();

        // 1. IP Blacklist Check
        const clientIp = req.ip || req.connection.remoteAddress;
        if (config.ipBlacklist && config.ipBlacklist.includes(clientIp)) {
            return res.status(403).json({ error: 'Access Denied: Your IP is blacklisted.' });
        }

        // 2. Maintenance Mode Check
        if (config.maintenanceMode) {
            const path = req.originalUrl; // e.g. /api/auth/login or /api/system

            // CRITICAL: Always allow Auth routes (Login/Register) so users can actually log in!
            // Also allow /api/system so the frontend knows maintenance is ON.
            // Allow /api/landing and /api/plans/public so the public website is still accessible.
            if (
                path.includes('/api/auth') ||
                path.includes('/api/system') ||
                path.includes('/api/webhook') ||
                path.includes('/api/landing') ||
                path.includes('/api/plans/public')
            ) {
                return next();
            }

            // Check for Admin Token Bypass
            // Since this runs before auth middleware, req.user is usually undefined.
            // We must peek at the token manually.
            const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    if (decoded.user && (decoded.user.isAdmin || decoded.user.origRole === 'Admin')) {
                        return next(); // Admin Bypass -> Full Access
                    }
                } catch (e) {
                    // Invalid token, ignore and proceed to block
                }
            }

            // Block all other data routes with 503
            return res.status(503).json({
                error: 'System is under maintenance.',
                maintenance: true
            });
        }

        next();
    } catch (err) {
        console.error("System Check Error:", err);
        next();
    }
};

module.exports = systemCheck;
