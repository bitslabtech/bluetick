const axios = require('axios');
const { Op } = require('sequelize');
const DeviceToken = require('../models/DeviceToken');
const User = require('../models/User');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Owner + all team members of a workspace. */
async function workspaceUserIds(ownerId) {
    const members = await User.findAll({ where: { parentUserId: ownerId }, attributes: ['id'] });
    return [ownerId, ...members.map((m) => m.id)];
}

/** The owner's phone privacy rule for a member ('visible' for the owner). Same rule as the web inbox and call ringing. */
function phonePrivacyOf(user) {
    if (!user?.parentUserId) return 'visible';
    const p = user.teamPolicy?.phonePrivacy;
    return p === 'masked' || p === 'blurred' ? p : 'visible';
}

/**
 * Who sent a message, as this person may see it: the WhatsApp profile name, or the number when there is
 * no real name ("Unknown" is the placeholder stored when WhatsApp gives none). Members whose owner hides
 * numbers get the last 4 digits (masked) or a plain label (blurred), matching the app's showPhone().
 */
function senderLabel(name, phone, privacy = 'visible') {
    const raw = String(name || '').trim();
    const real = raw && raw.toLowerCase() !== 'unknown' && !/^\+?[\d\s\-()]+$/.test(raw) ? raw : null;
    if (real) return real;
    const digits = String(phone || '').replace(/^\+/, '').trim();
    if (!digits) return 'New message';
    if (privacy === 'masked') return `****${digits.replace(/\D/g, '').slice(-4)}`;
    if (privacy === 'blurred') return 'New message';
    return `+${digits}`;
}

/**
 * Send a push to every device in the workspace. `title` is a string, or a function of the
 * recipient's phone privacy ('visible' | 'masked' | 'blurred') when it may contain a customer number. Never throws — push is
 * best-effort and must not break webhook processing. Tokens Expo reports as
 * DeviceNotRegistered are removed.
 */
async function pushToWorkspace(ownerId, { title, body, data, userIds: only }) {
    try {
        // `only` limits the push to specific workspace members (e.g. missed-call recipients)
        const all = await workspaceUserIds(ownerId);
        const userIds = Array.isArray(only) ? all.filter((id) => only.includes(id)) : all;
        // Expo tokens only: call tokens (fcm / apns_voip) are not Expo tokens and are used just for calls.
        const devices = await DeviceToken.findAll({
            where: { userId: { [Op.in]: userIds }, kind: { [Op.or]: ['expo', null] } },
        });
        if (!devices.length) {
            console.warn(`[PUSH] no registered devices for workspace ${ownerId}; nothing sent`);
            return;
        }

        let titleFor = () => title;
        if (typeof title === 'function') {
            const users = await User.findAll({
                where: { id: { [Op.in]: userIds } },
                attributes: ['id', 'parentUserId', 'teamPolicy'],
            });
            const privacy = new Map(users.map((u) => [u.id, phonePrivacyOf(u)]));
            titleFor = (userId) => title(privacy.get(userId) || 'masked'); // unknown user: hide, never leak
        }

        const messages = devices.map((d) => ({
            to: d.token,
            sound: 'default',
            title: titleFor(d.userId),
            body,
            data,
            channelId: 'messages',
        }));

        // Expo accepts up to 100 messages per request.
        for (let i = 0; i < messages.length; i += 100) {
            const chunk = messages.slice(i, i + 100);
            const { data: res } = await axios.post(EXPO_PUSH_URL, chunk, {
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                timeout: 10000,
            });
            const tickets = res?.data || [];
            const dead = [];
            tickets.forEach((t, idx) => {
                if (t.status === 'error') {
                    // e.g. InvalidCredentials / MismatchSenderId = FCM key missing or wrong in EAS
                    console.warn(`[PUSH] Expo rejected a push: ${t.details?.error || 'error'} - ${t.message}`);
                    if (t.details?.error === 'DeviceNotRegistered') dead.push(chunk[idx].to);
                }
            });
            if (dead.length) await DeviceToken.destroy({ where: { token: { [Op.in]: dead } } });
        }
    } catch (e) {
        console.error('[PUSH ERROR]', e.message);
    }
}

module.exports = { pushToWorkspace, senderLabel, phonePrivacyOf };
