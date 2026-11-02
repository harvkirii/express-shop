// Ошибка, текст которой безопасно показать клиенту (4xx).
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}
