const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Vcard = require('./Vcard');
const User = require('./User');

const NfcCard = sequelize.define('NfcCard', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    shortCode: { 
        type: DataTypes.STRING, 
        unique: true,
        allowNull: false,
        comment: 'Unique 6-8 char code for URL redirect, e.g., domain.com/n/CODE'
    },
    batchId: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    type: { 
        type: DataTypes.ENUM('metal_card', 'pvc_card', 'keychain'), 
        defaultValue: 'pvc_card' 
    },
    status: { 
        type: DataTypes.ENUM('unassigned', 'assigned'), 
        defaultValue: 'unassigned' 
    },
    vcardId: { 
        type: DataTypes.UUID, 
        allowNull: true,
        references: {
            model: Vcard,
            key: 'id'
        }
    },
    userId: { 
        type: DataTypes.UUID, 
        allowNull: true,
        references: {
            model: User,
            key: 'id'
        }
    }
}, { 
    timestamps: true 
});

NfcCard.belongsTo(Vcard, { foreignKey: 'vcardId', as: 'vcard' });
NfcCard.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

module.exports = NfcCard;
