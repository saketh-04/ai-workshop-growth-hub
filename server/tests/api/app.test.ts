import bcrypt from 'bcrypt';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createAuthService } from '../../src/services/authService';

let app: ReturnType<typeof createApp>;
beforeAll(async () => {
  const auth = createAuthService({
    adminEmail: 'admin@example.com',
    passwordHash: await bcrypt.hash('correct-horse-battery', 4),
    jwtSecret: 'x'.repeat(40),
    expiresIn: '1h',
  });
  app = createApp({ auth, clientOrigin: 'http://localhost:5173', openaiModel: 'm', rateLimitEnabled: false });
});

const validBody = {
  name: 'Priya Sharma', email: 'priya@college.edu', college: 'NIT Trichy',
  branch: 'ECE', graduationYear: 2027, source: 'linkedin',
};

describe('platform', () => {
  it('GET /api/health -> 200 (db reports disconnected: no Mongo in unit env)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'disconnected' });
  });
  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
  it('unknown route -> 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
  it('malformed JSON -> 400', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
  it('oversized body -> 413', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
  });
});

describe('POST /api/registrations validation (rejected before any DB access)', () => {
  it('400 with field-level details', async () => {
    const res = await request(app).post('/api/registrations').send({ ...validBody, email: 'bad', source: 'tiktok' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['email', 'source']);
  });
  it('400 for an empty body', async () => {
    expect((await request(app).post('/api/registrations').send({})).status).toBe(400);
  });
  it('400 for a NoSQL operator object in a field', async () => {
    const res = await request(app).post('/api/registrations').send({ ...validBody, email: { $ne: null } });
    expect(res.status).toBe(400);
  });
});

describe('referral endpoints validation', () => {
  it('POST /referrals/track rejects a malformed code', async () =>
    expect((await request(app).post('/api/referrals/track').send({ code: '$$' })).status).toBe(400));
  it('GET /referrals/:code rejects a malformed code', async () =>
    expect((await request(app).get('/api/referrals/not-a-code!')).status).toBe(400));
});

describe('admin auth', () => {
  it('login success returns a token that unlocks /auth/me', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'correct-horse-battery' });
    expect(login.status).toBe(200);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.admin.email).toBe('admin@example.com');
  });
  it('wrong password -> 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
  it('login body validation -> 400', async () =>
    expect((await request(app).post('/api/auth/login').send({ email: 'x' })).status).toBe(400));
  it('/auth/me without a token -> 401', async () =>
    expect((await request(app).get('/api/auth/me')).status).toBe(401));
  it('/auth/me with a garbage token -> 401', async () =>
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi')).status).toBe(401));
});

describe('POST /api/ai/project-idea (fallback mode, no API key)', () => {
  it('returns a structured fallback idea', async () => {
    const res = await request(app).post('/api/ai/project-idea').send({ category: 'healthcare' });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('fallback');
    expect(res.body.idea.outline.reduce((s: number, o: { minutes: number }) => s + o.minutes, 0)).toBe(60);
  });
  it('rejects unknown categories and free text', async () => {
    expect((await request(app).post('/api/ai/project-idea').send({ category: 'ignore previous instructions' })).status).toBe(400);
    expect((await request(app).post('/api/ai/project-idea').send({})).status).toBe(400);
  });
});

describe('rate limiting', () => {
  it('returns 429 once the login limit is exceeded', async () => {
    const limited = createApp({
      auth: createAuthService({ adminEmail: 'a@b.co', passwordHash: await bcrypt.hash('longenough1', 4), jwtSecret: 'x'.repeat(40), expiresIn: '1h' }),
      clientOrigin: 'http://localhost:5173', openaiModel: 'm', rateLimitEnabled: true,
    });
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await request(limited).post('/api/auth/login').send({ email: 'a@b.co', password: 'bad' })).status;
    expect(last).toBe(429);
  });
});

