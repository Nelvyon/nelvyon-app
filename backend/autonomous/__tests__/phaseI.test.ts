import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  deployPreviewStaging,
  isAutonomousStagingDeployEnabled,
  resolveDeployDryRun,
} from "../deploy/deployPreviewStaging";
import type { SupabaseStagingClient } from "../deploy/supabaseStagingClient";
import { buildPhaseIPublishPayload } from "../publish/buildPhaseIPublishPayload";
import { isLiveQaUrl, runLiveQaComparison } from "../qa/playwrightLiveQa";
import { runRestaurantLandingPhaseI } from "../pilots/restaurantLandingPhaseI";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_HTML = `<!DOCTYPE html><html><head><title>La Brasa del Raval — Reserva</title><meta name="description" content="Cocina de brasas mediterránea en Barcelona Raval con reserva directa web." /><meta name="viewport" content="width=device-width" /></head><body><nav data-nav><a data-nav-link href="#">A</a><a data-nav-link href="#">B</a><a data-nav-link href="#">C</a></nav><section data-section="hero"><h1>La Brasa</h1><a data-cta href="#">Reservar</a></section><style>@media(min-width:1280px){.x{color:#fff;background:#B45309}}</style></body></html>`;

function mockClient(uploadSpy?: ReturnType<typeof vi.fn>): SupabaseStagingClient {
  const upload = uploadSpy ?? vi.fn().mockResolvedValue({
    mock: true,
    ok: true,
    bucket: "autonomous-previews",
    path: "test/index.html",
    public_url: "https://mock.supabase.local/autonomous-previews/test/index.html",
  });
  return {
    isMock: () => true,
    uploadBytes: upload,
    createSignedUrl: vi.fn().mockResolvedValue({
      mock: true,
      ok: true,
      bucket: "autonomous-previews",
      path: "test/index.html",
      signed_url: "https://mock.supabase.local/autonomous-previews/test/index.html?token=mock",
    }),
    publicUrl: (b, p) => `https://mock.supabase.local/${b}/${p}`,
  };
}

