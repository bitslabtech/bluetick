const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReferralReward = sequelize.define('ReferralReward', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    referrerId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    referredUserId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    rewardLog: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'JSON dump of the dynamic rewards granted at the time'
    }
}, {
    timestamps: true
});

module.exports = ReferralReward;
