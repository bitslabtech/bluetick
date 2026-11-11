const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Expo push token registered by a mobile device for a specific user. */
const DeviceToken = sequelize.define('DeviceToken', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    platform: { type: DataTypes.STRING, allowNull: true }, // ios | android
}, {
    timestamps: true,
    indexes: [{ fields: ['userId'] }]
});

module.exports = DeviceToken;
