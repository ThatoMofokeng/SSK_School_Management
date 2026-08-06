# Changes applied (Phase 1 fixes)

This is the corrected project from `SSK_School_Management-main.zip`, with the
Critical/High findings from the Phase 1 audit fixed in place. Everything not
listed here is unchanged from your original code.

## 1. `src/lib/authz.ts` — NEW FILE
Server-side role guard (`requireRole(...roles)`) that every mutating action
now calls first. Throws if there's no session or the caller's role isn't
in the allowed list.

## 2. `src/lib/actions.ts` — rewritten
- Added `await requireRole(...)` as the first line inside every mutation:
  `createSubject/updateSubject/deleteSubject`, `createClass/updateClass/deleteClass`,
  `createTeacher/updateTeacher/deleteTeacher`, `createStudent/updateStudent/deleteStudent`
  → all now require the `admin` role server-side, not just UI-hidden.
- `createExam/updateExam/deleteExam` → require `admin` or `teacher`; for
  teachers, restored (and completed) the ownership check that previously
  existed only as commented-out dead code, so a teacher can only touch
  exams tied to their own lessons. `deleteExam` does this via a lookup
  first, since Prisma's `delete()` `where` only accepts unique fields and
  can't take an arbitrary `lesson: { teacherId }` filter directly.
- Restored every `revalidatePath(...)` call that was commented out, so
  list pages no longer show stale data after a create/update/delete.

## 3. `src/middleware.ts` — fixed
- `NextResponse.redirect(new URL('/${role}', req.url))` → now a real
  template literal: `` new URL(`/${role}`, req.url) ``. Previously this
  redirected every unauthorized user to the literal, non-existent path
  `/${role}`.
- Added explicit handling for a signed-in user with no role yet
  (redirects to `/sign-in` instead of falling through to a non-null
  assertion on `undefined`).

## 4. `docker-compose.yml` — rewritten
- Fixed invalid structure: `app` is now correctly nested under `services:`.
- `depends_on` moved out of `environment:` (where it had no effect) to
  the service level, with a `healthcheck`-based condition so the app
  waits for Postgres to actually be ready.
- Credentials now come from `.env` (`DB_USER`/`DB_PASSWORD`/`DB_NAME`)
  instead of being hardcoded as `postgres/postgres`.

## 5. `Dockerfile` — rewritten (multi-stage)
- Split into `deps` / `build` / `runtime` stages so the final image
  doesn't ship dev dependencies or build tooling.
- Removed `RUN npx prisma migrate dev --name init` from the build step
  (that's an interactive/dev command and bakes one database's migration
  state into the image). Migrations now run via `prisma migrate deploy`
  at container **start**, against whatever `DATABASE_URL` the container
  is actually given.
- Runs as a non-root `app` user instead of root.

## 6. `.dockerignore` — NEW FILE
Excludes `node_modules`, `.next`, `.git`, and `.env*` from the build context.

## 7. `.env.example` — NEW FILE
Documents the env vars `docker-compose.yml` and Prisma now expect
(`DB_USER`, `DB_PASSWORD`, `DB_NAME`, Clerk keys). Copy to `.env` and fill
in real values — `.env` itself is already gitignored.

## 8a. `package.json` — start script
`"start": "next start"` → `"start": "next start -p ${PORT:-3000}"`.
`next start` does **not** automatically read the `PORT` env var — hosts
like Render inject `PORT` (default `10000`) and expect your process to
bind to it, so without this the app would keep listening on 3000 and
Render would never detect an open port.

## 8. `package.json`
- `next`: `^15.4.2-canary.35` → `^15.4.7` (stable release, not a canary/pre-release).
- `eslint-config-next`: `14.2.5` → `^15.4.7` (was mismatched against Next 15).
- Removed `hook-form` and `resolvers` — confirmed unused anywhere in `src/`
  (the real packages `react-hook-form` and `@hookform/resolvers` are still
  present and are what the code actually imports).

## 9. `package-lock.json` — regenerated
The lockfile was still pinned to the versions from before the `package.json`
edits above (canary Next.js, old `eslint-config-next`, the removed
`hook-form`/`resolvers` packages), which is exactly why the Render build
failed with `npm error Invalid: lock file's ... does not satisfy ...` on
`npm ci`. Regenerated it against the corrected `package.json` and verified
`npm ci` completes cleanly from a clean `node_modules`.

## What you need to do before running this
1. `cp .env.example .env` and fill in real `DB_USER`/`DB_PASSWORD`/`DB_NAME`
   and your Clerk keys.
2. Delete `package-lock.json` and run `npm install` to regenerate it against
   the updated `package.json` (the old lockfile still references the canary
   Next.js build).
3. In Clerk's dashboard, make sure every existing test user actually has a
   `role` set in `publicMetadata` — the middleware now explicitly redirects
   anyone without one to `/sign-in` rather than silently mis-redirecting.
4. `docker compose up --build`.

## Still open (not in this pass — see the Phase 1 report for why)
- Full per-button UI audit of each list page.
- `prisma/schema.prisma` review (indexes, cascade rules, the
  `Attandance`/`Announcents` naming typos).
- Structured error logging in place of bare `console.log(err)`.
- Test suite — there isn't one yet.
