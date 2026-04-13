const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Contact = require('./Contact');
const Flow = require('./Flow');

const ContactFlowState = sequelize.define('ContactFlowState', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    contactId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Contact,
            key: 'id'
        }
    },
    flowId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Flow,
            key: 'id'
        }
    },
    currentNodeId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'The React Flow node ID where the user is currently paused (waiting for input)'
    },
    variables: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Extracted data from their answers to use later in the flow'
    }
}, {
    timestamps: true
});

ContactFlowState.belongsTo(Contact, { foreignKey: 'contactId' });
Contact.hasMany(ContactFlowState, { foreignKey: 'contactId' });

ContactFlowState.belongsTo(Flow, { foreignKey: 'flowId' });
Flow.hasMany(ContactFlowState, { foreignKey: 'flowId' });

module.exports = ContactFlowState;
