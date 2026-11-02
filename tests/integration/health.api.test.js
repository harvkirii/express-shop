import request from "supertest";
import express from "express";
import { afterAll, describe, expect, test } from "@jest/globals";
import { app } from "../../app.js";
import { prisma } from "../../config/prisma.js";
import { createHealthRoutes } from "../../routes/healthRoutes.js";
import { env } from "../../config/env.js";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Health API", () => {
  test("GET /health/live returns 200", async () => {
    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  test("GET /health/live не раскрывает configuration", async () => {
    const response = await request(app).get("/health/live");
    const text = JSON.stringify(response.body) + JSON.stringify(response.headers);

    expect(text).not.toContain(env.jwtSecret);
    expect(text).not.toContain(env.databaseUrl);
    expect(text).not.toContain(env.corsOrigin);
    expect(Object.keys(response.body)).toEqual(["status"]);
  });

  test("GET /health/ready returns 200 when DB is ready", async () => {
    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  test("GET /health/ready возвращает JSON", async () => {
    const response = await request(app).get("/health/ready");

    expect(response.headers["content-type"]).toMatch(/application\/json/);
  });

  test("GET /health/ready returns 503 when DB is down", async () => {
    const brokenApp = express();
    brokenApp.use(
      "/health",
      createHealthRoutes(async () => {
        throw new Error("connection refused");
      })
    );

    const response = await request(brokenApp).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({ status: "not_ready" });
    // детали ошибки не утекают клиенту
    expect(JSON.stringify(response.body)).not.toContain("connection refused");
  });

  test("liveness отвечает, даже когда readiness проваливается", async () => {
    const brokenApp = express();
    brokenApp.use(
      "/health",
      createHealthRoutes(async () => {
        throw new Error("db down");
      })
    );

    expect((await request(brokenApp).get("/health/live")).status).toBe(200);
    expect((await request(brokenApp).get("/health/ready")).status).toBe(503);
  });
});
