// One place that decides which WhatsApp number and token an account sends with.
// Manual keys (Settings) win; the embedded-signup token on User is the fallback.
const clean = (v) => String(v || '').replace(/[^\x20-\x7E]/g, '').trim();

async function resolveCredentials(ownerId) {
    if (!ownerId) return null;
    const Settings = require('../../models/Settings');
    const User = require('../../models/User');
    const s = await Settings.findOne({ where: { userId: ownerId }, attributes: ['userId', 'metaAccessToken', 'metaPhoneNumberId', 'metaBusinessAccountId'] });
    if (s?.metaAccessToken && s?.metaPhoneNumberId) {
        return { token: clean(s.metaAccessToken), phoneNumberId: clean(s.metaPhoneNumberId), wabaId: s.metaBusinessAccountId || null, from: 'settings' };
    }
    const u = await User.findByPk(ownerId, { attributes: ['id', 'fbAccessToken', 'metaPhoneNumberId', 'wabaId'] });
    if (u?.fbAccessToken && u?.metaPhoneNumberId) {
        return { token: clean(u.fbAccessToken), phoneNumberId: clean(u.metaPhoneNumberId), wabaId: u.wabaId || null, from: 'user' };
    }
    return null;
}

// Bluetick's own number = the WhatsApp of the linked platform CRM account.
async function resolvePlatformAccount() {
    const SystemConfig = require('../../models/SystemConfig');
    const config = await SystemConfig.getCachedConfig();
    const ownerId = config?.settings?.linkedAdminUserId;
    if (!ownerId) return null;
    const creds = await resolveCredentials(ownerId);
    return creds ? { ownerId, ...creds } : null;
}

// Same credentials in the { userId, metaAccessToken, metaPhoneNumberId } shape that the inbox and
// developer API routes expect (they used to read Settings only, so Facebook-sign-in accounts
// without manual keys were told "WhatsApp not configured").
async function resolveSendSettings(ownerId) {
    const c = await resolveCredentials(ownerId);
    return c ? { userId: ownerId, metaAccessToken: c.token, metaPhoneNumberId: c.phoneNumberId, metaBusinessAccountId: c.wabaId } : null;
}

module.exports = { resolveCredentials, resolvePlatformAccount, resolveSendSettings };
