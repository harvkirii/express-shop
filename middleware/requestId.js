import { randomUUID } from "node:crypto";

const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

// Принимает X-Request-Id от клиента/proxy (если он безопасный), иначе генерирует свой.
export function requestId(req, res, next) {
  const incoming = req.get("x-request-id");

  req.requestId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", req.requestId);

  next();
}
