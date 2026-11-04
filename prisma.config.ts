// Prisma 7 не читает .env сам — подгружаем через dotenv (для CLI: migrate, generate, db seed, studio).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js"
  },
  datasource: {
    url: process.env["DATABASE_URL"]
  }
});
