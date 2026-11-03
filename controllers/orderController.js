import {
  createOrder,
  findOrdersByProductWithTotal,
  getOrderDetails,
  listOrdersByUser
} from "../services/orderService.js";
import { AppError } from "../utils/AppError.js";
import { parseId } from "../utils/parseId.js";

// Заказ с пользователем, позициями, товарами и total.
export async function getOrderById(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const order = await getOrderDetails(id);

    // Чужой заказ обычному пользователю не показываем и не подтверждаем его существование.
    const isOwner = order?.userId === req.user.id;
    if (!order || (!isOwner && req.user.role !== "admin")) {
      return next(new AppError("Order not found", 404));
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function getMyOrders(req, res) {
  res.json(await listOrdersByUser(req.user.id));
}

export async function postOrder(req, res) {
  res.status(201).json(await createOrder(req.user.id, req.body.items));
}

// Поиск заказов по товару (relation filter some) — только для admin.
export async function getOrdersByProduct(req, res) {
  const productId = parseId(req.params.productId, "Invalid productId");
  res.json(await findOrdersByProductWithTotal(productId));
}
