const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * TechPartnerEarning
 * Records every commission event earned by an approved Tech Partner.
 * Commission is logged as 'pending' — admin manually marks as 'paid' via the admin panel.
 */
const TechPartnerEarning = sequelize.define('TechPartnerEarning', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    // The approved Tech Partner (referrer)
    referrerId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'The user whose techPartnerStatus === approved'
    },
    // The user who made the purchase that triggered this commission
    referredUserId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    // Purchase details at time of commission
    planName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    planPrice: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'Full plan price at time of purchase (currency units)'
    },
    commissionRate: {
        type: DataTypes.FLOAT,
        defaultValue: 20,
        comment: 'Commission percentage applied (e.g. 20 = 20%)'
    },
    commissionAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'Actual commission in currency units = planPrice * commissionRate / 100'
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'INR'
    },
    // Payout status — managed by superadmin
    status: {
        type: DataTypes.ENUM('pending', 'paid'),
        defaultValue: 'pending'
    },
    paidAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = TechPartnerEarning;
