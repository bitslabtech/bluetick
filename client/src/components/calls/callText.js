// Plain-words labels for WhatsApp voice calls. Same wording as the OneDash mobile app.

export const mmss = (s) => `${Math.floor((s || 0) / 60)}:${String((s || 0) % 60).padStart(2, '0')}`;

/** The server stores "Unknown" when WhatsApp gives no profile name; treat that as no name. */
export function realName(name) {
    const n = String(name || '').trim();
    return n && n.toLowerCase() !== 'unknown' ? n : null;
}

/**
 * The caller's number as this viewer may see it. Team members follow the owner's phone privacy
 * setting (same rule as the inbox): 'masked' shows the last 4 digits, 'blurred' is blurred on screen.
 */
export function phoneView(phone, user) {
    if (!phone) return { text: '', blur: false, hidden: false };
    const policy = user?.parentUserId ? (user?.teamPolicy?.phonePrivacy || 'visible') : 'visible';
    if (policy === 'masked') return { text: `****${phone.slice(-4)}`, blur: false, hidden: true };
    return { text: `+${phone}`, blur: policy === 'blurred', hidden: policy === 'blurred' };
}

/** Name, or the number when there is no real name ("Hidden number" if neither). */
export function contactLabel(name, phone, user) {
    return realName(name) || (phone ? phoneView(phone, user).text : 'Hidden number');
}

/** Short status for a list row. */
export function describe(c) {
    switch (c.status) {
        case 'answered': return { text: `In progress${c.answeredByName ? ` · ${c.answeredByName}` : ''}`, bad: false };
        case 'ended': return { text: `${c.answeredByName ? `${c.answeredByName} · ` : ''}${c.durationSec ? mmss(c.durationSec) : 'Answered'}`, bad: false };
        case 'missed': return { text: 'Missed call', bad: true };
        case 'declined': return { text: 'Declined', bad: true };
        case 'ringing': return { text: 'Ringing…', bad: false };
        case 'failed': return { text: 'Call failed', bad: true };
        case 'rejected': return { text: refusedText(c.endReason), bad: true };
        default: return { text: c.status, bad: false };
    }
}

/** Headline for the detail view. */
export function headline(c) {
    if (c.status === 'answered') return { text: 'In progress', bad: false };
    if (c.status === 'ended') return { text: c.durationSec ? `Answered · ${mmss(c.durationSec)}` : 'Answered', bad: false };
    return describe(c);
}

function refusedText(reason) {
    if (reason === 'outside_hours') return 'Refused: outside business hours';
    if (reason === 'no_caller_id') return 'Refused: number hidden';
    return 'Not delivered';
}

export const END_REASON = {
    caller_hung_up: 'The caller hung up before anyone answered.',
    no_answer: 'Nobody answered in time.',
    declined: 'Everyone who was rung declined.',
    outside_hours: 'It came in outside your business hours.',
    no_devices: 'No phone was set up to ring. Install the OneDash mobile app and sign in to take calls.',
    accept_failed: 'WhatsApp could not connect the call.',
    addon_required: 'Voice calling was not enabled for this account.',
    not_eligible: 'Your messaging limit was too low for calling.',
    disabled: 'Calling was switched off.',
    no_caller_id: 'WhatsApp did not share the caller’s number, so the call could not be taken or answered with a message.',
};

/** What happened with the automatic WhatsApp message. */
export function autoText(a) {
    const kind = a.mode === 'template' ? 'template' : 'text message';
    if (a.outcome === 'sent') return { text: `Sent a ${kind} to the caller.`, bad: false };
    if (a.outcome === 'failed') return { text: `Could not be sent${a.reason ? `: ${a.reason}` : '.'}`, bad: true };
    const r = a.reason || '';
    if (r === 'disabled') return { text: 'Not sent: this automatic message is switched off.', bad: false };
    if (r === 'no_text') return { text: 'Not sent: there was no message text.', bad: false };
    if (r.includes('window_closed')) {
        return { text: `Not sent: the customer has not messaged in the last 24 hours, so free text is not allowed${r.startsWith('template_') ? ' and the template was not ready' : ''}. A template can reach them.`, bad: false };
    }
    return { text: 'Not sent.', bad: false };
}

/** Templates OneDash created for call messages. */
export function callTemplateKind(name) {
    const n = String(name || '');
    if (n.startsWith('missed_call_followup')) return 'Missed call message';
    if (n.startsWith('call_after_hours')) return 'Closed message';
    return null;
}

export const STATE_COPY = {
    whatsapp_not_connected: { title: 'Connect WhatsApp first', body: 'Voice calling works on your connected WhatsApp Business number.' },
    addon_required: { title: 'Voice calling is not in your plan', body: 'Add the Voice Calling add-on to let customers call your WhatsApp number and answer in the OneDash mobile app.' },
    not_eligible: { title: 'Messaging limit too low', body: null },
};
