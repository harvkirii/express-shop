// Проверка relation filter some из консоли:
//   node --env-file=.env scripts/findOrdersByProduct.js 1
import { prisma } from "../config/prisma.js";
import { findOrdersByProduct } from "../services/orderService.js";

const productId = Number(process.argv[2] ?? 1);

try {
  const orders = await findOrdersByProduct(productId);
  console.log(JSON.stringify(orders, null, 2));
  console.log(`Найдено заказов с productId=${productId}: ${orders.length}`);
} finally {
  await prisma.$disconnect();
}
