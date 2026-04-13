const express = require('express');
const router = express.Router();
const Label = require('../models/Label');
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const { getUserPlanLimits, checkLimit, getTagCount } = require('../utils/planLimits');

// GET /api/labels - Get all labels for user
router.get('/', auth, async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const labels = await Label.findAll({
            where: { userId: ownerId },
            order: [['createdAt', 'DESC']]
        });
        res.json(labels);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/labels - Create a new label
router.post('/', auth, async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const limits = await getUserPlanLimits(ownerId);
        const tagCount = await getTagCount(ownerId);

        const limitCheck = checkLimit(tagCount, limits.tagLimit);
        if (!limitCheck.allowed) {
            return res.status(403).json({ 
                msg: `Plan limit reached: You can only have up to ${limitCheck.limit} Tags/Labels.` 
            });
        }

        const { name, color } = req.body;
        if (!name) return res.status(400).json({ msg: 'Label name is required' });

        const newLabel = await Label.create({
            name,
            color: color || '#3b82f6',
            userId: ownerId
        });

        res.json(newLabel);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT /api/labels/:id - Update a label
router.put('/:id', auth, async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const { name, color } = req.body;
        const label = await Label.findOne({ where: { id: req.params.id, userId: ownerId } });

        if (!label) return res.status(404).json({ msg: 'Label not found' });

        if (name) label.name = name;
        if (color) label.color = color;

        await label.save();

        // Update all associated Contacts
        const contacts = await Contact.findAll({ where: { userId: ownerId } });
        for (let c of contacts) {
            if (c.labels && c.labels.some(l => l.id === label.id)) {
                c.labels = c.labels.map(l => l.id === label.id ? { id: label.id, name: label.name, color: label.color } : l);
                await c.update({ labels: c.labels });
            }
        }

        // Update all associated Conversations
        const conversations = await Conversation.findAll({ where: { userId: ownerId } });
        for (let c of conversations) {
            if (c.labels && c.labels.some(l => l.id === label.id)) {
                c.labels = c.labels.map(l => l.id === label.id ? { id: label.id, name: label.name, color: label.color } : l);
                await c.update({ labels: c.labels });
            }
        }

        res.json(label);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/labels/:id - Delete a label
router.delete('/:id', auth, async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const labelId = req.params.id;
        const label = await Label.findOne({ where: { id: labelId, userId: ownerId } });
        if (!label) return res.status(404).json({ msg: 'Label not found' });

        await label.destroy();

        // Remove from Contacts
        const contacts = await Contact.findAll({ where: { userId: ownerId } });
        for (let c of contacts) {
            if (c.labels && c.labels.some(l => l.id === labelId)) {
                c.labels = c.labels.filter(l => l.id !== labelId);
                await c.update({ labels: c.labels });
            }
        }

        // Remove from Conversations
        const conversations = await Conversation.findAll({ where: { userId: ownerId } });
        for (let c of conversations) {
            if (c.labels && c.labels.some(l => l.id === labelId)) {
                c.labels = c.labels.filter(l => l.id !== labelId);
                await c.update({ labels: c.labels });
            }
        }

        res.json({ msg: 'Label removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
