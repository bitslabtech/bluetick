/**
 * Account deletion.
 *
 * purgeUser(user): permanently removes a user's operational data and soft-deletes the User row
 * (name/email kept for admin reports). Used by the superadmin "delete user" action and by the
 * owner's own deletion request once its 30-day grace period ends.
 *
 * Owner self-deletion: requestDeletion / cancelDeletion / runDueDeletions (scheduler).
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('../models/User');

const GRACE_DAYS = 30;
// Delivery records are kept this long after deletion (IT Rules 2021 expect 180 days), then purged.
const LOG_RETENTION_DAYS = 180;

async function purgeUser(user) {
    const uid = user.id;

    // Voice calling: switch calling off at Meta while the WhatsApp credentials still exist, and drop
    // this workspace's call devices and history.
    try {
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne({ where: { userId: uid } });
        if (settings?.metaAccessToken && settings?.metaPhoneNumberId && settings.callSettings?.enabled) {
            await require('../utils/metaCalling').setCallingStatus(settings, false);
        }
    } catch (e) {
        console.warn('[ACCOUNT DELETE] Could not switch calling off at Meta (non-fatal):', e.message);
    }
    try { await require('../models/Call').destroy({ where: { userId: uid } }); } catch (e) { /* ignore */ }
    try { await require('../models/DeviceToken').destroy({ where: { userId: uid } }); } catch (e) { /* ignore */ }

    // ── Step 1: Delete child records that have no direct userId FK ──────────
    // Must be deleted BEFORE their parent to avoid FK constraint errors.
    try {
        // WaStore children
        await sequelize.query(`DELETE FROM "WaProducts" WHERE "storeId" IN (SELECT id FROM "WaStores" WHERE "userId" = :uid)`, { replacements: { uid } });
        await sequelize.query(`DELETE FROM "WaOrders" WHERE "storeId" IN (SELECT id FROM "WaStores" WHERE "userId" = :uid)`, { replacements: { uid } });
        await sequelize.query(`DELETE FROM "WaStoreCoupons" WHERE "storeId" IN (SELECT id FROM "WaStores" WHERE "userId" = :uid)`, { replacements: { uid } });
        // Conversation children
        await sequelize.query(`DELETE FROM "ChatMessages" WHERE "conversationId" IN (SELECT id FROM "Conversations" WHERE "userId" = :uid)`, { replacements: { uid } });
        // Contact children
        await sequelize.query(`DELETE FROM "ContactMessages" WHERE "contactId" IN (SELECT id FROM "Contacts" WHERE "userId" = :uid)`, { replacements: { uid } });
        await sequelize.query(`DELETE FROM "ContactFlowStates" WHERE "contactId" IN (SELECT id FROM "Contacts" WHERE "userId" = :uid)`, { replacements: { uid } });
    } catch (e) {
        console.warn('[ADMIN DELETE] Nested cleanup warning (non-fatal):', e.message);
    }

    // ── Step 1b: Delivery logs are kept, but without message content ───────
    // MessageLogs hang off the campaign rows ("Messages"). Keep both for LOG_RETENTION_DAYS
    // (recipient number, status, times, Meta ids) and strip everything that holds content
    // or recipient lists. purgeExpiredLogs() removes them for good afterwards.
    try {
        await sequelize.query(`UPDATE "MessageLogs" SET "inboxPayload" = NULL, "clickedButton" = NULL WHERE "campaignId" IN (SELECT id FROM "Messages" WHERE "userId" = :uid)`, { replacements: { uid } });
        await sequelize.query(`UPDATE "Messages" SET "targetConfig" = '{}'::jsonb, "logs" = '[]'::jsonb, "referral" = NULL WHERE "userId" = :uid`, { replacements: { uid } });
    } catch (e) {
        console.warn('[ACCOUNT DELETE] Could not strip delivery log content (non-fatal):', e.message);
    }

    // ── Step 2: Delete direct-userId operational models ────────────────────
    // ⚠️  INTENTIONALLY EXCLUDED to preserve admin dashboard reports:
    //     Transaction, AiTokenLog, MessageLog, ActivityLog
    const OPERATIONAL_MODELS_WITH_USERID = [
        'WaStore',          // parent safe after step 1 cleaned children
        'VcardEnquiry', 'Vcard',
        'NfcOrder', 'NfcCard',
        'TechPartnerPayout', // has userId field
        'TechPartner',
        'MetaAdCampaign',
        'FlowExecutionLog', 'Flow',
        'FormResponse', 'Form',
        // 'Message' (campaign rows) is NOT deleted here: its MessageLogs are kept, content-free,
        // for LOG_RETENTION_DAYS. See Step 1b and purgeExpiredLogs().
        'Conversation',
        'Contact',
        'ApiUsageLog', 'ApiKey', 'Webhook',
        'Group', 'Label', 'QuickReply', 'AutoTagRule',
        'Campaign', 'Template',
        'MediaFile',
        'PaymentSession',
        'UserAddon',
        'SystemNotification',
    ];

    for (const modelName of OPERATIONAL_MODELS_WITH_USERID) {
        try {
            const Model = require(`../models/${modelName}`);
            if (Model && typeof Model.destroy === 'function') {
                // force: true — permanent delete even for soft-delete models (e.g. Conversation)
                await Model.destroy({ where: { userId: uid }, force: true });
            }
        } catch (e) {
            // Model file may not exist or field name may differ — skip silently
        }
    }

    // ── Step 2b: Models with non-standard FK field names ───────────────────
    try {
        const ReferralReward = require('../models/ReferralReward');
        await ReferralReward.destroy({ where: { [Op.or]: [{ referrerId: uid }, { referredUserId: uid }] } });
    } catch (e) { /* ignore */ }

    try {
        const TechPartnerEarning = require('../models/TechPartnerEarning');
        await TechPartnerEarning.destroy({ where: { [Op.or]: [{ referrerId: uid }, { referredUserId: uid }] } });
    } catch (e) { /* ignore */ }

    // Delete Settings
    try {
        const Settings = require('../models/Settings');
        await Settings.destroy({ where: { userId: uid } });
    } catch (e) { /* ignore */ }

    // ── Step 3: Soft-delete the User row ──────────────────────────────────
    // We KEEP name and email — admin JOINs for Top Token Consumers,
    // Activity Logs, and historical reports rely on these for identity.
    // We CLEAR only auth/security-sensitive fields.
    user.status = 'deleted';
    user.deletedAt = new Date();
    user.password = '$DELETED$' + crypto.randomBytes(32).toString('hex');
    user.fbAccessToken = null;
    user.metaAdsToken = null;
    user.inviteToken = null;
    user.referralCode = null;
    await user.save();
}

