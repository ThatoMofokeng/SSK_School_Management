import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient;
};

const createPrismaClient = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
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