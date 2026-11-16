const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Append-only archive of every published version of every platform policy page.
// A new row is inserted each time the superadmin saves a policy page with a version bump.
// Never updated or deleted — used to reconstruct exactly what a user agreed to at registration.
const PolicyVersion = sequelize.define('PolicyVersion', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    // 'privacy' | 'terms' | 'return' | 'shipping' | 'about' | 'custom:<slug>'
    policyKey: {
        type: DataTypes.STRING(64),
        allowNull: false
    },
    version: {
        type: DataTypes.STRING(32),
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    },
    note: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null
    },
    publishedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    publishedBy: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    timestamps: false,
    indexes: [
        { fields: ['policyKey', 'version'] },
        { fields: ['policyKey', 'publishedAt'] }
    ]
});

module.exports = PolicyVersion;
