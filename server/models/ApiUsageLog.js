const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ApiUsageLog — Records every call made through the external /api/v1/* gateway.
 * Used for:
 *  - Client self-service usage dashboard
 *  - Admin platform analytics
 *  - Abuse detection
 *  - Billing audit trail
 */
const ApiUsageLog = sequelize.define('ApiUsageLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Owner of the API key (parent user if team member)'
    },
    apiKeyId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'The ApiKey record that authenticated this request'
    },
    // Request details
    method: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'HTTP method: GET, POST, etc.'
    },
    endpoint: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Normalized endpoint path e.g. POST /v1/messages/template'
    },
    // Response details
    statusCode: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'HTTP status code returned: 200, 201, 400, 401, 403, 429, 500'
    },
    responseTimeMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'How long the request took to process in milliseconds'
    },
    // Message-specific context (nullable for non-message endpoints)
    recipientPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Masked recipient number (last 4 digits only) for privacy'
    },
    templateName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaMessageId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Message ID returned by Meta on success'
    },
    // Error tracking
    errorCode: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Internal error code e.g. PLAN_EXPIRED, RATE_LIMITED'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Security / Audit
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userAgent: {
        type: DataTypes.STRING(512),
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['apiKeyId'] },
        { fields: ['createdAt'] },
        { fields: ['statusCode'] }
    ]
});

module.exports = ApiUsageLog;
