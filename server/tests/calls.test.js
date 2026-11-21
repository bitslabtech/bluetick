/**
 * Voice calling: eligibility rules (pure) and the ringing/lifecycle rules in CallService,
 * with every model, Meta call and push mocked (no DB, no network).
 */
const elig = require('../utils/callEligibility');

describe('callEligibility', () => {
    test('parses Meta tiers', () => {
        expect(elig.parseMessagingLimit('TIER_250')).toBe(250);
        expect(elig.parseMessagingLimit('TIER_1K')).toBe(1000);
        expect(elig.parseMessagingLimit('TIER_2K')).toBe(2000);
        expect(elig.parseMessagingLimit('TIER_10K')).toBe(10000);
        expect(elig.parseMessagingLimit('TIER_100K')).toBe(100000);
        expect(elig.parseMessagingLimit('TIER_UNLIMITED')).toBeGreaterThan(1e9);
        expect(elig.parseMessagingLimit('2000')).toBe(2000);
        expect(elig.parseMessagingLimit(null)).toBe(0);
    });

    test('2,000+ is eligible, below is not', () => {
        expect(elig.checkTier('TIER_1K').eligible).toBe(false);
        expect(elig.checkTier('TIER_250').eligible).toBe(false);
        expect(elig.checkTier(null).eligible).toBe(false);
        expect(elig.checkTier('TIER_2K').eligible).toBe(true);
        expect(elig.checkTier('TIER_UNLIMITED').eligible).toBe(true);
    });

    test('business hours', () => {
        const hours = { timezone: 'UTC', schedule: [{ day: 1, enabled: true, startTime: '09:00', endTime: '17:00' }] };
        expect(elig.isWithinHours(hours, new Date('2026-11-16T10:00:00Z'))).toBe(true);  // Monday 10:00
        expect(elig.isWithinHours(hours, new Date('2026-11-16T18:00:00Z'))).toBe(false); // Monday 18:00
        expect(elig.isWithinHours(hours, new Date('2026-11-17T10:00:00Z'))).toBe(false); // Tuesday: not scheduled
        expect(elig.isWithinHours(null)).toBe(true);                                      // no schedule = always open
        expect(elig.isWithinHours({ schedule: [] })).toBe(true);
    });

    test('falls back to the WhatsApp off-hours schedule', () => {
        const schedule = [{ day: 1, enabled: true, startTime: '09:00', endTime: '17:00' }];
        const cs = elig.resolveCallSettings({});
        expect(elig.effectiveHours(cs, { offHoursMessage: { timezone: 'Asia/Kolkata', schedule } })).toEqual({ timezone: 'Asia/Kolkata', schedule });
        expect(elig.effectiveHours(cs, {})).toBeNull();
        const own = { timezone: 'UTC', schedule };
        expect(elig.effectiveHours(elig.resolveCallSettings({ hours: own }), { offHoursMessage: { schedule: [] } })).toEqual(own);
    });

    test('settings merge over defaults', () => {
        const s = elig.resolveCallSettings({ enabled: true, missedCallMessage: { enabled: false } });
        expect(s.enabled).toBe(true);
        expect(s.allowOutsideHours).toBe(false);
        expect(s.missedCallMessage.enabled).toBe(false);
        expect(s.missedCallMessage.text).toBeTruthy();
        expect(s.fallbackAfterSec).toBe(20);
    });
});

// ── CallService with mocked collaborators ────────────────────────────────────────────────────────
const mockStore = { messages: [], templates: [], calls: [], conv: null, users: [], devices: [], settings: null, addon: true, owner: { id: 'owner', metaTier: 'TIER_2K' } };

