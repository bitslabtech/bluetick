const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Form = sequelize.define('Form', {
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
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fields: {
        // Storing the entire form structure (labels, types, required flags)
        type: DataTypes.JSONB,
        defaultValue: []
    },
    theme: {
        type: DataTypes.STRING,
        defaultValue: 'light' // light, dark, apple
    },
    isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    brandConfig: {
        type: DataTypes.JSONB,
        defaultValue: {} // { logoUrl, coverImageUrl, primaryColor, font }
    },
    formLogic: {
        type: DataTypes.JSONB,
        defaultValue: {} // { isMultiStep }
    },
    automation: {
        type: DataTypes.JSONB,
        defaultValue: {} // { webhookUrl, autoReplyMessage }
    },
    restrictions: {
        type: DataTypes.JSONB,
        defaultValue: {} // { closeDate, maxSubmissions, preventDuplicates }
    },
    paymentConfig: {
        type: DataTypes.JSONB,
        defaultValue: {} // { requirePayment, gatewayUsed, currency, amountType, fixedAmount, dynamicFieldId }
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

User.hasMany(Form, { foreignKey: 'userId', onDelete: 'CASCADE' });
Form.belongsTo(User, { foreignKey: 'userId' });

module.exports = Form;
