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

/**
 * Send a push to every device in the workspace. Never throws — push is
 * best-effort and must not break webhook processing. Tokens Expo reports as
 * DeviceNotRegistered are removed.
 */
async function pushToWorkspace(ownerId, { title, body, data }) {
    try {
        const userIds = await workspaceUserIds(ownerId);
        const devices = await DeviceToken.findAll({ where: { userId: { [Op.in]: userIds } } });
        if (!devices.length) return;

        const messages = devices.map((d) => ({
            to: d.token,
            sound: 'default',
            title,
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
                if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') dead.push(chunk[idx].to);
            });
            if (dead.length) await DeviceToken.destroy({ where: { token: { [Op.in]: dead } } });
        }
    } catch (e) {
        console.error('[PUSH ERROR]', e.message);
    }
}

module.exports = { pushToWorkspace };