jest.mock('../models/Call', () => {
    const matches = (row, where) => Object.entries(where).every(([k, v]) => row[k] === v);
    const wrap = (row) => Object.assign(row, {
        update: async (patch) => Object.assign(row, patch),
        reload: async () => row,
    });
    return {
        findOne: async ({ where }) => mockStore.calls.find((r) => matches(r, where)) || null,
        findAll: async ({ where }) => mockStore.calls.filter((r) => matches(r, where)),
        create: async (row) => { const r = wrap({ id: `call-${mockStore.calls.length + 1}`, declinedBy: [], ringTargets: [], ringStage: 1, startedAt: new Date(), ...row }); mockStore.calls.push(r); return r; },
        update: async (patch, { where }) => {
            const rows = mockStore.calls.filter((r) => matches(r, where));
            rows.forEach((r) => Object.assign(r, patch));
            return [rows.length];
        },
    };
});
jest.mock('../models/ChatMessage', () => ({
    findOne: async ({ where }) => mockStore.messages.find((m) => m.messageId === where.messageId) || null,
    create: async (row) => { mockStore.messages.push(row); return row; },
}));
jest.mock('../models/Template', () => ({
    findOne: async ({ where }) => mockStore.templates.find((t) => t.id === where.id) || null,
}));
jest.mock('../utils/pushNotifications', () => ({ pushToWorkspace: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../models/Conversation', () => ({
    findByPk: async () => mockStore.conv,
    findOne: async () => mockStore.conv,
    create: async (row) => { mockStore.conv = { id: 'conv-new', ...row }; return mockStore.conv; },
}));
jest.mock('../models/Settings', () => ({ findOne: async () => mockStore.settings, findAll: async () => [mockStore.settings] }));
jest.mock('../models/User', () => ({
    findAll: async () => mockStore.users,
    findByPk: async () => mockStore.owner,
}));
jest.mock('../models/Addon', () => ({ findOne: async () => (mockStore.addon ? { id: 'addon' } : null) }));
jest.mock('../models/UserAddon', () => ({ findOne: async () => (mockStore.addon ? { id: 'ua', currentPeriodEnd: mockStore.addonEnd ?? null } : null) }));
jest.mock('../models/DeviceToken', () => ({
    findAll: async ({ where }) => mockStore.devices.filter((d) => where.userId[require('sequelize').Op.in].includes(d.userId)),
    destroy: async () => 0,
}));
jest.mock('../utils/metaCalling', () => ({
    rejectCall: jest.fn().mockResolvedValue({}),
    setCallingStatus: jest.fn().mockResolvedValue({}),
    acceptCall: jest.fn().mockResolvedValue({}),
    terminateCall: jest.fn().mockResolvedValue({}),
}));
jest.mock('../utils/callPush', () => ({
    pushIncomingCall: jest.fn().mockResolvedValue({ ok: true, dead: false }),
    pushCallEnded: jest.fn().mockResolvedValue({ ok: true, dead: false }),
}));
jest.mock('../utils/whatsappSender', () => ({ sendWhatsAppAndLog: jest.fn().mockResolvedValue({}) }));
jest.mock('../socket', () => ({ getIo: () => ({ to: () => ({ emit: () => {} }) }) }));

const meta = require('../utils/metaCalling');
const push = require('../utils/callPush');
const { sendWhatsAppAndLog } = require('../utils/whatsappSender');
const { pushToWorkspace } = require('../utils/pushNotifications');
const CallService = require('../services/CallService');

const connect = (id = 'wacid1') => ({ calls: [{ id, from: '919999999999', event: 'connect', direction: 'USER_INITIATED', session: { sdp_type: 'offer', sdp: 'v=0 offer' } }], contacts: [{ profile: { name: 'Asha' } }] });
const dev = (userId, kind = 'fcm') => ({ userId, token: `${userId}-${kind}-token-xxxxxxxxxxxx`, kind });

beforeEach(() => {
    jest.clearAllMocks();
    mockStore.calls = [];
    mockStore.templates = [];
    mockStore.messages = [];
    // the customer wrote recently, so their 24 h window is open
    mockStore.conv = { id: 'conv1', phoneNumber: '919999999999', contactName: 'Asha', assignedTo: null, userId: 'owner', lastInboundMessageAt: new Date(), save: async () => {} };
    mockStore.users = [
        { id: 'owner', name: 'Owner', teamRole: 'owner', parentUserId: null },
        { id: 'admin1', name: 'Admin', teamRole: 'admin', parentUserId: 'owner' },
        { id: 'agent1', name: 'Agent', teamRole: 'editor', parentUserId: 'owner' },
        { id: 'agent2', name: 'Agent2', teamRole: 'editor', parentUserId: 'owner' },
    ];
    mockStore.devices = [dev('owner'), dev('admin1'), dev('agent1'), dev('agent2', 'apns_voip')];
    mockStore.addon = true;
    mockStore.addonEnd = null;
    mockStore.owner = { id: 'owner', metaTier: 'TIER_2K' };
    mockStore.settings = {
        userId: 'owner', metaAccessToken: 't', metaPhoneNumberId: 'p', whatsappAutomations: {},
        callSettings: { enabled: true, allowOutsideHours: true, fallbackAfterSec: 20, missedCallMessage: { enabled: true }, closedMessage: { enabled: true } },
    };
});

