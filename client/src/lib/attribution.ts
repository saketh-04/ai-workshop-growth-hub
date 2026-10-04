import { readJson, writeJson } from './storage';

export interface Attribution { utmSource?: string; utmMedium?: string; utmCampaign?: string; ref?: string }
const KEY = 'gh_attribution';
const SAFE = /^[\w\- .]{1,60}$/; // same character set the server accepts for UTM values
const REF = /^[A-Z]{1,6}[A-Z2-9]{3}$/; // same shape as a server-generated referral code

/** Pure: pull utm_* and ref out of a query string, dropping anything the server would reject. */
export function parseAttribution(search: string): Attribution {
  const q = new URLSearchParams(search);
  const clean = (v: string | null) => (v && SAFE.test(v.trim()) ? v.trim() : undefined);
  const ref = q.get('ref')?.trim().toUpperCase();
  return {
    utmSource: clean(q.get('utm_source')),
    utmMedium: clean(q.get('utm_medium')),
    utmCampaign: clean(q.get('utm_campaign')),
    ref: ref && REF.test(ref) ? ref : undefined,
  };
}

/** Pure: new values win, but a visit with no params keeps the earlier campaign attribution for the session. */
export function mergeAttribution(previous: Attribution, incoming: Attribution): Attribution {
  const defined = Object.fromEntries(Object.entries(incoming).filter(([, v]) => v !== undefined));
  return { ...previous, ...defined };
}

export const getAttribution = (): Attribution => readJson<Attribution>('session', KEY) ?? {};

export function captureAttribution(search = window.location.search): Attribution {
  const merged = mergeAttribution(getAttribution(), parseAttribution(search));
  writeJson('session', KEY, merged);
  return merged;
}
