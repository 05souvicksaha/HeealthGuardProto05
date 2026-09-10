import { randomUUID } from "node:crypto";
import { AppError } from "../lib/errors.mjs";

export function requestContext(request, response, next) {
  request.requestId = String(request.headers["x-request-id"] ?? randomUUID());
  response.setHeader("x-request-id", request.requestId);
  next();
}

export function notFoundHandler(request, response) {
  response.status(404).json({ error: { code: "NOT_FOUND", message: "API route not found.", requestId: request.requestId } });
}

export function errorHandler(error, request, response, _next) {
  const status = error instanceof AppError ? error.status : error?.name === "MulterError" ? 400 : 500;
  const code = error instanceof AppError ? error.code : error?.name === "MulterError" ? "UPLOAD_ERROR" : "INTERNAL_ERROR";
  if (status >= 500 && !(error instanceof AppError)) console.error(`[${request.requestId}] ${error?.stack ?? error}`);
  response.status(status).json({
    error: {
      code,
      message: status >= 500 ? "HealthGuard could not complete this request." : error.message,
      details: status < 500 ? error.details : undefined,
      requestId: request.requestId
    }
  });
}
