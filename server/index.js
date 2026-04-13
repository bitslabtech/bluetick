require('dotenv').config();

// Capture uncaught exceptions/rejections BEFORE anything else
process.on('uncaughtException', (err) => {
    const msg = `[UNCAUGHT EXCEPTION] ${err.message}\n${err.stack}`;
    console.error(msg);
    try { require('fs').appendFileSync('crash.log', `${new Date().toISOString()} ${msg}\n`); } catch(e) {}
});
process.on('unhandledRejection', (reason, promise) => {
    const msg = `[UNHANDLED REJECTION] ${reason?.message || reason}\n${reason?.stack || ''}`;
    console.error(msg);
    try { require('fs').appendFileSync('crash.log', `${new Date().toISOString()} ${msg}\n`); } catch(e) {}
});

require('./utils/winston'); // Wire up file logging (captures all console.log/error/warn)
const express = require('express');
const cors = require('cors');
const http = require('http'); // NEW
const { initSocket } = require('./socket'); // NEW
const { sequelize, createDbIfNotExists } = require('./config/database');
const helmet = require('helmet');
const { globalLimiter } = require('./middleware/rateLimiter');

// Initialize Models to ensure Sequelize syncs them
require('./models/Addon');
require('./models/UserAddon');
require('./models/StoreItem');
require('./models/AppVersion');
require('./models/Form');
require('./models/FormResponse');
require('./models/PaymentSession');
require('./models/AiTokenLog'); // AI token usage event log
require('./models/ReferralReward'); // Dynamic referral payouts log
require('./models/TechPartnerEarning'); // Tech Partner commission log (user-apply model)
require('./models/TechPartner'); // B2B Tech Partner entity (admin-created)
require('./models/TechPartnerPayout'); // Commission payout log for B2B partners
require('./models/ContactMessage'); // Stores incoming messages from public Contact Us page
require('./models/ApiUsageLog');    // Logs every external /api/v1/* gateway call

// Import Routes
const contactsRoute = require('./routes/contacts');
const templatesRoute = require('./routes/templates');
const messagesRoute = require('./routes/messages');
const dashboardRoute = require('./routes/dashboard');
const groupsRoute = require('./routes/groups');
const settingsRoute = require('./routes/settings');
const authRoute = require('./routes/auth');
const webhooksRoute = require('./routes/webhooks');
const adminRoute = require('./routes/admin');
const plansRoute = require('./routes/plans');
const purchasesRoute = require('./routes/purchases');
const supportRoute = require('./routes/support');
const notificationsRoute = require('./routes/notifications');
const whatsappAuthRoute = require('./routes/whatsappAuth');
const teamRoute = require('./routes/team');
const formsRoute = require('./routes/forms');

const app = express();
const server = http.createServer(app); // NEW HTTP server

// Initialize WebSockets
initSocket(server);

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
})); // Add HTTP security headers
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Restrict CORS in production
    credentials: true
}));

// Apply Dynamic Rate Limiter
app.use('/api', globalLimiter);

// Parse JSON payloads strictly up to 5MB to prevent memory exhaustion
app.use(express.json({ limit: '5mb' }));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// System Protection Middleware
app.use('/api', require('./middleware/systemCheck'));

// Routes
app.use('/api/contacts', contactsRoute);
app.use('/api/templates', templatesRoute);
app.use('/api/messages', messagesRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/groups', groupsRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/auth', authRoute);
app.use('/api/whatsapp/auth', whatsappAuthRoute);
app.use('/api/team', teamRoute);
app.use('/api/forms', formsRoute);

// Excusive API v1 Routing for External Developers
app.use('/api/webhooks', webhooksRoute);
app.use('/api/admin', adminRoute);
app.use('/api/admin/addons', require('./routes/adminAddons'));
app.use('/api/admin/store', require('./routes/adminStore')); // NEW
app.use('/api/addons', require('./routes/addons')); // NEW user marketplace endpoint
app.use('/api/store', require('./routes/store')); // NEW user store endpoint
app.use('/api/plans', plansRoute);
app.use('/api/purchases', purchasesRoute);
app.use('/api/notifications', notificationsRoute); // NEW
app.use('/api/admin-notifications', require('./routes/adminNotifications')); // NEW
app.use('/api/support', supportRoute); // NEW
app.use('/api/landing', require('./routes/landing'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/sitemap.xml', require('./routes/sitemap'));
app.use('/api/system', require('./routes/system')); // NEW // NEW
app.use('/api/billing', require('./routes/billing')); // NEW
app.use('/api/labels', require('./routes/labels')); // NEW
app.use('/api/coupons', require('./routes/coupons')); // NEW
app.use('/api/versioning', require('./routes/versioning')); // Versioning & Changelog
app.use('/api/whatsapp/chat', require('./routes/chat')); // Renamed from WhatsApp Inbox
app.use('/api/whatsapp', whatsappAuthRoute); // WhatsApp Graph API Auth
app.use('/api/flows', require('./routes/flows')); // NEW FlowBot routes
app.use('/api/integrations', require('./routes/integrations')); // NEW Developer Ecosystem
app.use('/api/referrals', require('./routes/referrals')); // Referral System
app.use('/api/partner', require('./routes/partner')); // B2B Tech Partner tracking & application
app.use('/api/admin/tech-partners', require('./routes/adminTechPartners')); // B2B Tech Partner CRUD & payouts
app.use('/api/contact', require('./routes/contact')); // Public Contact Us form endpoints

app.use('/api/v1', require('./routes/apiV1')); // External Developer REST API

// Webhook for Meta WhatsApp pushes
app.use('/api/webhook', require('./routes/webhook')); // NEW

// Public pages (Privacy Policy, Terms) — no auth required, for Meta App Live Mode
app.use('/', require('./routes/privacy'));

app.get('/', (req, res) => {
    res.send('WhatsApp SaaS Backend Running (PostgreSQL)');
});

// Global Error Handler — always returns JSON, never raw HTML
// MUST be registered after all routes
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR HANDLER]', err.message, err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await createDbIfNotExists(); // Create DB if not exists
        await sequelize.authenticate();
        console.log('PostgreSQL connected.');

        await sequelize.sync({ alter: { drop: false } }); // Sync models — never drop constraints/columns
        console.log('Database synced.');

        // Initialize Scheduler
        const { initScheduler } = require('./utils/scheduler');
        initScheduler();

        server.listen(PORT, () => {
            console.log(`Server & WebSockets running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Unable to start server:', err);
    }
};

startServer();
