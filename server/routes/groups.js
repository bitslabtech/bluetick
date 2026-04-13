const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const { getUserPlanLimits, checkLimit, getGroupCount } = require('../utils/planLimits');

router.use(auth);

// GET all groups
router.get('/', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const groups = await Group.findAll({
            where: { userId: ownerId },
            order: [['createdAt', 'DESC']]
        });
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE group
router.post('/', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const limits = await getUserPlanLimits(ownerId);
        const groupCount = await getGroupCount(ownerId);

        const limitCheck = checkLimit(groupCount, limits.groupLimit);
        if (!limitCheck.allowed) {
            return res.status(403).json({ 
                error: `Plan limit reached: You can only have up to ${limitCheck.limit} Contact Groups.` 
            });
        }

        const { name, description, color } = req.body;
        const group = await Group.create({
            name,
            description,
            color: color || '#3B82F6',
            userId: ownerId
        });

        await logActivity(req, 'Group Created', `Created group "${name}"`);

        res.json(group);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Group name already exists' });
        }
        res.status(400).json({ error: err.message });
    }
});

// UPDATE group
router.put('/:id', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const { name, description, color } = req.body;
        const group = await Group.findOne({ where: { id: req.params.id, userId: ownerId } });

        if (!group) return res.status(404).json({ error: 'Group not found' });

        group.name = name || group.name;
        group.description = description !== undefined ? description : group.description;
        group.color = color || group.color;
        await group.save();

        res.json(group);

        await logActivity(req, 'Group Updated', `Updated group "${group.name}"`);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE group
router.delete('/:id', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const result = await Group.destroy({
            where: { id: req.params.id, userId: ownerId }
        });
        if (!result) return res.status(404).json({ error: 'Group not found' });
        res.json({ message: 'Group deleted' });
        await logActivity(req, 'Group Deleted', `Deleted group ID: ${req.params.id}`);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
