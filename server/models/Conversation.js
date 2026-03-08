const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    contactName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    lastMessageAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    unreadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    // CRITICAL: Helps determine 24-hour service window
    lastInboundMessageAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Labels/tags as JSON array e.g. [{label:'VIP', color:'green'}]
    labels: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    // Internal agent notes for this conversation
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Assigned agent name
    assignedTo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['updatedAt'] } // For sorting by recent
    ]
});

module.exports = Conversation;
