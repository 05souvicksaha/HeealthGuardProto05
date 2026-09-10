import { describe, expect, it } from "vitest";
import type { Category, Hospital, SpecialtyMapping } from "../types/health";
import { hospitalMatchesSpecialty, hospitalMatchesType, hospitalSpecialtyKeys, hospitalTypeLabel } from "./hospitals";

const hospital: Hospital = {
  name: "Example Hospital",
  type: "pvt",
  address: "Kolkata",
  emergency: true,
  specialties: ["cardiac", "general"]
};

const categories: Record<string, Category> = {
  cardiac: { label: "Cardiac", color: "#ff2d55", bg: "rgba(255,45,85,.12)", icon: "heart-pulse" },
  respiratory: { label: "Respiratory", color: "#00e676", bg: "rgba(0,230,118,.12)", icon: "lungs" }
};

const specialtyMap: Record<string, SpecialtyMapping> = {
  cardiac: { spec: "cardiac", specialist: "Cardiologist", keywords: [] },
  respiratory: { spec: "general", specialist: "Pulmonologist", keywords: [] }
};

describe("hospital directory normalization", () => {
  it("matches the supplied pvt type through the public Private filter", () => {
    expect(hospitalMatchesType(hospital, "private")).toBe(true);
    expect(hospitalTypeLabel(hospital.type)).toBe("Private");
  });

  it("maps presentation specialties to supplied hospital specialty codes", () => {
    expect(hospitalSpecialtyKeys(hospital, categories, specialtyMap)).toEqual(["cardiac", "respiratory"]);
    expect(hospitalMatchesSpecialty(hospital, "respiratory", specialtyMap)).toBe(true);
  });
});
