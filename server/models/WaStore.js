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
    showCrossSells: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Show cross-sell / you-may-also-like products from same category on single product page'
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
    hiddenCategories: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of category names hidden from the landing page category list'
    },
    categoryDetails: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Map of category names to detail objects { description, metaTitle, metaDesc }'
    },
    megaMenu: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Configuration for the frontend navigation Mega Menu'
    },
    mobileBottomMenu: {
        type: DataTypes.JSON,
        defaultValue: [
            { id: 'home', enabled: true },
            { id: 'search', enabled: true },
            { id: 'cart', enabled: true },
            { id: 'whatsapp', enabled: true },
            { id: 'categories', enabled: false },
            { id: 'policies', enabled: false },
            { id: 'profile', enabled: false }
        ],
        comment: 'Configuration for the mobile bottom navigation bar'
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
    checkoutMode: {
        type: DataTypes.ENUM('whatsapp', 'gateway'),
        defaultValue: 'whatsapp',
        comment: 'Determines if checkout redirects to WhatsApp or uses Direct Payment Gateway'
    },
    paymentProvider: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'e.g. razorpay, phonepe'
    },
    paymentConfig: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Stores API keys/secrets securely'
    },
    checkoutConfig: {
        type: DataTypes.JSON,
        defaultValue: { minOrderValue: 0, flatShippingRate: 0, freeShippingThreshold: 0 },
        comment: 'Stores checkout configuration like min order value, shipping rates'
    },
    taxConfig: {
        type: DataTypes.JSON,
        defaultValue: { enabled: false, type: 'gst', taxInclusive: false, slabs: [], rate: 0, autoGenerateBill: false, autoSendWhatsApp: false },
        comment: 'Stores global tax / GST configuration including tax inclusive flag and multiple slabs'
    },
    shippingConfig: {
        type: DataTypes.JSON,
        defaultValue: { enabled: false, provider: null },
        comment: 'Stores Shiprocket / Delhivery config'
    },
    inventoryConfig: {
        type: DataTypes.JSON,
        defaultValue: {
            autoOutOfStock: false,
            showLowStock: false,
            preventCartAdd: false
        },
        comment: 'Store-level inventory management preferences'
    },
    invoiceConfig: {
        type: DataTypes.JSON,
        defaultValue: {
            prefixOnline: 'ORD-',
            prefixPos: 'POS-',
            startingNumber: 1001
        },
        comment: 'Store-level invoice numbering preferences'
    },
    notificationTemplates: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Per-trigger notification config: { order_placed: { enabled, mode, templateId, customMessage }, ... }'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    customerAuthConfig: {
        type: DataTypes.JSON,
        defaultValue: {
            enabled: false,
            methods: ['email_password'], // 'email_password' | 'whatsapp_otp' | both
            allowGuestCheckout: true,
            requireLoginForCheckout: false,
        },
        comment: 'Per-store customer account settings: enable/disable, auth methods, etc.'
    },
    topBarConfig: {
        type: DataTypes.JSON,
        defaultValue: {
            enabled: false,
            messages: [{ id: '1', text: '🚀 Free shipping on orders above ₹999!' }],
            bgColor: '#1e1b4b',
            textColor: '#ffffff',
            marquee: false,
            fontSize: 'sm',
            padding: 'sm',
        },
        comment: 'Announcement bar config: enabled, messages, colors, marquee, sizing'
    }
}, {
    timestamps: true
});

module.exports = WaStore;
