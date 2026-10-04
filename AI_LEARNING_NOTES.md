# AI + Learning Notes

## How AI was used
The whole application was built in one working session with an AI assistant (Claude), phase by phase: server core, analytics and experiments, public client, admin console, then documentation. I wrote the requirements and guardrails, reviewed each phase, and stopped it between phases. The AI wrote most of the code; I decided what the product should do, what it must never claim, and what counted as "verified".

**Scope decision:** I asked for a working growth platform, not just a landing page, because the brief's constraint is ₹2,000 and 500 registrations. A landing page can't tell you which channel deserves the money; referral mechanics and measurement can. Every feature had to answer "what growth problem does this solve?"

The three examples below are real decisions from that process.

---

## 1. Events the browser must not be trusted with

**What I asked.** In the backend phase: track nine analytics events (`registration_completed`, `referral_registration`, `experiment_conversion`, and so on) and power the dashboard from them. In the client phase I then asked for the frontend to integrate *all* of them, including `registration_completed`, `ai_project_generated` and `experiment_conversion`.

**What AI suggested.** One registry of event types, and a split: only four events can be sent by a browser (`landing_page_view`, `registration_started`, `referral_link_clicked`, `share_clicked`). The server records the other five itself, at the moment the registration, AI call or experiment event actually happens. Completed registrations in the funnel come from the `Registration` collection, not from events. Metadata keys beginning with `$` or containing `.` are rejected. When I asked for browser-side tracking of everything, the AI did not build it; it explained that those events are already recorded server-side and sending them again from the browser would only add a way to fake them.

**What I changed.** My own request. I accepted the server-side design and dropped the idea of the browser reporting conversions.

**Why.** The dashboard exists to decide where ₹2,000 goes. If anyone can inflate it with a single `curl`, it misleads that decision.

**What I learned.** Decide who is allowed to say something before deciding what the system records. The server tests send forged events and expect a 400.

---

## 2. Simulated data is not results

**What I asked.** Realistic demo data so the product can be shown without 500 real students, and an experiment view that shows which variant performs better, but without claiming real-world results.

**What AI suggested.** Flag every seeded record (`isDemo` / `isSimulated`), add an All / Real / Demo switch to every dashboard query, and label any view containing seeded rows "Simulated campaign data".

**What I changed.** The brief and my later instruction pulled in different directions: show the better variant on demo data, versus never claim a variant is better on simulated data. I resolved it in favour of honesty. The experiment readout is computed on the server, and for simulated experiments its verdict is always "simulated" with no leader. For real data it names a leader only with at least 100 impressions per variant and p < 0.05. I rejected any chart or sentence that ranks seeded variants.

**Why.** Seeded numbers are invented. Declaring a "winner" on them would be fabricating a result, in an interview about a data-driven role.

**What I learned.**
- Demo data exists to exercise the UI. Conclusions need real traffic.
- A statistical test also taught me a limit of my own plan: with roughly 800 visits, the CTA test can only detect a large lift (about 10 points). "No clear difference" is a legitimate outcome.

---

## 3. AI that cannot break registration

**What I asked.** Use the OpenAI API for personalized project ideas as structured JSON, never expose the key to the browser, and make the app work without an API key.

**What AI suggested.** A server-side call with a fixed category list (so no user-typed text reaches the prompt), model output validated like untrusted input (including a rule that the 60-minute plan must add up to exactly 60 minutes, or the result is discarded), and a deterministic fallback per category. Any failure (no key, timeout, bad JSON, wrong shape) returns the fallback, so the service never throws and registration cannot depend on it. The UI also says when a suggestion is "curated" rather than AI-generated.

**What I changed.** Nothing substantive. I reviewed this and accepted it as designed. The requirements it satisfies (structured JSON, key stays on the server, works without a key) were mine; the validation details were the AI's.

**What I learned.** Treat LLM output as untrusted input, and make the AI feature degrade gracefully. **Honest limit:** the live OpenAI call has never been run. It is tested only with a mocked response.

---

## Where the AI got things wrong (caught during the build)
- **A wrong test.** The first draft of a self-referral integration test expected the wrong outcome. A Gmail alias of an existing email is rejected as a duplicate (409) before it can be credited. Fixed during review, before the test was ever run.
- **A broken shell command.** `mkdir -p a/{b,c}` doesn't expand in `/bin/sh` and created folders literally named `{src`. The odd output was noticed, the folders deleted and recreated explicitly.
- **A missing icon.** The client failed to compile because the icon library dropped its LinkedIn icon.
- **A failing test that was a test bug.** A render test failed because React inserts comment markers between text nodes. The page was right; the test helper was wrong, so the helper was fixed, not the page.
- **A deployment bug found while preparing this submission.** The client build type-checked test files that import server code, which would have failed on Vercel. Fixed by building from `src` only, and proved by building with the server's dependencies removed.
- **Tests that can fail.** The AI temporarily broke the admin route guard, the self-referral rule, and the "simulated data names no winner" rule. Tests failed each time, then I restored the code.

**Biggest lesson:** AI is fast at producing plausible code, but "plausible" and "verified" are different. The test suite passes, but MongoDB was not available while building, so the database layer, aggregations and seed persistence have **not** been run. I list that openly instead of claiming it works.

---

*Author's note (delete before submitting): this file was drafted from the actual development history. Edit it into your own voice, and keep only statements that are true for you. If you ran the MongoDB integration tests or deployed before submitting, update the "honest limit" lines.*
