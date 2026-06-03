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

const FlowExecutionLog = require('../models/FlowExecutionLog');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

// GET flow analytics/stats for the Reports page
router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { range = '30d' } = req.query;

        // Calculate date range
        const now = new Date();
        const start = new Date();
        if (range === '1d') start.setDate(now.getDate() - 1);
        else if (range === '7d') start.setDate(now.getDate() - 7);
        else if (range === '3m') start.setMonth(now.getMonth() - 3);
        else start.setDate(now.getDate() - 30); // default 30d
        start.setHours(0, 0, 0, 0);

        // Get all flows for user
        const allFlows = await Flow.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        // Get all execution logs in range
        const logs = await FlowExecutionLog.findAll({
            where: {
                userId,
                createdAt: { [Op.between]: [start, now] }
            },
            raw: true
        });

        // Build per-flow stats
        const flowStats = allFlows.map(flow => {
            const flowLogs = logs.filter(l => l.flowId === flow.id);
            const triggered = flowLogs.length;
            const completed = flowLogs.filter(l => l.status === 'completed').length;
            const dropped = flowLogs.filter(l => l.status === 'dropped').length;
            const uniqueContacts = new Set(flowLogs.filter(l => l.contactId).map(l => l.contactId)).size;
            const completionRate = triggered > 0 ? Math.round((completed / triggered) * 100) : 0;
            const avgNodes = triggered > 0
                ? Math.round(flowLogs.reduce((s, l) => s + (l.nodesExecuted || 0), 0) / triggered)
                : 0;

            // Last triggered timestamp
            const lastTriggered = flowLogs.length > 0
                ? flowLogs.reduce((latest, l) => new Date(l.createdAt) > new Date(latest) ? l.createdAt : latest, flowLogs[0].createdAt)
                : null;

            return {
                id: flow.id,
                name: flow.name,
                triggerKeyword: flow.triggerKeyword,
                isAny: flow.isAny,
                isActive: flow.isActive,
                nodeCount: (flow.nodes || []).length,
                createdAt: flow.createdAt,
                // Analytics
                triggered,
                completed,
                dropped,
                uniqueContacts,
                completionRate,
                avgNodes,
                lastTriggered
            };
        });

        // Aggregate summary
        const totalTriggers = logs.length;
        const totalCompleted = logs.filter(l => l.status === 'completed').length;
        const totalDropped = logs.filter(l => l.status === 'dropped').length;
        const totalUniqueContacts = new Set(logs.filter(l => l.contactId).map(l => l.contactId)).size;
        const overallCompletionRate = totalTriggers > 0 ? Math.round((totalCompleted / totalTriggers) * 100) : 0;
        const activeFlowsCount = allFlows.filter(f => f.isActive).length;

        // Daily trigger volume for chart (last N days)
        const dailyMap = {};
        const dayCount = range === '1d' ? 1 : range === '7d' ? 7 : range === '3m' ? 90 : 30;
        for (let i = 0; i < dayCount; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (dayCount - 1 - i));
            const key = d.toISOString().split('T')[0];
            dailyMap[key] = {
                date: key,
                label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                triggers: 0,
                completed: 0
            };
        }
        for (const log of logs) {
            const key = new Date(log.createdAt).toISOString().split('T')[0];
            if (dailyMap[key]) {
                dailyMap[key].triggers++;
                if (log.status === 'completed') dailyMap[key].completed++;
            }
        }
        const dailyData = Object.values(dailyMap);

        res.json({
            summary: {
                totalTriggers,
                totalCompleted,
                totalDropped,
                totalUniqueContacts,
                overallCompletionRate,
                activeFlowsCount,
                totalFlows: allFlows.length
            },
            flows: flowStats,
            dailyData
        });
    } catch (err) {
        console.error('Fetch Flow Stats Error:', err);
        res.status(500).json({ error: 'Failed to fetch flow stats' });
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
