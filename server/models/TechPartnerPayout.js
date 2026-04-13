const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * TechPartnerPayout
 * A log of commission events triggered when a user (who registered via a
 * partner link) makes their first paid plan purchase.
 * Status is managed manually by admin — 'pending' means owed, 'paid' means settled.
 */
const TechPartnerPayout = sequelize.define('TechPartnerPayout', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    // The partner who earns the commission
    techPartnerId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    // The user whose purchase triggered this payout
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'The platform user who purchased the plan'
    },
    // Purchase details at time of payout
    planName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    planPrice: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'Full plan price at time of purchase'
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'INR'
    },
    // Commission details (snapshot at time of payout)
    commissionType: {
        type: DataTypes.ENUM('percentage', 'flat', 'validity_months'),
        allowNull: false
    },
    commissionValue: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    commissionAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'Actual computed commission amount in currency units'
    },
    // Payout lifecycle
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

module.exports = TechPartnerPayout;
