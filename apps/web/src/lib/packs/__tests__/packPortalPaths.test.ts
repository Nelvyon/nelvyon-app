/**
 * Pack portal paths must point at the real client portal (`/portal`),
 * not fictional `/portal/packs/{id}` routes.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("pack portal paths", () => {
  it("betaPacksRunners delegates portal_path via growthPackReport (not /portal/packs/*)", () => {
    // Contract moved: portal_path lives in buildGrowthPackReport; runners must call it.
    const src = readFileSync(join(here, "..", "betaPacksRunners.ts"), "utf8");
    expect(src).toMatch(/buildGrowthPackReport/);
    expect(src).not.toMatch(/portal_path:\s*`\/portal\/packs\//);
    expect(src).not.toMatch(/portal_path:\s*["']\/portal\/packs\//);
  });

  it("growthPackReport uses /portal", () => {
    const src = readFileSync(join(here, "..", "growthPackReport.ts"), "utf8");
    expect(src).toContain('portal_path: "/portal"');
  });
});
