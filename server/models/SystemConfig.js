const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemConfig = sequelize.define('SystemConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // Singleton Enforcer (always ID 1)
    singletonDetails: {
        type: DataTypes.STRING,
        defaultValue: 'CONFIG'
    },
    maintenanceMode: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    version: {
        type: DataTypes.STRING,
        defaultValue: '1.0.0'
    },
    throughputLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 50, // Messages per second
        comment: 'Global messages per second limit'
    },
    globalAnnouncement: {
        type: DataTypes.JSON,
        defaultValue: {
            active: false,
            message: '',
            type: 'info' // info, warning, error
        }
    },
    ipBlacklist: {
        type: DataTypes.JSON,
        defaultValue: [] // Array of IP strings
    },
    settings: {
        type: DataTypes.JSON,
        defaultValue: {
            allowRegistration: true,
            debugMode: false
        }
    },
    lastSessionKill: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true
});

// Helper to get the singleton instance
SystemConfig.getConfig = async function () {
    let config = await SystemConfig.findOne({ where: { id: 1 } });
    if (!config) {
        config = await SystemConfig.create({ id: 1 });
    }
    return config;
};

module.exports = SystemConfig;
