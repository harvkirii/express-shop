import { prisma } from "../config/prisma.js";

function toDto(p) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    categoryId: p.category_id,
    category: p.categories?.name,
    inStock: p.in_stock
  };
}

const include = { categories: true };

export async function listProducts() {
  const rows = await prisma.products.findMany({ include, orderBy: { id: "asc" } });
  return rows.map(toDto);
}

export async function getProduct(id) {
  const row = await prisma.products.findUnique({ where: { id }, include });
  return row ? toDto(row) : null;
}

export async function createProduct(data) {
  const row = await prisma.products.create({
    data: {
      name: data.name,
      price: data.price,
      category_id: data.categoryId,
      in_stock: data.inStock ?? true
    },
    include
  });
  return toDto(row);
}

export async function updateProduct(id, data) {
  const exists = await prisma.products.findUnique({ where: { id } });
  if (!exists) return null;

  const row = await prisma.products.update({
    where: { id },
    data: {
      name: data.name,
      price: data.price,
      category_id: data.categoryId,
      in_stock: data.inStock
    },
    include
  });
  return toDto(row);
}

export async function deleteProduct(id) {
  const exists = await prisma.products.findUnique({ where: { id } });
  if (!exists) return null;

  const row = await prisma.products.delete({ where: { id }, include });
  return toDto(row);
}
