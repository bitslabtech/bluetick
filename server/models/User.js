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
        type: DataTypes.STRING(2048), // Access tokens can be long
        allowNull: true
    },
    wabaId: {
        type: DataTypes.STRING,
        allowNull: true
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
