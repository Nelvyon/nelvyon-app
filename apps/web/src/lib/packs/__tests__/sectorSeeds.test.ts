import { describe, it, expect } from "vitest";
import {
  getSeedByIndex,
  getSectorSeedCount,
  ALL_SECTOR_IDS,
} from "../sectorSeeds";

// All 20 sectors that must have seeds
const ALL_20_SECTORS = [
  // TOP 10
  "dental", "legal", "fitness", "beauty", "restaurant",
  "real_estate", "ecommerce", "solar", "coaching", "saas_b2b",
  // +10
  "veterinaria", "educacion", "turismo", "construccion", "automocion",
  "logistica", "seguros", "contabilidad", "hosteleria", "tecnologia",
];

describe("ALL_SECTOR_IDS", () => {
  it("covers all 20 sectors", () => {
    for (const id of ALL_20_SECTORS) {
      expect(ALL_SECTOR_IDS).toContain(id);
    }
  });

  it("has at least 20 sectors", () => {
    expect(ALL_SECTOR_IDS.length).toBeGreaterThanOrEqual(20);
  });
});

describe("getSeedByIndex — all 20 sectors return a seed at index 0", () => {
  it.each(ALL_20_SECTORS)("sector %s has seed at index 0", (sector) => {
    const seed = getSeedByIndex(sector, 0);
    expect(seed).not.toBeNull();
    expect(seed!.seed_id).toBe(`${sector}_tpl_0`);
    expect(seed!.sector).toBe(sector);
  });
});

describe("getSeedByIndex — prompt is non-empty", () => {
  it.each(ALL_20_SECTORS)("sector %s has non-empty prompt", (sector) => {
    const seed = getSeedByIndex(sector, 0);
    expect(seed!.prompt.trim().length).toBeGreaterThan(20);
  });
});

describe("getSeedByIndex — output_schema has required fields", () => {
  it.each(ALL_20_SECTORS)("sector %s output_schema includes landing_headline", (sector) => {
    const seed = getSeedByIndex(sector, 0);
    expect(seed!.output_schema.fields).toContain("landing_headline");
    expect(seed!.output_schema.fields).toContain("meta_title");
    expect(seed!.output_schema.fields).toContain("chatbot_greeting");
  });
});

describe("getSeedByIndex — template fields are non-empty", () => {
  it.each(ALL_20_SECTORS)("sector %s has non-empty landing_headline", (sector) => {
    const seed = getSeedByIndex(sector, 0);
    expect(seed!.landing_headline.trim()).not.toBe("");
    expect(seed!.meta_title.trim()).not.toBe("");
    expect(seed!.chatbot_greeting.trim()).not.toBe("");
    expect(seed!.blog_h1_ideas.length).toBeGreaterThan(0);
  });
});

describe("getSeedByIndex — edge cases", () => {
  it("returns null for unknown sector", () => {
    expect(getSeedByIndex("unknown_xyz", 0)).toBeNull();
  });

  it("returns null for negative index", () => {
    expect(getSeedByIndex("dental", -1)).toBeNull();
  });

  it("returns null for out-of-range index", () => {
    const count = getSectorSeedCount("dental");
    expect(getSeedByIndex("dental", count)).toBeNull();
  });

  it("returns null for empty string sector", () => {
    expect(getSeedByIndex("", 0)).toBeNull();
  });
});

describe("getSectorSeedCount", () => {
  it.each(ALL_20_SECTORS)("sector %s has at least 1 seed", (sector) => {
    expect(getSectorSeedCount(sector)).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 for unknown sector", () => {
    expect(getSectorSeedCount("nonexistent")).toBe(0);
  });
});
