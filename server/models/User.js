const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // New Fields for Dashboard
    plan: {
        type: DataTypes.STRING,
        defaultValue: 'Free'
    },
    planStatus: {
        type: DataTypes.STRING,
        defaultValue: 'Active'
    },
    planExpiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    hasUsedTrial: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Set to true once a user starts a trial to prevent multiple trials'
    },
    // Team & Collaboration Fields
    parentUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'If set, this user acts as a team member under this parent user'
    },
    teamRole: {
        type: DataTypes.STRING,
        defaultValue: 'owner',
        comment: 'owner | admin | editor | viewer'
    },
    teamPermissions: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    inviteToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    company: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    jobTitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    purchasedAddons: {
        type: DataTypes.JSON, // Stores array of module identifiers
        defaultValue: []
    },
    aiTokenBalance: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Persistent lifetime balance of AI tokens for the user'
    },
    extraTopupMessages: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Bonus message limit added via Store Top-ups'
    },
    extraTopupContacts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Bonus contact limit added via Store Top-ups'
    },
    // Sub-User specific inbox control
    teamPolicy: {
        type: DataTypes.JSON,
        defaultValue: {
            inboxVisibility: 'see_all', 
            phonePrivacy: 'visible'
        }
    },
    // Referral System
    referralCode: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    referredBy: {
        type: DataTypes.UUID,
        allowNull: true
    },
    // Tech Partner Program
    techPartnerStatus: {
        type: DataTypes.ENUM('none', 'pending', 'approved', 'rejected'),
        defaultValue: 'none',
        comment: 'none = not applied, pending = awaiting review, approved = active partner, rejected = denied'
    },
    techPartnerBalance: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        comment: 'Accumulated but unpaid commission balance in base currency'
    },
    techPartnerNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin notes on approval/rejection'
    },
    // B2B Tech Partner Attribution — FK to TechPartner entity
    techPartnerId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Set when user registered via a ?partner=CODE link'
    },
    // WhatsApp Integration Fields
    fbAccessToken: {
        type: DataTypes.TEXT, // Access tokens can be long
        allowNull: true
    },
    wabaId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaPhoneNumberId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaDisplayPhoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaQualityRating: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaTier: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaVerifiedName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaNameStatus: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Meta Ads Integration Fields (CTWA)
    metaAdsToken: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Long-lived User Access Token with ads_read permission'
    },
    metaPageId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Facebook Page ID linked to WhatsApp Business Account'
    },
    metaAdAccountId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Selected Ad Account ID for CTWA Analytics (e.g., act_123456789)'
    },
    metaBusinessId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Vcard Global Settings
    vcardPreferences: {
        type: DataTypes.JSON,
        defaultValue: {
            emailNotifications: true,
            defaultEnquiryEmail: '',
            appointmentTimezone: 'UTC'
        }
    },
    // Storage Tracking
    storageUsed: {
        type: DataTypes.BIGINT, // in bytes
        defaultValue: 0,
        comment: 'Total storage used by the user across all modules in bytes'
    },
    mediaStorageUsed: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        comment: 'Storage used (bytes) by Online Store + vCard uploads only. Enforced against plan quota.'
    },
    // Notification Tracking
    lastExpiryAlertDay: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Tracks the last reminder day (e.g. 15, 7, 3) sent for expiry alert'
    },
    lastQuotaAlerts: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Tracks the last threshold percentage sent per limit type (e.g., {messages: 80, contacts: 100})'
    },
    // Phase 5: Meta Conversions API (CAPI)
    capiConfig: {
        type: DataTypes.JSONB,
        defaultValue: null,
        allowNull: true,
        comment: 'Stores CAPI config: { pixelId, accessToken, testEventCode }'
    },
    // ── Account Lifecycle ──────────────────────────────────────────────────────
    // Name and email are intentionally kept on soft-deleted accounts so that
    // admin dashboard JOINs (Top Token Consumers, Activity Logs, Recent Purchases)
    // continue showing real identity in historical reports.
    status: {
        type: DataTypes.STRING,
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'suspended', 'deleted']]
        },
        comment: 'active = normal, suspended = admin blocked, deleted = account closed (soft delete)'
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the account was soft-deleted'
    }
}, {
    timestamps: true
});

module.exports = User;

// Define Relationship
const ActivityLog = require('./ActivityLog');
const ApiKey = require('./ApiKey');
const Webhook = require('./Webhook');
const AiTokenLog = require('./AiTokenLog');
const ReferralReward = require('./ReferralReward');

User.hasMany(ActivityLog, { foreignKey: 'userId' });
User.hasMany(ApiKey, { foreignKey: 'userId', as: 'apiKeys' });
User.hasMany(Webhook, { foreignKey: 'userId', as: 'webhooks' });

User.hasMany(AiTokenLog, { foreignKey: 'userId', as: 'aiTokenLogs' });
AiTokenLog.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ReferralReward, { foreignKey: 'referrerId', as: 'rewardsEarned' });
User.hasMany(ReferralReward, { foreignKey: 'referredUserId', as: 'referralInfo' });
ReferralReward.belongsTo(User, { foreignKey: 'referrerId', as: 'referrer' });
ReferralReward.belongsTo(User, { foreignKey: 'referredUserId', as: 'referredUser' });

const TechPartner = require('./TechPartner');
User.hasOne(TechPartner, { foreignKey: 'userId', as: 'techPartnerProfile' });

const MetaAdCampaign = require('./MetaAdCampaign');
User.hasMany(MetaAdCampaign, { foreignKey: 'userId', as: 'metaAdCampaigns' });
MetaAdCampaign.belongsTo(User, { foreignKey: 'userId' });
