// scripts/link-admin.mjs
//
// Companion to create-admin.mjs. Use this when the Clerk user already
// exists and you just need to create/repair the matching `Admin` row
// in Postgres. Safe to re-run — it's an upsert.
//
// Usage:
//   node --env-file=.env scripts/link-admin.mjs <clerkUserId> <username>

import { PrismaClient } from "@prisma/client";

const [, , clerkUserId, username] = process.argv;

if (!clerkUserId || !username) {
  console.error(
    "Usage: node --env-file=.env scripts/link-admin.mjs <clerkUserId> <username>"
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  await prisma.admin.upsert({
    where: { id: clerkUserId },
    update: { username },
    create: { id: clerkUserId, username },
  });

  console.log(`Admin row upserted for id ${clerkUserId} (username: ${username}) - link-admin.mjs:30`);
}

main()
  .catch((err) => {
    console.error("Failed to link admin: - link-admin.mjs:35", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());