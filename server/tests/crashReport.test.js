/** Crash reports (web + mobile) land in the superadmin error bell; long text is cut to fit. */
const created = [];
jest.mock('../models/AdminNotification', () => ({
    findOne: async () => null,
    create: async (row) => { created.push(row); return row; },
}));
jest.mock('../middleware/auth', () => (req, res, next) => next());
jest.mock('../middleware/admin', () => (req, res, next) => next());

const router = require('../routes/adminNotifications');
const handler = router.stack.find((l) => l.route?.path === '/public/crash-report').route.stack[0].handle;

const call = (body) => new Promise((resolve) => {
    const res = { status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code || 200, body: b }); } };
    handler({ body }, res);
});

beforeEach(() => { created.length = 0; });

test('mobile crash is stored with device info in url', async () => {
    const r = await call({ message: '[Mobile] TypeError: x is undefined', stack: 'at Foo', url: 'app://android 34 · v1.0.0 · Chat', userId: 'u1' });
    expect(r.code).toBe(200);
    expect(created[0]).toMatchObject({ type: 'SYSTEM_ERROR', message: '[Mobile] TypeError: x is undefined' });
    expect(created[0].data).toMatchObject({ url: 'app://android 34 · v1.0.0 · Chat', userId: 'u1', occurrences: 1 });
});

test('very long messages and stacks are cut instead of failing', async () => {
    await call({ message: 'x'.repeat(1000), stack: 'y'.repeat(20000) });
    expect(created[0].message.length).toBe(250);
    expect(created[0].data.stack.length).toBe(8000);
});

test('missing message is rejected', async () => {
    const r = await call({});
    expect(r.code).toBe(400);
});
