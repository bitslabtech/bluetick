const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Flow = require('./Flow');
const User = require('./User');
const Contact = require('./Contact');

const FlowExecutionLog = sequelize.define('FlowExecutionLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    flowId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Flow,
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    contactId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: Contact,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('triggered', 'completed', 'dropped'),
        defaultValue: 'triggered',
        comment: 'triggered = flow started, completed = flow reached end or handoff, dropped = contact abandoned mid-flow'
    },
    triggerType: {
        type: DataTypes.ENUM('keyword', 'any', 'jump', 'api'),
        defaultValue: 'keyword',
        comment: 'How the flow was invoked'
    },
    nodesExecuted: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of nodes the runner traversed before stopping'
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the flow naturally ended or was handed off'
    }
}, {
    tableName: 'FlowExecutionLogs',
    timestamps: true,
    updatedAt: true
});

// Associations
FlowExecutionLog.belongsTo(Flow, { foreignKey: 'flowId', as: 'flow' });
Flow.hasMany(FlowExecutionLog, { foreignKey: 'flowId', as: 'executionLogs' });

FlowExecutionLog.belongsTo(User, { foreignKey: 'userId' });
FlowExecutionLog.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

module.exports = FlowExecutionLog;
