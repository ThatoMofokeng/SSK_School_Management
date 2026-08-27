# Security

This document covers the app's current security posture, what's been
hardened, and the steps to take if a secret is ever exposed. History of how
each item was fixed lives in [CHANGELOG.md](./CHANGELOG.md); this file is
the current state, not a log.

## Current posture

| Area | Status | Notes |
|---|---|---|
| Secrets in git | ✅ Clean | `.env` is gitignored and confirmed never committed. `.env.example` holds placeholders only. |
| Rate limiting | ✅ In place | All mutating Server Actions, in-memory limiter. Single-instance only — see [docs/RATE_LIMITING.md](./docs/RATE_LIMITING.md). |
| Detail-page authorization | ✅ In place | Record-level checks on student/teacher detail pages; unauthorized access returns 404. |
| Security headers | ✅ In place | Set in `next.config.mjs` — see below. |
| Production auth keys | ⚠️ Action required | Repo ships with Clerk **test** keys (`pk_test_*`/`sk_test_*`). Must be swapped for `pk_live_*`/`sk_live_*` before real traffic — see [DEPLOYMENT.md](./DEPLOYMENT.md). |
| Automated security scanning | ❌ Not set up | No CI security scan configured yet. |
| Error monitoring | ❌ Not set up | No Sentry/equivalent configured yet. |

## If `.env` or a secret is ever committed

1. Confirm the exposure:
   ```bash
   git log --all --full-history -- .env
   ```
   Any output means it was committed at some point, even if it's been
   deleted since — it's still in history and still exposed to anyone with
   repo access.

2. **Rotate every credential that was in the file, immediately** —
   history rewriting does not undo an exposure that's already been
   pushed:
   - Clerk: Dashboard → API Keys → roll both publishable and secret key.
   - Database: Supabase → Settings → Database → reset password.
   - Cloudinary: Console → Settings → Security → regenerate API secret.

3. Only after rotating, optionally purge the file from git history
   (`git filter-repo` or BFG Repo-Cleaner) and force-push. Treat this as
   cleanup, not the fix — the fix is the rotation in step 2.

## Security headers

Set in `next.config.mjs`:

- `X-Frame-Options: SAMEORIGIN` — clickjacking
- `X-Content-Type-Options: nosniff` — MIME sniffing
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` — forces HTTPS
- `Content-Security-Policy` — restricts resource loading (Cloudinary is
  allowlisted for images; if you add another image/media host, add it
  here too — check the browser console for CSP violations after deploy)
- `Referrer-Policy`
- `Permissions-Policy` — disables camera/mic/geolocation
- `X-DNS-Prefetch-Control`

If a legitimate resource gets blocked, the fix is to widen the specific
CSP directive it needs — not to remove the policy.

## Authorization model

- **Route-level:** `routeAccessMap` in `src/lib/setting.ts`, enforced by
  Clerk middleware (`src/middleware.ts`). Every route under
  `(dashboard)` must have an entry, or unauthenticated/unauthorized
  requests can reach the page before a component-level check runs (this
  is exactly the class of bug that broke `/list/messages` — see
  CHANGELOG, 2026-08-18 session 1, item 4).
- **Action-level:** every Server Action in `src/lib/actions.ts` calls
  `requireRole(...)` (`src/lib/authz.ts`) first. This is checked
  server-side and cannot be bypassed by hiding a button in the UI.
- **Record-level:** enforced inside the page/action itself — e.g. a
  teacher can only view students in classes they teach. Reference
  implementation:
  `src/app/(dashboard)/list/students/[id]/page.tsx` and
  `.../teachers/[id]/page.tsx`. Unauthorized access to a record returns
  a plain 404, never an explicit "forbidden" — a 403 confirms the record
  exists; a 404 doesn't.

When adding a new entity or route, all three levels need a check —
route access alone is not sufficient if the underlying action doesn't
also verify the caller.

## Pre-production checklist

- [ ] Clerk keys switched from `pk_test_*`/`sk_test_*` to
      `pk_live_*`/`sk_live_*` in the hosting provider's environment
      variables (see [DEPLOYMENT.md](./DEPLOYMENT.md)).
- [ ] `git log --all --full-history -- .env` returns nothing.
- [ ] `curl -I https://<your-app> | grep -i x-frame-options` returns
      `X-Frame-Options: SAMEORIGIN`.
- [ ] Rate limiting verified on at least one entity (create 6 in a row,
      6th should fail).
- [ ] Teacher/student/parent role restrictions spot-checked against a
      record they don't own (expect 404).
- [ ] Clerk MFA enabled for admin accounts.
- [ ] **POPIA (South Africa):** consent on file for minors' data, a
      documented retention policy, and a designated Information Officer
      confirmed before real learner/parent data is entered. This is an
      operational requirement, not something enforced in code.

## Reporting a vulnerability

This is an internal school-management project without a public bug
bounty process. If you find a security issue, report it directly to the
project maintainer rather than opening a public issue.
