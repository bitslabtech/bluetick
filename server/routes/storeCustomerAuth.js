/**
 * Store Customer Authentication Routes
 *
 * All routes are prefixed: /api/store-customer/:storeSlug
 *
 * Public:
 *   POST   /register           - Email+Password registration
 *   POST   /login              - Email+Password login
 *   POST   /send-otp           - Send WhatsApp OTP
 *   POST   /verify-otp         - Verify OTP → auto register or login
 *   POST   /forgot-password    - Send password reset email (placeholder)
 *   POST   /reset-password     - Reset password with token
 *
 * Protected (requires store customer JWT):
 *   GET    /me                 - Get profile
 *   PUT    /me                 - Update name/phone
 *   PUT    /me/password        - Change password
 *   GET    /orders             - Get all my orders
 *   GET    /orders/:id         - Get single order detail
 *   GET    /addresses          - Get saved addresses
 *   POST   /addresses          - Add new address
 *   PUT    /addresses/:idx     - Update address by index
 *   DELETE /addresses/:idx     - Delete address by index
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // allows :storeSlug from parent
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const WaStore = require('../models/WaStore');
const StoreCustomer = require('../models/StoreCustomer');
const WaOrder = require('../models/WaOrder');
const storeCustomerAuth = require('../middleware/storeCustomerAuth');
const { createOtp, verifyOtp, checkSendLimits, normalizePhone } = require('../utils/otpStore');
const Settings = require('../models/Settings');
const axios = require('axios');

// ── Helper ──────────────────────────────────────────────────────────────────

const signToken = (customer) =>
    jwt.sign(
        { storeCustomer: { id: customer.id, storeId: customer.storeId } },
        process.env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '30d' }
    );

/** Load store and verify customerAuth is enabled */
const loadStore = async (slug) => {
    const store = await WaStore.findOne({ where: { slug } });
    if (!store) return { error: 'Store not found', code: 404 };
    const authConfig = store.customerAuthConfig || {};
    if (!authConfig.enabled) return { error: 'Customer accounts are not enabled for this store.', code: 403 };
    return { store, authConfig };
};

/**
 * Send a WhatsApp OTP using the store owner's WhatsApp Business credentials.
 */
const sendWhatsAppOtp = async (store, phone, otp) => {
    try {
        const settings = await Settings.findOne({ where: { userId: store.userId } });
        if (!settings?.metaPhoneNumberId || !settings?.metaAccessToken) {
            return { sent: false, reason: 'Store WhatsApp not configured' };
        }
        const token = settings.metaAccessToken.replace(/[^\x20-\x7E]/g, '').trim();
        const phoneId = settings.metaPhoneNumberId.replace(/[^\x20-\x7E]/g, '').trim();
        const storeName = store.name || 'Our Store';

        const tmplName = store.customerAuthConfig?.otpTemplateName;
        const tmplLang = store.customerAuthConfig?.otpTemplateLanguage || 'en';

        let payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
        };

        if (tmplName) {
            payload.type = 'template';
            payload.template = {
                name: tmplName,
                language: { code: tmplLang },
                components: [
                    {
                        type: 'body',
                        parameters: [{ type: 'text', text: otp }]
                    }
                ]
            };
        } else {
            // Fallback for stores that haven't selected a template yet
            payload.type = 'text';
            payload.text = {
                body: `🔐 Your verification code for ${storeName} is:\n\n*${otp}*\n\nThis code expires in 5 minutes. Do not share it with anyone.`
            };
        }

        try {
            await axios.post(
                `https://graph.facebook.com/v21.0/${phoneId}/messages`,
                payload,
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            return { sent: true };
        } catch (err) {
            // Meta API Error 131008: Required parameter is missing.
            // This happens if the template requires a button component (e.g. autofill).
            if (tmplName && err.response?.data?.error?.code === 131008) {
                console.log('[StoreCustomerAuth] Retrying OTP template with URL button component...');
                payload.template.components.push({
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [{ type: 'text', text: otp }]
                });
                
                try {
                    await axios.post(
                        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
                        payload,
                        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
                    );
                    return { sent: true };
                } catch (retryErr) {
                    console.error('[StoreCustomerAuth] WhatsApp OTP retry failed:', retryErr.response?.data || retryErr.message);
                    return { sent: false, reason: retryErr.message };
                }
            }
            
            console.error('[StoreCustomerAuth] WhatsApp OTP send failed:', err.response?.data || err.message);
            return { sent: false, reason: err.message };
        }
    } catch (err) {
        console.error('[StoreCustomerAuth] Unexpected error in sendWhatsAppOtp:', err);
        return { sent: false, reason: err.message };
    }
};

