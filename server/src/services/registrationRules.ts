import { SOURCES } from '../validators/registration';

type Source = (typeof SOURCES)[number];

/**
 * Which channel gets the credit for this registration?
 * credited referral > explicit UTM source > what the student told us.
 */
export function resolveChannel(p: { referralCredited: boolean; utmSource?: string; selfReported: Source }): string {
  if (p.referralCredited) return 'referral';
  if (p.utmSource) return p.utmSource;
  return p.selfReported;
}

/** Human-friendly registration ID shown on the "You're in!" screen. */
export function formatRegistrationId(objectId: string): string {
  return `AIW-${objectId.slice(-8).toUpperCase()}`;
}
