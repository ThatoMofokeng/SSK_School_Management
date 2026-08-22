# Fixes Log — Siyakha Student Management System

Running log of security and bug-fix work on this repo, in chronological order.
Each entry has: what was wrong, why (root cause), what changed, and which files.

---

## 2026-08-16 — Security hardening pass

### Summary

First security pass over the app. Addressed missing authorization checks on
detail pages, no rate limiting, no security headers, and exposed secrets
handling.

### 1. Environment variable handling

`.env` was not committed (confirmed via `git log --all --full-history -- .env`),
but there was no template for other developers to work from and no written
guidance on what to do if it ever is committed.

- Added `.env.example` — safe template with placeholder values.
- Added `SECURITY_ADVISORY.md` — steps to take if secrets are ever exposed
  (rotate keys, purge git history, etc).

### 2. Rate limiting

No rate limiting existed anywhere. Added an in-memory rate limiter
(`src/lib/ratelimit.ts`, single-process, keyed by user id + action) and wired
it into the Subject actions as the reference implementation:

- `createSubject`: 5/min
- `updateSubject`: 10/min
- `deleteSubject`: 5/min

**Not yet applied to:** Class, Teacher, Student, Exam actions (9 functions).
The in-memory approach only works for a single container — if this app scales
horizontally, swap it for Redis/Upstash before relying on it. Pattern is
documented in `RATE_LIMITING_IMPLEMENTATION.md`.

### 3. Detail-page authorization

`src/app/(dashboard)/list/students/[id]/page.tsx` and
`src/app/(dashboard)/list/teachers/[id]/page.tsx` rendered any student/teacher
record to any authenticated user — no ownership or role check. Fixed:

- **Student detail page:** teacher → only students in their own classes;
  student → only their own profile; parent → only their own children; admin →
  unrestricted.
- **Teacher detail page:** teacher → only their own profile; admin →
  unrestricted; student/parent → blocked.

Unauthorized access now returns a 404 rather than a rendered page or an
explicit "forbidden" message, to avoid leaking which records exist.

### 4. Security headers

`next.config.mjs` had no security headers at all. Added:

`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`,
`Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy`,
`Permissions-Policy`, `X-DNS-Prefetch-Control`. Also added Cloudinary to the
CSP's allowed image sources (the app loads student/teacher photos from
there).

### Files changed

**Created:** `.env.example`, `src/lib/ratelimit.ts`, `SECURITY_ADVISORY.md`,
`RATE_LIMITING_IMPLEMENTATION.md`, `CRITICAL_FIXES_APPLIED.md`,
`FIXES_SUMMARY.md`, `_bmad-output/SSK_Engineering_Audit_Report.md`

**Modified:** `src/lib/actions.ts`,
`src/app/(dashboard)/list/students/[id]/page.tsx`,
`src/app/(dashboard)/list/teachers/[id]/page.tsx`, `next.config.mjs`

### Outstanding before production

1. **Switch Clerk from test to production keys** (`pk_test_*`/`sk_test_*` →
   `pk_live_*`/`sk_live_*`) in the deployment environment.
2. **Extend rate limiting** to the remaining 9 actions using the Subject
   implementation as the template.
3. Confirm CSP doesn't block any third-party resources the app actually
   loads in production (check the browser console for CSP violations after
   deploy).

---

## 2026-08-18 (session 1) — Parent form, React 19 migration, Messages runtime errors

### Summary

Local testing against a real Supabase DB surfaced a chain of build/runtime
errors. Not a security pass — these are correctness bugs that were blocking
Parent management and Messages entirely.

### 1. Parent create/update was non-functional

`Parentform.tsx` imported `parentSchema` / `ParentSchema` from
`formValidationSchemas.ts` and `createParent` / `updateParent` from
`actions.ts` — none of which existed. The Parent CRUD flow had been stubbed
out in the UI but never implemented server-side.

