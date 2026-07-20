const jwt = require('jsonwebtoken');

/**
 * Store Customer Auth Middleware
 *
 * Reads a JWT from the Authorization header (Bearer token).
 * The token is issued by POST /api/store-customer/:storeSlug/login or /verify-otp.
 * On success, attaches req.storeCustomer = { id, storeId, email, phone, name }.
 */
module.exports = async function storeCustomerAuth(req, res, next) {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || req.header('x-store-customer-token');

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        if (!decoded.storeCustomer) {
            return res.status(401).json({ error: 'Invalid token type' });
        }

        // Fetch fresh customer data from DB
        const StoreCustomer = require('../models/StoreCustomer');
        const customer = await StoreCustomer.findByPk(decoded.storeCustomer.id, {
            attributes: ['id', 'storeId', 'name', 'email', 'phone', 'isVerified', 'savedAddresses'],
        });

        if (!customer) {
            return res.status(401).json({ error: 'Customer account no longer exists' });
        }

        req.storeCustomer = customer;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token is not valid' });
    }
};
