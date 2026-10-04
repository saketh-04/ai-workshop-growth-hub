import { z } from 'zod';
import { objectIdSchema } from './common';
import { trackingField } from './registration';

/** Single registry of every event the product can emit. Add new events here first. */
export const EVENT_TYPES = [
  'landing_page_view',
  'registration_started',
  'registration_completed',
  'referral_link_clicked',
  'referral_registration',
  'share_clicked',
  'ai_project_generated',
  'experiment_impression',
  'experiment_conversion',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Events a browser may report. The rest are emitted by the server itself (registration, referral,
 * AI, experiments), so a client can't inflate conversion numbers by posting fake ones.
 */
export const CLIENT_EVENT_TYPES = [
  'landing_page_view',
  'registration_started',
  'referral_link_clicked',
  'share_clicked',
] as const satisfies readonly EventType[];

// Keys must be plain identifiers: blocks "$operator" and "a.b" paths from entering the Mixed metadata field.
const metadataSchema = z
  .record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,39}$/, 'Invalid metadata key'), z.union([z.string().max(200), z.number(), z.boolean()]))
  .refine((m) => Object.keys(m).length <= 10, { message: 'At most 10 metadata keys' });

export const trackEventSchema = z.object({
  eventType: z.enum(CLIENT_EVENT_TYPES),
  userId: objectIdSchema.optional(),
  source: trackingField,
  metadata: metadataSchema.optional(),
});

export const datasetQuerySchema = z.object({
  dataset: z.enum(['all', 'real', 'demo']).default('all'),
});
