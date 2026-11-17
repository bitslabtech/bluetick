const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * One WhatsApp voice call (Phase 1: customer-initiated / INBOUND only).
 * `userId` is the workspace OWNER id, so every team member of the workspace sees the same history.
 *
 * status:
 *   ringing   - waiting for a team member to answer
 *   answered  - a member accepted; media is flowing (or about to)
 *   ended     - an answered call finished normally
 *   missed    - nobody answered (timeout, or the customer hung up first)
 *   declined  - every ringing member declined
 *   rejected  - we refused it up front (add-on / tier / disabled / outside hours)
 *   failed    - Meta or the connection failed
 */
const Call = sequelize.define('Call', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    conversationId: { type: DataTypes.UUID, allowNull: true },
    metaCallId: { type: DataTypes.STRING, allowNull: false, unique: true },
    direction: { type: DataTypes.STRING, defaultValue: 'INBOUND' },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    contactName: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'ringing' },
    endReason: { type: DataTypes.STRING, allowNull: true },
    // Never sent to clients in lists; fetched once by the answering device.
    sdpOffer: { type: DataTypes.TEXT, allowNull: true },
    // 1 = first ring group (assignee, or owner/admins); 2 = fallback to the whole workspace
    ringStage: { type: DataTypes.INTEGER, defaultValue: 1 },
    stage2At: { type: DataTypes.DATE, allowNull: true },
    ringTargets: { type: DataTypes.JSON, defaultValue: [] },     // user ids currently ringing
    declinedBy: { type: DataTypes.JSON, defaultValue: [] },      // user ids that declined
    answeredBy: { type: DataTypes.UUID, allowNull: true },
    answeredByName: { type: DataTypes.STRING, allowNull: true },
    startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    answeredAt: { type: DataTypes.DATE, allowNull: true },
    endedAt: { type: DataTypes.DATE, allowNull: true },
    durationSec: { type: DataTypes.INTEGER, defaultValue: 0 },
    // What we auto-sent the caller: { which, mode, outcome: sent|skipped|failed, reason }
    autoMessage: { type: DataTypes.JSON, allowNull: true },
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId', 'createdAt'] },
        { fields: ['status'] },
    ],
});

module.exports = Call;
