// Ошибка, сообщение которой безопасно показать клиенту (4xx).
export class AppError extends Error {
  constructor(message, status = 500, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}
