# Changelog

All notable changes to this project, newest first. Each entry lists what
was wrong (root cause where known), what changed, and which files were
touched. Consolidated from prior working docs (`FIXES_SUMMARY.md`,
`FIXES_APPLIED.md`, `CRITICAL_FIXES_APPLIED.md`, `CRITICAL_RUNTIME_FIX_V5.md`,
`CHANGES.md`, `PERFORMANCE_NOTES.md`), which have been removed in favor of
this file.

> Entries without an explicit date were undated in the source material.
> They're placed in their most likely position based on the work they
> describe, not on file timestamps (the working copy this was
> consolidated from had its file-modified times reset by re-packaging, so
> they aren't a reliable ordering signal).

---

## 2026-08-23 — Parent creation hardening & query optimization

**Parent creation:**
- Clerk account creation now uses structured API error detection instead
  of a generic failure, and always returns a plain serializable action
  state (server-action results must be serializable — a raw Clerk error
  object isn't).
- Added server-side password validation (minimum 8 characters), a
  duplicate-user check, and Clerk-account rollback if the follow-up
  Prisma insert fails (avoids an orphaned Clerk user with no matching DB
  row).
- Added client-side error feedback so a failed parent creation surfaces
  a real message instead of failing silently.

**Query / performance:**
- Parent list no longer loads nested Prisma relations; student display
  fields are fetched separately for just the visible parent IDs.
- Removed unnecessary Clerk `auth()` calls from parent/delete
  `FormContainer` instances.
- Added a request-scoped React `cache()` around Clerk context and related
  dropdown queries so repeated row-level `FormContainer`s reuse the same
  data within one render instead of re-fetching per row.
- Replaced explicit relation loads with `select` projections across
  several list queries (parents list fetches only rendered fields).
- Parents page now runs two independent reads via `Promise.all` instead
  of a transaction, cutting connection overhead on a read-only page.
- Removed a duplicate Clerk request in the Navbar by deriving user
  id/role from `currentUser()` once.
- Added PostgreSQL indexes for announcement timestamps, event start
  times, content-file owner/date, and parent-name search (`pg_trgm`).
- Enabled Next.js image optimization (was `unoptimized: true`).

**Prisma / connection settings:**
- `DATABASE_URL` automatically gets `pgbouncer=true` and
  `connection_limit=1` appended when a Supabase transaction-pooler URL on
  port 6543 is detected — **note:** `connection_limit=1` serializes every
  query app-wide; raise it (`.env.example` documents this) if the app
  does concurrent queries, which the admin dashboard does.
- Development Prisma query logging reduced to errors/warnings only.
- `prisma` and `@prisma/client` pinned to the same `6.12.0` version.

**Root cause note:** the original crash report pointed at
`FormModal.tsx`, but that component only renders `ParentForm` — the real
failure was the `createParent` Server Action, where Clerk's
`client.users.createUser()` was returning `ClerkAPIResponseError:
Unprocessable Entity` with no surfaced detail.

**Files:** `src/lib/actions.ts`, `src/components/FormContainer.tsx`,
`src/components/Navbar.tsx`, `src/lib/prisma.ts`,
`prisma/migrations/` (new indexes), `next.config.mjs`, `package.json`.

**Benchmarking note:** don't benchmark performance against `next dev` —
Turbopack's dev-mode compilation, source maps, and filesystem caching
make requests look slower than production. Use `npm run build && npm
start` and compare `/`, `/admin`, `/list/students`, `/list/parents`.

---

## 2026-08-21 — Status snapshot

All 14 entities (Subject, Class, Teacher, Student, Parent, Exam, Result,
Assignment, Lesson, ContentFile, Message, Announcement, Event,
Attendance) now have real create/update/delete actions wired into
`FormModal.tsx` / `FormContainer.tsx` — the `notImplementedAction`
stopgap has been fully removed. Rate limiting covers every mutating
action (40 call sites). Still open: no automated test suite;
`src/lib/actions.ts` is a single ~1500-line file; rate limiting is
in-memory only (see [docs/RATE_LIMITING.md](./docs/RATE_LIMITING.md));
Parent/Event/Result CRUD had not yet been manually click-tested against
production data.

---

## 2026-08-18 (session 2) — Messages redesign, Announcement build-out

1. **`FormModal.tsx` React warning on delete confirm.** The hidden `id`
   input used `value={id}` with no `onChange`, which React flags as an
   unintentionally-controlled field; it also had a leaked TypeScript
   union type (`type="text | number"`) as a literal JSX attribute.
   **Fix:** `value` → `defaultValue` (the field is intentionally
   uncontrolled), `type` → `"text"`.

2. **Messages UI redesign**, scoped intentionally: kept the existing
   modal-based compose flow and individual (non-threaded) messages, only
   the visual layer changed.
   - List rebuilt as a card list (avatar initials, sender/recipient,
     date, one-line preview, delete-on-hover), replacing a plain
     `<table>`.
   - Compose form restyled: "To:" row with search icon, tighter spacing,
     pill-shaped Send button.
   - "New Message" trigger changed from the generic icon-only button
     shared by every entity to a labeled pill button, scoped to
     `table === "message"` only — every other entity's create button is
     unaffected.

3. **Announcement management was a stub.** Same pattern as Parent in
   session 1: `FormModal.tsx` mapped `announcement` to
   `notImplementedAction` — no schema, actions, or form component
   existed, even though the `Announcement` Prisma model already did.
   **Fix**, following the existing Class/Exam pattern:
   - `announcementSchema` / `AnnouncementSchema` added (title,
     description, date, optional classId).
   - `createAnnouncement` / `updateAnnouncement` / `deleteAnnouncement`
     added, all gated with `requireRole("admin")`.
   - New `AnnouncementForm.tsx`.
   - `FormModal.tsx` and `FormContainer.tsx` wired to the new form/action
     (`FormContainer` now fetches the class list for the dropdown).

**Files:** `src/components/FormModal.tsx`,
`src/app/(dashboard)/list/messages/page.tsx`,
`src/components/Forms/MessageForm.tsx`,
`src/lib/formValidationSchemas.ts`, `src/lib/actions.ts`,
`src/components/Forms/AnnouncementForm.tsx` (new),
`src/components/FormContainer.tsx`.

---

## 2026-08-18 (session 1) — Parent form, React 19 migration, Messages runtime errors

Local testing against a real Supabase database surfaced a chain of
build/runtime bugs — not a security pass, these were correctness issues
blocking Parent management and Messages entirely.

1. **Parent create/update was non-functional.** `Parentform.tsx`
   imported `parentSchema`/`ParentSchema` and `createParent`/
   `updateParent`, none of which existed — the Parent CRUD flow had been
   stubbed in the UI but never implemented server-side.
   **Fix:** added `parentSchema`/`ParentSchema` (modeled on
   `studentSchema` — phone and address required, per the `Parent` Prisma
   model) and `createParent`/`updateParent` (following the existing
   Teacher action pattern: Clerk user creation + Prisma insert, `role:
   "parent"`).

2. **Incomplete React 19 `useActionState` migration.** React 19 removed
   `useFormState` (`react-dom`). The migration had been applied
   inconsistently:
   - `MessageForm.tsx`, `ClassForm.tsx`, `SubjectForm.tsx` still called
     the removed `useFormState` — hard runtime error.
   - `StudentForm.tsx`, `TeacherForm.tsx`, `ExamForm.tsx`,
     `Parentform.tsx` had switched to `useActionState` but kept a dead
     `useFormState` import.
   - None of the seven forms wrapped the async `formAction(...)` call in
     `startTransition(...)`, which `useActionState` requires — this
     throws *"An async function with useActionState was called outside
     of a transition."*
   **Fix:** standardized all seven forms on `useActionState`, removed
   dead imports, wrapped every `formAction(...)` call in
   `startTransition(...)`.

3. **Messages page crash:** `Cannot read properties of undefined
   (reading 'findMany')` on `prisma.message`. Root cause: the generated
   Prisma Client was stale — generated before the `Message` model was
   added to the schema and never regenerated.
   **Fix:** `npx prisma generate` + `npx prisma db push` to sync the
   `Message` table to Supabase. Deliberately did **not** run `prisma
   migrate reset` — the migration-history divergence was a
   renamed/duplicated local migration folder, not a real schema
   conflict, and `reset` would have dropped all production data.

4. **`/list/messages` had no route protection.** `routeAccessMap` never
   listed the route, so Clerk's middleware let unauthenticated requests
   through; the page then used `currentUserId!` (non-null assertion),
   which crashed at runtime with `Argument receiverId must not be null`
   instead of failing safely.
   **Fix:** added `"/list/messages": ["admin", "teacher", "student",
   "parent"]` to `routeAccessMap`.

**Files:** `src/lib/formValidationSchemas.ts`, `src/lib/actions.ts`,
`src/components/Forms/Parentform.tsx`,
`src/components/Forms/MessageForm.tsx`,
`src/components/Forms/ClassForm.tsx`,
`src/components/Forms/SubjectForm.tsx`,
`src/components/Forms/StudentForm.tsx`,
`src/components/Forms/TeacherForm.tsx`, `src/lib/setting.ts`.
**Manual steps (not in diff):** `npx prisma generate`, `npx prisma db push`
against Supabase.

---

## 2026-08-17 — Sign-in flow, FormModal crash, dead logout link

Working directly in the codebase (not from a report):

1. **Sign-in flow was completely broken** — `/sign-in/continue` dead-ended
   on a blank page for every user. Root causes, all in
   `src/app/sign-in/[[...sign-in]]/page.tsx`:
   - Route wasn't a catch-all (`[[...sign-in]]`), so Next.js had nowhere
     to render any step of Clerk's multi-step flow (password
     re-verification, email-code verification, choose-strategy,
     forgot/reset password).
   - The `verifications` step (password + `email_code` strategies) was
     missing entirely.
   - The `email_code` strategy had no resend/send action, so Clerk never
     dispatched a code before the user tried to verify.
   - This was the actual cause of "login broken after switching keys" —
     that symptom was masking the routing bug, not a key mismatch.

2. **`FormModal.tsx` crash on Parent/Lesson/Assignment/Result/
   Attendance/Event/Announcement** — Create/Update on any of these threw
   `forms[table] is not a function`. The delete map also pointed all
   seven at `deleteSubject`, meaning a "delete" on any of them would have
   deleted an unrelated Subject row instead.
   **Fix (stopgap, not a feature):** all seven now fail safely with a
   "not available yet" message instead of crashing or mis-deleting.

3. **Sidebar Logout was a dead link** (`<Link href="/logout">`, no
   matching route → 404). **Fix:** new `LogoutButton.tsx` client
   component calling Clerk's real `signOut()`.

4. **`.env.example` had real Clerk test keys committed**, not
   placeholders. Replaced with placeholders. (If those keys are still
   live, rotate them in the Clerk Dashboard regardless of git history.)

5. Rebuilt `src/app/settings/page.tsx`; added `src/app/profile/page.tsx`
   (previously had a `profile: any` type-safety gap).

**Still open after this session:** Parent account creation had no
working path at all (fixed 2026-08-18, session 1); Attendance, Result,
Announcement, Event were in the same stubbed state as Parent;
`/list/messages` sidebar link still pointed nowhere.

---

## 2026-08-16 — Security hardening pass

First security pass over the app: missing authorization on detail
pages, no rate limiting, no security headers, unmanaged secrets.

1. **Environment variables.** `.env` was confirmed never committed
   (`git log --all --full-history -- .env`), but there was no template
   for other developers and no guidance for if it ever is. Added
   `.env.example` (safe placeholders) and `SECURITY_ADVISORY.md`-style
   guidance, now consolidated into [SECURITY.md](./SECURITY.md).

2. **Rate limiting.** None existed anywhere. Added an in-memory limiter
   (`src/lib/ratelimit.ts`, single-process, keyed by user id + action)
   and wired it into Subject actions as the reference implementation:
   `createSubject` 5/min, `updateSubject` 10/min, `deleteSubject` 5/min.
   Extended to all remaining entities by 2026-08-21 (see status
   snapshot above). See [docs/RATE_LIMITING.md](./docs/RATE_LIMITING.md).

3. **Detail-page authorization.**
   `src/app/(dashboard)/list/students/[id]/page.tsx` and
   `.../teachers/[id]/page.tsx` rendered any student/teacher record to
   any authenticated user, with no ownership or role check.
   **Fix:** teacher → only students in their own classes; student →
   only their own profile; parent → only their own children; admin →
   unrestricted. Teacher detail: teacher → own profile only; admin →
   unrestricted; student/parent → blocked. Unauthorized access returns
   404, not a rendered page or an explicit "forbidden" message, to avoid
   leaking which records exist.

4. **Security headers.** `next.config.mjs` had none. Added
   `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`,
   `Strict-Transport-Security`, `Content-Security-Policy`,
   `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`, and
   added Cloudinary to the CSP's allowed image sources.

**Files:** `.env.example` (new), `src/lib/ratelimit.ts` (new),
`src/lib/actions.ts`,
`src/app/(dashboard)/list/students/[id]/page.tsx`,
`src/app/(dashboard)/list/teachers/[id]/page.tsx`,
`next.config.mjs`.

---

## Undated — React 19 / Next.js 16 alignment

The Student form's `useActionState` requires React's 19 Server Action
model; the project was still on React 18.3.1 under Next.js 16.3.1.
**Fix:** pinned `react`/`react-dom` to `19.2.0` and updated the React
type packages. (`node_modules`/`.next` need a clean reinstall after this
change so stale React 18 packages aren't retained.) The Student Server
Action also now returns explicit authorization errors instead of
masking them as a generic failure.

**Files:** `package.json`, `src/lib/actions.ts` (Student action).

---

## Undated — Docker/infra hardening (Phase 1 audit fixes)

Findings from an internal engineering audit, fixed in place against
the original project export.

- **`src/lib/authz.ts`** (new) — `requireRole(...roles)` server-side
  guard; every mutating action now calls it first.
- **`src/lib/actions.ts`** — `requireRole()` added to every mutation
  (Subject/Class/Teacher/Student require `admin`; Exam requires `admin`
  or `teacher`, with an ownership check restored for teachers — a
  lesson-based filter that previously existed only as commented-out dead
  code). Restored every `revalidatePath(...)` call that had been
  commented out, so list pages stopped showing stale data after
  mutations.
- **`src/middleware.ts`** — `NextResponse.redirect(new URL('/${role}',
  req.url))` was a literal string, not a template literal, so every
  unauthorized redirect went to the non-existent path `/${role}`.
  Fixed to `` new URL(`/${role}`, req.url) ``. Added explicit handling
  for a signed-in user with no role yet (redirect to `/sign-in` instead
  of a non-null assertion on `undefined`).
- **`docker-compose.yml`** — rewritten: `app` correctly nested under
  `services:`; `depends_on` moved out of `environment:` (where it had no
  effect) to the service level with a healthcheck-based condition;
  credentials sourced from `.env` instead of hardcoded
  `postgres/postgres`.
- **`Dockerfile`** — rewritten as multi-stage (`deps`/`build`/`runtime`)
  so the final image excludes dev dependencies and build tooling.
  Removed `prisma migrate dev --name init` from the build step (an
  interactive/dev command that bakes one database's migration state into
  the image) — migrations now run via `prisma migrate deploy` at
  container **start**. Runs as a non-root `app` user.
  Separately fixed a build-order bug: `npm ci` triggers `postinstall`
  (`prisma generate`), but the `deps` stage copied `package*.json` before
  `prisma/` existed in that stage, failing with "Could not find Prisma
  Schema" — `prisma/` is now copied in before `npm ci` runs. Also added
  `openssl` to the `deps` and `runtime` stages: without it, Prisma's
  engine downloader silently guessed the OpenSSL version on
  `node:20-slim`, risking a mismatch at container start.
  Also fixed two build-time failures: `ClerkProvider` (root layout) needs
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` even during Next.js's build-time
  static-generation pass, so it's now a Docker `ARG`/`ENV` in the build
  stage (safe to bake in — `NEXT_PUBLIC_*` vars are public and ship in
  the client bundle regardless); and the `(dashboard)` route group was
  being statically prerendered despite querying the DB per signed-in
  user, so `export const dynamic = "force-dynamic"` was added to
  `src/app/(dashboard)/layout.tsx` (applies to every page under it) —
  this also means `DATABASE_URL` should not be needed as a build arg at
  all.
- **`.dockerignore`** (new) — excludes `node_modules`, `.next`, `.git`,
  `.env*`.
- **`.env.example`** (new at the time) — documents `DB_USER`,
  `DB_PASSWORD`, `DB_NAME`, Clerk keys for Docker Compose + Prisma.
- **`package.json`** — `"start": "next start"` → `"next start -p
  ${PORT:-3000}"` (`next start` doesn't read `PORT` on its own; hosts
  like Render inject it and expect the process to bind to it). Bumped
  `next` off a canary pre-release to a stable version at the time;
  aligned `eslint-config-next` to match; removed unused `hook-form` /
  `resolvers` packages (the real `react-hook-form` /
  `@hookform/resolvers` were already present and in use).
- **`package-lock.json`** — regenerated against the corrected
  `package.json` (the stale lockfile was the direct cause of `npm ci`
  failing on Render with an "Invalid: lock file" error).

**Not covered in this pass:** full per-button UI audit of each list
page; `Attandance`/`Announcents` model-name typos (deferred — breaking
migration); no test suite yet.

---

## Undated — Phase 2 fixes

- **`src/lib/logger.ts`** (new) — structured JSON logging for server
  errors, replacing bare `console.log(err)`.
- **`src/lib/env.ts` + `src/instrumentation.ts`** (new) — required env
  vars now fail loudly at server startup instead of silently at request
  time.
- **`scripts/start.mjs`** (new) — cross-platform `PORT` binding for
  hosts like Render.
- **`src/components/FormContainer.tsx`** — fixed a missing `break` after
  the `teacher` case (fall-through bug) and a wrong query
  (`grade.findMany` → `class.findMany` for `studentClasses`); added
  `take` limits on dropdown queries.
- **`src/app/(dashboard)/list/results/page.tsx`** — fixed the student
  name column rendering the name twice.
- **Forms** — removed leftover debug `console.log` calls from every
  form's submit handler.
- **`.env.example`** — documented `DATABASE_URL`, `DIRECT_URL`, `PORT`.
- **`docker-compose.yml`** — passes Clerk keys and `PORT` through to the
  app container.
- **`prisma/schema.prisma`** — added indexes on foreign keys and
  commonly-filtered columns (`Student`, `Lesson`, `Exam`, `Assignment`,
  `Result`, `Attandance`).

---

## Undated — Logo replacement & sign-in UI

- Replaced the app logo with the Siyakha emblem (`public/SSKLogo02.png`,
  transparent background); dashboard logo enlarged; favicon/shortcut/
  Apple icons updated to match.
- Sign-in header redesigned: logo centered, improved spacing, input
  styling, accessibility labels, loading state.
- Removed the hard-coded `email_code` verification strategy from the
  username/password-only sign-in screen — it could cause Clerk to
  register an unsupported verification state when email-code
  verification/MFA isn't enabled on the Clerk instance.
- Kept Clerk's global error display so auth errors are visible in the UI,
  not just the browser console.
- Post-auth navigation changed from `router.push()` to
  `router.replace()` so a signed-in user can't navigate back to the
  sign-in page with the browser back button.

**Note:** a full Next.js production build could not be verified in the
environment this change was made in (dependency install was incomplete).
Run `npm install && npm run build` locally before deploying any change
from this entry.
