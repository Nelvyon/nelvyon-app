import { describe, expect, it } from "vitest";

import { NELVYON_PLATFORM_UI_SEED } from "../platform-ui-seed";
import { ACETERNITY_SEED_MANIFEST } from "../ingest/aceternity-manifest";

describe("platform-ui-seed", () => {
  it("registers Simplistic SaaS as official Nelvyon platform UI seed", () => {
    expect(NELVYON_PLATFORM_UI_SEED.seed_id).toBe("aceternity-simplistic-saas");
    expect(NELVYON_PLATFORM_UI_SEED.surfaces).toContain("/dashboard");
  });

  it("manifest marks simplistic-saas as ported to nelvyon platform UI", () => {
    const entry = ACETERNITY_SEED_MANIFEST.find((s) => s.seed_id === "aceternity-simplistic-saas");
    expect(entry?.status).toBe("ported_partial");
    expect(entry?.target_landings).toContain("nelvyon-platform-ui");
  });
});
