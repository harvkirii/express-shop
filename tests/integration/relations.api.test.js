import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { app } from "../../app.js";
import { prisma } from "../../config/prisma.js";

const stamp = Date.now();
const emailA = `lr7-a-${stamp}@example.com`;
const emailB = `lr7-b-${stamp}@example.com`;
const password = "password123";

let category;
let product;
let userA;
let tokenA;
let tokenB;
let orderId;

async function register(name, email) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password });
  expect(response.status).toBe(201);
  return response.body;
}

beforeAll(async () => {
  category = await prisma.category.create({ data: { name: `LR7 Category ${stamp}` } });
  product = await prisma.product.create({
    data: { name: `LR7 Product ${stamp}`, price: 1000, categoryId: category.id }
  });

  const a = await register("User A", emailA);
  const b = await register("User B", emailB);
  userA = a.user;
  tokenA = a.token;
  tokenB = b.token;

  const created = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${tokenA}`)
    .send({ items: [{ productId: product.id, quantity: 3 }] });

  expect(created.status).toBe(201);
  orderId = created.body.id;
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { productId: product.id } });
  await prisma.order.deleteMany({ where: { user: { email: { in: [emailA, emailB] } } } });
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
  await prisma.product.deleteMany({ where: { name: { startsWith: "LR8 Product" } } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.category.delete({ where: { id: category.id } });
  await prisma.$disconnect();
});

describe("Product API: связанная Category", () => {
  test("список: вложенный select — у category только id и name", async () => {
    const response = await request(app).get("/api/products");
    const item = response.body.find((p) => p.id === product.id);

    expect(response.status).toBe(200);
    expect(item.category).toEqual({ id: category.id, name: category.name });
    expect(Object.keys(item).sort()).toEqual(["category", "description", "id", "inStock", "name", "price"]);
  });

  test("GET /api/products/:id возвращает товар с вложенной category", async () => {
    const response = await request(app).get(`/api/products/${product.id}`);

    expect(response.status).toBe(200);
    expect(response.body.categoryId).toBe(category.id);
    expect(response.body.category).toEqual({ id: category.id, name: category.name });
  });

  test("несуществующий товар — 404 Product not found", async () => {
    const response = await request(app).get("/api/products/999999");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Product not found");
  });
});

describe("Order API: User + OrderItem + Product + total", () => {
  test("GET /api/orders/:id возвращает связанные данные и total", async () => {
    const response = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: userA.id, name: "User A", email: emailA });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      orderId,
      productId: product.id,
      quantity: 3,
      price: 1000,
      product: { id: product.id, name: product.name }
    });
    expect(response.body.total).toBe(3000);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  test("total считается по цене в заказе, а не по текущей цене товара", async () => {
    await prisma.product.update({ where: { id: product.id }, data: { price: 5000 } });

    const response = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.body.total).toBe(3000);
  });

  test("несуществующий заказ — 404 Order not found", async () => {
    const response = await request(app)
      .get("/api/orders/999999")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Order not found");
  });

  test("чужой заказ обычному пользователю — 404", async () => {
    const response = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
  });

  test("некорректный id — 400, без токена — 401", async () => {
    const bad = await request(app)
      .get("/api/orders/abc")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(bad.status).toBe(400);

    expect((await request(app).get(`/api/orders/${orderId}`)).status).toBe(401);
  });

  test("GET /api/orders — свои заказы с total", async () => {
    const response = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body.map((o) => o.id)).toContain(orderId);
    expect(response.body[0].total).toBe(3000);
  });
});

describe("Relation filter some: заказы по товару", () => {
  test("customer не может искать заказы по товару — 403", async () => {
    const response = await request(app)
      .get(`/api/orders/by-product/${product.id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(403);
  });

  test("admin получает заказы, содержащие товар", async () => {
    await prisma.user.update({ where: { email: emailA }, data: { role: "admin" } });
    const login = await request(app).post("/api/auth/login").send({ email: emailA, password });

    const response = await request(app)
      .get(`/api/orders/by-product/${product.id}`)
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(orderId);
    expect(response.body[0].items[0].product.id).toBe(product.id);
  });

  test("товар без заказов — пустой массив", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: emailA, password });

    const response = await request(app)
      .get("/api/orders/by-product/999999")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("Product.description (лр8)", () => {
  test("admin создаёт товар с description, поле сохраняется и возвращается", async () => {
    await prisma.user.update({ where: { email: emailA }, data: { role: "admin" } });
    const login = await request(app).post("/api/auth/login").send({ email: emailA, password });
    const headers = { Authorization: `Bearer ${login.body.token}` };

    const created = await request(app)
      .post("/api/products")
      .set(headers)
      .send({
        name: `LR8 Product ${stamp}`,
        price: 32000,
        description: "Механическая клавиатура для учебного магазина",
        categoryId: category.id,
        inStock: true
      });

    expect(created.status).toBe(201);
    expect(created.body.description).toBe("Механическая клавиатура для учебного магазина");

    const fetched = await request(app).get(`/api/products/${created.body.id}`);
    expect(fetched.body.description).toBe("Механическая клавиатура для учебного магазина");
  });

  test("description необязателен: без него приходит null", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: emailA, password });

    const created = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ name: `LR8 Product no-desc ${stamp}`, price: 1, categoryId: category.id });

    expect(created.status).toBe(201);
    expect(created.body.description).toBeNull();
  });

  test("несуществующая категория — 400", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: emailA, password });

    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ name: `LR8 Product bad ${stamp}`, price: 1, categoryId: 999999 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Category not found");
  });
});
