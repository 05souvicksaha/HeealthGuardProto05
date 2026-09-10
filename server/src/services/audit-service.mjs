import { createHash, randomUUID } from "node:crypto";
import { env } from "../config/env.mjs";

function ipHash(ip = "") {
  return createHash("sha256").update(`${env.accessSecret}:${ip}`).digest("hex").slice(0, 20);
}

export function createAuditService(repository) {
  return {
    async record({ actorId, action, resource, resourceId, outcome = "SUCCESS", requestId, ip }) {
      return repository.create("auditLogs", {
        actorId: actorId ?? "anonymous",
        action,
        resource,
        resourceId,
        outcome,
        requestId: requestId ?? randomUUID(),
        ipHash: ipHash(ip),
        occurredAt: new Date().toISOString()
      });
    }
  };
}

