import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OS_PROFESSIONAL_TEAMS } from "../OsProfessionalTeams";
import {
  assertSectorTaxonomyIntegrity,
  getSector,
  listSectorPlaybooks,
  SECTOR_CAPABILITY_TAXONOMY,
  type SectorId,
} from "../SectorCapabilityTaxonomy";

const root = join(__dirname, "../../../");

const CANONICAL: SectorId[] = [
  "local_smb",
  "ecommerce",
  "saas_b2b",
  "professional_services",
  "agency_marketing",
  "retail",
  "industry_manufacturing",
  "health_education_regulated",
];

describe("SectorCapabilityTaxonomy — Block 35", () => {
  it("lists all canonical sectors with expected statuses", () => {
    const list = listSectorPlaybooks();
    expect(list.map((s) => s.id).sort()).toEqual([...CANONICAL].sort());

    expect(getSector("local_smb")?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(getSector("ecommerce")?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(getSector("saas_b2b")?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(getSector("agency_marketing")?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(getSector("professional_services")?.status).toBe("PREPARED_OFF");
    expect(getSector("retail")?.status).toBe("PREPARED_OFF");
    expect(getSector("industry_manufacturing")?.status).toBe("PREPARED_OFF");
    expect(getSector("health_education_regulated")?.status).toBe("BLOCKED_LEGAL");
  });

  it("IMPLEMENTED_VERIFIED sectors map to real packs/services and existing playbooks", () => {
    const verified = SECTOR_CAPABILITY_TAXONOMY.filter((s) => s.status === "IMPLEMENTED_VERIFIED");
    expect(verified.length).toBeGreaterThanOrEqual(4);

    for (const sector of verified) {
      expect(sector.mappedModules.length).toBeGreaterThan(0);
      expect(sector.playbookPaths.length).toBeGreaterThan(0);
      for (const path of sector.playbookPaths) {
        expect(existsSync(join(root, path)), path).toBe(true);
      }
    }

    expect(getSector("local_smb")?.mappedModules).toContain("local-business-growth");
    expect(getSector("ecommerce")?.mappedModules).toContain("ecommerce-growth");
    expect(getSector("saas_b2b")?.mappedModules).toContain("saas-b2b-growth");
    expect(getSector("agency_marketing")?.mappedModules).toContain("SERVICE_CONTENT_SOCIAL");
  });

  it("reuses OsProfessionalTeams by reference string ids (no duplicated team defs)", () => {
    const known = new Set(OS_PROFESSIONAL_TEAMS.map((t) => t.teamId));
    for (const sector of SECTOR_CAPABILITY_TAXONOMY) {
      for (const teamId of sector.eliteTeamIds) {
        expect(known.has(teamId), `${sector.id}:${teamId}`).toBe(true);
      }
    }
    expect(getSector("saas_b2b")?.eliteTeamIds).toContain("svc_automations_crm");
    expect(getSector("agency_marketing")?.eliteTeamIds).toContain("svc_social_creative");
  });

  it("industry_manufacturing stays PREPARED_OFF with ManufacturingOpsCore mapping (no dedicated pack)", () => {
    const mfg = getSector("industry_manufacturing");
    expect(mfg?.status).toBe("PREPARED_OFF");
    expect(mfg?.mappedModules).toContain("ManufacturingOpsCore");
  });

  it("health_education_regulated is BLOCKED_LEGAL with regulated note", () => {
    const health = getSector("health_education_regulated");
    expect(health?.status).toBe("BLOCKED_LEGAL");
    expect(health?.regulatedNote).toMatch(/legal|PHI|compliance/i);
    expect(health?.playbookPaths).toHaveLength(0);
  });

  it("mapped PREPARED_OFF sectors have real playbook files on disk", () => {
    for (const id of ["professional_services", "retail", "industry_manufacturing"] as SectorId[]) {
      const sector = getSector(id)!;
      expect(sector.playbookPaths.length).toBeGreaterThan(0);
      for (const path of sector.playbookPaths) {
        expect(existsSync(join(root, path)), path).toBe(true);
      }
    }
  });

  it("passes assertSectorTaxonomyIntegrity()", () => {
    expect(assertSectorTaxonomyIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
