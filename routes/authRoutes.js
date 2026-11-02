import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authRequired, signToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../middleware/httpError.js";

export const authRoutes = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72)
});

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

authRoutes.post("/register", validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "Email already registered");

  const user = await prisma.users.create({
    data: { name, email, password_hash: await bcrypt.hash(password, 10) }
  });

  res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

authRoutes.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.users.findUnique({ where: { email } });
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, "Invalid email or password");

  res.json({ user: publicUser(user), token: signToken(user) });
});

// Protected endpoint
authRoutes.get("/me", authRequired, async (req, res) => {
  const user = await prisma.users.findUnique({ where: { id: req.user.id } });
  if (!user) throw new HttpError(401, "Invalid or expired token");
  res.json({ user: publicUser(user) });
});
