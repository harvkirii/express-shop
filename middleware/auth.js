import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "./httpError.js";

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

export function authRequired(req, res, next) {
  const header = req.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Authentication required");
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    req.user = { id: Number(payload.sub), role: payload.role };
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      throw new HttpError(403, "Forbidden");
    }
    next();
  };
}
