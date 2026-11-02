// Prisma 7 не читает .env сам — подгружаем через dotenv (только для CLI: generate/db pull).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"]
  }
});