const run = (value = connect()) => CallService.handleCallsWebhook({ ownerId: 'owner', settings: mockStore.settings, value });
const ringedUsers = () => push.pushIncomingCall.mock.calls.map(([d]) => d.userId).sort();

describe('CallService ringing rules', () => {
    test('unassigned caller rings owner + admins only', async () => {
        await run();
        expect(ringedUsers()).toEqual(['admin1', 'owner']);
        expect(mockStore.calls[0]).toMatchObject({ status: 'ringing', ringStage: 1, conversationId: 'conv1' });
    });

    test('assigned caller rings only the assignee', async () => {
        mockStore.conv.assignedTo = 'agent1';
        await run();
        expect(ringedUsers()).toEqual(['agent1']);
    });

    test('assignee without a call device falls back to owner + admins', async () => {
        mockStore.conv.assignedTo = 'agent2';
        mockStore.devices = [dev('owner'), dev('admin1')];
        await run();
        expect(ringedUsers()).toEqual(['admin1', 'owner']);
    });

    test('after the fallback delay everyone not yet rung is rung', async () => {
        mockStore.conv.assignedTo = 'agent1';
        await run();
        push.pushIncomingCall.mockClear();
        mockStore.calls[0].startedAt = new Date(Date.now() - 25_000);
        await CallService.sweep();
        expect(mockStore.calls[0].ringStage).toBe(2);
        expect(ringedUsers()).toEqual(['admin1', 'agent2', 'owner']);
    });

    test('no answer: missed, rejected at Meta, caller gets the auto message', async () => {
        await run();
        mockStore.calls[0].startedAt = new Date(Date.now() - 45_000);
        await CallService.sweep();
        expect(mockStore.calls[0]).toMatchObject({ status: 'missed', endReason: 'no_answer' });
        expect(meta.rejectCall).toHaveBeenCalledTimes(1);
        expect(sendWhatsAppAndLog).toHaveBeenCalledTimes(1);
    });

    test('caller hangs up while ringing: missed + auto message', async () => {
        await run();
        await run({ calls: [{ id: 'wacid1', event: 'terminate' }] });
        expect(mockStore.calls[0]).toMatchObject({ status: 'missed', endReason: 'caller_hung_up' });
        expect(sendWhatsAppAndLog).toHaveBeenCalledTimes(1);
    });

    test('a retried webhook does not create a second call', async () => {
        await run();
        await run();
        expect(mockStore.calls).toHaveLength(1);
    });
});

describe('CallService refusals', () => {
    test('add-on period ended: rejected even while the row still says active', async () => {
        mockStore.addonEnd = new Date(Date.now() - 60_000);
        await run();
        expect(mockStore.calls[0]).toMatchObject({ status: 'rejected', endReason: 'addon_required' });
        expect(push.pushIncomingCall).not.toHaveBeenCalled();
    });

    test('no add-on: rejected, nobody rung', async () => {
        mockStore.addon = false;
        await run();
        expect(mockStore.calls[0]).toMatchObject({ status: 'rejected', endReason: 'addon_required' });
        expect(meta.rejectCall).toHaveBeenCalled();
        expect(push.pushIncomingCall).not.toHaveBeenCalled();
    });

    test('messaging limit under 2,000: rejected', async () => {
        mockStore.owner.metaTier = 'TIER_1K';
        await run();
        expect(mockStore.calls[0]).toMatchObject({ status: 'rejected', endReason: 'not_eligible' });
    });

    test('calling switched off: rejected', async () => {
        mockStore.settings.callSettings.enabled = false;
        await run();
        expect(mockStore.calls[0]).toMatchObject({ status: 'rejected', endReason: 'disabled' });
    });

    test('outside business hours: rejected with the closed message', async () => {
        mockStore.settings.callSettings.allowOutsideHours = false;
        mockStore.settings.whatsappAutomations = { offHoursMessage: { timezone: 'UTC', schedule: [{ day: 0, enabled: false }] } };
        // every day disabled in this schedule => always closed
        mockStore.settings.whatsappAutomations.offHoursMessage.schedule = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, enabled: false }));
        await run();
        expect(mockStore.calls[0]).toMatchObject({ status: 'rejected', endReason: 'outside_hours' });
        expect(sendWhatsAppAndLog).toHaveBeenCalledTimes(1);
    });

    test('outside hours but allowed by the business: rings', async () => {
        mockStore.settings.callSettings.allowOutsideHours = true;
        mockStore.settings.whatsappAutomations = { offHoursMessage: { timezone: 'UTC', schedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, enabled: false })) } };
        await run();
        expect(mockStore.calls[0].status).toBe('ringing');
    });

    test('nobody has a call device: rejected as no_devices', async () => {
        mockStore.devices = [];
        await run();
        expect(mockStore.calls[0]).toMatchObject({ status: 'rejected', endReason: 'no_devices' });
    });
});

