export type FirstAidSeverity = "low" | "moderate" | "high" | "critical";

/** Original source fields remain intact for lossless provenance. */
export interface FirstAidProtocol {
  id: string;
  sourceId: string;
  cat: string;
  sev: FirstAidSeverity;
  title: string;
  tags: string[];
  icon: string;
  warn: string;
  steps: string[];
  donot: string[];
  seek: string;
}

export interface FirstAidCategory {
  label: string;
  color: string;
  icon: string;
  bg: string;
}
