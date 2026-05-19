const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const NfcOrder = sequelize.define('NfcOrder', {
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
    productType: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    quantity: { 
        type: DataTypes.INTEGER, 
        defaultValue: 1 
    },
    status: { 
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'), 
        defaultValue: 'pending' 
    },
    shippingAddress: { 
        type: DataTypes.TEXT,
        allowNull: true
    },
    contactNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    amount: { 
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    paymentStatus: { 
        type: DataTypes.ENUM('pending', 'paid', 'failed'), 
        defaultValue: 'pending' 
    }
}, { 
    timestamps: true 
});

NfcOrder.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = NfcOrder;
