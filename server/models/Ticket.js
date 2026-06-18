const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ticket = sequelize.define('Ticket', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'General' // 'Billing', 'Technical', 'Feature Request'
    },
    priority: {
        type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
        defaultValue: 'Medium'
    },
    status: {
        type: DataTypes.ENUM('Open', 'In Progress', 'Resolved', 'Closed'),
        defaultValue: 'Open'
    },
    messages: {
        type: DataTypes.JSON, // Array of { sender: 'User'|'Admin', text: '', timestamp: '' }
        defaultValue: []
    },
    lastReplyAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    // Unread flags — used for sidebar red dot indicators
    hasUnreadAdminReply: {
        type: DataTypes.BOOLEAN,
        defaultValue: false // true = admin replied, user hasn't read it yet
    },
    hasUnreadUserReply: {
        type: DataTypes.BOOLEAN,
        defaultValue: false // true = user replied, admin hasn't read it yet
    }
}, {
    timestamps: true
});

module.exports = Ticket;
