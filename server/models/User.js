const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // New Fields for Dashboard
    plan: {
        type: DataTypes.STRING,
        defaultValue: 'Free'
    },
    planStatus: {
        type: DataTypes.STRING,
        defaultValue: 'Active'
    },
    planExpiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    company: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    jobTitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    purchasedAddons: {
        type: DataTypes.JSON, // Stores array of module identifiers
        defaultValue: []
    },
    // WhatsApp Integration Fields
    fbAccessToken: {
        type: DataTypes.STRING(2048), // Access tokens can be long
        allowNull: true
    },
    wabaId: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = User;

// Define Relationship
const ActivityLog = require('./ActivityLog');
User.hasMany(ActivityLog, { foreignKey: 'userId' });

