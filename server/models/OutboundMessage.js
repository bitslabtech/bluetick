const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// The single ledger of every WhatsApp message Bluetick sends (or tries to send).
// Written only by services/outbound. Every report, the plan limit and the usage page read it.
//
// status: queued -> sent -> delivered -> read -> clicked   (forward only)
//         failed        Meta rejected it (at send time or later by webhook)
//         retry_pending campaign frequency cap (131049), a retry is scheduled
//         retried       superseded by a newer retry row (excluded from all counts)
//         blocked       never sent: plan limit reached
const OutboundMessage = sequelize.define('OutboundMessage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ownerId: { type: DataTypes.UUID, allowNull: false },          // workspace owner whose number sent it
    actorId: { type: DataTypes.UUID, allowNull: true },           // team member who triggered it
    platform: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // Bluetick's own number
    source: { type: DataTypes.STRING(40), allowNull: false },     // key from services/outbound/sources.js
    wamid: { type: DataTypes.STRING, allowNull: true, unique: true },
    toPhone: { type: DataTypes.STRING(32), allowNull: true },
    messageType: { type: DataTypes.STRING(24), allowNull: true },
    templateName: { type: DataTypes.STRING, allowNull: true },
    campaignId: { type: DataTypes.UUID, allowNull: true },
    conversationId: { type: DataTypes.UUID, allowNull: true },
    contactId: { type: DataTypes.UUID, allowNull: true },
    refType: { type: DataTypes.STRING(24), allowNull: true },     // order, form, flow, landing, call ...
    refId: { type: DataTypes.STRING, allowNull: true },
    retryOf: { type: DataTypes.UUID, allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'queued' },
    errorCode: { type: DataTypes.STRING(32), allowNull: true },
    errorReason: { type: DataTypes.TEXT, allowNull: true },
    countsTowardPlan: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    counted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // currently holds one unit of allowance
    periodKey: { type: DataTypes.STRING(7), allowNull: true },    // YYYY-MM in the owner's time zone
    sentAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    readAt: { type: DataTypes.DATE, allowNull: true },
    readInferred: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // read set from a reply or click
    clickedAt: { type: DataTypes.DATE, allowNull: true },
    failedAt: { type: DataTypes.DATE, allowNull: true },
    pricingModel: { type: DataTypes.STRING(16), allowNull: true },
    pricingType: { type: DataTypes.STRING(40), allowNull: true },
    pricingCategory: { type: DataTypes.STRING(40), allowNull: true },
    billable: { type: DataTypes.BOOLEAN, allowNull: true },
    backfilled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
    timestamps: true,
    paranoid: true, // soft delete only: deleting a campaign or chat never changes counts
    indexes: [
        { fields: ['ownerId', 'createdAt'] },
        { fields: ['ownerId', 'periodKey'] },
        { fields: ['campaignId'] },
        { fields: ['campaignId', 'updatedAt'] }, // live broadcast updates (GET /messages/:id/live)
        { fields: ['ownerId', 'toPhone'] },
        { fields: ['status'] }
    ]
});

module.exports = OutboundMessage;
