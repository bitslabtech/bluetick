const ActivityLog = require('../models/ActivityLog');
const { getRealIp } = require('./ip');

const logActivity = async (req, action, details) => {
    try {
        let finalDetails = details;
        if (req.impersonator) {
            finalDetails += ` (Impersonated by ${req.impersonator.name} <${req.impersonator.email}>)`;
        }

        await ActivityLog.create({
            userId: req.user ? req.user.id : null,
            action,
            details: finalDetails,
            ip: getRealIp(req)
        });
    } catch (err) {
        console.error("Logging Error:", err);
    }
};

module.exports = logActivity;
