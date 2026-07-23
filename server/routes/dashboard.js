const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const Message = require('../models/Message');
const MessageLog = require('../models/MessageLog');
const User = require('../models/User');
const Plan = require('../models/Plan');
const AiTokenLog = require('../models/AiTokenLog');
const Settings = require('../models/Settings');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const auth = require('../middleware/auth');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const { getMonthlyMessageCount } = require('../utils/planLimits');

router.use(auth);

// Helper to determine start date based on range
const getStartDate = (range, startDate, endDate) => {
    const now = new Date();
    const start = new Date();

    switch (range) {
        case '1d': // Today (since midnight) OR Last 24h? Usually 'Today' for reports implies from 00:00
            start.setHours(0, 0, 0, 0);
            break;
        case '7d':
            start.setDate(now.getDate() - 7);
            break;
        case '1m':
            start.setMonth(now.getMonth() - 1);
            break;
        case '3m':
            start.setMonth(now.getMonth() - 3);
            break;
        case 'this_month':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'custom':
            if (startDate) {
                return new Date(startDate);
            }
            start.setDate(now.getDate() - 30); // Fallback
            break;
        default: // 'This Month' (Default to current billing period)
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
    }
    return start;
};

const getEndDate = (range, endDate) => {
    if (range === 'custom' && endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of that day
        return end;
    }
    return new Date(); // Now
};

