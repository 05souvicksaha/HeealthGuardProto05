import { Router } from "express";
import { asyncRoute, notFound } from "../lib/errors.mjs";

function pageOptions(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  return { page, limit, offset: (page - 1) * limit };
}

function normalizeHospitalType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["pvt", "private"].includes(normalized)) return "private";
  if (["govt", "government", "public"].includes(normalized)) return "government";
  return normalized;
}

export function createDataRouter({ repository, sourceData }) {
  const router = Router();

  const databaseSnapshot = async () => {
    const [hospitalResult, protocolResult, flashcardResult] = await Promise.all([
      repository.list("hospitals", { status: { $ne: "INACTIVE" } }, { limit: 500, sortBy: "createdAt", order: "asc" }),
      repository.list("medicalProtocols", { status: { $ne: "INACTIVE" } }, { limit: 500, sortBy: "createdAt", order: "asc" }),
      repository.list("flashcards", { status: { $ne: "INACTIVE" } }, { limit: 500, sortBy: "createdAt", order: "asc" })
    ]);
    const hospitals = hospitalResult.items.map(({ opd: _opd, sourceKey: _sourceKey, source: _source, createdAt: _createdAt, updatedAt: _updatedAt, id: _id, ...hospital }) => hospital);
    const opd = Object.fromEntries(hospitalResult.items.flatMap((hospital) => {
      const original = hospital.opd?.original;
      return original && Object.values(original).some(Boolean) ? [[hospital.name, original]] : [];
    }));
    const protocols = protocolResult.items.map((protocol) => ({
      id: protocol.sourceId, cat: protocol.category, sev: protocol.severity, title: protocol.title,
      tags: protocol.tags ?? [], warn: protocol.warning, steps: protocol.steps ?? [], donot: protocol.doNot ?? [], seek: protocol.seek
    }));
    const flashcards = flashcardResult.items.map((card) => ({ q: card.question, a: card.answer, cat: card.category }));
    return { categories: sourceData.categories, specialtyMap: sourceData.specialtyMap, hospitals, opd, protocols, flashcards };
  };

  router.get("/health-data", asyncRoute(async (_request, response) => response.json(await databaseSnapshot())));
  router.get("/categories", (_request, response) => response.json(sourceData.categories));
  router.get("/category-specialty-map", (_request, response) => response.json(sourceData.specialtyMap));
  router.get("/opd", asyncRoute(async (_request, response) => response.json((await databaseSnapshot()).opd)));
  router.get("/flashcards", asyncRoute(async (request, response) => {
    const category = String(request.query.category ?? "");
    const cards = (await databaseSnapshot()).flashcards;
    response.json(category ? cards.filter((card) => card.cat === category) : cards);
  }));
  router.get("/protocols", asyncRoute(async (request, response) => {
    const q = String(request.query.q ?? "").trim().toLowerCase();
    const severity = String(request.query.severity ?? "").toLowerCase();
    const category = String(request.query.category ?? "");
    const items = (await databaseSnapshot()).protocols.filter((item) => {
      const searchable = `${item.title} ${item.cat} ${item.tags.join(" ")}`.toLowerCase();
      return (!q || searchable.includes(q)) && (!severity || item.sev === severity) && (!category || item.cat === category);
    });
    response.json({ items, total: items.length });
  }));
  router.get("/protocols/:id", asyncRoute(async (request, response) => {
    const item = await repository.findOne("medicalProtocols", { sourceId: request.params.id });
    if (!item) throw notFound("Protocol not found.");
    response.json({ id: item.sourceId, cat: item.category, sev: item.severity, title: item.title, tags: item.tags ?? [], warn: item.warning, steps: item.steps ?? [], donot: item.doNot ?? [], seek: item.seek });
  }));
  router.get("/hospitals", asyncRoute(async (request, response) => {
    const { page, limit, offset } = pageOptions(request.query);
    const q = String(request.query.q ?? "").trim().toLowerCase();
    const type = String(request.query.type ?? "");
    const specialty = String(request.query.specialty ?? "");
    const emergency = String(request.query.emergency ?? "") === "true";
    const items = (await databaseSnapshot()).hospitals.filter((hospital) => {
      const searchable = `${hospital.name} ${hospital.address} ${hospital.specialties.join(" ")}`.toLowerCase();
      return (!q || searchable.includes(q)) && (!type || normalizeHospitalType(hospital.type) === normalizeHospitalType(type)) && (!specialty || hospital.specialties.includes(specialty)) && (!emergency || hospital.emergency);
    });
    response.json({ items: items.slice(offset, offset + limit), total: items.length, page, limit });
  }));
  router.get("/hospitals/:id", asyncRoute(async (request, response) => {
    const item = await repository.findOne("hospitals", { name: request.params.id }) ?? await repository.findById("hospitals", request.params.id);
    if (!item) throw notFound("Hospital not found.");
    const { sourceKey: _sourceKey, source: _source, createdAt: _createdAt, updatedAt: _updatedAt, ...hospital } = item;
    response.json({ ...hospital, opd: item.opd?.original ?? null });
  }));
  router.get("/doctors", asyncRoute(async (request, response) => {
    const { page, limit, offset } = pageOptions(request.query);
    const result = await repository.list("doctors", { status: { $ne: "INACTIVE" } }, { offset, limit });
    response.json({ ...result, page, limit, sourceNotice: result.total ? null : "No verified doctor dataset has been imported." });
  }));
  router.get("/diseases", asyncRoute(async (request, response) => {
    const { page, limit, offset } = pageOptions(request.query);
    const result = await repository.list("diseases", { status: { $ne: "INACTIVE" } }, { offset, limit });
    response.json({ ...result, page, limit, sourceNotice: result.total ? null : "No verified disease dataset has been imported." });
  }));
  router.get("/providers", (_request, response) => response.status(403).json({ error: { code: "FORBIDDEN", message: "Provider configuration requires Developer or Admin access." } }));
  return router;
}
