import { forbidden, unauthorized } from "../lib/errors.mjs";

export function createAuthMiddleware(authService, repository) {
  async function authenticate(request, _response, next) {
    try {
      const header = request.headers.authorization ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!token) throw unauthorized();
      const claims = authService.verifyAccess(token);
      const user = await repository.findById("users", claims.sub);
      if (!user || user.status !== "ACTIVE") throw unauthorized("Account is not active.");
      if (!user.emailVerified) throw forbidden("Verify your email before accessing protected health data.");
      request.user = authService.cleanUser(user);
      request.sessionId = claims.sid;
      next();
    } catch (error) {
      next(error);
    }
  }

  const requireRoles = (...roles) => (request, _response, next) => {
    if (!request.user) return next(unauthorized());
    if (!roles.includes(request.user.role)) return next(forbidden(`This action requires one of these roles: ${roles.join(", ")}.`));
    next();
  };

  return { authenticate, requireRoles };
}
