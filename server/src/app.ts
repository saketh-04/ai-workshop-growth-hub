import cors from 'cors';
import express, { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { errorHandler, notFound } from './middleware/errorHandler';
import { buildRouter } from './routes';
import { AuthService } from './services/authService';

export interface AppConfig {
  auth: AuthService;
  clientOrigin: string; // comma-separated list allowed
  openaiApiKey?: string;
  openaiModel: string;
  rateLimitEnabled: boolean;
}

export function createApp(cfg: AppConfig) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind Render's proxy: real client IP for rate limiting

  app.use(helmet());
  app.use(cors({ origin: cfg.clientOrigin.split(',').map((o) => o.trim()) }));
  app.use(express.json({ limit: '10kb' }));
  // NoSQL-injection note: every input is parsed by Zod into plain strings/numbers/enums,
  // so objects like {"$gt": ""} are rejected before they can reach a Mongo query.

  const limit = (max: number, windowMs: number): RequestHandler =>
    cfg.rateLimitEnabled
      ? rateLimit({
          windowMs,
          max,
          standardHeaders: true,
          legacyHeaders: false,
          message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } },
        })
      : (_req, _res, next) => next();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
  });
  app.use('/api', limit(300, 15 * 60_000), buildRouter(cfg, limit));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
