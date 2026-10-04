import { CLIENT_EVENT_TYPES, EVENT_TYPES, datasetQuerySchema, trackEventSchema } from '../../src/validators/analytics';
import { createExperimentSchema, experimentEventSchema, updateExperimentStatusSchema } from '../../src/validators/experiment';

describe('event registry', () => {
  it('contains all 9 required events', () => expect([...EVENT_TYPES].sort()).toEqual([
    'ai_project_generated', 'experiment_conversion', 'experiment_impression', 'landing_page_view', 'referral_link_clicked',
    'referral_registration', 'registration_completed', 'registration_started', 'share_clicked',
  ]));
  it('client-reportable events are a subset; server-only events are excluded', () => {
    for (const t of CLIENT_EVENT_TYPES) expect(EVENT_TYPES).toContain(t);
    for (const t of ['registration_completed', 'referral_registration', 'experiment_conversion']) expect(CLIENT_EVENT_TYPES).not.toContain(t);
  });
});

describe('trackEventSchema', () => {
  it('accepts a minimal event and a rich one', () => {
    expect(trackEventSchema.safeParse({ eventType: 'landing_page_view' }).success).toBe(true);
    expect(trackEventSchema.safeParse({ eventType: 'share_clicked', userId: '507f1f77bcf86cd799439011', source: 'WhatsApp', metadata: { channel: 'whatsapp', n: 2, ok: true } }).success).toBe(true);
  });
  it('normalises source', () => expect(trackEventSchema.parse({ eventType: 'landing_page_view', source: 'College Club' }).source).toBe('college_club'));
  it.each([
    ['unknown event', { eventType: 'hack' }],
    ['server-only event', { eventType: 'registration_completed' }],
    ['bad userId', { eventType: 'share_clicked', userId: 'nope' }],
    ['operator key in metadata', { eventType: 'share_clicked', metadata: { $where: 'x' } }],
    ['dotted key in metadata', { eventType: 'share_clicked', metadata: { 'a.b': 'x' } }],
    ['nested object in metadata', { eventType: 'share_clicked', metadata: { a: { b: 1 } } }],
    ['too many metadata keys', { eventType: 'share_clicked', metadata: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, i])) }],
    ['operator object as userId', { eventType: 'share_clicked', userId: { $ne: null } }],
  ])('rejects %s', (_l, body) => expect(trackEventSchema.safeParse(body).success).toBe(false));
});

describe('datasetQuerySchema', () => {
  it('defaults to "all"', () => expect(datasetQuerySchema.parse({}).dataset).toBe('all'));
  it('rejects unknown values and operator objects', () => {
    expect(datasetQuerySchema.safeParse({ dataset: 'everything' }).success).toBe(false);
    expect(datasetQuerySchema.safeParse({ dataset: { $ne: 'x' } }).success).toBe(false);
  });
});

describe('createExperimentSchema', () => {
  const ok = { name: 'Registration CTA', variants: [{ key: 'A', label: 'Register Now' }, { key: 'B', label: 'Build My AI Project' }] };
  it('accepts the CTA example and applies defaults', () => {
    const out = createExperimentSchema.parse(ok);
    expect(out.status).toBe('draft');
    expect(out.hypothesis).toBe('');
  });
  it('coerces ISO dates and treats blank dates as missing', () => {
    expect(createExperimentSchema.parse({ ...ok, startDate: '2026-10-01', endDate: '' }).startDate).toBeInstanceOf(Date);
  });
  it.each([
    ['one variant', { variants: [{ key: 'A', label: 'x' }] }],
    ['duplicate keys', { variants: [{ key: 'A', label: 'x' }, { key: 'A', label: 'y' }] }],
    ['bad key characters', { variants: [{ key: '$A', label: 'x' }, { key: 'B', label: 'y' }] }],
    ['short name', { name: 'ab' }],
    ['bad status', { status: 'live' }],
    ['end before start', { startDate: '2026-10-05', endDate: '2026-10-01' }],
    ['garbage date', { startDate: 'tomorrow-ish' }],
  ])('rejects %s', (_l, patch) => expect(createExperimentSchema.safeParse({ ...ok, ...patch }).success).toBe(false));
});

describe('experimentEventSchema', () => {
  it('accepts impression / click / conversion', () => {
    for (const t of ['impression', 'click', 'conversion']) expect(experimentEventSchema.safeParse({ variantKey: 'A', eventType: t }).success).toBe(true);
  });
  it('rejects unknown types and bad keys', () => {
    expect(experimentEventSchema.safeParse({ variantKey: 'A', eventType: 'purchase' }).success).toBe(false);
    expect(experimentEventSchema.safeParse({ variantKey: { $ne: 1 }, eventType: 'click' }).success).toBe(false);
  });
});

describe('updateExperimentStatusSchema', () => {
  it('accepts running and completed', () => { for (const status of ['running', 'completed']) expect(updateExperimentStatusSchema.safeParse({ status }).success).toBe(true); });
  it('rejects draft, unknown values and objects', () => { for (const status of ['draft', 'live', { $ne: 1 }]) expect(updateExperimentStatusSchema.safeParse({ status }).success).toBe(false); });
});
