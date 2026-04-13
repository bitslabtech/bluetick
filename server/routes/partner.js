const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const TechPartner = require('../models/TechPartner');

// @route   POST /api/partner/apply
// @desc    Apply for Tech Partner program
// @access  Private
router.post('/apply', auth, async (req, res) => {
    try {
        const { phoneNumber, notes } = req.body;
        const user = await User.findByPk(req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.techPartnerStatus !== 'none' && user.techPartnerStatus !== 'rejected') {
            return res.status(400).json({ error: 'Application already in progress or approved' });
        }

        // Save application notes and set status to pending
        await user.update({
            techPartnerStatus: 'pending',
            techPartnerNotes: JSON.stringify({ phoneNumber, notes, appliedAt: new Date().toISOString() })
        });

        // Notify SuperAdmin
        const AdminNotification = require('../models/AdminNotification');
        await AdminNotification.create({
            type: 'TECH_PARTNER_APP',
            message: `New Tech Partner Application from ${user.name}`,
            data: { userId: user.id, email: user.email, phoneNumber }
        });

        res.json({ message: 'Application submitted successfully', status: user.techPartnerStatus });
    } catch (err) {
        console.error('Error applying for tech partner:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/partner/dashboard
// @desc    Get Tech Partner dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        
        if (!user || user.techPartnerStatus !== 'approved') {
            return res.status(403).json({ error: 'Not an approved tech partner' });
        }

        const partnerProfile = await TechPartner.findOne({ where: { userId: user.id } });
        if (!partnerProfile) {
            // Auto-heal data inconsistencies: if the user says approved but no profile exists, revert them
            await user.update({ techPartnerStatus: 'none' });
            return res.status(404).json({ error: 'Tech partner profile not found, reverting status to none' });
        }

        res.json({
            status: user.techPartnerStatus,
            profile: partnerProfile
        });
    } catch (err) {
        console.error('Error fetching partner dashboard:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
