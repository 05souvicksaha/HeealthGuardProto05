import source from "./first-aid-source.json";
import type { FirstAidCategory, FirstAidProtocol, FirstAidSeverity } from "../types/firstAid";

const severities = new Set<FirstAidSeverity>(["low", "moderate", "high", "critical"]);
export const firstAidCategories: Record<string, FirstAidCategory> = source.categories;
export const firstAidProtocols: FirstAidProtocol[] = source.protocols.map((protocol) => {
  if (!severities.has(protocol.sev as FirstAidSeverity)) throw new Error(`Invalid source severity: ${protocol.id}`);
  return { ...protocol, sev: protocol.sev as FirstAidSeverity };
});
export const firstAidCategoryCounts = firstAidProtocols.reduce<Record<string, number>>((counts, protocol) => {
  counts[protocol.cat] = (counts[protocol.cat] ?? 0) + 1;
  return counts;
}, {});

export function filterFirstAidProtocols(query: string, category: string, severity: string, savedOnly: boolean, bookmarks: readonly string[]) {
  const words = query.trim().toLocaleLowerCase("en-IN").split(/\s+/).filter(Boolean);
  const saved = new Set(bookmarks);
  return firstAidProtocols.filter((protocol) => {
    const searchText = `${protocol.title} ${protocol.tags.join(" ")} ${firstAidCategories[protocol.cat].label} ${protocol.steps.join(" ")}`.toLocaleLowerCase("en-IN");
    return words.every((word) => searchText.includes(word))
      && (category === "all" || protocol.cat === category)
      && (severity === "all" || protocol.sev === severity)
      && (!savedOnly || saved.has(protocol.id));
  });
}

export const FIRST_AID_BOOKMARK_KEY = "healthguard:first-aid-bookmarks";
export function parseFirstAidBookmarks(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(firstAidProtocols.map((protocol) => protocol.id));
    return [...new Set(parsed.filter((id): id is string => typeof id === "string" && validIds.has(id)))];
  } catch { return []; }
}
