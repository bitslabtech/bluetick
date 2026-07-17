const Message = require('../models/Message');
const { Op } = require('sequelize');
const QuickReply = require('../models/QuickReply');
const Label = require('../models/Label');
const Group = require('../models/Group');
const Flow = require('../models/Flow');
const Vcard = require('../models/Vcard');
const WaStore = require('../models/WaStore');
const User = require('../models/User');
const processCampaign = require('./campaignProcessor');

/**
 * Prune expired tags from contacts.
 * Reads the tagExpiry JSONB map and removes any tags whose expiry timestamp has passed.
 * This runs on a background schedule so it's non-blocking and efficient.
 */
async function pruneExpiredTags() {
    try {
        const Contact = require('../models/Contact');
        // Find all contacts that have a non-null tagExpiry field
        const contacts = await Contact.findAll({
            where: {
                tagExpiry: { [Op.not]: null }
            },
            attributes: ['id', 'tags', 'tagExpiry']
        });

        const now = new Date();
        let pruned = 0;

        for (const contact of contacts) {
            const expiry = contact.tagExpiry || {};
            const expiredTags = Object.keys(expiry).filter(tag => new Date(expiry[tag]) <= now);
            if (expiredTags.length === 0) continue;

            // Remove expired tags from the tags array
            const updatedTags = (contact.tags || []).filter(t => !expiredTags.includes(t));
            // Remove expired entries from the tagExpiry map
            const updatedExpiry = { ...expiry };
            for (const t of expiredTags) delete updatedExpiry[t];

            await contact.update({
                tags: updatedTags,
                tagExpiry: Object.keys(updatedExpiry).length > 0 ? updatedExpiry : null
            });
            pruned += expiredTags.length;
        }

        if (pruned > 0) {
            console.log(`[AutoTagger] Pruned ${pruned} expired tag(s) from ${contacts.length} contact(s).`);
        }
    } catch (err) {
        console.error('[AutoTagger] pruneExpiredTags error:', err.message);
    }
}

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

            // ==========================================
            // 2.5 EXPIRE PLANS — runs unconditionally, does NOT need linkedAdminId
            // ==========================================
            try {
                const now_expire = new Date();
                const expiredUsers = await User.findAll({
                    where: {
                        planExpiry: { [Op.lt]: now_expire },
                        plan: { [Op.ne]: 'Free' },
                        planStatus: { [Op.in]: ['Active', 'Trial', 'Pending'] }
                    }
                });

                if (expiredUsers.length > 0) {
                    for (const expUser of expiredUsers) {
                        const previousPlan = expUser.plan;
                        const isTrial = expUser.planStatus === 'Trial';

                        expUser.planStatus = 'Expired';
                        await expUser.save();
                        console.log(`[EXPIRY] Plan expired for user: ${expUser.email} (was ${previousPlan})`);

                        // CRM tag update — only if linked CRM admin is configured
                        if (linkedAdminId && expUser.phone) {
                            try {
                                const contact = await Contact.findOne({ where: { userId: linkedAdminId, phone: expUser.phone } });
                                if (contact) {
                                    let updatedTags = (contact.tags || []).filter(t => typeof t !== 'string' || !t.startsWith('Plan: '));
                                    updatedTags.push(isTrial ? 'Trial Expired' : `${previousPlan} - Expired`);
                                    contact.tags = updatedTags;
                                    await contact.save();
                                    console.log(`[EXPIRY] Updated CRM tags for: ${expUser.email}`);
                                }
                            } catch (crmErr) {
                                console.error(`[EXPIRY] CRM tag update failed for ${expUser.email}:`, crmErr.message);
                            }
                        }
                    }
                }
            } catch (expireErr) {
                console.error('[EXPIRY] Plan expiry job error:', expireErr);
            }

            // WA notification alerts only work when linkedAdminId is configured
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
                            const contextMap = {
                                '{name}': user.name || 'User',
                                '{plan_name}': user.plan || 'Plan',
                                '{expiry_date}': expiryDate.toLocaleDateString(),
                                '{renewal_link}': 'https://platform/upgrade', // Fallback
                                '{days_left}': daysLeft.toString()
                            };

                            let parameters = [];
                            if (expiryTpl.selectedVariables && expiryTpl.selectedVariables.length > 0) {
                                parameters = expiryTpl.selectedVariables.map(v => ({
                                    type: 'text',
                                    text: contextMap[v] || 'N/A'
                                }));
                            } else {
                                parameters = [
                                    { type: 'text', text: user.name || 'User' },
                                    { type: 'text', text: user.plan || 'Plan' },
                                    { type: 'text', text: expiryDate.toLocaleDateString() },
                                    { type: 'text', text: daysLeft.toString() }
                                ];
                            }

                            // Send Alert
                            // Available Variables: {name}, {plan_name}, {expiry_date}, {renewal_link}
                            await sendSystemMessage(userPhone, 'template', {
                                templateName: expiryTpl.templateName,
                                languageCode: expiryTpl.languageCode || 'en_US',
                                components: [{
                                    type: 'body',
                                    parameters: parameters
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
                            const contextMap = {
                                '{name}': user.name || 'User',
                                '{limit_type}': typeName,
                                '{current_usage}': currentUsage.toString(),
                                '{max_limit}': limit.toString(),
                                '{upgrade_link}': limit.toString()
                            };

                            let parameters = [];
                            if (quotaTpl.selectedVariables && quotaTpl.selectedVariables.length > 0) {
                                parameters = quotaTpl.selectedVariables.map(v => ({
                                    type: 'text',
                                    text: contextMap[v] || 'N/A'
                                }));
                            } else {
                                parameters = [
                                    { type: 'text', text: user.name || 'User' },
                                    { type: 'text', text: typeName },
                                    { type: 'text', text: currentUsage.toString() },
                                    { type: 'text', text: limit.toString() }
                                ];
                            }

                            // Send Quota Alert
                            // Variables: {name}, {limit_type}, {current_usage}, {upgrade_link}
                            await sendSystemMessage(userPhone, 'template', {
                                templateName: quotaTpl.templateName,
                                languageCode: quotaTpl.languageCode || 'en_US',
                                components: [{
                                    type: 'body',
                                    parameters: parameters
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

                    // Quick Replies Quota
                    const qrCount = await QuickReply.count({ where: { userId: user.id } });
                    await checkThresholds(qrCount, planDetails.quickReplyLimit, 'Quick Replies');

                    // Tags/Labels Quota
                    const tagCount = await Label.count({ where: { userId: user.id } });
                    await checkThresholds(tagCount, planDetails.tagLimit, 'Tags');

                    // Groups Quota
                    const groupCount = await Group.count({ where: { userId: user.id } });
                    await checkThresholds(groupCount, planDetails.groupLimit, 'Groups');

                    // Team Members Quota
                    const teamCount = await User.count({ where: { parentUserId: user.id } });
                    await checkThresholds(teamCount, planDetails.teamMemberLimit, 'Team Members');

                    // FlowBot Flows Quota
                    const flowCount = await Flow.count({ where: { userId: user.id } });
                    await checkThresholds(flowCount, planDetails.flowLimit, 'FlowBot Flows');

                    // Media Storage Quota (MB)
                    const storageUsedMB = parseFloat(((user.mediaStorageUsed || 0) / (1024 * 1024)).toFixed(2));
                    await checkThresholds(storageUsedMB, planDetails.storageLimitMb, 'Storage (MB)');
                    
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
            
            // (Plan expiry is now handled above, unconditionally before the linkedAdminId gate)


            // ==========================================
            // 3. ABANDONED CART RECOVERY (WaStore)
            // ==========================================
            try {
                const WaOrder = require('../models/WaOrder');
                const WaStore = require('../models/WaStore');
                const axios = require('axios');
                const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
                
                const abandonedOrders = await WaOrder.findAll({
                    where: {
                        status: 'pending',
                        abandonedReminderSent: false,
                        customerPhone: { [Op.not]: null },
                        createdAt: { [Op.lte]: twoHoursAgo }
                    }
                });
                
                for (const order of abandonedOrders) {
                    if (!order.customerPhone) continue;
                    
                    const store = await WaStore.findByPk(order.storeId);
                    if (!store) continue;
                    
                    const user = await User.findByPk(store.userId);
                    if (user && user.fbAccessToken && user.metaPhoneNumberId) {
                        let phone = order.customerPhone.replace(/\D/g, '');
                        // Generate a checkout URL (assuming standard checkout route)
                        const storeUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/store/${store.slug}` : `http://localhost:5173/store/${store.slug}`;
                        
                        const messageText = `Hi ${order.customerName || 'there'},\n\n`
                            + `We noticed you left some items pending at *${store.name}*! 🛒\n\n`
                            + `Don't miss out on your favorite items. You can complete your purchase by visiting our store again:\n${storeUrl}\n\n`
                            + `Let us know if you need any help!`;
                            
                        try {
                            await axios.post(`https://graph.facebook.com/v21.0/${user.metaPhoneNumberId}/messages`, {
                                messaging_product: 'whatsapp',
                                recipient_type: 'individual',
                                to: phone,
                                type: 'text',
                                text: { preview_url: true, body: messageText }
                            }, {
                                headers: { 'Authorization': `Bearer ${user.fbAccessToken}`, 'Content-Type': 'application/json' }
                            });
                            
                            order.abandonedReminderSent = true;
                            await order.save();
                            console.log(`[ABANDONED CART] Sent recovery message to ${phone} for order ${order.orderNumber}`);
                        } catch (err) {
                            console.error(`[ABANDONED CART] Failed for ${phone}:`, err.response?.data || err.message);
                        }
                    }
                }
            } catch (cartErr) {
                console.error('Scheduler Abandoned Cart error:', cartErr);
            }

            // ── AUTO-TAG EXPIRY PRUNING ──────────────────────────────────────────
            // Remove tags from contacts where their TTL (expiresInHours) has lapsed
            await pruneExpiredTags();

        } catch (err) {
            console.error('Scheduler Expiry & Quota check error:', err);
        }
    }, 10 * 60 * 1000); // Check every 10 mins

    // ==========================================
    // 🚨 TRIAL EXPIRY ADMIN NOTIFICATIONS (Runs every 12 hours)
    // Fires a WA admin alert for users whose trial expires in 1 or 3 days
    // ==========================================
    setInterval(async () => {
        try {
            const { sendAdminAlert } = require('./systemMessenger');
            const User = require('../models/User');
            const { Op } = require('sequelize');
            const now = new Date();

            // Check for trials expiring in exactly 3 days and 1 day (with a 13-hour window to match 12h cron)
            const checkWindows = [
                { days: 3, label: '3' },
                { days: 1, label: '1' }
            ];

            for (const window of checkWindows) {
                const windowStart = new Date(now.getTime() + (window.days * 24 * 60 * 60 * 1000) - (13 * 60 * 60 * 1000));
                const windowEnd   = new Date(now.getTime() + (window.days * 24 * 60 * 60 * 1000));

                const expiringUsers = await User.findAll({
                    where: {
                        planStatus: 'Trial',
                        planExpiry: { [Op.between]: [windowStart, windowEnd] },
                        plan: { [Op.ne]: 'Free' }
                    },
                    attributes: ['id', 'name', 'email', 'planExpiry']
                });

                for (const user of expiringUsers) {
                    try {
                        await sendAdminAlert('trial_expiring', `Trial expiring in ${window.label} day(s) for ${user.name}`, {
                            name: user.name,
                            days: window.label
                        });
                        console.log(`[TRIAL EXPIRY] WA alert sent for ${user.email} (expires in ${window.label} day(s))`);
                    } catch (alertErr) {
                        console.error(`[TRIAL EXPIRY] WA alert failed for ${user.email}:`, alertErr.message);
                    }
                }
            }
        } catch (err) {
            console.error('[TRIAL EXPIRY] Scheduler error:', err.message);
        }
    }, 12 * 60 * 60 * 1000); // Check every 12 hours
}

module.exports = { initScheduler };
