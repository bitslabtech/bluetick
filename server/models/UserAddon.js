const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Addon = require('./Addon');

const UserAddon = sequelize.define('UserAddon', {
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
    addonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Addon,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING, // active, past_due, canceled, trialing
        defaultValue: 'active'
    },
    config: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Stores add-on specific settings for the user'
    },
    stripeSubscriptionId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    currentPeriodStart: {
        type: DataTypes.DATE,
        allowNull: true
    },
    currentPeriodEnd: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true
});

// Define Relationships
User.hasMany(UserAddon, { foreignKey: 'userId', as: 'addons' });
UserAddon.belongsTo(User, { foreignKey: 'userId' });

Addon.hasMany(UserAddon, { foreignKey: 'addonId' });
UserAddon.belongsTo(Addon, { foreignKey: 'addonId' });

module.exports = UserAddon;