**Fix:**
- Added `parentSchema` / `ParentSchema` to `formValidationSchemas.ts`,
  modeled on `studentSchema` (phone and address required, per the `Parent`
  Prisma model).
- Added `createParent` / `updateParent` to `actions.ts`, following the
  existing Teacher action pattern (Clerk user creation + Prisma row insert,
  `role: "parent"`).

### 2. Incomplete React 19 `useActionState` migration

React 19 removed `useFormState` (react-dom) in favor of `React.useActionState`.
The migration had been done inconsistently across the form components:

- `MessageForm.tsx`, `ClassForm.tsx`, `SubjectForm.tsx` were still calling
  the now-removed `useFormState` — hard runtime error.
- `StudentForm.tsx`, `TeacherForm.tsx`, `ExamForm.tsx`, `Parentform.tsx` had
  already switched to `useActionState` but left the `useFormState` import in
  place (dead import, no functional bug).

Separately, `useActionState`'s dispatch function must be called inside
`startTransition` when it's async — none of the seven forms did this, which
throws: *"An async function with useActionState was called outside of a
transition."*

**Fix:** standardized all seven forms on `useActionState`, removed the dead
imports, and wrapped every `formAction(...)` call in `startTransition(...)`.

### 3. Messages page: `Cannot read properties of undefined (reading 'findMany')`

`prisma.message` was `undefined` at runtime even though `Message` was defined
in `schema.prisma`. Root cause: the generated Prisma Client
(`node_modules/@prisma/client`) was stale — it had been generated before the
`Message` model was added and never regenerated.

**Fix:** `npx prisma generate` (client-side fix), plus `npx prisma db push`
to sync the `Message` table to the actual Supabase database. Deliberately
did **not** run `prisma migrate reset` — the migration-history divergence
that prompted Prisma to suggest it was just a renamed/duplicated local
migration folder, not a real schema conflict, and `reset` would have dropped
all data in Supabase.

### 4. `/list/messages` had no route protection

`routeAccessMap` in `src/lib/setting.ts` never listed `/list/messages`, so
Clerk's middleware let unauthenticated requests through to the page
unchecked. `auth()` then returned `userId: null`; the page used
`currentUserId!` (non-null assertion) when building the Prisma query, which
silenced the type error but crashed at runtime with `Argument receiverId
must not be null`.

**Fix:** added `"/list/messages": ["admin", "teacher", "student", "parent"]`
to `routeAccessMap`.

### Files changed (9)

1. `src/lib/formValidationSchemas.ts` — add `parentSchema` / `ParentSchema`
2. `src/lib/actions.ts` — add `createParent` / `updateParent`
3. `src/components/Forms/Parentform.tsx` — `startTransition` wrapper
4. `src/components/Forms/MessageForm.tsx` — `useActionState` swap + `startTransition`
5. `src/components/Forms/ClassForm.tsx` — `useActionState` swap + `startTransition`
6. `src/components/Forms/SubjectForm.tsx` — `useActionState` swap + `startTransition`
7. `src/components/Forms/StudentForm.tsx` — dead import removed + `startTransition`
8. `src/components/Forms/TeacherForm.tsx` — dead import removed + `startTransition`
9. `src/lib/setting.ts` — add `/list/messages` to `routeAccessMap`

**Manual steps (not in the diff), run against Supabase:**
`npx prisma generate`, `npx prisma db push`.

---

## 2026-08-18 (session 2) — Messages redesign, Announcement build-out

### Summary

Follow-up in the same day: one more runtime bug, a UI redesign of the
Messages list/compose to match a reference layout, and building out
Announcement management, which — like Parent in session 1 — had UI wired up
in `FormContainer`/`FormModal` but no schema, actions, or form behind it.

### 1. `FormModal.tsx`: React `value`-without-`onChange` warning on delete confirm

The hidden `id` input in the delete-confirmation form used `value={id}` with
no `onChange` handler, which React treats as an unintentional read-only
field and warns about. It also had `type="text | number"` — a TypeScript
union type string that had leaked into the JSX as a literal, which isn't a
valid HTML `type` attribute.

