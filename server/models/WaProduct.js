const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const WaStore = require('./WaStore'); 

const WaProduct = sequelize.define('WaProduct', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: WaStore,
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    compareAtPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Used for showing discounts'
    },
    imageUrls: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of image URLs'
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    inStock: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    options: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { name: "Size", values: ["S", "M", "L"] }'
    },
    wholesalePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Special B2B wholesale price'
    },
    minWholesaleQty: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Minimum quantity to qualify for wholesale price'
    }
}, {
    timestamps: true
});

module.exports = WaProduct;
