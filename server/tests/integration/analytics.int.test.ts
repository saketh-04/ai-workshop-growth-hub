/**
 * DATABASE-DEPENDENT tests (need a real MongoDB). Skipped unless MONGODB_URI_TEST is set.
 * They DROP the target database. Nothing here has been executed in the authoring sandbox.
 */
import mongoose from 'mongoose';
import { AnalyticsEvent } from '../../src/models/AnalyticsEvent';
import { Experiment } from '../../src/models/Experiment';
import { Referral } from '../../src/models/Referral';
import { Registration } from '../../src/models/Registration';
import { User } from '../../src/models/User';
import { generateDemoDataset } from '../../src/seed/demoDataset';
import { persistDemoDataset } from '../../src/seed/persist';
import { getChannels, getFunnel, getOverview, getReferralAnalytics, recordEvent } from '../../src/services/analyticsService';
import { createExperiment, getExperiment, listExperiments, recordExperimentEvent } from '../../src/services/experimentService';
import { getLeaderboard } from '../../src/services/leaderboardService';
import { registerStudent } from '../../src/services/registrationService';
import { registerSchema } from '../../src/validators/registration';

const URI = process.env.MONGODB_URI_TEST;
const ds = generateDemoDataset();

describe.skipIf(!URI)('seed + analytics + experiments (real MongoDB)', () => {
  beforeAll(async () => { await mongoose.connect(URI as string); });
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    await Promise.all([User.init(), Registration.init(), Referral.init()]);
    await persistDemoDataset(ds);
  });
  afterAll(async () => { await mongoose.disconnect(); });

  describe('seed', () => {
    it('inserts the full dataset', async () => {
      expect(await User.countDocuments({ isDemo: true })).toBe(ds.users.length);
      expect(await Registration.countDocuments({ isDemo: true })).toBe(ds.users.length);
      expect(await Referral.countDocuments({ isDemo: true })).toBe(ds.users.filter((u) => u.referredByKey !== null).length);
      expect(await AnalyticsEvent.countDocuments({ isDemo: true })).toBe(ds.events.length);
      expect(await Experiment.countDocuments({ isSimulated: true })).toBe(ds.experiments.length);
    });
    it('preserves the campaign-day createdAt values (not "now")', async () => {
      const first = await User.findOne({ isDemo: true }).sort({ createdAt: 1 }).lean();
      expect(first?.createdAt.getTime()).toBe(ds.users[0].createdAt.getTime());
    });
    it('is idempotent: seeding twice does not duplicate anything', async () => {
      await persistDemoDataset(ds);
      expect(await User.countDocuments()).toBe(ds.users.length);
      expect(await Experiment.countDocuments()).toBe(ds.experiments.length);
    });
    it('never deletes real (non-demo) records when re-seeding', async () => {
      const real = await registerStudent(registerSchema.parse({ name: 'Real Student', email: 'real@college.edu', college: 'XX', branch: 'CSE', graduationYear: 2027, source: 'other' }));
      await persistDemoDataset(ds);
      expect(await User.exists({ _id: real.user.id })).toBeTruthy();
    });
  });

  describe('analytics (computed from the database)', () => {
    it('overview: totals, progress and a 7-day series that adds up', async () => {
      const o = await getOverview('all');
      expect(o.totals.registrations).toBe(ds.users.length);
      expect(o.totals.target).toBe(500);
      expect(o.totals.progressPercent).toBeCloseTo((ds.users.length / 500) * 100, 0);
      expect(o.meta.label).toBe('Simulated campaign data');
      expect(o.daily).toHaveLength(7);
      expect(o.daily.reduce((s, d) => s + d.registrations, 0)).toBe(ds.users.length);
      expect(o.daily[6].cumulative).toBe(ds.users.length);
      expect(o.totals.referralRegistrations).toBe(ds.users.filter((u) => u.referredByKey !== null).length);
    });
    it('dataset switch: "real" excludes seeded data and carries no simulated label', async () => {
      const real = await getOverview('real');
      expect(real.totals.registrations).toBe(0);
      expect(real.meta.label).toBeNull();
    });
    it('channels: source/medium/campaign each sum to total registrations', async () => {
      const c = await getChannels('all');
      for (const group of [c.bySource, c.byMedium, c.byCampaign]) expect(group.reduce((s, r) => s + r.registrations, 0)).toBe(ds.users.length);
      expect(c.bySource.find((s) => s.name === 'whatsapp')?.conversionRate).toBeGreaterThan(0);
    });
    it('funnel: monotonic and matches the dataset', async () => {
      const f = await getFunnel('all');
      const [views, starts, regs] = f.steps;
      expect(views.count).toBeGreaterThanOrEqual(starts.count);
      expect(starts.count).toBeGreaterThanOrEqual(regs.count);
      expect(regs.count).toBe(ds.users.length);
    });
    it('referrals: clicks, successes, conversion and top referrers match the dataset', async () => {
      const r = await getReferralAnalytics('all');
      expect(r.totalClicks).toBe(ds.users.reduce((s, u) => s + u.referralClicks, 0));
      expect(r.successfulReferrals).toBe(ds.users.filter((u) => u.referredByKey !== null).length);
      expect(r.topReferrers.length).toBeGreaterThan(0);
      expect(r.topReferrers[0].referrals).toBeGreaterThanOrEqual(r.topReferrers[r.topReferrers.length - 1].referrals);
    });
    it('leaderboard works on seeded referrals', async () => {
      const board = await getLeaderboard(10);
      expect(board[0].rank).toBe(1);
      expect(board[0].successfulReferrals).toBeGreaterThanOrEqual(board[1].successfulReferrals);
    });
    it('registering a student emits registration_completed (and referral_registration when credited)', async () => {
      const a = await registerStudent(registerSchema.parse({ name: 'Anita Rao', email: 'anita@college.edu', college: 'XX', branch: 'CSE', graduationYear: 2027, source: 'other' }));
      await registerStudent(registerSchema.parse({ name: 'Bala K', email: 'bala@college.edu', college: 'XX', branch: 'CSE', graduationYear: 2027, source: 'other', referralCode: a.user.referralCode }));
      expect(await AnalyticsEvent.countDocuments({ eventType: 'registration_completed', isDemo: { $ne: true } })).toBe(2);
      expect(await AnalyticsEvent.countDocuments({ eventType: 'referral_registration', isDemo: { $ne: true } })).toBe(1);
    });
    it('recordEvent stores an event when connected', async () => {
      expect(await recordEvent({ eventType: 'share_clicked', metadata: { channel: 'whatsapp' } })).toBe(true);
    });
  });

  describe('experiments', () => {
    it('lists the seeded Registration CTA with per-variant stats and a "simulated" readout (no winner)', async () => {
      const all = await listExperiments();
      const cta = all.find((e) => e.name === 'Registration CTA');
      expect(cta?.label).toBe('Simulated campaign data');
      expect(cta?.variants.map((v) => v.label)).toEqual(['Register Now', 'Build My AI Project']);
      expect(cta?.variants[0].impressions).toBe(420);
      expect(cta?.readout.verdict).toBe('simulated');
      expect(cta?.readout).not.toHaveProperty('leader');
    });
    it('create -> record events -> stats update; real data starts at "insufficient_data"', async () => {
      const created = await createExperiment({ name: 'Live CTA test', hypothesis: '', description: '', status: 'running', variants: [{ key: 'A', label: 'a' }, { key: 'B', label: 'b' }] });
      expect(created.readout.verdict).toBe('insufficient_data');
      await recordExperimentEvent(created.id, { variantKey: 'A', eventType: 'impression' });
      await recordExperimentEvent(created.id, { variantKey: 'A', eventType: 'click' });
      await recordExperimentEvent(created.id, { variantKey: 'A', eventType: 'conversion' });
      const got = await getExperiment(created.id);
      expect(got.variants[0]).toMatchObject({ impressions: 1, clicks: 1, conversions: 1, conversionRate: 1 });
      expect(await AnalyticsEvent.countDocuments({ eventType: 'experiment_impression' })).toBe(1);
      expect(await AnalyticsEvent.countDocuments({ eventType: 'experiment_conversion' })).toBe(1);
    });
    it('rejects unknown variants, drafts, simulated experiments and missing experiments', async () => {
      const draft = await createExperiment({ name: 'Draft test', hypothesis: '', description: '', status: 'draft', variants: [{ key: 'A', label: 'a' }, { key: 'B', label: 'b' }] });
      await expect(recordExperimentEvent(draft.id, { variantKey: 'A', eventType: 'impression' })).rejects.toMatchObject({ status: 409 });
      const running = await createExperiment({ name: 'Running test', hypothesis: '', description: '', status: 'running', variants: [{ key: 'A', label: 'a' }, { key: 'B', label: 'b' }] });
      await expect(recordExperimentEvent(running.id, { variantKey: 'Z', eventType: 'impression' })).rejects.toMatchObject({ status: 400 });
      const sim = (await listExperiments()).find((e) => e.isSimulated)!;
      await expect(recordExperimentEvent(sim.id, { variantKey: 'A', eventType: 'impression' })).rejects.toMatchObject({ status: 409 });
      await expect(getExperiment('507f1f77bcf86cd799439011')).rejects.toMatchObject({ status: 404 });
    });
  });
});
