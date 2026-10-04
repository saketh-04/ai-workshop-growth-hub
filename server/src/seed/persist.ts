import { Types } from 'mongoose';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import { Campaign } from '../models/Campaign';
import { Experiment } from '../models/Experiment';
import { ExperimentEvent } from '../models/ExperimentEvent';
import { Referral } from '../models/Referral';
import { Registration } from '../models/Registration';
import { User } from '../models/User';
import { canonicalEmail } from '../utils/email';
import { DEMO_CAMPAIGN, DemoDataset } from './demoDataset';

// Real documents never have isDemo=true, so a reset can only ever delete seeded records.
export async function clearDemoData(): Promise<void> {
  const simulated = await Experiment.find({ isSimulated: true }).distinct('_id');
  await Promise.all([
    ExperimentEvent.deleteMany({ experimentId: { $in: simulated } }),
    Referral.deleteMany({ isDemo: true }),
    Registration.deleteMany({ isDemo: true }),
    AnalyticsEvent.deleteMany({ isDemo: true }),
  ]);
  await Promise.all([Experiment.deleteMany({ isSimulated: true }), User.deleteMany({ isDemo: true }), Campaign.deleteOne({ slug: DEMO_CAMPAIGN.slug })]);
}

const chunks = <T,>(arr: T[], size = 1000): T[][] => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
// timestamps:false so our explicit createdAt values (the campaign days) are kept instead of "now".
const RAW = { timestamps: false } as const;

/** Reset-then-seed: running it twice yields the same demo data, never duplicates. */
export async function persistDemoDataset(ds: DemoDataset) {
  await clearDemoData();
  const ids = ds.users.map(() => new Types.ObjectId());
  const idOf = (k: number) => ids[k];

  await Campaign.create({ name: ds.campaign.name, slug: ds.campaign.slug, targetRegistrations: ds.campaign.target, budgetInr: ds.campaign.budgetInr, startDate: ds.campaign.startDate, endDate: ds.campaign.endDate });

  await User.insertMany(ds.users.map((u) => ({
    _id: idOf(u.key), name: u.name, email: u.email, canonicalEmail: canonicalEmail(u.email), college: u.college, branch: u.branch,
    graduationYear: u.graduationYear, phone: u.phone, referralCode: u.referralCode,
    referredBy: u.referredByKey === null ? null : idOf(u.referredByKey), referralClicks: u.referralClicks, isDemo: true, createdAt: u.createdAt,
  })), RAW);

  await Registration.insertMany(ds.users.map((u) => ({
    userId: idOf(u.key), source: u.channel, selfReportedSource: u.selfReported, medium: u.medium, campaign: u.campaign,
    referralCode: u.referredByKey === null ? null : ds.users[u.referredByKey].referralCode, isDemo: true, createdAt: u.createdAt,
  })), RAW);

  await Referral.insertMany(ds.users.filter((u) => u.referredByKey !== null).map((u) => ({
    referrerUserId: idOf(u.referredByKey as number), referredUserId: idOf(u.key), referralCode: ds.users[u.referredByKey as number].referralCode,
    converted: true, isDemo: true, createdAt: u.createdAt,
  })), RAW);

  for (const part of chunks(ds.events)) {
    await AnalyticsEvent.insertMany(part.map((e) => ({
      eventType: e.eventType, userId: e.userKey === null ? undefined : idOf(e.userKey), source: e.source, metadata: e.metadata, isDemo: true, timestamp: e.timestamp,
    })));
  }

  const experimentIds: Types.ObjectId[] = [];
  for (const e of ds.experiments) experimentIds.push((await Experiment.create({ ...e, isSimulated: true }))._id);
  for (const part of chunks(ds.experimentEvents)) {
    await ExperimentEvent.insertMany(part.map((e) => ({ experimentId: experimentIds[e.experimentIndex], variantKey: e.variantKey, eventType: e.eventType, timestamp: e.timestamp })));
  }
  return { users: ds.users.length, events: ds.events.length, experiments: ds.experiments.length, experimentEvents: ds.experimentEvents.length };
}
