const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');

router.use(auth);

// GET all groups
router.get('/', async (req, res) => {
    try {
        const groups = await Group.findAll({
            where: { userId: req.user.id },
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
        const { name, description } = req.body;
        const group = await Group.create({
            name,
            description,
            userId: req.user.id
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
        const { name, description } = req.body;
        const group = await Group.findOne({ where: { id: req.params.id, userId: req.user.id } });

        if (!group) return res.status(404).json({ error: 'Group not found' });

        group.name = name || group.name;
        group.description = description !== undefined ? description : group.description;
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
        const result = await Group.destroy({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!result) return res.status(404).json({ error: 'Group not found' });
        res.json({ message: 'Group deleted' });
        await logActivity(req, 'Group Deleted', `Deleted group ID: ${req.params.id}`);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
