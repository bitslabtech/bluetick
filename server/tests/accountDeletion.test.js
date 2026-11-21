/** Owner self-deletion: 30-day grace, cancel, and the scheduled purge. */
const mockUsers = [];
const mockQueries = [];

jest.mock('../config/database', () => ({ sequelize: { query: async (sql) => { mockQueries.push(sql); } } }));
jest.mock('../models/User', () => ({
    findAll: async ({ where }) => mockUsers.filter((u) => {
        if (where.status === 'deleted') return u.status === 'deleted' && u.deletedAt && u.deletedAt <= where.deletedAt[require('sequelize').Op.lte];
        if (where.parentUserId !== undefined && where.parentUserId !== null) return u.parentUserId === where.parentUserId && u.status !== 'deleted';
        return u.parentUserId === null && !u.isAdmin && u.status !== 'deleted' && u.deletionScheduledFor && u.deletionScheduledFor <= new Date();
    }),
}));

const AccountDeletion = require('../services/AccountDeletion');

const user = (over = {}) => ({
    id: 'u', parentUserId: null, isAdmin: false, status: 'active', deletionScheduledFor: null, email: 'o@x.com',
    save: jest.fn(async () => {}), ...over,
});

beforeEach(() => { mockUsers.length = 0; mockQueries.length = 0; });

test('request schedules deletion 30 days out; cancel clears it', async () => {
    const u = user();
    const when = await AccountDeletion.requestDeletion(u);
    const days = (when - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
    expect(u.deletionScheduledFor).toBe(when);
    await AccountDeletion.cancelDeletion(u);
    expect(u.deletionScheduledFor).toBeNull();
});

test('due owners are purged with their team; future ones are left alone', async () => {
    const due = user({ id: 'owner1', deletionScheduledFor: new Date(Date.now() - 1000) });
    const later = user({ id: 'owner2', deletionScheduledFor: new Date(Date.now() + 86400000) });
    const member = user({ id: 'm1', parentUserId: 'owner1' });
    mockUsers.push(due, later, member);

    const n = await AccountDeletion.runDueDeletions();

    expect(n).toBe(1);
    expect(due.status).toBe('deleted');
    expect(due.password).toMatch(/^\$DELETED\$/);
    expect(due.deletionScheduledFor).toBeNull();
    expect(member.status).toBe('deleted');
    expect(later.status).toBe('active');
    expect(mockQueries.some((q) => q.includes('ChatMessages'))).toBe(true);
});

test('deletion keeps delivery logs but strips their content, and keeps the campaign rows they hang off', async () => {
    const due = user({ id: 'owner3', deletionScheduledFor: new Date(Date.now() - 1000) });
    mockUsers.push(due);
    await AccountDeletion.runDueDeletions();
    const strip = mockQueries.findIndex((q) => q.startsWith('UPDATE "MessageLogs" SET "inboxPayload" = NULL'));
    expect(strip).toBeGreaterThanOrEqual(0);
    expect(mockQueries.some((q) => q.startsWith('UPDATE "Messages" SET "targetConfig"'))).toBe(true);
    expect(mockQueries.some((q) => q.startsWith('DELETE FROM "MessageLogs"') || q.startsWith('DELETE FROM "Messages"'))).toBe(false);
});

test('kept delivery logs are purged only for accounts deleted more than 180 days ago', async () => {
    const day = 86400000;
    mockUsers.push(
        user({ id: 'old', status: 'deleted', deletedAt: new Date(Date.now() - 181 * day) }),
        user({ id: 'recent', status: 'deleted', deletedAt: new Date(Date.now() - 10 * day) }),
        user({ id: 'live', status: 'active' }),
    );
    const n = await AccountDeletion.purgeExpiredLogs();
    expect(n).toBe(1);
    expect(AccountDeletion.LOG_RETENTION_DAYS).toBe(180);
    expect(mockQueries.filter((q) => q.startsWith('DELETE FROM "MessageLogs"'))).toHaveLength(1);
    expect(mockQueries.filter((q) => q.startsWith('DELETE FROM "Messages"'))).toHaveLength(1);
});
