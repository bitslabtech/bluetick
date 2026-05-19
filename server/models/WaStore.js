const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User'); // Used for foreign key

const WaStore = sequelize.define('WaStore', {
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
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'The URL path slug (e.g. domain.com/store/john-shoes)'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    logo: {
        type: DataTypes.STRING // URL path
    },
    coverImage: {
        type: DataTypes.STRING // URL path
    },
    heroSlides: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { imageUrl, title, subtitle, ctaText } for the hero slider'
    },
    whatsappNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Formatted with country code. Used for checkout'
    },
    phone: {
        type: DataTypes.STRING,
        comment: 'General contact phone number'
    },
    email: {
        type: DataTypes.STRING,
        comment: 'Store contact email'
    },
    address: {
        type: DataTypes.STRING,
        comment: 'Street address'
    },
    city: {
        type: DataTypes.STRING
    },
    state: {
        type: DataTypes.STRING
    },
    country: {
        type: DataTypes.STRING
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    },
    themeId: {
        type: DataTypes.STRING,
        defaultValue: 'vogue',
        comment: 'vogue, cyber, glow, luxe, crave, nordic, fresh, pulse, professional'
    },
    themeCustomizations: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Overrides for colors, fonts, etc.'
    },
    gridColumns: {
        type: DataTypes.JSON,
        defaultValue: { desktop: 4, mobile: 2 },
        comment: 'Number of product columns: { desktop: 2-6, mobile: 1-3 }'
    },
    categories: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of category name strings managed by the store owner'
    },
    categoryImages: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Map of category names to image URLs'
    },
    termsConditions: {
        type: DataTypes.TEXT
    },
    privacyPolicy: {
        type: DataTypes.TEXT
    },
    returnPolicy: {
        type: DataTypes.TEXT
    },
    customDomain: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        comment: 'Optional custom domain mapping (e.g. shop.mystore.com)'
    },
    seoConfig: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Stores meta title, description, keywords, GA/Pixel IDs'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true
});

module.exports = WaStore;
