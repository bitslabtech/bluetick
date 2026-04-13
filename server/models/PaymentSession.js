const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Form = require('./Form');

const PaymentSession = sequelize.define('PaymentSession', {
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
    gateway: {
        type: DataTypes.STRING, // e.g., 'stripe', 'razorpay', 'cashfree', 'phonepe'
        allowNull: false
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    },
    answersData: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
});

Form.hasMany(PaymentSession, { foreignKey: 'formId', onDelete: 'CASCADE' });
PaymentSession.belongsTo(Form, { foreignKey: 'formId' });

module.exports = PaymentSession;
