# Deploy Checklist — Vercel

~30 minutes. Assumes: repo on GitHub, Supabase project provisioned, Clerk
account exists.

---

## Prerequisites

- GitHub repo up to date on `main`
- Supabase project active (not paused — free-tier projects pause after a
  week of inactivity, which will make Step 3's deploy fail on the DB
  connection)
- Clerk application created

---

## Step 1 — Collect credentials (5 min)

**Clerk (production keys, not test keys):**

1. https://dashboard.clerk.com → switch environment to **Production**
2. API Keys → copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — starts with `pk_live_`
   - `CLERK_SECRET_KEY` — starts with `sk_live_`

**Supabase (two different connection strings — don't mix them up):**

1. https://supabase.com/dashboard → your project → Settings → Database →
   Connection string
2. Copy:
   - **Transaction pooler** (port `6543`) → this is `DATABASE_URL`. Append
     `?pgbouncer=true` if it's not already there.
   - **Direct connection** (port `5432`) → this is `DIRECT_URL`. Prisma
     migrations run through this one, not the pooled one.

If the direct connection times out from your network (some ISPs block the
IPv6-only direct host), use the **Session pooler** string instead — same
port pattern, but IPv4-reachable.

---

## Step 2 — Push to GitHub (5 min)

```bash
git status
git add .
git commit -m "chore: deployment prep"
git push -u origin main
```

Before pushing, confirm `.env` itself was never committed:

```bash
git log --all --full-history -- .env
```

No output = clean. If it shows commits, the values in it need to be rotated
(Clerk keys, DB password) — history rewriting won't undo an exposure once
it's been pushed.

**Also check `.env.example`.** It should contain placeholder values only —
things like `your_key_here` — never real key strings, even test-environment
ones. If any real-looking key is sitting in `.env.example`, rotate it and
replace it with a placeholder before pushing; a committed example file is
exactly as public as your repo.

---

## Step 3 — Deploy to Vercel (10 min)

1. https://vercel.com/new → **Import Git Repository** → select this repo →
   **Import**
2. Add environment variables (all 7, all three environments — Production /
   Preview / Development):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Supabase pooled string, port 6543, `?pgbouncer=true` |
   | `DIRECT_URL` | Supabase direct (or session pooler) string, port 5432 |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
   | `CLERK_SECRET_KEY` | `sk_live_...` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` |

   If you're using Cloudinary for image uploads, also add
   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (and `CLOUDINARY_API_KEY` /
   `CLOUDINARY_API_SECRET` if you're doing signed uploads).

3. Click **Deploy**.

`npm install` runs `postinstall` → `prisma generate` automatically (already
wired up in `package.json`), so the Prisma Client gets built fresh on every
deploy — you don't need a manual step for that here. Migrations are separate
though: if this deploy includes schema changes not yet applied to the
Supabase database, run `npx prisma migrate deploy` (or `npx prisma db push`
for a quick non-production sync) against `DIRECT_URL` **before** deploying,
since Vercel's build step does not run migrations for you.

Your app will be live at `https://<project-name>-<username>.vercel.app`.

---

## Step 4 — Configure Clerk for the new domain (5 min)

1. Clerk dashboard → confirm **Production** environment is selected
2. **Domains** → Add domain → enter the Vercel URL from Step 3
3. **Paths** → set:
   - Sign-in URL: `/sign-in`
   - After sign-in: `/`

---

## Step 5 — Verify (5 min)

- [ ] App loads at the Vercel URL and redirects to `/sign-in` when logged out
- [ ] Login succeeds and lands on the dashboard
- [ ] `/list/students` loads without errors (empty list is fine)
- [ ] `/list/messages` loads without errors — this route depends on
      `routeAccessMap` in `src/lib/setting.ts` having an entry for it; if it's
      missing, logged-out requests slip past the middleware and the page
      crashes on a null `userId` instead of redirecting
- [ ] `curl -I https://<your-app>.vercel.app | grep X-Frame-Options` returns
      `X-Frame-Options: SAMEORIGIN`
- [ ] Creating 6 subjects in quick succession fails on the 6th (rate limit)
      — note this only proves Subject is covered; Class/Teacher/Student/Exam
      aren't rate-limited yet

---

## Troubleshooting

**"Invalid Clerk keys"** — you're probably still on `pk_test_*`/`sk_test_*`.
Confirm you copied from the Production environment in Clerk, and that the
Vercel domain is added under Clerk → Domains.

**Database connection fails** — check `DATABASE_URL` has `?pgbouncer=true`;
confirm the Supabase project isn't paused; confirm you didn't swap
`DATABASE_URL` and `DIRECT_URL`.

**Build fails** — check the Vercel build log for the actual error first;
usually a missing env var. Confirm all 7 (or more, with Cloudinary) are set
for the environment that's building.

**Prisma error about a missing table/column after deploy** — the schema and
the live database are out of sync. Run `npx prisma migrate status` locally
against `DIRECT_URL` to see what's pending, then `npx prisma migrate deploy`.
Do not run `prisma migrate reset` against a database with real data in it —
it drops everything.

**CSP blocking a resource** — open DevTools → Console on the deployed app,
find the blocked domain in the CSP violation message, add it to the
`Content-Security-Policy` header in `next.config.mjs`, redeploy.

---

## After deploy

- Watch Vercel → Logs for the first 24h for anything unexpected
- Have a couple of real users click through Students/Teachers/Messages/
  Announcements before calling it done
- Rate limiting and role-based access are only as complete as the current
  state of `src/lib/actions.ts` / `src/components/FormModal.tsx` — see
  `FIXES_SUMMARY.md`'s "Known gaps" section for what's still stubbed out
  (`lesson`, `assignment`, `result`, `attendance`, `event`)