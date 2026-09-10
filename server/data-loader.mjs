import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "data");

export async function readDataset(name) {
  const safeNames = new Set(["categories", "category_specialty_map", "hospitals", "flashcards", "hospital_opd", "protocols"]);
  if (!safeNames.has(name)) throw new Error("Unknown dataset");
  return JSON.parse(await readFile(path.join(dataDir, `${name}.json`), "utf8"));
}

export async function loadAllData() {
  const [categories, specialtyMap, hospitals, flashcards, opd, protocols] = await Promise.all([
    readDataset("categories"),
    readDataset("category_specialty_map"),
    readDataset("hospitals"),
    readDataset("flashcards"),
    readDataset("hospital_opd"),
    readDataset("protocols")
  ]);
  return { categories, specialtyMap, hospitals, flashcards, opd, protocols };
}

export function validateDatasets(data) {
  const normalized = new Map();
  for (const hospital of data.hospitals) {
    const key = String(hospital.name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
    normalized.set(key, (normalized.get(key) || 0) + 1);
  }
  const duplicateHospitalNames = [...normalized.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
  const invalidProtocols = data.protocols.filter((protocol) => !protocol.id || !protocol.title || !Array.isArray(protocol.steps) || protocol.steps.length === 0).length;
  const uniqueProtocolIds = new Set(data.protocols.map((protocol) => protocol.id));
  const opdWithoutHospital = Object.keys(data.opd).filter((name) => !data.hospitals.some((hospital) => hospital.name === name)).length;
  return {
    records: {
      hospitals: data.hospitals.length,
      opd: Object.keys(data.opd).length,
      protocols: data.protocols.length,
      flashcards: data.flashcards.length,
      categories: Object.keys(data.categories).length
    },
    duplicateHospitals: duplicateHospitalNames,
    duplicateProtocolIds: data.protocols.length - uniqueProtocolIds.size,
    invalidProtocols,
    opdWithoutHospital
  };
}
