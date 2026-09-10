import { env, validateProductionEnv } from "./src/config/env.mjs";
import { MongoRepository, connectMongo } from "./src/db/mongo-repository.mjs";
import { MemoryRepository } from "./src/db/memory-store.mjs";
import { createImportService } from "./src/services/import-service.mjs";

validateProductionEnv();
const repository = env.databaseMode === "mongo" ? new MongoRepository() : new MemoryRepository();
if (repository.mode === "mongo") await connectMongo(env.mongodbUri, env.mongodbDbName);
const report = await createImportService(repository).importSuppliedData();
console.log(JSON.stringify({ databaseMode: repository.mode, ...report }, null, 2));
process.exit(0);
