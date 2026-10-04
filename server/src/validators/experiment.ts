import { z } from 'zod';
import { emptyToUndefined, objectIdSchema } from './common';

const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());

export const createExperimentSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    hypothesis: z.string().trim().max(300).default(''),
    description: z.string().trim().max(500).default(''),
    variants: z
      .array(
        z.object({
          key: z.string().trim().regex(/^[A-Za-z0-9_-]{1,20}$/, 'Use letters, numbers, - or _ (max 20)'),
          label: z.string().trim().min(1).max(80),
        }),
      )
      .min(2)
      .max(4)
      .refine((v) => new Set(v.map((x) => x.key)).size === v.length, { message: 'Variant keys must be unique' }),
    status: z.enum(['draft', 'running', 'completed']).default('draft'),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((e) => !e.startDate || !e.endDate || e.endDate > e.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });
export type CreateExperimentInput = z.infer<typeof createExperimentSchema>;

export const EXPERIMENT_EVENT_TYPES = ['impression', 'click', 'conversion'] as const;
export const experimentEventSchema = z.object({
  variantKey: z.string().trim().regex(/^[A-Za-z0-9_-]{1,20}$/),
  eventType: z.enum(EXPERIMENT_EVENT_TYPES),
  userId: objectIdSchema.optional(),
});

export const updateExperimentStatusSchema = z.object({ status: z.enum(['running', 'completed']) });
