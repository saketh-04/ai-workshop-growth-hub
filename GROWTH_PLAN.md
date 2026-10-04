# Growth Plan: "Build Your First AI Project in 60 Minutes"

**Goal:** 500 final-year engineering students registered in 7 days, with a ₹2,000 budget.

> **Everything below is a plan built on stated assumptions. No campaign was run, no real students registered, and no NxtWave data was used.**
> The working asset (this repo) lets a team *test* these assumptions fast; the "Simulated campaign data" inside it is demo data, not results.

---

## A. Target student

**Who:** final-year B.E./B.Tech students, any branch (CSE/IT/ECE/EEE/Mechanical/Civil), most under placement pressure.

**What they care about**
- *Standing out in interviews:* "I built an AI project" is a concrete, discussable story.
- *Not being left behind:* AI is everywhere in the news and in job descriptions; many feel they haven't touched it.
- *Low risk:* free, one hour, no prior AI knowledge needed.

**What makes them register**
1. A concrete outcome in the headline: "a working AI project in 60 minutes", not "an AI webinar".
2. The plan is visible *before* they commit (the 60-minute timeline is on the landing page).
3. A one-minute form (7 fields, phone optional).
4. Social proof from people they know: a friend's link, a club announcement. For this audience a trusted peer is a stronger signal than any ad.

**What stops them:** "I'm not good enough", "I don't have time", "is this legit?". Beginner framing and a one-hour format answer the first two; a recognisable sender answers the third.

---

## B. 7-day campaign: four channels, one loop

Few channels on purpose: with ₹2,000, depth in a handful of places beats a thin spread across twenty.

| Channel | What we do | Why it should work | Expected registrations* |
|---|---|---|---|
| **WhatsApp student groups** | Seed a short, copy-paste message with a UTM link into ~70 class/branch/placement groups (~120 members each) via friends and CRs. Re-post on day 4 with a countdown. | Where students already talk; one forward reaches a whole class; near-zero cost. | **~140** |
| **College clubs & campus communities** | Ask ~23 club leads (coding, AI/ML, IEEE, placement cells) to announce it and share the link. Give each a thank-you and their own UTM link so we can see who delivers. | Warm audience, endorsed by someone they trust. | **~105** |
| **LinkedIn & student communities** | 3-4 posts from the founder/campaign account and community admins, plus a small boost on the best post. | Final-years are actively building a LinkedIn presence; reach beyond personal networks. | **~63** |
| **Instagram & other** | Short story/reel clips shared by campus pages; remaining long-tail sources. | Cheap reach among students; lower intent, so lower conversion. | **~42** |
| **Referral loop** (inside the product) | After registering, every student gets a personal link, a share message and a public leaderboard rank; top 3 referrers win small prizes. | Turns each registration into a few more at zero cost, and gives students a reason to share. | **~150** |

\*Assumptions, derived in section D. **Rhythm:** Day 1 WhatsApp + clubs; Days 2-3 LinkedIn and first leaderboard push; Day 4 re-post, fix the weakest channel; Days 5-6 referral prizes and club reminders; Day 7 last call.

---

## C. ₹2,000 budget

| Item | ₹ | Why |
|---|---|---|
| Referral prizes (top 3: ₹400 / ₹250 / ₹150 gift vouchers) | 800 | Funds the loop that is expected to produce ~30% of registrations. |
| Club-lead thank-yous (≈ 10 × ₹50) | 500 | Small token for the people who send us the warmest traffic. |
| LinkedIn / Instagram boost on the best-performing post | 400 | Spend only after seeing which post works (days 2-3). |
| Reserve | 300 | Re-allocated on day 4 to whichever channel is outperforming. |
| **Total** | **2,000** | Software is free-tier (hosting, database); design done in free tools. |

About 65% goes to incentives for people who spread the word, ~20% to paid reach (spent only on a post that is already working), ~15% held in reserve.

---

## D. How 500 could add up (transparent model)

**Referral multiplier:** if each direct registration brings in *k* more through referrals, total = direct ÷ (1 − k).
Assume k = **0.30** (25% of registrants share, each invites ~6 friends, ~20% of invitees register: 0.25 × 6 × 0.20 = 0.30).
To reach 500: direct = 500 × (1 − 0.30) = **350**; referral = **150** (30%).

**Direct registrations = reach × visit rate × registration rate** (all assumptions):

| Channel | People reached | Visit rate | Visits | Visit → registration | Registrations |
|---|---|---|---|---|---|
| WhatsApp groups | 8,400 × 50% see it = 4,200 | 8% | ~336 | 42% | ~140 |
| College clubs | ~2,350 | 10% | ~235 | 45% | ~105 |
| LinkedIn | ~6,000 impressions | 2.5% | ~150 | 42% | ~63 |
| Instagram & other | ~4,000 | 2.5% | ~100 | 42% | ~42 |
| **Direct total** | | | **~820 visits** | | **~350** |
| Referral (k = 0.30) | | | | | **~150** |
| **Total** | | | | | **~500** |

**How fragile is this?** The two weakest assumptions are visit → registration (42%, high for cold traffic) and k:

| If… | Total registrations |
|---|---|
| Plan holds (42%, k = 0.30) | ~500 |
| Visit → registration only 30% (all channels scaled), k = 0.30 | ~357 |
| k only 0.20 | ~437 |
| Both worse (30%, k = 0.20) | ~312 |

So the plan is only as good as those two numbers, which is exactly why the product measures them from day 1. **Checkpoints:** ≥150 registrations by end of Day 3 and ≥330 by end of Day 5. If behind, spend the ₹300 reserve on the best channel, shorten the form, and increase the referral prize visibility.

---

## E. Measurement (all live in the admin dashboard)

| Question | Metric | Where |
|---|---|---|
| Are we on pace? | Registrations vs 500, daily series | Overview + 7-day chart |
| Is the page converting? | Registrations ÷ landing views | Conversion KPI, funnel |
| Where do we lose people? | Views → starts → completions | Funnel (start → completion shows form friction) |
| Which channel to fund? | Registrations and conversion by UTM source/campaign | Channel performance |
| Is the loop working? | Link clicks, referrals, referral conversion, active referrers, share of registrations from referrals | Referral performance |
| Which wording wins? | Impressions, clicks, conversions per variant | Experiments |

Conversion is shown per channel only where landing views were tracked; otherwise it shows "-" rather than a guess.

---

## F. Experiment: CTA wording

**Hypothesis:** a benefit-led button ("Build My AI Project") gets more students to register than a generic one ("Register Now").
**Setup:** A/B at random per visitor, sticky across visits; the main CTA is the only change. **Primary metric:** registrations ÷ impressions. **Guardrail:** form completion rate must not drop.

**Decision rule with real data**
- The dashboard names a leader only after ≥100 impressions per variant *and* a significant difference (p < 0.05). Below that it says "insufficient data" or "no clear difference".
- Significant win for B -> ship B to everyone. No clear difference -> keep the default and move on to the next test. Never decide on a handful of clicks.
- **Reality check:** with ~820 visits in total, this test can only detect a *large* lift (about +10 points, e.g. 42% -> 52%). A flat result is a valid answer: it tells us the button wording isn't the bottleneck, so effort should go to channels and the referral prize instead.

In the demo the seeded experiment is **simulated** and the dashboard deliberately names no winner.

**Next test:** share-message wording on the success page (it drives *k*, the biggest lever in the model).
