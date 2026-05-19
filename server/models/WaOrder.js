const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const WaStore = require('./WaStore');

const WaOrder = sequelize.define('WaOrder', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: WaStore, key: 'id' }
    },
    orderNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Human-readable order number e.g. ORD-1001'
    },
    customerName: {
        type: DataTypes.STRING
    },
    customerPhone: {
        type: DataTypes.STRING
    },
    customerEmail: {
        type: DataTypes.STRING
    },
    customerAddress: {
        type: DataTypes.TEXT
    },
    items: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Array of { id, name, price, qty, imageUrls }'
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Final amount paid after any discount'
    },
    originalTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Cart total BEFORE coupon discount was applied'
    },
    discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        comment: 'Amount discounted via coupon'
    },
    couponCode: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'The coupon code applied to this order'
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending'
    },
    notes: {
        type: DataTypes.TEXT,
        comment: 'Internal store owner notes'
    },
    customerNote: {
        type: DataTypes.TEXT,
        comment: 'Note from the customer'
    }
}, {
    timestamps: true
});

module.exports = WaOrder;
