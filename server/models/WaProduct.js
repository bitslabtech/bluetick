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
    taxRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Specific GST/Tax percentage for this product. Overrides global rate.'
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
    sku: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Stock Keeping Unit'
    },
    trackQuantity: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Enable precise quantity tracking for this product'
    },
    stockQuantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Current stock quantity'
    },
    lowStockThreshold: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        comment: 'Threshold for low stock warning'
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
