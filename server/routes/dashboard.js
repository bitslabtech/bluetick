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

// Report ranges are resolved in the account's time zone (User.timezone) by the outbound
// gateway's time helpers, so "Today" / "This month" match what the user sees on their clock.
const metrics = require('../services/outbound/metrics');
const { getAccountTimezone, resolveRange } = require('../services/outbound/time');

const getRange = async (userId, { range, startDate, endDate, campaignId }) => {
    const tz = await getAccountTimezone(userId);
    const isCampaign = campaignId && campaignId !== 'all';
    if (isCampaign) {
        // A selected campaign is a fixed event: report its whole lifetime, ignore the date filter
        const campaign = await Message.findOne({ where: { id: campaignId, userId }, attributes: ['id', 'createdAt'] });
        if (campaign) return { tz, campaignId, start: new Date(campaign.createdAt), end: new Date(), isCampaign: true };
    }
    const { start, end } = resolveRange(range, startDate, endDate, tz);
    return { tz, campaignId: null, start, end, isCampaign: false };
};

router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        const { range, startDate, endDate, campaignId } = req.query;

        const win = await getRange(userId, { range, startDate, endDate, campaignId });

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

        // 2. Counts for the selected range or campaign — one definition for every screen
        const filter = win.isCampaign
            ? { ownerId: userId, campaignId: win.campaignId }
            : { ownerId: userId, start: win.start, end: win.end };
        const counts = await metrics.summary(filter);
        const hourlyDistribution = await metrics.hourly(filter, win.tz);
        const totalMessages = counts.sent;
        const deliveredCount = counts.delivered;
        const readCount = counts.read;
        const failedCount = counts.failed;
        const { deliveryRate, readRate, failedRate } = counts;

        // 3. Plan usage this month (every feature, owner's time zone)
        const monthlyUsageCount = await getMonthlyMessageCount(userId);

        // 4. Recent Campaigns (For simple list)
        const recentCampaigns = await Message.findAll({
            where: { userId },
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [Template]
        });

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
        const waDisplayName = user.metaVerifiedName || null;
        const waDisplayNameStatus = user.metaNameStatus ? user.metaNameStatus.toUpperCase() : 'UNKNOWN';

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
            pendingCount: counts.pending,
            retryingCount: counts.retrying,
            blockedCount: counts.blocked,
            attemptedCount: counts.attempted,
            timezone: win.tz,
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
            waDisplayName: isWhatsappConfigured ? waDisplayName : null,
            waDisplayNameStatus: isWhatsappConfigured ? waDisplayNameStatus : 'UNKNOWN',
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
        const win = await getRange(userId, { range, startDate, endDate, campaignId });

        // Hourly buckets for ranges up to 2 days, daily otherwise
        const spanDays = (win.end - win.start) / 86400000;
        const unit = range === '1d' || spanDays <= 2 ? 'hour' : 'day';
        const filter = win.isCampaign
            ? { ownerId: userId, campaignId: win.campaignId, start: win.start, end: win.end }
            : { ownerId: userId, start: win.start, end: win.end };
        res.json(await metrics.series(filter, win.tz, unit));
    } catch (err) {
        console.error("Error fetching chart data:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/campaign-reports', async (req, res) => {
    try {
        const userId = req.user.id;
        const { range, startDate, endDate, campaignId } = req.query;
        const isCampaignFilter = campaignId && campaignId !== 'all';
        const win = await getRange(userId, { range, startDate, endDate });

        // Campaigns created in the selected period (or the selected campaign)
        const campaigns = await Message.findAll({
            where: isCampaignFilter
                ? { userId, id: campaignId }
                : { userId, createdAt: { [Op.between]: [win.start, win.end] } },
            include: [{ model: Template }],
            order: [['createdAt', 'DESC']]
        });
        const stats = await metrics.byCampaign(campaigns.map(c => c.id));

        res.json(campaigns.map(c => {
            const st = stats[c.id] || metrics.EMPTY;
            return {
                id: c.id,
                name: c.campaignName || (c.Template ? c.Template.name : 'Untitled Campaign'),
                sentDate: c.createdAt,
                // Actual recipients tried (the estimate stored at creation can include contacts skipped at send time)
                audience: st.attempted || c.recipientCount,
                sent: st.sent,
                delivered: st.delivered,
                read: st.read,
                failed: st.failed,
                retrying: st.retrying,
                status: c.status
            };
        }));
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
        const usagePercent = (totalUsed + currentBalance) > 0
            ? Math.min(100, Math.round(totalUsed / (totalUsed + currentBalance) * 100))
            : 0;

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
