import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.mjs";
import { badRequest, conflict, forbidden, unauthorized } from "../lib/errors.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const expiry = (days) => new Date(Date.now() + days * 86_400_000).toISOString();
const secretToken = () => randomBytes(36).toString("base64url");
const verificationCode = () => String(randomInt(100000, 1_000_000));
const verificationExpiry = () => new Date(Date.now() + 10 * 60_000).toISOString();

function cleanUser(user) {
  if (!user) return null;
  const { passwordHash, resetTokenHash, resetTokenExpiresAt, verificationTokenHash, verificationTokenExpiresAt, verificationAttempts, ...safe } = user;
  return safe;
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw badRequest("Password must be at least 12 characters and include a letter and a number.");
  }
}

export function createAuthService(repository, emailProvider, audit) {
  async function issueVerification(user) {
    const code = verificationCode();
    await repository.update("users", user.id, {
      verificationTokenHash: hashToken(code),
      verificationTokenExpiresAt: verificationExpiry(),
      verificationAttempts: 0
    });
    await emailProvider.send({ to: user.email, subject: "Your HealthGuard verification code", code });
    return code;
  }

  async function createSession(user, request = {}) {
    const refreshToken = secretToken();
    const session = await repository.create("sessions", {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: expiry(env.refreshDays),
      userAgent: String(request.headers?.["user-agent"] ?? "").slice(0, 240)
    });
    const accessToken = jwt.sign({ sub: user.id, role: user.role, email: user.email, sid: session.id }, env.accessSecret, { expiresIn: env.accessTtl, issuer: "healthguard", audience: "healthguard-web", jwtid: randomUUID() });
    return { user: cleanUser(user), accessToken, refreshToken, refreshExpiresAt: session.expiresAt };
  }

  async function createAccount({ name, email, password, role = "USER", emailVerified = false }) {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!name?.trim() || !emailPattern.test(normalizedEmail)) throw badRequest("Enter a name and valid email address.");
    validatePassword(password);
    if (await repository.findOne("users", { email: normalizedEmail })) throw conflict("An account already exists for this email address.");
    return repository.create("users", {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      emailVerified,
      status: "ACTIVE",
      preferences: { theme: "system", sound: false }
    });
  }

  return {
    cleanUser,
    async seedDevelopmentAccounts() {
      if (!env.enableDemoAccount || env.isProduction) return;
      const seeds = [
        ["HealthGuard Demo", env.demoUserEmail, env.demoUserPassword, "USER"],
        ["HealthGuard Admin", env.demoAdminEmail, env.demoAdminPassword, "ADMIN"],
        ["HealthGuard Driver", env.demoDriverEmail, env.demoDriverPassword, "DRIVER"]
      ];
      for (const [name, email, password, role] of seeds) {
        if (!await repository.findOne("users", { email: email.toLowerCase() })) {
          const user = await createAccount({ name, email, password, role, emailVerified: true });
          if (role === "DRIVER") {
            const ambulance = await repository.upsert("ambulances", { code: "HG-SIM-01" }, { status: "AVAILABLE", simulation: true, available: true });
            await repository.create("drivers", { userId: user.id, status: "AVAILABLE", ambulanceId: ambulance.id, licenseNumber: "DEMO-NOT-A-REAL-LICENSE" });
            await repository.update("ambulances", ambulance.id, { driverId: user.id });
          }
        }
      }
    },
    async register(input, request) {
      let role = "USER";
      let invitation;
      if (input.invitationToken) {
        invitation = await repository.findOne("developerInvitations", { tokenHash: hashToken(input.invitationToken) });
        if (!invitation || invitation.usedAt || new Date(invitation.expiresAt) <= new Date()) throw badRequest("Developer invitation is invalid or expired.");
        if (invitation.email !== String(input.email).trim().toLowerCase()) throw forbidden("This invitation was issued for another email address.");
        role = invitation.role;
      }
      const user = await createAccount({ ...input, role });
      if (invitation) await repository.update("developerInvitations", invitation.id, { usedAt: new Date().toISOString() });
      const verifyCode = await issueVerification(user);
      await audit.record({ actorId: user.id, action: "AUTH_REGISTER", resource: "User", resourceId: user.id, ip: request.ip });
      const session = await createSession(user, request);
      return { ...session, verificationPreviewCode: env.isProduction ? undefined : verifyCode };
    },
    async login({ email, password }, request) {
      const normalizedEmail = String(email ?? "").trim().toLowerCase();
      const user = await repository.findOne("users", { email: normalizedEmail });
      if (!user || user.status !== "ACTIVE" || !await bcrypt.compare(String(password ?? ""), user.passwordHash ?? "")) {
        await audit.record({ actorId: user?.id, action: "AUTH_LOGIN", resource: "Session", outcome: "DENIED", ip: request.ip });
        throw unauthorized("Email or password is incorrect.");
      }
      await audit.record({ actorId: user.id, action: "AUTH_LOGIN", resource: "Session", outcome: "SUCCESS", ip: request.ip });
      return createSession(user, request);
    },
    async refresh(refreshToken, request) {
      if (!refreshToken) throw unauthorized("Refresh session is missing.");
      const session = await repository.findOne("sessions", { tokenHash: hashToken(refreshToken) });
      if (!session || session.revokedAt || new Date(session.expiresAt) <= new Date()) throw unauthorized("Session has expired.");
      const user = await repository.findById("users", session.userId);
      if (!user || user.status !== "ACTIVE") throw unauthorized("Session is no longer active.");
      await repository.update("sessions", session.id, { revokedAt: new Date().toISOString() });
      return createSession(user, request);
    },
    async logout(refreshToken, actorId) {
      if (refreshToken) {
        const session = await repository.findOne("sessions", { tokenHash: hashToken(refreshToken) });
        if (session) await repository.update("sessions", session.id, { revokedAt: new Date().toISOString() });
      }
      await audit.record({ actorId, action: "AUTH_LOGOUT", resource: "Session" });
    },
    verifyAccess(token) {
      try {
        return jwt.verify(token, env.accessSecret, { issuer: "healthguard", audience: "healthguard-web" });
      } catch {
        throw unauthorized("Access token is invalid or expired.");
      }
    },
    async forgotPassword(email) {
      const user = await repository.findOne("users", { email: String(email ?? "").trim().toLowerCase() });
      if (!user) return { accepted: true };
      const token = secretToken();
      await repository.update("users", user.id, { resetTokenHash: hashToken(token), resetTokenExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString() });
      await emailProvider.send({ to: user.email, subject: "Reset your HealthGuard password", token });
      return { accepted: true, previewToken: env.isProduction ? undefined : token };
    },
    async resetPassword({ token, password }) {
      validatePassword(password);
      const user = await repository.findOne("users", { resetTokenHash: hashToken(String(token ?? "")) });
      if (!user || !user.resetTokenExpiresAt || new Date(user.resetTokenExpiresAt) <= new Date()) throw badRequest("Reset link is invalid or expired.");
      await repository.update("users", user.id, { passwordHash: await bcrypt.hash(password, 12), resetTokenHash: null, resetTokenExpiresAt: null });
      await repository.removeMany("sessions", { userId: user.id });
      await audit.record({ actorId: user.id, action: "PASSWORD_RESET", resource: "User", resourceId: user.id });
      return { reset: true };
    },
    async verifyEmail(input) {
      const code = String(input?.code ?? input?.token ?? input ?? "").replace(/\D/g, "");
      const email = String(input?.email ?? "").trim().toLowerCase();
      if (code.length !== 6) throw badRequest("Enter the complete 6-digit verification code.");
      const user = email ? await repository.findOne("users", { email }) : await repository.findOne("users", { verificationTokenHash: hashToken(code) });
      if (!user || user.emailVerified) throw badRequest("Verification code is invalid or no longer required.");
      if ((user.verificationAttempts ?? 0) >= 5) throw badRequest("Too many verification attempts. Request a new code.");
      if (!user.verificationTokenExpiresAt || new Date(user.verificationTokenExpiresAt) <= new Date()) throw badRequest("Verification code has expired. Request a new code.");
      if (user.verificationTokenHash !== hashToken(code)) {
        await repository.update("users", user.id, { verificationAttempts: (user.verificationAttempts ?? 0) + 1 });
        throw badRequest("Verification code is incorrect.");
      }
      await repository.update("users", user.id, { emailVerified: true, verificationTokenHash: null, verificationTokenExpiresAt: null, verificationAttempts: 0 });
      await audit.record({ actorId: user.id, action: "EMAIL_VERIFIED", resource: "User", resourceId: user.id });
      return { verified: true };
    },
    async resendVerification(email) {
      const user = await repository.findOne("users", { email: String(email ?? "").trim().toLowerCase() });
      if (!user || user.emailVerified) return { accepted: true };
      const code = await issueVerification(user);
      return { accepted: true, verificationPreviewCode: env.isProduction ? undefined : code };
    },
    async invite({ email, role = "DEVELOPER", expiresInHours = 48 }, actorId) {
      if (!["DEVELOPER", "ADMIN", "DRIVER"].includes(role)) throw badRequest("Invitation role is not allowed.");
      const normalizedEmail = String(email ?? "").trim().toLowerCase();
      if (!emailPattern.test(normalizedEmail)) throw badRequest("Enter a valid invitation email.");
      const token = secretToken();
      const invitation = await repository.create("developerInvitations", {
        email: normalizedEmail, role, tokenHash: hashToken(token), createdBy: actorId,
        expiresAt: new Date(Date.now() + Math.min(Math.max(expiresInHours, 1), 168) * 3_600_000).toISOString()
      });
      await emailProvider.send({ to: normalizedEmail, subject: "HealthGuard developer invitation", token });
      return { ...invitation, previewToken: env.isProduction ? undefined : token };
    }
  };
}
