const AddonModel = require('../models/Addon');
const UserAddonModel = require('../models/UserAddon');

/**
 * Middleware strictly blocks access to routes if the authenticated user
 * does not have an active subscription/purchase for the specified add-on.
 * Superadmins automatically bypass this check.
 * 
 * @param {string} moduleKey - The unique key of the add-on (e.g., 'ai_bot')
 */
const requireAddon = (moduleKey) => {
    return async (req, res, next) => {
        try {
            // Ensure req.user exists (auth middleware must run before this)
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Admins bypass add-on restrictions
            if (req.user.isAdmin) {
                return next();
            }

            // 1. Find the Addon ID for the given module_key
            const addon = await AddonModel.findOne({
                where: { module_key: moduleKey, isActive: true }
            });

            if (!addon) {
                return res.status(404).json({ error: `Add-on ${moduleKey} not found or inactive.` });
            }

            // 2. Check if user has an active entitlement for this addon
            const userAddon = await UserAddonModel.findOne({
                where: {
                    userId: req.user.id,
                    addonId: addon.id,
                    status: 'active'
                }
            });

            if (!userAddon) {
                return res.status(403).json({
                    error: 'Add-on Required',
                    message: `You do not have access to this feature. Please purchase the '${addon.name}' add-on.`,
                    addon: addon.name
                });
            }

            // User is entitled
            next();
        } catch (error) {
            console.error(`Entitlement Check Error [${moduleKey}]:`, error);
            res.status(500).json({ error: 'Server error during entitlement verification' });
        }
    }
};

module.exports = requireAddon;
