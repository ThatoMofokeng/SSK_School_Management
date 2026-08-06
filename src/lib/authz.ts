import { auth } from "@clerk/nextjs/server";

export type Role = "admin" | "teacher" | "student" | "parent";

export class AuthzError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthzError";
  }
}

/**
 * Server-side authorization guard. Call this at the top of every
 * mutating Server Action (create/update/delete) BEFORE touching Prisma.
 *
 * Hiding a button in the UI is not a security boundary — Server Actions
 * are callable directly, so every mutation must re-check the caller's
 * role on the server, not just trust that the page hid the control.
 */
export async function requireRole(...allowed: Role[]) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    throw new AuthzError("UNAUTHENTICATED");
  }

  const role = (sessionClaims?.metadata as { role?: Role })?.role;

  if (!role || !allowed.includes(role)) {
    throw new AuthzError("FORBIDDEN");
  }

  return { userId, role };
}

/**
 * For actions where a teacher may only act on their own lesson/exam
 * (rather than being blocked outright). Returns the caller's role and id
 * so the calling action can add an ownership filter to its Prisma query.
 */
export async function requireRoleWithOwnership(...allowed: Role[]) {
  return requireRole(...allowed);
}
