const express = require('express');
const router = express.Router();
const Flow = require('../models/Flow');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storageProvider = require('../utils/storageProvider');

// POST upload media for flows
router.post('/upload', auth, storageProvider('flows_media', { fileFilter: storageProvider.whatsappMediaFilter }).single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const publicUrl = req.file.publicUrl;

        res.json({ 
            url: publicUrl,
            filename: req.file.filename || req.file.key,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (err) {
        console.error('Flow Upload Error:', err);
        res.status(500).json({ error: 'Failed to upload media' });
    }
});

// GET all flows for user
router.get('/', auth, async (req, res) => {
    try {
        const flows = await Flow.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(flows);
    } catch (err) {
        console.error('Fetch Flows Error:', err);
        res.status(500).json({ error: 'Failed to fetch flows' });
    }
});

// GET single flow
router.get('/:id', auth, async (req, res) => {
    try {
        const flow = await Flow.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!flow) {
            return res.status(404).json({ error: 'Flow not found' });
        }
        res.json(flow);
    } catch (err) {
        console.error('Fetch Flow Error:', err);
        res.status(500).json({ error: 'Failed to fetch flow' });
    }
});

// POST create new flow
router.post('/', auth, async (req, res) => {
    try {
        const { name, triggerKeyword, isAny, nodes, edges } = req.body;
        
        // Basic validation
        if (!nodes || !Array.isArray(nodes)) {
            return res.status(400).json({ error: 'Nodes array is required' });
        }

        const flow = await Flow.create({
            userId: req.user.id,
            name: name || 'Untitled Flow',
            triggerKeyword: triggerKeyword ? triggerKeyword.trim().toLowerCase() : null,
            isAny: isAny || false,
            nodes,
            edges: edges || [],
            isActive: false // Always start inactive
        });

        res.status(201).json(flow);
    } catch (err) {
        console.error('Create Flow Error:', err);
        res.status(500).json({ error: 'Failed to create flow' });
    }
});

// PUT update flow
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, triggerKeyword, isAny, nodes, edges, isActive } = req.body;

        const flow = await Flow.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!flow) {
            return res.status(404).json({ error: 'Flow not found' });
        }

        if (name !== undefined) flow.name = name;
        if (triggerKeyword !== undefined) flow.triggerKeyword = triggerKeyword ? triggerKeyword.trim().toLowerCase() : null;
        if (isAny !== undefined) flow.isAny = isAny;
        if (nodes !== undefined) flow.nodes = nodes;
        if (edges !== undefined) flow.edges = edges;
        if (isActive !== undefined) flow.isActive = isActive;

        await flow.save();
        res.json(flow);
    } catch (err) {
        console.error('Update Flow Error:', err);
        res.status(500).json({ error: 'Failed to update flow' });
    }
});

// DELETE flow
router.delete('/:id', auth, async (req, res) => {
    try {
        const result = await Flow.destroy({
            where: { id: req.params.id, userId: req.user.id }
        });
        
        if (result === 0) {
            return res.status(404).json({ error: 'Flow not found' });
        }
        
        res.json({ success: true, message: 'Flow deleted forever' });
    } catch (err) {
        console.error('Delete Flow Error:', err);
        res.status(500).json({ error: 'Failed to delete flow' });
    }
});

module.exports = router;
