const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Conversation = require('./Conversation');

const ChatMessage = sequelize.define('ChatMessage', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    conversationId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    // Meta Message ID
    messageId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    direction: {
        type: DataTypes.ENUM('INBOUND', 'OUTBOUND'),
        allowNull: false
    },
    type: {
        type: DataTypes.STRING, // text, image, template, document, etc.
        defaultValue: 'text'
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING, // sent, delivered, read, failed
        defaultValue: 'sent'
    },
    mediaUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    templateData: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Stores the exact payload sent (name, components) to render templates accurately in chat UI'
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['conversationId'] },
        { fields: ['messageId'] }
    ]
});

// Relationships
Conversation.hasMany(ChatMessage, { foreignKey: 'conversationId', as: 'messages' });
ChatMessage.belongsTo(Conversation, { foreignKey: 'conversationId' });

module.exports = ChatMessage;