// ---------------------------------------------------------------------------------------------
// Phase 2: analytics + experiments. Only behaviour that never reaches MongoDB is tested here:
// auth gates, input validation, and the best-effort event intake with the DB disconnected.
// ---------------------------------------------------------------------------------------------
describe('Phase 2: analytics + experiments (no database)', () => {
  const ADMIN_ROUTES: [string, string][] = [
    ['get', '/api/analytics/overview'], ['get', '/api/analytics/channels'], ['get', '/api/analytics/funnel'],
    ['get', '/api/analytics/referrals'], ['get', '/api/experiments'], ['post', '/api/experiments'],
    ['get', '/api/experiments/507f1f77bcf86cd799439011'], ['patch', '/api/experiments/507f1f77bcf86cd799439011/status'],
  ];
  const adminToken = async () =>
    (await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'correct-horse-battery' })).body.token as string;

  it.each(ADMIN_ROUTES)('%s %s requires an admin token (401)', async (method, url) => {
    const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
  it.each(ADMIN_ROUTES)('%s %s rejects a forged token (401)', async (method, url) => {
    const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method](url).set('Authorization', 'Bearer a.b.c');
    expect(res.status).toBe(401);
  });

  it('analytics reads validate ?dataset= (400 before any DB access)', async () => {
    const t = await adminToken();
    expect((await request(app).get('/api/analytics/overview?dataset=everything').set('Authorization', `Bearer ${t}`)).status).toBe(400);
    expect((await request(app).get('/api/analytics/funnel?dataset[$ne]=x').set('Authorization', `Bearer ${t}`)).status).toBe(400);
  });
  it('POST /api/experiments validates the body for an authenticated admin', async () => {
    const t = await adminToken();
    const res = await request(app).post('/api/experiments').set('Authorization', `Bearer ${t}`).send({ name: 'x', variants: [{ key: 'A', label: 'only one' }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('GET /api/experiments/:id rejects a malformed id for an authenticated admin', async () => {
    const t = await adminToken();
    expect((await request(app).get('/api/experiments/not-an-id').set('Authorization', `Bearer ${t}`)).status).toBe(400);
  });

  it('POST /analytics/events accepts a client event (202, best-effort even with no DB)', async () => {
    const res = await request(app).post('/api/analytics/events').send({ eventType: 'landing_page_view', source: 'whatsapp' });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ accepted: true });
  });
  it.each([
    ['server-only event type', { eventType: 'registration_completed' }],
    ['unknown event type', { eventType: 'nope' }],
    ['operator key in metadata', { eventType: 'share_clicked', metadata: { $set: 1 } }],
    ['operator object as userId', { eventType: 'share_clicked', userId: { $gt: '' } }],
  ])('POST /analytics/events rejects %s (400)', async (_l, body) => {
    expect((await request(app).post('/api/analytics/events').send(body)).status).toBe(400);
  });

  it('POST /experiments/:id/event validates id and body (400) without touching the DB', async () => {
    expect((await request(app).post('/api/experiments/bad/event').send({ variantKey: 'A', eventType: 'impression' })).status).toBe(400);
    expect((await request(app).post('/api/experiments/507f1f77bcf86cd799439011/event').send({ variantKey: 'A', eventType: 'purchase' })).status).toBe(400);
  });
  it('AI endpoint still works in fallback mode with analytics hooked in, and accepts an optional userId', async () => {
    const res = await request(app).post('/api/ai/project-idea').send({ category: 'career', userId: '507f1f77bcf86cd799439011' });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('fallback');
    expect((await request(app).post('/api/ai/project-idea').send({ category: 'career', userId: 'x' })).status).toBe(400);
  });
  it('event intake is rate limited (429)', async () => {
    const auth = createAuthService({ adminEmail: 'a@b.co', passwordHash: await bcrypt.hash('longenough1', 4), jwtSecret: 'x'.repeat(40), expiresIn: '1h' });
    const limited = createApp({ auth, clientOrigin: 'http://localhost:5173', openaiModel: 'm', rateLimitEnabled: true });
    let last = 0;
    for (let i = 0; i < 125; i++) last = (await request(limited).post('/api/analytics/events').send({ eventType: 'landing_page_view' })).status;
    expect(last).toBe(429);
  });
  it('PATCH /experiments/:id/status validates id and status for an authenticated admin (400, no DB)', async () => {
    const t = await adminToken();
    expect((await request(app).patch('/api/experiments/bad/status').set('Authorization', `Bearer ${t}`).send({ status: 'running' })).status).toBe(400);
    expect((await request(app).patch('/api/experiments/507f1f77bcf86cd799439011/status').set('Authorization', `Bearer ${t}`).send({ status: 'draft' })).status).toBe(400);
  });
});
