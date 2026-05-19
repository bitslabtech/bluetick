const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MetaAdCampaign = sequelize.define('MetaAdCampaign', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    campaignName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    objective: {
        type: DataTypes.STRING,
        defaultValue: 'OUTCOME_ENGAGEMENT'
    },
    dailyBudget: {
        type: DataTypes.FLOAT,
        defaultValue: 500
    },
    targeting: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    creatives: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    status: {
        type: DataTypes.ENUM('Draft', 'Published', 'Active', 'Paused', 'Error'),
        defaultValue: 'Draft'
    },
    metaCampaignId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaAdsetId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaAdId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    insights: {
        type: DataTypes.JSON,
        defaultValue: {}
    }
}, {
    timestamps: true
});

module.exports = MetaAdCampaign;
