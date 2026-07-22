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
  it("betaPacksRunners report portal_path is /portal (not /portal/packs/*)", () => {
    const src = readFileSync(join(here, "..", "betaPacksRunners.ts"), "utf8");
    expect(src).toContain('portal_path: "/portal"');
    expect(src).not.toMatch(/portal_path:\s*`\/portal\/packs\//);
  });

  it("growthPackReport uses /portal", () => {
    const src = readFileSync(join(here, "..", "growthPackReport.ts"), "utf8");
    expect(src).toContain('portal_path: "/portal"');
  });
});
