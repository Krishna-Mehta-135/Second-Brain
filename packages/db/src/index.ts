import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.warn("[@repo/db] DATABASE_URL is not set in environment variables.");
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
export * from "./persistence/repository.js";
export * from "./persistence/persistence-service.js";
export * from "./persistence/prisma-repository.js";
