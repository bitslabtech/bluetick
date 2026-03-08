const jwt = require('jsonwebtoken');

module.exports = async function (req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check if not token
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // NEW: Check for Global Session Kill
        const SystemConfig = require('../models/SystemConfig');
        // This findOne inside middleware is heavy? Ideally cache it. 
        // For now, it's safe for functional correctness.
        const config = await SystemConfig.getConfig();
        const tokenIssuedAt = new Date(decoded.iat * 1000); // JWT iat is seconds

        if (config.lastSessionKill && tokenIssuedAt < config.lastSessionKill) {
            return res.status(401).json({ error: 'Session expired by admin. Please login again.' });
        }

        // Check for Impersonator
        const adminToken = req.header('x-admin-token');
        if (adminToken) {
            try {
                const adminDecoded = jwt.verify(adminToken, process.env.JWT_SECRET);
                if (adminDecoded.user && adminDecoded.user.isAdmin) {
                    req.impersonator = adminDecoded.user;
                }
            } catch (ignore) {
                // Ignore invalid admin tokens, just don't set flag
            }
        }

        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};
