const jwt = require('jsonwebtoken');

module.exports = async function (req, res, next) {
    // Get token from HttpOnly cookie FIRST, then fall back to headers for backward compat
    const token = req.cookies?.bt_token
        || req.header('x-auth-token')
        || req.header('Authorization')?.replace('Bearer ', '');

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
            req.user.planStatus = dbUser.planStatus;
            req.user.planExpiry = dbUser.planExpiry;

            // ─── Subscription Enforcement ─────────────────────────────────────────
            // Admins and impersonated sessions are never blocked by subscription checks.
            if (!dbUser.isAdmin && !req.cookies?.bt_admin_token && !req.header('x-admin-token')) {
                // Allow billing, auth, and public endpoints even if expired
                const allowedPaths = ['/api/auth', '/api/billing', '/api/plans', '/api/system', '/api/webhook'];
                const isAllowedPath = allowedPaths.some(p => req.originalUrl.startsWith(p));

                if (!isAllowedPath) {
                    // Block suspended/pending users
                    if (dbUser.planStatus && ['Suspended', 'Pending'].includes(dbUser.planStatus)) {
                        return res.status(403).json({
                            error: `Your account is currently ${dbUser.planStatus}. Please complete your subscription setup.`,
                            code: 'PLAN_INACTIVE'
                        });
                    }

                    // Block users whose plan has expired and planStatus is Expired
                    if (dbUser.planStatus === 'Expired') {
                        return res.status(403).json({
                            error: 'Your subscription has expired. Please renew your plan to continue.',
                            code: 'PLAN_EXPIRED',
                            expiredAt: dbUser.planExpiry
                        });
                    }

                    // Safety net: if planExpiry is past and status is still Active/Trial (scheduler lag),
                    // block the request and let the user know they need to renew.
                    if (dbUser.planExpiry && new Date(dbUser.planExpiry) < new Date() &&
                        ['Active', 'Trial'].includes(dbUser.planStatus) && dbUser.plan !== 'Free') {
                        return res.status(403).json({
                            error: 'Your subscription has expired. Please renew your plan to continue.',
                            code: 'PLAN_EXPIRED',
                            expiredAt: dbUser.planExpiry
                        });
                    }
                }
            }
            // ─────────────────────────────────────────────────────────────────────

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

        // Check for Impersonator — from HttpOnly cookie or header
        const adminToken = req.cookies?.bt_admin_token || req.header('x-admin-token');
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
