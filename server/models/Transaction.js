const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User'); // Import User for association if needed later

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'INR'
    },
    planName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING, // 'COMPLETED', 'FAILED', 'PENDING'
        defaultValue: 'COMPLETED'
    },
    razorpayOrderId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    razorpayPaymentId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    paymentGateway: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transactionReference: {
        type: DataTypes.STRING,
        allowNull: true
    },
    couponCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    discountApplied: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    // ── Identity Snapshot ──────────────────────────────────────────────
    // Captured at the moment of purchase. Preserved forever for audit,
    // tax, and legal purposes even if the user account is later deleted.
    // (Standard practice: Stripe, Razorpay, PayPal all do this.)
    userName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'User full name at the time of purchase — frozen for audit trail'
    },
    userEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'User email at the time of purchase — frozen for audit trail'
    },
    userPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'User phone at the time of purchase — frozen for audit trail'
    }
}, {
    timestamps: true
});

module.exports = Transaction;
