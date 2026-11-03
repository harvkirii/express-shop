import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export async function registerUser({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("Email already registered", 409);

  return prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10) }
  });
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new AppError("Invalid email or password", 401);

  return user;
}

export async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}
