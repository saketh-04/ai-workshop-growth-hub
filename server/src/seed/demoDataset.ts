/**
 * Pure, deterministic generator for a SIMULATED 7-day campaign. No database access.
 * Everything here is made up to exercise the dashboards - none of it is real NxtWave data.
 *
 * Consistency rules (all unit-tested):
 *  - registration_completed events == users; referral_registration events == referred users
 *  - a referrer always registered before the student they referred (so never a self-referral)
 *  - user.referralClicks == number of referral_link_clicked events for that user, and >= their referrals
 *  - landing views >= registration starts >= completions
 *  - experiment conversions <= clicks <= impressions, and total conversions <= total registrations
 */
import { SIMULATED_LABEL } from '../services/analyticsRules';
import { DAY_MS, addDays, istDateKey, istDayStart } from '../utils/istDate';
import { generateReferralCode } from '../utils/referralCode';

export const DEMO_SEED = 2026;
export const DEMO_CAMPAIGN = {
  slug: 'ai-workshop',
  name: `Build Your First AI Project in 60 Minutes (${SIMULATED_LABEL})`,
  target: 500,
  budgetInr: 2000,
  days: 7,
};
// Illustrative assumptions for the simulation (documented in README): a ramp-up with a growing referral share.
const DAILY_REGISTRATIONS = [9, 13, 16, 20, 18, 24, 29]; // total 129 = ~26% of the 500 target
const REFERRAL_SHARE = [0, 0.06, 0.12, 0.18, 0.22, 0.28, 0.3];
const CHANNEL_WEIGHTS: [string, number][] = [['whatsapp', 0.35], ['college_club', 0.25], ['linkedin', 0.18], ['instagram', 0.12], ['other', 0.1]];
const CHANNEL_MEDIUM: Record<string, string> = { whatsapp: 'community', college_club: 'club', linkedin: 'social', instagram: 'social', other: 'direct', referral: 'referral' };

