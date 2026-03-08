const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoadmapItem = sequelize.define('RoadmapItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Requested', 'Approved', 'In Progress', 'Live'),
        defaultValue: 'Requested'
    },
    upvotes: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    voters: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    date: {
        type: DataTypes.DATE, // Expected release date
        allowNull: true
    },
    suggesterId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    suggesterName: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = RoadmapItem;
