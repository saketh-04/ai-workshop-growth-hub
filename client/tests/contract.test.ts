/**
 * CONTRACT TESTS: the client's real `api` module talks to the real Express app (started in-process on a
 * random port). No MongoDB: only endpoints that never touch the database are exercised, which is enough to
 * check request shapes, response shapes and error normalisation end to end across the HTTP boundary.
 */
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../server/src/app';
import { createAuthService } from '../../server/src/services/authService';
import { ApiError, api, http, toApiError } from '../src/lib/api';
import { mapServerIssues } from '../src/lib/validation';

let server: Server;
beforeAll(async () => {
  const auth = createAuthService({ adminEmail: 'a@b.co', passwordHash: 'not-used-no-login-in-these-tests', jwtSecret: 'x'.repeat(40), expiresIn: '1h' });
  const app = createApp({ auth, clientOrigin: 'http://localhost:5173', openaiModel: 'm', rateLimitEnabled: false });
  await new Promise<void>((res) => { server = app.listen(0, '127.0.0.1', res); });
  const { port } = server.address() as { port: number };
  http.defaults.baseURL = `http://127.0.0.1:${port}`;
});
afterAll(() => new Promise<void>((res) => server.close(() => res())));

describe('client <-> server contract (no database)', () => {
  it('AI project idea: every category returns a valid idea whose plan is exactly 60 minutes (fallback mode)', async () => {
    for (const c of ['productivity', 'education', 'healthcare', 'finance', 'career', 'other'] as const) {
      const r = await api.projectIdea(c);
      expect(r.source).toBe('fallback');
      expect(r.idea.title.length).toBeGreaterThan(2);
      expect(['Beginner', 'Intermediate']).toContain(r.idea.difficulty);
      expect(r.idea.outline.reduce((s, o) => s + o.minutes, 0)).toBe(60);
    }
  });
  it('analytics event intake accepts the client events', async () => {
    await expect(api.event({ eventType: 'landing_page_view', source: 'whatsapp' })).resolves.toBeUndefined();
    await expect(api.event({ eventType: 'share_clicked', metadata: { channel: 'whatsapp' } })).resolves.toBeUndefined();
  });
  it('registration validation errors become field-level issues the form can show', async () => {
    const err = await api.register({ name: 'P', email: 'bad', college: 'X', branch: 'CSE', graduationYear: 2027, source: 'other' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    const fields = mapServerIssues(err.details);
    expect(fields.email).toBeTruthy();
    expect(fields.name).toBeTruthy();
  });
  it('malformed referral code -> 400 ApiError', async () => {
    await expect(api.trackReferralClick('$$')).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  });
  it('admin-only data is not readable from the public client (401)', async () => {
    await expect(http.get('/api/experiments')).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });
  it('unknown API route -> NOT_FOUND ApiError', async () => {
    await expect(http.get('/api/nope')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('toApiError', () => {
  it('turns a network failure into a friendly message', async () => {
    const prev = http.defaults.baseURL;
    http.defaults.baseURL = 'http://127.0.0.1:1'; // nothing listens here
    const err = await api.leaderboard().catch((e) => e);
    http.defaults.baseURL = prev;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NETWORK');
    expect(err.message).toMatch(/can't reach the server/i);
  });
  it('passes ApiError through and wraps unknown errors', () => {
    const e = new ApiError(409, 'X', 'm');
    expect(toApiError(e)).toBe(e);
    expect(toApiError('boom')).toMatchObject({ code: 'UNKNOWN' });
  });
});
