const express = require('express');
const router = express.Router();
const multer = require('multer');
const admZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const AddonModel = require('../models/Addon'); // Require directly as models might not export destructured
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const logActivity = require('../utils/logger');

// Setup multer for plugin uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, '../uploads/plugins_temp');
        try {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        } catch (mkdirErr) {
            return cb(mkdirErr);
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, `plugin-${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.zip' || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.mimetype === 'application/octet-stream') {
            cb(null, true);
        } else {
            cb(new Error('Only .zip files are allowed for plugin uploads.'));
        }
    }
});

// Image upload for banners
const imageStorage = multer.memoryStorage();
const imageUpload = multer({
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files allowed'));
    }
});

router.use(auth, admin);

// GET all addons
router.get('/', async (req, res) => {
    try {
        const addons = await AddonModel.findAll();
        // Calculate users bound to each addon
        let userAddons = [];
        try {
            userAddons = await require('../models/UserAddon').findAll();
        } catch (e) { console.error("Could not fetch user addons for count", e); }

        const addonsWithCount = addons.map(addon => {
            const count = userAddons.filter(ua => ua.addonId === addon.id && ua.status === 'active').length;
            return {
                ...addon.toJSON(),
                usersCount: count
            };
        });

        res.json(addonsWithCount);
    } catch (err) {
        console.error("GET Addons Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Deploy a new addon via Zip
router.post('/upload', (req, res) => {
    upload.single('pluginZip')(req, res, async (err) => {
        if (err) {
            console.error("Multer Exception:", err.message, err.stack);
            return res.status(500).json({ error: 'Upload failed: ' + err.message });
        }
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No zip file uploaded' });
            }

            const zipPath = req.file.path;
            const zip = new admZip(zipPath);
            const zipEntries = zip.getEntries();

            let manifest = null;

            // Find manifest.json
            for (const entry of zipEntries) {
                if (entry.entryName === 'manifest.json') {
                    manifest = JSON.parse(zip.readAsText(entry));
                    break;
                }
            }

            if (!manifest || !manifest.module_key || !manifest.name) {
                try { fs.unlinkSync(zipPath); } catch (e) {} // cleanup safely
                return res.status(400).json({ error: 'Invalid plugin package: missing or invalid manifest.json' });
            }

            const extractPath = path.join(__dirname, `../plugins/addon_${manifest.module_key}`);

            // Extract to plugins directory
            zip.extractAllTo(extractPath, true);
            try { fs.unlinkSync(zipPath); } catch (e) { /* Windows adm-zip lock ignore */ } // cleanup temp zip

            // Check if addon already exists in DB
            let addon = await AddonModel.findOne({ where: { module_key: manifest.module_key } });

            if (addon) {
                // Update existing addon details if necessary, but typically keep pricing from DB, just update code.
                try {
                    addon.moduleHash = Date.now().toString(); // Trigger a potential reload hook if implemented
                    await addon.save();
                } catch (saveErr) {
                    // If moduleHash column is missing in DB schema, ignore the error and proceed
                    console.warn('Could not save moduleHash, might need DB alter:', saveErr.message);
                }
            } else {
                // Fetch global currency from Settings
                let globalCurrency = 'USD';
                try {
                    const adminUser = await require('../models/User').findOne({ where: { isAdmin: true } });
                    if (adminUser) {
                        const settings = await require('../models/Settings').findOne({ where: { userId: adminUser.id } });
                        if (settings && settings.currency) {
                            globalCurrency = settings.currency;
                        }
                    }
                } catch (e) { console.error(e); }

                // Create new record
                addon = await AddonModel.create({
                    name: manifest.name,
                    description: manifest.description || '',
                    module_key: manifest.module_key,
                    price: parseFloat(req.body.price || manifest.default_price || 0),
                    currency: req.body.currency || globalCurrency,
                    isRecurring: req.body.isRecurring === 'true' || manifest.is_recurring,
                    recurringInterval: req.body.recurringInterval || manifest.recurring_interval || 'month',
                    isActive: true,
                    features: manifest.features || []
                });
            }

            await logActivity(req, 'Plugin Uploaded', `Admin uploaded/updated plugin: ${manifest.name}`);
            return res.json({ message: 'Plugin deployed successfully', addon });
        } catch (err) {
            console.error("Plugin Upload Error:", err);
            return res.status(500).json({ error: 'Server Error during deployment: ' + err.message });
        }
    }); // End multer wrapper
});

// PUT Update addon metadata/pricing
router.put('/:id', async (req, res) => {
    try {
        const addon = await AddonModel.findByPk(req.params.id);
        if (!addon) return res.status(404).json({ error: 'Addon not found' });

        const { name, description, shortDescription, longDescription, price, isActive, isRecurring, recurringInterval, features, bannerUrl, demoVideoUrl, badge } = req.body;

        if (name !== undefined) addon.name = name;
        if (description !== undefined) addon.description = description;
        if (shortDescription !== undefined) addon.shortDescription = shortDescription;
        if (longDescription !== undefined) addon.longDescription = longDescription;
        if (price !== undefined) addon.price = price;
        if (isActive !== undefined) addon.isActive = isActive;
        if (isRecurring !== undefined) addon.isRecurring = isRecurring;
        if (recurringInterval !== undefined) addon.recurringInterval = recurringInterval;
        if (features !== undefined) addon.features = features;
        if (bannerUrl !== undefined) addon.bannerUrl = bannerUrl;
        if (demoVideoUrl !== undefined) addon.demoVideoUrl = demoVideoUrl;
        if (badge !== undefined) addon.badge = badge;

        // NOTE: If Stripe integration was fully active, changing price here would need to create a new Stripe Price object.

        await addon.save();
        await logActivity(req, 'Addon Updated', `Admin updated configuration for addon: ${addon.name}`);
        res.json(addon);
    } catch (err) {
        console.error("Update Addon Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Upload banner image for addon
const storageProvider = require('../utils/storageProvider');

router.post('/:id/upload-banner', storageProvider('addon_banners').single('banner'), async (req, res) => {
    try {
        const addon = await AddonModel.findByPk(req.params.id);
        if (!addon) return res.status(404).json({ error: 'Addon not found' });
        if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

        // Delete old banner file if it was a local upload
        if (addon.bannerUrl && addon.bannerUrl.startsWith('/uploads/')) {
            try {
                const oldPath = path.join(__dirname, '..', 'public', addon.bannerUrl);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (e) { }
        }

        addon.bannerUrl = req.file.publicUrl;
        await addon.save();

        res.json({ bannerUrl: addon.bannerUrl });
    } catch (err) {
        console.error("Banner Upload Error:", err);
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

// POST Upload demo video for addon
router.post('/:id/upload-video', storageProvider('addon_videos').single('video'), async (req, res) => {
    try {
        const addon = await AddonModel.findByPk(req.params.id);
        if (!addon) return res.status(404).json({ error: 'Addon not found' });
        if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });

        addon.demoVideoUrl = req.file.publicUrl;
        await addon.save();

        res.json({ demoVideoUrl: addon.demoVideoUrl });
    } catch (err) {
        console.error("Video Upload Error:", err);
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

// DELETE Addon
router.delete('/:id', async (req, res) => {
    try {
        const addon = await AddonModel.findByPk(req.params.id);
        if (!addon) return res.status(404).json({ error: 'Addon not found' });

        // Manually cascade delete to prevent SequelizeForeignKeyConstraintError
        try {
            await require('../models/UserAddon').destroy({ where: { addonId: addon.id } });
        } catch (e) { console.error("Could not cascade delete UserAddons", e); }

        await addon.destroy();

        // Clean up the extracted plugin folder
        try {
            const extractPath = path.join(__dirname, `../plugins/addon_${addon.module_key}`);
            if (fs.existsSync(extractPath)) {
                fs.rmSync(extractPath, { recursive: true, force: true });
            }
        } catch (e) { console.error("Could not delete plugin folder", e); }

        await logActivity(req, 'Addon Deleted', `Admin deleted addon: ${addon.name}`);
        res.json({ message: 'Addon deleted' });
    } catch (err) {
        console.error("Delete Addon Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
