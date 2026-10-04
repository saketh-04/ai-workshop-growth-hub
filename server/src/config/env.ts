import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('8h'),
    ADMIN_EMAIL: z.string().email(),
    // Provide either a plain password (hashed at boot) or a ready bcrypt hash (preferred in production).
    ADMIN_PASSWORD: z.string().min(8).optional(),
    ADMIN_PASSWORD_HASH: z.string().startsWith('$2').optional(),
    CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  })
  .refine((e) => e.ADMIN_PASSWORD || e.ADMIN_PASSWORD_HASH, {
    message: 'Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH',
    path: ['ADMIN_PASSWORD'],
  });

export type Env = z.infer<typeof envSchema>;

/** Validates env vars once at boot. Empty strings are treated as "not set". */
export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v !== ''));
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
