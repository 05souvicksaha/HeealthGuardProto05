import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { asyncRoute, badRequest, notFound } from "../lib/errors.mjs";
import { env } from "../config/env.mjs";

const definitions = {
  patients: { collection: "patients", fields: ["name", "relationship", "dateOfBirth", "gender", "phone", "email", "bloodGroup", "allergies", "emergencyNotes"] },
  families: { collection: "families", fields: ["name", "description"] },
  history: { collection: "medicalHistory", fields: ["patientId", "kind", "title", "occurredOn", "notes"], patientOwned: true },
  medications: { collection: "medications", fields: ["patientId", "name", "dose", "schedule", "startDate", "endDate", "notes"], patientOwned: true },
  prescriptions: { collection: "prescriptions", fields: ["patientId", "clinicianName", "issuedOn", "medicationIds", "notes"], patientOwned: true },
  timeline: { collection: "timelineEvents", fields: ["patientId", "type", "title", "occurredAt", "sourceId", "notes"], patientOwned: true },
  "emergency-cards": { collection: "emergencyHealthCards", fields: ["patientId", "bloodGroup", "allergies", "conditions", "medications", "contacts", "publishedAt"], patientOwned: true },
  consents: { collection: "consents", fields: ["patientId", "scope", "granted", "grantedAt", "revokedAt", "version"], patientOwned: true },
  progress: { collection: "learningProgress", fields: ["flashcardId", "quizId", "correct", "attempts", "lastStudiedAt"] }
};

function pick(input, fields) {
  return Object.fromEntries(fields.filter((field) => input[field] !== undefined).map((field) => [field, input[field]]));
}

async function owned(repository, collection, id, userId) {
  const item = await repository.findById(collection, id);
  if (!item || item.ownerId !== userId) throw notFound();
  return item;
}

async function assertPatient(repository, patientId, userId) {
  if (!patientId) throw badRequest("patientId is required.");
  await owned(repository, "patients", patientId, userId);
}

