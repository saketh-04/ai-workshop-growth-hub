# Deployment Guide: MongoDB Atlas → Render → Vercel

Nothing has been deployed from this repo yet, and no live URLs exist. Follow the steps in order (the order matters: the frontend needs the API URL, and the API needs the frontend URL for CORS). **Never paste real secrets into the repo, a chat, or a screenshot.**

## 0. Prerequisites
- A GitHub account with this project pushed to a **private** repository (`.env` is git-ignored; check `git status` shows no `.env`).
- Free accounts at MongoDB Atlas, Render and Vercel.
- Node 22 locally to generate the admin password hash.

## 1. MongoDB Atlas (database)
1. Create a project and a **free M0 cluster** (pick a region near India, e.g. Mumbai, if offered).
2. **Database Access → Add New Database User:** username + a strong generated password; role *Read and write to any database*. Save the password somewhere private.
3. **Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`).** Render's free tier has no fixed outbound IP, so this is required; the strong database password is your protection. Do not share the connection string.
4. **Connect → Drivers → copy the connection string**, which looks like `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`. Insert the **database name** before the `?`: `...mongodb.net/growth_hub?retryWrites=true&w=majority`. If the password has special characters (`@ : / ? #`), URL-encode them.
5. This full string is your `MONGODB_URI`.

## 2. Verify the database layer (recommended before deploying)
The database code has never run against a real MongoDB. Do this once locally:
```bash
cp .env.example .env     # set MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run install:all
# Use a SEPARATE throwaway database name, because this test DROPS it:
MONGODB_URI_TEST="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/growth_hub_test?retryWrites=true&w=majority" npm run test:integration
```
Expect 24 tests to run. If any fail, fix them before deploying (the tests were written without a database available).

## 3. Generate secrets
In `server/`, run these and keep the output private:
```bash
# JWT secret (48 bytes hex)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# bcrypt hash of your chosen admin password (replace the quoted text)
node -e "require('bcrypt').hash(process.argv[1],12).then(console.log)" 'YourStrongAdminPassword'
```
Use the hash as `ADMIN_PASSWORD_HASH` (preferred over a plain `ADMIN_PASSWORD` in production).

## 4. Backend on Render
1. **New → Web Service →** connect your GitHub repo.
2. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install --include=dev && npm run build` (TypeScript is a dev dependency, so `--include=dev` is required)
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
   - **Plan:** Free (note: it sleeps after inactivity; the first request can take ~30-60 s to wake. Open the URL before you record or present).
3. **Environment variables** (Environment tab):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `MONGODB_URI` | your Atlas string from step 1 |
| `JWT_SECRET` | the 96-hex-character value from step 3 |
| `ADMIN_EMAIL` | your admin login email |
| `ADMIN_PASSWORD_HASH` | the bcrypt hash from step 3 |
| `CLIENT_ORIGIN` | for now `http://localhost:5173`; you will change it in step 6 |
| `OPENAI_API_KEY` | *optional.* Leave unset for fallback mode |
| `OPENAI_MODEL` | *optional* (defaults to `gpt-4o-mini`) |

Do not set `PORT`; Render provides it.
4. Deploy. When it's live, open `https://<your-service>.onrender.com/api/health`. You should see `{"status":"ok","db":"connected"}`. If `db` is `disconnected`, re-check `MONGODB_URI` and Atlas Network Access.

## 5. Frontend on Vercel
1. **Add New → Project →** import the same repo.
2. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` · **Output Directory:** `dist`
3. **Environment variable:** `VITE_API_URL` = `https://<your-service>.onrender.com` (**no trailing slash**, no `/api`).
4. Deploy. `client/vercel.json` already rewrites all paths to `index.html`, so `/register`, `/admin` and other deep links work on refresh.

## 6. Connect the two (CORS)
1. In Render, set `CLIENT_ORIGIN` to your exact Vercel URL, e.g. `https://<your-project>.vercel.app`. **No trailing slash.** Use a comma-separated list for more than one origin (e.g. a custom domain too).
2. Save: Render redeploys. CORS allows only the origins listed, so a mismatch shows up in the browser console as a CORS error.
3. Vercel *preview* URLs (the long per-commit ones) are not allowed unless you add them to `CLIENT_ORIGIN`.

## 7. Load demo data (optional) and smoke-test
Seed from your own computer, pointing at Atlas. Do **not** set `NODE_ENV=production` locally:
```bash
# .env at the repo root must contain your Atlas MONGODB_URI
npm run seed
```
The data is **simulated** and labelled as such. Re-running replaces only demo records. Then check, on the live URL:
1. Landing page loads; the CTA reads "Reserve My Spot".
2. Register a test student (use your own email). You should see "You're in!" with a referral link.
3. Pick an AI category; you should get a project and a 60-minute plan. Without `OPENAI_API_KEY` the note says it's a curated suggestion.
4. Open the referral link in a private window, register a second test student, and confirm the first student's dashboard shows 1 referral.
5. `/leaderboard` lists referrers and shows the "Simulated campaign data" badge if seeded.
6. `/admin/login` → sign in → the dashboard shows data; the All/Real/Demo switch changes the numbers.
7. `/admin/experiments`: create "Registration CTA" (A "Register Now", B "Build My AI Project"), start it, reload the landing page and confirm the button text and that impressions increase.
8. Check the layout on a phone-width window and a desktop window.

## 8. Remove demo data before a real campaign (optional)
The Real/Demo switch already separates them. To delete demo records entirely, in Atlas **Data Explorer** or `mongosh` (on your own database name):
```js
db.users.deleteMany({ isDemo: true });        db.registrations.deleteMany({ isDemo: true });
db.referrals.deleteMany({ isDemo: true });    db.analyticsevents.deleteMany({ isDemo: true });
const sim = db.experiments.find({ isSimulated: true }).map(e => e._id);
db.experimentevents.deleteMany({ experimentId: { $in: sim } });
db.experiments.deleteMany({ isSimulated: true });  db.campaigns.deleteOne({ slug: "ai-workshop" });
```

## 9. Troubleshooting
| Symptom | Likely cause |
|---|---|
| Render build fails with "tsc: not found" | Build command missing `--include=dev` |
| `/api/health` shows `db: disconnected` | Wrong `MONGODB_URI`, or Atlas Network Access doesn't allow Render |
| Browser console shows a CORS error | `CLIENT_ORIGIN` doesn't exactly match the Vercel URL (check the `https://` and no trailing slash) |
| Site loads but every action fails | `VITE_API_URL` is wrong/unset: redeploy Vercel after changing it (Vite bakes it in at build time) |
| First request is very slow | Render free tier is waking up |
| Admin login always "Incorrect email or password" | `ADMIN_EMAIL` mismatch, or `ADMIN_PASSWORD_HASH` pasted incorrectly (it must start with `$2`) |
| Server won't start, logs list env problems | A required variable is missing or `JWT_SECRET` is shorter than 32 characters |
