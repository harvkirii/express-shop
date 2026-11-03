import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

// Заказ + пользователь (без пароля!) + позиции + товар в каждой позиции
export async function findOrderById(id) {
  return prisma.order.findUnique({
    where: {
      id
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });
}

// Сумма считается по OrderItem.price (цена на момент заказа),
// а не по Product.price — цена в каталоге потом может измениться.
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export async function getOrderDetails(id) {
  const order = await findOrderById(id);

  if (!order) {
    return null;
  }

  return {
    ...order,
    total: calculateTotal(order.items)
  };
}

// Relation filter: some — вернуть заказы, где ХОТЯ БЫ ОДНА позиция содержит этот товар.
export async function findOrdersByProduct(productId) {
  return prisma.order.findMany({
    where: {
      items: {
        some: {
          productId
        }
      }
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: {
      id: "asc"
    }
  });
}

export async function findOrdersByProductWithTotal(productId) {
  const orders = await findOrdersByProduct(productId);
  return orders.map((order) => ({ ...order, total: calculateTotal(order.items) }));
}

export async function listOrdersByUser(userId) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { id: "desc" }
  });

  return orders.map((order) => ({ ...order, total: calculateTotal(order.items) }));
}

export async function createOrder(userId, items) {
  const productIds = items.map((item) => item.productId);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, inStock: true }
  });

  if (products.length !== productIds.length) {
    throw new AppError("Some products do not exist or are out of stock", 400);
  }

  const priceById = new Map(products.map((p) => [p.id, p.price]));

  const order = await prisma.order.create({
    data: {
      userId,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: priceById.get(item.productId)
        }))
      }
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true } }
        }
      }
    }
  });

  return { ...order, total: calculateTotal(order.items) };
}
