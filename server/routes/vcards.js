const express = require('express');
const router = express.Router();
const Vcard = require('../models/Vcard');
const User = require('../models/User');
const Plan = require('../models/Plan');
const VcardEnquiry = require('../models/VcardEnquiry');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storageProvider = require('../utils/storageProvider');

// ==========================================
// HERO MEDIA UPLOAD LIMITS & FILE FILTERS
// ==========================================
const IMAGE_LIMIT_MB = 5;
const VIDEO_LIMIT_MB = 50;

const imageFileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Only JPG, PNG, WEBP, GIF images are allowed (max ${IMAGE_LIMIT_MB}MB)`));
};

const videoFileFilter = (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Only MP4, WEBM, OGG, MOV videos are allowed (max ${VIDEO_LIMIT_MB}MB)`));
};


// Helper function to build vCard string
const buildVcfString = (vcard) => {
    let vcf = `BEGIN:VCARD\nVERSION:3.0\n`;
    vcf += `FN:${vcard.name}\n`;
    
    // Split name roughly if possible
    const nameParts = vcard.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    vcf += `N:${lastName};${firstName};;;\n`;
    
    if (vcard.designation) vcf += `TITLE:${vcard.designation}\n`;
    if (vcard.company) vcf += `ORG:${vcard.company}\n`;
    if (vcard.phone) vcf += `TEL;TYPE=CELL:${vcard.phone}\n`;
    if (vcard.whatsappNumber) vcf += `TEL;TYPE=WORK,MSG:${vcard.whatsappNumber}\n`;
    if (vcard.email) vcf += `EMAIL;TYPE=WORK,INTERNET:${vcard.email}\n`;
    if (vcard.website) vcf += `URL:${vcard.website}\n`;
    if (vcard.bio) vcf += `NOTE:${vcard.bio.replace(/\n/g, '\\n')}\n`; // Escape newlines in bio
    
    // Location parsing (simplified)
    if (vcard.location) {
        vcf += `ADR;TYPE=WORK:;;${vcard.location};;;;\n`;
    }

    vcf += `END:VCARD`;
    return vcf;
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Get Public vCard by slug
router.get('/public/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        const vcard = await Vcard.findOne({
            where: { slug, status: 'active' },
            include: [{
                model: User,
                as: 'owner',
                attributes: ['id', 'plan', 'planStatus']
            }]
        });

        if (!vcard) {
            return res.status(404).json({ error: 'vCard not found or inactive' });
        }

        const owner = vcard.owner;
        if (!owner || owner.planStatus !== 'Active') {
            return res.status(403).json({ error: 'This vCard is currently unavailable.' });
        }

        // Fetch owner's plan limit/access
        const ownerPlan = await Plan.findOne({ where: { name: owner.plan } });
        if (!ownerPlan || !ownerPlan.allowVcard) {
             return res.status(403).json({ error: 'This vCard is currently unavailable due to plan restrictions.' });
        }

        // Increment Views
        await vcard.increment('views');

        // Note: For public view we might want to sanitize but Sequelize output should be safe if no secrets are in it.
        // Also need to mask the password if it's set
        const responseData = vcard.toJSON();
        if (responseData.password) {
            responseData.hasPassword = true;
            delete responseData.password;
        }

        const Settings = require('../models/Settings');
        const adminUser = await User.findOne({ where: { isAdmin: true } });
        if (adminUser) {
            const adminSettings = await Settings.findOne({ where: { userId: adminUser.id } });
            responseData.appName = adminSettings?.appName || 'Bluetick';
        } else {
            responseData.appName = 'Bluetick';
        }

        res.json(responseData);
    } catch (error) {
        console.error("Fetch Public vCard error:", error);
        res.status(500).json({ error: 'Server error fetching vCard' });
    }
});

// Download VCF by slug
router.get('/public/:slug/download-vcf', async (req, res) => {
    try {
        const { slug } = req.params;
        const vcard = await Vcard.findOne({ where: { slug, status: 'active' } });

        if (!vcard) {
            return res.status(404).send('vCard not found');
        }

        const vcfContent = buildVcfString(vcard);

        res.set('Content-Type', 'text/vcard; name="contact.vcf"');
        res.set('Content-Disposition', `attachment; filename="${vcard.slug}-contact.vcf"`);
        res.send(vcfContent);
        
    } catch (error) {
        console.error("VCF Download Error:", error);
        res.status(500).send('Error generating vCard');
    }
});

