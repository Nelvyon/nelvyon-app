/**
 * O16 — OsSectorReadinessService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsSectorReadinessService,
  OsSectorReadinessError,
  SECTOR_CATALOG,
  type SectorDbPort,
  type SectorSeedPort,
  type SectorSeedInfo,
} from "../OsSectorReadinessService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SectorDbPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SectorDbPort;
}

const NO_DATA = makeDb(() => []);

function seedPort(info: SectorSeedInfo | null): SectorSeedPort {
  return { getSeedInfo: async () => info };
}

const FULL_SEED: SectorSeedInfo = {
  count: 1,
  prompt: "Genera contenido de marketing con disclaimer sanitario y sin diagnósticos para la clínica.",
  landingHeadline: "Sonríe con confianza",
  metaTitle: "Clínica Dental | Reservar",
  chatbotGreeting: "Hola",
};

// ── catalog ──────────────────────────────────────────────────────────────────────

describe("OsSectorReadinessService — catalog", () => {
  it("has exactly 20 fixed sectors", () => {
    expect(SECTOR_CATALOG).toHaveLength(20);
  });

  it("includes both TOP-10 and +10 sectors", () => {
    const ids = SECTOR_CATALOG.map((c) => c.id);
    expect(ids).toContain("dental");
    expect(ids).toContain("tecnologia");
    expect(ids).toContain("veterinaria");
  });

  it("marks regulated sectors", () => {
    expect(SECTOR_CATALOG.find((c) => c.id === "dental")!.regulated).toBe(true);
    expect(SECTOR_CATALOG.find((c) => c.id === "restaurant")!.regulated).toBe(false);
  });
});

// ── computeReadiness ─────────────────────────────────────────────────────────────

describe("OsSectorReadinessService — computeReadiness", () => {
  it("regulated sector with full seed + envato + compliance → 100", async () => {
    const db = makeDb((sql) => (sql.includes("os_envato_seed_registry") ? [{ count: "50" }] : []));
    const svc = new OsSectorReadinessService(db, seedPort(FULL_SEED));
    const r = await svc.computeReadiness("dental");
    expect(r.readinessScore).toBe(100);
    expect(r.hasQaRubric).toBe(true);
    expect(r.envatoCount).toBe(50);
  });

  it("regulated sector WITHOUT compliance markers loses qa points", async () => {
    const db = makeDb((sql) => (sql.includes("os_envato_seed_registry") ? [{ count: "10" }] : []));
    const noCompliance: SectorSeedInfo = { ...FULL_SEED, prompt: "Genera contenido bonito para vender mucho ya mismo." };
    const svc = new OsSectorReadinessService(db, seedPort(noCompliance));
    const r = await svc.computeReadiness("dental");
    expect(r.hasQaRubric).toBe(false);
    expect(r.readinessScore).toBe(85); // 100 - 15 qa
  });

  it("non-regulated sector treats qa rubric as satisfied", async () => {
    const svc = new OsSectorReadinessService(NO_DATA, seedPort({ ...FULL_SEED, prompt: "Contenido marketing sin compliance pero bueno y largo." }));
    const r = await svc.computeReadiness("restaurant");
    expect(r.hasQaRubric).toBe(true);
    // seed 25 + agent 25 + portal 20 + qa 15 = 85 (no envato)
    expect(r.readinessScore).toBe(85);
  });

  it("missing seed → low score, no agent/portal", async () => {
    const svc = new OsSectorReadinessService(NO_DATA, seedPort(null));
    const r = await svc.computeReadiness("restaurant");
    expect(r.seedCount).toBe(0);
    expect(r.agentCount).toBe(0);
    expect(r.hasPortalTemplate).toBe(false);
    // only qa (non-regulated, N/A) = 15
    expect(r.readinessScore).toBe(15);
  });

  it("short prompt does not count as agent", async () => {
    const svc = new OsSectorReadinessService(NO_DATA, seedPort({ ...FULL_SEED, prompt: "corto" }));
    const r = await svc.computeReadiness("restaurant");
    expect(r.agentCount).toBe(0);
  });

  it("portal requires landing + meta", async () => {
    const svc = new OsSectorReadinessService(NO_DATA, seedPort({ ...FULL_SEED, metaTitle: "" }));
    const r = await svc.computeReadiness("restaurant");
    expect(r.hasPortalTemplate).toBe(false);
  });

  it("throws NOT_FOUND for unknown sector", async () => {
    const svc = new OsSectorReadinessService(NO_DATA, seedPort(FULL_SEED));
    await expect(svc.computeReadiness("nope")).rejects.toThrow(OsSectorReadinessError);
  });

  it("builds a 5-item checklist", async () => {
    const svc = new OsSectorReadinessService(NO_DATA, seedPort(FULL_SEED));
    const r = await svc.computeReadiness("restaurant");
    expect(r.checklist).toHaveLength(5);
    expect(r.checklist.map((c) => c.key)).toEqual(["seed", "envato", "agent", "portal", "qa"]);
  });

  it("survives envato query failure (count 0)", async () => {
    const db = makeDb((sql) => { if (sql.includes("os_envato_seed_registry")) throw new Error("no table"); return []; });
    const svc = new OsSectorReadinessService(db, seedPort(FULL_SEED));
    const r = await svc.computeReadiness("restaurant");
    expect(r.envatoCount).toBe(0);
  });
});

// ── syncSectorCatalog / refreshAll ───────────────────────────────────────────────

describe("OsSectorReadinessService — sync", () => {
  it("syncs all 20 sectors", async () => {
    const db = makeDb((sql) => (sql.includes("os_envato_seed_registry") ? [{ count: "0" }] : []));
    const svc = new OsSectorReadinessService(db, seedPort(FULL_SEED));
    const res = await svc.syncSectorCatalog();
    expect(res.synced).toBe(20);
  });
});

// ── listSectors / getSector ──────────────────────────────────────────────────────

describe("OsSectorReadinessService — queries", () => {
  function row(over: Record<string, unknown> = {}) {
    return {
      sector_id: "dental", label: "Clínicas dentales", sensitivity: "high", regulated: true,
      seed_count: 1, envato_count: 50, agent_count: 1, has_portal_template: true,
      has_qa_rubric: true, readiness_score: 100, checklist: [], metadata: {}, updated_at: "", ...over,
    };
  }

  it("listSectors maps rows", async () => {
    const db = makeDb(() => [row(), row({ sector_id: "legal", label: "Legal" })]);
    const svc = new OsSectorReadinessService(db, seedPort(FULL_SEED));
    const list = await svc.listSectors();
    expect(list).toHaveLength(2);
    expect(list[0]!.sectorId).toBe("dental");
  });

  it("getSector returns one", async () => {
    const db = makeDb(() => [row()]);
    const svc = new OsSectorReadinessService(db, seedPort(FULL_SEED));
    expect((await svc.getSector("dental")).readinessScore).toBe(100);
  });

  it("getSector throws NOT_FOUND when absent", async () => {
    const svc = new OsSectorReadinessService(NO_DATA, seedPort(FULL_SEED));
    await expect(svc.getSector("dental")).rejects.toThrow(OsSectorReadinessError);
  });

  it("getSummary aggregates production-ready + avg", async () => {
    const db = makeDb(() => [
      row({ sector_id: "a", readiness_score: 100, regulated: true }),
      row({ sector_id: "b", readiness_score: 60, regulated: false }),
    ]);
    const svc = new OsSectorReadinessService(db, seedPort(FULL_SEED));
    const summary = await svc.getSummary();
    expect(summary.totalSectors).toBe(2);
    expect(summary.productionReady).toBe(1);
    expect(summary.avgScore).toBe(80);
    expect(summary.regulatedCount).toBe(1);
  });

  it("getReadinessScore returns the score or null", async () => {
    const db = makeDb(() => [{ readiness_score: 75 }]);
    const svc = new OsSectorReadinessService(db, seedPort(FULL_SEED));
    expect(await svc.getReadinessScore("dental")).toBe(75);
    const empty = new OsSectorReadinessService(NO_DATA, seedPort(FULL_SEED));
    expect(await empty.getReadinessScore("dental")).toBeNull();
  });
});
