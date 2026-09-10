export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, "BAD_REQUEST", message, details);
export const unauthorized = (message = "Authentication required.") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have permission to perform this action.") => new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Resource not found.") => new AppError(404, "NOT_FOUND", message);
export const conflict = (message) => new AppError(409, "CONFLICT", message);
export const providerUnavailable = (provider) => new AppError(503, "PROVIDER_UNAVAILABLE", `${provider} is not configured.`);

export function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

