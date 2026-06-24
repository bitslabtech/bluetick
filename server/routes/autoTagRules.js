const express = require('express');
const router = express.Router();
const AutoTagRule = require('../models/AutoTagRule');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// ── GET /api/auto-tag-rules ──────────────────────────────────────────
// Returns all auto-tag rules for the logged-in user
router.get('/', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const rules = await AutoTagRule.findAll({
            where: { userId: ownerId },
            order: [['createdAt', 'DESC']]
        });
        res.json(rules);
    } catch (err) {
        console.error('[AutoTagRules] GET error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/auto-tag-rules ─────────────────────────────────────────
// Creates a new auto-tag rule
router.post('/', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const { name, type, pattern, applyTag, expiresInHours } = req.body;

        if (!name || !type || !applyTag) {
            return res.status(400).json({ error: 'name, type, and applyTag are required.' });
        }

        // Validate regex patterns to prevent server crashes
        if (type === 'regex' && pattern) {
            try { new RegExp(pattern); } catch (e) {
                return res.status(400).json({ error: `Invalid regex pattern: ${e.message}` });
            }
        }

        // keyword/contains/regex rules need a pattern
        if (['keyword', 'contains', 'regex'].includes(type) && !pattern) {
            return res.status(400).json({ error: `Pattern is required for rule type "${type}".` });
        }

        const rule = await AutoTagRule.create({
            userId: ownerId,
            name,
            type,
            pattern: pattern || null,
            applyTag,
            expiresInHours: expiresInHours ? parseInt(expiresInHours) : null,
            isActive: true
        });

        res.status(201).json(rule);
    } catch (err) {
        console.error('[AutoTagRules] POST error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /api/auto-tag-rules/:id ──────────────────────────────────────
// Updates an existing rule (can toggle isActive, change pattern, etc.)
router.put('/:id', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const rule = await AutoTagRule.findOne({ where: { id: req.params.id, userId: ownerId } });

        if (!rule) return res.status(404).json({ error: 'Rule not found.' });

        const { name, type, pattern, applyTag, expiresInHours, isActive } = req.body;

        // Validate updated regex
        if ((type || rule.type) === 'regex' && (pattern || rule.pattern)) {
            try { new RegExp(pattern || rule.pattern); } catch (e) {
                return res.status(400).json({ error: `Invalid regex pattern: ${e.message}` });
            }
        }

        await rule.update({
            name: name !== undefined ? name : rule.name,
            type: type !== undefined ? type : rule.type,
            pattern: pattern !== undefined ? pattern : rule.pattern,
            applyTag: applyTag !== undefined ? applyTag : rule.applyTag,
            expiresInHours: expiresInHours !== undefined ? parseInt(expiresInHours) : rule.expiresInHours,
            isActive: isActive !== undefined ? isActive : rule.isActive
        });

        res.json(rule);
    } catch (err) {
        console.error('[AutoTagRules] PUT error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/auto-tag-rules/:id ──────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const rule = await AutoTagRule.findOne({ where: { id: req.params.id, userId: ownerId } });

        if (!rule) return res.status(404).json({ error: 'Rule not found.' });

        await rule.destroy();
        res.json({ message: 'Rule deleted.' });
    } catch (err) {
        console.error('[AutoTagRules] DELETE error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
