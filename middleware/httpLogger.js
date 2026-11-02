import pinoHttp from "pino-http";
import { logger } from "../config/logger.js";

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.requestId,
  // health-проверки приходят часто — не засоряем logs
  autoLogging: {
    ignore: (req) => req.url?.startsWith("/health")
  }
});
