const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const Message = require('../models/Message');
const MessageLog = require('../models/MessageLog');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

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
        const monthlyLimit = userPlan ? userPlan.messageLimit : 30; // Default to 30 if plan not found

        // Fetch Settings to check WhatsApp Configuration
        const settings = await Settings.findOne({ where: { userId } });
        const isWhatsappConfigured = Boolean(settings && settings.metaAccessToken && settings.metaPhoneNumberId);

        // 2. Counts DEPENDENT on Date Range
        // Messages Sent (Total Logs in period)
        // Messages Sent (Total Logs in period) - Exclude FAILED
        // User requesting specifically to see only successful/sent messages in this count
        const totalMessages = await MessageLog.count({
            where: {
                ...logWhere,
                status: { [Op.ne]: 'FAILED' }
            },
            include: [messageInclude]
        });

        // Messages Delivered in period
        const deliveredCount = await MessageLog.count({
            where: {
                ...logWhere,
                status: { [Op.in]: ['DELIVERED', 'READ'] }
            },
            include: [messageInclude]
        });

        // Messages Read in period
        const readCount = await MessageLog.count({
            where: {
                ...logWhere,
                status: 'READ'
            },
            include: [messageInclude]
        });

        // Messages Failed in period
        const failedCount = await MessageLog.count({
            where: {
                ...logWhere,
                status: 'FAILED'
            },
            include: [messageInclude]
        });

        // Total messages attempted in this period (all statuses)
        const totalAttempted = await MessageLog.count({
            where: logWhere,
            include: [messageInclude]
        });

        // 3. Billing Month Usage (Always this month, for the usage bar)
        const now = new Date();
        const billingStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const billingEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const monthlyUsageCount = await MessageLog.count({
            where: {
                createdAt: {
                    [Op.between]: [billingStart, billingEnd]
                },
                status: { [Op.ne]: 'FAILED' }
            },
            include: [messageInclude]
        });

        // 5. Hourly Distribution (for Heatmap)
        const hourlyDistributionRaw = await MessageLog.findAll({
            attributes: [
                [sequelize.fn('date_part', 'hour', sequelize.col('MessageLog.createdAt')), 'hour'],
                [sequelize.fn('count', sequelize.col('MessageLog.id')), 'count']
            ],
            where: logWhere,
            include: [messageInclude],
            group: [sequelize.fn('date_part', 'hour', sequelize.col('MessageLog.createdAt'))],
            raw: true
        });

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

        res.json({
            contactsCount,
            templatesCount,
            monthlyLimit,
            monthlyUsageCount,
            contactLimit: userPlan ? userPlan.contactLimit : 10,
            templateLimit: userPlan ? userPlan.templateLimit : 2,
            planName: user.plan || 'Free',
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
            hourlyDistribution
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
        if (campaignId && campaignId !== 'all') {
            messageWhere.id = campaignId;
        }

        const chartData = await MessageLog.findAll({
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

module.exports = router;
