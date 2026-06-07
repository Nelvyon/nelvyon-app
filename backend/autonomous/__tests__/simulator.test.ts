import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildOsPublishPayload } from "../publish/osPublishPayload";
import { simulateAutonomousJob } from "../simulator";
import type { AutonomousSku } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "fixtures", "briefs");

function loadBrief(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf-8")) as Record<string, unknown>;
}

const SKUS: Array<{ sku: AutonomousSku; brief: string; slug: string }> = [
  { sku: "NELVYON-LANDING", brief: "landing-heliovolt.json", slug: "LANDING-SIM" },
  { sku: "NELVYON-CHATBOT", brief: "chatbot-sonrisa.json", slug: "CHATBOT-SIM" },
  { sku: "NELVYON-SEO", brief: "seo-alonso-vega.json", slug: "SEO-SIM" },
];

describe("autonomous phase-b simulator", () => {
  for (const { sku, brief, slug } of SKUS) {
    it(`${sku} completes with QA >= 85 and OsPublishPayload dry_run`, () => {
      const result = simulateAutonomousJob({
        sku,
        tier: "professional",
        brief: loadBrief(brief),
        os_refs: { client_id: "test", project_slug: slug, workspace_id: "ws" },
      });

      expect(result.escalated).toBe(false);
      expect(result.project.qa?.passed).toBe(true);
      expect(result.project.qa?.score).toBeGreaterThanOrEqual(85);
      expect(result.project.status).toBe("OS_PUBLISH_READY");
      expect(result.project.agent_log.length).toBeGreaterThan(3);
      expect(result.os_publish).not.toBeNull();
      expect(result.os_publish?.dry_run).toBe(true);
      expect(result.os_publish?.deliverables.length).toBeGreaterThan(0);
    });
  }

  it("incomplete landing brief blocks intake", () => {
    const result = simulateAutonomousJob({
      sku: "NELVYON-LANDING",
      brief: loadBrief("landing-incomplete.json"),
    });

    expect(result.project.qa?.passed).toBe(false);
    expect(result.escalated).toBe(true);
    expect(result.os_publish).toBeNull();
  });

  it("OsPublishPayload never omits dry_run flag", () => {
    const result = simulateAutonomousJob({
      sku: "NELVYON-SEO",
      brief: loadBrief("seo-alonso-vega.json"),
    });
    const payload = buildOsPublishPayload(result.project);
    expect(payload.dry_run).toBe(true);
    expect(payload.note).toContain("NOT sent to OS");
    expect(payload.os_actions.some((a) => a.entity === "deliverable")).toBe(true);
  });

  it("simulation_mode is phase-b-offline", () => {
    const result = simulateAutonomousJob({
      sku: "NELVYON-CHATBOT",
      brief: loadBrief("chatbot-sonrisa.json"),
    });
    expect(result.project.simulation_mode).toBe("phase-b-offline");
  });
});
