import type { HealthData } from "../types/health";

const endpoints = ["categories", "category_specialty_map", "hospitals", "hospital_opd", "protocols", "flashcards"] as const;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

async function loadFrom(base: string): Promise<HealthData> {
  const [categories, specialtyMap, hospitals, opd, protocols, flashcards] = await Promise.all(
    endpoints.map((name) => fetchJson(`${base}/${name}`))
  );
  return {
    categories: categories as HealthData["categories"],
    specialtyMap: specialtyMap as HealthData["specialtyMap"],
    hospitals: hospitals as HealthData["hospitals"],
    opd: opd as HealthData["opd"],
    protocols: protocols as HealthData["protocols"],
    flashcards: flashcards as HealthData["flashcards"],
    source: base.startsWith("/api") ? "api" : "static"
  };
}

export async function loadHealthData(): Promise<HealthData> {
  try {
    const value = await fetchJson<Omit<HealthData, "source">>("/api/v1/health-data");
    return { ...value, source: "api" };
  } catch {
    return loadFrom("/data");
  }
}
