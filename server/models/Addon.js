const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Addon = sequelize.define('Addon', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    shortDescription: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    longDescription: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    moduleHash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    module_key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bannerUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    demoVideoUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    features: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    },
    isRecurring: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    recurringInterval: {
        type: DataTypes.STRING, // 'month' or 'year'
        allowNull: true
    },
    stripeProductId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stripePriceId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    badge: {
        type: DataTypes.STRING,
        allowNull: true
    },
}, {
    timestamps: true
});

module.exports = Addon;
