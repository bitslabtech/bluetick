const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Group = sequelize.define('Group', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '#3B82F6'
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['name', 'userId']
        }
    ]
});

module.exports = Group;
