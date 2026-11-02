import { ZodError } from "zod";

export function notFound(req, res) {
  res.status(404).json({
    error: "Not found",
    requestId: req.requestId
  });
}

// Production-safe: stack trace и внутренние сообщения клиенту не отдаются никогда.
// Подробности остаются только в logs.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.status ?? error.statusCode ?? 500;
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    status = 500;
  }

  const logPayload = {
    err: error,
    method: req.method,
    path: req.originalUrl
  };
  if (status >= 500) {
    req.log?.error(logPayload, "Request failed");
  } else {
    req.log?.warn(logPayload, "Request rejected");
  }

  const body = { requestId: req.requestId };

  if (error instanceof ZodError) {
    body.error = "Validation failed";
    body.details = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
    status = 400;
  } else if (error.type === "entity.parse.failed") {
    body.error = "Invalid JSON";
  } else if (status < 500) {
    body.error = error.message;
    if (error.details) body.details = error.details;
  } else {
    body.error = "Internal server error";
  }

  res.status(status).json(body);
}
