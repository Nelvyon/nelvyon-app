import { describe, expect, it } from "vitest";

import {
  getOnDiskSeedsForPack,
  getSeedsForPack,
  listSeedMetadata,
  loadSeedStoreIndex,
  seedStoreStats,
} from "../ingest/seed-store";

describe("seed-store", () => {
  it("loads provisioned index and metadata", () => {
    const index = loadSeedStoreIndex();
    expect(index).toBeTruthy();
    expect(index!.total_items).toBeLessThanOrEqual(500);
    expect(index!.total_items).toBeGreaterThanOrEqual(400);
    expect(index!.on_disk).toBe(500);
    expect(index!.catalog_registered).toBe(0);
  });

  it("lists aceternity seeds on disk for saas-b2b-growth pack", () => {
    const onDisk = getOnDiskSeedsForPack("saas-b2b-growth");
    expect(onDisk.length).toBeGreaterThanOrEqual(4);
    expect(onDisk.every((s) => s.status === "on_disk")).toBe(true);
    expect(onDisk.some((s) => s.item_name.includes("Foxtrot"))).toBe(true);
  });

  it("has all envato seeds on disk after provisioning", () => {
    const envato = listSeedMetadata().filter((s) => s.provider === "EnvatoElements");
    expect(envato.length).toBeGreaterThan(400);
    expect(envato.every((s) => s.status === "on_disk")).toBe(true);
    for (const meta of envato) {
      expect(meta.redistribution).toBe("none");
      expect(meta.license_id).toBe("lic-envato-elements-2026");
    }
  });

  it("maps local pack to envato seed catalog entries", () => {
    const seeds = getSeedsForPack("local-business-growth");
    expect(seeds.length).toBeGreaterThan(10);
    const stats = seedStoreStats();
    expect(stats.total).toBe(stats.on_disk + stats.catalog_registered);
  });
});
