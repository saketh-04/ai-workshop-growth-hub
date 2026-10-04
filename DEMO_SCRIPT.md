# 3-Minute Demo Script

**Before you record (5 minutes):**
1. Run `npm run seed` against your database, so the dashboard has simulated data.
2. Open `/admin`, sign in, go to **Experiments** and create + start a live experiment named exactly **Registration CTA** (A "Register Now", B "Build My AI Project").
3. Open the public site in an incognito window. Have your admin tab signed in and your phone-width window ready.

Speak the **bold** text; the *italics* are on-screen actions. About 430 spoken words.

---

### 0:00–0:25 | Problem + target audience
*Landing page hero on screen.*
**"NxtWave wants 500 final-year engineering students at a free workshop, 'Build Your First AI Project in 60 Minutes'. I have seven days and ₹2,000. These students want a project to show in placements, but most have never built anything with AI. So I built one working asset: a growth hub that gets them registered, gets them to bring friends, and tells the team where to spend the money."**

### 0:25–0:55 | Growth strategy + the 500 approach
*Open GROWTH_PLAN section D, or just keep the landing page.*
**"The plan has four channels: WhatsApp groups, college clubs, LinkedIn, and a referral loop. The model is simple: if each registration brings in 0.3 more through referrals, I need about 350 direct registrations to reach 500. Most of the ₹2,000 goes to referral prizes and thank-yous for club leads. These are assumptions, not results, and the product measures every one of them."**

### 0:55–2:20 | Live demo
*Scroll the landing page briefly (10s).* **"The page leads with the outcome and shows the 60-minute plan before asking for anything."**
*Click the CTA. Fill the form quickly; show a validation error once.* **"Seven fields, instant validation. UTM and referral codes from the link are captured automatically."**
*Submit. Success page.* **"I'm in. I get a registration ID, a personal referral link, and share buttons."**
*Pick Career in the AI picker.* **"Then a personalized project: stack, difficulty, and an exact 60-minute plan. If OpenAI is down or unconfigured, it falls back to curated ideas, so registration never breaks."**
*Open Dashboard, then Leaderboard.* **"My referral stats and rank, and the public leaderboard with masked names. The badge says 'Simulated campaign data' because these rows are seeded demo records."**
*Switch to the admin tab; /admin.* **"The growth console: registrations against the 500 target, the seven-day chart, channel performance, the funnel, and referral performance, all computed from the database. The switcher separates demo from real."**
*Open Experiments.* **"The CTA experiment tracks impressions, clicks and conversions per variant. This seeded one is simulated, so the dashboard refuses to name a winner. For a real experiment it only does so with enough data and statistical significance."**

### 2:20–2:45 | What AI helped build + one decision
**"I built this with an AI assistant, phase by phase, and reviewed each one. One decision I'm proud of: the AI's first design accepted any event from the browser. I changed it so the server records registrations and conversions itself. Otherwise anyone could fake the numbers, and the dashboard would mislead the budget decision."**

### 2:45–3:00 | What I'd improve with 24 more hours
**"I'd run the database tests against a live MongoDB and deploy end to end, A/B test the share message, which drives the referral rate, and add alerts if the campaign falls behind the daily pace. Thank you."**

---

**Don't say:** any real result, any real student count, or that the seeded numbers are real.
**If something breaks on camera:** the data panels need the database; check `/api/health` shows `"db":"connected"`.