describe("Phase I — deployPreviewStaging", () => {
  it("dry-run does not upload", async () => {
    const uploadSpy = vi.fn();
    const result = await deployPreviewStaging({
      html: SAMPLE_HTML,
      pilot_id: "test-pilot",
      dry_run: true,
      client: mockClient(uploadSpy),
    });
    expect(result.written).toBe(false);
    expect(result.dry_run).toBe(true);
    expect(result.staging_url).toBeNull();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("blocks write without AUTONOMOUS_STAGING_DEPLOY flag", async () => {
    const prev = process.env.AUTONOMOUS_STAGING_DEPLOY;
    process.env.AUTONOMOUS_STAGING_DEPLOY = "false";
    try {
      await expect(
        deployPreviewStaging({
          html: SAMPLE_HTML,
          pilot_id: "test-pilot",
          dry_run: false,
          client: mockClient(),
        }),
      ).rejects.toThrow(/AUTONOMOUS_STAGING_DEPLOY/);
    } finally {
      if (prev === undefined) delete process.env.AUTONOMOUS_STAGING_DEPLOY;
      else process.env.AUTONOMOUS_STAGING_DEPLOY = prev;
    }
  });

  it("with flag mocked generates staging_url", async () => {
    const prev = process.env.AUTONOMOUS_STAGING_DEPLOY;
    process.env.AUTONOMOUS_STAGING_DEPLOY = "true";
    try {
      const result = await deployPreviewStaging({
        html: SAMPLE_HTML,
        pilot_id: "test-pilot",
        dry_run: false,
        client: mockClient(),
      });
      expect(result.written).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.staging_url).toMatch(/^https:\/\/mock\.supabase\.local\//);
      expect(result.metadata.client_visible).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.AUTONOMOUS_STAGING_DEPLOY;
      else process.env.AUTONOMOUS_STAGING_DEPLOY = prev;
    }
  });

  it("resolveDeployDryRun defaults to true", () => {
    expect(resolveDeployDryRun()).toBe(true);
    expect(isAutonomousStagingDeployEnabled()).toBe(false);
  });
});

describe("Phase I — live QA", () => {
  it("skips live QA when no URL", async () => {
    const cmp = await runLiveQaComparison(SAMPLE_HTML, null);
    expect(cmp.live_skipped).toBe(true);
    expect(cmp.live).toBeNull();
    expect(cmp.comparison.local_score).toBeGreaterThan(0);
  });

  it("isLiveQaUrl rejects mock URLs", () => {
    expect(isLiveQaUrl("mock://x")).toBe(false);
    expect(isLiveQaUrl("https://mock.supabase.local/x")).toBe(true);
  });
});

describe("Phase I — OsPublishPayload", () => {
  it("includes preview_url and dry_run by default", () => {
    const deploy = {
      dry_run: true,
      deploy_enabled: false,
      written: false,
      mock: true,
      bucket: "autonomous-previews",
      storage_key: "k",
      staging_url: "https://mock.supabase.local/autonomous-previews/k",
      preview_url: "https://mock.supabase.local/autonomous-previews/k",
      expires_at: null,
      message: "mock",
      metadata: {
        phase: "I" as const,
        bucket: "autonomous-previews",
        storage_key: "k",
        staging_url: "https://mock.supabase.local/autonomous-previews/k",
        preview_url: "https://mock.supabase.local/autonomous-previews/k",
        expires_at: null,
        dry_run: true,
        deploy_enabled: false,
        written: false,
        mock: true,
        pilot_id: "p",
        source_html: "preview.html",
        deployed_at: new Date().toISOString(),
        visibility: "internal" as const,
        client_visible: false as const,
      },
    };
    const payload = buildPhaseIPublishPayload(
      {
        project_id: "x",
        sku: "NELVYON-LANDING",
        tier: "professional",
        brief: { company_name: "Test" },
        os_refs: { client_id: "c", project_slug: "S", workspace_id: "1" },
        artifacts: { build: {} },
        agent_log: [],
        retry_count: 0,
        simulation_mode: "phase-i",
        status: "OS_PUBLISH_READY",
        qa: {
          score: 90,
          passed: true,
          threshold: 85,
          sku: "NELVYON-LANDING",
          dimensions: {},
          blocking_failures: [],
          warnings: [],
          failed_agents: [],
          retry_recommendation: null,
          evaluated_at: "",
          artifact_versions: {},
          checks: [],
        },
      },
      {
        deploy,
        live_qa: {
          local: { passed: true, checks: [], mode: "dom-parse", blocking_failures: [], score: 90 },
          live: null,
          live_skipped: true,
          comparison: {
            local_score: 90,
            live_score: null,
            delta: null,
            local_passed: true,
            live_passed: null,
            matched_check_ids: [],
          },
        },
        preview_metadata: { phase: "H" },
        qa_report: { phase: "I" },
        assets_manifest: {},
      },
    );

    expect(payload.dry_run).toBe(true);
    expect(payload.artifacts?.preview_url).toBeTruthy();
    expect(payload.artifacts?.staging_url).toBeTruthy();
    expect(payload.deliverables.every((d) => d.visibility === "internal")).toBe(true);
    expect(payload.note).toContain("Phase I");
  });
});

describe("Phase I — full pipeline", () => {
  it("runs end-to-end with deploy dry-run", async () => {
    const result = await runRestaurantLandingPhaseI({
      output_dir: join(__dirname, "..", "output", "phase-i-test"),
      deploy_dry_run: true,
    });
    expect(result.deploy.dry_run).toBe(true);
    expect(result.os_publish.dry_run).toBe(true);
    expect(result.live_qa.live_skipped).toBe(true);
    expect(result.os_publish.artifacts?.preview_metadata).toBeDefined();
  }, 60_000);
});
