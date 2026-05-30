const Message = require('../models/Message');
const { Op } = require('sequelize');
const processCampaign = require('./campaignProcessor');

// Initialize the scheduler
function initScheduler() {
    console.log('Campaign Scheduler initialized. Checking every 60 seconds...');

    setInterval(async () => {
        try {
            // Find messages that are SCHEDULED and due for sending (scheduledFor <= now)
            const dueMessages = await Message.findAll({
                where: {
                    status: 'SCHEDULED',
                    scheduledFor: {
                        [Op.lte]: new Date()
                    }
                }
            });

            if (dueMessages.length > 0) {
                console.log(`Found ${dueMessages.length} due campaigns.`);

                // Process each due campaign
                dueMessages.forEach(msg => {
                    console.log(`Processing scheduled campaign: ${msg.id} (Due: ${msg.scheduledFor})`);
                    processCampaign(msg.id).catch(err => console.error(`Scheduler Error [${msg.id}]:`, err));
                });
            }

            // Expire Addons
            try {
                const UserAddon = require('../models/UserAddon');
                const expiredAddons = await UserAddon.update(
                    { status: 'expired' },
                    {
                        where: {
                            status: 'active',
                            currentPeriodEnd: {
                                [Op.lt]: new Date()
                            }
                        }
                    }
                );
                if (expiredAddons[0] > 0) {
                    console.log(`Expired ${expiredAddons[0]} user addons.`);
                }
            } catch (addonErr) {
                console.error("Scheduler Error Expiring Addons:", addonErr);
            }
        } catch (err) {
            console.error('Scheduler main loop error:', err);
        }
    }, 60000); // Check every 60 seconds

    // ==========================================
    // Check Expiries and Quotas (Runs every 10 mins)
    // ==========================================
    setInterval(async () => {
        try {
            console.log('Running Expiry & Quota checks...');
            const User = require('../models/User');
            const Plan = require('../models/Plan');
            const SystemConfig = require('../models/SystemConfig');
            const Settings = require('../models/Settings');
            const { sendSystemMessage } = require('./systemMessenger');
            const MessageLog = require('../models/MessageLog');
            const Contact = require('../models/Contact');
            const Template = require('../models/Template');

            const config = await SystemConfig.getCachedConfig();
            const linkedAdminId = config?.settings?.linkedAdminUserId;
            if (!linkedAdminId) return;

            const adminSettings = await Settings.findOne({ where: { userId: linkedAdminId } });
            const waTemplates = adminSettings?.notificationTemplates?.whatsapp || {};
            const expiryTpl = waTemplates.expiryAlert;
            const quotaTpl = waTemplates.quotaLimit;

            if (!expiryTpl?.enabled && !quotaTpl?.enabled) return;

            // Fetch active users with phone numbers
            const activeUsers = await User.findAll({
                where: { planStatus: 'Active', phone: { [Op.not]: null }, phone: { [Op.ne]: '' } }
            });

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            for (const user of activeUsers) {
                const userPhone = user.phone.replace(/\D/g, '');
                if (!userPhone) continue;
                
                const planDetails = await Plan.findOne({ where: { name: user.plan } });
                let alertsUpdated = false;
                let userLastQuotaAlerts = user.lastQuotaAlerts || {};

                // ─── 1. SUBSCRIPTION EXPIRY ALERTS ───
                if (expiryTpl?.enabled && user.planExpiry && user.plan !== 'Free') {
                    const expiryDate = new Date(user.planExpiry);
                    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    
                    // The reminder triggers are dynamic and stored in the admin template settings
                    const reminderDaysArray = expiryTpl.reminderDays || [15, 7, 3];
                    
                    if (daysLeft >= 0 && reminderDaysArray.includes(daysLeft)) {
                        if (user.lastExpiryAlertDay !== daysLeft) {
                            // Send Alert
                            // Available Variables: {name}, {plan_name}, {expiry_date}, {days_left}
                            await sendSystemMessage(userPhone, 'template', {
                                templateName: expiryTpl.templateName,
                                languageCode: expiryTpl.languageCode || 'en_US',
                                components: [{
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: user.name || 'User' },
                                        { type: 'text', text: user.plan || 'Plan' },
                                        { type: 'text', text: expiryDate.toLocaleDateString() },
                                        { type: 'text', text: daysLeft.toString() }
                                    ]
                                }]
                            });
                            user.lastExpiryAlertDay = daysLeft;
                            alertsUpdated = true;
                            console.log(`[ALERTS] Sent expiry alert to ${userPhone} for ${daysLeft} days left.`);
                        }
                    } else if (daysLeft < 0 && user.lastExpiryAlertDay !== -1) {
                        // Reset when expired
                        user.lastExpiryAlertDay = -1;
                        alertsUpdated = true;
                    } else if (daysLeft > Math.max(...reminderDaysArray) && user.lastExpiryAlertDay !== null) {
                         // Reset if they renewed
                         user.lastExpiryAlertDay = null;
                         alertsUpdated = true;
                    }
                }

                // ─── 2. QUOTA LIMIT ALERTS ───
                if (quotaTpl?.enabled && planDetails) {
                    const checkThresholds = async (currentUsage, limit, typeName) => {
                        if (limit <= 0) return; // Unlimited or invalid limit
                        const percent = (currentUsage / limit) * 100;
                        let triggerPercent = null;
                        if (percent >= 100) triggerPercent = 100;
                        else if (percent >= 90) triggerPercent = 90;
                        else if (percent >= 80) triggerPercent = 80;

                        if (triggerPercent && userLastQuotaAlerts[typeName] !== triggerPercent) {
                            // Send Quota Alert
                            // Variables: {name}, {limit_type}, {current_usage}, {max_limit}
                            await sendSystemMessage(userPhone, 'template', {
                                templateName: quotaTpl.templateName,
                                languageCode: quotaTpl.languageCode || 'en_US',
                                components: [{
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: user.name || 'User' },
                                        { type: 'text', text: typeName },
                                        { type: 'text', text: currentUsage.toString() },
                                        { type: 'text', text: limit.toString() }
                                    ]
                                }]
                            });
                            userLastQuotaAlerts[typeName] = triggerPercent;
                            alertsUpdated = true;
                            console.log(`[ALERTS] Sent quota alert to ${userPhone} for ${typeName} at ${triggerPercent}%.`);
                        } else if (percent < 80 && userLastQuotaAlerts[typeName]) {
                            // Reset if quota refreshed or upgraded
                            delete userLastQuotaAlerts[typeName];
                            alertsUpdated = true;
                        }
                    };

                    // Messages Quota
                    const messagesSent = await MessageLog.count({
                        where: {
                            createdAt: { [Op.between]: [startOfMonth, endOfMonth] },
                            status: { [Op.ne]: 'FAILED' }
                        },
                        include: [{ model: require('../models/Message'), where: { userId: user.id }, attributes: [] }]
                    });
                    const msgLimit = planDetails.messageLimit + (user.extraTopupMessages || 0);
                    await checkThresholds(messagesSent, msgLimit, 'Monthly Messages');

                    // Contacts Quota
                    const contactsCount = await Contact.count({ where: { userId: user.id } });
                    const contactLimit = planDetails.contactLimit + (user.extraTopupContacts || 0);
                    await checkThresholds(contactsCount, contactLimit, 'Contacts');

                    // Templates Quota
                    const templateCount = await Template.count({ where: { userId: user.id } });
                    await checkThresholds(templateCount, planDetails.templateLimit, 'Templates');
                    
                    // AI Tokens Quota (Special handling, it depletes, doesn't grow)
                    // If balance < 20% of last topup? We don't have total bought. We just alert when balance < 50, 10, 0
                    const aiBalance = user.aiTokenBalance || 0;
                    
                    // Only check AI tokens if they have a balance, their plan includes it, or they previously triggered an alert
                    const shouldCheckAi = (aiBalance > 0) || (planDetails.aiTokensAllowance > 0) || (userLastQuotaAlerts['AITokens']);
                    
                    if (shouldCheckAi) {
                        let aiTrigger = null;
                        if (aiBalance <= 0) aiTrigger = '0';
                        else if (aiBalance <= 50) aiTrigger = '50';
                        else if (aiBalance <= 200) aiTrigger = '200';

                        if (aiTrigger && userLastQuotaAlerts['AITokens'] !== aiTrigger) {
                            await sendSystemMessage(userPhone, 'template', {
                                templateName: quotaTpl.templateName,
                                languageCode: quotaTpl.languageCode || 'en_US',
                                components: [{
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: user.name || 'User' },
                                        { type: 'text', text: 'AI Tokens' },
                                        { type: 'text', text: aiBalance.toString() },
                                        { type: 'text', text: 'Depleted' }
                                    ]
                                }]
                            });
                            userLastQuotaAlerts['AITokens'] = aiTrigger;
                            alertsUpdated = true;
                            console.log(`[ALERTS] Sent quota alert to ${userPhone} for AI Tokens at ${aiTrigger}.`);
                        } else if (aiBalance > 200 && userLastQuotaAlerts['AITokens']) {
                            delete userLastQuotaAlerts['AITokens'];
                            alertsUpdated = true;
                        }
                    }
                }

                if (alertsUpdated) {
                    user.lastQuotaAlerts = userLastQuotaAlerts;
                    user.changed('lastQuotaAlerts', true); // Force sequelize to realize JSON changed
                    await user.save();
                }
            }
        } catch (err) {
            console.error('Scheduler Expiry & Quota check error:', err);
        }
    }, 10 * 60 * 1000); // Check every 10 mins
}

module.exports = { initScheduler };
