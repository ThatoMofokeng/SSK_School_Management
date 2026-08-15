// scripts/create-admin.mjs
//
// Bootstraps the FIRST admin account for SSK School Management.
//
// Why this exists: every user in this app (admin, teacher, student,
// parent) is created via clerkClient().users.createUser() from
// src/lib/actions.ts, and every one of those actions requires the
// caller to already be signed in as an admin (middleware.ts ->
// requireRole("admin")). There's no self-service sign-up page. That
// means the very first admin can't be created through the app itself
// — this script does it directly against the Clerk Backend API, then
// mirrors the record into your Prisma `Admin` table so the admin
// dashboard queries (which join on Admin.id) work correctly.
//
// The Admin.id column has no default — it's designed to hold the
// Clerk user's id, so this script uses that id for both records.
//
// Usage (run once, from the project root, with Node 20+):
//   node --env-file=.env scripts/create-admin.mjs <username> <email> <password>
//
// Example:
//   node --env-file=.env scripts/create-admin.mjs admin1 admin@skk.co.za "S0meStrongPassword!"
//
// Notes:
// - <password> must satisfy Clerk's default strength rules (8+ chars,
//   not a common/breached password). Quote it if it has spaces or
//   special shell characters.
// - Users created this way come back from Clerk already verified —
//   no confirmation email is sent, this is the same as creating a
//   user from the Clerk Dashboard.
// - Make sure CLERK_SECRET_KEY in your .env matches the SAME Clerk
//   instance (test vs live) your NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
//   points at, or the app still won't recognize the user.

import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";

const [, , username, email, password] = process.argv;

if (!username || !email || !password) {
  console.error(
    "Usage: node --env-file=.env scripts/create-admin.mjs <username> <email> <password>"
  );
  process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error(
    "CLERK_SECRET_KEY is not set. Run with `node --env-file=.env ...` from the project root, " +
      "or make sure .env has CLERK_SECRET_KEY filled in."
  );
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const prisma = new PrismaClient();

async function main() {
  console.log(`Creating Clerk user for ${email}...`);

  const user = await clerk.users.createUser({
    username,
    emailAddress: [email],
    password,
    publicMetadata: { role: "admin" },
  });

  console.log(`Clerk user created: ${user.id}`);

  await prisma.admin.upsert({
    where: { id: user.id },
    update: { username },
    create: { id: user.id, username },
  });

  console.log(`Admin row upserted in the database for id ${user.id}`);
  console.log(
    `\nDone. Sign in at /sign-in with:\n  identifier: ${username} (or ${email})\n  password: <what you passed in>`
  );
}

main()
  .catch((err) => {
    console.error("Failed to create admin:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
