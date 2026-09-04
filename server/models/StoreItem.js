const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreItem = sequelize.define('StoreItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
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
    itemType: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: 'ai_tokens | messages | contacts | templates | team_members'
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'The quantity of the resource granted (e.g., 5000 AI tokens)'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Zap',
        comment: 'Lucide icon name to display in the UI'
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: 'indigo',
        comment: 'Color theme for the store card (e.g., blue, indigo, emerald)'
    },
    // For team_members packs: how many months of validity does this pack grant?
    // 1 = monthly, 3 = quarterly, 6 = half-year, 12 = annual
    // null / undefined = falls back to 12 months (annual)
    validityMonths: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 12,
        comment: 'For team_members items: validity duration in months (1, 3, 6, 12). Null = 12.'
    }
}, {
    timestamps: true
});

module.exports = StoreItem;
