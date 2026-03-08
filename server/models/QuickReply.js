const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuickReply = sequelize.define('QuickReply', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    // Shortcut trigger e.g. 'hello', 'thanks', 'hours'
    shortcut: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Full message text that gets inserted
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['userId', 'shortcut'] }
    ]
});

module.exports = QuickReply;
