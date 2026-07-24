import { describe, expect, it } from "vitest";
import {
  LEGACY_AREAS,
  assertLegacyConsolidationAuditIntegrity,
  getLegacyArea,
  listLegacyAreas,
} from "../LegacyConsolidationAudit";

describe("LegacyConsolidationAudit", () => {
  it("passes its own integrity assertion", () => {
    expect(assertLegacyConsolidationAuditIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("lists a defensive copy of the areas", () => {
    const list = listLegacyAreas();
    expect(list.length).toBe(LEGACY_AREAS.length);
    list.pop();
    expect(LEGACY_AREAS.length).not.toBe(list.length);
  });

  it("frontend/ is DO_NOT_TOUCH and never safe to delete", () => {
    const frontend = getLegacyArea("frontend_legacy_vite");
    expect(frontend?.status).toBe("DO_NOT_TOUCH");
    expect(frontend?.safeToDelete).toBe(false);
  });

  it("backend/alembic/ is SECONDARY_NOT_SSOT and never safe to delete", () => {
    const alembic = getLegacyArea("alembic_secondary");
    expect(alembic?.status).toBe("SECONDARY_NOT_SSOT");
    expect(alembic?.safeToDelete).toBe(false);
  });

  it("legacy pages/api/saas routes are marked DEPRECATED_410", () => {
    const pagesApi = getLegacyArea("pages_api_saas_410");
    expect(pagesApi?.status).toBe("DEPRECATED_410");
    expect(pagesApi?.safeToDelete).toBe(false);
  });

  it("no entry in this audit is ever marked safe to delete", () => {
    for (const area of LEGACY_AREAS) {
      expect(area.safeToDelete).toBe(false);
    }
  });

  it("every entry has a non-trivial rationale and a doc path", () => {
    for (const area of LEGACY_AREAS) {
      expect(area.rationale.length).toBeGreaterThan(20);
      expect(area.docPath.length).toBeGreaterThan(0);
    }
  });
});
