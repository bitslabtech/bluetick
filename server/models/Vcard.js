const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User'); // Used for foreign key

const Vcard = sequelize.define('Vcard', {
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
        comment: 'The URL path slug (e.g. domain.com/vcard/john-doe)'
    },
    themeId: {
        type: DataTypes.STRING,
        defaultValue: 'modern-dark',
        comment: 'Identifier for the frontend theme to render'
    },
    status: {
        type: DataTypes.ENUM('active', 'draft', 'inactive'),
        defaultValue: 'active'
    },

    // Identity & Basic Info
    name: { type: DataTypes.STRING, allowNull: false },
    designation: { type: DataTypes.STRING },
    company: { type: DataTypes.STRING },
    bio: { type: DataTypes.TEXT },
    profileImage: { type: DataTypes.STRING }, // URL path
    coverImage: { type: DataTypes.STRING }, // URL path
    
    // Custom Appearance
    primaryColor: { type: DataTypes.STRING, defaultValue: '#0ea5e9' },
    fontFamily: { type: DataTypes.STRING, defaultValue: 'Inter' },
    customCss: { type: DataTypes.TEXT },

    // Contact Details
    email: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    alternatePhone: { type: DataTypes.STRING },
    whatsappNumber: { type: DataTypes.STRING }, // Formatted with country code
    website: { type: DataTypes.STRING },
    location: { type: DataTypes.STRING },

    // SEO & Tracking
    seoTitle: { type: DataTypes.STRING },
    seoDescription: { type: DataTypes.TEXT },
    googleAnalyticsId: { type: DataTypes.STRING },
    facebookPixelId: { type: DataTypes.STRING },

    // Advanced SaaS Toggles
    hideBranding: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Optional password protection for the vCard'
    },

    // Dynamic JSON Blocks for ultimate flexibility instead of 5 extra tables
    socialLinks: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { platform, url, label }'
    },
    services: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { title, description, price, iconType, iconClass, imageUrl, url }'
    },
    servicesAutoplay: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Toggle for autoplaying the services carousel'
    },
    products: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { title, badge, price, description, imageUrl, url }'
    },
    testimonials: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { name, company, review, rating, imageUrl }'
    },
    businessHours: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Object map for days { monday: { enabled, open, close }, ... }'
    },
    
    // --- Premium Sections (JSON blocks) ---
    heroMedia: {
        type: DataTypes.JSON,
        defaultValue: null,
        comment: '{ type: "image"|"video", url, videoType: "url"|"youtube", youtubeId, overlay: true|false }'
    },
    gallery: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { url, caption }'
    },
    galleryStyle: {
        type: DataTypes.STRING,
        defaultValue: 'grid',
        comment: 'Gallery layout: grid | slides'
    },
    galleryAutoplay: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Toggle for autoplaying the gallery carousel'
    },
    gallerySlidesPerView: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'Number of images to show per view in slideshow'
    },
    testimonialsAutoplay: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Autoplay testimonial slider'
    },
    testimonialsPerView: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'Number of testimonials per slide: 1 or 2'
    },
    contactButtons: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { type: "whatsapp"|"call"|"email"|"sms"|"maps", value, label }'
    },
    enquiryForm: {
        type: DataTypes.JSON,
        defaultValue: null,
        comment: '{ enabled, heading, fields: [...], submitLabel, recipientEmail }'
    },
    booking: {
        type: DataTypes.JSON,
        defaultValue: null,
        comment: '{ enabled, heading, url, buttonLabel, description }'
    },
    instagramPosts: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of { postUrl, embedCode } - Instagram embed posts/reels'
    },
    instagramDisplayStyle: {
        type: DataTypes.STRING,
        defaultValue: 'slides',
        comment: 'Instagram layout: grid | slides'
    },
    instagramSlidesPerView: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
        comment: 'Number of instagram posts to show per view in slideshow'
    },
    instagramAutoplay: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Autoplay instagram slider'
    },

    // Analytics cache
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true
});

// Relationships
User.hasMany(Vcard, { foreignKey: 'userId', as: 'vcards' });
Vcard.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

module.exports = Vcard;
