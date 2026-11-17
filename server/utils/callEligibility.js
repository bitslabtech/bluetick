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
    // mode 'text' = free text (only inside the 24 h window); 'template' = an approved template (templateId)
    missedCallMessage: { enabled: true, mode: 'text', text: "Sorry we missed your call. Please send us a message here and we'll get back to you shortly.", templateId: null },
    closedMessage: { enabled: true, mode: 'text', text: "Thanks for calling. We're currently closed. Please leave us a message here and we'll get back to you during business hours.", templateId: null },
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

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Is the customer's 24 h free-reply window open? (last inbound message < 24 h ago) */
function isWindowOpen(lastInboundAt, now = new Date()) {
    if (!lastInboundAt) return false;
    return now.getTime() - new Date(lastInboundAt).getTime() < WINDOW_MS;
}

/** Number of {{n}} variables in a template body, or -1 when they are not simple {{1}}..{{n}}. */
function templateVariableCount(text) {
    const found = [...String(text || '').matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1]);
    if (!found.length) return 0;
    const nums = [...new Set(found)].map(Number);
    if (nums.some((n) => !Number.isInteger(n) || n < 1)) return -1;
    return Math.max(...nums) === nums.length ? nums.length : -1;
}

/**
 * Can this template be used as an automatic call message? Only {{1}} (the caller's name) is
 * filled in, so: standard layout, no media/variable header, at most one body variable.
 */
function templateUsable(t) {
    if (!t || t.status !== 'APPROVED') return { ok: false, reason: 'Not approved yet' };
    if (t.archetype && t.archetype !== 'standard') return { ok: false, reason: 'Carousel templates are not supported' };
    if (t.headerType && t.headerType !== 'NONE' && !(t.headerType === 'TEXT' && !/\{\{/.test(t.headerContent || ''))) {
        return { ok: false, reason: 'Templates with a media or variable header are not supported' };
    }
    if (t.category === 'AUTHENTICATION') return { ok: false, reason: 'Authentication templates are not supported' };
    const n = templateVariableCount(t.content);
    if (n < 0 || n > 1) return { ok: false, reason: 'Only one variable (the caller name) is supported' };
    return { ok: true, variables: n };
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
    isWindowOpen,
    templateVariableCount,
    templateUsable,
};
