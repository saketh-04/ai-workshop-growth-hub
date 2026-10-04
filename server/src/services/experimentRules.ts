import { SIMULATED_LABEL, ratio } from './analyticsRules';

export interface VariantStats {
  key: string;
  label: string;
  impressions: number;
  clicks: number;
  conversions: number;
  clickRate: number;
  conversionRate: number; // conversions / impressions
}
export type VariantCounts = Record<string, Partial<Record<'impression' | 'click' | 'conversion', number>>>;

export function buildVariantStats(variants: { key: string; label: string }[], counts: VariantCounts): VariantStats[] {
  return variants.map((v) => {
    const c = counts[v.key] ?? {};
    const impressions = c.impression ?? 0;
    const clicks = c.click ?? 0;
    const conversions = c.conversion ?? 0;
    return { ...v, impressions, clicks, conversions, clickRate: ratio(clicks, impressions), conversionRate: ratio(conversions, impressions) };
  });
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26 erf approximation, error < 1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return 0.5 * (1 + (z >= 0 ? erf : -erf));
}

/** Two-sided p-value for "do these two conversion rates differ?" (two-proportion z-test). */
export function twoProportionPValue(x1: number, n1: number, x2: number, n2: number): number {
  if (n1 <= 0 || n2 <= 0) return 1;
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (se === 0) return 1;
  const z = (x1 / n1 - x2 / n2) / se;
  return 2 * (1 - normalCdf(Math.abs(z)));
}

export type Readout =
  | { verdict: 'simulated'; message: string }
  | { verdict: 'insufficient_data'; message: string }
  | { verdict: 'not_evaluated'; message: string }
  | { verdict: 'no_clear_difference'; message: string; pValue: number }
  | { verdict: 'leading'; message: string; pValue: number; leader: string };

/**
 * Deliberately conservative. It never names a winner for simulated data, for small samples,
 * or when the difference could plausibly be noise.
 */
export function evaluateExperiment(
  variants: VariantStats[],
  opts: { simulated: boolean; minImpressions?: number; alpha?: number },
): Readout {
  const minImpressions = opts.minImpressions ?? 100;
  const alpha = opts.alpha ?? 0.05;

  if (opts.simulated) {
    return {
      verdict: 'simulated',
      message: `${SIMULATED_LABEL}. These numbers only illustrate how the dashboard reads; they are not evidence that any variant performs better.`,
    };
  }
  if (variants.some((v) => v.impressions < minImpressions)) {
    return {
      verdict: 'insufficient_data',
      message: `Not enough data yet. Every variant needs at least ${minImpressions} impressions before comparing.`,
    };
  }
  if (variants.length !== 2) {
    return { verdict: 'not_evaluated', message: 'The significance check currently supports exactly two variants.' };
  }
  const [a, b] = variants;
  const pValue = Math.round(twoProportionPValue(a.conversions, a.impressions, b.conversions, b.impressions) * 1000) / 1000;
  if (pValue >= alpha) {
    return {
      verdict: 'no_clear_difference',
      pValue,
      message: `No clear difference (p = ${pValue}). Keep collecting data before choosing a variant.`,
    };
  }
  const leader = a.conversionRate > b.conversionRate ? a : b;
  return {
    verdict: 'leading',
    pValue,
    leader: leader.key,
    message: `Variant ${leader.key} converts higher (p = ${pValue}). This reflects only the traffic tracked in this experiment.`,
  };
}

export type ExperimentStatus = 'draft' | 'running' | 'completed';
/** Lifecycle: draft -> running -> completed. No restarts, so a finished experiment's numbers stay final. */
export function canTransition(from: ExperimentStatus, to: ExperimentStatus): boolean {
  return (from === 'draft' && to === 'running') || (from === 'running' && to === 'completed');
}
