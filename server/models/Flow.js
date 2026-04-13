const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User'); // Assuming flows belong to a user/workspace

const Flow = sequelize.define('Flow', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Untitled Flow'
    },
    triggerKeyword: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'If null, it might be triggered by an API or matches Any'
    },
    isAny: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'If true, triggers on any unhandled message'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    nodes: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Stores the React Flow nodes array'
    },
    edges: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Stores the React Flow edges array'
    }
}, {
    timestamps: true
});

Flow.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
User.hasMany(Flow, { foreignKey: 'userId', as: 'flows' });

module.exports = Flow;
