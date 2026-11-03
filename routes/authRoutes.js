import { Router } from "express";
import { z } from "zod";
import { authRequired } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { login, me, register } from "../controllers/authController.js";

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

authRoutes.post("/register", validate(registerSchema), register);
authRoutes.post("/login", validate(loginSchema), login);
authRoutes.get("/me", authRequired, me);
