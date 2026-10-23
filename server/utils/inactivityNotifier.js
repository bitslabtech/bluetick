const { Op } = require('sequelize');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const InactivityNotificationLog = require('../models/InactivityNotificationLog');
const { sendSystemMessage } = require('./systemMessenger');

/**
 * Returns current inactivity notification configuration with defaults.
 */
async function getInactivityConfig() {
    const config = await SystemConfig.getConfig();
    const current = config?.settings?.inactivityNotification || {};
    return {
        enabled: current.enabled === true,
        days: Math.max(1, parseInt(current.days) || 7),
        targetType: current.targetType === 'plans' ? 'plans' : 'all',
        targetPlans: Array.isArray(current.targetPlans) ? current.targetPlans : [],
        templateName: current.templateName || '',
        languageCode: current.languageCode || 'en_US',
        hasButtonUrl: current.hasButtonUrl !== undefined ? Boolean(current.hasButtonUrl) : true,
        buttonUrl: current.buttonUrl || 'login',
        lastRunAt: current.lastRunAt || null,
        totalSent: parseInt(current.totalSent) || 0
    };
}

/**
 * Updates inactivity notification configuration in SystemConfig.
 */
async function updateInactivityConfig(updates = {}) {
    const config = await SystemConfig.getConfig();
    const existingSettings = config.settings || {};
    const existingInactivity = existingSettings.inactivityNotification || {};

    const updatedInactivity = {
        enabled: updates.enabled !== undefined ? Boolean(updates.enabled) : existingInactivity.enabled || false,
        days: updates.days !== undefined ? Math.max(1, parseInt(updates.days) || 7) : (existingInactivity.days || 7),
        targetType: updates.targetType === 'plans' ? 'plans' : 'all',
        targetPlans: Array.isArray(updates.targetPlans) ? updates.targetPlans : (existingInactivity.targetPlans || []),
        templateName: updates.templateName !== undefined ? String(updates.templateName).trim() : (existingInactivity.templateName || ''),
        languageCode: updates.languageCode !== undefined ? String(updates.languageCode).trim() : (existingInactivity.languageCode || 'en_US'),
        hasButtonUrl: updates.hasButtonUrl !== undefined ? Boolean(updates.hasButtonUrl) : (existingInactivity.hasButtonUrl !== undefined ? existingInactivity.hasButtonUrl : true),
        buttonUrl: updates.buttonUrl !== undefined ? String(updates.buttonUrl).trim() : (existingInactivity.buttonUrl || 'login'),
        lastRunAt: existingInactivity.lastRunAt || null,
        totalSent: existingInactivity.totalSent || 0
    };

    config.settings = {
        ...existingSettings,
        inactivityNotification: updatedInactivity
    };
    config.changed('settings', true);
    await config.save();

    const cacheManager = require('./cacheManager');
    cacheManager.invalidate('public_settings');

    return updatedInactivity;
}

/**
 * Preview which users currently match inactivity criteria.
 */
async function previewInactiveUsers(options = {}) {
    const currentConfig = await getInactivityConfig();
    const days = Math.max(1, parseInt(options.days ?? currentConfig.days) || 7);
    const targetType = options.targetType ?? currentConfig.targetType;
    const targetPlans = Array.isArray(options.targetPlans) ? options.targetPlans : currentConfig.targetPlans;

    const whereClause = {
        isAdmin: false,
        phone: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] }
    };

    if (targetType === 'plans' && targetPlans.length > 0) {
        whereClause.plan = { [Op.in]: targetPlans };
    }

    const users = await User.findAll({
        where: whereClause,
        attributes: ['id', 'name', 'email', 'phone', 'plan', 'lastLogin', 'createdAt', 'lastInactivityAlertSentAt']
    });

    const now = new Date();
    const thresholdMs = days * 24 * 60 * 60 * 1000;

    const matching = [];

    for (const u of users) {
        const referenceDate = u.lastLogin ? new Date(u.lastLogin) : new Date(u.createdAt);
        const diffMs = now.getTime() - referenceDate.getTime();
        const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs >= thresholdMs) {
            // Already alerted if an alert was sent AFTER their latest reference date
            const alreadyAlerted = Boolean(
                u.lastInactivityAlertSentAt &&
                new Date(u.lastInactivityAlertSentAt).getTime() >= referenceDate.getTime()
            );

            matching.push({
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                plan: u.plan,
                lastLogin: u.lastLogin,
                createdAt: u.createdAt,
                referenceDate,
                daysInactive,
                alreadyAlerted
            });
        }
    }

    matching.sort((a, b) => b.daysInactive - a.daysInactive);
    return matching;
}

/**
 * Process and send inactivity notifications.
 * Can be run from cron or manually triggered by Superadmin.
 */
