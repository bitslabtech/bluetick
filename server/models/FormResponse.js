const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Form = require('./Form');

const FormResponse = sequelize.define('FormResponse', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    formId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Form,
            key: 'id'
        }
    },
    contactNumber: {
        type: DataTypes.STRING,
        allowNull: true // Might be anonymous or not provided
    },
    answers: {
        // A direct map of { fieldId/label: 'answer text' }
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'new' // 'new', 'contacted', 'closed'
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    },
    paymentStatus: {
        type: DataTypes.ENUM('none', 'pending', 'paid', 'failed'),
        defaultValue: 'none'
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    amountPaid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    currency: {
        type: DataTypes.STRING,
        allowNull: true
    },
    gatewayUsed: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

Form.hasMany(FormResponse, { foreignKey: 'formId', onDelete: 'CASCADE' });
FormResponse.belongsTo(Form, { foreignKey: 'formId' });

module.exports = FormResponse;
