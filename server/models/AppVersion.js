const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AppVersion = sequelize.define('AppVersion', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    version: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Semantic version string, e.g. 1.2.0'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Short release title, e.g. Bug Fixes & Performance'
    },
    changelog: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detailed changelog text (supports markdown)'
    },
    releasedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    isCurrent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Only one version should be marked current at a time'
    }
}, {
    timestamps: true
});

module.exports = AppVersion;
