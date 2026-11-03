import { signToken } from "../middleware/auth.js";
import { AppError } from "../utils/AppError.js";
import { findUserById, loginUser, registerUser } from "../services/authService.js";

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// Express 5 сам передаёт в errorHandler ошибки async-обработчиков, поэтому try/catch не обязателен.
export async function register(req, res) {
  const user = await registerUser(req.body);
  res.status(201).json({ user: publicUser(user), token: signToken(user) });
}

export async function login(req, res) {
  const user = await loginUser(req.body);
  res.json({ user: publicUser(user), token: signToken(user) });
}

export async function me(req, res) {
  const user = await findUserById(req.user.id);
  if (!user) throw new AppError("Invalid or expired token", 401);
  res.json({ user: publicUser(user) });
}
