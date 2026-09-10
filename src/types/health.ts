export type Severity = "low" | "moderate" | "high" | "critical" | string;

export interface Category {
  label: string;
  color: string;
  icon: string;
  bg: string;
}

export interface SpecialtyMapping {
  spec: string;
  specialist: string;
  keywords: string[];
}

export interface Hospital {
  name: string;
  type: string;
  address: string;
  phone?: string;
  emergency: boolean;
  beds?: number;
  specialties: string[];
  note?: string;
}

export interface OpdSchedule {
  weekday: string;
  saturday: string;
  sunday: string;
  note?: string;
}

export interface MedicalProtocol {
  id: string;
  cat: string;
  sev: Severity;
  title: string;
  tags: string[];
  icon?: string;
  warn?: string;
  steps: string[];
  donot?: string[];
  seek?: string;
}

export interface Flashcard {
  q: string;
  a: string;
  cat: string;
}

export interface HealthData {
  categories: Record<string, Category>;
  specialtyMap: Record<string, SpecialtyMapping>;
  hospitals: Hospital[];
  opd: Record<string, OpdSchedule>;
  protocols: MedicalProtocol[];
  flashcards: Flashcard[];
  source: "api" | "static";
}
