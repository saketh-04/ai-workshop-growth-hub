import { addDays } from '../utils/istDate';
import { maskName } from './leaderboardRules';
import { conversionRate } from './referralRules';

export const TARGET_REGISTRATIONS = 500;
export const CAMPAIGN_DAYS = 7;
export const CAMPAIGN_SLUG = 'ai-workshop';
export const SIMULATED_LABEL = 'Simulated campaign data';

export type Dataset = 'all' | 'real' | 'demo';

/** Mongo match filter for the dataset switch. Built only from an enum, so it can't carry user-supplied operators. */
export function datasetFilter(dataset: Dataset): Record<string, unknown> {
  if (dataset === 'demo') return { isDemo: true };
  if (dataset === 'real') return { isDemo: { $ne: true } };
  return {};
}

/** Label shown whenever the numbers include seeded demo records. */
export function dataLabel(dataset: Dataset, demoRecords: number): string | null {
  return dataset !== 'real' && demoRecords > 0 ? SIMULATED_LABEL : null;
}

export const ratio = (n: number, d: number): number => (d <= 0 ? 0 : Math.round((n / d) * 1000) / 1000);

export function progressPercent(total: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((total / target) * 1000) / 10);
}

export interface DailyRow {
  date: string; // YYYY-MM-DD (IST)
  registrations: number;
  referralRegistrations: number;
}

/** One row per campaign day, zero-filled, with a running total. Days outside the window are ignored. */
export function fillDailySeries(rows: DailyRow[], startKey: string, days = CAMPAIGN_DAYS) {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  let cumulative = 0;
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(startKey, i);
    const row = byDate.get(date);
    const registrations = row?.registrations ?? 0;
    cumulative += registrations;
    return { day: i + 1, date, registrations, referralRegistrations: row?.referralRegistrations ?? 0, cumulative };
  });
}

export function buildFunnel(c: { landingViews: number; starts: number; registrations: number; referralRegistrations: number }) {
  const raw = [
    { key: 'landing_page_views', label: 'Landing page views', count: c.landingViews, prev: null as number | null },
    { key: 'registration_starts', label: 'Registration starts', count: c.starts, prev: c.landingViews },
    { key: 'registrations', label: 'Completed registrations', count: c.registrations, prev: c.starts },
    // Not a strict funnel stage: the share of registrations that arrived through a credited referral.
    { key: 'referral_registrations', label: 'Referral registrations', count: c.referralRegistrations, prev: c.registrations },
  ];
  return {
    steps: raw.map(({ prev, ...s }) => ({
      ...s,
      rateFromPrevious: prev === null ? null : ratio(s.count, prev),
      rateFromTop: ratio(s.count, c.landingViews),
    })),
    visitorToRegistration: ratio(c.registrations, c.landingViews),
    startToCompletion: ratio(c.registrations, c.starts),
    referralShareOfRegistrations: ratio(c.referralRegistrations, c.registrations),
  };
}

export interface CountRow {
  _id: string;
  count: number;
}

export function buildChannelReport(p: {
  bySource: CountRow[];
  byMedium: CountRow[];
  byCampaign: CountRow[];
  viewsBySource: CountRow[];
}) {
  const total = p.bySource.reduce((s, r) => s + r.count, 0);
  const views = new Map(p.viewsBySource.map((v) => [v._id, v.count]));
  const order = (a: { registrations: number; name: string }, b: { registrations: number; name: string }) =>
    b.registrations - a.registrations || a.name.localeCompare(b.name);
  const simple = (rows: CountRow[]) =>
    rows.map((r) => ({ name: r._id, registrations: r.count, share: ratio(r.count, total) })).sort(order);

  return {
    totalRegistrations: total,
    bySource: p.bySource
      .map((r) => {
        const landingViews = views.get(r._id) ?? null;
        return {
          name: r._id,
          registrations: r.count,
          share: ratio(r.count, total),
          landingViews,
          // Only where we actually tracked visits for that source; otherwise null, never a guess.
          conversionRate: landingViews ? ratio(r.count, landingViews) : null,
        };
      })
      .sort(order),
    byMedium: simple(p.byMedium),
    byCampaign: simple(p.byCampaign),
  };
}

export function buildReferralReport(p: {
  totalClicks: number;
  successful: number;
  activeReferrers: number;
  top: { name: string; college: string; referrals: number; clicks: number }[];
}) {
  return {
    totalClicks: p.totalClicks,
    successfulReferrals: p.successful,
    conversionRate: conversionRate(p.successful, p.totalClicks),
    activeReferrers: p.activeReferrers,
    topReferrers: p.top.map((t, i) => ({
      rank: i + 1,
      displayName: maskName(t.name),
      college: t.college,
      referrals: t.referrals,
      clicks: t.clicks,
      conversionRate: conversionRate(t.referrals, t.clicks),
    })),
  };
}
