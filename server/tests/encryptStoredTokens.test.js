/** Server-start encryption of plain-text access tokens (services/encryptStoredTokens.js). */
const TOKEN = 'EAAGm0PX4ZCpsBAKZBexampletokenvalue1234567890';

function fakeDb(rowsByTable) {
    const updates = [];
    return {
        updates,
        QueryTypes: { SELECT: 'SELECT' },
        query: async (sql, opts = {}) => {
            if (sql.startsWith('SELECT')) {
                const table = sql.match(/FROM "([^"]+)"/)[1];
                return (rowsByTable[table] || []).filter((r) => !r.v.startsWith('enc:v1:'));
            }
            updates.push({ sql, ...opts.replacements });
            return [];
        },
    };
}
const models = {
    Settings: { getTableName: () => 'Settings' },
    User: { getTableName: () => 'Users' },
};
const load = (key) => {
    jest.resetModules();
    if (key) process.env.TOKEN_ENCRYPTION_KEY = key; else delete process.env.TOKEN_ENCRYPTION_KEY;
    return { ...require('../services/encryptStoredTokens'), box: require('../utils/secretBox') };
};
afterAll(() => { delete process.env.TOKEN_ENCRYPTION_KEY; });

test('without a key it does nothing', async () => {
    const { encryptStoredTokens } = load(undefined);
    const db = fakeDb({ Settings: [{ id: 's1', v: TOKEN }] });
    const r = await encryptStoredTokens({ sequelize: db, models });
    expect(r.skipped).toBe(true);
    expect(db.updates).toHaveLength(0);
});

test('encrypts plain tokens in both tables, each write guarded by the old value', async () => {
    const { encryptStoredTokens, box } = load('a-long-test-key-for-tokens-0001');
    const db = fakeDb({ Settings: [{ id: 's1', v: TOKEN }], Users: [{ id: 'u1', v: TOKEN + 'x' }] });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const r = await encryptStoredTokens({ sequelize: db, models });
    log.mockRestore();
    expect(r).toEqual({ skipped: false, encrypted: 2, failed: 0 });
    for (const u of db.updates) {
        expect(u.sql).toMatch(/WHERE id = :id AND "\w+" = :v/);
        expect(u.next.startsWith('enc:v1:')).toBe(true);
        expect(box.decryptSecret(u.next)).toBe(u.v);
    }
});

test('already-encrypted tokens are left alone (restart is a no-op)', async () => {
    const { encryptStoredTokens, box } = load('a-long-test-key-for-tokens-0001');
    const db = fakeDb({ Settings: [{ id: 's1', v: box.encryptSecret(TOKEN) }] });
    const r = await encryptStoredTokens({ sequelize: db, models });
    expect(r.encrypted).toBe(0);
    expect(db.updates).toHaveLength(0);
});

test('a database error is logged, never thrown', async () => {
    const { encryptStoredTokens } = load('a-long-test-key-for-tokens-0001');
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const db = { QueryTypes: { SELECT: 'SELECT' }, query: async () => { throw new Error('db down'); } };
    await expect(encryptStoredTokens({ sequelize: db, models })).resolves.toMatchObject({ encrypted: 0, failed: 2 });
    err.mockRestore(); log.mockRestore();
});
