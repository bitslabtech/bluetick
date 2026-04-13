const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const pLimit = require('p-limit');
const Message = require('../models/Message');
const MessageLog = require('../models/MessageLog');
const logActivity = require('../utils/logger');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');

router.use(auth);

const processCampaign = require('../utils/campaignProcessor');

// Send Bulk Campaign
router.post('/send', async (req, res) => {
    try {
        let { templateId, contactIds, targetGroups, manualRecipients, campaignName, description, tag, params, scheduledFor, retargetCampaignId, retargetStatus, retargetLogIds } = req.body;
        console.log('[CAMPAIGN SEND] Request received. templateId:', templateId, '| params keys:', Object.keys(params || {}));
        const userId = req.user.id;

        // 1. Get Settings
        const settings = await Settings.findOne({ where: { userId } });
        if (!settings || !settings.metaPhoneNumberId || !settings.metaAccessToken) {
            return res.status(403).json({ error: 'WhatsApp settings not configured.' });
        }

        // 2. Verify Template
        const template = await Template.findOne({ where: { id: templateId, userId } });
        if (!template) return res.status(404).json({ error: 'Template not found' });

        // 3. Estimate Recipient Count for initial record
        // (Actual resolution happens in processor, but good to have rough number)
        let estimatedCount = 0;
        if (contactIds === 'all') {
            estimatedCount = await Contact.count({ where: { userId } });
        } else if (Array.isArray(targetGroups) && targetGroups.length > 0) {
            // Resolve tags to contact IDs right here
            const allContacts = await Contact.findAll({ where: { userId }, attributes: ['id', 'tags'], raw: true });
            const matchedIds = allContacts.filter(c => c.tags && c.tags.some(t => targetGroups.includes(t))).map(c => c.id);
            estimatedCount = matchedIds.length;
            contactIds = matchedIds; // Override contactIds with the resolved list
        } else if (Array.isArray(contactIds)) {
            estimatedCount = contactIds.length;
        }
        if (Array.isArray(manualRecipients)) {
            estimatedCount += manualRecipients.length;
        }

        // --- RETARGETING OVERRIDE ---
        if (retargetCampaignId && retargetStatus) {
            const whereClause = { campaignId: retargetCampaignId };
            if (retargetStatus !== 'ALL') {
                whereClause.status = retargetStatus;
            }
            if (retargetLogIds && Array.isArray(retargetLogIds)) {
                whereClause.id = { [Op.in]: retargetLogIds };
            }
            const logs = await MessageLog.findAll({ where: whereClause, attributes: ['contactId', 'phone'] });
            
            const targetContactIds = logs.map(l => l.contactId).filter(Boolean);
            const targetPhones = logs.filter(l => !l.contactId).map(l => ({ name: 'Retargeted', phone: l.phone }));

            contactIds = targetContactIds;
            manualRecipients = [...(manualRecipients || []), ...targetPhones];
            estimatedCount = contactIds.length + manualRecipients.length;
        }

        if (estimatedCount === 0) return res.status(400).json({ error: 'No recipients selected or found for retargeting.' });

        // 4. Create Campaign Record
        const status = scheduledFor ? 'SCHEDULED' : 'SENDING';

        const newMessage = await Message.create({
            templateId: template.id,
            recipientCount: estimatedCount,
            status: status,
            logs: [],
            userId,
            createdById: req.user.realId || req.user.id,
            campaignName: campaignName || template.name,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
            targetConfig: {
                contactIds,
                manualRecipients,
                params,
                description,
                tag,
                retargetCampaignId,
                retargetStatus,
                retargetLogIds
            }
        });

        // Log Activity
        await logActivity(req, 'Campaign Created', `Created campaign "${newMessage.campaignName}" (${status})`);

        res.json({ message: scheduledFor ? 'Campaign scheduled' : 'Campaign started', campaignId: newMessage.id });

        // 5. Trigger Processing if Immediate
        if (!scheduledFor) {
            // Run in background
            processCampaign(newMessage.id).catch(err => console.error("Background Process Error:", err));
        }

    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
        console.error("Campaign Send Error - FULL DETAILS:", err.message);
        console.error("Campaign Send Error - STACK:", err.stack);
    }
});

