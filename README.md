# Siyakha Student Management System

A role-based school management dashboard for admins, teachers, students, and
parents — built on Next.js (App Router), Prisma, PostgreSQL, and Clerk.

## Contents

- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Roles & access control](#roles--access-control)
- [Domain model](#domain-model)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Known issues / technical debt](#known-issues--technical-debt)
- [Further documentation](#further-documentation)

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| UI | React 19, Tailwind CSS 3 |
| Auth | Clerk (`@clerk/nextjs`) — role stored in `publicMetadata.role` |
| Database | PostgreSQL (Supabase), Prisma ORM |
| Forms | `react-hook-form` + `zod` schema validation |
| Media | Cloudinary (`next-cloudinary`) |
| Charts / calendar | `recharts`, `react-big-calendar` |

## Architecture

Standard Next.js App Router setup:

- **Server Components** fetch data directly with Prisma inside `src/app/**/page.tsx`.
- **Server Actions** (`src/lib/actions.ts`) handle all create/update/delete
  mutations. Every mutation calls `requireRole(...)` (`src/lib/authz.ts`)
  first — authorization is enforced server-side, not just hidden in the UI.
- **Clerk middleware** (`src/middleware.ts`) gates routes using
  `routeAccessMap` in `src/lib/setting.ts`, keyed by the signed-in user's
  role.
- **Rate limiting** (`src/lib/ratelimit.ts`) is an in-memory, per-process
  limiter applied to every mutating action. It is correct for a single
  instance/container; see [Known issues](#known-issues--technical-debt) for
  the production caveat.
- **Structured logging** (`src/lib/logger.ts`) replaces bare
  `console.log` for server errors.
- **Env validation** (`src/lib/env.ts` + `src/instrumentation.ts`) fails
  fast at server startup if required environment variables are missing,
  instead of failing later at request time.

## Roles & access control

Four roles, set in each user's Clerk `publicMetadata.role`:

- **admin** — full access to every entity.
- **teacher** — scoped to their own classes, lessons, and exams; can view
  students in classes they teach.
- **student** — read-only access to their own record and related data.
- **parent** — read-only access to their own children's records.

Route-level access is enforced in `src/lib/setting.ts`
(`routeAccessMap`) and Clerk middleware. Record-level access (e.g. "this
teacher may only view this student") is enforced inside each Server
Component / Server Action — see `src/app/(dashboard)/list/students/[id]/page.tsx`
and `src/app/(dashboard)/list/teachers/[id]/page.tsx` for the reference
implementation. Unauthorized access to a detail page returns a 404, not a
"forbidden" message, to avoid confirming a record exists.

## Domain model

Defined in `prisma/schema.prisma`:

`Admin`, `Student`, `Teacher`, `Parent`, `Grade`, `Class`, `Subject`,
`Lesson`, `Exam`, `Assignment`, `AssignmentAttachment`, `ContentFile`,
`Result`, `Attandance`, `Event`, `Announcement`, `Message`.

> `Attandance` is a typo in the model name, kept as-is to avoid a breaking
> migration. See [Known issues](#known-issues--technical-debt).

## Project structure

```
src/
  app/
    (dashboard)/            # authenticated app shell
      admin/ teacher/ student/ parent/   # role landing pages
      list/                              # one folder per entity (CRUD list + [id] detail)
      profile/ settings/
    sign-in/                             # Clerk catch-all sign-in flow
  components/
    Forms/                               # one form component per entity
    FormContainer.tsx                    # fetches relatedData for a FormModal
    FormModal.tsx                        # create/update/delete modal, entity-to-form/action map
  lib/
    actions.ts          # all Server Actions (create/update/delete per entity)
    authz.ts             # requireRole() guard
    ratelimit.ts          # in-memory per-user rate limiter
    formValidationSchemas.ts  # zod schemas per entity
    setting.ts            # routeAccessMap, sidebar menu config
    logger.ts              # structured JSON error logging
    env.ts                  # startup env validation
    prisma.ts               # Prisma client singleton
prisma/
  schema.prisma
  migrations/
scripts/
  start.mjs             # PORT-aware start script (for Render/Vercel-style hosts)
```

## Getting started

```bash
git clone <repo-url>
cd SSK_School_Management-nkotolane-pitso
cp .env.example .env      # fill in real values — see below
npm install                # postinstall runs `prisma generate`
npx prisma migrate deploy  # or `npx prisma db push` for a quick dev sync
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example` for the full annotated list. Summary:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Pooled connection (port 6543 for Supabase). Needs `connection_limit` > 1. |
| `DIRECT_URL` | yes | Direct connection (port 5432). Used for migrations. |
| `PORT` | no | Defaults to 3000; read by `scripts/start.mjs`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Also required at **build time** — see [DEPLOYMENT.md](./DEPLOYMENT.md). |
| `CLERK_SECRET_KEY` | yes | Use `sk_live_*` in production, not `sk_test_*`. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / redirect URLs | yes | Clerk flow routing. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | optional | Only needed if image uploads are used. |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server via `scripts/start.mjs` (binds to `PORT`) |
| `npm run lint` | ESLint |
| `npx prisma generate` | Regenerate Prisma Client (also runs on `postinstall`) |
| `npx prisma migrate deploy` | Apply pending migrations in production |

## Known issues / technical debt

- **Rate limiting is in-memory**, per process. Correct for a single
  instance; breaks down under horizontal scaling. See
  [docs/RATE_LIMITING.md](./docs/RATE_LIMITING.md) for the Redis/Upstash
  upgrade path.
- **`src/lib/actions.ts` is a single ~1500+ line file** covering every
  entity's mutations. Worth splitting per-entity.
- **No automated test suite** (Vitest or otherwise).
- **`Attandance` / `Announcents`-style typos** in `schema.prisma` model
  names are intentionally left as-is — renaming requires a breaking
  migration and hasn't been scheduled.
- **Clerk test keys** (`pk_test_*` / `sk_test_*`) must be swapped for
  production keys (`pk_live_*` / `sk_live_*`) before go-live — see
  [DEPLOYMENT.md](./DEPLOYMENT.md).
- **POPIA compliance** (South Africa): consent-on-file for minors' data,
  a data retention policy, and a designated Information Officer should be
  confirmed before real learner/parent data is stored — not implemented
  in code, flagged here as an operational requirement.

## Further documentation

- [CHANGELOG.md](./CHANGELOG.md) — dated log of fixes and changes, with
  root cause and files touched.
- [SECURITY.md](./SECURITY.md) — security posture, what's been hardened,
  what to do if secrets leak.
- [DEPLOYMENT.md](./DEPLOYMENT.md) — deploy to Vercel, step by step.
- [docs/RATE_LIMITING.md](./docs/RATE_LIMITING.md) — how the rate limiter
  works and how to extend or replace it.
