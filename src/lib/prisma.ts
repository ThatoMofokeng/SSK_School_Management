import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient;
};

const createPrismaClient = () => {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) throw new Error("DATABASE_URL is not configured");

    // Supabase transaction poolers (6543) do not support prepared statements.
    // Keep the application resilient even when the env variable was copied
    // without ?pgbouncer=true. Session/direct URLs are left unchanged.
    //
    // connection_limit defaults to 5 here (not 1) when the env var doesn't
    // specify one. A limit of 1 means the ENTIRE app can only run one
    // database query at a time - any page or action that fires more than
    // one query concurrently (the admin dashboard fires 6+ via Promise.all)
    // will queue up and hit "Timed out fetching a new connection from the
    // connection pool" (Prisma error P2024). This was previously hardcoded
    // to 1 and caused exactly that failure across the admin dashboard,
    // Navbar, and attendance queries.
    let databaseUrl = rawUrl;
    try {
        const url = new URL(rawUrl);
        if (url.port === "6543") {
            url.searchParams.set("pgbouncer", "true");
            if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
            databaseUrl = url.toString();
        }
    } catch {
        // Prisma will provide the normal connection-string validation error.
    }

    return new PrismaClient({
        datasources: { db: { url: databaseUrl } },
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

// Handle graceful shutdown
if (process.env.NODE_ENV === "production") {
    process.on("beforeExit", async () => {
        await prisma.$disconnect();
    });
}

export default prisma;