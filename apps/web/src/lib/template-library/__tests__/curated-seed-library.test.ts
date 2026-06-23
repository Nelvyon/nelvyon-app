import { describe, expect, it } from "vitest";

import {
  CURATED_SEED_LIMIT,
  CURATED_SEEDS,
  CURATED_SEED_STATS,
  pickCuratedSeed,
} from "../curated-seed-library";

describe("curated-seed-library", () => {
  it("respects 500 seed cap", () => {
    expect(CURATED_SEEDS.length).toBeLessThanOrEqual(CURATED_SEED_LIMIT);
    expect(CURATED_SEEDS.length).toBeGreaterThanOrEqual(400);
  });

  it("has distribution across providers and kinds", () => {
    expect(CURATED_SEED_STATS.by_provider.EnvatoElements).toBeGreaterThan(300);
    expect(CURATED_SEED_STATS.by_provider.Aceternity).toBeGreaterThanOrEqual(10);
    expect(CURATED_SEED_STATS.by_kind.landing).toBeGreaterThan(100);
    expect(CURATED_SEED_STATS.variety_buckets).toBeGreaterThan(25);
  });

  it("varies seed per client key in same sector", () => {
    const a = pickCuratedSeed({
      sectorId: "restaurant",
      service: "Landing",
      kind: "landing",
      varietyKey: "client-a",
    });
    const b = pickCuratedSeed({
      sectorId: "restaurant",
      service: "Landing",
      kind: "landing",
      varietyKey: "client-b",
    });
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a!.item_name).not.toBe(b!.item_name);
  });
});