describe('CallService answer / decline', () => {
    test('first answer wins, second gets already_handled; others stop ringing', async () => {
        await run();
        const call = mockStore.calls[0];
        const a = await CallService.answer(call, { id: 'owner', name: 'Owner' }, 'v=0 answer', mockStore.settings);
        expect(a.ok).toBe(true);
        expect(meta.acceptCall).toHaveBeenCalledWith(mockStore.settings, 'wacid1', 'v=0 answer');
        expect(call).toMatchObject({ status: 'answered', answeredBy: 'owner' });
        expect(push.pushCallEnded).toHaveBeenCalled(); // admin1's phone stops ringing
        const b = await CallService.answer(call, { id: 'admin1', name: 'Admin' }, 'v=0 answer', mockStore.settings);
        expect(b).toMatchObject({ ok: false, code: 'already_handled' });
        expect(meta.acceptCall).toHaveBeenCalledTimes(1);
    });

    test('Meta refusing the accept marks the call failed', async () => {
        await run();
        meta.acceptCall.mockRejectedValueOnce(new Error('boom'));
        const r = await CallService.answer(mockStore.calls[0], { id: 'owner', name: 'Owner' }, 'v=0 answer', mockStore.settings);
        expect(r.ok).toBe(false);
        expect(mockStore.calls[0].status).toBe('failed');
    });

    test('everyone in stage 1 declining advances to the whole team', async () => {
        mockStore.conv.assignedTo = 'agent1';
        await run();
        push.pushIncomingCall.mockClear();
        await CallService.decline(mockStore.calls[0], 'agent1', mockStore.settings);
        expect(mockStore.calls[0].ringStage).toBe(2);
        expect(ringedUsers()).toEqual(['admin1', 'agent2', 'owner']);
    });

    test('everyone declining in stage 2 rejects the call', async () => {
        mockStore.devices = [dev('owner')];
        await run();
        await CallService.decline(mockStore.calls[0], 'owner', mockStore.settings);
        expect(mockStore.calls[0]).toMatchObject({ status: 'declined' });
        expect(meta.rejectCall).toHaveBeenCalled();
    });

    test('answered call ends with a duration when the customer hangs up', async () => {
        await run();
        const call = mockStore.calls[0];
        await CallService.answer(call, { id: 'owner', name: 'Owner' }, 'v=0 answer', mockStore.settings);
        await run({ calls: [{ id: 'wacid1', event: 'terminate', duration: 42 }] });
        expect(call).toMatchObject({ status: 'ended', durationSec: 42 });
    });
});


