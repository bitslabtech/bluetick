const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Settings = sequelize.define('Settings', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    metaPhoneNumberId: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    metaAccessToken: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    metaBusinessAccountId: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    webhookVerifyToken: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    // Branding
    appName: {
        type: DataTypes.STRING,
        defaultValue: 'WhatsApp Cloud'
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
        defaultValue: { welcomeMessage: { enabled: false, text: '' }, offHoursMessage: { enabled: false, text: '', timezone: 'UTC', schedule: [] } }
    },
    // Team Policy: Controls inbox visibility + phone privacy for team members
    teamPolicy: {
        type: DataTypes.JSON,
        defaultValue: {
            inboxVisibility: 'see_all',  // 'see_all' | 'see_assigned' | 'see_all_reply_assigned'
            phonePrivacy: 'visible'       // 'visible' | 'blurred' | 'masked'
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
