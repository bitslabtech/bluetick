const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * TechPartner
 * Represents an external business/agency partner created by the Superadmin.
 * Partners share a unique ?partner=CODE link. When new users register via
 * that link and purchase a plan, a commission is logged automatically.
 */
const TechPartner = sequelize.define('TechPartner', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Link to a system user if they applied internally'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Partner company or person name'
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Partner contact email for notifications/payouts'
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Unique partner code used in ?partner=CODE URL param'
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    commissionType: {
        type: DataTypes.ENUM('percentage', 'flat', 'validity_months'),
        defaultValue: 'percentage',
        comment: 'How the commission is calculated'
    },
    commissionValue: {
        type: DataTypes.FLOAT,
        defaultValue: 20,
        comment: 'e.g. 20 for 20%, 500 for flat ₹500, 2 for 2 validity months'
    },
    enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this partner is currently active'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Internal admin notes about this partner'
    },
    totalSignups: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Cached count of users registered via this partner code'
    },
    totalPayouts: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        comment: 'Total commission amount accumulated (all time)'
    },
    pendingBalance: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        comment: 'Unpaid accumulated commission balance'
    }
}, {
    timestamps: true
});

const User = require('./User');
TechPartner.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = TechPartner;
