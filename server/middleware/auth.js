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
            req.user.lastSeenRoadmapAt = dbUser.lastSeenRoadmapAt;

            // ─── Subscription Enforcement ─────────────────────────────────────────
            // Verify admin token early so we can use it for the subscription bypass below.
            // A mere presence check is not enough — any expired/invalid token must be rejected.
            const adminTokenRaw = req.cookies?.bt_admin_token || req.header('x-admin-token');
            let verifiedAdminUser = null;
            if (adminTokenRaw) {
                try {
                    const adminDecoded = jwt.verify(adminTokenRaw, process.env.JWT_SECRET, { algorithms: ['HS256'] });
                    if (adminDecoded.user && adminDecoded.user.isAdmin) {
                        verifiedAdminUser = adminDecoded.user;
                        req.impersonator = verifiedAdminUser; // set once here
                    }
                } catch (ignore) { /* invalid/expired token — treat as absent */ }
            }

            // Admins and impersonated sessions are never blocked by subscription checks.
            if (!dbUser.isAdmin && !verifiedAdminUser) {
                // Allow billing, auth, and public endpoints even if expired
                const allowedPaths = ['/api/auth', '/api/billing', '/api/plans', '/api/system', '/api/webhook', '/api/coupons', '/api/support'];
                const isAllowedPath = allowedPaths.some(p => req.originalUrl.startsWith(p));

                if (!isAllowedPath) {
                    // Block suspended/pending users
                    if (dbUser.planStatus && ['Suspended', 'Pending'].includes(dbUser.planStatus)) {
                        console.log('[AUTH MIDDLEWARE 403] PLAN_INACTIVE', dbUser.planStatus, 'Path:', req.originalUrl);
                        return res.status(403).json({
                            error: `Your account is currently ${dbUser.planStatus}. Please complete your subscription setup.`,
                            code: 'PLAN_INACTIVE'
                        });
                    }

                    // Block users whose plan has explicitly been set to Expired by scheduler
                    if (dbUser.planStatus === 'Expired') {
                        console.log('[AUTH MIDDLEWARE 403] PLAN_EXPIRED', 'Path:', req.originalUrl);
                        return res.status(403).json({
                            error: 'Your subscription has expired. Please renew your plan to continue.',
                            code: 'PLAN_EXPIRED',
                            expiredAt: dbUser.planExpiry
                        });
                    }

                    // Safety net: if planExpiry is past, block regardless of planStatus value.
                    // This catches cases where the scheduler hasn't run yet (Trial/Active with elapsed date).
                    // True free plans always have planExpiry = null so they are naturally excluded.
                    if (dbUser.planExpiry && new Date(dbUser.planExpiry) < new Date()) {
                        console.log('[AUTH MIDDLEWARE 403] PLAN_EXPIRED_DATE', dbUser.planExpiry, 'Path:', req.originalUrl);
                        return res.status(403).json({
                            error: `Your subscription expired on ${new Date(dbUser.planExpiry).toLocaleDateString()}. Please renew your plan to continue.`,
                            code: 'PLAN_EXPIRED_DATE',
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

        next();
    } catch (err) {
        // Only a bad / expired token means "log in again". A database or other server fault must
        // not look like a dead session, or clients (mobile especially) would be signed out by an outage.
        const tokenProblem = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err?.name);
        if (tokenProblem) return res.status(401).json({ error: 'Token is not valid' });
        console.error('[AUTH MIDDLEWARE] Server error (session not rejected):', err?.message);
        res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
    }
};
