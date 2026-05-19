const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Sequelize, DataTypes } = require('sequelize');

const ENV_PATH = path.join(__dirname, '../.env');

// ── Helper: is setup complete? ─────────────────────────────────────────────
const isSetupComplete = () => process.env.SETUP_COMPLETE === 'true';

// ── Helper: write .env file ────────────────────────────────────────────────
const writeEnvFile = (values) => {
    const lines = Object.entries(values)
        .map(([k, v]) => `${k}=${v ?? ''}`)
        .join('\n');
    fs.writeFileSync(ENV_PATH, lines + '\n', 'utf8');
};

// ── Helper: read existing .env into object ─────────────────────────────────
const readEnvFile = () => {
    try {
        if (!fs.existsSync(ENV_PATH)) return {};
        const content = fs.readFileSync(ENV_PATH, 'utf8');
        return Object.fromEntries(
            content.split('\n')
                .filter(l => l.includes('=') && !l.startsWith('#'))
                .map(l => {
                    const idx = l.indexOf('=');
                    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
                })
        );
    } catch { return {}; }
};

// ── GET /api/setup/status ──────────────────────────────────────────────────
router.get('/status', (req, res) => {
    const nodeVersionRaw = process.version; // "v20.x.x"
    const nodeMajor = parseInt(nodeVersionRaw.slice(1));
    const freeMemMB = Math.round(os.freemem() / 1024 / 1024);
    const totalMemMB = Math.round(os.totalmem() / 1024 / 1024);
    const platform = os.platform();

    let envWritable = false;
    try {
        const dir = path.dirname(ENV_PATH);
        fs.accessSync(dir, fs.constants.W_OK);
        envWritable = true;
    } catch { }

    // Pre-fill existing env values for the wizard (masks secrets)
    const existing = readEnvFile();

    res.json({
        setupComplete: isSetupComplete(),
        system: {
            nodeVersion: nodeVersionRaw,
            nodeOk: nodeMajor >= 18,
            platform,
            freeMemMB,
            totalMemMB,
            memOk: totalMemMB >= 512,
            envWritable,
        },
        prefill: {
            db_host: existing.DB_HOST || 'localhost',
            db_port: existing.DB_PORT || '5432',
            db_name: existing.DB_NAME || 'whatsapp_saas',
            db_user: existing.DB_USER || '',
            frontend_url: existing.FRONTEND_URL || '',
            fb_client_id: existing.FB_CLIENT_ID || '',
            // Never pre-fill secrets — let user re-enter
        }
    });
});

// ── POST /api/setup/test-database ─────────────────────────────────────────
router.post('/test-database', async (req, res) => {
    if (isSetupComplete()) return res.status(403).json({ error: 'Setup already completed.' });

    const { host, port, database, username, password } = req.body;
    if (!host || !database || !username || !password) {
        return res.status(400).json({ error: 'All database fields are required.' });
    }

    try {
        const testSeq = new Sequelize(database, username, password, {
            host,
            port: parseInt(port) || 5432,
            dialect: 'postgres',
            logging: false,
            pool: { max: 1, min: 0, acquire: 8000, idle: 2000 },
        });
        await testSeq.authenticate();
        await testSeq.close();
        res.json({ success: true, message: 'Connection successful!' });
    } catch (err) {
        res.status(400).json({ success: false, error: `Connection failed: ${err.message}` });
    }
});

