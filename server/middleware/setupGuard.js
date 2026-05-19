/**
 * setupGuard.js
 * 
 * Blocks ALL /api routes (except /api/setup/*) when SETUP_COMPLETE is not 'true'.
 * This prevents any data access before the app is configured.
 */
const setupGuard = (req, res, next) => {
    if (process.env.SETUP_COMPLETE === 'true') {
        return next(); // App is configured — allow everything
    }

    // Always allow setup endpoints
    if (req.path.startsWith('/setup')) {
        return next();
    }

    // Block all other API routes until setup is done
    return res.status(503).json({
        error: 'Application not configured.',
        setupRequired: true,
        message: 'Please complete the installation wizard before using this application.'
    });
};

module.exports = setupGuard;
