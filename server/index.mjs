import http from "node:http";
import { Server as SocketServer } from "socket.io";
import { env, validateProductionEnv } from "./src/config/env.mjs";
import { MemoryRepository } from "./src/db/memory-store.mjs";
import { MongoRepository, connectMongo } from "./src/db/mongo-repository.mjs";
import { createStorageProvider } from "./src/providers/storage-provider.mjs";
import { createAIProvider } from "./src/providers/ai-provider.mjs";
import { createOCRProvider } from "./src/providers/ocr-provider.mjs";
import { createEmailProvider } from "./src/providers/email-provider.mjs";
import { createAuditService } from "./src/services/audit-service.mjs";
import { createAuthService } from "./src/services/auth-service.mjs";
import { createTriageService } from "./src/services/triage-service.mjs";
import { createImportService } from "./src/services/import-service.mjs";
import { createApp } from "./src/app.mjs";
import { loadAllData, validateDatasets } from "./data-loader.mjs";

validateProductionEnv();
const sourceData = await loadAllData();
const sourceValidation = validateDatasets(sourceData);
const repository = env.databaseMode === "mongo" ? new MongoRepository() : new MemoryRepository();
if (repository.mode === "mongo") await connectMongo(env.mongodbUri, env.mongodbDbName);

const storageProvider = createStorageProvider();
const aiProvider = createAIProvider();
const ocrProvider = createOCRProvider();
const emailProvider = createEmailProvider();
const audit = createAuditService(repository);
const authService = createAuthService(repository, emailProvider, audit);
const importService = createImportService(repository);
await importService.importSuppliedData();
await authService.seedDevelopmentAccounts();

const server = http.createServer();
const io = new SocketServer(server, {
  cors: { origin: env.clientOrigin.split(",").map((item) => item.trim()), credentials: true },
  transports: ["websocket", "polling"]
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const claims = authService.verifyAccess(token);
    const user = await repository.findById("users", claims.sub);
    if (!user || user.status !== "ACTIVE" || !user.emailVerified) throw new Error("Inactive or unverified account");
    socket.data.user = authService.cleanUser(user);
    next();
  } catch {
    next(new Error("Unauthorized realtime connection"));
  }
});
io.on("connection", (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);
  socket.join(`role:${user.role}`);
  socket.on("ambulance:join", async (requestId, acknowledge = () => {}) => {
    const request = await repository.findById("ambulanceRequests", String(requestId));
    const allowed = request && (request.ownerId === user.id || ["DRIVER", "ADMIN", "DEVELOPER"].includes(user.role));
    if (!allowed) return acknowledge({ ok: false });
    socket.join(`request:${request.id}`);
    acknowledge({ ok: true, requestId: request.id });
  });
});

const providers = {
  ai: aiProvider.status(),
  ocr: ocrProvider.status(),
  storage: storageProvider.status(),
  email: emailProvider.status(),
  maps: { provider: env.mapsProvider, configured: env.mapsProvider === "external-link" }
};
const triageService = createTriageService(sourceData.protocols);
const app = createApp({
  repository, sourceData, sourceValidation, storageProvider, aiProvider, ocrProvider,
  audit, authService, importService, triageService, providers, realtime: io
});
server.on("request", app);
server.listen(env.port, env.host, () => {
  console.log(`HealthGuard API listening on http://${env.host}:${env.port} [database=${repository.mode}]`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing HealthGuard services.`);
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8_000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
