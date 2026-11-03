import {
  addProduct,
  deleteProductById,
  findProductById,
  getAllProducts,
  updateProductById
} from "../services/productService.js";
import { AppError } from "../utils/AppError.js";
import { parseId } from "../utils/parseId.js";

export async function getProducts(req, res) {
  res.json(await getAllProducts());
}

export async function getProductById(req, res) {
  const product = await findProductById(parseId(req.params.id));
  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
}

export async function createProduct(req, res) {
  res.status(201).json(await addProduct(req.body));
}

export async function updateProduct(req, res) {
  const product = await updateProductById(parseId(req.params.id), req.body);
  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
}

export async function deleteProduct(req, res) {
  const product = await deleteProductById(parseId(req.params.id));
  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
}
