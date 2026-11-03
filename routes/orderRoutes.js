import { Router } from "express";
import { z } from "zod";
import { authRequired, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  getMyOrders,
  getOrderById,
  getOrdersByProduct,
  postOrder
} from "../controllers/orderController.js";

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

orderRoutes.get("/", getMyOrders);
orderRoutes.post("/", validate(createSchema), postOrder);

// Должен стоять ДО "/:id", иначе "by-product" будет принят за id.
orderRoutes.get("/by-product/:productId", requireRole("admin"), getOrdersByProduct);

orderRoutes.get("/:id", getOrderById);
