import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MemoryRepository } from "./src/db/memory-store.mjs";
import { LocalStorageProvider } from "./src/providers/storage-provider.mjs";
import { DisabledAIProvider } from "./src/providers/ai-provider.mjs";
import { DisabledOCRProvider } from "./src/providers/ocr-provider.mjs";
import { createAuditService } from "./src/services/audit-service.mjs";
import { createAuthService } from "./src/services/auth-service.mjs";
import { createTriageService } from "./src/services/triage-service.mjs";
import { createImportService } from "./src/services/import-service.mjs";
import { createApp } from "./src/app.mjs";
import { loadAllData, validateDatasets } from "./data-loader.mjs";

export async function createTestApp() {
  const repository = new MemoryRepository();
  const sourceData = await loadAllData();
  const uploadDir = await mkdtemp(path.join(os.tmpdir(), "healthguard-test-"));
  const storageProvider = new LocalStorageProvider(uploadDir);
  const aiProvider = new DisabledAIProvider();
  const ocrProvider = new DisabledOCRProvider();
  const emailProvider = { name: "test", status: () => ({ provider: "test", configured: true }), send: async () => ({ accepted: true }) };
  const audit = createAuditService(repository);
  const authService = createAuthService(repository, emailProvider, audit);
  const importService = createImportService(repository);
  await importService.importSuppliedData();
  const providers = { ai: aiProvider.status(), ocr: ocrProvider.status(), storage: storageProvider.status(), email: emailProvider.status(), maps: { provider: "test", configured: false } };
  const realtime = { to: () => ({ emit: () => undefined }) };
  const app = createApp({
    repository, sourceData, sourceValidation: validateDatasets(sourceData), storageProvider, aiProvider, ocrProvider,
    audit, authService, importService, triageService: createTriageService(sourceData.protocols), providers, realtime
  });
  return { app, repository, cleanup: () => rm(uploadDir, { recursive: true, force: true }) };
}
