import { ActiveExperiment, api } from './api';
import { readJson, writeJson } from './storage';
import { getStudent } from './student';

export const DEFAULT_CTA = 'Reserve My Spot';
export const CTA_EXPERIMENT_NAME = 'registration cta';

export interface Assignment { experimentId: string; variantKey: string; label: string }
const ASSIGN_KEY = 'gh_cta_assignment';

/** Pure: uniform random variant. `random` is injectable for tests. */
export function pickVariant<T>(variants: T[], random: () => number = Math.random): T {
  return variants[Math.min(variants.length - 1, Math.floor(random() * variants.length))];
}

/** Pure: the running experiment that controls the main CTA label, if the admin created one. */
export function findCtaExperiment(list: ActiveExperiment[]): ActiveExperiment | undefined {
  return list.find((e) => e.name.trim().toLowerCase() === CTA_EXPERIMENT_NAME && e.variants.length >= 2);
}

/** Sticky assignment: a student sees the same wording on every visit. Falls back to null (default CTA) on any problem. */
export async function resolveAssignment(): Promise<Assignment | null> {
  try {
    const exp = findCtaExperiment(await api.activeExperiments());
    if (!exp) return null;
    const saved = readJson<Assignment>('local', ASSIGN_KEY);
    const still = saved && saved.experimentId === exp.id ? exp.variants.find((v) => v.key === saved.variantKey) : undefined;
    const variant = still ?? pickVariant(exp.variants);
    const a = { experimentId: exp.id, variantKey: variant.key, label: variant.label };
    writeJson('local', ASSIGN_KEY, a);
    return a;
  } catch {
    return null;
  }
}

/** impression / click are once per session; conversion is once ever per assignment. Never throws. */
export function reportExperiment(type: 'impression' | 'click' | 'conversion', a: Assignment): void {
  const scope = type === 'conversion' ? 'local' : 'session';
  const key = `gh_exp_${type}_${a.experimentId}`;
  if (readJson<boolean>(scope, key)) return;
  writeJson(scope, key, true);
  void api.experimentEvent(a.experimentId, { variantKey: a.variantKey, eventType: type, userId: getStudent()?.id }).catch(() => undefined);
}