// Submit Enquiry/Booking from public vCard
router.post('/public/:slug/enquiry', async (req, res) => {
    try {
        const { slug } = req.params;
        const vcard = await Vcard.findOne({ where: { slug, status: 'active' } });
        if (!vcard) return res.status(404).json({ error: 'vCard not found' });

        const { name, email, phone, message, type, appointmentDate } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const newEnquiry = await VcardEnquiry.create({
            vcardId: vcard.id,
            userId: vcard.userId,
            type: type || 'enquiry',
            name,
            email,
            phone,
            message,
            appointmentDate
        });

        // Email Forwarding Logic
        if (vcard.enquiryForm && vcard.enquiryForm.forwardEmailEnabled && vcard.enquiryForm.recipientEmail) {
            try {
                const Settings = require('../models/Settings');
                const userSettings = await Settings.findOne({ where: { userId: vcard.userId } });
                const smtpConfig = userSettings?.smtpConfig;

                if (smtpConfig && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
                    const nodemailer = require('nodemailer');
                    const transporter = nodemailer.createTransport({
                        host: smtpConfig.host,
                        port: Number(smtpConfig.port || 587),
                        secure: smtpConfig.secure || false,
                        auth: {
                            user: smtpConfig.user,
                            pass: smtpConfig.pass
                        }
                    });

                    const mailOptions = {
                        from: smtpConfig.fromEmail || smtpConfig.user,
                        to: vcard.enquiryForm.recipientEmail,
                        subject: `New vCard Enquiry from ${name}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <h2 style="color: #4f46e5; margin-top: 0;">New vCard Enquiry</h2>
                                <p>You have received a new message from your vCard: <strong>${vcard.vcardName}</strong></p>
                                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                    <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9; width: 120px;"><strong>Name:</strong></td><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${name}</td></tr>
                                    <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;"><strong>Email:</strong></td><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${email || '-'}</td></tr>
                                    <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;"><strong>Phone:</strong></td><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${phone || '-'}</td></tr>
                                    <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;"><strong>Type:</strong></td><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${type || 'Enquiry'}</td></tr>
                                    ${appointmentDate ? `<tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;"><strong>Date:</strong></td><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${new Date(appointmentDate).toLocaleString()}</td></tr>` : ''}
                                </table>
                                <h3 style="margin-top: 25px; margin-bottom: 10px;">Message:</h3>
                                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; white-space: pre-wrap;">${message || 'No message provided.'}</div>
                            </div>
                        `
                    };

                    transporter.sendMail(mailOptions).catch(err => console.error("[SMTP Fwd] Error sending mail:", err.message));
                } else {
                    console.warn("[SMTP Fwd] User SMTP config missing or incomplete for user:", vcard.userId);
                }
            } catch (emailErr) {
                console.error("[SMTP Fwd] Logic error:", emailErr.message);
            }
        }

        res.status(201).json({ success: true, message: 'Submitted successfully' });
    } catch (error) {
        console.error("Submit Enquiry Error:", error);
        res.status(500).json({ error: 'Failed to submit enquiry' });
    }
});

// ==========================================
// PROTECTED USER ROUTES
// ==========================================
router.use(auth);

// ---- Hero Media Upload ----
// POST /api/vcards/upload/hero-image  (max 5 MB)
router.post('/upload/hero-image',
    storageProvider('vcard-hero', {
        limits: { fileSize: IMAGE_LIMIT_MB * 1024 * 1024 },
        fileFilter: imageFileFilter
    }).single('file'),
    async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        res.json({ url: req.file.publicUrl, filename: req.file.filename || req.file.key, size: req.file.size });
    }
);

// POST /api/vcards/upload/hero-video  (max 50 MB)
router.post('/upload/hero-video',
    storageProvider('vcard-hero', {
        limits: { fileSize: VIDEO_LIMIT_MB * 1024 * 1024 },
        fileFilter: videoFileFilter
    }).single('file'),
    async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        res.json({ url: req.file.publicUrl, filename: req.file.filename || req.file.key, size: req.file.size });
    }
);


// Get all vCards for logged in user
router.get('/', async (req, res) => {
    try {
        const vcards = await Vcard.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(vcards);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vCards' });
    }
});

// ==========================================
// ENQUIRY / BOOKING MANAGEMENT ROUTES
// ==========================================

// Get all enquiries/bookings for the user
router.get('/data/enquiries', async (req, res) => {
    try {
        const enquiries = await VcardEnquiry.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        
        // Also fetch the vcard names to attach to the data
        const vcardIds = [...new Set(enquiries.map(e => e.vcardId))];
        const vcards = await Vcard.findAll({ where: { id: vcardIds }, attributes: ['id', 'name', 'slug'] });
        const vcardMap = {};
        vcards.forEach(v => vcardMap[v.id] = { name: v.name, slug: v.slug });
        
        const enriched = enquiries.map(e => {
            const data = e.toJSON();
            data.vcardName = vcardMap[e.vcardId]?.name || 'Unknown vCard';
            data.vcardSlug = vcardMap[e.vcardId]?.slug || '';
            return data;
        });

        res.json(enriched);
    } catch (error) {
        console.error("Fetch Enquiries Error:", error);
        res.status(500).json({ error: 'Failed to fetch enquiries' });
    }
});

// Update enquiry status
router.put('/data/enquiries/:id/status', async (req, res) => {
    try {
        const enquiry = await VcardEnquiry.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

        enquiry.status = req.body.status;
        await enquiry.save();
        
        res.json(enquiry);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update enquiry' });
    }
});

// Delete enquiry
router.delete('/data/enquiries/:id', async (req, res) => {
    try {
        const enquiry = await VcardEnquiry.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

        await enquiry.destroy();
        res.json({ success: true, message: 'Enquiry deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete enquiry' });
    }
});

// ==========================================
// GLOBAL VCARD SETTINGS ROUTES
// ==========================================

// Get global vCard settings
router.get('/data/settings', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, { attributes: ['vcardPreferences'] });
        res.json(user.vcardPreferences || { emailNotifications: true, defaultEnquiryEmail: '', appointmentTimezone: 'UTC' });
    } catch (error) {
        console.error("Fetch Settings Error:", error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update global vCard settings
router.put('/data/settings', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const newPreferences = { ...user.vcardPreferences, ...req.body };
        await user.update({ vcardPreferences: newPreferences });
        res.json({ success: true, settings: newPreferences });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Get specific vCard for editing
router.get('/:id', async (req, res) => {
    try {
        const vcard = await Vcard.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!vcard) return res.status(404).json({ error: 'vCard not found' });
        res.json(vcard);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vCard' });
    }
});

// Create new vCard
router.post('/', async (req, res) => {
    try {
        // Enforce Plan Limits
        const userPlan = await Plan.findOne({ where: { name: req.user.plan } });
        if (!userPlan || !userPlan.allowVcard) {
            return res.status(403).json({ error: 'Your current plan does not support vCards' });
        }

        const currentCount = await Vcard.count({ where: { userId: req.user.id } });
        if (userPlan.vcardLimit > 0 && currentCount >= userPlan.vcardLimit) {
            return res.status(403).json({ error: `Plan limit reached. You can only create ${userPlan.vcardLimit} vCards.` });
        }

        // Validate Slug uniqueness
        const { slug } = req.body;
        if (!slug) return res.status(400).json({ error: 'Slug is required' });

        const existingSlug = await Vcard.findOne({ where: { slug } });
        if (existingSlug) {
            return res.status(400).json({ error: 'This URL slug is already taken.' });
        }

        const newVcard = await Vcard.create({
            ...req.body,
            userId: req.user.id
        });

        res.status(201).json(newVcard);
    } catch (error) {
        console.error("Create vCard error:", error);
        res.status(500).json({ error: 'Failed to create vCard' });
    }
});

// Update an existing vCard
router.put('/:id', async (req, res) => {
    try {
        const vcard = await Vcard.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!vcard) return res.status(404).json({ error: 'vCard not found' });

        // If trying to change slug, check uniqueness
        if (req.body.slug && req.body.slug !== vcard.slug) {
            const existingSlug = await Vcard.findOne({ where: { slug: req.body.slug } });
            if (existingSlug) {
                return res.status(400).json({ error: 'This URL slug is already taken.' });
            }
        }

        await vcard.update(req.body);
        res.json(vcard);
    } catch (error) {
        console.error("Update vCard error:", error);
        res.status(500).json({ error: 'Failed to update vCard' });
    }
});

// Delete vCard
router.delete('/:id', async (req, res) => {
    try {
        const vcard = await Vcard.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!vcard) return res.status(404).json({ error: 'vCard not found' });

        await vcard.destroy();
        res.json({ success: true, message: 'vCard deleted via API' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete vCard' });
    }
});

module.exports = router;
