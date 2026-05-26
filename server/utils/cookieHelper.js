/**
 * cookieHelper.js — Centralized HttpOnly cookie management for auth tokens.
 *
 * All token lifecycle (set, clear) is handled here.  
 * Cookies are HttpOnly + Secure (production) + SameSite=Lax.
 * JavaScript on the client CANNOT read these cookies — eliminating XSS token theft.
 */

const COOKIE_OPTIONS = {
    httpOnly: true,                                      // JS cannot read
    secure: process.env.NODE_ENV === 'production',       // HTTPS only in prod
    sameSite: 'lax',                                     // CSRF protection
    maxAge: 24 * 60 * 60 * 1000,                         // 24h — matches JWT expiry
    path: '/'
};

/**
 * Set the primary auth cookie (and optionally the admin backup cookie for impersonation).
 */
function setAuthCookies(res, token, adminToken = null) {
    res.cookie('bt_token', token, COOKIE_OPTIONS);
    if (adminToken) {
        res.cookie('bt_admin_token', adminToken, COOKIE_OPTIONS);
    }
}

/**
 * Clear all auth cookies (used on logout and session termination).
 */
function clearAuthCookies(res) {
    res.clearCookie('bt_token', { path: '/' });
    res.clearCookie('bt_admin_token', { path: '/' });
}

module.exports = { setAuthCookies, clearAuthCookies, COOKIE_OPTIONS };
