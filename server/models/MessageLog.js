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
