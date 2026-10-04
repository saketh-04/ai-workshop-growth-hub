import { generateDemoDataset, summarizeDataset } from '../../src/seed/demoDataset';
import { istDateKey } from '../../src/utils/istDate';
import { REFERRAL_CODE_REGEX } from '../../src/utils/referralCode';
import { canonicalEmail } from '../../src/utils/email';
import { evaluateReferral } from '../../src/services/referralRules';
import { registerSchema } from '../../src/validators/registration';

const NOW = new Date('2026-10-03T08:00:00Z');
const ds = generateDemoDataset({ now: NOW });
const countEvents = (t: string) => ds.events.filter((e) => e.eventType === t).length;

describe('demo dataset (simulated campaign)', () => {
  it('is deterministic for the same seed and date', () => {
    expect(JSON.stringify(generateDemoDataset({ now: NOW }))).toBe(JSON.stringify(ds));
  });
  it('has 100+ registrations, well below the 500 target', () => {
    expect(ds.users.length).toBeGreaterThanOrEqual(100);
    expect(ds.users.length).toBeLessThan(500);
    expect(ds.campaign.target).toBe(500);
  });
  it('has variety: many colleges, branches and channels', () => {
    const s = summarizeDataset(ds);
    expect(s.colleges).toBeGreaterThanOrEqual(8);
    expect(s.branches).toBeGreaterThanOrEqual(5);
    expect(Object.keys(s.byChannel).length).toBeGreaterThanOrEqual(5);
  });
  it('covers exactly 7 consecutive IST days ending yesterday, all in the past', () => {
    const days = new Set(ds.users.map((u) => istDateKey(u.createdAt)));
    expect([...days].sort()).toEqual(['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(ds.events.every((e) => e.timestamp.getTime() < NOW.getTime())).toBe(true);
    expect(ds.experimentEvents.every((e) => e.timestamp.getTime() < NOW.getTime())).toBe(true);
  });
  it('has unique emails, unique valid referral codes, and valid-looking registrations', () => {
    expect(new Set(ds.users.map((u) => u.email)).size).toBe(ds.users.length);
    expect(new Set(ds.users.map((u) => canonicalEmail(u.email))).size).toBe(ds.users.length);
    expect(new Set(ds.users.map((u) => u.referralCode)).size).toBe(ds.users.length);
    expect(ds.users.every((u) => REFERRAL_CODE_REGEX.test(u.referralCode))).toBe(true);
    for (const u of ds.users) {
      const ok = registerSchema.safeParse({ ...u, source: u.selfReported, utmSource: undefined });
      expect(ok.success, `${u.email}: ${JSON.stringify(!ok.success && ok.error.issues)}`).toBe(true);
    }
  });
  it('users are in strictly increasing creation order', () => {
    for (let i = 1; i < ds.users.length; i++) expect(ds.users[i].createdAt.getTime()).toBeGreaterThan(ds.users[i - 1].createdAt.getTime());
  });
  it('referral registrations are consistent: earlier referrer, never self, passes the Phase 1 rules', () => {
    const referred = ds.users.filter((u) => u.referredByKey !== null);
    expect(referred.length).toBeGreaterThan(10);
    for (const u of referred) {
      const r = ds.users[u.referredByKey as number];
      expect(r.createdAt.getTime()).toBeLessThan(u.createdAt.getTime());
      expect(u.channel).toBe('referral');
      expect(evaluateReferral({ code: r.referralCode, referrer: r, newEmail: u.email, alreadyReferred: false })).toEqual({ credited: true });
    }
  });
  it('referral registrations ramp up over the week and day 1 has none', () => {
    const s = summarizeDataset(ds);
    expect(s.perDay[0].referral).toBe(0);
    expect(s.perDay[6].referral).toBeGreaterThan(s.perDay[1].referral);
  });
  it('event counts match the registrations they describe', () => {
    expect(countEvents('registration_completed')).toBe(ds.users.length);
    expect(countEvents('referral_registration')).toBe(ds.users.filter((u) => u.referredByKey !== null).length);
  });
  it('funnel is monotonic: landing views >= starts >= completions', () => {
    expect(countEvents('landing_page_view')).toBeGreaterThanOrEqual(countEvents('registration_started'));
    expect(countEvents('registration_started')).toBeGreaterThanOrEqual(countEvents('registration_completed'));
  });
  it('referral clicks match per-user counters and are >= each referrer\'s referrals', () => {
    const clicks = new Map<number, number>();
    for (const e of ds.events) if (e.eventType === 'referral_link_clicked') clicks.set(e.userKey as number, (clicks.get(e.userKey as number) ?? 0) + 1);
    for (const u of ds.users) {
      expect(u.referralClicks).toBe(clicks.get(u.key) ?? 0);
      const referrals = ds.users.filter((x) => x.referredByKey === u.key).length;
      expect(u.referralClicks).toBeGreaterThanOrEqual(referrals);
    }
  });
  it('clicks happen between the referrer joining and the referral registering (or before campaign end)', () => {
    for (const e of ds.events.filter((x) => x.eventType === 'referral_link_clicked')) {
      expect(e.timestamp.getTime()).toBeGreaterThan(ds.users[e.userKey as number].createdAt.getTime() - 1);
      expect(e.timestamp.getTime()).toBeLessThanOrEqual(ds.campaign.endDate.getTime());
    }
  });
  it('only emits known analytics event types', () => {
    const known = new Set(['landing_page_view', 'registration_started', 'registration_completed', 'referral_link_clicked', 'referral_registration', 'share_clicked', 'ai_project_generated']);
    expect(ds.events.every((e) => known.has(e.eventType))).toBe(true);
  });
  it('includes the Registration CTA experiment with the two requested variants', () => {
    const cta = ds.experiments[0];
    expect(cta.name).toBe('Registration CTA');
    expect(cta.variants).toEqual([{ key: 'A', label: 'Register Now' }, { key: 'B', label: 'Build My AI Project' }]);
  });
  it('experiment funnels are consistent: conversions <= clicks <= impressions, and <= total registrations', () => {
    const n = (k: string, t: string) => ds.experimentEvents.filter((e) => e.experimentIndex === 0 && e.variantKey === k && e.eventType === t).length;
    for (const k of ['A', 'B']) {
      expect(n(k, 'conversion')).toBeLessThanOrEqual(n(k, 'click'));
      expect(n(k, 'click')).toBeLessThanOrEqual(n(k, 'impression'));
    }
    expect(n('A', 'conversion') + n('B', 'conversion')).toBeLessThanOrEqual(ds.users.length);
  });
  it('labels the campaign and experiment as simulated', () => {
    expect(ds.campaign.name).toContain('Simulated campaign data');
    expect(ds.experiments[0].description).toContain('Simulated campaign data');
  });
});
