import mongoose, { Types } from 'mongoose';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import { Campaign } from '../models/Campaign';
import { Referral } from '../models/Referral';
import { Registration } from '../models/Registration';
import { User } from '../models/User';
import { IST_TIMEZONE, addDays, istDateKey } from '../utils/istDate';
import { EventType } from '../validators/analytics';
import {
  CAMPAIGN_DAYS, CAMPAIGN_SLUG, CountRow, Dataset, DailyRow, TARGET_REGISTRATIONS,
  buildChannelReport, buildFunnel, buildReferralReport, datasetFilter, dataLabel,
  fillDailySeries, progressPercent, ratio,
} from './analyticsRules';

export interface EventInput {
  eventType: EventType;
  userId?: string | Types.ObjectId;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort write. Analytics must never break a registration, so failures are logged and swallowed.
 * Returns false when nothing was stored (e.g. database not connected).
 */
export async function recordEvent(e: EventInput): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    await AnalyticsEvent.create({ eventType: e.eventType, userId: e.userId, source: e.source, metadata: e.metadata });
    return true;
  } catch (err) {
    console.warn('[analytics] failed to record', e.eventType, err instanceof Error ? err.message : err);
    return false;
  }
}

async function meta(dataset: Dataset) {
  const demoRecords = await Registration.countDocuments({ isDemo: true });
  return { dataset, demoRecords, label: dataLabel(dataset, demoRecords) };
}

async function campaignWindow() {
  const c = await Campaign.findOne({ slug: CAMPAIGN_SLUG }).lean();
  const startKey = c ? istDateKey(c.startDate) : addDays(istDateKey(new Date()), -(CAMPAIGN_DAYS - 1));
  return { name: c?.name ?? null, target: c?.targetRegistrations ?? TARGET_REGISTRATIONS, budgetInr: c?.budgetInr ?? 2000, startKey };
}

const countEvents = (f: Record<string, unknown>, eventType: EventType) => AnalyticsEvent.countDocuments({ ...f, eventType });

export async function getOverview(dataset: Dataset) {
  const f = datasetFilter(dataset);
  const [campaign, total, referralRegs, views, activeReferrers, dailyRows, m] = await Promise.all([
    campaignWindow(),
    Registration.countDocuments(f),
    Registration.countDocuments({ ...f, referralCode: { $ne: null } }),
    countEvents(f, 'landing_page_view'),
    Referral.distinct('referrerUserId', f).then((ids) => ids.length),
    Registration.aggregate<DailyRow & { _id: string }>([
      { $match: f },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: IST_TIMEZONE } },
          registrations: { $sum: 1 },
          referralRegistrations: { $sum: { $cond: [{ $ne: ['$referralCode', null] }, 1, 0] } },
        },
      },
    ]),
    meta(dataset),
  ]);

  return {
    meta: m,
    campaign: { name: campaign.name, days: CAMPAIGN_DAYS, budgetInr: campaign.budgetInr, startDate: campaign.startKey },
    totals: {
      registrations: total,
      target: campaign.target,
      progressPercent: progressPercent(total, campaign.target),
      referralRegistrations: referralRegs,
      referralShare: ratio(referralRegs, total),
      visitorToRegistrationRate: ratio(total, views), // registrations / landing page views
      activeReferrers,
    },
    daily: fillDailySeries(dailyRows.map((r) => ({ ...r, date: r._id })), campaign.startKey),
  };
}

export async function getChannels(dataset: Dataset) {
  const f = datasetFilter(dataset);
  const [[facets], viewsBySource, m] = await Promise.all([
    Registration.aggregate<{ bySource: CountRow[]; byMedium: CountRow[]; byCampaign: CountRow[] }>([
      { $match: f },
      {
        $facet: {
          bySource: [{ $group: { _id: '$source', count: { $sum: 1 } } }],
          byMedium: [{ $group: { _id: { $ifNull: ['$medium', '(none)'] }, count: { $sum: 1 } } }],
          byCampaign: [{ $group: { _id: { $ifNull: ['$campaign', '(none)'] }, count: { $sum: 1 } } }],
        },
      },
    ]),
    AnalyticsEvent.aggregate<CountRow>([
      { $match: { ...f, eventType: 'landing_page_view' } },
      { $group: { _id: { $ifNull: ['$source', '(none)'] }, count: { $sum: 1 } } },
    ]),
    meta(dataset),
  ]);
  return { meta: m, ...buildChannelReport({ bySource: facets.bySource, byMedium: facets.byMedium, byCampaign: facets.byCampaign, viewsBySource }) };
}

export async function getFunnel(dataset: Dataset) {
  const f = datasetFilter(dataset);
  const [landingViews, starts, registrations, referralRegistrations, m] = await Promise.all([
    countEvents(f, 'landing_page_view'),
    countEvents(f, 'registration_started'),
    Registration.countDocuments(f), // authoritative source for completions
    Referral.countDocuments(f),
    meta(dataset),
  ]);
  return { meta: m, ...buildFunnel({ landingViews, starts, registrations, referralRegistrations }) };
}

export async function getReferralAnalytics(dataset: Dataset) {
  const f = datasetFilter(dataset);
  const [clicksAgg, successful, activeReferrers, top, m] = await Promise.all([
    User.aggregate<{ clicks: number }>([{ $match: f }, { $group: { _id: null, clicks: { $sum: '$referralClicks' } } }]),
    Referral.countDocuments(f),
    Referral.distinct('referrerUserId', f).then((ids) => ids.length),
    Referral.aggregate<{ referrals: number; user: { name: string; college: string; referralClicks?: number } }>([
      { $match: f },
      { $group: { _id: '$referrerUserId', referrals: { $sum: 1 }, last: { $max: '$createdAt' } } },
      { $sort: { referrals: -1, last: 1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
    ]),
    meta(dataset),
  ]);
  return {
    meta: m,
    ...buildReferralReport({
      totalClicks: clicksAgg[0]?.clicks ?? 0,
      successful,
      activeReferrers,
      top: top.map((t) => ({ name: t.user.name, college: t.user.college, referrals: t.referrals, clicks: t.user.referralClicks ?? 0 })),
    }),
  };
}
