import type { Category, Hospital, SpecialtyMapping } from "../types/health";

export function normalizeHospitalType(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "pvt" || normalized === "private") return "private";
  if (normalized === "govt" || normalized === "government" || normalized === "public") return "government";
  return normalized;
}

export function hospitalTypeLabel(value: string) {
  const normalized = normalizeHospitalType(value);
  if (normalized === "private") return "Private";
  if (normalized === "government") return "Government";
  return value || "Hospital";
}

export function hospitalMatchesType(hospital: Hospital, requestedType: string) {
  return requestedType === "all" || normalizeHospitalType(hospital.type) === normalizeHospitalType(requestedType);
}

export function hospitalSpecialtyKeys(
  hospital: Hospital,
  categories: Record<string, Category>,
  specialtyMap: Record<string, SpecialtyMapping>
) {
  const suppliedSpecialties = new Set(hospital.specialties.map((specialty) => specialty.toLowerCase()));
  return Object.keys(categories).filter((key) => suppliedSpecialties.has((specialtyMap[key]?.spec ?? key).toLowerCase()));
}

export function hospitalMatchesSpecialty(
  hospital: Hospital,
  requestedSpecialty: string,
  specialtyMap: Record<string, SpecialtyMapping>
) {
  if (requestedSpecialty === "all") return true;
  const suppliedSpecialty = (specialtyMap[requestedSpecialty]?.spec ?? requestedSpecialty).toLowerCase();
  return hospital.specialties.some((specialty) => specialty.toLowerCase() === suppliedSpecialty);
}
