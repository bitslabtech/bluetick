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
        type: DataTypes.ENUM('ai_tokens', 'messages', 'contacts', 'templates'),
        allowNull: false
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
    }
}, {
    timestamps: true
});

module.exports = StoreItem;
