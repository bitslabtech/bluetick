const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VcardEnquiry = sequelize.define('VcardEnquiry', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    vcardId: {
        type: DataTypes.UUID,  // Vcards.id is UUID
        allowNull: false
    },
    userId: { // The owner of the vcard
        type: DataTypes.UUID,  // Users.id is UUID
        allowNull: false
    },
    type: { 
        type: DataTypes.ENUM('enquiry', 'booking'),
        defaultValue: 'enquiry'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    appointmentDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('new', 'read', 'replied', 'archived'),
        defaultValue: 'new'
    }
}, {
    timestamps: true,
    tableName: 'VcardEnquiries'
});

module.exports = VcardEnquiry;
