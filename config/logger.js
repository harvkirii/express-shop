import pino from "pino";
import { env } from "./env.js";

// Секреты никогда не попадают в logs, даже если объект залогировали целиком.
export const logger = pino({
  level: env.nodeEnv === "test" ? "silent" : env.logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "*.password",
      "token",
      "jwtSecret",
      "databaseUrl"
    ],
    censor: "[REDACTED]"
  }
});
