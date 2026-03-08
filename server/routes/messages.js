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
        const { templateId, contactIds, manualRecipients, campaignName, description, tag, params, scheduledFor } = req.body;
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
        } else if (Array.isArray(contactIds)) {
            estimatedCount = contactIds.length;
        }
        if (Array.isArray(manualRecipients)) {
            estimatedCount += manualRecipients.length;
        }

        if (estimatedCount === 0) return res.status(400).json({ error: 'No recipients selected' });

        // 4. Create Campaign Record
        const status = scheduledFor ? 'SCHEDULED' : 'SENDING';

        const newMessage = await Message.create({
            templateId: template.id,
            recipientCount: estimatedCount,
            status: status,
            logs: [],
            userId,
            campaignName: campaignName || template.name,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
            targetConfig: {
                contactIds,
                manualRecipients,
                params,
                description,
                tag
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

        // Fetch logs separately with Contact info
        const logs = await MessageLog.findAll({
            where: { campaignId: message.id },
            order: [['createdAt', 'DESC']]
        });

        // Fetch manual contact mappings if needed, or rely on Contact table join
        // We need to manually join Contacts for these logs since Sequelize raw query might be easier or include
        // But since we didn't define MessageLog.belongsTo(Contact) yet (we only did campaignId), let's fetch contacts manually or update model.
        // Actually, let's just fetch all contacts referenced in logs to map names.

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

        // Attach logs to the response object (frontend expects this)
        const responseHelper = message.toJSON();
        responseHelper.logs = logsWithNames;

        // Calculate stats on the fly
        responseHelper.sentCount = logs.filter(l => l.status === 'SENT' || l.status === 'DELIVERED' || l.status === 'READ').length;
        responseHelper.deliveredCount = logs.filter(l => l.status === 'DELIVERED' || l.status === 'READ').length;
        responseHelper.readCount = logs.filter(l => l.status === 'READ').length;
        responseHelper.failedCount = logs.filter(l => l.status === 'FAILED').length;

        console.log(`[MESSAGES API] Campaign ${req.params.id} stats: SENT=${responseHelper.sentCount} DELIVERED=${responseHelper.deliveredCount} READ=${responseHelper.readCount} FAILED=${responseHelper.failedCount}`);
        if (logs.length > 0) {
            console.log('[MESSAGES API] Sample log statuses:', logs.slice(0, 5).map(l => `${l.messageId?.substring(0, 20)}...:${l.status}`));
        }

        res.json(responseHelper);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Messages
router.get('/', async (req, res) => {
    try {
        const messages = await Message.findAll({
            where: { userId: req.user.id },
            include: [
                { model: Template },
                {
                    model: MessageLog,
                    attributes: ['status'] // Only fetch status to minimize data transfer
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Compute stats for each message
        const responseData = messages.map(msg => {
            const logs = msg.MessageLogs || [];
            const jsonMsg = msg.toJSON();

            // Override counters with real-time aggregations from Logs
            jsonMsg.sentCount = logs.filter(l => ['SENT', 'DELIVERED', 'READ'].includes(l.status)).length;
            jsonMsg.deliveredCount = logs.filter(l => ['DELIVERED', 'READ'].includes(l.status)).length;
            jsonMsg.readCount = logs.filter(l => l.status === 'READ').length;
            jsonMsg.failedCount = logs.filter(l => l.status === 'FAILED').length;

            if (jsonMsg.logs) delete jsonMsg.logs; // Remove legacy logs if present in JSON column to avoid confusion
            delete jsonMsg.MessageLogs; // Cleanup response

            return jsonMsg;
        });

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
