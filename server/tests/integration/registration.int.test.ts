/**
 * DATABASE-DEPENDENT tests. They only run when MONGODB_URI_TEST points at a throwaway MongoDB
 * (they DROP that database between tests). Otherwise the whole suite is skipped.
 *   MONGODB_URI_TEST="mongodb://localhost:27017/growthhub_test" npm run test:integration
 */
import mongoose from 'mongoose';
import { Referral } from '../../src/models/Referral';
import { Registration } from '../../src/models/Registration';
import { User } from '../../src/models/User';
import { getLeaderboard } from '../../src/services/leaderboardService';
import { getReferralStats, trackReferralClick } from '../../src/services/referralService';
import { registerStudent } from '../../src/services/registrationService';
import { registerSchema } from '../../src/validators/registration';

const URI = process.env.MONGODB_URI_TEST;
const input = (over: Record<string, unknown> = {}) =>
  registerSchema.parse({
    name: 'Priya Sharma', email: 'priya@college.edu', college: 'NIT Trichy',
    branch: 'ECE', graduationYear: 2027, source: 'whatsapp', ...over,
  });

describe.skipIf(!URI)('registration + referral flow (real MongoDB)', () => {
  beforeAll(async () => {
    await mongoose.connect(URI as string);
    await Promise.all([User.init(), Registration.init(), Referral.init()]); // build unique indexes
  });
  beforeEach(async () => { await mongoose.connection.dropDatabase(); await Promise.all([User.init(), Registration.init(), Referral.init()]); });
  afterAll(async () => { await mongoose.disconnect(); });

  it('registers a student: user + registration + referral code', async () => {
    const out = await registerStudent(input());
    expect(out.registrationId).toMatch(/^AIW-[0-9A-F]{8}$/);
    expect(out.user.referralCode).toMatch(/^PRIYAS/);
    expect(await User.countDocuments()).toBe(1);
    expect(await Registration.countDocuments()).toBe(1);
  });

  it('rejects a duplicate email with 409, including +alias variants', async () => {
    await registerStudent(input());
    await expect(registerStudent(input())).rejects.toMatchObject({ status: 409 });
    await expect(registerStudent(input({ email: 'priya+2@college.edu' }))).rejects.toMatchObject({ status: 409 });
    expect(await User.countDocuments()).toBe(1);
  });

  it('handles two simultaneous identical registrations (unique index race)', async () => {
    const results = await Promise.allSettled([registerStudent(input()), registerStudent(input())]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await User.countDocuments()).toBe(1);
  });

  it('credits a valid referral and counts it for the referrer', async () => {
    const a = await registerStudent(input());
    const b = await registerStudent(input({ email: 'rahul@college.edu', name: 'Rahul V', referralCode: a.user.referralCode }));
    expect(b.referral).toEqual({ credited: true });
    expect(await Referral.countDocuments({ referrerUserId: a.user.id })).toBe(1);
    const reg = await Registration.findOne({ userId: b.user.id });
    expect(reg?.source).toBe('referral');
  });

  it('registers but does NOT credit an invalid referral code', async () => {
    const out = await registerStudent(input({ referralCode: 'NOBODY2X9' }));
    expect(out.referral).toEqual({ credited: false, reason: 'invalid_code' });
    expect(await Referral.countDocuments()).toBe(0);
  });

  it('prevents self-referral through an email alias (blocked as a duplicate email)', async () => {
    const a = await registerStudent(input({ email: 'saketh@gmail.com' }));
    await expect(
      registerStudent(input({ email: 's.a.keth+x@gmail.com', referralCode: a.user.referralCode })),
    ).rejects.toMatchObject({ status: 409 });
    expect(await Referral.countDocuments()).toBe(0);
  });

  it('enforces one referral per referred student at the index level', async () => {
    const a = await registerStudent(input());
    const b = await registerStudent(input({ email: 'rahul@college.edu', referralCode: a.user.referralCode }));
    await expect(
      Referral.create({ referrerUserId: a.user.id, referredUserId: b.user.id, referralCode: a.user.referralCode }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('tracks clicks and reports stats + conversion rate', async () => {
    const a = await registerStudent(input());
    await trackReferralClick(a.user.referralCode);
    await trackReferralClick(a.user.referralCode);
    await registerStudent(input({ email: 'rahul@college.edu', referralCode: a.user.referralCode }));
    const stats = await getReferralStats(a.user.referralCode);
    expect(stats).toMatchObject({ clicks: 2, successfulReferrals: 1, conversionRate: 0.5 });
    await expect(trackReferralClick('GHOST2X9')).rejects.toMatchObject({ status: 404 });
  });

  it('builds a ranked leaderboard from real referrals', async () => {
    const a = await registerStudent(input({ name: 'Anita Rao', email: 'anita@college.edu' }));
    const b = await registerStudent(input({ name: 'Bala K', email: 'bala@college.edu' }));
    for (const n of ['c1', 'c2']) await registerStudent(input({ email: `${n}@college.edu`, referralCode: a.user.referralCode }));
    await registerStudent(input({ email: 'c3@college.edu', referralCode: b.user.referralCode }));
    const board = await getLeaderboard(10);
    expect(board.map((e) => [e.rank, e.displayName, e.successfulReferrals])).toEqual([
      [1, 'Anita R.', 2],
      [2, 'Bala K.', 1],
    ]);
  });
});
