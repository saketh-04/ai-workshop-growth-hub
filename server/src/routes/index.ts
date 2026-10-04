import { RequestHandler, Router } from 'express';
import * as ai from '../controllers/aiController';
import * as analytics from '../controllers/analyticsController';
import * as experiments from '../controllers/experimentController';
import * as auth from '../controllers/authController';
import * as leaderboard from '../controllers/leaderboardController';
import * as referral from '../controllers/referralController';
import * as registration from '../controllers/registrationController';
import { authenticateAdmin } from '../middleware/authenticateAdmin';
import { validate } from '../middleware/validate';
import { AppConfig } from '../app';
import { projectIdeaRequestSchema } from '../validators/ai';
import { loginSchema } from '../validators/auth';
import { trackEventSchema, datasetQuerySchema } from '../validators/analytics';
import { codeParamSchema, idParamSchema } from '../validators/common';
import { createExperimentSchema, experimentEventSchema, updateExperimentStatusSchema } from '../validators/experiment';
import { trackReferralSchema } from '../validators/referral';
import { registerSchema } from '../validators/registration';

type Limiter = (max: number, windowMs: number) => RequestHandler;
const MIN = 60_000;

export function buildRouter(cfg: AppConfig, limit: Limiter): Router {
  const r = Router();
  const admin = authenticateAdmin(cfg.auth);
  const dataset = validate(datasetQuerySchema, 'query');

  r.post('/auth/login', limit(10, 15 * MIN), validate(loginSchema), auth.login(cfg.auth));
  r.get('/auth/me', admin, auth.me);

  // Generous per-IP cap: many students share one college Wi-Fi IP.
  r.post('/registrations', limit(100, 60 * MIN), validate(registerSchema), registration.create);

  r.post('/referrals/track', limit(60, MIN), validate(trackReferralSchema), referral.track);
  r.get('/referrals/:code', validate(codeParamSchema, 'params'), referral.getByCode);

  r.get('/leaderboard', leaderboard.list);

  r.post(
    '/ai/project-idea',
    limit(15, MIN),
    validate(projectIdeaRequestSchema),
    ai.projectIdea({ apiKey: cfg.openaiApiKey, model: cfg.openaiModel }),
  );

  // Public, write-only, best-effort event intake (client-safe event types only).
  r.post('/analytics/events', limit(120, MIN), validate(trackEventSchema), analytics.track);

  // Admin-only reads.
  r.get('/analytics/overview', admin, dataset, analytics.overview);
  r.get('/analytics/channels', admin, dataset, analytics.channels);
  r.get('/analytics/funnel', admin, dataset, analytics.funnel);
  r.get('/analytics/referrals', admin, dataset, analytics.referrals);

  // Public + read-only; must be registered before '/experiments/:id'.
  r.get('/experiments/active', experiments.listActive);
  r.get('/experiments', admin, experiments.list);
  r.post('/experiments', admin, validate(createExperimentSchema), experiments.create);
  r.patch('/experiments/:id/status', admin, validate(idParamSchema, 'params'), validate(updateExperimentStatusSchema), experiments.setStatus);
  r.get('/experiments/:id', admin, validate(idParamSchema, 'params'), experiments.get);
  // Public so the landing page can report impressions/clicks/conversions; limited and variant-checked.
  r.post('/experiments/:id/event', limit(120, MIN), validate(idParamSchema, 'params'), validate(experimentEventSchema), experiments.recordEvent);
  return r;
}
