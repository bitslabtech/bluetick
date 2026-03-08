const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Plan = sequelize.define('Plan', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
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
    interval: {
        type: DataTypes.ENUM('month', 'year', 'lifetime'),
        defaultValue: 'month'
    },
    messageLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 30
    },
    contactLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    templateLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 2
    },
    features: {
        type: DataTypes.JSON, // Stores array of feature strings
        defaultValue: []
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: 'blue' // blue, purple, amber, etc. for UI themes
    },
    isPopular: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Only 1 plan can be default. Hidden from public, assigned to direct registrations.'
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether plan is visible on public pricing page. Default plan should be false.'
    }
}, {
    timestamps: true
});

module.exports = Plan;
