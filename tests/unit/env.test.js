import { describe, expect, test } from "@jest/globals";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../../config/env.js";

const valid = {
  NODE_ENV: "test",
  PORT: "3000",
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  JWT_SECRET: "a-long-enough-test-secret",
  CORS_ORIGIN: "http://localhost:5500",
  LOG_LEVEL: "info"
};

describe("config/env.js", () => {
  test("валидная конфигурация загружается", () => {
    const env = loadEnv(valid);
    expect(env.port).toBe(3000);
    expect(env.corsOrigins).toEqual(["http://localhost:5500"]);
  });

  test.each(["DATABASE_URL", "JWT_SECRET", "CORS_ORIGIN"])(
    "без %s — понятная ошибка",
    (name) => {
      const source = { ...valid };
      delete source[name];
      expect(() => loadEnv(source)).toThrow(
        `Missing required environment variable: ${name}`
      );
    }
  );

  test("пустое значение считается отсутствующим", () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: "  " })).toThrow(
      "Missing required environment variable: JWT_SECRET"
    );
  });

  test.each(["abc", "0", "70000", "3.5"])("PORT=%s отклоняется", (port) => {
    expect(() => loadEnv({ ...valid, PORT: port })).toThrow(
      "PORT must be an integer from 1 to 65535"
    );
  });

  test("PORT по умолчанию 3000", () => {
    const source = { ...valid };
    delete source.PORT;
    expect(loadEnv(source).port).toBe(3000);
  });

  test("NODE_ENV: только development, test, production", () => {
    for (const ok of ["development", "test", "production"]) {
      expect(() =>
        loadEnv({ ...valid, NODE_ENV: ok, JWT_SECRET: "a-long-enough-test-secret" })
      ).not.toThrow();
    }
    expect(() => loadEnv({ ...valid, NODE_ENV: "staging" })).toThrow(
      "NODE_ENV must be one of: development, test, production"
    );
  });

  test("CORS_ORIGIN: проверка формата", () => {
    expect(() => loadEnv({ ...valid, CORS_ORIGIN: "not a url" })).toThrow(
      "CORS_ORIGIN contains invalid origin"
    );
    expect(() => loadEnv({ ...valid, CORS_ORIGIN: "https://shop.example.com/" })).toThrow(
      "CORS_ORIGIN must be an origin"
    );
    expect(
      loadEnv({ ...valid, CORS_ORIGIN: "https://a.example.com, https://b.example.com" })
        .corsOrigins
    ).toEqual(["https://a.example.com", "https://b.example.com"]);
  });

  test("CORS_ORIGIN='*' запрещён в production", () => {
    expect(() =>
      loadEnv({ ...valid, NODE_ENV: "production", CORS_ORIGIN: "*" })
    ).toThrow("must not be '*' in production");
  });

  test("слабый или шаблонный JWT_SECRET запрещён в production", () => {
    expect(() =>
      loadEnv({ ...valid, NODE_ENV: "production", JWT_SECRET: "CHANGE_ME" })
    ).toThrow("JWT_SECRET must be a real secret");
  });

  test("LOG_LEVEL валидируется", () => {
    expect(() => loadEnv({ ...valid, LOG_LEVEL: "loud" })).toThrow("LOG_LEVEL must be one of");
  });

  test("объект env заморожен", () => {
    const env = loadEnv(valid);
    expect(Object.isFrozen(env)).toBe(true);
  });
});

describe("fail-fast startup", () => {
  test("процесс без JWT_SECRET завершается с понятной ошибкой", () => {
    const root = fileURLToPath(new URL("../../", import.meta.url));

    // Чистое окружение: JWT_SECRET нет, остальное задано
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", "import './config/env.js'"],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          NODE_ENV: "development",
          DATABASE_URL: valid.DATABASE_URL,
          CORS_ORIGIN: valid.CORS_ORIGIN
        }
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "Missing required environment variable: JWT_SECRET"
    );
  });
});
