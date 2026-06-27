import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { applySectorContext } from "../sectors/applySectorContext";
import { resolveSector, sectorAutonomyScore } from "../sectors/resolveSector";
import { requiresOperatorEscalation, runSectorQaChecks } from "../sectors/sectorQa";
import { SECTOR_IDS, SECTOR_REGISTRY } from "../sectors/sectorRegistry";
import { simulatePhaseC } from "../simulatorPhaseC";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "fixtures", "briefs");

function brief(name: string) {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf-8")) as Record<string, unknown>;
}

describe("Phase E — sector registry", () => {
  it("defines 20 priority sectors (TOP 10 + O9 expansion)", () => {
    expect(SECTOR_IDS).toHaveLength(20);
    for (const id of [
      "veterinaria", "educacion", "turismo", "construccion", "automocion",
      "logistica", "seguros", "contabilidad", "hosteleria", "tecnologia",
    ] as const) {
      expect(SECTOR_IDS).toContain(id);
      expect(SECTOR_REGISTRY[id]).toBeDefined();
    }
    expect(SECTOR_REGISTRY.dental.autonomy_score).toBeGreaterThanOrEqual(75);
    expect(SECTOR_REGISTRY.saas_b2b.autonomy_score).toBeGreaterThanOrEqual(90);
  });

  it("resolves sector from brief.sector", () => {
    expect(resolveSector(null, { sector: "dental" })).toBe("dental");
    expect(resolveSector("legal")).toBe("legal");
    expect(resolveSector("gimnasio")).toBe("fitness");
  });
});

describe("Phase E — sector context", () => {
  it("enriches brief with _sector_context", () => {
    const { sector, brief } = applySectorContext({ company_name: "Test" }, "dental");
    expect(sector).toBe("dental");
    expect(brief._sector_context).toBeDefined();
    expect((brief.compliance_flags as { regulated_sector: boolean }).regulated_sector).toBe(true);
  });

  it("regulated sectors require operator escalation on pass", () => {
    expect(requiresOperatorEscalation("dental")).toBe(true);
    expect(requiresOperatorEscalation("legal")).toBe(true);
    expect(requiresOperatorEscalation("restaurant")).toBe(false);
  });
});

describe("Phase E — sector QA", () => {
  it("passes sector QA for dental brief with compliance flags", () => {
    const b = brief("chatbot-sonrisa.json");
    const checks = runSectorQaChecks("dental", "NELVYON-CHATBOT", b, {
      sector_context: { templates: ["chatbot-dental-v1"] },
    });
    const reg = checks.find((c) => c.id === "SEC-REG-01");
    expect(reg?.passed).toBe(true);
  });

  it("blocks regulated sector without compliance context", () => {
    const checks = runSectorQaChecks("legal", "NELVYON-LANDING", {}, {});
    const reg = checks.find((c) => c.id === "SEC-REG-01");
    expect(reg?.passed).toBe(false);
    expect(reg?.blocking).toBe(true);
  });
});

describe("Phase E — Phase C/D integration", () => {
  it("dental chatbot escalates operator even when QA passes", async () => {
    const result = await simulatePhaseC({
      sku: "NELVYON-CHATBOT",
      tier: "professional",
      brief: brief("chatbot-sonrisa.json"),
      sector: "dental",
    });
    expect(result.project.sector).toBe("dental");
    expect(result.project.qa?.passed).toBe(true);
    expect(result.escalated).toBe(true);
    expect(result.project.status).toBe("ESCALATE_OPERATOR");
    expect(result.os_publish?.dry_run).toBe(true);
    expect(result.os_publish?.sector).toBe("dental");
  });

  it("restaurant sector does not force escalation on pass", async () => {
    const result = await simulatePhaseC({
      sku: "NELVYON-LANDING",
      tier: "professional",
      brief: brief("landing-heliovolt.json"),
      sector: "restaurant",
    });
    if (result.project.qa?.passed) {
      expect(result.escalated).toBe(false);
      expect(result.project.status).toBe("OS_PUBLISH_READY");
    }
  });

  it("sector autonomy scores are documented range", () => {
    expect(sectorAutonomyScore("saas_b2b")).toBe(91);
    expect(sectorAutonomyScore("legal")).toBe(75);
  });
});
