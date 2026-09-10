import { describe, expect, it } from "vitest";
import source from "./first-aid-source.json";
import { filterFirstAidProtocols, firstAidCategories, firstAidCategoryCounts, firstAidProtocols, parseFirstAidBookmarks } from "./firstAidProtocols";

describe("complete first aid source integration", () => {
  it("preserves every protocol and category, including duplicate source IDs", () => {
    expect(firstAidProtocols).toHaveLength(435);
    expect(Object.keys(firstAidCategories)).toHaveLength(20);
    expect(Object.values(firstAidCategoryCounts).reduce((sum, count) => sum + count, 0)).toBe(435);
    expect(new Set(firstAidProtocols.map((item) => item.id)).size).toBe(435);
    expect(new Set(firstAidProtocols.map((item) => item.sourceId)).size).toBe(414);
    expect(firstAidProtocols).toEqual(source.protocols);
    expect(firstAidProtocols.every((item) => item.steps.length && item.warn && item.seek && item.donot.length)).toBe(true);
  });
  it("combines text, specialty, severity and saved filters", () => {
    expect(filterFirstAidProtocols("cardiac arrest", "cardiac", "critical", false, []).some((item) => item.id === "c02")).toBe(true);
    expect(filterFirstAidProtocols("", "all", "all", true, ["c02"])).toEqual([firstAidProtocols.find((item) => item.id === "c02")]);
    expect(filterFirstAidProtocols("zzzzmissing", "all", "all", false, [])).toEqual([]);
    expect(filterFirstAidProtocols("", "dental", "critical", false, []).every((item) => item.cat === "dental" && item.sev === "critical")).toBe(true);
  });
  it("recovers malformed storage and rejects unknown bookmark values", () => {
    expect(parseFirstAidBookmarks("invalid")).toEqual([]);
    expect(parseFirstAidBookmarks('{"id":"c02"}')).toEqual([]);
    expect(parseFirstAidBookmarks('["c02","c02",null,2,"unknown"]')).toEqual(["c02"]);
  });
});
