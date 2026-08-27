# Deployment (Vercel)

~30 minutes. Assumes: repo on GitHub, a Supabase project provisioned, a
Clerk application created.

## Step 1 — Collect credentials (5 min)

**Clerk — production keys, not test keys:**

1. https://dashboard.clerk.com → switch the environment selector to
   **Production**.
2. API Keys → copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — starts with `pk_live_`
   - `CLERK_SECRET_KEY` — starts with `sk_live_`

**Supabase — two different connection strings, don't mix them up:**

1. https://supabase.com/dashboard → your project → Settings → Database →
   Connection string.
2. Copy:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL`. Append
     `?pgbouncer=true&connection_limit=5&pool_timeout=20` if not already
     present. Don't leave `connection_limit` at `1` — that serializes
     every query app-wide and the admin dashboard alone fires 6+
     concurrent queries.
   - **Direct connection** (port `5432`) → `DIRECT_URL`. Prisma
     migrations run through this one, not the pooled one.
   - If the direct connection times out on your network (some ISPs
     block the IPv6-only direct host), use the **Session pooler** string
     instead — same port pattern, IPv4-reachable.

## Step 2 — Push to GitHub (5 min)

```bash
git status
git add .
git commit -m "chore: deployment prep"
git push -u origin main
```

Before pushing, confirm `.env` was never committed:

```bash
git log --all --full-history -- .env
```

No output = clean. If it shows commits, the values in it need to be
rotated (Clerk keys, DB password) regardless of whether you rewrite
history — see [SECURITY.md](./SECURITY.md).

Also check `.env.example` — it should contain placeholders only, never a
real-looking key, even a test-environment one.

## Step 3 — Import into Vercel (10 min)

1. https://vercel.com/new → **Import Git Repository** → select this repo
   → **Import**. Vercel auto-detects Next.js; default build settings are
   fine.
2. Add environment variables — all of the following, for all three
   environments (Production / Preview / Development):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Supabase pooled string, port 6543, `?pgbouncer=true` |
   | `DIRECT_URL` | Supabase direct (or session pooler) string, port 5432 |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` — **required at build time**, since `ClerkProvider` wraps the root layout and Next.js's static-generation pass renders every page during build |
   | `CLERK_SECRET_KEY` | `sk_live_...` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` |

   If using Cloudinary uploads, also add
   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (and `CLOUDINARY_API_KEY` /
   `CLOUDINARY_API_SECRET` for signed uploads).

3. Click **Deploy**.

`npm install` runs the `postinstall` hook (`prisma generate`)
automatically, so the Prisma Client is rebuilt on every deploy — no
manual step needed for that. **Migrations are separate**: Vercel's build
step does not run them. If this deploy includes schema changes not yet
applied to Supabase, run `npx prisma migrate deploy` (or `npx prisma db
push` for a quick non-production sync) against `DIRECT_URL` **before**
deploying.

Your app will be live at `https://<project-name>-<username>.vercel.app`.

## Step 4 — Point Clerk at the new domain (5 min)

1. Clerk dashboard → confirm **Production** environment is selected.
2. **Domains** → Add domain → the Vercel URL from Step 3.
3. **Paths** → Sign-in URL: `/sign-in`, After sign-in: `/`.

## Step 5 — Verify (5 min)

- [ ] App loads and redirects to `/sign-in` when logged out.
- [ ] Login succeeds and lands on the dashboard.
- [ ] `/list/students` loads without errors (empty list is fine).
- [ ] `/list/messages` loads without errors — this route depends on
      `routeAccessMap` in `src/lib/setting.ts` having an entry for it;
      if missing, logged-out requests slip past the middleware and the
      page crashes on a null `userId` instead of redirecting.
- [ ] `curl -I https://<your-app>.vercel.app | grep X-Frame-Options`
      returns `X-Frame-Options: SAMEORIGIN`.
- [ ] Creating 6 subjects in quick succession fails on the 6th
      (rate limit) — this only proves Subject is covered; see
      [docs/RATE_LIMITING.md](./docs/RATE_LIMITING.md) for full coverage.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Invalid Clerk keys" | Still on `pk_test_*`/`sk_test_*`. Confirm you copied from Clerk's Production environment, and the Vercel domain is added under Clerk → Domains. |
| Database connection fails | Check `DATABASE_URL` has `?pgbouncer=true`; confirm the Supabase project isn't paused (free-tier projects pause after a week of inactivity); confirm `DATABASE_URL`/`DIRECT_URL` aren't swapped. |
| Build fails: "Prisma schema not found" | Check the build log — usually a missing env var, or the Dockerfile/build context not including `prisma/` (see CHANGELOG). |
| Build fails: missing env var | Confirm all variables in the Step 3 table are set for the environment that's building (Production/Preview/Development are separate). |
| Prisma error about a missing table/column after deploy | Schema and live database are out of sync. Run `npx prisma migrate status` locally against `DIRECT_URL`, then `npx prisma migrate deploy`. Never run `prisma migrate reset` against a database with real data — it drops everything. |
| CSP blocking a resource | DevTools → Console on the deployed app, find the blocked domain, add it to `Content-Security-Policy` in `next.config.mjs`, redeploy. |

## After deploy

- Watch Vercel → Logs for the first 24h.
- Manually click through Students / Teachers / Messages / Announcements
  as a couple of real users before calling it done.
- Rate limiting and role-based access are only as complete as the
  current state of `src/lib/actions.ts` / `src/components/FormModal.tsx`
  — see [CHANGELOG.md](./CHANGELOG.md) for what's covered.

## Alternative: Docker / self-hosted

A multi-stage `Dockerfile` and `docker-compose.yml` are included for
self-hosting (e.g. Render, a VPS) instead of Vercel:

```bash
cp .env.example .env   # fill in DB_USER/DB_PASSWORD/DB_NAME + Clerk keys
docker compose up --build
```

Notes specific to this path:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is passed as a Docker build
  `ARG`/`ENV` (required at build time, same reason as the Vercel path
  above). This is safe to bake into the image — it's a public,
  client-bundled variable, unlike `DATABASE_URL` or `CLERK_SECRET_KEY`.
- Migrations run via `prisma migrate deploy` at container **start**, not
  at build time, against whatever `DATABASE_URL` the container is given.
- `scripts/start.mjs` reads the `PORT` env var (defaults to 3000) — hosts
  like Render inject `PORT` and expect the process to bind to it; plain
  `next start` does not do this on its own.
- Don't pass `DATABASE_URL` as a build arg — the `(dashboard)` routes are
  forced dynamic (`export const dynamic = "force-dynamic"`), so no
  database connection is needed during the build.
