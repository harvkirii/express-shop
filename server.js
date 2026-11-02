// env импортируем первым: при неверной конфигурации приложение падает сразу (fail-fast).
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./config/prisma.js";
import { app } from "./app.js";

export const server = app.listen(env.port, () => {
  logger.info(
    { port: env.port, nodeEnv: env.nodeEnv },
    "HTTP server started"
  );
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutdown started");

  // Force timeout: если graceful shutdown завис (например, висит keep-alive соединение),
  // принудительно завершаем процесс. Таймер создаётся только при начале shutdown.
  const forceTimer = setTimeout(() => {
    logger.fatal("Graceful shutdown timeout");
    server.closeAllConnections();
    process.exit(1);
  }, 10000);

  forceTimer.unref();

  // перестаём принимать новые соединения; уже начатые запросы дорабатывают
  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, "HTTP server close failed");
      process.exitCode = 1;
      return;
    }

    logger.info("HTTP server closed");

    try {
      await prisma.$disconnect();
      logger.info("Prisma disconnected");
    } catch (disconnectError) {
      logger.error({ err: disconnectError }, "Prisma disconnect failed");
      process.exitCode = 1;
    }

    clearTimeout(forceTimer);
    logger.info("Shutdown completed");
  });

  // idle keep-alive соединения не должны задерживать server.close()
  server.closeIdleConnections();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