router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        const { range, startDate, endDate, campaignId } = req.query;

        const start = getStartDate(range, startDate, endDate);
        const end = getEndDate(range, endDate);

        // Common Where Clauses
        // 1. For MessageLog (Timeline data)
        const logWhere = {
            createdAt: {
                [Op.between]: [start, end]
            }
        };

        // 2. For Message/Campaign (if filtering by campaign)
        const messageWhere = { userId };
        if (campaignId && campaignId !== 'all') {
            messageWhere.id = campaignId;
        }

        // Message Include for Joins
        const messageInclude = {
            model: Message,
            where: messageWhere,
            attributes: []
        };

        // --- Metrics ---

        // 1. Counts independent of Date Range (e.g. Total Contacts)
        const contactsCount = await Contact.count({ where: { userId } });
        const templatesCount = await Template.count({ where: { userId } });

        // Fetch User and Plan for dynamic limits
        const user = await User.findByPk(userId);
        const userPlan = await Plan.findOne({ where: { name: user.plan || 'Free' } });
        
        // Calculate Total Limits (Base Plan + Top-ups)
        const baseMessageLimit = userPlan ? userPlan.messageLimit : 30;
        const monthlyLimit = baseMessageLimit + (user.extraTopupMessages || 0);

        const baseContactLimit = userPlan ? userPlan.contactLimit : 10;
        const contactLimit = baseContactLimit + (user.extraTopupContacts || 0);

        // Fetch Settings to check WhatsApp Configuration
        const settings = await Settings.findOne({ where: { userId } });
        const isWhatsappConfigured = Boolean(
            (settings && settings.metaAccessToken && settings.metaPhoneNumberId) ||
            (user.fbAccessToken && user.metaPhoneNumberId)
        );

        // Check if any bots are active (AI Bot or Flows)
        const Flow = require('../models/Flow');
        const Addon = require('../models/Addon');
        const UserAddon = require('../models/UserAddon');
        
        let hasActiveBots = false;
        if (isWhatsappConfigured) {
            // Only consider flows as globally active bots if they are catch-all (isAny = true)
            // Keyword-specific flows should not lock the agent out of normal chatting globally.
            const universalFlow = await Flow.findOne({ where: { userId, isActive: true, isAny: true } });
            if (universalFlow) {
                hasActiveBots = true;
            } else {
                const aiAddon = await Addon.findOne({ where: { module_key: 'ai_bot', isActive: true } });
                if (aiAddon) {
                    const activeAi = await UserAddon.findOne({ where: { userId, addonId: aiAddon.id, status: 'active' } });
                    const isAiExpired = activeAi?.currentPeriodEnd && new Date(activeAi.currentPeriodEnd) < new Date();
                    if (activeAi && !isAiExpired) {
                        const config = activeAi.config || {};
                        const mode = config.operatingMode || 'always';
                        let isEffectivelyActive = true;
                        if (mode === 'manual') {
                            const isManualOn = config.manualEnabled === true || config.manualEnabled === 'true';
                            if (!isManualOn) {
                                isEffectivelyActive = false;
                            }
                        }
                        
                        if (isEffectivelyActive) {
                            hasActiveBots = true;
                        }
                    }
                }
            }
        }

        // 2. Counts DEPENDENT on Date Range
        const isCampaignFilter = campaignId && campaignId !== 'all';
        
        let totalMessages, deliveredCount, readCount, failedCount, totalAttempted, hourlyDistributionRaw;

        if (isCampaignFilter) {
            totalMessages = await MessageLog.count({
                where: { ...logWhere, status: { [Op.ne]: 'FAILED' } },
                include: [messageInclude]
            });
            deliveredCount = await MessageLog.count({
                where: { ...logWhere, [Op.or]: [
                    Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'delivered'),
                    Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'read')
                ]},
                include: [messageInclude]
            });
            readCount = await MessageLog.count({
                where: { ...logWhere, [Op.and]: [
                    Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'read')
                ]},
                include: [messageInclude]
            });
            failedCount = await MessageLog.count({
                where: { ...logWhere, [Op.and]: [
                    Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'failed')
                ]},
                include: [messageInclude]
            });
            totalAttempted = await MessageLog.count({
                where: logWhere,
                include: [messageInclude]
            });
            hourlyDistributionRaw = await MessageLog.findAll({
                attributes: [
                    [sequelize.fn('date_part', 'hour', sequelize.col('MessageLog.createdAt')), 'hour'],
                    [sequelize.fn('count', sequelize.col('MessageLog.id')), 'count']
                ],
                where: logWhere,
                include: [messageInclude],
                group: [sequelize.fn('date_part', 'hour', sequelize.col('MessageLog.createdAt'))],
                raw: true
            });
        } else {
            const chatLogWhere = {
                direction: 'OUTBOUND',
                createdAt: { [Op.between]: [start, end] }
            };
            const chatInclude = [{
                model: Conversation,
                where: { userId },
                attributes: []
            }];

            totalMessages = await ChatMessage.count({
                where: { ...chatLogWhere, status: { [Op.ne]: 'failed' } },
                include: chatInclude
            });
            deliveredCount = await ChatMessage.count({
                where: { ...chatLogWhere, [Op.or]: [
                    Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'delivered'),
                    Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'read')
                ]},
                include: chatInclude
            });
            readCount = await ChatMessage.count({
                where: { ...chatLogWhere, [Op.and]: [
                    Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'read')
                ]},
                include: chatInclude
            });
            failedCount = await ChatMessage.count({
                where: { ...chatLogWhere, [Op.and]: [
                    Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'failed')
                ]},
                include: chatInclude
            });
            totalAttempted = await ChatMessage.count({
                where: chatLogWhere,
                include: chatInclude
            });
            hourlyDistributionRaw = await ChatMessage.findAll({
                attributes: [
                    [sequelize.fn('date_part', 'hour', sequelize.col('ChatMessage.createdAt')), 'hour'],
                    [sequelize.fn('count', sequelize.col('ChatMessage.id')), 'count']
                ],
                where: chatLogWhere,
                include: chatInclude,
                group: [sequelize.fn('date_part', 'hour', sequelize.col('ChatMessage.createdAt'))],
                raw: true
            });
        }

        // 3. Billing Month Usage (Always this month, for the usage bar)
        // Uses getMonthlyMessageCount which counts ALL Outbound ChatMessage entries (AI, FlowBuilder, Campaigns, Manual)
        const monthlyUsageCount = await getMonthlyMessageCount(userId);

        // 5. Hourly Distribution (for Heatmap)
        const hourlyMap = {};
        hourlyDistributionRaw.forEach(row => {
            hourlyMap[parseInt(row.hour)] = parseInt(row.count);
        });
        const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            count: hourlyMap[i] || 0
        }));

        // 4. Recent Campaigns (For simple list)
        const recentCampaigns = await Message.findAll({
            where: { userId },
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [Template]
        });

        // Rates (Use totalAttempted for accurate industry-standard percentages)
        const deliveryRate = totalAttempted > 0 ? ((deliveredCount / totalAttempted) * 100).toFixed(1) : 0;
        const readRate = totalAttempted > 0 ? ((readCount / totalAttempted) * 100).toFixed(1) : 0;
        const failedRate = totalAttempted > 0 ? ((failedCount / totalAttempted) * 100).toFixed(1) : 0;

        let waMessagingThreshold = 250;
        let parsedTier = '250 Limit';
        if (user.metaTier) {
            const tierStr = String(user.metaTier).toUpperCase();
            if (tierStr.includes('UNLIMITED')) { 
                waMessagingThreshold = 9999999; 
                parsedTier = 'Unlimited'; 
            } else if (tierStr.includes('100K')) { 
                waMessagingThreshold = 100000; 
                parsedTier = '100K Limit'; 
            } else if (tierStr.includes('10K')) { 
                waMessagingThreshold = 10000; 
                parsedTier = '10K Limit'; 
            } else if (tierStr.includes('1K')) { 
                waMessagingThreshold = 1000; 
                parsedTier = '1K Limit'; 
            } else {
                // Attempt to extract dynamic tiers like "TIER_2K" or "2000"
                const matchK = tierStr.match(/(\d+)K/);
                if (matchK) {
                    waMessagingThreshold = parseInt(matchK[1], 10) * 1000;
                    parsedTier = `${matchK[1]}K Limit`;
                } else {
                    const matchNum = tierStr.match(/\d+/);
                    if (matchNum) {
                        waMessagingThreshold = parseInt(matchNum[0], 10);
                        // Convert to K if >= 1000 for nicer display
                        if (waMessagingThreshold >= 1000 && waMessagingThreshold % 1000 === 0) {
                            parsedTier = `${waMessagingThreshold / 1000}K Limit`;
                        } else {
                            parsedTier = `${waMessagingThreshold} Limit`;
                        }
                    }
                }
            }
        }

        // WhatsApp Account Stats — enrich from User model fields (populated by status refresh)
        // These are set on User model by /api/whatsapp/status regardless of setup path
        const waQuality    = user.metaQualityRating || (isWhatsappConfigured ? 'GREEN' : 'UNKNOWN');
        const waVerified   = !!(
            user.metaNameStatus === 'APPROVED' ||
            user.metaNameStatus === 'AVAILABLE' ||
            user.metaNameStatus === 'approved'  ||
            user.metaNameStatus === 'available' ||
            user.metaVerifiedName
        );

        res.json({
            contactsCount,
            templatesCount,
            monthlyLimit,
            monthlyUsageCount,
            contactLimit,
            templateLimit: userPlan ? userPlan.templateLimit : 2,
            planName: user.plan || 'Free',
            // AI Token Balance
            aiTokenBalance: user.aiTokenBalance || 0,
            aiTokensAllowance: userPlan ? (userPlan.aiTokensAllowance || 0) : 0,
            // These reflect the Date Range
            totalMessages,
            deliveredCount,
            readCount,
            failedCount,
            deliveryRate,
            readRate,
            failedRate,
            recentCampaigns,
            isWhatsappConfigured,
            hourlyDistribution,
            hasActiveBots,
            // WhatsApp Account Stats
            waAccountStatus: isWhatsappConfigured ? 'CONNECTED' : 'DISCONNECTED',
            waAccountQuality: isWhatsappConfigured ? waQuality : 'UNKNOWN',
            waMessagingTier: isWhatsappConfigured ? parsedTier : 'N/A',
            // Real 24-hour business-initiated conversation count from Meta analytics API
            // Fetched and cached during status refresh; null means not yet synced
            waMessagingProgress: isWhatsappConfigured ? (user.metaConversations24h ?? null) : null,
            waMessagingThreshold: isWhatsappConfigured ? waMessagingThreshold : 0,
            waBusinessVerified: isWhatsappConfigured ? waVerified : false,
            waConversationsFetchedAt: user.metaConversationsFetchedAt || null
        });
    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/chart', async (req, res) => {
    try {
        const userId = req.user.id;
        const { range, startDate, endDate, campaignId } = req.query;

        const start = getStartDate(range, startDate, endDate);
        const end = getEndDate(range, endDate);

        // Truncation Unit
        let dateTruncUnit = 'day';
        if (range === '1d') {
            dateTruncUnit = 'hour';
        } else if (range === 'custom') {
            const diffDays = (end - start) / (1000 * 60 * 60 * 24);
            dateTruncUnit = diffDays <= 2 ? 'hour' : 'day';
        }

        const logWhere = {
            createdAt: {
                [Op.between]: [start, end]
            }
        };

        const messageWhere = { userId };
        const isCampaignFilter = campaignId && campaignId !== 'all';
        if (isCampaignFilter) {
            messageWhere.id = campaignId;
        }

        let chartData;
        if (isCampaignFilter) {
            chartData = await MessageLog.findAll({
                attributes: [
                    [sequelize.fn('date_trunc', dateTruncUnit, sequelize.col('MessageLog.createdAt')), 'date'],
                    [sequelize.col('MessageLog.status'), 'status'],
                    [sequelize.fn('count', sequelize.col('MessageLog.id')), 'count']
                ],
                where: logWhere,
                include: [{
                    model: Message,
                    where: messageWhere,
                    attributes: []
                }],
                group: [
                    sequelize.fn('date_trunc', dateTruncUnit, sequelize.col('MessageLog.createdAt')),
                    sequelize.col('MessageLog.status')
                ],
                order: [[sequelize.fn('date_trunc', dateTruncUnit, sequelize.col('MessageLog.createdAt')), 'ASC']],
                raw: true
            });
        } else {
            chartData = await ChatMessage.findAll({
                attributes: [
                    [sequelize.fn('date_trunc', dateTruncUnit, sequelize.col('ChatMessage.createdAt')), 'date'],
                    [sequelize.col('ChatMessage.status'), 'status'],
                    [sequelize.fn('count', sequelize.col('ChatMessage.id')), 'count']
                ],
                where: {
                    direction: 'OUTBOUND',
                    createdAt: { [Op.between]: [start, end] }
                },
                include: [{
                    model: Conversation,
                    where: { userId },
                    attributes: []
                }],
                group: [
                    sequelize.fn('date_trunc', dateTruncUnit, sequelize.col('ChatMessage.createdAt')),
                    sequelize.col('ChatMessage.status')
                ],
                order: [[sequelize.fn('date_trunc', dateTruncUnit, sequelize.col('ChatMessage.createdAt')), 'ASC']],
                raw: true
            });
        }

        // Build a complete timeline of dates/hours within the range
        const timeline = [];
        let curr = new Date(start);

        if (dateTruncUnit === 'hour') {
            curr.setMinutes(0, 0, 0);
        } else {
            curr.setHours(0, 0, 0, 0);
        }

        while (curr <= end) {
            timeline.push(new Date(curr));
            if (dateTruncUnit === 'hour') {
                curr.setHours(curr.getHours() + 1);
            } else {
                curr.setDate(curr.getDate() + 1);
            }
        }

        // Helper to generate a matching string key (e.g., "YYYY-MM-DD" or "YYYY-MM-DD HH")
        const dateStringKey = (date, unit) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            if (unit === 'hour') {
                const h = String(date.getHours()).padStart(2, '0');
                return `${y}-${m}-${d} ${h}`;
            }
            return `${y}-${m}-${d}`;
        };

        // Map DB results to their string keys
        const dbDataMap = {};
        chartData.forEach(item => {
            const d = new Date(item.date);
            const key = dateStringKey(d, dateTruncUnit);
            if (!dbDataMap[key]) {
                dbDataMap[key] = { sent: 0, read: 0, failed: 0 };
            }
            const count = parseInt(item.count, 10);
            const status = (item.status || '').toUpperCase();

            if (status !== 'FAILED') {
                dbDataMap[key].sent += count;
            } else {
                dbDataMap[key].failed += count;
            }

            if (status === 'READ') {
                dbDataMap[key].read += count;
            }
        });

        // Generate the formatted data spanning the entire timeline
        const formattedData = timeline.map(tDate => {
            const key = dateStringKey(tDate, dateTruncUnit);
            const dataObj = dbDataMap[key] || { sent: 0, read: 0, failed: 0 };

            let label;
            if (dateTruncUnit === 'hour') {
                label = tDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            } else {
                label = tDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            return {
                name: label,
                fullDate: tDate.toISOString(),
                messages: dataObj.sent,
                read: dataObj.read,
                failed: dataObj.failed
            };
        });

        res.json(formattedData);
    } catch (err) {
        console.error("Error fetching chart data:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/campaign-reports', async (req, res) => {
    try {
        const userId = req.user.id;
        const { range, startDate, endDate } = req.query;

        // Filter Campaigns by Created Date?
        // Or show all campaigns but filter their stats?
        // Requirement: "campaign report are not working" with filter.
        // Usually this means "Show me campaigns sent in this period".

        const start = getStartDate(range, startDate, endDate);
        const end = getEndDate(range, endDate);

        const campaigns = await Message.findAll({
            where: {
                userId,
                createdAt: {
                    [Op.between]: [start, end]
                }
            },
            include: [
                { model: Template },
                { model: MessageLog }
            ],
            order: [['createdAt', 'DESC']]
        });

        const reports = campaigns.map(c => {
            const logs = c.MessageLogs || [];

            // Note: If we filtered campaigns by creation date, we take all their logs. 
            // If we wanted "logs within period" for ANY campaign, that's different.
            // Assumption: Campaign Report lists *Campaigns* created in that window.

            const normalizedLogs = logs.map(l => ({ ...l, status: (l.status || '').toUpperCase() }));

            const delivered = normalizedLogs.filter(l => ['DELIVERED', 'READ'].includes(l.status)).length;
            const read = normalizedLogs.filter(l => l.status === 'READ').length;
            const failed = normalizedLogs.filter(l => l.status === 'FAILED').length;

            const audience = c.recipientCount;

            return {
                id: c.id,
                name: c.Template ? c.Template.name : 'Untitled Campaign',
                sentDate: c.createdAt,
                audience: audience,
                delivered,
                read,
                failed,
                status: c.status
            };
        });

        res.json(reports);
    } catch (err) {
        console.error("Error fetching campaign reports:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- AI Token Usage History (REAL DATA FROM AiTokenLog) ---
router.get('/ai-token-history', async (req, res) => {
    try {
        const userId = req.user.id;
        const { range = '30d' } = req.query;

        const user = await User.findByPk(userId);
        const userPlan = await Plan.findOne({ where: { name: user.plan || 'Free' } });

        const totalAllowance = userPlan ? (userPlan.aiTokensAllowance || 0) : 0;
        const currentBalance = user.aiTokenBalance || 0;

        // Daily Usage Log should start from the day the account was created
        const accountCreatedDate = new Date(user.createdAt);
        accountCreatedDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today - accountCreatedDate);
        let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include today

        // Optional safety cap so we don't render millions of days if something goes wrong
        if (days > 365) days = 365;

        // ── Query ALL real log records for this user in the date range ──
        const since = new Date(today);
        since.setDate(since.getDate() - (days - 1));
        since.setHours(0, 0, 0, 0);

        const logs = await AiTokenLog.findAll({
            where: {
                userId,
                createdAt: { [Op.gte]: since }
            },
            order: [['createdAt', 'ASC']]
        });

        // Collect all unique features from the logs so we don't miss any (like meta ads or wastore)
        const uniqueFeatures = [...new Set(logs.map(l => l.feature))];

        // ── Build daily buckets ──
        const dailyMap = {};
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            d.setHours(0, 0, 0, 0);
            const key = d.toISOString().split('T')[0];
            
            const bucket = {
                date: key,
                label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                total: 0,
                runningBalance: null
            };
            // initialize all discovered features to 0
            uniqueFeatures.forEach(f => bucket[f] = 0);
            dailyMap[key] = bucket;
        }

        for (const log of logs) {
            const key = new Date(log.createdAt).toISOString().split('T')[0];
            if (dailyMap[key]) {
                dailyMap[key][log.feature] = (dailyMap[key][log.feature] || 0) + log.tokensUsed;
                dailyMap[key].total += log.tokensUsed;
                dailyMap[key].runningBalance = log.balanceAfter; // last log of the day wins
            }
        }

        // Fill running balance forward from previous day if no log that day
        const dailyData = Object.values(dailyMap);
        let lastKnownBalance = totalAllowance; // starting point
        for (const day of dailyData) {
            if (day.runningBalance !== null) {
                lastKnownBalance = day.runningBalance;
            } else {
                day.runningBalance = lastKnownBalance;
            }
        }
        // If we have logs, use the very last log's balanceAfter as the anchor,
        // and fill backwards from the currentBalance for the most recent day
        if (logs.length === 0) {
            // No logs at all — show current balance as flat line
            for (const day of dailyData) day.runningBalance = currentBalance;
        }

        // ── Feature breakdown totals (all-time in range) ──
        const featureBreakdown = [];
        
        // Define human-readable names and colors for features
        const featureLabels = {
            'ai_chatbot': { name: 'AI Chatbot', color: '#6366f1' },
            'ai_form_generator': { name: 'Form Generator', color: '#8b5cf6' },
            'ai_template_draft': { name: 'Template Draft', color: '#f59e0b' },
            'ai_template_enhancer': { name: 'Template Enhancer', color: '#10b981' },
            'ai_meta_ads_research': { name: 'Meta Ads Research', color: '#3b82f6' },
            'ai_meta_ads_copy': { name: 'Meta Ads Copy', color: '#ec4899' },
            'ai_meta_ads_image': { name: 'Meta Ads Image', color: '#f43f5e' },
            'ai_store_copilot': { name: 'Store Copilot', color: '#14b8a6' },
            'ai_wastore_product_desc': { name: 'Store Descriptions', color: '#06b6d4' }
        };
        const defaultColors = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4'];

        const grandTotal = logs.reduce((s, l) => s + l.tokensUsed, 0);

        uniqueFeatures.forEach((featureKey, i) => {
            const tokens = logs.filter(l => l.feature === featureKey).reduce((s, l) => s + l.tokensUsed, 0);
            if (tokens > 0) {
                const conf = featureLabels[featureKey] || { name: featureKey, color: defaultColors[i % defaultColors.length] };
                featureBreakdown.push({
                    name: conf.name,
                    key: featureKey,
                    tokens: tokens,
                    percent: grandTotal > 0 ? Math.round((tokens / grandTotal) * 100) : 0,
                    color: conf.color
                });
            }
        });

        // ── Weekly summary (group dailyData into 7-day buckets) ──
        const weeklySummary = [];
        for (let w = 0; w < Math.ceil(days / 7); w++) {
            const weekDays = dailyData.slice(w * 7, (w + 1) * 7);
            if (weekDays.length === 0) continue;
            const weekLabel = weekDays[0].label + (weekDays.length > 1 ? ` – ${weekDays[weekDays.length - 1].label}` : '');
            
            const wBucket = {
                week: `Wk ${w + 1}`,
                label: weekLabel,
                total: weekDays.reduce((s, d) => s + d.total, 0)
            };
            uniqueFeatures.forEach(f => {
                wBucket[f] = weekDays.reduce((s, d) => s + d[f], 0);
            });
            weeklySummary.push(wBucket);
        }

        // ── Summary stats ──
        const peakDayUsage = Math.max(0, ...dailyData.map(d => d.total));
        const daysWithUsage = dailyData.filter(d => d.total > 0).length;
        const avgDailyUsage = daysWithUsage > 0 ? Math.round(grandTotal / daysWithUsage) : 0;
        const totalUsed = grandTotal;
        const usagePercent = totalAllowance > 0 ? Math.round((currentBalance / totalAllowance * 100)) : 0;

        res.json({
            summary: {
                totalAllowance,
                currentBalance,
                totalUsed,
                usagePercent,
                planName: user.plan || 'Free',
                avgDailyUsage,
                peakDayUsage,
                hasHistory: logs.length > 0
            },
            dailyData,
            featureBreakdown,
            weeklySummary
        });
    } catch (err) {
        console.error("Error fetching AI token history:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
