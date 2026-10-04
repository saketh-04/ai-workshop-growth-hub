import { buildVariantStats, canTransition, evaluateExperiment, normalCdf, twoProportionPValue } from '../../src/services/experimentRules';

const variants = [{ key: 'A', label: 'Register Now' }, { key: 'B', label: 'Build My AI Project' }];
const stats = (a: [number, number, number], b: [number, number, number]) =>
  buildVariantStats(variants, { A: { impression: a[0], click: a[1], conversion: a[2] }, B: { impression: b[0], click: b[1], conversion: b[2] } });

describe('buildVariantStats', () => {
  it('computes click rate and conversion rate (conversions / impressions)', () => {
    const [a] = stats([400, 60, 20], [400, 80, 40]);
    expect(a).toMatchObject({ key: 'A', impressions: 400, clicks: 60, conversions: 20, clickRate: 0.15, conversionRate: 0.05 });
  });
  it('treats missing counts as zero without NaN', () => {
    const [a] = buildVariantStats(variants, {});
    expect(a).toMatchObject({ impressions: 0, clicks: 0, conversions: 0, clickRate: 0, conversionRate: 0 });
  });
});

describe('statistics helpers', () => {
  it('normalCdf matches known values', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
  it('twoProportionPValue: clear difference is small, identical rates give 1', () => {
    const p = twoProportionPValue(50, 1000, 80, 1000);
    expect(p).toBeGreaterThan(0.005);
    expect(p).toBeLessThan(0.008);
    expect(twoProportionPValue(40, 1000, 40, 1000)).toBeCloseTo(1, 6);
  });
  it('is safe with zero samples or zero variance', () => {
    expect(twoProportionPValue(0, 0, 0, 0)).toBe(1);
    expect(twoProportionPValue(0, 100, 0, 100)).toBe(1);
  });
});

describe('evaluateExperiment - never over-claims', () => {
  it('simulated data never gets a winner, even with a large gap', () => {
    const r = evaluateExperiment(stats([1000, 300, 200], [1000, 100, 20]), { simulated: true });
    expect(r.verdict).toBe('simulated');
    expect(r.message).toContain('Simulated campaign data');
    expect(r).not.toHaveProperty('leader');
  });
  it('small samples are "insufficient_data"', () =>
    expect(evaluateExperiment(stats([50, 10, 5], [500, 100, 50]), { simulated: false }).verdict).toBe('insufficient_data'));
  it('a small gap with enough data is "no_clear_difference"', () => {
    const r = evaluateExperiment(stats([500, 100, 50], [500, 100, 55]), { simulated: false });
    expect(r.verdict).toBe('no_clear_difference');
  });
  it('a large significant gap names the leader and reports the p-value', () => {
    const r = evaluateExperiment(stats([1000, 200, 50], [1000, 250, 80]), { simulated: false });
    expect(r).toMatchObject({ verdict: 'leading', leader: 'B' });
    expect((r as { pValue: number }).pValue).toBeLessThan(0.05);
  });
  it('declines to evaluate more than two variants', () => {
    const three = buildVariantStats([...variants, { key: 'C', label: 'c' }], { A: { impression: 500 }, B: { impression: 500 }, C: { impression: 500 } });
    expect(evaluateExperiment(three, { simulated: false }).verdict).toBe('not_evaluated');
  });
});

describe('canTransition', () => {
  it('allows draft -> running and running -> completed only', () => {
    expect(canTransition('draft', 'running')).toBe(true);
    expect(canTransition('running', 'completed')).toBe(true);
    for (const [a, b] of [['draft', 'completed'], ['completed', 'running'], ['running', 'draft'], ['running', 'running'], ['completed', 'draft']] as const) expect(canTransition(a, b), `${a}->${b}`).toBe(false);
  });
});
