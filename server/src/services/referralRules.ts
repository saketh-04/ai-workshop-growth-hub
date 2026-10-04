import { canonicalEmail } from '../utils/email';

export type NotCreditedReason = 'no_code' | 'invalid_code' | 'self_referral' | 'already_referred';
export type ReferralDecision = { credited: true } | { credited: false; reason: NotCreditedReason };

/**
 * Pure decision: should this registration be credited to the referrer?
 * A rejected referral never blocks the signup itself - we only withhold the credit.
 */
export function evaluateReferral(p: {
  code?: string;
  referrer: { email: string } | null; // result of looking the code up; null = no such code
  newEmail: string;
  alreadyReferred: boolean; // this student already has a referral credited
}): ReferralDecision {
  if (!p.code) return { credited: false, reason: 'no_code' };
  if (!p.referrer) return { credited: false, reason: 'invalid_code' };
  if (canonicalEmail(p.referrer.email) === canonicalEmail(p.newEmail)) {
    return { credited: false, reason: 'self_referral' };
  }
  if (p.alreadyReferred) return { credited: false, reason: 'already_referred' };
  return { credited: true };
}

/** successful / clicks, safe for 0 clicks, capped at 100% (signups can arrive without a tracked click). */
export function conversionRate(successful: number, clicks: number): number {
  if (clicks <= 0) return 0;
  return Math.min(1, Math.round((successful / clicks) * 1000) / 1000);
}
