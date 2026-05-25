/**
 * Helper to resolve the true client IP address.
 * Prioritizes Cloudflare (CF-Connecting-IP), standard proxies (X-Real-IP, X-Forwarded-For).
 */
const getRealIp = (req) => {
    if (req.headers['cf-connecting-ip']) {
        return req.headers['cf-connecting-ip'];
    }
    if (req.headers['x-real-ip']) {
        return req.headers['x-real-ip'];
    }
    if (req.headers['x-forwarded-for']) {
        // X-Forwarded-For can contain a list: "client, proxy1, proxy2"
        const ips = req.headers['x-forwarded-for'].split(',');
        return ips[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
};

module.exports = { getRealIp };
