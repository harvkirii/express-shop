import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../middleware/httpError.js";

export const orderRoutes = Router();

orderRoutes.use(authRequired);

const createSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive().max(1000)
      })
    )
    .min(1)
    .max(100)
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      { message: "Duplicate productId" }
    )
});

function toDto(order) {
  const items = order.order_items.map((item) => ({
    productId: item.product_id,
    name: item.products.name,
    quantity: item.quantity,
    price: item.price,
    lineTotal: item.quantity * item.price
  }));

  return {
    id: order.id,
    status: order.status,
    createdAt: order.created_at,
    items,
    total: items.reduce((sum, item) => sum + item.lineTotal, 0)
  };
}

const include = { order_items: { include: { products: true } } };

// Заказы текущего пользователя
orderRoutes.get("/", async (req, res) => {
  const orders = await prisma.orders.findMany({
    where: { user_id: req.user.id },
    include,
    orderBy: { id: "desc" }
  });
  res.json(orders.map(toDto));
});

orderRoutes.post("/", validate(createSchema), async (req, res) => {
  const ids = req.body.items.map((i) => i.productId);
  const found = await prisma.products.findMany({
    where: { id: { in: ids }, in_stock: true }
  });

  if (found.length !== ids.length) {
    throw new HttpError(400, "Some products do not exist or are out of stock");
  }

  const priceById = new Map(found.map((p) => [p.id, p.price]));

  const order = await prisma.orders.create({
    data: {
      user_id: req.user.id,
      order_items: {
        create: req.body.items.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
          price: priceById.get(i.productId)
        }))
      }
    },
    include
  });

  res.status(201).json(toDto(order));
});
