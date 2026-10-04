import path from 'path';
import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDb } from './config/db';
import { loadEnv } from './config/env';
import { createAuthService, resolvePasswordHash } from './services/authService';

// Loads <repo-root>/.env (works for both tsx src/ and compiled dist/).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const env = loadEnv();
  await connectDb(env.MONGODB_URI);
  console.log('[db] connected');

  const auth = createAuthService({
    adminEmail: env.ADMIN_EMAIL,
    passwordHash: await resolvePasswordHash(env),
    jwtSecret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const app = createApp({
    auth,
    clientOrigin: env.CLIENT_ORIGIN,
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL,
    rateLimitEnabled: env.NODE_ENV !== 'test',
  });
  console.log(`[ai] mode: ${env.OPENAI_API_KEY ? 'OpenAI' : 'fallback (no OPENAI_API_KEY)'}`);
  app.listen(env.PORT, () => console.log(`[server] listening on :${env.PORT}`));
}

main().catch((err) => {
  console.error('[fatal]', err instanceof Error ? err.message : err);
  process.exit(1);
});
