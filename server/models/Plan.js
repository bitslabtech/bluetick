const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Plan = sequelize.define('Plan', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Legacy fallback price. Unused in multi-interval setup.'
    },
    monthlyPrice: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    halfYearlyPrice: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    yearlyPrice: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    },
    taxEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    taxText: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'excluding 18% GST'
    },
    interval: {
        type: DataTypes.ENUM('month', 'year', 'lifetime', 'half-year'),
        defaultValue: 'month',
        comment: 'Legacy fallback interval. Used structurally but largely overridden dynamically.'
    },
    trialDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of free trial days before payment is required. Set to 0 to disable.'
    },
    messageLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 30
    },
    contactLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    templateLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 2
    },
    quickReplyLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    tagLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        comment: 'Limit for number of labels/tags'
    },
    groupLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 5
    },
    teamMemberLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Maximum number of team members allowed for this plan'
    },
    features: {
        type: DataTypes.JSON, // Stores array of feature strings
        defaultValue: []
    },
    coreFeatures: {
        type: DataTypes.JSON, // Stores array of objects: [{ name: '...', qty: '...' }]
        defaultValue: []
    },
    flowBotEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this plan includes access to the FlowBot Builder feature'
    },
    flowLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        comment: 'Max number of FlowBot flows a user can create. 0 = unlimited.'
    },
    includedAddons: {
        type: DataTypes.JSON, // Stores array of addon module_keys
        defaultValue: [],
        comment: 'List of add-on module_key strings that are automatically enrolled when a user Subscribes to this plan'
    },
    allowApiAccess: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this plan allows access to Developer API Keys & Webhooks'
    },
    aiTokensAllowance: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'One-time bulk addition of AI tokens granted when purchasing or renewing this plan'
    },
    allowCtwaAnalytics: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this plan includes access to CTWA (Click to WhatsApp Ads) Analytics'
    },
    allowMetaAds: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this plan includes access to the Meta Ads Manager'
    },
    allowVcard: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this plan allows access to create vCards'
    },
    vcardLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Limit for number of digital business cards/vCards'
    },
    allowWaLinks: {
        type: DataTypes.BOOLEAN,
        defaultValue: true, // Default to true as it's a basic utility
        comment: 'Whether this plan allows access to the WhatsApp Link & QR Generator'
    },
    allowWaStore: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this plan allows access to create WhatsApp Stores'
    },
    waStoreLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Limit for number of WhatsApp Stores'
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: 'blue' // blue, purple, amber, etc. for UI themes
    },
    isPopular: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Only 1 plan can be default. Hidden from public, assigned to direct registrations.'
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether plan is visible on public pricing page. Default plan should be false.'
    },
    storageLimitMb: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
        comment: 'Storage quota in MB for Online Store + vCard uploads. 0 = unlimited.'
    }
}, {
    timestamps: true
});

module.exports = Plan;
