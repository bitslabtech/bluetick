const express = require('express');
const router = express.Router();
const NfcCard = require('../models/NfcCard');
const Vcard = require('../models/Vcard');

// @route   GET /n/:shortCode
// @desc    Redirect based on NFC card status
router.get('/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        const card = await NfcCard.findOne({ 
            where: { shortCode: shortCode.toUpperCase() },
            include: [{ model: Vcard, as: 'vcard' }]
        });

        if (!card) {
            // Unrecognized code
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/nfc/invalid`);
        }

        if (card.status === 'assigned' && card.vcard) {
            // Redirect to public vcard
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/vcard/${card.vcard.slug}`);
        } else {
            // Unassigned or missing vcard mapping - redirect to linking setup portal
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/nfc/setup/${shortCode.toUpperCase()}`);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error redirecting NFC.');
    }
});

module.exports = router;
