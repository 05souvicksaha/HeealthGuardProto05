import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncRoute, badRequest } from "../lib/errors.mjs";
import { env } from "../config/env.mjs";

function setRefreshCookie(response, token) {
  response.cookie("hg_refresh", token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: env.refreshDays * 86_400_000
  });
}

export function createAuthRouter({ authService, authenticate }) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });
  router.use(limiter);

  router.post("/register", asyncRoute(async (request, response) => {
    const result = await authService.register(request.body ?? {}, request);
    setRefreshCookie(response, result.refreshToken);
    const { refreshToken, ...body } = result;
    response.status(201).json(body);
  }));
  router.post("/login", asyncRoute(async (request, response) => {
    const result = await authService.login(request.body ?? {}, request);
    setRefreshCookie(response, result.refreshToken);
    const { refreshToken, ...body } = result;
    response.json(body);
  }));
  router.post("/refresh", asyncRoute(async (request, response) => {
    const result = await authService.refresh(request.cookies.hg_refresh, request);
    setRefreshCookie(response, result.refreshToken);
    const { refreshToken, ...body } = result;
    response.json(body);
  }));
  router.post("/logout", authenticate, asyncRoute(async (request, response) => {
    await authService.logout(request.cookies.hg_refresh, request.user.id);
    response.clearCookie("hg_refresh", { path: "/api/v1/auth" });
    response.status(204).end();
  }));
  router.post("/forgot-password", asyncRoute(async (request, response) => {
    if (!request.body?.email) throw badRequest("Email is required.");
    response.json(await authService.forgotPassword(request.body.email));
  }));
  router.post("/reset-password", asyncRoute(async (request, response) => {
    response.json(await authService.resetPassword(request.body ?? {}));
  }));
  router.post("/verify-email", asyncRoute(async (request, response) => {
    response.json(await authService.verifyEmail(request.body ?? {}));
  }));
  router.post("/resend-verification", asyncRoute(async (request, response) => {
    response.json(await authService.resendVerification(request.body?.email));
  }));
  return router;
}
