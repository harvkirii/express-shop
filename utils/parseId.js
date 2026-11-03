import { AppError } from "./AppError.js";

// Проверяет id из URL: целое число от 1 до 2147483647 (диапазон Int в PostgreSQL).
export function parseId(value, message = "Invalid id") {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new AppError(message, 400);
  }

  return id;
}
