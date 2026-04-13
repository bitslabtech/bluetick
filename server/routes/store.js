const express = require('express');
const router = express.Router();
const StoreItem = require('../models/StoreItem');
const auth = require('../middleware/auth');

router.use(auth);

// GET all active store items for users to purchase
router.get('/', async (req, res) => {
    try {
        const items = await StoreItem.findAll({
            where: { isActive: true },
            order: [
                ['itemType', 'ASC'], // Group by AI Tokens, Messages, etc.
                ['price', 'ASC']     // Order by price low to high
            ]
        });
        res.json(items);
    } catch (err) {
        console.error("User Store Fetch items error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
