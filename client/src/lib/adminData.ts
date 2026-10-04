import { SOURCE_LABELS } from './validation';
import type { Channels, CreateExperimentPayload, FunnelStep, Overview, Readout } from './adminApi';

export const pct = (n: number): string => `${Math.round(n * 1000) / 10}%`;

export function channelLabel(name: string): string {
  if (name === 'college_club') return 'College clubs'; // plural in the admin view, singular in the registration dropdown
  if (name === 'referral') return 'Referral';
  return (SOURCE_LABELS as Record<string, string>)[name] ?? name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/** The channel with the most registrations, or null when there are none. */
export function topChannel(c: Pick<Channels, 'bySource'>): { name: string; registrations: number; share: number } | null {
  const best = [...c.bySource].sort((a, b) => b.registrations - a.registrations)[0];
  return best && best.registrations > 0 ? { name: best.name, registrations: best.registrations, share: best.share } : null;
}

export const CANONICAL_CHANNELS = ['whatsapp', 'college_club', 'linkedin', 'instagram', 'referral', 'other'] as const;

/**
 * Always the six channels from the brief, in that order (zeros included). Any other UTM source
 * (e.g. "facebook") is folded into "Other". Conversion is only shown where landing views were tracked.
 */
export function channelRows(c: Pick<Channels, 'bySource'>): { key: string; label: string; registrations: number; share: number; landingViews: number | null; conversionRate: number | null }[] {
  const total = c.bySource.reduce((s, r) => s + r.registrations, 0);
  const groups = new Map<string, Channels['bySource']>(CANONICAL_CHANNELS.map((k) => [k, []]));
  for (const r of c.bySource) groups.get((CANONICAL_CHANNELS as readonly string[]).includes(r.name) ? r.name : 'other')!.push(r);
  return CANONICAL_CHANNELS.map((key) => {
    const rows = groups.get(key)!;
    const registrations = rows.reduce((s, r) => s + r.registrations, 0);
    const withViews = rows.filter((r) => r.landingViews);
    const views = withViews.reduce((s, r) => s + (r.landingViews ?? 0), 0);
    const regsWithViews = withViews.reduce((s, r) => s + r.registrations, 0);
    return {
      key, label: channelLabel(key), registrations, share: total ? Math.round((registrations / total) * 1000) / 1000 : 0,
      landingViews: views || null, conversionRate: views ? Math.round((regsWithViews / views) * 1000) / 1000 : null,
    };
  });
}

export function trendRows(daily: Overview['daily']) {
  return daily.map((d) => ({ label: `Day ${d.day}`, date: d.date, registrations: d.registrations, referrals: d.referralRegistrations, cumulative: d.cumulative }));
}

/** Funnel bars scale to landing views; a non-zero step never collapses to an invisible sliver. */
export function funnelBars(steps: FunnelStep[]) {
  return steps.map((s) => ({ ...s, widthPct: s.count === 0 ? 0 : Math.max(3, Math.min(100, s.rateFromTop * 100)) }));
}

export type Tone = 'simulated' | 'neutral' | 'positive';
export const readoutTone = (r: Readout): Tone => (r.verdict === 'simulated' ? 'simulated' : r.verdict === 'leading' ? 'positive' : 'neutral');

export interface ExperimentForm { name: string; hypothesis: string; description: string; labelA: string; labelB: string; status: 'draft' | 'running' }
export type ExperimentFormErrors = Partial<Record<keyof ExperimentForm, string>>;

export function validateExperimentForm(f: ExperimentForm): ExperimentFormErrors {
  const e: ExperimentFormErrors = {};
  if (f.name.trim().length < 3) e.name = 'Give the experiment a name (at least 3 characters).';
  if (!f.labelA.trim()) e.labelA = 'Enter the wording for variant A.';
  if (!f.labelB.trim()) e.labelB = 'Enter the wording for variant B.';
  else if (f.labelA.trim() && f.labelA.trim().toLowerCase() === f.labelB.trim().toLowerCase()) e.labelB = 'Variant B must differ from variant A.';
  return e;
}

export const buildExperimentPayload = (f: ExperimentForm): CreateExperimentPayload => ({
  name: f.name.trim(), hypothesis: f.hypothesis.trim(), description: f.description.trim(), status: f.status,
  variants: [{ key: 'A', label: f.labelA.trim() }, { key: 'B', label: f.labelB.trim() }],
});

/** Server issue paths like "variants.0.label" -> the form field they belong to. */
export function mapExperimentIssues(issues: { field: string; message: string }[]): ExperimentFormErrors {
  const out: ExperimentFormErrors = {};
  for (const i of issues) {
    if (i.field === 'name' || i.field === 'hypothesis' || i.field === 'description') out[i.field] = i.message;
    else if (i.field.startsWith('variants.0')) out.labelA = i.message;
    else if (i.field.startsWith('variants')) out.labelB = i.message;
  }
  return out;
}