**Fix:** `value={id}` → `defaultValue={id}` (the field is intentionally
uncontrolled), `type="text | number"` → `type="text"`.

### 2. Messages UI redesign

Restyled to match a reference layout (Blackboard-style), scoped intentionally:
kept the existing modal-based compose flow and individual (non-threaded)
messages — only the visual layer changed, not the data model or interaction
pattern.

- `src/app/(dashboard)/list/messages/page.tsx` — list rebuilt as a card list
  (avatar initials, sender/recipient name, date, one-line preview,
  delete-on-hover) replacing the plain `<table>` rendering.
- `src/components/Forms/MessageForm.tsx` — compose form restyled: "To:" row
  with a search icon, tighter spacing, pill-shaped Send button.
- `src/components/FormModal.tsx` — "New Message" trigger changed from the
  generic icon-only circle button (shared by every entity) to a labeled pill
  button. Scoped to `table === "message"` only, so every other entity's
  create button is unaffected.

### 3. Announcement management was a stub

Same issue as Parent in session 1: `FormModal.tsx` mapped the `announcement`
table to `notImplementedAction`, so the create button on `/list/announcements`
just rendered "Announcement management isn't available yet." — no schema,
no actions, no form component existed.

**Fix**, following the existing Class/Exam pattern:

- `src/lib/formValidationSchemas.ts` — added `announcementSchema` /
  `AnnouncementSchema` (title, description, date, optional classId).
- `src/lib/actions.ts` — added `createAnnouncement` / `updateAnnouncement` /
  `deleteAnnouncement`, all gated with `requireRole("admin")`.
- `src/components/Forms/AnnouncementForm.tsx` (new) — title, description,
  date, optional class dropdown.
- `src/components/FormModal.tsx` — registered the new form in the
  create/update form map and the delete action map (replacing
  `notImplementedAction` for `announcement`).
- `src/components/FormContainer.tsx` — added the `announcement` case to
  fetch the class list for the dropdown (`relatedData.classes`).

No schema or migration change was needed — `Announcement` already existed in
`schema.prisma`; only the application-layer plumbing around it was missing.

### Files changed (8, incl. 1 new)

1. `src/components/FormModal.tsx` — hidden-input fix, message trigger
   restyle, announcement wiring
2. `src/app/(dashboard)/list/messages/page.tsx` — card-list redesign
3. `src/components/Forms/MessageForm.tsx` — compose form redesign
4. `src/lib/formValidationSchemas.ts` — add `announcementSchema` /
   `AnnouncementSchema`
5. `src/lib/actions.ts` — add `createAnnouncement` / `updateAnnouncement` /
   `deleteAnnouncement`
6. `src/components/Forms/AnnouncementForm.tsx` — new
7. `src/components/FormContainer.tsx` — add `announcement` relatedData case

---

## Known gaps / not yet done

Updated 2026-08-21:

- All 14 entities (Subject, Class, Teacher, Student, Parent, Exam, Result,
  Assignment, Lesson, ContentFile, Message, Announcement, Event,
  Attendance) now have real create/update/delete actions wired into
  `FormModal.tsx` and `FormContainer.tsx` — `notImplementedAction` has
  been removed entirely, no tables left hitting it.
- Rate limiting now covers every mutating action (40 call sites across
  all entities), not just Subject.
- No automated tests (Vitest or otherwise) — still open.
- `src/lib/actions.ts` is a single monolithic file (~1500+ lines) —
  worth splitting per entity at some point, especially now that every
  entity has full CRUD in it.
- No Redis-backed rate limiting — current implementation is in-memory
  and won't work correctly if this ever runs as more than one
  container/instance. Fine for a single-instance deploy (e.g. one
  Vercel serverless region with low traffic), but worth revisiting
  before scaling.
- Still needs a manual click-through test of Parent/Event/Result CRUD
  against the real production database - these were built and
  typechecked but not yet exercised against live Supabase data.