const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const AccountDeletion = require('../services/AccountDeletion');
const logActivity = require('../utils/logger');

router.use(auth);

/** Only the workspace owner, in their own session (not a team member, not superadmin impersonation). */
async function loadOwner(req, res) {
    if (req.impersonator) { res.status(403).json({ error: 'Not available while impersonating' }); return null; }
    if (req.user.parentUserId) { res.status(403).json({ error: 'Only the account owner can delete the account' }); return null; }
    const user = await User.findByPk(req.user.realId || req.user.id);
    if (!user || user.status === 'deleted') { res.status(404).json({ error: 'Account not found' }); return null; }
    if (user.isAdmin) { res.status(403).json({ error: 'Superadmin accounts cannot be deleted' }); return null; }
    return user;
}

const state = (user) => ({
    scheduledFor: user.deletionScheduledFor || null,
    graceDays: AccountDeletion.GRACE_DAYS,
});

// GET /api/account/deletion: is a deletion scheduled? (members see it too, read-only)
router.get('/deletion', async (req, res) => {
    try {
        const owner = await User.findByPk(req.user.parentUserId || req.user.realId || req.user.id);
        res.json({ ...state(owner || {}), canDelete: !req.user.parentUserId && !req.impersonator });
    } catch (e) {
        console.error('[ACCOUNT] deletion status:', e.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/account/deletion { password }: schedule deletion of the whole workspace in 30 days
router.post('/deletion', async (req, res) => {
    try {
        const user = await loadOwner(req, res);
        if (!user) return;
        const password = String(req.body?.password || '');
        if (!password || !(await bcrypt.compare(password, user.password || ''))) {
            return res.status(400).json({ error: 'Incorrect password' });
        }
        if (!user.deletionScheduledFor) {
            await AccountDeletion.requestDeletion(user);
            await logActivity(req, 'Account Deletion Requested', `Owner ${user.email} scheduled deletion for ${user.deletionScheduledFor.toISOString()}`);
        }
        res.json(state(user));
    } catch (e) {
        console.error('[ACCOUNT] request deletion:', e.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE /api/account/deletion: cancel a scheduled deletion
router.delete('/deletion', async (req, res) => {
    try {
        const user = await loadOwner(req, res);
        if (!user) return;
        if (user.deletionScheduledFor) {
            await AccountDeletion.cancelDeletion(user);
            await logActivity(req, 'Account Deletion Cancelled', `Owner ${user.email} cancelled the scheduled deletion`);
        }
        res.json(state(user));
    } catch (e) {
        console.error('[ACCOUNT] cancel deletion:', e.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
