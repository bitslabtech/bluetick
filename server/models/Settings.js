const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Settings = sequelize.define('Settings', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    metaPhoneNumberId: {
        type: DataTypes.STRING(500),
        defaultValue: ''
    },
    metaAccessToken: {
        type: DataTypes.TEXT, // Permanent System User tokens can be 400-600+ chars; TEXT avoids DB limits
        defaultValue: ''
    },
    metaBusinessAccountId: {
        type: DataTypes.STRING(500),
        defaultValue: ''
    },
    webhookVerifyToken: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    // Branding
    appName: {
        type: DataTypes.STRING,
        defaultValue: 'OneDash'
    },
    supportEmail: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    },
    timezone: {
        type: DataTypes.STRING,
        defaultValue: 'UTC'
    },
    primaryColor: {
        type: DataTypes.STRING,
        defaultValue: '#4f46e5'
    },
    secondaryColor: {
        type: DataTypes.STRING,
        defaultValue: '#ec4899'
    },
    logoUrl: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    faviconUrl: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    registerBannerUrl: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    // Preferences
    theme: {
        type: DataTypes.ENUM('light', 'dark', 'system'),
        defaultValue: 'system'
    },
    language: {
        type: DataTypes.STRING,
        defaultValue: 'en'
    },
    dateFormat: {
        type: DataTypes.STRING,
        defaultValue: 'DD/MM/YYYY'
    },
    // Notification Templates
    notificationTemplates: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    // Payment Gateways
    paymentGateways: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    // Email SMTP
    smtpConfig: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    // Security
    securityConfig: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    // WhatsApp Specific Settings
    whatsappProfile: {
        type: DataTypes.JSON,
        defaultValue: { description: '', address: '', email: '', websites: [], vertical: '' }
    },
    whatsappAutomations: {
        type: DataTypes.JSON,
        defaultValue: {
            welcomeMessage: { enabled: false, text: '' },
            offHoursMessage: { enabled: false, text: '', timezone: 'UTC', schedule: [] },
            // Opt-Out Management (Industry-standard STOP/UNSUBSCRIBE handling)
            optOutEnabled: true,
            optOutAck: "You've been unsubscribed from our messages. Reply START to re-subscribe at any time.",
            optInAck: "You've been re-subscribed! You'll receive our messages again. Reply STOP at any time to opt out.",
            customOptOutKeywords: [] // e.g. ["रुको", "arret"] for multilingual opt-out
        }
    },
    // Team Policy: Controls inbox visibility + phone privacy for team members
    teamPolicy: {
        type: DataTypes.JSON,
        defaultValue: {
            inboxVisibility: 'see_all',  // 'see_all' | 'see_assigned' | 'see_all_reply_assigned'
            phonePrivacy: 'visible'       // 'visible' | 'blurred' | 'masked'
        }
    },
    // CTWA Auto-Reply: Instantly send a template when a new lead clicks a CTWA ad
    ctwaAutoReplyTemplate: {
        type: DataTypes.JSON,
        defaultValue: {
            enabled: false,
            templateName: '',   // Must be an approved Meta template
            language: 'en',     // Template language code (e.g. 'en', 'hi')
            injectName: false    // If true, passes the contact's name as body variable {{1}}
        }
    },
    // WhatsApp voice calling (customer-initiated). Applied to Meta via POST /<phone>/settings.
    callSettings: {
        type: DataTypes.JSON,
        defaultValue: {
            enabled: false,
            allowOutsideHours: false,        // false = calls outside business hours are refused
            hours: null,                     // { timezone, schedule:[{day,enabled,startTime,endTime}] }; null = reuse off-hours schedule
            missedCallMessage: { enabled: true, text: "Sorry we missed your call. Please send us a message here and we'll get back to you shortly." },
            closedMessage: { enabled: true, text: "Thanks for calling. We're currently closed. Please leave us a message here and we'll get back to you during business hours." },
            fallbackAfterSec: 20,            // ring the whole team after this many seconds
        }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = Settings;
