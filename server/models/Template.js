const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Template = sequelize.define('Template', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    language: {
        type: DataTypes.STRING,
        defaultValue: 'en_US'
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'MARKETING'
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING'
    },
    metaTemplateId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    archetype: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'standard'
    },
    cards: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = Template;
