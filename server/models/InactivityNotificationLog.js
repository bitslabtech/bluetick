const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InactivityNotificationLog = sequelize.define('InactivityNotificationLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userEmail: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userPhone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userPlan: {
        type: DataTypes.STRING,
        defaultValue: 'Free'
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    daysInactive: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    templateName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'SENT' // 'SENT' | 'FAILED' | 'SKIPPED'
    },
    responsePayload: {
        type: DataTypes.JSON,
        allowNull: true
    },
    error: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = InactivityNotificationLog;
