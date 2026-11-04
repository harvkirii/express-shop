import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

// P2003 — нарушение внешнего ключа (несуществующая категория / товар уже есть в заказах)
function isForeignKeyError(error) {
  return error?.code === "P2003";
}

// Список: select — клиенту отдаём только нужные поля,
// а у вложенной Category только id и name.
export async function getAllProducts() {
  return prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      inStock: true,
      description: true,
      category: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      id: "asc"
    }
  });
}

// Один товар: include — все поля Product + связанная Category целиком.
export async function findProductById(id) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true
    }
  });
}

export async function addProduct(data) {
  try {
    return await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        description: data.description ?? null,
        categoryId: data.categoryId,
        inStock: data.inStock
      },
      include: { category: true }
    });
  } catch (error) {
    if (isForeignKeyError(error)) throw new AppError("Category not found", 400);
    throw error;
  }
}

export async function updateProductById(id, changes) {
  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return null;

  try {
    return await prisma.product.update({
      where: { id },
      data: {
        name: changes.name,
        price: changes.price,
        description: changes.description,
        categoryId: changes.categoryId,
        inStock: changes.inStock
      },
      include: { category: true }
    });
  } catch (error) {
    if (isForeignKeyError(error)) throw new AppError("Category not found", 400);
    throw error;
  }
}

export async function deleteProductById(id) {
  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return null;

  try {
    return await prisma.product.delete({
      where: { id },
      include: { category: true }
    });
  } catch (error) {
    if (isForeignKeyError(error)) {
      throw new AppError("Product is used in orders and cannot be deleted", 409);
    }
    throw error;
  }
}