// ── POST /api/setup/complete ───────────────────────────────────────────────
router.post('/complete', async (req, res) => {
    if (isSetupComplete()) return res.status(403).json({ error: 'Setup already completed.' });

    const {
        // Database
        db_host, db_port, db_name, db_user, db_pass,
        // Admin account
        admin_name, admin_email, admin_phone, admin_password,
        // App identity
        app_name, frontend_url,
        // Meta / WhatsApp
        fb_client_id, fb_client_secret, webhook_verify_token,
        // AI
        gemini_api_key,
        // SMTP (optional)
        smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_from_name,
        // JWT (auto-generated if not provided)
        jwt_secret,
    } = req.body;

    // ── Validate required fields ─────────────────────────────────────
    const required = { db_host, db_name, db_user, db_pass, admin_name, admin_email, admin_phone, admin_password, frontend_url };
    for (const [key, val] of Object.entries(required)) {
        if (!val || String(val).trim() === '') {
            return res.status(400).json({ error: `Missing required field: ${key}` });
        }
    }

    if (admin_password.length < 8) {
        return res.status(400).json({ error: 'Admin password must be at least 8 characters.' });
    }

    let setupSeq = null;
    try {
        // ── 1. Connect to DB ─────────────────────────────────────────
        setupSeq = new Sequelize(db_name, db_user, db_pass, {
            host: db_host,
            port: parseInt(db_port) || 5432,
            dialect: 'postgres',
            logging: false,
            pool: { max: 2, min: 0, acquire: 15000, idle: 5000 },
        });
        await setupSeq.authenticate();

        // ── 2. Define minimal User model on this fresh connection ──────
        const UserSetup = setupSeq.define('User', {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            name: { type: DataTypes.STRING, allowNull: false },
            email: { type: DataTypes.STRING, allowNull: false, unique: true },
            password: { type: DataTypes.STRING, allowNull: false },
            isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
            plan: { type: DataTypes.STRING, defaultValue: 'Free' },
            planStatus: { type: DataTypes.STRING, defaultValue: 'Active' },
            planExpiry: { type: DataTypes.DATE, allowNull: true },
            parentUserId: { type: DataTypes.UUID, allowNull: true },
            teamRole: { type: DataTypes.STRING, defaultValue: 'owner' },
            teamPermissions: { type: DataTypes.JSON, defaultValue: [] },
            inviteToken: { type: DataTypes.STRING, allowNull: true },
            company: { type: DataTypes.STRING, allowNull: true },
            phone: { type: DataTypes.STRING, allowNull: true },
            jobTitle: { type: DataTypes.STRING, allowNull: true },
            lastLogin: { type: DataTypes.DATE, allowNull: true },
            purchasedAddons: { type: DataTypes.JSON, defaultValue: [] },
            aiTokenBalance: { type: DataTypes.INTEGER, defaultValue: 100 },
            extraTopupMessages: { type: DataTypes.INTEGER, defaultValue: 0 },
            extraTopupContacts: { type: DataTypes.INTEGER, defaultValue: 0 },
            teamPolicy: { type: DataTypes.JSON, defaultValue: { inboxVisibility: 'see_all', phonePrivacy: 'visible' } },
            referralCode: { type: DataTypes.STRING, unique: true, allowNull: true },
            referredBy: { type: DataTypes.UUID, allowNull: true },
            techPartnerStatus: { type: DataTypes.ENUM('none', 'pending', 'approved', 'rejected'), defaultValue: 'none' },
            techPartnerBalance: { type: DataTypes.FLOAT, defaultValue: 0 },
            techPartnerNotes: { type: DataTypes.TEXT, allowNull: true },
            techPartnerId: { type: DataTypes.UUID, allowNull: true },
            fbAccessToken: { type: DataTypes.STRING(2048), allowNull: true },
            wabaId: { type: DataTypes.STRING, allowNull: true },
            metaAdsToken: { type: DataTypes.STRING(2048), allowNull: true },
            metaAdAccountId: { type: DataTypes.STRING, allowNull: true },
            metaBusinessId: { type: DataTypes.STRING, allowNull: true },
            vcardPreferences: { type: DataTypes.JSON, defaultValue: { emailNotifications: true, defaultEnquiryEmail: '', appointmentTimezone: 'UTC' } },
            storageUsed: { type: DataTypes.BIGINT, defaultValue: 0 },
        }, { timestamps: true, tableName: 'Users' });

        // ── 3. Sync table (safe — no drop) ───────────────────────────
        await UserSetup.sync({ alter: { drop: false } });

        // ── 4. Check email not already taken ─────────────────────────
        const existing = await UserSetup.findOne({ where: { email: admin_email.toLowerCase().trim() } });
        if (existing) {
            return res.status(400).json({ error: 'An account with this email already exists in the database.' });
        }

        // ── 5. Create admin user ──────────────────────────────────────
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin_password, salt);
        const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
        const safeName = (admin_name || 'ADMIN').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
        const referralCode = `${safeName}${randomStr}`;

        await UserSetup.create({
            name: admin_name.trim(),
            email: admin_email.toLowerCase().trim(),
            password: hashedPassword,
            phone: admin_phone.trim(),
            isAdmin: true,
            plan: 'Free',
            planStatus: 'Active',
            referralCode,
            aiTokenBalance: 100,
            lastLogin: new Date(),
        });

        // ── 6. Generate secrets if not provided ───────────────────────
        const finalJwtSecret = jwt_secret || crypto.randomBytes(64).toString('hex');
        const finalWebhookToken = webhook_verify_token || crypto.randomBytes(32).toString('hex');

        // ── 7. Build and write .env file ──────────────────────────────
        const envValues = {
            PORT: '5000',
            NODE_ENV: 'production',
            FRONTEND_URL: (frontend_url || '').replace(/\/$/, ''),
            DB_NAME: db_name,
            DB_USER: db_user,
            DB_PASS: db_pass,
            DB_HOST: db_host,
            DB_PORT: db_port || '5432',
            JWT_SECRET: finalJwtSecret,
            WEBHOOK_VERIFY_TOKEN: finalWebhookToken,
            FB_CLIENT_ID: fb_client_id || '',
            FB_CLIENT_SECRET: fb_client_secret || '',
            GEMINI_API_KEY: gemini_api_key || '',
            SMTP_HOST: smtp_host || '',
            SMTP_PORT: smtp_port || '587',
            SMTP_USER: smtp_user || '',
            SMTP_PASS: smtp_pass || '',
            SMTP_FROM: smtp_from || '',
            SMTP_FROM_NAME: smtp_from_name || app_name || 'Bluetick',
            APP_NAME: app_name || 'Bluetick',
            SETUP_COMPLETE: 'true',
        };
        writeEnvFile(envValues);

        // ── 8. Set process.env values for this running process ────────
        Object.entries(envValues).forEach(([k, v]) => { process.env[k] = v; });

        await setupSeq.close();

        res.json({
            success: true,
            message: 'Installation complete! Please restart the server to apply all settings.',
            webhookToken: finalWebhookToken,
            webhookUrl: `${(frontend_url || '').replace(/\/$/, '')}/api/webhook`,
        });

    } catch (err) {
        console.error('[Setup Error]', err);
        if (setupSeq) {
            try { await setupSeq.close(); } catch { }
        }
        res.status(500).json({ error: `Setup failed: ${err.message}` });
    }
});

module.exports = router;
