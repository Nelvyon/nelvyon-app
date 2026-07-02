import { describe, expect, it, vi } from "vitest";
import { OS_SECTOR_SERVICE_IDS } from "../../os-agents/sectorOsRegistry";
import { OsSectorCertificationService } from "../../os-agents/OsSectorCertificationService";

describe("OsSectorCertificationService", () => {
  it("runBatchCertification processes sectors", async () => {
    const db = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("FROM os_sector_certifications")) return [];
        if (sql.includes("INSERT INTO os_sector_certifications")) return [];
        return [];
      }),
    };
    const svc = new OsSectorCertificationService(db);
    const batch = await svc.runBatchCertification();
    expect(batch.processed).toBeGreaterThan(0);
    expect(batch.processed).toBeLessThanOrEqual(25);
  });

  it("registry has 190+ sector ids", () => {
    expect(OS_SECTOR_SERVICE_IDS.length).toBeGreaterThanOrEqual(190);
  });
});
