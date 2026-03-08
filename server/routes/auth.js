const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');
const AdminNotification = require('../models/AdminNotification');

const logActivity = require('../utils/logger');

// Generate Token Helper
const generateToken = (user) => {
    const payload = {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin // Include isAdmin
        }
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, selectedPlan } = req.body;

        // Fetch Global Security Settings from the primary admin
        const adminUser = await User.findOne({ where: { isAdmin: true } });
        let securityConfig = null;
        if (adminUser) {
            const adminSettings = await Settings.findOne({ where: { userId: adminUser.id } });
            if (adminSettings && adminSettings.securityConfig) {
                securityConfig = adminSettings.securityConfig;
            }
        }

        // 1. Enforce Allow Registration Policy
        if (securityConfig && securityConfig.allowRegistration === false) {
            return res.status(403).json({ error: 'User registration is currently disabled by the administrator.' });
        }

        // 2. Enforce Minimum Password Length
        const minLen = securityConfig?.minPasswordLength || 6;
        if (password.length < minLen) {
            return res.status(400).json({ error: `Password must be at least ${minLen} characters long.` });
        }

        // Check if user exists
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Get default plan
        const Plan = require('../models/Plan');
        const defaultPlan = await Plan.findOne({ where: { isDefault: true } });
        const assignedPlan = defaultPlan ? defaultPlan.name : 'Free';

        // Create User with default plan
        // Note: We intentionally do NOT allow setting isAdmin via API for security.
        // Admins must be promoted directly in DB or via a separate seed script.
        user = await User.create({
            name,
            email,
            password: hashedPassword,
            plan: assignedPlan, // Assign default plan
            lastLogin: new Date()
        });

        // Log Activity
        await logActivity(req, 'User Registered', `New user registration: ${email} - Plan: ${assignedPlan}`);

        // Notify Admin
        await AdminNotification.create({
            type: 'USER_REGISTER',
            message: `New User Registered: ${name}`,
            data: { userId: user.id, email: user.email, plan: assignedPlan }
        });

        // Return Token
        const token = generateToken(user);
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                selectedPlan: selectedPlan || null // Return selected plan for frontend to handle payment
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        // Update lastLogin
        user.lastLogin = new Date();
        await user.save();

        // Log Activity
        // Manually attach user to req for logger since this is a public route
        req.user = user;
        await logActivity(req, 'User Login', `User logged in from ${req.ip}`);

        // Return Token
        const token = generateToken(user);
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ME (Current User)
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE PROFILE (Current User)
router.put('/profile', require('../middleware/auth'), async (req, res) => {
    try {
        const { name, phone, company } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update allowed fields
        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone; // Allow empty string
        if (company !== undefined) user.company = company; // Allow empty string

        await user.save();

        // Log Activity
        await logActivity(req, 'Profile Updated', `User updated their profile: ${user.email}`);

        // Return updated user without password
        const updatedUser = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE PASSWORD (Current User)
router.put('/password', require('../middleware/auth'), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Enforce Minimum Password Length
        const adminUser = await User.findOne({ where: { isAdmin: true } });
        let minLen = 6;
        if (adminUser) {
            const adminSettings = await Settings.findOne({ where: { userId: adminUser.id } });
            if (adminSettings?.securityConfig?.minPasswordLength) {
                minLen = adminSettings.securityConfig.minPasswordLength;
            }
        }

        if (newPassword.length < minLen) {
            return res.status(400).json({ error: `New password must be at least ${minLen} characters long.` });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        // Log Activity
        await logActivity(req, 'Password Changed', `User changed their password: ${user.email}`);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE MY ACCOUNT
router.delete('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent admin from deleting themselves via this route
        if (user.isAdmin) {
            return res.status(403).json({ error: 'Super admins cannot delete their account from here. Please contact the database administrator.' });
        }

        // Delete associated data (cascade should handle FK relationships, but be explicit)
        const { Op } = require('sequelize');
        const contactModels = ['Contact', 'MessageLog', 'Campaign', 'Template', 'ActivityLog', 'SystemNotification'];
        for (const modelName of contactModels) {
            try {
                const Model = require(`../models/${modelName}`);
                if (Model && typeof Model.destroy === 'function') {
                    await Model.destroy({ where: { userId } });
                }
            } catch (e) {
                // Model might not exist or have userId - skip silently
            }
        }

        // Delete Settings
        try {
            await Settings.destroy({ where: { userId } });
        } catch (e) { /* ignore */ }

        // Finally delete the user
        await user.destroy();

        res.json({ message: 'Account permanently deleted.' });
    } catch (err) {
        console.error('[DELETE ACCOUNT] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
