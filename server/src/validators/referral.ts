import { z } from 'zod';
import { REFERRAL_CODE_REGEX } from '../utils/referralCode';

export const trackReferralSchema = z.object({
  code: z.string().trim().toUpperCase().regex(REFERRAL_CODE_REGEX, 'Invalid referral code format'),
});
