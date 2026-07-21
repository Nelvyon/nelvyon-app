import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTE = join(
  __dirname,
  "..",
  "..",
  "..",
  "apps",
  "web",
  "src",
  "app",
  "api",
  "saas",
  "lead-scoring",
  "leads",
  "route.ts",
);

describe("lead-scoring/leads legacy route — SSOT consolidation (ADR-023)", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("returns 410 Gone and does not import legacy LeadScoringService", () => {
    expect(src).toMatch(/status:\s*410/);
    expect(src).toMatch(/LEAD_SCORING_LEGACY_GONE/);
    expect(src).toMatch(/ssot:\s*"\/api\/saas\/lead-scoring"/);
    expect(src).not.toMatch(/getLeadScoringService/);
    const importLine = src.split("\n").find((l) => l.includes("from \"@nelvyon/saas\"") || l.includes("from '@nelvyon/saas'")) ?? "";
    expect(importLine).not.toMatch(/\bLeadScoringService\b/);
    expect(importLine).not.toMatch(/getLeadScoringService/);
  });

  it("still requires SaaS auth (401 for anonymous)", () => {
    expect(src).toMatch(/requireSaasContext/);
  });
});
