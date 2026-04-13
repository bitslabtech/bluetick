const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const ApiKey = sequelize.define('ApiKey', {
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
    label: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Default Key'
    },
    keyPrefix: {
        type: DataTypes.STRING(12),
        allowNull: true,
        comment: 'First 12 chars of the raw key (e.g. sk_live_ab12). Safe to display. Never reveals the secret.'
    },
    keyHash: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    last4: {
        type: DataTypes.STRING(4),
        allowNull: false
    },
    lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    scopes: {
        type: DataTypes.JSON,
        defaultValue: ['messages:send', 'contacts:read'],
        comment: 'Permissions granted to this key. e.g. messages:send, contacts:read, contacts:write'
    }
}, {
    timestamps: true
});

module.exports = ApiKey;
