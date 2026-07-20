const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const WaStore = require('./WaStore');

/**
 * StoreCustomer — End-customer accounts for the public-facing WaStore.
 *
 * Completely separate from the platform `User` model.
 * Each customer is scoped to a single store (storeId + email must be unique together).
 * Supports two auth methods:
 *   1. Email + Password (classic)
 *   2. WhatsApp OTP (phone-based, no password)
 */
const StoreCustomer = sequelize.define('StoreCustomer', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: WaStore, key: 'id' },
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true, // nullable — customer may use phone-only OTP
        validate: { isEmail: true },
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true, // nullable — customer may use email-only auth
        comment: 'E.164 format, e.g. 919876543210 (no + prefix, digits only)',
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true, // null for OTP-only customers
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'True once they verify email or WhatsApp OTP for the first time',
    },
    savedAddresses: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { label, name, phone, address, city, state, pincode, isDefault }',
    },
    resetToken: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    resetTokenExpiry: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: true,
    indexes: [
        // email is unique per store, not globally
        {
            unique: true,
            fields: ['storeId', 'email'],
            where: { email: { [require('sequelize').Op.ne]: null } },
            name: 'store_customer_store_email_unique',
        },
        // phone is unique per store
        {
            unique: true,
            fields: ['storeId', 'phone'],
            where: { phone: { [require('sequelize').Op.ne]: null } },
            name: 'store_customer_store_phone_unique',
        },
    ],
});

// Association: a StoreCustomer belongs to a WaStore
StoreCustomer.belongsTo(WaStore, { foreignKey: 'storeId', as: 'store' });
WaStore.hasMany(StoreCustomer, { foreignKey: 'storeId', as: 'customers' });

module.exports = StoreCustomer;
