const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const Message = require('../models/Message');
const crypto = require('crypto');
const logActivity = require('../utils/logger');
const { Op } = require('sequelize');
const { isUserOnline } = require('../socket');
const { applyPrivacyMask } = require('../utils/privacy');

// GET all team members (Only owner can view)
router.get('/', auth, async (req, res) => {
    try {
        // Only the actual parent (owner) can list team members
        if (req.user.parentUserId) {
            return res.status(403).json({ error: 'Only the account owner can manage the team.' });
        }

        const team = await User.findAll({
            where: {
                [Op.or]: [
                    { parentUserId: req.user.id },
                    { id: req.user.id } // Include the owner themselves in the list
                ]
            },
            attributes: ['id', 'name', 'email', 'teamRole', 'teamPermissions', 'teamPolicy', 'createdAt', 'lastLogin', 'parentUserId']
        });

        // Map online status (safe - socket may not be ready)
        const teamWithStatus = team.map(member => {
            const memberObj = member.toJSON();
            try {
                memberObj.isOnline = isUserOnline(memberObj.id);
            } catch (e) {
                memberObj.isOnline = false;
            }
            return memberObj;
        });

        // Get limits for UI display
        const Plan = require('../models/Plan');
        const ownerPlan = await Plan.findOne({ where: { name: req.user.plan } });
        const memberLimit = ownerPlan ? ownerPlan.teamMemberLimit : 0;

        res.json({
            members: teamWithStatus,
            limit: memberLimit
        });
    } catch (err) {
        console.error('Fetch team error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Generate an invitation link for a new member
router.post('/invite', auth, async (req, res) => {
    try {
        const { role = 'viewer', permissions = [], teamPolicy = { inboxVisibility: 'see_all', phonePrivacy: 'visible' } } = req.body;

        // Block sub-members from inviting
        if (req.user.parentUserId) {
            return res.status(403).json({ error: 'Only the account owner can invite members.' });
        }

        // Check if user has reached their plan's team limit
        const ownerPlan = await Plan.findOne({ where: { name: req.user.plan } });
        const memberLimit = ownerPlan ? ownerPlan.teamMemberLimit : 0;

        const currentMemberCount = await User.count({ where: { parentUserId: req.user.id } });

        // Also count any pending tokens active on the exact owner's record! Wait, pending invites are usually stored in a DB or we can just create a temporary dummy user row, or a separate Invites table.
        // Simplest approach: We just generate a token, store it on the owner's record, or we just encrypt the owner's ID and role into the token JWT.
        // Actually, creating a separate "Invite" model is cleaner, but to stick to the plan: we can simply encode the owner's ID into the token using JWT or AES, and enforce the limit when they actually TRY to join.
        // Even better, let's just do a pre-check here.
        if (currentMemberCount >= memberLimit) {
            return res.status(403).json({ error: `You have reached your team limit of ${memberLimit}. Please upgrade your plan.` });
        }

        // Generate a random 32-char token
        const rawToken = crypto.randomBytes(16).toString('hex');

        // We will store the token, role, and permissions temporarily in the owner's record (simplistic) OR we can just pass an encrypted payload in the URL.
        // Let's pass an AES encrypted payload in the URL so it's stateless.
        const payload = JSON.stringify({
            parentId: req.user.id,
            role,
            permissions,
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        });

        // Encrypt payload (Using a simple base64 for now, for real production you'd use AES or jwt.sign)
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { parentId: req.user.id, role, permissions, teamPolicy },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?invite=${token}`;

        await logActivity(req, 'TEAM_INVITE_GENERATED', `Generated invite link for role: ${role}`);

        res.json({ inviteLink, token, msg: 'Invite link generated. It is valid for 24 hours.' });

    } catch (err) {
        console.error('Invite error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Process an invite token (User joins team)
// This happens after Registration, or during Registration. 
// We'll expose a dedicated endpoint to "Consume" an invite if they are already logged in, OR the register UI can pass it.
router.post('/join', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const jwt = require('jsonwebtoken');

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        } catch (e) {
            return res.status(400).json({ error: 'Invalid or expired invite token.' });
        }

        const { parentId, role, permissions, teamPolicy } = decoded;

        if (parentId === req.user.id) {
            return res.status(400).json({ error: 'You cannot join your own team.' });
        }

        // Check limits again
        const parentUser = await User.findByPk(parentId);
        if (!parentUser) return res.status(404).json({ error: 'Parent account not found.' });

        const ownerPlan = await Plan.findOne({ where: { name: parentUser.plan } });
        const memberLimit = ownerPlan ? ownerPlan.teamMemberLimit : 0;
        const currentMemberCount = await User.count({ where: { parentUserId: parentId } });

        if (currentMemberCount >= memberLimit) {
            return res.status(403).json({ error: 'The team owner has reached their maximum member limit.' });
        }

        // Apply team status out to the current logged in user
        const newTeamMember = await User.findByPk(req.user.id);
        if (!newTeamMember) return res.status(404).json({ error: 'Current user not found in DB.' });

        newTeamMember.parentUserId = parentId;
        newTeamMember.teamRole = role;
        newTeamMember.teamPermissions = permissions;
        if (teamPolicy) {
            newTeamMember.teamPolicy = teamPolicy;
        }
        await newTeamMember.save();

        await logActivity(Object.assign({}, req, { user: { id: parentId } }), 'TEAM_MEMBER_JOINED', `User ${newTeamMember.email} joined the team as ${role}.`);

        res.json({ msg: 'Successfully joined the team!', parentName: parentUser.name });
    } catch (err) {
        console.error('Join team error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET Member Analytics/Stats — full detail
router.get('/:id/stats', auth, async (req, res) => {
    try {
        const targetMemberId = req.params.id;
        const ownerId = req.user.id; // always the workspace owner (auth middleware aliases sub-users)

        // Verify authorization: only owner or the user themselves can see this
        if (req.user.parentUserId && req.user.realId !== targetMemberId) {
            return res.status(403).json({ error: 'Unauthorized to view these stats.' });
        }

        // Fetch team member profile info
        const member = await User.findByPk(targetMemberId, {
            attributes: ['id', 'name', 'email', 'teamRole', 'teamPermissions', 'createdAt', 'lastLogin']
        });
        if (!member) return res.status(404).json({ error: 'Member not found.' });

        // Summary counts (safe against missing createdById column)
        let contactsAdded = 0, templatesCreated = 0, messagesSent = 0;
        let recentMessages = [], recentContacts = [];
        let activityTimeline = [];

        try {
            const { Op, Sequelize } = require('sequelize');
            const { sequelize } = require('../config/database');
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            [contactsAdded, templatesCreated, messagesSent] = await Promise.all([
                Contact.count({ where: { createdById: targetMemberId, userId: ownerId } }),
                Template.count({ where: { createdById: targetMemberId, userId: ownerId } }),
                Message.count({ where: { createdById: targetMemberId, userId: ownerId } })
            ]);

            // Recent messages sent by this member (last 10)
            recentMessages = await Message.findAll({
                where: { createdById: targetMemberId, userId: ownerId },
                order: [['createdAt', 'DESC']],
                limit: 10,
                include: [Template],
                attributes: ['id', 'status', 'recipientCount', 'createdAt', 'campaignName']
            });

            // Recent contacts added by this member (last 5)
            recentContacts = await Contact.findAll({
                where: { createdById: targetMemberId, userId: ownerId },
                order: [['createdAt', 'DESC']],
                limit: 5,
                attributes: ['id', 'name', 'phone', 'createdAt']
            });

            // Daily activity timeline — messages created per day over last 30 days
            const dailyCounts = await Message.findAll({
                where: {
                    createdById: targetMemberId,
                    userId: ownerId,
                    createdAt: { [Op.gte]: thirtyDaysAgo }
                },
                attributes: [
                    [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'day'],
                    [sequelize.fn('count', sequelize.col('id')), 'count']
                ],
                group: [sequelize.fn('date_trunc', 'day', sequelize.col('createdAt'))],
                order: [[sequelize.fn('date_trunc', 'day', sequelize.col('createdAt')), 'ASC']],
                raw: true
            });

            // Build full 30-day timeline filling gaps with 0s
            const dayMap = {};
            dailyCounts.forEach(r => {
                const key = new Date(r.day).toISOString().split('T')[0];
                dayMap[key] = parseInt(r.count);
            });
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().split('T')[0];
                activityTimeline.push({ date: key, campaigns: dayMap[key] || 0 });
            }

        } catch (countErr) {
            console.warn('Member stats query error (column may not exist yet):', countErr.message);
        }

        res.json({
            member: member.toJSON(),
            summary: { contactsAdded, templatesCreated, messagesSent },
            activityTimeline,
            recentMessages: recentMessages.map(m => ({
                id: m.id,
                name: m.campaignName || m.Template?.name || 'Untitled Campaign',
                status: m.status,
                recipients: m.recipientCount,
                date: m.createdAt
            })),
            recentContacts: recentContacts.map(c => {
                const contactData = c.toJSON();
                return {
                    id: contactData.id,
                    name: contactData.name,
                    phone: applyPrivacyMask(contactData.phone, req.user),
                    date: contactData.createdAt
                };
            })
        });
    } catch (err) {
        console.error('Fetch member stats error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});


// PUT Update a member's role/permissions
router.put('/:id/permissions', auth, async (req, res) => {
    try {
        if (req.user.parentUserId) return res.status(403).json({ error: 'Unauthorized.' });

        const { role, permissions, teamPolicy } = req.body;
        const targetMember = await User.findOne({ where: { id: req.params.id, parentUserId: req.user.id } });

        if (!targetMember) return res.status(404).json({ error: 'Member not found.' });

        targetMember.teamRole = role;
        targetMember.teamPermissions = permissions;
        if (teamPolicy) {
            targetMember.teamPolicy = teamPolicy;
        }
        await targetMember.save();

        await logActivity(req, 'TEAM_MEMBER_UPDATED', `Updated permissions for ${targetMember.email}`);

        res.json({ msg: 'Member updated successfully.', member: {
            id: targetMember.id, name: targetMember.name, email: targetMember.email,
            teamRole: targetMember.teamRole, teamPermissions: targetMember.teamPermissions,
            teamPolicy: targetMember.teamPolicy, createdAt: targetMember.createdAt, lastLogin: targetMember.lastLogin
        } });
    } catch (err) {
        console.error('Update member error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE Remove a member from the team
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.parentUserId) return res.status(403).json({ error: 'Unauthorized.' });

        const targetMember = await User.findOne({ where: { id: req.params.id, parentUserId: req.user.id } });
        if (!targetMember) return res.status(404).json({ error: 'Member not found.' });

        // Unlink them, reverting them to a solo Free plan
        targetMember.parentUserId = null;
        targetMember.teamRole = 'owner';
        targetMember.teamPermissions = [];
        targetMember.plan = 'Free';
        await targetMember.save();

        await logActivity(req, 'TEAM_MEMBER_REMOVED', `Removed ${targetMember.email} from the team.`);

        res.json({ msg: 'Member removed from team.' });
    } catch (err) {
        console.error('Delete member error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});


// GET /for-assign - Lightweight member list for the assignment dropdown
router.get('/for-assign', auth, async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;

        const members = await User.findAll({
            where: {
                [Op.or]: [
                    { parentUserId: ownerId },
                    { id: ownerId } // Include owner themselves
                ]
            },
            attributes: ['id', 'name', 'email', 'teamRole']
        });

        // Attach online status
        const result = members.map(m => {
            const obj = m.toJSON();
            try { obj.isOnline = isUserOnline(obj.id); } catch { obj.isOnline = false; }
            return obj;
        });

        res.json(result);
    } catch (err) {
        console.error('for-assign error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
