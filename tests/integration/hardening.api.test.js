import request from "supertest";
import express from "express";
import { afterAll, describe, expect, test } from "@jest/globals";
import { app } from "../../app.js";
import { prisma } from "../../config/prisma.js";
import { errorHandler } from "../../middleware/errorHandler.js";
import { requestId } from "../../middleware/requestId.js";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("X-Request-Id", () => {
  test("генерируется, если клиент его не передал", async () => {
    const response = await request(app).get("/health/live");

    expect(response.headers["x-request-id"]).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
  });

  test("сохраняется, если клиент передал безопасный id", async () => {
    const response = await request(app)
      .get("/health/live")
      .set("X-Request-Id", "my-trace-123");

    expect(response.headers["x-request-id"]).toBe("my-trace-123");
  });

  test("небезопасный id заменяется новым", async () => {
    const response = await request(app)
      .get("/health/live")
      .set("X-Request-Id", "bad id with spaces <script>");

    expect(response.headers["x-request-id"]).not.toContain("script");
  });

  test("requestId попадает в тело ошибки", async () => {
    const response = await request(app)
      .get("/no-such-route")
      .set("X-Request-Id", "trace-404");

    expect(response.status).toBe(404);
    expect(response.body.requestId).toBe("trace-404");
  });
});

describe("Заголовки", () => {
  test("X-Powered-By отключён", async () => {
    const response = await request(app).get("/health/live");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("Production-safe errors", () => {
  function appWithCrash() {
    const crashApp = express();
    crashApp.use(requestId);
    crashApp.get("/boom", () => {
      throw new Error("password=super-secret at /srv/app/db.js:42");
    });
    crashApp.use(errorHandler);
    return crashApp;
  }

  test("unexpected 500 не возвращает stack trace и внутренние детали", async () => {
    const response = await request(appWithCrash()).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal server error");
    expect(response.body.stack).toBeUndefined();

    const text = JSON.stringify(response.body);
    expect(text).not.toContain("super-secret");
    expect(text).not.toContain("db.js");
    expect(text).not.toMatch(/\bat\s.+:\d+/);
  });

  test("невалидный JSON — 400 без деталей парсера", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid JSON");
  });
});
