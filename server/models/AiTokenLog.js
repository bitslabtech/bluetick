const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiTokenLog = sequelize.define('AiTokenLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE'
    },
    feature: {
        type: DataTypes.ENUM('ai_chatbot', 'ai_form_generator', 'ai_template_enhancer', 'ai_chat_drafter', 'ai_chat_enhancer', 'ai_template_draft', 'ai_meta_ads_research', 'ai_meta_ads_copy', 'ai_meta_ads_image', 'ai_store_copilot'),
        allowNull: false
    },
    tokensUsed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    balanceAfter: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Optional metadata
    meta: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'AiTokenLogs',
    timestamps: true,
    updatedAt: false // only createdAt matters for logs
});

module.exports = AiTokenLog;
