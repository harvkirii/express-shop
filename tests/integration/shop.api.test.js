import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { app } from "../../app.js";
import { prisma } from "../../config/prisma.js";

const email = `test-${Date.now()}@example.com`;
let token;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("Public endpoint", () => {
  test("GET /api/products возвращает список товаров", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("GET /api/products/abc — 400", async () => {
    const response = await request(app).get("/api/products/abc");

    expect(response.status).toBe(400);
  });
});

describe("Auth + protected endpoint", () => {
  test("GET /api/auth/me без токена — 401", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  test("POST /api/auth/register с плохими данными — 400", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "", email: "nope", password: "1" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
  });

  test("регистрация выдаёт JWT и не возвращает пароль", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email, password: "password123" });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toContain("password");
    token = response.body.token;
  });

  test("GET /api/auth/me с токеном — 200", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
  });

  test("login с неверным паролем — 401", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });

    expect(response.status).toBe(401);
  });

  test("POST /api/products от customer — 403", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "X", price: 1, categoryId: 1 });

    expect(response.status).toBe(403);
  });

  test("GET /api/orders без токена — 401", async () => {
    expect((await request(app).get("/api/orders")).status).toBe(401);
  });
});