describe('automatic call messages', () => {
    const tmpl = (over = {}) => ({ id: 't1', name: 'missed_call_x', content: 'Hi {{1}}, sorry we missed you.', language: 'en_US', status: 'APPROVED', category: 'UTILITY', archetype: 'standard', headerType: 'NONE', ...over });
    const miss = async () => { await run(); await run({ calls: [{ id: 'wacid1', event: 'terminate' }] }); };

    test('text is skipped when the 24 h window is closed', async () => {
        mockStore.conv.lastInboundMessageAt = new Date(Date.now() - 30 * 3600 * 1000);
        await miss();
        expect(sendWhatsAppAndLog).not.toHaveBeenCalled();
        expect(mockStore.calls[0].autoMessage).toMatchObject({ outcome: 'skipped', reason: 'window_closed' });
    });

    test('a brand-new caller (never wrote) gets no free text', async () => {
        mockStore.conv.lastInboundMessageAt = null;
        await miss();
        expect(sendWhatsAppAndLog).not.toHaveBeenCalled();
    });

    test('disabled message is not sent', async () => {
        mockStore.settings.callSettings.missedCallMessage = { enabled: false };
        await miss();
        expect(sendWhatsAppAndLog).not.toHaveBeenCalled();
        expect(mockStore.calls[0].autoMessage.reason).toBe('disabled');
    });

    test('template mode sends even when the window is closed, filling in the first name', async () => {
        mockStore.conv.lastInboundMessageAt = null;
        mockStore.templates = [tmpl()];
        mockStore.settings.callSettings.missedCallMessage = { enabled: true, mode: 'template', templateId: 't1' };
        await miss();
        const arg = sendWhatsAppAndLog.mock.calls[0][0];
        expect(arg.type).toBe('template');
        expect(arg.payload.template).toMatchObject({ name: 'missed_call_x', language: { code: 'en_US' }, components: [{ type: 'body', parameters: [{ type: 'text', text: 'Asha' }] }] });
        expect(mockStore.calls[0].autoMessage).toMatchObject({ outcome: 'sent', mode: 'template' });
    });

    test('number-only callers are greeted as "there"', async () => {
        mockStore.conv.contactName = '919999999999';
        mockStore.templates = [tmpl()];
        mockStore.settings.callSettings.missedCallMessage = { enabled: true, mode: 'template', templateId: 't1' };
        await miss();
        expect(sendWhatsAppAndLog.mock.calls[0][0].payload.template.components[0].parameters[0].text).toBe('there');
    });

    test('template still pending: falls back to text only if the window is open', async () => {
        mockStore.templates = [tmpl({ status: 'PENDING' })];
        mockStore.settings.callSettings.missedCallMessage = { enabled: true, mode: 'template', templateId: 't1', text: 'fallback text' };
        await miss();
        expect(sendWhatsAppAndLog.mock.calls[0][0].type).toBe('text');
        expect(mockStore.calls[0].autoMessage).toMatchObject({ outcome: 'sent', reason: 'template_pending' });
    });

    test('template pending and window closed: nothing is sent', async () => {
        mockStore.conv.lastInboundMessageAt = null;
        mockStore.templates = [tmpl({ status: 'PENDING' })];
        mockStore.settings.callSettings.missedCallMessage = { enabled: true, mode: 'template', templateId: 't1', text: 'fallback text' };
        await miss();
        expect(sendWhatsAppAndLog).not.toHaveBeenCalled();
        expect(mockStore.calls[0].autoMessage.outcome).toBe('skipped');
    });

    test('a Meta failure is recorded, not thrown', async () => {
        sendWhatsAppAndLog.mockRejectedValueOnce(new Error('meta down'));
        await miss();
        expect(mockStore.calls[0].autoMessage).toMatchObject({ outcome: 'failed' });
    });
});

describe('missed-call notification', () => {
    const miss = async () => { await run(); await run({ calls: [{ id: 'wacid1', event: 'terminate' }] }); };

    test('owner, admins and everyone who was rung are notified', async () => {
        mockStore.conv.assignedTo = 'agent1';
        await miss();
        const arg = pushToWorkspace.mock.calls[0][1];
        expect(arg.userIds.sort()).toEqual(['admin1', 'agent1', 'owner']);
        expect(arg).toMatchObject({ title: 'Missed call', data: { type: 'missed_call', callId: mockStore.calls[0].id } });
    });

    test('an answered call sends no missed-call notification', async () => {
        await run();
        await CallService.answer(mockStore.calls[0], { id: 'owner', name: 'Owner' }, 'v=0 answer', mockStore.settings);
        await run({ calls: [{ id: 'wacid1', event: 'terminate', duration: 5 }] });
        expect(pushToWorkspace).not.toHaveBeenCalled();
    });

    test('a member who declined is not notified, the owner and admins are', async () => {
        mockStore.conv.assignedTo = 'agent1';
        mockStore.devices = [dev('agent1')];
        await run();
        await CallService.decline(mockStore.calls[0], 'agent1', mockStore.settings);
        // stage 2: nobody else has a device -> all declined -> declined
        const arg = pushToWorkspace.mock.calls[0]?.[1];
        expect(arg.userIds).not.toContain('agent1');
        expect(arg.userIds).toEqual(expect.arrayContaining(['owner', 'admin1']));
    });

    test('a call refused for being outside hours still notifies the business', async () => {
        mockStore.settings.callSettings.allowOutsideHours = false;
        mockStore.settings.whatsappAutomations = { offHoursMessage: { timezone: 'UTC', schedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, enabled: false })) } };
        await run();
        expect(pushToWorkspace.mock.calls[0][1].body).toMatch(/outside business hours/);
    });
});

