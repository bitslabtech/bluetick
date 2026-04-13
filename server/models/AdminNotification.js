const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminNotification = sequelize.define('AdminNotification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    type: {
        type: DataTypes.ENUM('USER_REGISTER', 'PLAN_CHANGE', 'SUPPORT_TICKET', 'TECH_PARTNER_APP'),
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON, // Stores related ID or info (e.g., { userId: 123, plan: 'Pro' })
        allowNull: true
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true
});

module.exports = AdminNotification;
