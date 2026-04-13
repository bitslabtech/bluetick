const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemNotification = sequelize.define('SystemNotification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    recipient: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'All Users'
    },
    type: {
        type: DataTypes.ENUM('Info', 'Success', 'Warning', 'Error'),
        defaultValue: 'Info'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    target: {
        type: DataTypes.STRING, // e.g. "Single User", "All Users" - for UI display
        defaultValue: 'All Users'
    },
    buttonName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    buttonUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Sent'
    }
});

module.exports = SystemNotification;
