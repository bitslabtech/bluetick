const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const WaStore = require('./WaStore');

const WaStoreCoupon = sequelize.define('WaStoreCoupon', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: WaStore,
            key: 'id'
        }
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    discountType: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'percentage'
    },
    discountValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    minOrderValue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    // #7 — startsAt: coupon is inactive before this date/time
    startsAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    // SEC-3 FIX: Coupon usage tracking
    // usageLimit: null = unlimited, integer = max number of times this coupon can be redeemed
    usageLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
    },
    // timesUsed: auto-incremented each time the coupon is applied to a paid/confirmed order
    timesUsed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['storeId', 'code'] // Code must be unique within a store
        }
    ]
});

module.exports = WaStoreCoupon;
