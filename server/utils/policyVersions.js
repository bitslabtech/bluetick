const PolicyVersion = require('../models/PolicyVersion');

// Policy pages that carry a version number and an archive. 'refund-policy' is the key the
// admin editor and the public page use for the Cancellation & Refund Policy.
const TRACKED_POLICY_KEYS = ['privacy', 'terms', 'return', 'refund-policy', 'shipping', 'about'];

/**
 * Make sure every tracked page that has content also has a version number and an archived copy
 * of exactly that content. A page nobody has ever edited since versioning was added has no
 * version yet; it is treated as v1.0 and its current text is archived, so:
 *  - a user who signs up now is recorded as agreeing to v1.0 (not "unknown"), and
 *  - when the admin later publishes v1.1, v1.0's text is still there to show what the user agreed to.
 * Pass { save: false } when the caller saves `settings` itself afterwards. Safe to call repeatedly: it only writes what is missing. Returns the (possibly updated) versions map.
 */
async function ensureBaselineVersions(settings, keys = TRACKED_POLICY_KEYS, { save = true } = {}) {
    if (!settings) return {};
    const pages = settings.publicPages || {};
    const versions = { ...(settings.publicPagesVersions || {}) };
    let changed = false;

    for (const key of keys) {
        const content = typeof pages[key] === 'string' ? pages[key] : '';

        if (!versions[key]?.version) {
            versions[key] = { version: '1.0', updatedAt: new Date().toISOString(), note: 'Original version' };
            changed = true;
        }
        // Page still on the built-in default text (nothing stored in the database): version it, nothing to archive
        if (!content.trim()) continue;
        const exists = await PolicyVersion.findOne({
            where: { policyKey: key, version: versions[key].version },
            attributes: ['id']
        });
        if (!exists) {
            try {
                await PolicyVersion.create({
                    policyKey: key,
                    version: versions[key].version,
                    content,
                    note: versions[key].note || null,
                    publishedAt: versions[key].updatedAt ? new Date(versions[key].updatedAt) : new Date(),
                    publishedBy: null
                });
            } catch (e) {
                console.error(`[POLICY] could not archive ${key} v${versions[key].version}:`, e.message);
            }
        }
    }

    if (changed) {
        settings.publicPagesVersions = versions;
        settings.changed('publicPagesVersions', true);
        if (save) await settings.save();
    }
    return versions;
}

module.exports = { TRACKED_POLICY_KEYS, ensureBaselineVersions };
