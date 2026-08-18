
// scripts/create-student.mjs
//
// Creates a test Student account: a Clerk user (username + password,
// publicMetadata.role = "student" — NO email attached to Clerk, so
// no email-verification step, matching how src/lib/actions.ts
// createStudent() works) plus the matching Prisma Student row.
//
// Student rows require an existing Grade, Class, and Parent (all
// required foreign keys in schema.prisma). If none exist yet in your
// database, this script creates minimal ones automatically so it
// works even before you've run the full prisma/seed.ts.
//
// Usage:
//   node --env-file=.env scripts/create-student.mjs <username> <password> <firstName> <lastName> <email>
//
// Example:
//   node --env-file=.env scripts/create-student.mjs pnkotolane "TestPass123!" Pitso Nkotolane pnkotolane@gmail.com

import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";

const [, , username, password, firstName, lastName, email] = process.argv;

if (!username || !password || !firstName || !lastName || !email) {
  console.error(
    "Usage: node --env-file=.env scripts/create-student.mjs <username> <password> <firstName> <lastName> <email>"
  );
  process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY is not set. Run with `node envfile=.env ...`. - create-student.mjs:33");
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const prisma = new PrismaClient();

async function ensureGrade() {
  let grade = await prisma.grade.findFirst();
  if (!grade) {
    console.log("No Grade found  creating Grade level 1... - create-student.mjs:43");
    grade = await prisma.grade.create({ data: { level: 1 } });
  }
  return grade;
}

async function ensureClass(gradeId) {
  let classItem = await prisma.class.findFirst({
    where: { gradeId },
    include: { _count: { select: { students: true } } },
  });
  const hasRoom = classItem && classItem._count.students < classItem.capacity;

  if (!classItem || !hasRoom) {
    console.log("No class with room found  creating Class 1A... - create-student.mjs:57");
    classItem = await prisma.class.create({
      data: { name: `1A-${Date.now()}`, gradeId, capacity: 30 },
    });
  }
  return classItem;
}

async function ensureParent() {
  let parent = await prisma.parent.findFirst();
  if (!parent) {
    console.log("No Parent found  creating a placeholder test parent... - create-student.mjs:68");
    parent = await prisma.parent.create({
      data: {
        id: `test-parent-${Date.now()}`,
        username: `testparent${Date.now()}`,
        name: "Test",
        surname: "Parent",
        phone: `000-000-${Date.now().toString().slice(-4)}`,
        address: "N/A",
      },
    });
  }
  return parent;
}

async function main() {
  const grade = await ensureGrade();
  const classItem = await ensureClass(grade.id);
  const parent = await ensureParent();

  console.log(`Creating Clerk user for username "${username}"... - create-student.mjs:88`);
  const user = await clerk.users.createUser({
    username,
    password,
    firstName,
    lastName,
    publicMetadata: { role: "student" },
  });
  console.log(`Clerk user created: ${user.id} - create-student.mjs:96`);

  await prisma.student.create({
    data: {
      id: user.id,
      username,
      name: firstName,
      surname: lastName,
      email,
      address: "N/A",
      sex: "MALE",
      birthday: new Date("2010-01-01"),
      gradeId: grade.id,
      classId: classItem.id,
      parentId: parent.id,
    },
  });

  console.log(
    `\nDone. Sign in at /sign-in with:\n  username: ${username}\n  password: ${password}`
  );
}

main()
  .catch((err) => {
    console.error("Failed to create student: - create-student.mjs:121", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
