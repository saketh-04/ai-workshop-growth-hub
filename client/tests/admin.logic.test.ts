import { describe, expect, it } from 'vitest';
import type { Channels, FunnelStep, Overview } from '../src/lib/adminApi';
import { buildExperimentPayload, channelLabel, channelRows, funnelBars, mapExperimentIssues, pct, readoutTone, topChannel, trendRows, validateExperimentForm } from '../src/lib/adminData';

const row = (name: string, registrations: number, landingViews: number | null = null) => ({ name, registrations, share: 0, landingViews, conversionRate: null as number | null });

describe('channelRows (the six channels from the brief)', () => {
  it('always returns the six channels in order, zero-filled', () => {
    const r = channelRows({ bySource: [row('linkedin', 5)] });
    expect(r.map((x) => x.key)).toEqual(['whatsapp', 'college_club', 'linkedin', 'instagram', 'referral', 'other']);
    expect(r.map((x) => x.registrations)).toEqual([0, 0, 5, 0, 0, 0]);
    expect(r.map((x) => x.label)).toEqual(['WhatsApp', 'College clubs', 'LinkedIn', 'Instagram', 'Referral', 'Other']);
  });
  it('folds unknown UTM sources into Other and keeps totals intact', () => {
    const r = channelRows({ bySource: [row('whatsapp', 60), row('facebook', 7), row('other', 3)] });
    expect(r.find((x) => x.key === 'other')?.registrations).toBe(10);
    expect(r.reduce((s, x) => s + x.registrations, 0)).toBe(70);
  });
  it('computes share and shows conversion only where landing views exist', () => {
    const r = channelRows({ bySource: [row('whatsapp', 60, 300), row('linkedin', 40)] });
    expect(r[0]).toMatchObject({ share: 0.6, landingViews: 300, conversionRate: 0.2 });
    expect(r.find((x) => x.key === 'linkedin')).toMatchObject({ landingViews: null, conversionRate: null });
  });
  it('is all zeros (no NaN) with no data', () => expect(channelRows({ bySource: [] }).every((x) => x.registrations === 0 && x.share === 0)).toBe(true));
});

describe('topChannel', () => {
  it('picks the highest registrations', () => expect(topChannel({ bySource: [row('a', 2), row('whatsapp', 9), row('b', 4)] })?.name).toBe('whatsapp'));
  it('is null with no registrations', () => { expect(topChannel({ bySource: [] })).toBeNull(); expect(topChannel({ bySource: [row('x', 0)] })).toBeNull(); });
});

describe('trendRows / funnelBars / pct / channelLabel', () => {
  it('labels days 1-7 and carries values', () => {
    const daily: Overview['daily'] = [{ day: 1, date: '2026-09-26', registrations: 9, referralRegistrations: 0, cumulative: 9 }, { day: 2, date: '2026-09-27', registrations: 13, referralRegistrations: 1, cumulative: 22 }];
    expect(trendRows(daily)).toEqual([
      { label: 'Day 1', date: '2026-09-26', registrations: 9, referrals: 0, cumulative: 9 },
      { label: 'Day 2', date: '2026-09-27', registrations: 13, referrals: 1, cumulative: 22 },
    ]);
  });
  it('funnel bars scale to landing views; tiny non-zero steps stay visible; zero stays zero', () => {
    const steps: FunnelStep[] = [
      { key: 'a', label: 'A', count: 1000, rateFromPrevious: null, rateFromTop: 1 }, { key: 'b', label: 'B', count: 400, rateFromPrevious: 0.4, rateFromTop: 0.4 },
      { key: 'c', label: 'C', count: 5, rateFromPrevious: 0.0125, rateFromTop: 0.005 }, { key: 'd', label: 'D', count: 0, rateFromPrevious: 0, rateFromTop: 0 },
    ];
    expect(funnelBars(steps).map((s) => s.widthPct)).toEqual([100, 40, 3, 0]);
  });
  it('pct formats rates', () => { expect(pct(0.1234)).toBe('12.3%'); expect(pct(0)).toBe('0%'); expect(pct(1)).toBe('100%'); });
  it('channelLabel handles unknown names', () => { expect(channelLabel('facebook_ads')).toBe('Facebook ads'); expect(channelLabel('whatsapp')).toBe('WhatsApp'); });
});

describe('readoutTone: simulated data is never styled as a win', () => {
  it('maps verdicts to tones', () => {
    expect(readoutTone({ verdict: 'simulated', message: 'x' })).toBe('simulated');
    expect(readoutTone({ verdict: 'insufficient_data', message: 'x' })).toBe('neutral');
    expect(readoutTone({ verdict: 'no_clear_difference', message: 'x', pValue: 0.4 })).toBe('neutral');
    expect(readoutTone({ verdict: 'leading', message: 'x', pValue: 0.01, leader: 'B' })).toBe('positive');
  });
});

describe('experiment form', () => {
  const ok = { name: 'Registration CTA', hypothesis: ' h ', description: '', labelA: 'Register Now', labelB: 'Build My AI Project', status: 'running' as const };
  it('accepts the CTA example', () => expect(validateExperimentForm(ok)).toEqual({}));
  it('flags short name, empty and identical variants', () => {
    expect(Object.keys(validateExperimentForm({ ...ok, name: 'ab', labelA: '', labelB: '' })).sort()).toEqual(['labelA', 'labelB', 'name']);
    expect(validateExperimentForm({ ...ok, labelB: ' register now ' })).toHaveProperty('labelB');
  });
  it('builds the API payload with keys A and B and trimmed text', () =>
    expect(buildExperimentPayload(ok)).toEqual({ name: 'Registration CTA', hypothesis: 'h', description: '', status: 'running', variants: [{ key: 'A', label: 'Register Now' }, { key: 'B', label: 'Build My AI Project' }] }));
  it('maps server issue paths onto form fields', () =>
    expect(mapExperimentIssues([{ field: 'name', message: 'n' }, { field: 'variants.0.label', message: 'a' }, { field: 'variants.1.key', message: 'b' }])).toEqual({ name: 'n', labelA: 'a', labelB: 'b' }));
});
