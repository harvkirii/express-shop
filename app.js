import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { requestId } from "./middleware/requestId.js";
import { httpLogger } from "./middleware/httpLogger.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { productRoutes } from "./routes/productRoutes.js";
import { orderRoutes } from "./routes/orderRoutes.js";

// app.js только собирает приложение и НЕ вызывает app.listen():
// так его можно использовать в тестах через request(app).
export const app = express();

// Не раскрываем framework в заголовках ответа.
app.disable("x-powered-by");

// trust proxy включаем только в production и только для известной topology:
// ровно один reverse proxy (например Nginx) перед приложением.
// Тогда req.ip / req.protocol берутся из X-Forwarded-* ближайшего proxy.
// Если proxy нет или их несколько — значение 1 нужно пересмотреть.
if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.use(requestId);
app.use(httpLogger);
app.use(cors({ origin: env.corsOrigins.includes("*") ? true : env.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

app.use("/health", healthRoutes);

app.get("/", (req, res) => {
  res.json({ name: "express-shop", status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.use(notFound);
app.use(errorHandler);