export function createRecordRouter({ repository, authenticate, audit, storageProvider, ocrProvider, aiProvider }) {
  const router = Router();
  router.use(authenticate);

  for (const [pathName, definition] of Object.entries(definitions)) {
    router.get(`/${pathName}`, asyncRoute(async (request, response) => {
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
      const result = await repository.list(definition.collection, { ownerId: request.user.id }, { offset: (page - 1) * limit, limit, sortBy: request.query.sortBy ?? "updatedAt", order: request.query.order === "asc" ? "asc" : "desc" });
      response.json({ ...result, page, limit });
    }));
    router.post(`/${pathName}`, asyncRoute(async (request, response) => {
      const values = pick(request.body ?? {}, definition.fields);
      if (definition.patientOwned) await assertPatient(repository, values.patientId, request.user.id);
      const item = await repository.create(definition.collection, { ...values, ownerId: request.user.id });
      await audit.record({ actorId: request.user.id, action: "CREATE", resource: definition.collection, resourceId: item.id, requestId: request.requestId, ip: request.ip });
      response.status(201).json(item);
    }));
    router.get(`/${pathName}/:id`, asyncRoute(async (request, response) => {
      response.json(await owned(repository, definition.collection, request.params.id, request.user.id));
    }));
    router.patch(`/${pathName}/:id`, asyncRoute(async (request, response) => {
      await owned(repository, definition.collection, request.params.id, request.user.id);
      const values = pick(request.body ?? {}, definition.fields);
      if (definition.patientOwned && values.patientId) await assertPatient(repository, values.patientId, request.user.id);
      const item = await repository.update(definition.collection, request.params.id, values);
      await audit.record({ actorId: request.user.id, action: "UPDATE", resource: definition.collection, resourceId: item.id, requestId: request.requestId, ip: request.ip });
      response.json(item);
    }));
    router.delete(`/${pathName}/:id`, asyncRoute(async (request, response) => {
      const item = await owned(repository, definition.collection, request.params.id, request.user.id);
      if (pathName === "patients") {
        const avatar = await repository.findOne("patientAvatars", { ownerId: request.user.id, patientId: item.id });
        if (avatar?.storageKey) await storageProvider.remove(avatar.storageKey);
        if (avatar?.id) await repository.remove("patientAvatars", avatar.id);
      }
      await repository.remove(definition.collection, item.id);
      await audit.record({ actorId: request.user.id, action: "DELETE", resource: definition.collection, resourceId: item.id, requestId: request.requestId, ip: request.ip });
      response.status(204).end();
    }));
  }

  router.get("/families/:familyId/members", asyncRoute(async (request, response) => {
    await owned(repository, "families", request.params.familyId, request.user.id);
    response.json(await repository.list("familyMembers", { familyId: request.params.familyId, ownerId: request.user.id }, { limit: 100 }));
  }));
  router.post("/families/:familyId/members", asyncRoute(async (request, response) => {
    await owned(repository, "families", request.params.familyId, request.user.id);
    if (request.body.patientId) await assertPatient(repository, request.body.patientId, request.user.id);
    const item = await repository.create("familyMembers", { ownerId: request.user.id, familyId: request.params.familyId, patientId: request.body.patientId, name: request.body.name, relationship: request.body.relationship });
    response.status(201).json(item);
  }));

  const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: env.maxUploadBytes } });
  const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 2 * 1024 * 1024 } });

  router.post("/patients/:id/photo", avatarUpload.single("file"), asyncRoute(async (request, response) => {
    await owned(repository, "patients", request.params.id, request.user.id);
    if (!request.file) throw badRequest("Choose a profile photo.");
    if (!['image/jpeg', 'image/png'].includes(request.file.mimetype)) throw badRequest("Profile photos must be JPG or PNG files.");
    const previous = await repository.findOne("patientAvatars", { ownerId: request.user.id, patientId: request.params.id });
    const stored = await storageProvider.store(request.file, request.user.id);
    try {
      const avatar = await repository.upsert(
        "patientAvatars",
        { ownerId: request.user.id, patientId: request.params.id },
        { storageKey: stored.key, mimeType: stored.mimeType, size: stored.size }
      );
      if (previous?.storageKey && previous.storageKey !== stored.key) await storageProvider.remove(previous.storageKey);
      await audit.record({ actorId: request.user.id, action: "PATIENT_PHOTO_UPLOAD", resource: "patients", resourceId: request.params.id, requestId: request.requestId, ip: request.ip });
      response.status(previous ? 200 : 201).json({ id: avatar.id, patientId: request.params.id, mimeType: avatar.mimeType, size: avatar.size });
    } catch (error) {
      await storageProvider.remove(stored.key);
      throw error;
    }
  }));

  router.get("/patients/:id/photo", asyncRoute(async (request, response) => {
    await owned(repository, "patients", request.params.id, request.user.id);
    const avatar = await repository.findOne("patientAvatars", { ownerId: request.user.id, patientId: request.params.id });
    if (!avatar) throw notFound("Profile photo was not found.");
    const buffer = await storageProvider.read(avatar.storageKey);
    response.setHeader("content-type", avatar.mimeType);
    response.setHeader("cache-control", "private, no-store");
    response.setHeader("content-disposition", "inline");
    response.send(buffer);
  }));

  router.get("/reports", asyncRoute(async (request, response) => response.json(await repository.list("medicalReports", { ownerId: request.user.id }, { limit: 100 }))));
  router.post("/reports", upload.single("file"), asyncRoute(async (request, response) => {
    await assertPatient(repository, request.body.patientId, request.user.id);
    if (!request.file) throw badRequest("Choose a report file.");
    const stored = await storageProvider.store(request.file, request.user.id);
    try {
      const item = await repository.create("medicalReports", {
        ownerId: request.user.id,
        patientId: request.body.patientId,
        title: request.body.title?.trim() || path.parse(request.file.originalname).name,
        originalName: path.basename(request.file.originalname),
        storageKey: stored.key,
        mimeType: stored.mimeType,
        size: stored.size,
        status: "STORED",
        ocrStatus: ocrProvider.status().configured ? "READY" : "PROVIDER_DISABLED",
        analysisStatus: aiProvider.status().configured ? "READY" : "PROVIDER_DISABLED"
      });
      await audit.record({ actorId: request.user.id, action: "REPORT_UPLOAD", resource: "medicalReports", resourceId: item.id, requestId: request.requestId, ip: request.ip });
      response.status(201).json(item);
    } catch (error) {
      await storageProvider.remove(stored.key);
      throw error;
    }
  }));
  router.get("/reports/:id", asyncRoute(async (request, response) => response.json(await owned(repository, "medicalReports", request.params.id, request.user.id))));
  router.get("/reports/:id/download", asyncRoute(async (request, response) => {
    const report = await owned(repository, "medicalReports", request.params.id, request.user.id);
    const buffer = await storageProvider.read(report.storageKey);
    await audit.record({ actorId: request.user.id, action: "REPORT_DOWNLOAD", resource: "medicalReports", resourceId: report.id, requestId: request.requestId, ip: request.ip });
    response.setHeader("content-type", report.mimeType);
    response.setHeader("content-disposition", `attachment; filename="${encodeURIComponent(report.originalName)}"`);
    response.send(buffer);
  }));
  router.post("/reports/:id/analyze", asyncRoute(async (request, response) => {
    const report = await owned(repository, "medicalReports", request.params.id, request.user.id);
    const buffer = await storageProvider.read(report.storageKey);
    const ocr = await ocrProvider.extract({ buffer, mimeType: report.mimeType });
    const analysis = await aiProvider.analyzeReport({ text: ocr.text, patientContext: request.body?.patientContext ?? null });
    await repository.update("medicalReports", report.id, { ocrStatus: "COMPLETE", analysisStatus: "COMPLETE" });
    await audit.record({ actorId: request.user.id, action: "REPORT_ANALYZE", resource: "medicalReports", resourceId: report.id, requestId: request.requestId, ip: request.ip });
    response.json({ analysis, disclaimer: "AI output is assistive information and must be reviewed by a qualified clinician." });
  }));
  router.delete("/reports/:id", asyncRoute(async (request, response) => {
    const report = await owned(repository, "medicalReports", request.params.id, request.user.id);
    await storageProvider.remove(report.storageKey);
    await repository.remove("medicalReports", report.id);
    await audit.record({ actorId: request.user.id, action: "REPORT_DELETE", resource: "medicalReports", resourceId: report.id, requestId: request.requestId, ip: request.ip });
    response.status(204).end();
  }));

  return router;
}
