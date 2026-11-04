// Начальное заполнение development database.
// Запуск: npx prisma db seed   (команда задана в prisma.config.ts)
// Seed можно запускать сколько угодно раз: дубликаты не создаются.
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

// Product.name не уникален, поэтому сначала ищем товар, и только если его нет — создаём.
async function ensureProduct(data) {
  const existing = await prisma.product.findFirst({
    where: { name: data.name },
  });
  return existing ?? prisma.product.create({ data });
}

// Демо-пользователи и заказы для проверки API (лр5–лр7). Только для development.
async function seedDemo(laptop, mouse) {
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash: await bcrypt.hash("Admin12345", 10),
      role: "admin",
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@example.com",
      passwordHash: await bcrypt.hash("Demo12345", 10),
    },
  });

  const hasOrders =
    (await prisma.order.count({ where: { userId: demo.id } })) > 0;

  if (!hasOrders) {
    await prisma.order.create({
      data: {
        userId: demo.id,
        status: "new",
        items: {
          create: [
            { productId: laptop.id, quantity: 1, price: laptop.price },
            { productId: mouse.id, quantity: 2, price: mouse.price },
          ],
        },
      },
    });

    await prisma.order.create({
      data: {
        userId: demo.id,
        status: "paid",
        items: {
          create: [{ productId: mouse.id, quantity: 1, price: mouse.price }],
        },
      },
    });
  }

  console.log(
    "Demo accounts: admin@example.com / Admin12345, demo@example.com / Demo12345",
    {
      adminId: admin.id,
      demoId: demo.id,
    },
  );
}

async function main() {
  const laptops = await prisma.category.upsert({
    where: { name: "Ноутбуки" },
    update: { slug: "laptops" },
    create: { name: "Ноутбуки", slug: "laptops" },
  });

  const accessories = await prisma.category.upsert({
    where: { name: "Аксессуары" },
    update: { slug: "accessories" },
    create: { name: "Аксессуары", slug: "accessories" },
  });

  const laptop = await ensureProduct({
    name: "Laptop Pro",
    price: 420000,
    description: "Тестовый ноутбук",
    categoryId: laptops.id,
    inStock: true,
  });

  const mouse = await ensureProduct({
    name: "Wireless Mouse",
    price: 12000,
    description: "Тестовая беспроводная мышь",
    categoryId: accessories.id,
    inStock: true,
  });

  console.log({ laptops, accessories, laptop, mouse });

  if (env.nodeEnv !== "production") {
    await seedDemo(laptop, mouse);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
