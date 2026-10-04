import { ClientEvent, api } from './api';
import { getAttribution } from './attribution';
import { readJson, writeJson } from './storage';
import { getStudent } from './student';

/**
 * Fire-and-forget: analytics must never slow down or break the UI.
 * Only the four client-reportable events go through here; the server itself records
 * registration_completed, referral_registration, ai_project_generated and experiment_* events.
 * (referral_link_clicked is recorded by POST /api/referrals/track, so it is not sent twice.)
 */
export function track(eventType: ClientEvent, metadata?: Record<string, string | number | boolean>): void {
  void api.event({ eventType, source: getAttribution().utmSource, userId: getStudent()?.id, metadata }).catch(() => undefined);
}

/** Once per browser session per key (e.g. a page view must not fire on every re-render or navigation). */
export function trackOnce(eventType: ClientEvent, key: string = eventType): void {
  const k = `gh_once_${key}`;
  if (readJson<boolean>('session', k)) return;
  writeJson('session', k, true);
  track(eventType);
}