const FIRST = ['Aarav', 'Ananya', 'Arjun', 'Divya', 'Karthik', 'Meera', 'Naveen', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Lakshmi', 'Rohan', 'Ishita', 'Harini', 'Saketh', 'Pooja', 'Aditya', 'Nisha', 'Varun'];
const LAST = ['Iyer', 'Reddy', 'Sharma', 'Nair', 'Kumar', 'Patel', 'Rao', 'Menon', 'Das', 'Gupta', 'Singh', 'Pillai', 'Joshi', 'Naidu'];
const COLLEGES = ['Anna University', 'VIT Vellore', 'SRM Institute', 'NIT Trichy', 'PSG College of Technology', 'IIT Madras', 'BITS Pilani', 'JNTU Hyderabad', 'Osmania University', 'RV College of Engineering', 'Manipal Institute of Technology', 'KIIT Bhubaneswar'];
const BRANCHES: [string, number][] = [['CSE', 0.35], ['IT', 0.15], ['ECE', 0.18], ['EEE', 0.08], ['Mechanical', 0.08], ['Civil', 0.04], ['AI & DS', 0.12]];
const CATEGORIES = ['productivity', 'education', 'healthcare', 'finance', 'career', 'other'];

export interface DemoUser {
  key: number; // index in users[]
  name: string; email: string; college: string; branch: string; graduationYear: number; phone?: string;
  referralCode: string; referredByKey: number | null; referralClicks: number;
  createdAt: Date; dayIndex: number;
  channel: string; selfReported: string; medium: string; campaign: string;
}
export interface DemoEvent { eventType: string; userKey: number | null; source?: string; metadata?: Record<string, string | number | boolean>; timestamp: Date }
export interface DemoExperiment { name: string; hypothesis: string; description: string; variants: { key: string; label: string }[]; status: 'draft' | 'running' | 'completed'; startDate: Date }
export interface DemoExperimentEvent { experimentIndex: number; variantKey: string; eventType: 'impression' | 'click' | 'conversion'; timestamp: Date }
export interface DemoDataset {
  campaign: typeof DEMO_CAMPAIGN & { startDate: Date; endDate: Date };
  users: DemoUser[]; events: DemoEvent[]; experiments: DemoExperiment[]; experimentEvents: DemoExperimentEvent[];
}

/** Small deterministic PRNG: same seed -> same dataset. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted<T>(rng: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [item, w] of items) { if ((r -= w) < 0) return item; }
  return items[items.length - 1][0];
}
const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const between = (rng: () => number, a: number, b: number) => a + rng() * (b - a);

/** The campaign covers the 7 IST days ending yesterday, so every timestamp is safely in the past. */
export function generateDemoDataset(opts: { seed?: number; now?: Date } = {}): DemoDataset {
  const rng = mulberry32(opts.seed ?? DEMO_SEED);
  const startKey = addDays(istDateKey(opts.now ?? new Date()), -DEMO_CAMPAIGN.days);
  const campaignStart = istDayStart(startKey);
  const campaignEnd = new Date(campaignStart.getTime() + DEMO_CAMPAIGN.days * DAY_MS);

  const users: DemoUser[] = [];
  const codes = new Set<string>();

  for (let d = 0; d < DEMO_CAMPAIGN.days; d++) {
    const n = DAILY_REGISTRATIONS[d];
    const nRef = users.length === 0 ? 0 : Math.round(n * REFERRAL_SHARE[d]);
    const slots = [...Array(n).keys()].sort(() => rng() - 0.5).slice(0, nRef);
    const referralSlots = new Set(slots);
    const offsets = Array.from({ length: n }, () => between(rng, 1, 22) * 3_600_000).sort((a, b) => a - b);

    for (let i = 0; i < n; i++) {
      const key = users.length;
      const first = pick(rng, FIRST);
      const last = pick(rng, LAST);
      const name = `${first} ${last}`;
      let code = generateReferralCode(name, rng);
      while (codes.has(code)) code = generateReferralCode(name, rng);
      codes.add(code);

      let referredByKey: number | null = null;
      let channel = weighted(rng, CHANNEL_WEIGHTS);
      if (referralSlots.has(i)) {
        // Earlier students only; the first ~25 "power" referrers (even keys) are favoured to create a realistic leaderboard.
        referredByKey = weighted(rng, users.map((u) => [u.key, u.key < 25 && u.key % 2 === 0 ? 6 : 1] as [number, number]));
        channel = 'referral';
      }
      users.push({
        key, name,
        email: `${first}.${last}${key}@demo.example`.toLowerCase(),
        college: pick(rng, COLLEGES),
        branch: weighted(rng, BRANCHES),
        graduationYear: rng() < 0.8 ? 2027 : 2026,
        phone: rng() < 0.6 ? `9${String(Math.floor(rng() * 1e9)).padStart(9, '0')}` : undefined,
        referralCode: code, referredByKey, referralClicks: 0,
        createdAt: new Date(istDayStart(addDays(startKey, d)).getTime() + offsets[i] + key), // +key ms keeps order strict
        dayIndex: d,
        channel, selfReported: channel, medium: CHANNEL_MEDIUM[channel], campaign: 'ai-workshop',
      });
    }
  }

  const events: DemoEvent[] = [];
  const dayStartOf = (u: DemoUser) => istDayStart(addDays(startKey, u.dayIndex)).getTime();
  const add = (eventType: string, userKey: number | null, ts: number, source?: string, metadata?: DemoEvent['metadata']) =>
    events.push({ eventType, userKey, source, metadata, timestamp: new Date(ts) });

  for (const u of users) {
    const src = u.channel;
    for (let v = 0, k = 5 + Math.floor(rng() * 5); v < k; v++) add('landing_page_view', null, dayStartOf(u) + rng() * DAY_MS, src);
    add('registration_started', null, u.createdAt.getTime() - between(rng, 60_000, 600_000), src);
    if (rng() < 0.6) add('registration_started', null, dayStartOf(u) + rng() * DAY_MS, src); // an abandoned attempt
    add('registration_completed', u.key, u.createdAt.getTime(), src);
    if (u.referredByKey !== null) {
      add('referral_registration', u.key, u.createdAt.getTime(), 'referral', { referralCode: users[u.referredByKey].referralCode });
      const referrer = users[u.referredByKey];
      for (let c = 0, n = 2 + Math.floor(rng() * 4); c < n; c++) {
        add('referral_link_clicked', referrer.key, between(rng, referrer.createdAt.getTime(), u.createdAt.getTime()), 'referral');
      }
    }
    if (rng() < 0.6) add('ai_project_generated', u.key, u.createdAt.getTime() + between(rng, 60_000, 1_200_000), undefined, { category: pick(rng, CATEGORIES), source: 'fallback' });
    if (rng() < 0.35) add('share_clicked', u.key, u.createdAt.getTime() + between(rng, 60_000, 3_600_000), undefined, { channel: pick(rng, ['whatsapp', 'linkedin', 'copy']) });
  }
  // Some referrers also got clicks that never converted.
  const referrerKeys = new Set(users.filter((u) => u.referredByKey !== null).map((u) => u.referredByKey as number));
  for (const key of [...referrerKeys].sort((a, b) => a - b)) {
    if (rng() < 0.4) {
      for (let c = 0, n = 1 + Math.floor(rng() * 3); c < n; c++) {
        add('referral_link_clicked', key, between(rng, users[key].createdAt.getTime(), campaignEnd.getTime()), 'referral');
      }
    }
  }
  for (const e of events) if (e.eventType === 'referral_link_clicked' && e.userKey !== null) users[e.userKey].referralClicks++;

  const experiments: DemoExperiment[] = [
    {
      name: 'Registration CTA',
      hypothesis: 'A benefit-led button label ("Build My AI Project") gets more students to start registering than a generic one.',
      description: `${SIMULATED_LABEL}: illustrative numbers to demonstrate the experiment dashboard.`,
      variants: [{ key: 'A', label: 'Register Now' }, { key: 'B', label: 'Build My AI Project' }],
      status: 'running', startDate: campaignStart,
    },
    {
      name: 'Hero headline',
      hypothesis: 'Naming the outcome ("a working AI project") in the headline beats naming the format ("a free workshop").',
      description: 'Drafted but not started: shows the empty state.',
      variants: [{ key: 'A', label: 'Free AI Workshop for Final-Year Students' }, { key: 'B', label: 'Build Your First AI Project in 60 Minutes' }],
      status: 'draft', startDate: campaignStart,
    },
  ];
  const experimentEvents: DemoExperimentEvent[] = [];
  const cta = [{ key: 'A', impressions: 420, clickRate: 0.14, convRate: 0.35 }, { key: 'B', impressions: 405, clickRate: 0.16, convRate: 0.35 }];
  for (const v of cta) {
    for (let i = 0; i < v.impressions; i++) {
      const t = campaignStart.getTime() + rng() * DEMO_CAMPAIGN.days * DAY_MS * 0.99;
      experimentEvents.push({ experimentIndex: 0, variantKey: v.key, eventType: 'impression', timestamp: new Date(t) });
      if (rng() < v.clickRate) {
        const tc = t + between(rng, 5_000, 60_000);
        experimentEvents.push({ experimentIndex: 0, variantKey: v.key, eventType: 'click', timestamp: new Date(tc) });
        if (rng() < v.convRate) experimentEvents.push({ experimentIndex: 0, variantKey: v.key, eventType: 'conversion', timestamp: new Date(tc + between(rng, 30_000, 300_000)) });
      }
    }
  }
  return { campaign: { ...DEMO_CAMPAIGN, startDate: campaignStart, endDate: campaignEnd }, users, events, experiments, experimentEvents };
}

/** Human-readable numbers for `npm run seed:preview` and tests. */
export function summarizeDataset(ds: DemoDataset) {
  const countBy = <T,>(items: T[], key: (t: T) => string) => items.reduce<Record<string, number>>((m, i) => ((m[key(i)] = (m[key(i)] ?? 0) + 1), m), {});
  return {
    registrations: ds.users.length,
    referralRegistrations: ds.users.filter((u) => u.referredByKey !== null).length,
    perDay: Array.from({ length: DEMO_CAMPAIGN.days }, (_, d) => ({
      day: d + 1,
      registrations: ds.users.filter((u) => u.dayIndex === d).length,
      referral: ds.users.filter((u) => u.dayIndex === d && u.referredByKey !== null).length,
    })),
    byChannel: countBy(ds.users, (u) => u.channel),
    colleges: new Set(ds.users.map((u) => u.college)).size,
    branches: new Set(ds.users.map((u) => u.branch)).size,
    eventsByType: countBy(ds.events, (e) => e.eventType),
    experimentEvents: countBy(ds.experimentEvents, (e) => `${e.variantKey}:${e.eventType}`),
  };
}
