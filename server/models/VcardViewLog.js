const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Vcard = require('./Vcard');

const VcardViewLog = sequelize.define('VcardViewLog', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    vcardId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Owner of the vCard (for quick analytics queries)'
    },
    // Optional: store visitor country or UA for future breakdown charts
    viewedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'VcardViewLogs',
    indexes: [
        { fields: ['userId', 'viewedAt'] },
        { fields: ['vcardId', 'viewedAt'] }
    ]
});

Vcard.hasMany(VcardViewLog, { foreignKey: 'vcardId', as: 'viewLogs' });
VcardViewLog.belongsTo(Vcard, { foreignKey: 'vcardId', as: 'vcard' });

module.exports = VcardViewLog;