/** Soft-delete the workspace's team members (their data lives under the owner and is purged with it). */
async function purgeTeam(ownerId) {
    const members = await User.findAll({ where: { parentUserId: ownerId, status: { [Op.ne]: 'deleted' } } });
    for (const m of members) {
        try { await require('../models/DeviceToken').destroy({ where: { userId: m.id } }); } catch (e) { /* ignore */ }
        m.status = 'deleted';
        m.deletedAt = new Date();
        m.password = '$DELETED$' + crypto.randomBytes(32).toString('hex');
        m.inviteToken = null;
        m.referralCode = null;
        await m.save();
    }
    return members.length;
}

/** Owner asks to delete the whole workspace: scheduled GRACE_DAYS from now. */
async function requestDeletion(user) {
    const when = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000);
    user.deletionScheduledFor = when;
    await user.save();
    return when;
}

async function cancelDeletion(user) {
    user.deletionScheduledFor = null;
    await user.save();
}

/** Scheduler: delete every workspace whose grace period has ended. */
async function runDueDeletions(now = new Date()) {
    const due = await User.findAll({
        where: { deletionScheduledFor: { [Op.lte]: now }, status: { [Op.ne]: 'deleted' }, parentUserId: null, isAdmin: false },
    });
    for (const owner of due) {
        try {
            const team = await purgeTeam(owner.id);
            await purgeUser(owner);
            owner.deletionScheduledFor = null;
            await owner.save();
            console.log(`[ACCOUNT DELETE] Deleted workspace ${owner.id} (${team} team members) after the grace period`);
        } catch (e) {
            console.error(`[ACCOUNT DELETE] Failed for ${owner.id}:`, e.message);
        }
    }
    return due.length;
}

/**
 * Scheduler: permanently delete the kept delivery logs (and their campaign rows) of accounts
 * deleted more than LOG_RETENTION_DAYS ago. Idempotent; once done it finds nothing.
 */
async function purgeExpiredLogs(now = new Date()) {
    const cutoff = new Date(now.getTime() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const users = await User.findAll({ where: { status: 'deleted', deletedAt: { [Op.lte]: cutoff } }, attributes: ['id'] });
    for (const { id: uid } of users) {
        try {
            await sequelize.query(`DELETE FROM "MessageLogs" WHERE "campaignId" IN (SELECT id FROM "Messages" WHERE "userId" = :uid)`, { replacements: { uid } });
            await sequelize.query(`DELETE FROM "Messages" WHERE "userId" = :uid`, { replacements: { uid } });
        } catch (e) {
            console.error(`[ACCOUNT DELETE] Log purge failed for ${uid}:`, e.message);
        }
    }
    return users.length;
}

module.exports = { GRACE_DAYS, LOG_RETENTION_DAYS, purgeExpiredLogs, purgeUser, purgeTeam, requestDeletion, cancelDeletion, runDueDeletions };
