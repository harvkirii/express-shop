import { Router } from "express";
import { prisma } from "../config/prisma.js";

const READINESS_TIMEOUT_MS = 3000;

async function checkDatabase() {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Database check timed out")),
      READINESS_TIMEOUT_MS
    );
  });

  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Фабрика нужна, чтобы в тестах подменять проверку БД (имитировать падение PostgreSQL).
export function createHealthRoutes(check = checkDatabase) {
  const router = Router();

  // Liveness: процесс жив и HTTP отвечает. Без запросов к БД и без деталей конфигурации.
  router.get("/live", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Readiness: приложение готово принимать трафик (PostgreSQL доступен).
  router.get("/ready", async (req, res) => {
    try {
      await check();
      res.status(200).json({ status: "ready" });
    } catch (error) {
      req.log?.warn({ err: error }, "Readiness check failed");
      res.status(503).json({ status: "not_ready" });
    }
  });

  return router;
}

export const healthRoutes = createHealthRoutes();
