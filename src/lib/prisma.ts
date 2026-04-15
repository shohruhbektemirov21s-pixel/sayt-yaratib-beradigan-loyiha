import { loadEnvConfig } from "@next/env";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

/**
 * Turbo / alohida workerlarda Next ba'zan `.env`ni Prisma ishga tushishidan oldin yuklamaydi.
 * `DATABASE_URL` yo'q bo'lsa — loyiha ildizidan `.env*` ni Next bilan bir xil tartibda yuklaymiz.
 */
if (!process.env.DATABASE_URL?.trim()) {
  loadEnvConfig(path.resolve(process.cwd()), process.env.NODE_ENV !== "production");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
