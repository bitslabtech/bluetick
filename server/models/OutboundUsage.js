const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Plan allowance counter: messages counted toward the plan per owner per month (owner's time zone).
// Reserved atomically before each send, released when a send fails. Rebuilt from OutboundMessage
// by the daily reconciliation, so it can never drift for long.
const OutboundUsage = sequelize.define('OutboundUsage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ownerId: { type: DataTypes.UUID, allowNull: false },
    period: { type: DataTypes.STRING(7), allowNull: false }, // YYYY-MM
    used: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
    timestamps: true,
    indexes: [{ unique: true, fields: ['ownerId', 'period'] }]
});

module.exports = OutboundUsage;
