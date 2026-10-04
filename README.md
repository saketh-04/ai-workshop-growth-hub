# AI Workshop Growth Hub

> **Build. Share. Learn. Grow.**
> A workshop-acquisition and referral platform for *"Build Your First AI Project in 60 Minutes"*, with a growth console for deciding where to spend the budget.

## Read this first: real code vs simulated data
- **Real:** the application code, the APIs, the referral and analytics logic, and the automated tests.
- **Simulated:** every number produced by `npm run seed`. It is made-up demo data (129 registrations, referrals, events, an experiment) so the dashboards can be shown without real students. Any screen or API response that includes it is labelled **"Simulated campaign data"**.
- **Not real:** no NxtWave results, real students, real campaign performance, real experiment winners or testimonials exist anywhere in this project. The 500-registration model in `GROWTH_PLAN.md` is a set of assumptions.
- **Not yet verified:** nothing has been run against a real MongoDB or deployed (see [Verification status](#verification-status)).

## Assessment context
NxtWave wants a free workshop to reach **500 final-year engineering-student registrations in 7 days on a ₹2,000 budget** (a simulation: no one is contacted). The assessment asks for a growth plan, one working asset, AI + learning notes and a 3-minute video. This repo is the working asset. The other deliverables are in [`GROWTH_PLAN.md`](GROWTH_PLAN.md), [`AI_LEARNING_NOTES.md`](AI_LEARNING_NOTES.md) and [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md); [`FINAL_SUBMISSION_CHECKLIST.md`](FINAL_SUBMISSION_CHECKLIST.md) maps everything to the requirements.

## Features
Each feature answers a growth question:

| Feature | Growth problem it solves |
|---|---|
| Conversion-focused landing page, 1-minute registration | Turn visits into registrations |
| UTM + referral capture | Know which channel each registration came from |
| Referral links, dashboard, public leaderboard | Organic acquisition: each student brings friends |
| Personalized AI project idea with an exact 60-minute plan | Raise the perceived value of the workshop |
| Analytics events + funnel | See where people drop off |
| Channel performance | Decide where the ₹2,000 goes |
| A/B experiments with a conservative readout | Make wording decisions from data, not opinion |
| Simulated-data labelling + Real/Demo/All switch | Never confuse demo numbers with results |

## Architecture
```
Browser (React + Vite)  ──HTTPS/JSON──►  Express API  ──Mongoose──►  MongoDB
  public site + /admin                      │
                                            └──► OpenAI (optional; deterministic fallback)
```
Server layering: `routes → middleware (validate, authenticateAdmin) → controllers (thin) → services → models`. Pure, database-free business rules live in `*Rules.ts` so they can be unit-tested without MongoDB.

## Tech stack
**Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, React Router, Framer Motion, Recharts, Lucide, Axios.
**Backend:** Node.js 22, Express 4, TypeScript, Mongoose, Zod, JWT, bcrypt, Helmet, express-rate-limit.
**Data:** MongoDB (Atlas for production). **AI:** OpenAI Chat Completions via `fetch` (optional).
**Tests:** Vitest, Supertest.

## Frontend (`client/`)
| Route | Purpose |
|---|---|
| `/` | Landing page; experiment-aware CTA (default "Reserve My Spot") |
| `/register` | 7-field registration; reads `utm_*` and `ref`; shows who invited you |
| `/welcome` | "You're in!", registration ID, referral link, share buttons, AI project picker |
| `/dashboard`, `/dashboard/:code` | Student referral stats: clicks, referrals, conversion, rank |
| `/leaderboard` | Top referrers with masked names; labelled when data is simulated |
| `/admin/login`, `/admin`, `/admin/experiments` | Growth console (lazy-loaded; Recharts is not in the public bundle) |

There are no student accounts. The referral code saved in the browser after registration (or typed into `/dashboard`) is the key. Analytics calls are fire-and-forget and never block the UI.

## Backend (`server/`)
Errors always look like `{ "error": { "code", "message", "details?" } }`. Admin routes need `Authorization: Bearer <jwt>`.

**Public**

| Method & path | Notes |
|---|---|
| `GET /api/health` | Status + DB connection state |
| `POST /api/registrations` | Registers a student. 201 returns `registrationId`, `user.referralCode`, `referralPath`, `referral {credited, reason?}`. 409 on duplicate email (alias-proof). |
| `POST /api/referrals/track` | `{code}` counts a link click (204) |
| `GET /api/referrals/:code` | clicks, successful referrals, conversion rate, `rank` |
| `GET /api/leaderboard` | `{leaderboard, meta:{label}}` ranked, masked names |
| `POST /api/ai/project-idea` | `{category, userId?}` returns a structured idea; `source: "openai" \| "fallback"` |
| `POST /api/analytics/events` | Browser-reportable events only (see Analytics) |
| `GET /api/experiments/active` | Running, non-simulated experiments (no stats) |
| `POST /api/experiments/:id/event` | `{variantKey, eventType: impression\|click\|conversion}` |
| `POST /api/auth/login` | `{email, password}` returns `{token}` |

**Admin** (analytics accept `?dataset=all|real|demo`)

| Method & path | Returns |
|---|---|
| `GET /api/auth/me` | Current admin |
| `GET /api/analytics/overview` | totals, target, progress %, referral registrations, conversion, active referrers, 7-day series |
| `GET /api/analytics/channels` | registrations by source/medium/campaign; conversion only where views were tracked |
| `GET /api/analytics/funnel` | landing views → starts → registrations → referral registrations |
| `GET /api/analytics/referrals` | clicks, successful referrals, conversion, top referrers |
| `GET /api/experiments`, `GET /api/experiments/:id` | experiments with per-variant stats and a `readout` |
| `POST /api/experiments` | create (2-4 variants) |
| `PATCH /api/experiments/:id/status` | start (draft→running) or stop (running→completed); simulated experiments are read-only |

## MongoDB
Models: `User`, `Registration`, `Referral`, `Campaign`, `Experiment`, `ExperimentEvent`, `AnalyticsEvent`. Unique indexes on `User.canonicalEmail`, `User.referralCode`, `Registration.userId` and `Referral.referredUserId` are the real guard against duplicates and races. Seeded records carry `isDemo: true` (experiments: `isSimulated: true`) so a reset never touches real data. The database is configured only through `MONGODB_URI`. Link clicks are counted on `User.referralClicks`; `Referral` holds one row per credited referral.

## AI integration
`POST /api/ai/project-idea` takes a fixed category (no free text reaches the prompt) and asks OpenAI for JSON. The output is validated with Zod, including a rule that the plan adds to **exactly 60 minutes**. Any failure (no key, timeout, bad JSON, wrong shape) returns a deterministic curated idea, so the feature never throws and registration never depends on it. The key stays on the server. With no `OPENAI_API_KEY` the app runs in fallback mode.

## Referral system
Each student gets a code like `SAKETH7X4` and the link `/register?ref=CODE`. Rules (pure functions, unit-tested): unknown code → no credit; **self-referral blocked, including `+tag` and Gmail-dot aliases**; one credit per referred student; a rejected referral never blocks the signup. Duplicate emails are detected alias-proof (`canonicalEmail`).

## Analytics
Nine events: `landing_page_view`, `registration_started`, `registration_completed`, `referral_link_clicked`, `referral_registration`, `share_clicked`, `ai_project_generated`, `experiment_impression`, `experiment_conversion`.
**Browsers may send only four** (`landing_page_view`, `registration_started`, `referral_link_clicked`, `share_clicked`). The server records the other five itself, so the numbers can't be faked from the browser. Writes are best-effort and never break a request. The funnel's completed-registrations step comes from the `Registration` collection.

## Experiments
Create A/B tests in `/admin/experiments`. Name one exactly **"Registration CTA"** and start it to drive the landing-page button. Readout rules (computed on the server): simulated → `simulated`, **never a winner**; fewer than 100 impressions in a variant → `insufficient_data`; otherwise a two-proportion z-test, naming a leader only if p < 0.05. Lifecycle is draft → running → completed with no restarts.

## Admin dashboard
Sign in at `/admin/login` with `ADMIN_EMAIL` / your admin password. Shows registrations vs the 500 target, the 7-day chart, channel performance (WhatsApp, College clubs, LinkedIn, Instagram, Referral, Other), the funnel and referral performance, all computed from the database. The All / Real / Demo switch re-queries every panel.

## Folder structure
```
ai-workshop-growth-hub/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── admin/
│   │   │   ├── pages/
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── AdminExperiments.tsx
│   │   │   │   └── AdminLogin.tsx
│   │   │   ├── AdminShell.tsx
│   │   │   ├── parts.tsx
│   │   │   └── useAdminLoad.ts
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Outline.tsx
│   │   │   ├── ProjectPicker.tsx
│   │   │   ├── ShareButtons.tsx
│   │   │   └── ui.tsx
│   │   ├── lib/
│   │   │   ├── adminApi.ts
│   │   │   ├── adminAuth.ts
│   │   │   ├── adminData.ts
│   │   │   ├── api.ts
│   │   │   ├── attribution.ts
│   │   │   ├── experiment.ts
│   │   │   ├── share.ts
│   │   │   ├── storage.ts
│   │   │   ├── student.ts
│   │   │   ├── track.ts
│   │   │   ├── useCta.ts
│   │   │   └── validation.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── NotFound.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Welcome.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── tests/
│   │   ├── admin.contract.test.ts
│   │   ├── admin.logic.test.ts
│   │   ├── contract.test.ts
│   │   ├── logic.test.ts
│   │   └── render.test.tsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.build.json
│   ├── tsconfig.json
│   ├── vercel.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   └── env.ts
│   │   ├── controllers/
│   │   │   ├── aiController.ts
│   │   │   ├── analyticsController.ts
│   │   │   ├── authController.ts
│   │   │   ├── experimentController.ts
│   │   │   ├── leaderboardController.ts
│   │   │   ├── referralController.ts
│   │   │   └── registrationController.ts
│   │   ├── middleware/
│   │   │   ├── authenticateAdmin.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validate.ts
│   │   ├── models/
│   │   │   ├── AnalyticsEvent.ts
│   │   │   ├── Campaign.ts
│   │   │   ├── Experiment.ts
│   │   │   ├── ExperimentEvent.ts
│   │   │   ├── Referral.ts
│   │   │   ├── Registration.ts
│   │   │   └── User.ts
│   │   ├── routes/
│   │   │   └── index.ts
│   │   ├── seed/
│   │   │   ├── demoDataset.ts
│   │   │   ├── persist.ts
│   │   │   └── seed.ts
│   │   ├── services/
│   │   │   ├── aiFallback.ts
│   │   │   ├── aiService.ts
│   │   │   ├── analyticsRules.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── authService.ts
│   │   │   ├── experimentRules.ts
│   │   │   ├── experimentService.ts
│   │   │   ├── leaderboardRules.ts
│   │   │   ├── leaderboardService.ts
│   │   │   ├── referralRules.ts
│   │   │   ├── referralService.ts
│   │   │   ├── registrationRules.ts
│   │   │   └── registrationService.ts
│   │   ├── utils/
│   │   │   ├── asyncHandler.ts
│   │   │   ├── email.ts
│   │   │   ├── errors.ts
│   │   │   ├── istDate.ts
│   │   │   └── referralCode.ts
│   │   ├── validators/
│   │   │   ├── ai.ts
│   │   │   ├── analytics.ts
│   │   │   ├── auth.ts
│   │   │   ├── common.ts
│   │   │   ├── experiment.ts
│   │   │   ├── referral.ts
│   │   │   └── registration.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── api/
│   │   │   └── app.test.ts
│   │   ├── integration/
│   │   │   ├── analytics.int.test.ts
│   │   │   └── registration.int.test.ts
│   │   └── unit/
│   │       ├── ai.test.ts
│   │       ├── analyticsRules.test.ts
│   │       ├── analyticsValidators.test.ts
│   │       ├── auth.test.ts
│   │       ├── demoDataset.test.ts
│   │       ├── email.test.ts
│   │       ├── env.test.ts
│   │       ├── experimentRules.test.ts
│   │       ├── istDate.test.ts
│   │       ├── leaderboardRules.test.ts
│   │       ├── recordEvent.test.ts
│   │       ├── referralCode.test.ts
│   │       ├── referralRules.test.ts
│   │       ├── registrationRules.test.ts
│   │       └── validators.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.test.json
│   └── vitest.config.mts
├── .env.example
├── .gitignore
├── AI_LEARNING_NOTES.md
├── DEMO_SCRIPT.md
├── DEPLOYMENT.md
├── FINAL_SUBMISSION_CHECKLIST.md
├── GROWTH_PLAN.md
├── package.json
└── README.md
```

## Environment variables
Copy `.env.example` to `.env` at the **repo root** (never commit it). Names only; no real values live in this repo.

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Local `mongodb://127.0.0.1:27017/growth_hub` or an Atlas URI |
| `JWT_SECRET` | yes | 32+ random characters |
| `ADMIN_EMAIL` | yes | Demo admin login |
| `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` | one of them | Plain (hashed at boot) or a bcrypt hash (preferred in production) |
| `CLIENT_ORIGIN` | recommended | Comma-separated allowed frontend origins (CORS) |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | no | Empty key = fallback mode; model defaults to `gpt-4o-mini` |
| `PORT`, `NODE_ENV`, `JWT_EXPIRES_IN` | no | Defaults: 5000, development, 8h |
| `MONGODB_URI_TEST` | integration tests only | **A throwaway database. It is dropped!** |
| `VITE_API_URL` (`client/.env`) | production only | Deployed API origin; not a secret |

## Local setup
```bash
cp .env.example .env                 # fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run install:all                  # installs server + client
npm run seed                         # optional: load SIMULATED demo data
npm run dev                          # API on http://localhost:5000
npm run dev:client                   # site on http://localhost:5173 (proxies /api to the API)
```
**MongoDB Atlas setup** (free M0 cluster, database user, network access, connection string): see [`DEPLOYMENT.md`](DEPLOYMENT.md), step 1.

## Seed / demo data (simulated)
`npm run seed` replaces only the demo records, so it is safe to re-run and never deletes real students. `npm run seed:preview` prints what it would create without a database. It creates 129 registrations over 7 days (about 26% of the 500 target), 12 colleges, 7 branches, six channels, 27 referrals, about 1,500 analytics events and a simulated "Registration CTA" experiment. The ramps, channel weights and rates are illustrative assumptions made up for the demo. It refuses to run with `NODE_ENV=production` unless `--allow-production` is passed.

## Testing
```bash
npm run typecheck          # server + client (src and tests)
npm test                   # server 195 + client 70, no MongoDB needed
npm run test:integration   # 24 database tests; skipped unless MONGODB_URI_TEST is set
```
Server tests cover the business rules, validation, auth, the AI fallback, the seed dataset's internal consistency and the HTTP API (without a database). Client tests cover the logic, render smoke tests of every page, and contract tests that run the client's API layer against the real Express app in-process.

## Production build
```bash
npm run build              # compiles server (dist/) and client (client/dist/)
npm --prefix server start  # runs the compiled API (needs the env vars above)
```

## Deployment
MongoDB Atlas → Render (API) → Vercel (client). Exact steps, settings and environment variables are in [`DEPLOYMENT.md`](DEPLOYMENT.md). `client/vercel.json` already contains the single-page-app rewrite.

## Security notes
Helmet headers; CORS allow-list; 10 KB body limit; per-route rate limits (login 10/15 min, AI 15/min, registrations 100/hour per IP so a shared campus network isn't locked out); Zod validation on every input, so objects like `{"$ne": null}` are rejected before reaching MongoDB; metadata keys cannot contain `$` or `.`; bcrypt + JWT (HS256 only; the admin token lives in `sessionStorage`); secrets only from environment variables, never in the repo or the client bundle; admin routes behind `authenticateAdmin`; the seed script refuses production without an explicit flag.

## Demo limitations
- Seeded numbers are simulated and illustrative. They are not results.
- Referral codes are weak identifiers: anyone holding a code can view its counts.
- Registration is not wrapped in a transaction (standalone MongoDB doesn't support them), so a crash mid-way could leave a user without a Registration record.
- Public event endpoints are rate-limited but not de-duplicated, so counts are indicative.
- The public leaderboard shows the simulated label but cannot yet separate demo from real rows.
- LinkedIn sharing can only pass a link (no prefilled text); the copy button carries the full message.

## Verification status
**Verified** (in a sandbox with no MongoDB): type-check, production builds, and **195 server + 70 client tests passing**, including HTTP and contract tests that don't need a database.
**Not verified:** the Mongoose schemas and indexes, all aggregation queries, seed persistence (including that explicit `createdAt` dates are preserved), event recording against a live connection, the dashboard against real data, the **24 integration tests** (written but never run), the live OpenAI call, deployment, and the UI in a real browser. Run `npm run test:integration` against a throwaway database, then `npm run seed` and look at every screen before relying on any of it.
