/** Access tokens encrypted at rest (utils/secretBox.js) and the model fields that use it. */
const TOKEN = 'EAAGm0PX4ZCpsBAKZBexampletokenvalue1234567890';

const load = (key) => {
    jest.resetModules();
    if (key === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = key;
    return require('../utils/secretBox');
};

afterAll(() => { delete process.env.TOKEN_ENCRYPTION_KEY; });

test('without a key nothing changes: tokens stay plain text', () => {
    const box = load(undefined);
    expect(box.encryptSecret(TOKEN)).toBe(TOKEN);
    expect(box.decryptSecret(TOKEN)).toBe(TOKEN);
});

test('with a key, tokens are encrypted, round-trip, and use a fresh IV each time', () => {
    const box = load('a-long-test-key-for-tokens-0001');
    const a = box.encryptSecret(TOKEN);
    const b = box.encryptSecret(TOKEN);
    expect(a.startsWith('enc:v1:')).toBe(true);
    expect(a).not.toContain(TOKEN);
    expect(a).not.toBe(b);
    expect(box.decryptSecret(a)).toBe(TOKEN);
});

test('never double-encrypts, and passes empty values through', () => {
    const box = load('a-long-test-key-for-tokens-0001');
    const once = box.encryptSecret(TOKEN);
    expect(box.encryptSecret(once)).toBe(once);
    expect(box.encryptSecret('')).toBe('');
    expect(box.encryptSecret(null)).toBe(null);
});

test('legacy plain-text tokens still read correctly once a key is set', () => {
    const box = load('a-long-test-key-for-tokens-0001');
    expect(box.decryptSecret(TOKEN)).toBe(TOKEN);
});

test('a wrong key does not return garbage as a token: the stored value is kept unchanged', () => {
    const enc = load('a-long-test-key-for-tokens-0001').encryptSecret(TOKEN);
    const other = load('a-different-key-for-tokens-0002');
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(other.decryptSecret(enc)).toBe(enc); // preserved, so a later save cannot overwrite it
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
});

test('Settings.metaAccessToken and User.fbAccessToken are stored encrypted and read back plain', () => {
    load('a-long-test-key-for-tokens-0001');
    const Settings = require('../models/Settings');
    const User = require('../models/User');

    const s = Settings.build({ metaAccessToken: TOKEN });
    expect(s.getDataValue('metaAccessToken').startsWith('enc:v1:')).toBe(true);
    expect(s.metaAccessToken).toBe(TOKEN);
    expect(s.toJSON().metaAccessToken).toBe(TOKEN);

    const u = User.build({ email: 'x@y.com', fbAccessToken: TOKEN });
    expect(u.getDataValue('fbAccessToken').startsWith('enc:v1:')).toBe(true);
    expect(u.fbAccessToken).toBe(TOKEN);

    // Copying one into the other (as settings.js "auto-heal" does) stores a valid encrypted copy.
    s.metaAccessToken = u.fbAccessToken;
    expect(s.metaAccessToken).toBe(TOKEN);
});
