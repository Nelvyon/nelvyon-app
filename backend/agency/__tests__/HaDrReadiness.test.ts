import { describe, expect, it } from "vitest";
import {
  HA_DR_CHECKLIST,
  assertHaDrReadinessIntegrity,
  buildStagingHealthUrl,
  getHaDrItem,
  isMultiRegionEnabled,
  listHaDrChecklist,
} from "../HaDrReadiness";

describe("HaDrReadiness", () => {
  it("passes its own integrity assertion", () => {
    expect(assertHaDrReadinessIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("lists a defensive copy of the checklist", () => {
    const list = listHaDrChecklist();
    expect(list.length).toBe(HA_DR_CHECKLIST.length);
    list.pop();
    expect(HA_DR_CHECKLIST.length).not.toBe(list.length);
  });

  it("every checklist item has a doc path and a substantive note", () => {
    for (const item of HA_DR_CHECKLIST) {
      expect(item.docPath.length).toBeGreaterThan(0);
      expect(item.note.length).toBeGreaterThan(15);
    }
  });

  it("multi-region is always BLOCKED_EXTERNAL and never toggled on", () => {
    const item = getHaDrItem("multi_region");
    expect(item?.status).toBe("BLOCKED_EXTERNAL");
    expect(isMultiRegionEnabled()).toBe(false);
  });

  it("health checks and kill switches are IMPLEMENTED_VERIFIED (already shipped)", () => {
    expect(getHaDrItem("health_checks")?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(getHaDrItem("kill_switches")?.status).toBe("IMPLEMENTED_VERIFIED");
  });

  it("builds a well-formed staging health URL", () => {
    const url = buildStagingHealthUrl("my-staging-app");
    expect(url).toBe("https://my-staging-app.up.railway.app/api/health/deep");
  });
});