describe('template rules', () => {
    test('variable counting and usability', () => {
        expect(elig.templateVariableCount('Hi {{1}} and {{2}}')).toBe(2);
        expect(elig.templateVariableCount('no vars')).toBe(0);
        expect(elig.templateVariableCount('Hi {{name}}')).toBe(-1);
        const base = { status: 'APPROVED', archetype: 'standard', headerType: 'NONE', category: 'UTILITY', content: 'Hi {{1}}' };
        expect(elig.templateUsable(base).ok).toBe(true);
        expect(elig.templateUsable({ ...base, status: 'PENDING' }).ok).toBe(false);
        expect(elig.templateUsable({ ...base, content: 'Hi {{1}} {{2}}' }).ok).toBe(false);
        expect(elig.templateUsable({ ...base, headerType: 'IMAGE' }).ok).toBe(false);
        expect(elig.templateUsable({ ...base, archetype: 'carousel' }).ok).toBe(false);
        expect(elig.templateUsable({ ...base, archetype: 'simple_text' }).ok).toBe(true);
        expect(elig.templateUsable({ ...base, archetype: 'quick_replies', buttons: [{ type: 'QUICK_REPLY', text: 'Yes' }] }).ok).toBe(true);
        expect(elig.templateUsable({ ...base, archetype: 'call_to_action', buttons: [{ type: 'URL', text: 'Open', url: 'https://x.com/{{1}}' }] }).ok).toBe(false);
        expect(elig.templateUsable({ ...base, category: 'AUTHENTICATION' }).ok).toBe(false);
    });

    test('24 h window', () => {
        const now = new Date('2026-11-16T12:00:00Z');
        expect(elig.isWindowOpen('2026-11-16T01:00:00Z', now)).toBe(true);
        expect(elig.isWindowOpen('2026-11-15T11:00:00Z', now)).toBe(false);
        expect(elig.isWindowOpen(null, now)).toBe(false);
    });
});

describe('call detail', () => {
    test('lists who was rung and who declined', async () => {
        mockStore.conv.assignedTo = 'agent1';
        await run();
        await CallService.decline(mockStore.calls[0], 'agent1', mockStore.settings);
        const rang = await CallService.rangMembers(mockStore.calls[0]);
        expect(rang.find((r) => r.id === 'agent1')).toMatchObject({ name: 'Agent', declined: true });
        expect(rang.find((r) => r.id === 'owner')).toMatchObject({ declined: false });
    });
});

describe('call events in the chat thread', () => {
    const miss = async () => { await run(); await run({ calls: [{ id: 'wacid1', event: 'terminate' }] }); };

    test('a missed call adds one event and updates the chat preview, not the 24 h window', async () => {
        const before = mockStore.conv.lastInboundMessageAt;
        await miss();
        expect(mockStore.messages).toHaveLength(1);
        expect(mockStore.messages[0]).toMatchObject({ type: 'call', direction: 'INBOUND', source: 'call', body: 'Missed voice call', conversationId: 'conv1' });
        expect(mockStore.conv.lastMessage).toBe('Missed voice call');
        expect(mockStore.conv.lastInboundMessageAt).toBe(before);
    });

    test('an answered call logs its duration, once', async () => {
        await run();
        await CallService.answer(mockStore.calls[0], { id: 'owner', name: 'Owner' }, 'v=0 answer', mockStore.settings);
        await run({ calls: [{ id: 'wacid1', event: 'terminate', duration: 134 }] });
        await CallService.logCallEvent(mockStore.calls[0]); // a second attempt must not duplicate
        expect(mockStore.messages).toHaveLength(1);
        expect(mockStore.messages[0].body).toBe('Voice call · 2:14');
    });

    test('calls refused for plan reasons are not added to the chat', async () => {
        mockStore.addon = false;
        await run();
        expect(mockStore.messages).toHaveLength(0);
    });

    test('calls refused outside business hours are', async () => {
        mockStore.settings.callSettings.allowOutsideHours = false;
        mockStore.settings.whatsappAutomations = { offHoursMessage: { timezone: 'UTC', schedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, enabled: false })) } };
        await run();
        expect(mockStore.messages[0].body).toBe('Voice call outside business hours');
    });
});

