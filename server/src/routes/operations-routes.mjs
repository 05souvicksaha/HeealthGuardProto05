import { randomUUID } from "node:crypto";
import { Router } from "express";
import { asyncRoute, badRequest, forbidden, notFound } from "../lib/errors.mjs";

const activeAmbulanceStates = ["REQUESTED", "ASSIGNED", "EN_ROUTE_PICKUP", "ARRIVED_PICKUP", "EN_ROUTE_HOSPITAL"];
const allowedTransitions = {
  REQUESTED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["EN_ROUTE_PICKUP", "CANCELLED"],
  EN_ROUTE_PICKUP: ["ARRIVED_PICKUP", "CANCELLED"],
  ARRIVED_PICKUP: ["EN_ROUTE_HOSPITAL", "CANCELLED"],
  EN_ROUTE_HOSPITAL: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

const adminContent = {
  hospitals: { fields: ["name", "type", "address", "phone", "emergency", "beds", "specialties", "note", "opd", "status"], required: "name", sourceKey: true },
  doctors: { fields: ["name", "specialty", "qualifications", "registrationNumber", "hospitalIds", "availability", "status"], required: "name", sourceKey: true },
  diseases: { fields: ["name", "aliases", "symptoms", "redFlags", "specialty", "source", "status"], required: "name", sourceKey: true },
  medicalProtocols: { fields: ["sourceId", "category", "severity", "title", "tags", "warning", "steps", "doNot", "seek", "status"], required: "title", sourceKey: true },
  ambulances: { fields: ["code", "driverId", "status", "simulation", "latitude", "longitude", "available"], required: "code" },
  drivers: { fields: ["userId", "licenseNumber", "ambulanceId", "status"], required: "userId" },
  flashcards: { fields: ["question", "answer", "category", "source", "status"], required: "question", sourceKey: true },
  quizzes: { fields: ["title", "category", "questions", "status"], required: "title", sourceKey: true }
};

function adminDefinition(name) {
  const definition = adminContent[name];
  if (!definition) throw notFound("Admin content collection not found.");
  return definition;
}

function sanitizeAdminContent(name, body = {}, creating = false) {
  const definition = adminDefinition(name);
  const patch = Object.fromEntries(definition.fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
  if (creating && !String(patch[definition.required] ?? "").trim()) throw badRequest(`${definition.required} is required.`);
  if (creating && definition.sourceKey) patch.sourceKey = `admin:${name}:${randomUUID()}`;
  if (creating && name === "medicalProtocols") patch.sourceId = String(patch.sourceId ?? `admin-${randomUUID()}`);
  if (creating) patch.status ??= "ACTIVE";
  return patch;
}

function ownsOrOperates(request, item) {
  return item.ownerId === request.user.id || ["DRIVER", "ADMIN", "DEVELOPER"].includes(request.user.role);
}

export function createOperationsRouter({ repository, authenticate, requireRoles, audit, authService, providers, importService, sourceValidation, realtime }) {
  const router = Router();
  router.use(authenticate);

  router.get("/users/me", (request, response) => response.json(request.user));
  router.patch("/users/me", asyncRoute(async (request, response) => {
    const allowed = {};
    if (request.body.name?.trim()) allowed.name = request.body.name.trim();
    if (request.body.preferences) allowed.preferences = request.body.preferences;
    const user = await repository.update("users", request.user.id, allowed);
    response.json(authService.cleanUser(user));
  }));

  router.get("/notifications", asyncRoute(async (request, response) => {
    const result = await repository.list("notifications", { ownerId: request.user.id }, { limit: 100 });
    response.json({ ...result, unread: result.items.filter((item) => !item.readAt).length });
  }));
  router.patch("/notifications/:id/read", asyncRoute(async (request, response) => {
    const item = await repository.findById("notifications", request.params.id);
    if (!item || item.ownerId !== request.user.id) throw notFound();
    response.json(await repository.update("notifications", item.id, { readAt: new Date().toISOString() }));
  }));

  router.post("/ambulances/requests", asyncRoute(async (request, response) => {
    const { patientId, pickup, destinationHospitalId, priority = "HIGH", simulation = false } = request.body ?? {};
    if (!pickup || !destinationHospitalId) throw badRequest("Pickup and destination hospital are required.");
    if (patientId) {
      const patient = await repository.findById("patients", patientId);
      if (!patient || patient.ownerId !== request.user.id) throw notFound("Patient not found.");
    }
    const existing = await repository.list("ambulanceRequests", { ownerId: request.user.id }, { limit: 100 });
    if (existing.items.some((item) => activeAmbulanceStates.includes(item.status))) throw badRequest("An active ambulance request already exists.");
    const item = await repository.create("ambulanceRequests", {
      ownerId: request.user.id, patientId, pickup, destinationHospitalId, priority,
      status: "REQUESTED", simulation: Boolean(simulation), etaMinutes: null,
      statusHistory: [{ status: "REQUESTED", at: new Date().toISOString(), actorId: request.user.id }]
    });
    await audit.record({ actorId: request.user.id, action: "AMBULANCE_REQUEST", resource: "ambulanceRequests", resourceId: item.id, requestId: request.requestId, ip: request.ip });
    realtime?.to(`role:DRIVER`).emit("ambulance:requested", item);
    response.status(201).json(item);
  }));
  router.get("/ambulances/requests", asyncRoute(async (request, response) => {
    response.json(await repository.list("ambulanceRequests", { ownerId: request.user.id }, { limit: 100 }));
  }));
  router.get("/ambulances/requests/:id", asyncRoute(async (request, response) => {
    const item = await repository.findById("ambulanceRequests", request.params.id);
    if (!item || !ownsOrOperates(request, item)) throw notFound();
    response.json(item);
  }));
  router.patch("/ambulances/requests/:id/cancel", asyncRoute(async (request, response) => {
    const item = await repository.findById("ambulanceRequests", request.params.id);
    if (!item || item.ownerId !== request.user.id) throw notFound();
    if (!allowedTransitions[item.status]?.includes("CANCELLED")) throw badRequest("This request can no longer be cancelled.");
    const updated = await repository.update("ambulanceRequests", item.id, { status: "CANCELLED", statusHistory: [...item.statusHistory, { status: "CANCELLED", at: new Date().toISOString(), actorId: request.user.id }] });
    realtime?.to(`request:${item.id}`).emit("ambulance:status", updated);
    response.json(updated);
  }));
  router.post("/ambulances/requests/:id/simulate", asyncRoute(async (request, response) => {
    const item = await repository.findById("ambulanceRequests", request.params.id);
    if (!item || item.ownerId !== request.user.id) throw notFound();
    if (!item.simulation) throw forbidden("Only clearly labeled simulation requests can be advanced by their owner.");
    const simulationNext = { REQUESTED: "ASSIGNED", ASSIGNED: "EN_ROUTE_PICKUP", EN_ROUTE_PICKUP: "ARRIVED_PICKUP", ARRIVED_PICKUP: "EN_ROUTE_HOSPITAL", EN_ROUTE_HOSPITAL: "COMPLETED" };
    const status = simulationNext[item.status];
    if (!status) throw badRequest("Simulation is already complete or cancelled.");
    const updated = await repository.update("ambulanceRequests", item.id, {
      status,
      ambulanceId: item.ambulanceId ?? "HG-SIM-01",
      etaMinutes: status === "COMPLETED" ? 0 : Math.max(1, (item.etaMinutes ?? 10) - 2),
      statusHistory: [...item.statusHistory, { status, at: new Date().toISOString(), actorId: request.user.id, simulation: true }]
    });
    await audit.record({ actorId: request.user.id, action: "AMBULANCE_SIMULATION_STEP", resource: "ambulanceRequests", resourceId: item.id, requestId: request.requestId, ip: request.ip });
    realtime?.to(`request:${item.id}`).emit("ambulance:status", updated);
    response.json(updated);
  }));

  router.get("/drivers/me/requests", requireRoles("DRIVER", "ADMIN"), asyncRoute(async (request, response) => {
    const driver = request.user.role === "DRIVER" ? await repository.findOne("drivers", { userId: request.user.id }) : null;
    const all = await repository.list("ambulanceRequests", {}, { limit: 100 });
    response.json({ driver, items: all.items.filter((item) => item.status === "REQUESTED" || item.driverId === driver?.id) });
  }));
  router.post("/drivers/me/requests/:id/accept", requireRoles("DRIVER", "ADMIN"), asyncRoute(async (request, response) => {
    const driver = await repository.findOne("drivers", { userId: request.user.id });
    if (!driver && request.user.role === "DRIVER") throw forbidden("Driver profile is not configured.");
    const item = await repository.findById("ambulanceRequests", request.params.id);
    if (!item) throw notFound();
    if (item.status !== "REQUESTED") throw badRequest("Request has already been assigned or closed.");
    const updated = await repository.update("ambulanceRequests", item.id, {
      status: "ASSIGNED", driverId: driver?.id ?? request.user.id, ambulanceId: driver?.ambulanceId,
      etaMinutes: item.simulation ? 8 : null,
      statusHistory: [...item.statusHistory, { status: "ASSIGNED", at: new Date().toISOString(), actorId: request.user.id }]
    });
    realtime?.to(`request:${item.id}`).emit("ambulance:status", updated);
    realtime?.to(`user:${item.ownerId}`).emit("ambulance:status", updated);
    response.json(updated);
  }));
  router.patch("/drivers/me/requests/:id/status", requireRoles("DRIVER", "ADMIN"), asyncRoute(async (request, response) => {
    const item = await repository.findById("ambulanceRequests", request.params.id);
    if (!item) throw notFound();
    const driver = request.user.role === "DRIVER" ? await repository.findOne("drivers", { userId: request.user.id }) : null;
    if (request.user.role === "DRIVER" && item.driverId !== driver?.id) throw forbidden();
    const status = String(request.body?.status ?? "");
    if (!allowedTransitions[item.status]?.includes(status) || status === "CANCELLED") throw badRequest("Ambulance status transition is not allowed.");
    const updated = await repository.update("ambulanceRequests", item.id, { status, etaMinutes: request.body.etaMinutes ?? item.etaMinutes, statusHistory: [...item.statusHistory, { status, at: new Date().toISOString(), actorId: request.user.id }] });
    realtime?.to(`request:${item.id}`).emit("ambulance:status", updated);
    realtime?.to(`user:${item.ownerId}`).emit("ambulance:status", updated);
    response.json(updated);
  }));
  router.post("/drivers/me/location", requireRoles("DRIVER"), asyncRoute(async (request, response) => {
    const { requestId, latitude, longitude } = request.body ?? {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw badRequest("Valid coordinates are required.");
    const item = await repository.findById("ambulanceRequests", requestId);
    const driver = await repository.findOne("drivers", { userId: request.user.id });
    if (!item || item.driverId !== driver?.id) throw forbidden();
    const payload = { requestId, latitude, longitude, at: new Date().toISOString(), simulation: item.simulation };
    realtime?.to(`request:${requestId}`).emit("ambulance:location", payload);
    response.json(payload);
  }));

  router.get("/emergency/sessions", asyncRoute(async (request, response) => response.json(await repository.list("emergencySessions", { ownerId: request.user.id }, { limit: 100 }))));
  router.post("/emergency/sessions", asyncRoute(async (request, response) => response.status(201).json(await repository.create("emergencySessions", { ownerId: request.user.id, patientId: request.body.patientId, protocolId: request.body.protocolId, status: "OPEN", openedAt: new Date().toISOString() }))));

  router.post("/developer/invitations", requireRoles("ADMIN"), asyncRoute(async (request, response) => response.status(201).json(await authService.invite(request.body ?? {}, request.user.id))));
  router.get("/developer/providers", requireRoles("DEVELOPER", "ADMIN"), (_request, response) => response.json(providers));
  router.post("/import/supplied", requireRoles("DEVELOPER", "ADMIN"), asyncRoute(async (_request, response) => response.json(await importService.importSuppliedData())));

  router.get("/admin/stats", requireRoles("DEVELOPER", "ADMIN"), asyncRoute(async (_request, response) => {
    const names = ["users", "patients", "families", "medicalReports", "hospitals", "medicalProtocols", "flashcards", "ambulanceRequests"];
    const counts = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await repository.count(name)])));
    response.json({ databaseMode: repository.mode, counts, providers });
  }));
  router.get("/admin/audit", requireRoles("DEVELOPER", "ADMIN"), asyncRoute(async (request, response) => response.json(await repository.list("auditLogs", {}, { limit: Math.min(100, Number(request.query.limit) || 50), sortBy: "occurredAt" }))));
  router.get("/admin/users", requireRoles("ADMIN"), asyncRoute(async (_request, response) => {
    const result = await repository.list("users", {}, { limit: 100 });
    response.json({ ...result, items: result.items.map(authService.cleanUser) });
  }));
  router.patch("/admin/users/:id", requireRoles("ADMIN"), asyncRoute(async (request, response) => {
    if (request.params.id === request.user.id && (request.body.role || request.body.status === "DISABLED")) throw badRequest("You cannot change your own role or disable your own account.");
    const patch = {};
    if (["USER", "DEVELOPER", "ADMIN", "DRIVER"].includes(request.body.role)) patch.role = request.body.role;
    if (["ACTIVE", "DISABLED"].includes(request.body.status)) patch.status = request.body.status;
    const user = await repository.update("users", request.params.id, patch);
    if (!user) throw notFound();
    if (patch.status === "DISABLED") await repository.removeMany("sessions", { userId: user.id });
    await audit.record({ actorId: request.user.id, action: "ADMIN_USER_UPDATE", resource: "User", resourceId: user.id, requestId: request.requestId, ip: request.ip });
    response.json(authService.cleanUser(user));
  }));
  router.get("/admin/content/:collection", requireRoles("DEVELOPER", "ADMIN"), asyncRoute(async (request, response) => {
    adminDefinition(request.params.collection);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 50));
    response.json(await repository.list(request.params.collection, {}, { limit, sortBy: "updatedAt" }));
  }));
  router.post("/admin/content/:collection", requireRoles("ADMIN"), asyncRoute(async (request, response) => {
    const collection = request.params.collection;
    const item = await repository.create(collection, sanitizeAdminContent(collection, request.body, true));
    await audit.record({ actorId: request.user.id, action: "ADMIN_CONTENT_CREATE", resource: collection, resourceId: item.id, requestId: request.requestId, ip: request.ip });
    response.status(201).json(item);
  }));
  router.patch("/admin/content/:collection/:id", requireRoles("ADMIN"), asyncRoute(async (request, response) => {
    const collection = request.params.collection;
    const item = await repository.update(collection, request.params.id, sanitizeAdminContent(collection, request.body));
    if (!item) throw notFound();
    await audit.record({ actorId: request.user.id, action: "ADMIN_CONTENT_UPDATE", resource: collection, resourceId: item.id, requestId: request.requestId, ip: request.ip });
    response.json(item);
  }));
  router.post("/admin/content/:collection/:id/deactivate", requireRoles("ADMIN"), asyncRoute(async (request, response) => {
    const collection = request.params.collection;
    adminDefinition(collection);
    const item = await repository.update(collection, request.params.id, { status: "INACTIVE", available: false });
    if (!item) throw notFound();
    await audit.record({ actorId: request.user.id, action: "ADMIN_CONTENT_DEACTIVATE", resource: collection, resourceId: item.id, requestId: request.requestId, ip: request.ip });
    response.json(item);
  }));
  router.post("/admin/content/:collection/:id/verify", requireRoles("ADMIN"), asyncRoute(async (request, response) => {
    const collection = request.params.collection;
    adminDefinition(collection);
    const item = await repository.update(collection, request.params.id, { verifiedAt: new Date().toISOString() });
    if (!item) throw notFound();
    await audit.record({ actorId: request.user.id, action: "ADMIN_CONTENT_VERIFY", resource: collection, resourceId: item.id, requestId: request.requestId, ip: request.ip });
    response.json(item);
  }));
  router.get("/admin/validate", requireRoles("DEVELOPER", "ADMIN"), (_request, response) => response.json(sourceValidation));

  return router;
}
