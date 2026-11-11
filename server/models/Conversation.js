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
    // Assigned team member ID (UUID FK to User)
    assignedTo: {
        type: DataTypes.UUID,
        allowNull: true
    },
    // Cached name for display without JOIN
    assignedToName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    botStatus: {
        type: DataTypes.ENUM('active', 'paused'),
        defaultValue: 'active'
    },
    clearedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '"Clear chat": messages created before this are hidden in the inbox (kept for billing/usage counts)'
    }
}, {
    timestamps: true,
    // "Delete conversation" is a soft delete: the row stays (anonymised) with its messages
    // emptied of content, so monthly usage counts can't be reset by deleting chats.
    // Every normal query skips deleted rows automatically; usage/stat counts opt in
    // with `paranoid: false`. Account deletion uses `force: true` to remove them for good.
    paranoid: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['updatedAt'] } // For sorting by recent
    ]
});

module.exports = Conversation;
