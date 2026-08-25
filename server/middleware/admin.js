module.exports = function (req, res, next) {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        console.log('[ADMIN MIDDLEWARE 403] req.user:', req.user, 'Path:', req.originalUrl);
        res.status(403).json({ error: 'Access denied: Admins only' });
    }
};
