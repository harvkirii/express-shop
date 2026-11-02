// Тестовое окружение (только для jest).
// Локально значения берутся из .env; в CI файла .env нет, переменные приходят из workflow.
const fs = require("node:fs");
const path = require("node:path");

function loadDotEnv(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return; // .env может отсутствовать (например, в CI) — это нормально
  }

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(path.join(__dirname, "..", ".env"));

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-not-for-production";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5500";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/shop_test";
