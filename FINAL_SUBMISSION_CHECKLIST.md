# Final Submission Checklist

How to read this: **Ready** means the repo already contains the item. **You** means only you can do it (a real account, URL, recording or live test). Nothing here has been deployed or run against a real MongoDB by the assistant.

| ☐ | Item | NxtWave requirement | Status |
|---|---|---|---|
| [ ] | **Growth Plan** | Deliverable 1: Growth Plan (audience, channels, 7-day plan, ₹2,000 budget, path to 500) | **Ready:** `GROWTH_PLAN.md`. *You:* read it, make sure you can defend every assumption. It is ~2.5 pages; trim if the limit is strict. |
| [ ] | **Working Asset** | Deliverable 2: one working asset that supports the campaign | **Ready:** this codebase. *You:* run it and look at every screen. |
| [ ] | **AI + Learning Notes** | Deliverable 3: how you used AI, what you accepted/rejected, what you learned | **Ready:** `AI_LEARNING_NOTES.md` (drafted from the real development history). *You:* edit it into your voice, delete the author's note, update the "honest limit" lines if you tested more. |
| [ ] | **3-minute video** | Deliverable 4: 3-minute video | **Ready:** `DEMO_SCRIPT.md`. *You:* record it (5-min setup is at the top of the script). |
| [ ] | **Live frontend URL** | A working asset someone can open | *You:* deploy to Vercel (`DEPLOYMENT.md` §5). No URL exists yet. |
| [ ] | **Backend deployed** | The asset works end to end | *You:* deploy to Render (`DEPLOYMENT.md` §4); `/api/health` must return `ok`. |
| [ ] | **MongoDB connected** | Real data layer | *You:* Atlas (`DEPLOYMENT.md` §1); `/api/health` must show `"db":"connected"`. |
| [ ] | **Database tests run** | Confidence the data layer works | *You:* `MONGODB_URI_TEST=… npm run test:integration` → 24 tests run (all were skipped in the build environment). Fix failures before submitting. |
| [ ] | **Registration tested** | Core funnel works | *You:* register a test student on the live site; check duplicate email → friendly error. |
| [ ] | **Referral tested** | Referral mechanics (organic acquisition) | *You:* register a second student via the first one's link; confirm credit, dashboard and leaderboard; try a self-referral with a `+tag` email. |
| [ ] | **AI tested** | AI used meaningfully | *You:* pick each category once. If you add `OPENAI_API_KEY`, test the live path (never run so far). |
| [ ] | **Dashboard tested** | Measurement / data-driven decisions | *You:* seed, open `/admin`, check every panel and the All/Real/Demo switch. |
| [ ] | **Experiment tested** | Experimentation | *You:* create + start "Registration CTA", confirm the button text and impression counts; confirm the simulated experiment shows no winner. |
| [ ] | **Mobile UI checked** | Quality of the asset | *You:* phone-width window; check the nav, forms, tables and `/admin` menu. |
| [ ] | **Desktop UI checked** | Quality of the asset | *You:* full-width browser; check charts render. (Charts have only been type-checked and built, never viewed.) |
| [ ] | **ZIP created** | Submission package | **Ready:** `nxtwave-ai-workshop-growth-hub-final.zip`. |
| [ ] | **No secrets in ZIP** | Safety | **Checked** by the assistant (see the final report); *You:* re-run the scan if you change anything. |

## Before you submit, also confirm
- [ ] Every number you quote is labelled as a plan or as **simulated**; nothing implies real NxtWave results.
- [ ] Your video shows the "Simulated campaign data" label at least once.
- [ ] You can explain: why four channels, how 350 direct + referral = 500, why the browser can't send registrations, and why the dashboard won't name a winner on demo data.
- [ ] You are happy to be asked about: the MongoDB layer's verification status (be honest if you haven't run the integration tests).