// Get Single Message by ID
router.get('/:id', async (req, res) => {
    try {
        const message = await Message.findOne({
            where: { id: req.params.id, userId: req.user.id },
            include: [{ model: Template }]
        });
        if (!message) return res.status(404).json({ error: 'Campaign not found' });

        // Calculate stats via DB aggregates instead of pulling all logs into memory
        const sentCount = await MessageLog.count({ where: { campaignId: message.id, status: { [Op.in]: ['SENT', 'DELIVERED', 'READ', 'CLICKED'] } } });
        const deliveredCount = await MessageLog.count({ where: { campaignId: message.id, status: { [Op.in]: ['DELIVERED', 'READ', 'CLICKED'] } } });
        const readCount = await MessageLog.count({ where: { campaignId: message.id, status: { [Op.in]: ['READ', 'CLICKED'] } } });
        const clickedCount = await MessageLog.count({ where: { campaignId: message.id, status: 'CLICKED' } });
        const failedCount = await MessageLog.count({ where: { campaignId: message.id, status: 'FAILED' } });

        // Fetch logs paginated to avoid returning 10,000+ items at once
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const offset = (page - 1) * limit;

        const { count: totalLogs, rows: logs } = await MessageLog.findAndCountAll({
            where: { campaignId: message.id },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        const contactIds = logs.map(l => l.contactId).filter(id => id);
        const contacts = await Contact.findAll({
            where: { id: contactIds },
            attributes: ['id', 'name']
        });

        const contactMap = {};
        contacts.forEach(c => contactMap[c.id] = c.name);

        const logsWithNames = logs.map(l => {
            const jsonLog = l.toJSON();
            jsonLog.name = contactMap[l.contactId] || 'Unknown / Manual';
            return jsonLog;
        });

        const responseHelper = message.toJSON();
        responseHelper.logs = logsWithNames;

        responseHelper.sentCount = sentCount;
        responseHelper.deliveredCount = deliveredCount;
        responseHelper.readCount = readCount;
        responseHelper.clickedCount = clickedCount;
        responseHelper.failedCount = failedCount;

        responseHelper.totalLogs = totalLogs;
        responseHelper.totalPages = Math.ceil(totalLogs / limit);
        responseHelper.currentPage = page;

        res.json(responseHelper);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Messages (Campaigns List)
router.get('/', async (req, res) => {
    try {
        // Fetch paginated campaigns
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const offset = (page - 1) * limit;

        const { count, rows: messages } = await Message.findAndCountAll({
            where: { userId: req.user.id },
            include: [
                { model: Template }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        // Manual aggregate queries for each campaign to prevent memory exhaustion
        const responseData = await Promise.all(messages.map(async msg => {
            const jsonMsg = msg.toJSON();

            const [sentCount, deliveredCount, readCount, failedCount] = await Promise.all([
                MessageLog.count({ where: { campaignId: msg.id, status: { [Op.in]: ['SENT', 'DELIVERED', 'READ'] } } }),
                MessageLog.count({ where: { campaignId: msg.id, status: { [Op.in]: ['DELIVERED', 'READ'] } } }),
                MessageLog.count({ where: { campaignId: msg.id, status: 'READ' } }),
                MessageLog.count({ where: { campaignId: msg.id, status: 'FAILED' } })
            ]);

            jsonMsg.sentCount = sentCount;
            jsonMsg.deliveredCount = deliveredCount;
            jsonMsg.readCount = readCount;
            jsonMsg.failedCount = failedCount;

            if (jsonMsg.logs) delete jsonMsg.logs;

            return jsonMsg;
        }));

        // Keep standard array format for older clients, but we can append pagination metadata via headers if needed, 
        // or just return the array if the client expects an array.
        // Actually since Contacts.jsx was changed but Campaigns.jsx was not yet, we'll return responseData.

        res.json(responseData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Delete Campaign
router.delete('/:id', async (req, res) => {
    try {
        const message = await Message.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!message) return res.status(404).json({ error: 'Campaign not found' });

        // Delete associated logs first
        await MessageLog.destroy({ where: { campaignId: message.id } });

        // Delete campaign
        await message.destroy();

        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
