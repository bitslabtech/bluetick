const crypto = require('crypto');

/**
 * Lightweight Double-Submit Cookie CSRF Middleware
 * 
 * 1. GET requests generate a CSRF token (if not present) and set it in a cookie.
 * 2. POST/PUT/PATCH/DELETE requests verify that the token from the header matches the cookie.
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function csrfProtection(req, res, next) {
    // 1. Ensure token exists in cookie
    let token = req.cookies[CSRF_COOKIE_NAME];
    
    if (!token) {
        token = generateToken();
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false, // Must be readable by frontend JS
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
    }

    // 2. Allow non-mutating requests and excluded paths to pass through
    const excludedPaths = [
        '/api/webhooks', 
        '/api/meta-ads/webhooks', 
        '/api/payment/webhook',
        '/api/v1'
    ];
    const isExcluded = excludedPaths.some(p => req.path.startsWith(p));

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || isExcluded) {
        return next();
    }

    // 3. For mutating requests, verify header matches cookie
    const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[CSRF_HEADER_NAME.toLowerCase()];

    if (!headerToken || headerToken !== token) {
        return res.status(403).json({ error: 'CSRF token missing or invalid. Please refresh the page and try again.' });
    }

    next();
}

module.exports = csrfProtection;
