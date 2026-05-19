const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Template = require('./Template');
const Contact = require('./Contact');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    recipientCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    campaignName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'QUEUED' // QUEUED, SENDING, COMPLETED, SCHEDULED, FAILED
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    scheduledFor: {
        type: DataTypes.DATE,
        allowNull: true
    },
    targetConfig: {
        type: DataTypes.JSONB,
        defaultValue: {} // Stores { contactIds, manualRecipients, params }
    },
    // We use JSONB to store the logs array effectively in Postgres
    // Structure: [{ contactId: uuid, status: string, messageId: string }]
    logs: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // Counter fields for webhook updates
    sentCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    deliveredCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    failedCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    readCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    createdById: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Tracks the specific team member who created this resource'
    },
    referral: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'CTWA referral data from Meta (source_id=ad_id, headline, source_type, source_url, body, media_type, image_url, ctwa_clid)'
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['userId', 'status'] // Optimize queue fetching per user
        },
        {
            fields: ['campaignName'] // Optimize campaign grouping
        }
    ]
});

// Relationships
Message.belongsTo(Template, { foreignKey: 'templateId' });

module.exports = Message;
