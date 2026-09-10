import path from "node:path";
import { existsSync } from "node:fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.mjs";
import { requestContext, notFoundHandler, errorHandler } from "./middleware/http.mjs";
import { createAuthMiddleware } from "./middleware/auth.mjs";
import { createAuthRouter } from "./routes/auth-routes.mjs";
import { createRecordRouter } from "./routes/record-routes.mjs";
import { createDataRouter } from "./routes/data-routes.mjs";
import { createAIRouter } from "./routes/ai-routes.mjs";
import { createOperationsRouter } from "./routes/operations-routes.mjs";

export function createApp(context) {
  const app = express();
  const auth = createAuthMiddleware(context.authService, context.repository);
  const allowedOrigins = new Set(env.clientOrigin.split(",").map((item) => item.trim()).filter(Boolean));

  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "same-origin" },
    contentSecurityPolicy: env.nodeEnv === "development" ? false : undefined
  }));
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error("Origin is not allowed by HealthGuard CORS policy."));
    }
  }));
  app.use(rateLimit({ windowMs: 15 * 60_000, limit: 500, standardHeaders: true, legacyHeaders: false }));
  app.use(express.json({ limit: "1mb", strict: true }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));
  app.use(cookieParser());

  app.get("/api/v1/health", (_request, response) => response.json({
    status: "ok",
    service: "healthguard-api",
    database: { mode: context.repository.mode, connected: true },
    providers: context.providers,
    realtime: { configured: Boolean(context.realtime) }
  }));
  app.use("/api/v1/auth", createAuthRouter({ authService: context.authService, authenticate: auth.authenticate }));
  app.use("/api/v1", createDataRouter(context));
  app.use("/api/v1", createAIRouter({ authenticate: auth.authenticate, triageService: context.triageService, aiProvider: context.aiProvider }));
  app.use("/api/v1", createRecordRouter({ ...context, authenticate: auth.authenticate }));
  app.use("/api/v1", createOperationsRouter({ ...context, authenticate: auth.authenticate, requireRoles: auth.requireRoles }));

  app.use("/api", notFoundHandler);
  const dist = path.join(env.projectRoot, "dist");
  if (existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: env.isProduction ? "1h" : 0 }));
    app.get(/.*/, (_request, response) => response.sendFile(path.join(dist, "index.html")));
  }
  app.use(errorHandler);
  return app;
}

