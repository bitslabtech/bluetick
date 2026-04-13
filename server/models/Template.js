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
    buttons: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    headerType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    headerContent: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    headerHandle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    footer: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    createdById: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Tracks the specific team member who created this resource'
    }
}, {
    timestamps: true
});

module.exports = Template;
