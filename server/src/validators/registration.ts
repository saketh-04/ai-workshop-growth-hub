import { z } from 'zod';
import { emptyToUndefined, referralCodeField } from './common';

export const SOURCES = ['whatsapp', 'college_club', 'linkedin', 'instagram', 'referral', 'other'] as const;
export const MIN_GRAD_YEAR = 2025;
export const MAX_GRAD_YEAR = 2030;

export const trackingField = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(60)
    .regex(/^[\w\- .]+$/, 'Only letters, numbers, spaces, - and _ allowed')
    .transform((s) => s.toLowerCase().replace(/\s+/g, '_'))
    .optional(),
);

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(120),
  college: z.string().trim().min(2).max(120),
  branch: z.string().trim().min(2).max(80),
  graduationYear: z.coerce.number().int().min(MIN_GRAD_YEAR).max(MAX_GRAD_YEAR),
  phone: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
      .optional(),
  ),
  source: z.enum(SOURCES),
  referralCode: referralCodeField,
  utmSource: trackingField,
  utmMedium: trackingField,
  utmCampaign: trackingField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
