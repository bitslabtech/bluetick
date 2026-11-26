/** Connecting WhatsApp or Meta Ads needs the Meta terms consent, and the consent is recorded. */
const logged = [];
jest.mock('../utils/logger', () => async (req, action, details) => { logged.push({ userId: req.user?.id, action, details }); });
jest.mock('../middleware/auth', () => (req, res, next) => next());
jest.mock('../models/User', () => ({ findByPk: jest.fn() }));
jest.mock('../models/Contact', () => ({}));
jest.mock('../models/ChatMessage', () => ({}));
jest.mock('../services/outbound', () => ({}));
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));

const axios = require('axios');
const { hasMetaConsent, recordMetaConsent, consentDetails, TERMS_SHOWN, ACTION } = require('../utils/metaConsent');

const handlerOf = (router, path) => router.stack.find((l) => l.route?.path === path && l.route.methods.post).route.stack.at(-1).handle;
const call = (handler, body, user = { id: 'owner-1' }) => new Promise((resolve) => {
    const res = { status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code || 200, body: b }); } };
    handler({ body, user, headers: {} }, res);
});

beforeEach(() => { logged.length = 0; jest.clearAllMocks(); });

test('consent counts only when accepted is exactly true', () => {
    expect(hasMetaConsent({ consent: { accepted: true } })).toBe(true);
    for (const body of [{}, undefined, { consent: {} }, { consent: { accepted: 'true' } }, { consent: true }]) {
        expect(hasMetaConsent(body)).toBe(false);
    }
});

test('WhatsApp connect without consent is refused before anything is sent to Meta', async () => {
    const r = await call(handlerOf(require('../routes/whatsappAuth'), '/exchange-token'), { code: 'AQabc' });
    expect(r.code).toBe(400);
    expect(r.body.code).toBe('META_CONSENT_REQUIRED');
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
});

test('Meta Ads connect without consent is refused before anything is sent to Meta', async () => {
    const r = await call(handlerOf(require('../routes/ctwa'), '/auth'), { accessToken: 'EAAtoken' });
    expect(r.code).toBe(400);
    expect(r.body.code).toBe('META_CONSENT_REQUIRED');
    expect(axios.get).not.toHaveBeenCalled();
});

test('a team member consenting is recorded under the workspace with their own id', async () => {
    const req = { user: { id: 'owner-1', realId: 'member-7', parentUserId: 'owner-1' }, headers: { 'user-agent': 'Brave' } };
    await recordMetaConsent(req, 'meta_ads');
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ userId: 'owner-1', action: ACTION });
    expect(logged[0].details).toMatch(/^Team member agreed to Meta's terms and connected Meta Ads\./);
    const record = JSON.parse(logged[0].details.slice(logged[0].details.indexOf('{')));
    expect(record).toMatchObject({ product: 'meta_ads', userId: 'member-7', accountOwnerId: 'owner-1', isTeamMember: true, userAgent: 'Brave', termsShown: TERMS_SHOWN.meta_ads });
});

test('the owner consenting to WhatsApp lists the WhatsApp terms shown', () => {
    const details = consentDetails({ user: { id: 'owner-1' }, headers: {} }, 'whatsapp');
    expect(details).toMatch(/^Account owner agreed to Meta's terms and connected WhatsApp Business\./);
    const record = JSON.parse(details.slice(details.indexOf('{')));
    expect(record).toMatchObject({ userId: 'owner-1', accountOwnerId: 'owner-1', isTeamMember: false, termsShown: TERMS_SHOWN.whatsapp });
});
