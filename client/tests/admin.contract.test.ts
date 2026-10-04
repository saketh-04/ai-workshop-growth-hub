/**
 * CONTRACT TESTS for the admin client against the REAL Express app (in-process, random port).
 * No MongoDB: only routes that answer before touching the database are used (login, auth gate, validation).
 * Admin analytics/experiment *data* routes need a database and are not exercised here.
 */
import type { Server } from 'http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../server/src/app';
import { createAuthService, resolvePasswordHash } from '../../server/src/services/authService';
import { adminApi } from '../src/lib/adminApi';
import { clearToken, getToken, setToken } from '../src/lib/adminAuth';
import { ApiError, http } from '../src/lib/api';
import { buildExperimentPayload, mapExperimentIssues } from '../src/lib/adminData';

// Tiny in-memory Web Storage so the real adminAuth/storage modules run unmodified in Node.
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
(globalThis as unknown as { window: unknown }).window = { sessionStorage: mem(), localStorage: mem() };

let server: Server;
beforeAll(async () => {
  const passwordHash = await resolvePasswordHash({ ADMIN_PASSWORD: 'correct-horse-battery', ADMIN_PASSWORD_HASH: undefined });
  const auth = createAuthService({ adminEmail: 'admin@example.com', passwordHash, jwtSecret: 'x'.repeat(40), expiresIn: '1h' });
  const app = createApp({ auth, clientOrigin: 'http://localhost:5173', openaiModel: 'm', rateLimitEnabled: false });
  await new Promise<void>((res) => { server = app.listen(0, '127.0.0.1', res); });
  http.defaults.baseURL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => new Promise<void>((res) => server.close(() => res())));
beforeEach(() => clearToken());

describe('admin login flow', () => {
  it('login returns a JWT; once stored, /auth/me accepts it', async () => {
    const token = await adminApi.login('admin@example.com', 'correct-horse-battery');
    expect(token.split('.')).toHaveLength(3);
    setToken(token);
    expect(getToken()).toBe(token);
    await expect(adminApi.me()).resolves.toEqual({ admin: { email: 'admin@example.com' } });
  });
  it('wrong password -> ApiError 401 INVALID_CREDENTIALS', async () => {
    await expect(adminApi.login('admin@example.com', 'nope')).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });
  it('empty credentials -> 400 validation', async () => {
    await expect(adminApi.login('', '')).rejects.toBeInstanceOf(ApiError);
  });
  it('protected routes reject a missing token (401)', async () => {
    await expect(adminApi.experiments()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    await expect(adminApi.overview('all')).rejects.toMatchObject({ status: 401 });
  });
  it('a forged/expired token is rejected AND forgotten, so the route guard sends the admin to login', async () => {
    setToken('a.b.c');
    await expect(adminApi.me()).rejects.toMatchObject({ status: 401, code: 'INVALID_TOKEN' });
    expect(getToken()).toBeNull();
  });
});

describe('experiment admin calls (validation only, no DB)', () => {
  const form = { name: 'ab', hypothesis: '', description: '', labelA: 'A text', labelB: 'B text', status: 'draft' as const };
  it('server field errors map back onto the form', async () => {
    setToken(await adminApi.login('admin@example.com', 'correct-horse-battery'));
    const err = await adminApi.createExperiment(buildExperimentPayload(form)).catch((e) => e);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(mapExperimentIssues(err.details)).toHaveProperty('name');
  });
  it('start/stop rejects a malformed id before any database access', async () => {
    setToken(await adminApi.login('admin@example.com', 'correct-horse-battery'));
    await expect(adminApi.setExperimentStatus('not-an-id', 'running')).rejects.toMatchObject({ status: 400 });
  });
  it('start/stop requires auth', async () => {
    await expect(adminApi.setExperimentStatus('507f1f77bcf86cd799439011', 'running')).rejects.toMatchObject({ status: 401 });
  });
});
