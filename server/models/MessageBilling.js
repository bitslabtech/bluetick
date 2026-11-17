const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// One row per outbound WhatsApp message. `source` is stamped by whichever feature sent it
// (tagOutbound), pricing fields arrive later from Meta's status webhook (recordPricing).
const MessageBilling = sequelize.define('MessageBilling', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    messageId: { type: DataTypes.STRING, allowNull: false, unique: true },
    source: { type: DataTypes.STRING(32), allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: true },
    pricingModel: { type: DataTypes.STRING(16), allowNull: true },
    pricingType: { type: DataTypes.STRING(40), allowNull: true },
    pricingCategory: { type: DataTypes.STRING(40), allowNull: true },
    billable: { type: DataTypes.BOOLEAN, allowNull: true }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId', 'createdAt'] },
        { fields: ['userId', 'source'] }
    ]
});

module.exports = MessageBilling;
