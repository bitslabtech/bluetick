const express = require('express');
const router = express.Router();
const metrics = require('../services/outbound/metrics');
const OutboundMessage = require('../models/OutboundMessage');
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
            estimatedCount = await Contact.count({ where: { userId, status: { [Op.notIn]: ['Not on WhatsApp', 'Opted Out'] } } });
        } else if (Array.isArray(targetGroups) && targetGroups.length > 0) {
            // Resolve tags to contact IDs right here
            const allContacts = await Contact.findAll({ where: { userId, status: { [Op.notIn]: ['Not on WhatsApp', 'Opted Out'] } }, attributes: ['id', 'tags'], raw: true });
            const matchedIds = allContacts.filter(c => c.tags && c.tags.some(t => targetGroups.includes(t))).map(c => c.id);
            estimatedCount = matchedIds.length;
            contactIds = matchedIds; // Override contactIds with the resolved list
        } else if (Array.isArray(contactIds)) {
            const validContacts = await Contact.findAll({ where: { id: contactIds, userId, status: { [Op.notIn]: ['Not on WhatsApp', 'Opted Out'] } }, attributes: ['id'], raw: true });
            contactIds = validContacts.map(c => c.id);
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

// ── Live updates for an open broadcast page ──────────────────────────────────
// The page calls this when a campaign_update socket event arrives (or on its slow fallback poll).
// It returns only what changed since the page's last call, so a refresh costs a few small indexed
// queries however large the broadcast is:
//   counts       same numbers as GET /:id (cached ~2s per campaign, shared by team members viewing it)
//   chart        [status, unix seconds, key] for recipients whose status changed (key matches GET /:id)
//   logs         recipient rows that changed or were added (same shape as GET /:id logs)
//   reload=true  too much changed at once (mass sending): fetch GET /:id again instead
const LIVE_COUNTS_TTL_MS = 2000;
const LIVE_MAX_ROWS = 1000;
const liveCounts = new Map(); // campaignId -> { at, st }
const CHART_STATUSES = ['delivered', 'read', 'clicked', 'failed'];

async function campaignCounts(campaignId) {
    const hit = liveCounts.get(campaignId);
    if (hit && Date.now() - hit.at < LIVE_COUNTS_TTL_MS) return hit.st;
    const st = (await metrics.byCampaign([campaignId]))[campaignId];
    liveCounts.set(campaignId, { at: Date.now(), st });
    if (liveCounts.size > 5000) { // keep the cache small
        const cutoff = Date.now() - LIVE_COUNTS_TTL_MS;
        for (const [k, v] of liveCounts) if (v.at < cutoff) liveCounts.delete(k);
    }
    return st;
}

// Counts for a few broadcasts (Broadcast History list, after campaign_update events). ?ids=a,b,c (max 50)
router.get('/stats', async (req, res) => {
    try {
        const ids = String(req.query.ids || '').split(',').map(x => x.trim())
            .filter(x => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 50);
        if (!ids.length) return res.json({});
        const owned = await Message.findAll({ where: { id: ids, userId: req.user.id }, attributes: ['id', 'status', 'recipientCount'], raw: true });
        if (!owned.length) return res.json({});
        const stats = await metrics.byCampaign(owned.map(m => m.id));
        const out = {};
        for (const m of owned) {
            const st = stats[m.id];
            liveCounts.set(m.id, { at: Date.now(), st });
            out[m.id] = {
                status: m.status, recipientCount: m.recipientCount,
                sentCount: st.sent, deliveredCount: st.delivered, readCount: st.read, failedCount: st.failed
            };
        }
        res.json(out);
    } catch (err) {
        console.error('[CAMPAIGN STATS]', err.message);
        res.status(500).json({ error: 'Could not load broadcast stats' });
    }
});

router.get('/:id/live', async (req, res) => {
    try {
        const serverTime = Date.now();
        const message = await Message.findOne({
            where: { id: req.params.id, userId: req.user.id },
            attributes: ['id', 'status', 'recipientCount']
        });
        if (!message) return res.status(404).json({ error: 'Campaign not found' });

        const st = await campaignCounts(message.id);
        const out = {
            serverTime,
            status: message.status,
            recipientCount: message.recipientCount,
            sentCount: st.sent, deliveredCount: st.delivered, readCount: st.read, clickedCount: st.clicked,
            failedCount: st.failed, retryPendingCount: st.retrying, pendingCount: st.pending,
            attemptedCount: st.attempted, blockedCount: st.blocked
        };

        const sinceMs = Number(req.query.since);
        if (!Number.isFinite(sinceMs) || sinceMs <= 0) return res.json({ ...out, reload: true });
        // Overlap a little so a write that committed just after the last call is not missed
        const since = new Date(sinceMs - 3000);

        const [changed, logs] = await Promise.all([
            OutboundMessage.findAll({
                where: { campaignId: message.id, updatedAt: { [Op.gt]: since } },
                attributes: ['id', 'status', 'deliveredAt', 'readAt', 'clickedAt', 'failedAt', 'updatedAt'],
                limit: LIVE_MAX_ROWS + 1,
                raw: true
            }),
            MessageLog.findAll({
                where: { campaignId: message.id, updatedAt: { [Op.gt]: since } },
                order: [['createdAt', 'DESC']],
                limit: LIVE_MAX_ROWS + 1
            })
        ]);
        if (changed.length > LIVE_MAX_ROWS || logs.length > LIVE_MAX_ROWS) return res.json({ ...out, reload: true });

        // Status per changed recipient; statuses the charts do not show (retry pending, retried) clear the key
        out.chart = changed.map(r => {
            if (!CHART_STATUSES.includes(r.status)) return [null, 0, r.id.slice(0, 12)];
            const at = r.status === 'clicked' ? (r.clickedAt || r.readAt)
                : r.status === 'read' ? r.readAt
                : r.status === 'failed' ? r.failedAt
                : r.deliveredAt;
            return [r.status.toUpperCase(), Math.floor(new Date(at || r.updatedAt).getTime() / 1000), r.id.slice(0, 12)];
        });

        const contactIds = [...new Set(logs.map(l => l.contactId).filter(Boolean))];
        const contacts = contactIds.length
            ? await Contact.findAll({ where: { id: contactIds }, attributes: ['id', 'name'], raw: true })
            : [];
        const names = Object.fromEntries(contacts.map(c => [c.id, c.name]));
        out.logs = logs.map(l => ({ ...l.toJSON(), name: names[l.contactId] || 'Unknown / Manual' }));

        res.json(out);
    } catch (err) {
        console.error('[CAMPAIGN LIVE]', err.message);
        res.status(500).json({ error: 'Could not load live updates' });
    }
});

// Get Single Message by ID
router.get('/:id', async (req, res) => {
    try {
        const requestStartedAt = Date.now(); // the page's first "since" for live updates
        const message = await Message.findOne({
            where: { id: req.params.id, userId: req.user.id },
            include: [{ model: Template }]
        });
        if (!message) return res.status(404).json({ error: 'Campaign not found' });

        // Calculate stats via DB aggregates instead of pulling all logs into memory
        // Counts from the outbound ledger: same definitions as Dashboard and Reports
        const st = (await metrics.byCampaign([message.id]))[message.id];
        const { sent: sentCount, delivered: deliveredCount, read: readCount, clicked: clickedCount, failed: failedCount } = st;

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
        responseHelper.retryPendingCount = st.retrying;
        // Compact status events for every recipient (not just the loaded log page), for the timeline
        // and read-hour charts: [status, unix seconds of that status]
        const evRows = await OutboundMessage.findAll({
            where: { campaignId: message.id, status: { [Op.in]: ['delivered', 'read', 'clicked', 'failed'] } },
            attributes: ['id', 'status', 'deliveredAt', 'readAt', 'clickedAt', 'failedAt', 'updatedAt'],
            raw: true
        });
        responseHelper.serverTime = requestStartedAt;
        responseHelper.chartEvents = evRows.map(r => {
            const at = r.status === 'clicked' ? (r.clickedAt || r.readAt)
                : r.status === 'read' ? r.readAt
                : r.status === 'failed' ? r.failedAt
                : r.deliveredAt;
            return [r.status.toUpperCase(), Math.floor(new Date(at || r.updatedAt).getTime() / 1000), r.id.slice(0, 12)];
        });
        responseHelper.pendingCount = st.pending;
        responseHelper.attemptedCount = st.attempted;
        responseHelper.blockedCount = st.blocked;

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
        // One grouped query for all campaigns, from the outbound ledger
        const stats = await metrics.byCampaign(messages.map(m => m.id));
        const responseData = messages.map(msg => {
            const jsonMsg = msg.toJSON();
            const st = stats[msg.id] || metrics.EMPTY;

            jsonMsg.sentCount = st.sent;
            jsonMsg.deliveredCount = st.delivered;
            jsonMsg.readCount = st.read;
            jsonMsg.failedCount = st.failed;
            jsonMsg.retryPendingCount = st.retrying;

            if (jsonMsg.logs) delete jsonMsg.logs;

            return jsonMsg;
        });

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

        // Delete associated logs first. The outbound ledger rows are kept, so the messages still
        // count in dashboard totals, usage and the plan limit (deleting a campaign never gives quota back).
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
