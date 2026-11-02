import { PrismaPg } from "@prisma/adapter-pg";
import prismaPkg from "@prisma/client";
import { env } from "./env.js";

// @prisma/client — CommonJS-пакет, поэтому берём PrismaClient через default import.
const { PrismaClient } = prismaPkg;

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  // не ждём недоступную БД бесконечно (важно для readiness и shutdown)
  connectionTimeoutMillis: 5000
});

export const prisma = new PrismaClient({ adapter });
