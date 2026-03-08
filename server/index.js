require('dotenv').config();
require('./utils/winston'); // Wire up file logging (captures all console.log/error/warn)
const express = require('express');
const cors = require('cors');
const http = require('http'); // NEW
const { initSocket } = require('./socket'); // NEW
const { sequelize, createDbIfNotExists } = require('./config/database');

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

const app = express();
const server = http.createServer(app); // NEW HTTP server

// Initialize WebSockets
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
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
app.use('/api/webhooks', webhooksRoute);
app.use('/api/admin', adminRoute);
app.use('/api/plans', plansRoute);
app.use('/api/purchases', purchasesRoute);
app.use('/api/notifications', notificationsRoute); // NEW
app.use('/api/admin-notifications', require('./routes/adminNotifications')); // NEW
app.use('/api/support', supportRoute); // NEW
app.use('/api/landing', require('./routes/landing'));
app.use('/sitemap.xml', require('./routes/sitemap'));
app.use('/api/system', require('./routes/system')); // NEW // NEW
app.use('/api/billing', require('./routes/billing')); // NEW
app.use('/api/labels', require('./routes/labels')); // NEW
app.use('/api/whatsapp/chat', require('./routes/chat')); // Renamed from WhatsApp Inbox
app.use('/api/whatsapp', whatsappAuthRoute); // WhatsApp Graph API Auth

// Webhook for Meta WhatsApp pushes
app.use('/api/webhook', require('./routes/webhook')); // NEW

// Public pages (Privacy Policy, Terms) — no auth required, for Meta App Live Mode
app.use('/', require('./routes/privacy'));

app.get('/', (req, res) => {
    res.send('WhatsApp SaaS Backend Running (PostgreSQL)');
});

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await createDbIfNotExists(); // Create DB if not exists
        await sequelize.authenticate();
        console.log('PostgreSQL connected.');

        await sequelize.sync({ alter: true }); // Sync models
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
