import { z } from 'zod';
import { REFERRAL_CODE_REGEX } from '../utils/referralCode';

/** HTML forms send "" for blank optional fields; treat that as "not provided". */
export const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const referralCodeField = z.preprocess(
  emptyToUndefined,
  z.string().trim().toUpperCase().regex(REFERRAL_CODE_REGEX, 'Invalid referral code format').optional(),
);

export const codeParamSchema = z.object({
  code: z.string().trim().toUpperCase().regex(REFERRAL_CODE_REGEX, 'Invalid referral code format'),
});

/** MongoDB ObjectId as a 24-char hex string. Validating the shape keeps odd input out of queries. */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParamSchema = z.object({ id: objectIdSchema });