// ══════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ══════════════════════════════════════════════════════════════════

// ── GET /config — let the frontend know which auth methods are enabled ────────
router.get('/config', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const store = await WaStore.findOne({
            where: { slug: storeSlug },
            attributes: ['id', 'name', 'customerAuthConfig']
        });
        if (!store) return res.status(404).json({ error: 'Store not found' });
        const cfg = store.customerAuthConfig || {};
        res.json({
            enabled: cfg.enabled || false,
            methods: cfg.methods || ['email_password'],
            allowGuestCheckout: cfg.allowGuestCheckout !== false,
            requireLoginForCheckout: cfg.requireLoginForCheckout || false,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ── POST /register — Email + Password ────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { name, email, password, phone } = req.body;

        const { store, authConfig, error, code } = await loadStore(storeSlug);
        if (error) return res.status(code).json({ error });

        if (!authConfig.methods?.includes('email_password')) {
            return res.status(400).json({ error: 'Email/password registration is not enabled for this store.' });
        }

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Check duplicate email in this store
        const existing = await StoreCustomer.findOne({ where: { storeId: store.id, email } });
        if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

        const passwordHash = await bcrypt.hash(password, 10);

        const customer = await StoreCustomer.create({
            storeId: store.id,
            name,
            email,
            phone: phone ? normalizePhone(phone) : null,
            password: passwordHash,
            isVerified: true, // auto-verify on registration (no email OTP step)
        });

        const token = signToken(customer);
        return res.status(201).json({
            token,
            customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
        });
    } catch (err) {
        console.error('[StoreCustomerAuth] Register error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// ── POST /login — Email + Password ───────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { email, password } = req.body;

        const { store, authConfig, error, code } = await loadStore(storeSlug);
        if (error) return res.status(code).json({ error });

        if (!authConfig.methods?.includes('email_password')) {
            return res.status(400).json({ error: 'Email/password login is not enabled for this store.' });
        }

        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const customer = await StoreCustomer.findOne({ where: { storeId: store.id, email } });
        if (!customer || !customer.password) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

        const token = signToken(customer);
        return res.json({
            token,
            customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
        });
    } catch (err) {
        console.error('[StoreCustomerAuth] Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// ── POST /send-otp — WhatsApp OTP ────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { phone } = req.body;

        const { store, authConfig, error, code } = await loadStore(storeSlug);
        if (error) return res.status(code).json({ error });

        if (!authConfig.methods?.includes('whatsapp_otp')) {
            return res.status(400).json({ error: 'WhatsApp OTP login is not enabled for this store.' });
        }

        if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

        const normalizedPhone = normalizePhone(phone);
        const otpConfig = { otpExpirySec: 300, resendCooldownSec: 60, maxResendPerHour: 5, maxVerifyAttempts: 5 };

        // Rate limit check
        const limitCheck = checkSendLimits(normalizedPhone, otpConfig);
        if (!limitCheck.allowed) {
            return res.status(429).json({ error: limitCheck.reason, retryAfterSec: limitCheck.retryAfterSec });
        }

        const otp = createOtp(normalizedPhone, otpConfig);
        const result = await sendWhatsAppOtp(store, normalizedPhone, otp);

        if (!result.sent) {
            return res.status(500).json({ error: 'Could not send WhatsApp OTP. Please try email/password login.' });
        }

        return res.json({ message: `OTP sent to WhatsApp number ending in ${normalizedPhone.slice(-4)}` });
    } catch (err) {
        console.error('[StoreCustomerAuth] Send OTP error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ── POST /verify-otp — WhatsApp OTP verify → auto register or login ──────────
router.post('/verify-otp', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { phone, otp, name } = req.body;

        const { store, authConfig, error, code } = await loadStore(storeSlug);
        if (error) return res.status(code).json({ error });

        if (!authConfig.methods?.includes('whatsapp_otp')) {
            return res.status(400).json({ error: 'WhatsApp OTP login is not enabled for this store.' });
        }

        if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required.' });

        const normalizedPhone = normalizePhone(phone);
        const otpConfig = { maxVerifyAttempts: 5 };

        const result = verifyOtp(normalizedPhone, otp, otpConfig);
        if (!result.valid) return res.status(400).json({ error: result.reason });

        // Find or auto-create the customer
        let [customer, created] = await StoreCustomer.findOrCreate({
            where: { storeId: store.id, phone: normalizedPhone },
            defaults: {
                name: name || `Customer ${normalizedPhone.slice(-4)}`,
                phone: normalizedPhone,
                isVerified: true,
            }
        });

        if (!created) {
            // Update isVerified just in case
            if (!customer.isVerified) {
                customer.isVerified = true;
                await customer.save();
            }
        }

        const token = signToken(customer);
        return res.json({
            token,
            isNewCustomer: created,
            customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
        });
    } catch (err) {
        console.error('[StoreCustomerAuth] Verify OTP error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ── POST /forgot-password ─────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { email } = req.body;

        const { store, error, code } = await loadStore(storeSlug);
        if (error) return res.status(code).json({ error });

        if (!email) return res.status(400).json({ error: 'Email is required.' });

        const customer = await StoreCustomer.findOne({ where: { storeId: store.id, email } });
        // Always return success to prevent email enumeration
        if (!customer || !customer.password) {
            return res.json({ message: 'If this email is registered, you will receive a reset link.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        customer.resetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        customer.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await customer.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/store/${storeSlug}/account/reset-password?token=${resetToken}`;

        // TODO: Send via nodemailer. For now log to console in dev.
        console.log(`[StoreCustomerAuth] Password reset link for ${email}: ${resetUrl}`);

        return res.json({ message: 'If this email is registered, you will receive a reset link.' });
    } catch (err) {
        console.error('[StoreCustomerAuth] Forgot password error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ── POST /reset-password ──────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { token, password } = req.body;

        const { store, error, code } = await loadStore(storeSlug);
        if (error) return res.status(code).json({ error });

        if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const customer = await StoreCustomer.findOne({
            where: {
                storeId: store.id,
                resetToken: hashedToken,
            }
        });

        if (!customer || !customer.resetTokenExpiry || new Date(customer.resetTokenExpiry) < new Date()) {
            return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
        }

        customer.password = await bcrypt.hash(password, 10);
        customer.resetToken = null;
        customer.resetTokenExpiry = null;
        await customer.save();

        return res.json({ message: 'Password has been reset successfully. You can now log in.' });
    } catch (err) {
        console.error('[StoreCustomerAuth] Reset password error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ══════════════════════════════════════════════════════════════════
// PROTECTED ROUTES (require store customer JWT)
// ══════════════════════════════════════════════════════════════════

// ── GET /me ───────────────────────────────────────────────────────────────────
router.get('/me', storeCustomerAuth, async (req, res) => {
    const c = req.storeCustomer;
    res.json({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        isVerified: c.isVerified,
        savedAddresses: c.savedAddresses || [],
    });
});

// ── PUT /me ───────────────────────────────────────────────────────────────────
router.put('/me', storeCustomerAuth, async (req, res) => {
    try {
        const { name, phone } = req.body;
        const customer = req.storeCustomer;

        if (name) customer.name = name.trim();
        if (phone) customer.phone = normalizePhone(phone);

        await customer.save();
        res.json({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// ── PUT /me/password ──────────────────────────────────────────────────────────
router.put('/me/password', storeCustomerAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const customer = req.storeCustomer;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }

        // Fetch full customer with password
        const fullCustomer = await StoreCustomer.findByPk(customer.id);
        if (!fullCustomer.password) {
            return res.status(400).json({ error: 'This account uses WhatsApp OTP login. Password cannot be changed.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, fullCustomer.password);
        if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect.' });

        fullCustomer.password = await bcrypt.hash(newPassword, 10);
        await fullCustomer.save();
        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// ── GET /orders ───────────────────────────────────────────────────────────────
router.get('/orders', storeCustomerAuth, async (req, res) => {
    try {
        const orders = await WaOrder.findAll({
            where: { storeCustomerId: req.storeCustomer.id },
            order: [['createdAt', 'DESC']],
            attributes: [
                'id', 'orderNumber', 'status', 'total', 'subtotal', 'currency',
                'items', 'customerName', 'customerAddress', 'trackingUrl', 'trackingProvider',
                'createdAt', 'couponCode', 'discountAmount', 'taxAmount'
            ]
        });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// ── GET /orders/:id ───────────────────────────────────────────────────────────
router.get('/orders/:id', storeCustomerAuth, async (req, res) => {
    try {
        const order = await WaOrder.findOne({
            where: { id: req.params.id, storeCustomerId: req.storeCustomer.id }
        });
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// ── GET /addresses ────────────────────────────────────────────────────────────
router.get('/addresses', storeCustomerAuth, async (req, res) => {
    res.json(req.storeCustomer.savedAddresses || []);
});

// ── POST /addresses ───────────────────────────────────────────────────────────
router.post('/addresses', storeCustomerAuth, async (req, res) => {
    try {
        const { label, name, phone, address, city, state, pincode, isDefault } = req.body;
        const customer = req.storeCustomer;
        const addresses = [...(customer.savedAddresses || [])];

        const newAddress = { label: label || 'Home', name, phone, address, city, state, pincode, isDefault: !!isDefault };

        // If marked as default, unset all others
        if (newAddress.isDefault) {
            addresses.forEach(a => { a.isDefault = false; });
        }

        addresses.push(newAddress);
        customer.savedAddresses = addresses;
        await customer.save();
        res.status(201).json(addresses);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// ── PUT /addresses/:idx ───────────────────────────────────────────────────────
router.put('/addresses/:idx', storeCustomerAuth, async (req, res) => {
    try {
        const idx = parseInt(req.params.idx);
        const customer = req.storeCustomer;
        const addresses = [...(customer.savedAddresses || [])];

        if (idx < 0 || idx >= addresses.length) return res.status(404).json({ error: 'Address not found.' });

        const updated = { ...addresses[idx], ...req.body };
        if (updated.isDefault) addresses.forEach(a => { a.isDefault = false; });
        addresses[idx] = updated;

        customer.savedAddresses = addresses;
        await customer.save();
        res.json(addresses);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// ── DELETE /addresses/:idx ────────────────────────────────────────────────────
router.delete('/addresses/:idx', storeCustomerAuth, async (req, res) => {
    try {
        const idx = parseInt(req.params.idx);
        const customer = req.storeCustomer;
        const addresses = [...(customer.savedAddresses || [])];

        if (idx < 0 || idx >= addresses.length) return res.status(404).json({ error: 'Address not found.' });

        addresses.splice(idx, 1);
        customer.savedAddresses = addresses;
        await customer.save();
        res.json(addresses);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
