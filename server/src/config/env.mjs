import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const projectRoot = path.resolve(serverRoot, "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
}

function integer(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const isProduction = process.env.NODE_ENV === "production";
const fallbackAccessSecret = "healthguard-local-access-secret-change-before-production";
const fallbackRefreshSecret = "healthguard-local-refresh-secret-change-before-production";

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  host: process.env.HOST ?? "0.0.0.0",
  port: integer(process.env.PORT, 4174),
  clientOrigin: process.env.CLIENT_ORIGIN ?? process.env.CLIENT_URL ?? "http://127.0.0.1:5500",
  publicServerUrl: process.env.PUBLIC_SERVER_URL ?? "http://127.0.0.1:4174",
  databaseMode: process.env.DATABASE_MODE ?? (process.env.MONGODB_URI ? "mongo" : "memory"),
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/healthguard",
  mongodbDbName: process.env.MONGODB_DB_NAME ?? "healthguard",
  accessSecret: process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? fallbackAccessSecret,
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? fallbackRefreshSecret,
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshDays: integer(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  cookieSecure: bool(process.env.COOKIE_SECURE, isProduction),
  storageProvider: process.env.STORAGE_PROVIDER ?? "local",
  uploadDir: path.resolve(projectRoot, process.env.UPLOAD_DIR ?? "uploads"),
  maxUploadBytes: integer(process.env.MAX_UPLOAD_MB, 10) * 1024 * 1024,
  ocrProvider: process.env.OCR_PROVIDER ?? "disabled",
  ocrApiUrl: process.env.OCR_API_URL ?? "",
  ocrApiKey: process.env.OCR_API_KEY ?? "",
  aiProvider: process.env.AI_PROVIDER ?? "disabled",
  aiApiUrl: process.env.AI_API_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "",
  emailProvider: process.env.EMAIL_PROVIDER ?? "console",
  emailFrom: process.env.EMAIL_FROM ?? "no-reply@healthguard.local",
  mapsProvider: process.env.MAPS_PROVIDER ?? "external-link",
  enableDemoAccount: bool(process.env.ENABLE_DEMO_ACCOUNT, !isProduction),
  demoUserEmail: process.env.DEMO_USER_EMAIL ?? "demo@healthguard.local",
  demoUserPassword: process.env.DEMO_USER_PASSWORD ?? "HealthGuard!2026",
  demoAdminEmail: process.env.DEMO_ADMIN_EMAIL ?? "admin@healthguard.local",
  demoAdminPassword: process.env.DEMO_ADMIN_PASSWORD ?? "HealthGuardAdmin!2026",
  demoDriverEmail: process.env.DEMO_DRIVER_EMAIL ?? "driver@healthguard.local",
  demoDriverPassword: process.env.DEMO_DRIVER_PASSWORD ?? "HealthGuardDriver!2026",
  projectRoot,
  serverRoot
});

export function validateProductionEnv() {
  if (!env.isProduction) return;
  const errors = [];
  if (env.databaseMode !== "mongo") errors.push("DATABASE_MODE must be mongo in production");
  if (env.accessSecret === fallbackAccessSecret || env.accessSecret.length < 32) errors.push("JWT_ACCESS_SECRET must be a unique 32+ character value");
  if (env.refreshSecret === fallbackRefreshSecret || env.refreshSecret.length < 32) errors.push("JWT_REFRESH_SECRET must be a different 32+ character value");
  if (env.accessSecret === env.refreshSecret) errors.push("Access and refresh secrets must differ");
  if (env.clientOrigin.includes("*")) errors.push("CLIENT_ORIGIN cannot be a wildcard");
  if (errors.length) throw new Error(`Unsafe production configuration: ${errors.join("; ")}`);
}
