const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Webhook = sequelize.define('Webhook', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isUrl: true
        }
    },
    events: {
        type: DataTypes.JSON, // Array of event strings e.g. ['message.received', 'message.status']
        defaultValue: ["message.received"],
        allowNull: false
    },
    secret: {
        type: DataTypes.STRING, // Used to sign the payload (HMAC)
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    lastFailedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    failureCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true
});

module.exports = Webhook;
