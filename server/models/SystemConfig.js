const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const NodeCache = require('node-cache');

// Cache config for 60 seconds
const configCache = new NodeCache({ stdTTL: 60 });

// Register with centralized cache manager so admin "Purge Cache" flushes this too
const cacheManager = require('../utils/cacheManager');
cacheManager.register('system_config', {
    get: () => configCache.get('system_config'),
    set: (data) => configCache.set('system_config', data),
    clear: () => configCache.flushAll()
});


const SystemConfig = sequelize.define('SystemConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // Singleton Enforcer (always ID 1)
    singletonDetails: {
        type: DataTypes.STRING,
        defaultValue: 'CONFIG'
    },
    maintenanceMode: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    version: {
        type: DataTypes.STRING,
        defaultValue: '1.0.0'
    },
    throughputLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 50, // Messages per second
        comment: 'Global messages per second limit'
    },
    globalAnnouncement: {
        type: DataTypes.JSON,
        defaultValue: {
            active: false,
            message: '',
            type: 'info', // info, warning, error
            buttonText: '',  // optional CTA button label
            buttonUrl: ''    // optional CTA button URL
        }
    },
    ipBlacklist: {
        type: DataTypes.JSON,
        defaultValue: [] // Array of IP strings
    },
    integrations: {
        type: DataTypes.JSON,
        defaultValue: {
            google: {
                enabled: false,
                clientId: '',
                clientSecret: '',
                redirectUri: ''
            }
        },
        comment: 'Third-party OAuth / integration credentials managed by superadmin'
    },
    menuOrder: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Ordered list of navigation item labels or keys for global sidebar menu arrangement'
    },
    settings: {
        type: DataTypes.JSON,
        defaultValue: {
            appName: 'Bluetick',
            allowRegistration: true,
            debugMode: false,
            linkedAdminUserId: null, // Used for official Platform-as-a-CRM communication
            globalCurrency: 'INR', // Default global currency for billing and UI
            rateLimit: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                maxRequests: 1000 // Limit each IP to 1000 requests per `window`
            },
            aiTokenMultipliers: { ai_chatbot: 1, ai_form_generator: 1, ai_meta_ads_builder: 5 },
            aiModel: 'gemini-2.0-flash',
            showLockedMenus: true, // Upsell mode by default
            storage: {
                type: 'local', // 'local' | 's3'
                s3: {
                    endpoint: '',
                    region: '',
                    bucket: '',
                    accessKeyId: '',
                    secretAccessKey: '',
                    publicUrlPrefix: ''
                }
            },
            referralRules: {
                enabled: true,
                referrerRewards: [
                    { type: 'validity_months', value: 2 }
                ],
                refereeRewards: [
                    { type: 'validity_months', value: 1 },
                    { type: 'ai_tokens', value: 200 }
                ]
            },
            techPartnerProgram: {
                enabled: true,
                commissionRate: 20,          // % of plan price
                minPayoutBalance: 10000,      // minimum balance before payout can be requested
                requiresYearlyPlan: true      // must have purchased a 1-year plan to be eligible to apply
            }
        }
    },
    lastSessionKill: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true
});

// Helper to get the singleton instance (No cache - for internal/admin usage)
SystemConfig.getConfig = async function () {
    let config = await SystemConfig.findOne({ where: { id: 1 } });
    if (!config) {
        config = await SystemConfig.create({ id: 1 });
    }
    return config;
};

// Cached version for high-concurrency middlewares
SystemConfig.getCachedConfig = async function () {
    const cachedConfig = configCache.get('system_config');
    if (cachedConfig) {
        return cachedConfig;
    }

    const config = await SystemConfig.getConfig();
    const cleanConfig = config.get({ plain: true }); // Store as plain object to save memory
    configCache.set('system_config', cleanConfig);

    return cleanConfig;
};

// Invalidate cache after hooks
SystemConfig.afterSave((config, options) => {
    configCache.del('system_config');
});

module.exports = SystemConfig;