async function processInactivityNotifications(options = {}) {
    const config = await getInactivityConfig();
    const isManual = options.force === true;

    // If automated check, ensure feature is enabled
    if (!isManual && !config.enabled) {
        return { success: false, message: 'Inactivity notification is disabled', sentCount: 0 };
    }

    const templateName = options.templateName || config.templateName;
    const languageCode = options.languageCode || config.languageCode || 'en_US';

    if (!templateName) {
        return { success: false, message: 'No WhatsApp template configured', sentCount: 0 };
    }

    const inactiveUsers = await previewInactiveUsers(options);
    if (inactiveUsers.length === 0) {
        return { success: true, message: 'No inactive users matched criteria', sentCount: 0, eligibleCount: 0 };
    }

    const now = new Date();
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const results = [];

    const frontendUrl = process.env.FRONTEND_URL || 'https://app.bluetick.com';

    for (const item of inactiveUsers) {
        // If not a forced manual trigger, skip users who already received an alert for this period
        if (!isManual && item.alreadyAlerted) {
            skippedCount++;
            continue;
        }

        const phoneClean = String(item.phone).replace(/\D/g, '');
        if (!phoneClean) {
            skippedCount++;
            continue;
        }

        const lastLoginStr = item.lastLogin
            ? new Date(item.lastLogin).toLocaleDateString()
            : 'Never (Registered)';

        // Parameters for template:
        // {{1}} = User Name
        // {{2}} = Inactive Days (e.g. 7 or 14)
        const bodyParameters = [
            { type: 'text', text: item.name || 'User' },
            { type: 'text', text: String(item.daysInactive) }
        ];

        const components = [
            {
                type: 'body',
                parameters: bodyParameters
            }
        ];

        // Button URL variable (if template has dynamic URL button)
        const hasButton = options.hasButtonUrl !== undefined ? Boolean(options.hasButtonUrl) : (config.hasButtonUrl !== false);
        const btnUrlValue = options.buttonUrl !== undefined ? options.buttonUrl : (config.buttonUrl || 'login');
        if (hasButton && btnUrlValue) {
            components.push({
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [
                    { type: 'text', text: String(btnUrlValue).trim() }
                ]
            });
        }

        try {
            const sendRes = await sendSystemMessage(phoneClean, 'template', {
                templateName,
                languageCode,
                components
            });

            if (sendRes && !sendRes.error) {
                sentCount++;

                // Mark user as alerted
                await User.update(
                    { lastInactivityAlertSentAt: now },
                    { where: { id: item.id } }
                );

                await InactivityNotificationLog.create({
                    userId: item.id,
                    userName: item.name,
                    userEmail: item.email,
                    userPhone: item.phone,
                    userPlan: item.plan,
                    lastLogin: item.lastLogin,
                    daysInactive: item.daysInactive,
                    templateName,
                    status: 'SENT',
                    responsePayload: sendRes
                });

                results.push({ id: item.id, name: item.name, email: item.email, status: 'SENT' });
            } else {
                failedCount++;
                const errMsg = sendRes?.error?.message || 'Meta API delivery failed';

                await InactivityNotificationLog.create({
                    userId: item.id,
                    userName: item.name,
                    userEmail: item.email,
                    userPhone: item.phone,
                    userPlan: item.plan,
                    lastLogin: item.lastLogin,
                    daysInactive: item.daysInactive,
                    templateName,
                    status: 'FAILED',
                    error: errMsg
                });

                results.push({ id: item.id, name: item.name, email: item.email, status: 'FAILED', error: errMsg });
            }
        } catch (err) {
            failedCount++;
            const errMsg = err.response?.data?.error?.message || err.message;

            await InactivityNotificationLog.create({
                userId: item.id,
                userName: item.name,
                userEmail: item.email,
                userPhone: item.phone,
                userPlan: item.plan,
                lastLogin: item.lastLogin,
                daysInactive: item.daysInactive,
                templateName,
                status: 'FAILED',
                error: errMsg
            });

            results.push({ id: item.id, name: item.name, email: item.email, status: 'FAILED', error: errMsg });
        }
    }

    // Update system config stats
    try {
        const sysConf = await SystemConfig.getConfig();
        const settings = sysConf.settings || {};
        const inact = settings.inactivityNotification || {};
        sysConf.settings = {
            ...settings,
            inactivityNotification: {
                ...inact,
                lastRunAt: now,
                totalSent: (parseInt(inact.totalSent) || 0) + sentCount
            }
        };
        sysConf.changed('settings', true);
        await sysConf.save();
    } catch (saveErr) {
        console.error('[InactivityNotifier] Failed to update stats:', saveErr.message);
    }

    return {
        success: true,
        scannedCount: inactiveUsers.length,
        eligibleCount: inactiveUsers.length,
        sentCount,
        failedCount,
        skippedCount,
        results
    };
}

/**
 * Fetch recent inactivity notification logs.
 */
async function getInactivityLogs(limit = 50) {
    return await InactivityNotificationLog.findAll({
        order: [['createdAt', 'DESC']],
        limit: Math.min(200, Math.max(1, parseInt(limit) || 50))
    });
}

module.exports = {
    getInactivityConfig,
    updateInactivityConfig,
    previewInactiveUsers,
    processInactivityNotifications,
    getInactivityLogs
};
