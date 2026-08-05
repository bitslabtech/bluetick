const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Message = require('./Message');

const MessageLog = sequelize.define('MessageLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    messageId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true // Meta Message ID
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING'
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    contactId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    campaignId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    error: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metaTimestamp: {
        type: DataTypes.STRING,
        allowNull: true
    },
    clickedButton: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // ── 131049 Retry System ───────────────────────────────────────────────────
    // retryCount: how many retry attempts have been made (0 = never retried)
    retryCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    // retryAfter: the earliest timestamp this log is eligible for its next retry
    retryAfter: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // errorCode: the numeric Meta error code that caused failure (e.g. 131049)
    errorCode: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['messageId'] // Faster webhook lookups
        },
        {
            fields: ['campaignId']
        }
    ]
});

// Define Relationship
Message.hasMany(MessageLog, { foreignKey: 'campaignId' });
MessageLog.belongsTo(Message, { foreignKey: 'campaignId' });

module.exports = MessageLog;
