const express = require('express');
const router = express.Router();
const StoreItem = require('../models/StoreItem');
const adminCheck = require('../middleware/admin');
const auth = require('../middleware/auth');

router.use(auth);
router.use(adminCheck);

// GET all store items (Superadmin)
router.get('/', async (req, res) => {
    try {
        const items = await StoreItem.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(items);
    } catch (err) {
        console.error("Admin Store Fetch items error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST new store item
router.post('/', async (req, res) => {
    try {
        const { name, description, price, currency, itemType, amount, isActive, icon, color } = req.body;
        
        // Basic validation
        if (!name || !price || !itemType || amount === undefined) {
            return res.status(400).json({ error: 'Name, price, itemType, and amount are required.' });
        }

        const newItem = await StoreItem.create({
            name,
            description,
            price,
            currency: currency || 'USD',
            itemType,
            amount,
            isActive: isActive !== undefined ? isActive : true,
            icon: icon || 'Zap',
            color: color || 'indigo'
        });

        res.status(201).json(newItem);
    } catch (err) {
        console.error("Store Item Creation Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT update store item
router.put('/:id', async (req, res) => {
    try {
        const item = await StoreItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Store item not found.' });

        await item.update(req.body);
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE store item
router.delete('/:id', async (req, res) => {
    try {
        const item = await StoreItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Store item not found.' });

        await item.destroy();
        res.json({ success: true, message: 'Store item deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
