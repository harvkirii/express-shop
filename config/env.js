// Единственное место, где читается process.env.
// Остальной код импортирует `env` отсюда.
// Fail-fast: при неверной конфигурации приложение не стартует.

const NODE_ENVS = ["development", "test", "production"];
const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];

function requiredEnv(source, name) {
  const value = source[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function parsePort(raw) {
  const port = Number(raw ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }

  return port;
}

// CORS_ORIGIN: один origin или список через запятую,
// например "https://shop.example.com,https://admin.example.com"
function parseCorsOrigins(raw, nodeEnv) {
  const origins = raw.split(",").map((item) => item.trim()).filter(Boolean);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGIN must contain at least one origin");
  }

  for (const origin of origins) {
    if (origin === "*") {
      if (nodeEnv === "production") {
        throw new Error("CORS_ORIGIN must not be '*' in production");
      }
      continue;
    }

    let url;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGIN contains invalid origin: ${origin}`);
    }

    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) {
      throw new Error(
        `CORS_ORIGIN must be an origin like https://shop.example.com (no path, no trailing slash): ${origin}`
      );
    }
  }

  return origins;
}

export function loadEnv(source = process.env) {
  const nodeEnv = source.NODE_ENV ?? "development";

  if (!NODE_ENVS.includes(nodeEnv)) {
    throw new Error(`NODE_ENV must be one of: ${NODE_ENVS.join(", ")}`);
  }

  const port = parsePort(source.PORT);
  const databaseUrl = requiredEnv(source, "DATABASE_URL");
  const jwtSecret = requiredEnv(source, "JWT_SECRET");
  const corsOrigin = requiredEnv(source, "CORS_ORIGIN");

  const logLevel = source.LOG_LEVEL ?? "info";
  if (!LOG_LEVELS.includes(logLevel)) {
    throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(", ")}`);
  }

  if (nodeEnv === "production") {
    if (jwtSecret.length < 16 || /change_me|replace-with/i.test(jwtSecret)) {
      throw new Error(
        "JWT_SECRET must be a real secret (at least 16 characters) in production"
      );
    }
  }

  return Object.freeze({
    nodeEnv,
    isProduction: nodeEnv === "production",
    port,
    databaseUrl,
    jwtSecret,
    jwtExpiresIn: source.JWT_EXPIRES_IN ?? "1h",
    corsOrigin,
    corsOrigins: parseCorsOrigins(corsOrigin, nodeEnv),
    logLevel
  });
}

export const env = loadEnv();