describe('callers with no phone number (S9)', () => {
    test('refused at Meta, recorded, no conversation created or merged, nobody rung', async () => {
        const before = mockStore.conv;
        await run({ calls: [{ id: 'hidden1', from: '', event: 'connect', direction: 'USER_INITIATED', session: { sdp: 'v=0' } }], contacts: [] });
        expect(mockStore.calls[0]).toMatchObject({ status: 'rejected', endReason: 'no_caller_id', phoneNumber: '', conversationId: null });
        expect(meta.rejectCall).toHaveBeenCalledWith(mockStore.settings, 'hidden1');
        expect(mockStore.conv).toBe(before);
        expect(push.pushIncomingCall).not.toHaveBeenCalled();
        expect(sendWhatsAppAndLog).not.toHaveBeenCalled();
    });
});

describe('keeping Meta calling in line with the add-on (S3)', () => {
    const withSave = () => Object.assign(mockStore.settings, { changed: jest.fn(), save: jest.fn(async () => {}) });

    test('add-on lapsed: calling switched off at Meta, owner choice kept, suspension recorded', async () => {
        withSave();
        mockStore.addonEnd = new Date(Date.now() - 60_000);
        const r = await CallService.reconcileAllCalling();
        expect(r).toEqual({ suspended: 1, restored: 0 });
        expect(meta.setCallingStatus).toHaveBeenCalledWith(mockStore.settings, false);
        expect(mockStore.settings.callSettings.enabled).toBe(true);
        expect(mockStore.settings.callSettings.suspended.reason).toBe('addon_required');
    });

    test('already suspended: not switched off again', async () => {
        withSave();
        mockStore.addon = false;
        mockStore.settings.callSettings.suspended = { reason: 'addon_required', at: 'x' };
        await CallService.reconcileAllCalling();
        expect(meta.setCallingStatus).not.toHaveBeenCalled();
    });

    test('add-on renewed: switched back on and the suspension cleared', async () => {
        withSave();
        mockStore.settings.callSettings.suspended = { reason: 'addon_required', at: 'x' };
        const r = await CallService.reconcileAllCalling();
        expect(r).toEqual({ suspended: 0, restored: 1 });
        expect(meta.setCallingStatus).toHaveBeenCalledWith(mockStore.settings, true);
        expect(mockStore.settings.callSettings.suspended).toBeUndefined();
    });

    test('messaging limit dropped below 2,000: switched off; unknown limit: left alone', async () => {
        withSave();
        mockStore.owner.metaTier = null;
        await CallService.reconcileAllCalling();
        expect(meta.setCallingStatus).not.toHaveBeenCalled();
        mockStore.owner.metaTier = 'TIER_1K';
        await CallService.reconcileAllCalling();
        expect(meta.setCallingStatus).toHaveBeenCalledWith(mockStore.settings, false);
        expect(mockStore.settings.callSettings.suspended.reason).toBe('not_eligible');
    });

    test('calling turned off by the owner: never touched', async () => {
        withSave();
        mockStore.addon = false;
        mockStore.settings.callSettings.enabled = false;
        await CallService.reconcileAllCalling();
        expect(meta.setCallingStatus).not.toHaveBeenCalled();
    });

    test('Meta refuses the change: nothing recorded, retried next run, never throws', async () => {
        withSave();
        mockStore.addon = false;
        meta.setCallingStatus.mockRejectedValueOnce(new Error('Meta down'));
        const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        await expect(CallService.reconcileAllCalling()).resolves.toEqual({ suspended: 0, restored: 0 });
        expect(mockStore.settings.callSettings.suspended).toBeUndefined();
        spy.mockRestore();
    });
});

describe('ringing screen follows phone privacy', () => {
    const { callerFor } = require('../services/CallService');
    const call = { phoneNumber: '919876543210', contactName: 'Asha' };

    test('owner and visible members get the full number', () => {
        expect(callerFor(call, 'visible')).toEqual({ id: '919876543210', displayName: 'Asha', phoneNumber: '+919876543210' });
    });

    test('masked members get the last 4 digits and no phone handle', () => {
        const c = callerFor({ ...call, contactName: 'Unknown' }, 'masked');
        expect(c).toEqual({ id: '****3210', displayName: '****3210' });
        expect(c.phoneNumber).toBeUndefined();
    });

    test('blurred members see the name only, never the number', () => {
        expect(callerFor(call, 'blurred')).toEqual({ id: 'WhatsApp caller', displayName: 'Asha' });
        expect(JSON.stringify(callerFor({ ...call, contactName: '919876543210' }, 'blurred'))).not.toMatch(/9876/);
    });
});
