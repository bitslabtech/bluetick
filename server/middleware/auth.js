const jwt = require('jsonwebtoken');

module.exports = async function (req, res, next) {
    // Get token from header — support both 'x-auth-token' (app convention) and 'Authorization: Bearer'
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    // Check if not token
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        req.user = decoded.user;

        // Fetch fresh db user to attach team/workspace data
        const User = require('../models/User');
        const dbUser = await User.findByPk(req.user.id);

        if (dbUser) {
            req.user.realId = req.user.id;
            req.user.isAdmin = dbUser.isAdmin; // Override JWT with DB truth
            req.user.parentUserId = dbUser.parentUserId;
            req.user.teamRole = dbUser.teamRole;
            req.user.teamPermissions = dbUser.teamPermissions;
            req.user.teamPolicy = dbUser.teamPolicy;
            req.user.plan = dbUser.plan;

            // MAGIC INHERITANCE: If acting as a team member, alias all standard queries to parent's workspace
            if (dbUser.parentUserId) {
                req.user.id = dbUser.parentUserId;
            }
        } else {
            return res.status(401).json({ error: 'User account no longer exists' });
        }

        // NEW: Check for Global Session Kill
        const SystemConfig = require('../models/SystemConfig');
        // Use cached config to prevent DB overloading
        const config = await SystemConfig.getCachedConfig();
        const tokenIssuedAt = new Date(decoded.iat * 1000); // JWT iat is seconds

        if (config.lastSessionKill && tokenIssuedAt < config.lastSessionKill) {
            return res.status(401).json({ error: 'Session expired by admin. Please login again.' });
        }

        // Check for Impersonator
        const adminToken = req.header('x-admin-token');
        if (adminToken) {
            try {
                const adminDecoded = jwt.verify(adminToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
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
