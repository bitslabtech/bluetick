const express = require('express');
const router = express.Router();
const AppVersion = require('../models/AppVersion');
const SystemNotification = require('../models/SystemNotification');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const superAdmin = [auth, admin];

// Helper: compare semver strings (returns -1, 0, or 1)
const compareSemver = (a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
};

// ───────────────────────────────────────────────
// PUBLIC ROUTES (auth only)
// ───────────────────────────────────────────────

// @route   GET /api/versioning/latest
// @desc    Get the current (latest) version for the user sidebar
router.get('/latest', auth, async (req, res) => {
    try {
        let current = await AppVersion.findOne({ where: { isCurrent: true } });
        if (!current) {
            // Fallback: return the most recently created version
            current = await AppVersion.findOne({ order: [['releasedAt', 'DESC']] });
        }
        if (!current) {
            return res.json({ version: '1.0.0', title: 'Initial Release', changelog: '', releasedAt: new Date() });
        }
        res.json(current);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/versioning/changelog
// @desc    Get all versions for the changelog modal (newest first)
router.get('/changelog', auth, async (req, res) => {
    try {
        const versions = await AppVersion.findAll({ order: [['releasedAt', 'DESC']] });
        res.json(versions);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ───────────────────────────────────────────────
// SUPERADMIN ROUTES
// ───────────────────────────────────────────────

// @route   GET /api/versioning
// @desc    List all versions (admin)
router.get('/', superAdmin, async (req, res) => {
    try {
        const versions = await AppVersion.findAll({ order: [['releasedAt', 'DESC']] });
        res.json(versions);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/versioning
// @desc    Create a new version entry
router.post('/', superAdmin, async (req, res) => {
    try {
        const { version, title, changelog, releasedAt, isCurrent } = req.body;

        if (!version || !title) {
            return res.status(400).json({ error: 'Version and title are required.' });
        }

        // Validate version is higher than the latest existing version
        const latestVersion = await AppVersion.findOne({ order: [['releasedAt', 'DESC']] });
        if (latestVersion) {
            if (compareSemver(version, latestVersion.version) <= 0) {
                return res.status(400).json({ error: `Version must be higher than the latest version (v${latestVersion.version}).` });
            }
            // Validate date is on or after the latest version's release date
            const newDate = releasedAt ? new Date(releasedAt) : new Date();
            const latestDate = new Date(latestVersion.releasedAt);
            if (newDate.toISOString().split('T')[0] < latestDate.toISOString().split('T')[0]) {
                return res.status(400).json({ error: `Release date cannot be before the last version's date (${latestDate.toISOString().split('T')[0]}).` });
            }
        }

        // If marking as current, unmark all others
        if (isCurrent) {
            await AppVersion.update({ isCurrent: false }, { where: { isCurrent: true } });
        }

        const entry = await AppVersion.create({
            version,
            title,
            changelog: changelog || '',
            releasedAt: releasedAt || new Date(),
            isCurrent: isCurrent || false
        });

        // Auto-broadcast notification to all users if marked as current
        if (isCurrent) {
            try {
                await SystemNotification.create({
                    title: `🚀 New Update: v${version}`,
                    message: `${title}${changelog ? '\n\n' + changelog.substring(0, 200) + (changelog.length > 200 ? '...' : '') : ''}`,
                    type: 'Info',
                    recipient: 'All Users',
                    target: 'All Users',
                    status: 'Sent'
                });
            } catch (notifErr) {
                console.error('Failed to create version notification:', notifErr);
            }
        }

        res.json(entry);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/versioning/:id
// @desc    Update a version entry
router.put('/:id', superAdmin, async (req, res) => {
    try {
        const entry = await AppVersion.findByPk(req.params.id);
        if (!entry) return res.status(404).json({ error: 'Version not found' });

        const { version, title, changelog, releasedAt, isCurrent } = req.body;

        // If marking as current, unmark all others first
        if (isCurrent && !entry.isCurrent) {
            await AppVersion.update({ isCurrent: false }, { where: { isCurrent: true } });
        }

        if (version !== undefined) entry.version = version;
        if (title !== undefined) entry.title = title;
        if (changelog !== undefined) entry.changelog = changelog;
        if (releasedAt !== undefined) entry.releasedAt = releasedAt;
        if (isCurrent !== undefined) entry.isCurrent = isCurrent;

        await entry.save();

        // Auto-broadcast notification if newly marked as current
        if (isCurrent && req.body.isCurrent) {
            try {
                await SystemNotification.create({
                    title: `🚀 New Update: v${entry.version}`,
                    message: `${entry.title}${entry.changelog ? '\n\n' + entry.changelog.substring(0, 200) + (entry.changelog.length > 200 ? '...' : '') : ''}`,
                    type: 'Info',
                    recipient: 'All Users',
                    target: 'All Users',
                    status: 'Sent'
                });
            } catch (notifErr) {
                console.error('Failed to create version notification:', notifErr);
            }
        }

        res.json(entry);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/versioning/:id
// @desc    Delete a version entry
router.delete('/:id', superAdmin, async (req, res) => {
    try {
        const entry = await AppVersion.findByPk(req.params.id);
        if (!entry) return res.status(404).json({ error: 'Version not found' });

        await entry.destroy();
        res.json({ success: true, message: 'Version deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
