const axios = require('axios');

const GRAPH = 'https://graph.facebook.com/v22.0';

const headers = (settings) => ({
    Authorization: `Bearer ${settings.metaAccessToken}`,
    'Content-Type': 'application/json',
});

/**
 * Enable/disable calling on the business number and apply our fixed policy:
 * customer-initiated only (no callback permission prompts), Meta voicemail off.
 * https://developers.facebook.com/docs/whatsapp/cloud-api/calling
 */
async function setCallingStatus(settings, enabled) {
    const body = {
        calling: {
            status: enabled ? 'ENABLED' : 'DISABLED',
            call_icon_visibility: 'DEFAULT',
            callback_permission_status: 'DISABLED',
            // Phase 1: we answer through the app (WebRTC), not a SIP trunk.
            sip: { status: 'DISABLED' },
        },
    };
    const { data } = await axios.post(`${GRAPH}/${settings.metaPhoneNumberId}/settings`, body, {
        headers: headers(settings),
        timeout: 15000,
    });
    return data;
}

/** Read the number's current calling settings (used to show real status in the app). */
async function getCallingSettings(settings) {
    const { data } = await axios.get(`${GRAPH}/${settings.metaPhoneNumberId}/settings`, {
        headers: headers(settings),
        params: { fields: 'calling' },
        timeout: 15000,
    });
    return data?.calling || null;
}

/** POST /<phone>/calls with an action: pre_accept | accept | reject | terminate. */
async function callAction(settings, { action, callId, sdp }) {
    const body = { messaging_product: 'whatsapp', call_id: callId, action };
    if (sdp) body.session = { sdp_type: 'answer', sdp };
    const { data } = await axios.post(`${GRAPH}/${settings.metaPhoneNumberId}/calls`, body, {
        headers: headers(settings),
        timeout: 15000,
    });
    return data;
}

const acceptCall = (settings, callId, sdp) => callAction(settings, { action: 'accept', callId, sdp });
const preAcceptCall = (settings, callId, sdp) => callAction(settings, { action: 'pre_accept', callId, sdp });
const rejectCall = (settings, callId) => callAction(settings, { action: 'reject', callId });
const terminateCall = (settings, callId) => callAction(settings, { action: 'terminate', callId });

module.exports = { setCallingStatus, getCallingSettings, callAction, acceptCall, preAcceptCall, rejectCall, terminateCall };
