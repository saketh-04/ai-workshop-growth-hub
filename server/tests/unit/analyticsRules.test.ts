import {
  buildChannelReport, buildFunnel, buildReferralReport, dataLabel, datasetFilter, fillDailySeries, progressPercent, ratio,
} from '../../src/services/analyticsRules';

describe('datasetFilter / dataLabel', () => {
  it('builds filters from the enum only', () => {
    expect(datasetFilter('all')).toEqual({});
    expect(datasetFilter('demo')).toEqual({ isDemo: true });
    expect(datasetFilter('real')).toEqual({ isDemo: { $ne: true } });
  });
  it('labels any view that includes demo records as simulated', () => {
    expect(dataLabel('all', 5)).toBe('Simulated campaign data');
    expect(dataLabel('demo', 5)).toBe('Simulated campaign data');
  });
  it('does not label real-only views or when there is no demo data', () => {
    expect(dataLabel('real', 5)).toBeNull();
    expect(dataLabel('all', 0)).toBeNull();
  });
});

describe('ratio / progressPercent', () => {
  it('ratio is safe for zero denominators and rounds to 3 dp', () => {
    expect(ratio(1, 0)).toBe(0);
    expect(ratio(1, 3)).toBe(0.333);
  });
  it('progress is a 1-dp percentage of the 500 target, capped at 100', () => {
    expect(progressPercent(129, 500)).toBe(25.8);
    expect(progressPercent(900, 500)).toBe(100);
    expect(progressPercent(5, 0)).toBe(0);
  });
});

describe('fillDailySeries', () => {
  it('zero-fills missing days, numbers them, and keeps a running total', () => {
    const out = fillDailySeries(
      [
        { date: '2026-10-01', registrations: 4, referralRegistrations: 0 },
        { date: '2026-10-03', registrations: 6, referralRegistrations: 2 },
        { date: '2026-09-01', registrations: 99, referralRegistrations: 9 }, // outside window: ignored
      ],
      '2026-10-01',
      4,
    );
    expect(out.map((d) => [d.day, d.date, d.registrations, d.cumulative])).toEqual([
      [1, '2026-10-01', 4, 4],
      [2, '2026-10-02', 0, 4],
      [3, '2026-10-03', 6, 10],
      [4, '2026-10-04', 0, 10],
    ]);
    expect(out[2].referralRegistrations).toBe(2);
  });
  it('defaults to 7 days', () => expect(fillDailySeries([], '2026-10-01')).toHaveLength(7));
});

describe('buildFunnel', () => {
  const f = buildFunnel({ landingViews: 1000, starts: 400, registrations: 100, referralRegistrations: 25 });
  it('lists the four steps in order', () =>
    expect(f.steps.map((s) => s.key)).toEqual(['landing_page_views', 'registration_starts', 'registrations', 'referral_registrations']));
  it('computes step-to-step and top-of-funnel rates', () => {
    expect(f.steps[0].rateFromPrevious).toBeNull();
    expect(f.steps[1].rateFromPrevious).toBe(0.4);
    expect(f.steps[2].rateFromPrevious).toBe(0.25);
    expect(f.steps[2].rateFromTop).toBe(0.1);
    expect(f.steps[3].rateFromPrevious).toBe(0.25); // share of registrations
  });
  it('exposes headline rates', () => {
    expect(f.visitorToRegistration).toBe(0.1);
    expect(f.startToCompletion).toBe(0.25);
    expect(f.referralShareOfRegistrations).toBe(0.25);
  });
  it('is all zeros (no NaN) for an empty funnel', () => {
    const e = buildFunnel({ landingViews: 0, starts: 0, registrations: 0, referralRegistrations: 0 });
    expect(e.steps.every((s) => s.count === 0 && !Number.isNaN(s.rateFromTop))).toBe(true);
  });
});

describe('buildChannelReport', () => {
  const r = buildChannelReport({
    bySource: [{ _id: 'linkedin', count: 20 }, { _id: 'whatsapp', count: 60 }, { _id: 'referral', count: 20 }],
    byMedium: [{ _id: 'social', count: 20 }, { _id: 'community', count: 60 }, { _id: '(none)', count: 20 }],
    byCampaign: [{ _id: 'ai-workshop', count: 100 }],
    viewsBySource: [{ _id: 'whatsapp', count: 300 }, { _id: 'linkedin', count: 100 }],
  });
  it('totals and sorts by registrations desc, then name', () => {
    expect(r.totalRegistrations).toBe(100);
    expect(r.bySource.map((s) => s.name)).toEqual(['whatsapp', 'linkedin', 'referral']);
  });
  it('computes share and conversion only where views were tracked', () => {
    expect(r.bySource[0]).toMatchObject({ name: 'whatsapp', share: 0.6, landingViews: 300, conversionRate: 0.2 });
    expect(r.bySource[2]).toMatchObject({ name: 'referral', landingViews: null, conversionRate: null });
  });
  it('reports medium and campaign attribution', () => {
    expect(r.byMedium[0]).toEqual({ name: 'community', registrations: 60, share: 0.6 });
    expect(r.byCampaign).toEqual([{ name: 'ai-workshop', registrations: 100, share: 1 }]);
  });
});

describe('buildReferralReport', () => {
  const r = buildReferralReport({
    totalClicks: 100, successful: 25, activeReferrers: 10,
    top: [{ name: 'Saketh Kumar', college: 'IIT Madras', referrals: 5, clicks: 10 }],
  });
  it('computes the overall conversion rate', () => expect(r.conversionRate).toBe(0.25));
  it('masks names and ranks top referrers', () =>
    expect(r.topReferrers[0]).toEqual({ rank: 1, displayName: 'Saketh K.', college: 'IIT Madras', referrals: 5, clicks: 10, conversionRate: 0.5 }));
});
