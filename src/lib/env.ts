const REQUIRED_AT_RUNTIME = [
  "DATABASE_URL",
  "DIRECT_URL",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
] as const;

export function validateEnv() {
  const missing = REQUIRED_AT_RUNTIME.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Set them in .env locally or in your hosting provider's dashboard before starting the server."
    );
  }
}
