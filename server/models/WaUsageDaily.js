const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Daily cost/volume snapshot copied from Meta's pricing_analytics so history
// outlives Meta's one-year lookback and the usage page loads without hitting Meta.
const WaUsageDaily = sequelize.define('WaUsageDaily', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    pricingCategory: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    pricingType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    country: { type: DataTypes.STRING(8), allowNull: false, defaultValue: '' },
    volume: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    cost: { type: DataTypes.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(8), allowNull: true }
}, {
    timestamps: true,
    indexes: [
        { unique: true, fields: ['userId', 'date', 'pricingCategory', 'pricingType', 'country'] },
        { fields: ['userId', 'date'] }
    ]
});

module.exports = WaUsageDaily;
