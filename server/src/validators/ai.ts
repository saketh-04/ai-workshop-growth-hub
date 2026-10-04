import { z } from 'zod';
import { objectIdSchema } from './common';

export const PROJECT_CATEGORIES = ['productivity', 'education', 'healthcare', 'finance', 'career', 'other'] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

// Category is an enum on purpose: no free text ever reaches the LLM prompt (no prompt injection surface).
export const projectIdeaRequestSchema = z.object({
  category: z.enum(PROJECT_CATEGORIES),
  userId: objectIdSchema.optional(), // lets analytics tie the event to a student
});

/** Shape the LLM output must satisfy. The 60-minute rule is enforced, not just requested. */
export const projectIdeaSchema = z.object({
  title: z.string().min(3).max(80),
  oneLiner: z.string().min(10).max(200),
  techStack: z.array(z.string().min(1).max(40)).min(2).max(6),
  difficulty: z.enum(['Beginner', 'Intermediate']),
  outline: z
    .array(z.object({ minutes: z.number().int().positive(), step: z.string().min(3).max(160) }))
    .min(3)
    .max(8)
    .refine((steps) => steps.reduce((sum, s) => sum + s.minutes, 0) === 60, {
      message: 'Outline must add up to exactly 60 minutes',
    }),
});
export type ProjectIdea = z.infer<typeof projectIdeaSchema>;
