import { Router } from "express";
import { z } from "zod";
import { authRequired, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct
} from "../controllers/productController.js";

export const productRoutes = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  price: z.number().int().nonnegative(),
  description: z.string().trim().max(2000).optional(),
  categoryId: z.number().int().positive(),
  inStock: z.boolean().optional()
});

const updateSchema = createSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" }
);

// Public
productRoutes.get("/", getProducts);
productRoutes.get("/:id", getProductById);

// Protected: только admin
productRoutes.post("/", authRequired, requireRole("admin"), validate(createSchema), createProduct);
productRoutes.patch("/:id", authRequired, requireRole("admin"), validate(updateSchema), updateProduct);
productRoutes.delete("/:id", authRequired, requireRole("admin"), deleteProduct);
