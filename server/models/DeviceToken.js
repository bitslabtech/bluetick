const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A push token registered by a mobile device for a specific user.
 *   kind 'expo'      - Expo push token, used for normal chat notifications (default)
 *   kind 'fcm'       - raw FCM token (Android), used ONLY for incoming-call data pushes
 *   kind 'apns_voip' - APNs VoIP token (iOS), used ONLY for incoming-call pushes
 */
const DeviceToken = sequelize.define('DeviceToken', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    token: { type: DataTypes.STRING(512), allowNull: false, unique: true },
    platform: { type: DataTypes.STRING, allowNull: true }, // ios | android
    kind: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'expo' },
}, {
    timestamps: true,
    indexes: [{ fields: ['userId'] }]
});

module.exports = DeviceToken;
