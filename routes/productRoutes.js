import { Router } from "express";
import { z } from "zod";
import { authRequired, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../middleware/httpError.js";
import * as products from "../services/productService.js";

export const productRoutes = Router();

const idSchema = z.coerce.number().int().positive().max(2147483647);

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  price: z.number().int().nonnegative(),
  categoryId: z.number().int().positive(),
  inStock: z.boolean().optional()
});

const updateSchema = createSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" }
);

function parseId(value) {
  const result = idSchema.safeParse(value);
  if (!result.success) throw new HttpError(400, "Invalid id");
  return result.data;
}

// Public
productRoutes.get("/", async (req, res) => {
  res.json(await products.listProducts());
});

productRoutes.get("/:id", async (req, res) => {
  const product = await products.getProduct(parseId(req.params.id));
  if (!product) throw new HttpError(404, "Product not found");
  res.json(product);
});

// Protected: только admin
productRoutes.post(
  "/",
  authRequired,
  requireRole("admin"),
  validate(createSchema),
  async (req, res) => {
    res.status(201).json(await products.createProduct(req.body));
  }
);

productRoutes.patch(
  "/:id",
  authRequired,
  requireRole("admin"),
  validate(updateSchema),
  async (req, res) => {
    const product = await products.updateProduct(parseId(req.params.id), req.body);
    if (!product) throw new HttpError(404, "Product not found");
    res.json(product);
  }
);

productRoutes.delete("/:id", authRequired, requireRole("admin"), async (req, res) => {
  const product = await products.deleteProduct(parseId(req.params.id));
  if (!product) throw new HttpError(404, "Product not found");
  res.json(product);
});
