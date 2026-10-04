import { loadEnv } from '../../src/config/env';

const good = { MONGODB_URI: 'mongodb://x/y', JWT_SECRET: 'x'.repeat(32), ADMIN_EMAIL: 'a@b.co', ADMIN_PASSWORD: 'longenough1' };

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(good);
    expect(env.PORT).toBe(5000);
    expect(env.OPENAI_API_KEY).toBeUndefined();
  });
  it('treats an empty OPENAI_API_KEY as unset (fallback mode)', () =>
    expect(loadEnv({ ...good, OPENAI_API_KEY: '' }).OPENAI_API_KEY).toBeUndefined());
  it('rejects a short JWT secret', () => expect(() => loadEnv({ ...good, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/));
  it('requires MONGODB_URI', () => expect(() => loadEnv({ ...good, MONGODB_URI: '' })).toThrow(/MONGODB_URI/));
  it('requires an admin password or hash', () =>
    expect(() => loadEnv({ ...good, ADMIN_PASSWORD: undefined })).toThrow(/ADMIN_PASSWORD/));
});
