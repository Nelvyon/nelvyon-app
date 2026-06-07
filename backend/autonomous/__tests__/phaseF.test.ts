import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildPilotPublishBodyForDryRun,
  loadRestaurantPilotBrief,
  runRestaurantLandingPilot,
} from "../pilots/restaurantLandingPilot";
import { renderLandingPreviewHtml } from "../preview/renderLandingPreviewHtml";
import { runPlaywrightOfflineQa } from "../qa/playwrightOfflineQa";
import { applySectorContext } from "../sectors/applySectorContext";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "..", "fixtures", "restaurant-landing-pilot.json");

describe("Phase F — restaurant landing pilot fixture", () => {
  it("fixture is valid and includes required pilot fields", () => {
    const brief = JSON.parse(readFileSync(FIXTURE, "utf-8")) as Record<string, unknown>;
    expect(brief.sector).toBe("restaurant");
    expect(brief.company_name).toBeTruthy();
    expect(brief.primary_cta).toBe("Reservar mesa");
    expect(brief.target_audience).toBeDefined();
    expect(brief.location).toBeDefined();
    expect(brief.offer).toBeDefined();
    expect(brief.local_competition).toBeInstanceOf(Array);
    expect(brief.photos_placeholder).toBeInstanceOf(Array);
    expect(brief.legal_constraints).toBeDefined();
    expect(brief.brand_tone).toBeDefined();
  });

  it("applies restaurant sector context", () => {
    const brief = loadRestaurantPilotBrief();
    const { sector, profile } = applySectorContext(brief, "restaurant");
    expect(sector).toBe("restaurant");
    expect(profile?.autonomy_score).toBe(90);
    expect(profile?.regulated).toBe(false);
  });
});

describe("Phase F — preview HTML + Playwright offline QA", () => {
  it("renders preview with hero and CTA markers", () => {
    const brief = loadRestaurantPilotBrief();
    const html = renderLandingPreviewHtml({
      brief,
      copy: {
        hero: { headline: "La Brasa del Raval", subheadline: "Cocina de brasas", cta_label: "Reservar mesa" },
        meta: { title: "La Brasa del Raval — Reserva", description: "Cocina mediterránea en el Raval Barcelona" },
      },
      design: { tokens: { primary: "#B45309", secondary: "#1C1917" } },
    });
    expect(html).toContain('data-section="hero"');
    expect(html).toContain("data-cta");
    expect(html).toContain("<title>");
  });

  it("playwright offline QA passes on clean preview", async () => {
    const brief = loadRestaurantPilotBrief();
    const html = renderLandingPreviewHtml({
      brief,
      copy: {
        hero: { headline: "Test", subheadline: "Sub", cta_label: "Reservar" },
        meta: { title: "La Brasa del Raval — Reserva tu mesa", description: "Cocina de brasas mediterránea en Barcelona Raval con reserva directa." },
      },
      design: {},
    });
    const qa = await runPlaywrightOfflineQa(html);
    expect(qa.passed).toBe(true);
    expect(qa.checks.some((c) => c.id === "PW-HERO-01" && c.passed)).toBe(true);
    expect(qa.checks.some((c) => c.id === "PW-CTA-01" && c.passed)).toBe(true);
  });
});

describe("Phase F — full pilot pipeline", () => {
  it("runs Phase C with restaurant sector, QA >= 85, dry-run payload", async () => {
    const result = await runRestaurantLandingPilot({
      output_dir: join(__dirname, "..", "output", "phase-f-test"),
    });

    expect(result.sector).toBe("restaurant");
    expect(result.qa_score).toBeGreaterThanOrEqual(85);
    expect(result.qa_passed).toBe(true);
    expect(result.escalated).toBe(false);
    expect(result.os_publish).not.toBeNull();
    expect(result.os_publish?.dry_run).toBe(true);
    expect(result.os_publish?.sector).toBe("restaurant");
    expect(result.artifacts_keys).toContain("plan");
    expect(result.artifacts_keys).toContain("copy");
    expect(result.artifacts_keys).toContain("build");
    expect(result.artifacts_keys).toContain("preview_html");
    expect(result.playwright_qa.passed).toBe(true);
  });

  it("builds Phase D dry-run publish body ready for OS staging", async () => {
    const result = await runRestaurantLandingPilot({
      output_dir: join(__dirname, "..", "output", "phase-f-test"),
    });
    const body = buildPilotPublishBodyForDryRun(result, {
      client_id: "00000000-0000-0000-0000-000000000099",
      project_id: "00000000-0000-0000-0000-000000000098",
      workspace_id: 1,
    });
    expect(body.dry_run).toBe(true);
    expect(body.sector).toBe("restaurant");
    expect(body.qa_score).toBeGreaterThanOrEqual(85);
    expect((body.deliverables as unknown[]).length).toBeGreaterThan(0);
    expect((body.os_refs as { project_id: string }).project_id).toBeTruthy();
  });
});
