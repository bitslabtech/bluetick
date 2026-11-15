/**
 * Pure helpers (no DB) deciding whether a workspace may use WhatsApp voice calling.
 * Meta itself only enables calling on numbers with a 2,000+ messaging limit; we check the same
 * so the app can show a clear state instead of a silent failure.
 */
const MIN_MESSAGING_LIMIT = 2000;
const VOICE_ADDON_KEY = 'voice_calling';

const DEFAULT_CALL_SETTINGS = {
    enabled: false,
    allowOutsideHours: false,
    hours: null,
    missedCallMessage: { enabled: true, text: "Sorry we missed your call. Please send us a message here and we'll get back to you shortly." },
    closedMessage: { enabled: true, text: "Thanks for calling. We're currently closed. Please leave us a message here and we'll get back to you during business hours." },
    fallbackAfterSec: 20,
};

/** "TIER_2K" | "TIER_10K" | "TIER_UNLIMITED" | "2000" | 250 ... -> number (0 when unknown). */
function parseMessagingLimit(metaTier) {
    if (metaTier === null || metaTier === undefined || metaTier === '') return 0;
    const s = String(metaTier).toUpperCase();
    if (s.includes('UNLIMITED')) return Number.MAX_SAFE_INTEGER;
    const k = s.match(/(\d+)\s*K/);
    if (k) return parseInt(k[1], 10) * 1000;
    const n = s.match(/\d+/);
    return n ? parseInt(n[0], 10) : 0;
}

function checkTier(metaTier) {
    const limit = parseMessagingLimit(metaTier);
    return { eligible: limit >= MIN_MESSAGING_LIMIT, limit };
}

/** Merge stored settings over the defaults so older rows without callSettings keep working. */
function resolveCallSettings(stored) {
    const s = stored && typeof stored === 'object' ? stored : {};
    return {
        ...DEFAULT_CALL_SETTINGS,
        ...s,
        missedCallMessage: { ...DEFAULT_CALL_SETTINGS.missedCallMessage, ...(s.missedCallMessage || {}) },
        closedMessage: { ...DEFAULT_CALL_SETTINGS.closedMessage, ...(s.closedMessage || {}) },
    };
}

/**
 * Are we inside business hours right now? `hours` is { timezone, schedule:[{day,enabled,startTime,endTime}] }
 * (the same shape as whatsappAutomations.offHoursMessage). No schedule configured = always open.
 */
function isWithinHours(hours, now = new Date()) {
    if (!hours || !Array.isArray(hours.schedule) || hours.schedule.length === 0) return true;
    let local;
    try {
        local = new Date(now.toLocaleString('en-US', { timeZone: hours.timezone || 'UTC' }));
    } catch {
        local = now;
    }
    const day = local.getDay();
    const today = hours.schedule.find((d) => d.day === day);
    if (!today || !today.enabled) return false;
    const [sh, sm] = String(today.startTime || '09:00').split(':').map(Number);
    const [eh, em] = String(today.endTime || '17:00').split(':').map(Number);
    const mins = local.getHours() * 60 + local.getMinutes();
    return mins >= sh * 60 + (sm || 0) && mins <= eh * 60 + (em || 0);
}

/** The schedule that applies: the calling-specific one, else the WhatsApp off-hours one. */
function effectiveHours(callSettings, whatsappAutomations) {
    if (callSettings.hours && Array.isArray(callSettings.hours.schedule) && callSettings.hours.schedule.length) {
        return callSettings.hours;
    }
    const off = whatsappAutomations?.offHoursMessage;
    if (off && Array.isArray(off.schedule) && off.schedule.length) {
        return { timezone: off.timezone || 'UTC', schedule: off.schedule };
    }
    return null;
}

module.exports = {
    MIN_MESSAGING_LIMIT,
    VOICE_ADDON_KEY,
    DEFAULT_CALL_SETTINGS,
    parseMessagingLimit,
    checkTier,
    resolveCallSettings,
    isWithinHours,
    effectiveHours,
};
