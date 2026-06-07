import { describe, expect, it } from "vitest";

import {
  isAutonomousProductionEnabled,
  PHASE_G_PILOT,
  preparePhaseGStagingPayload,
  resolvePhaseGDryRun,
} from "../publish/preparePhaseGStagingPayload";
import type { OsPublishPayload } from "../types";

const BASE_PAYLOAD: OsPublishPayload = {
  dry_run: true,
  sector: "restaurant",
  project_id: "pilot-phase-f-restaurant-landing",
  os_refs: {
    client_id: "os_client_pilot_rest",
    project_slug: "PILOT-RESTAURANT-LANDING-F",
    workspace_id: "ws_pilot_f",
  },
  deliverables: [
    { type: "url", label: "Landing staging/live", value: "https://example.com", visibility: "client" },
    { type: "file", label: "QA Report", value: "mock://artifacts/qa-report.pdf", visibility: "internal" },
  ],
  qa_score: 92,
  autonomous_job_id: "autonomous_job_pilot_rest_f",
  artifacts: { build: { staging_url: "https://example.com" } },
  handoff_email_draft: { subject: "Test", body_markdown: "Body" },
  os_actions: [{ entity: "deliverable", action: "create", status: "in_review" }],
  note: "Phase F pilot",
};

const STAGING_REFS = {
  client_id: "11111111-1111-1111-1111-111111111111",
  project_id: "22222222-2222-2222-2222-222222222222",
  workspace_id: 1,
};

describe("Phase G — preparePhaseGStagingPayload", () => {
  it("keeps dry_run=true when AUTONOMOUS_PRODUCTION is false", () => {
    const prev = process.env.AUTONOMOUS_PRODUCTION;
    process.env.AUTONOMOUS_PRODUCTION = "false";
    try {
      const prepared = preparePhaseGStagingPayload(BASE_PAYLOAD, STAGING_REFS);
      expect(prepared.dry_run).toBe(true);
      expect(resolvePhaseGDryRun()).toBe(true);
      expect(isAutonomousProductionEnabled()).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.AUTONOMOUS_PRODUCTION;
      else process.env.AUTONOMOUS_PRODUCTION = prev;
    }
  });

  it("sets dry_run=false only when AUTONOMOUS_PRODUCTION is true", () => {
    const prev = process.env.AUTONOMOUS_PRODUCTION;
    process.env.AUTONOMOUS_PRODUCTION = "true";
    try {
      const prepared = preparePhaseGStagingPayload(BASE_PAYLOAD, STAGING_REFS);
      expect(prepared.dry_run).toBe(false);
      expect(resolvePhaseGDryRun()).toBe(false);
      expect(isAutonomousProductionEnabled()).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.AUTONOMOUS_PRODUCTION;
      else process.env.AUTONOMOUS_PRODUCTION = prev;
    }
  });

  it("substitutes os_refs with staging UUIDs and sets Phase G metadata fields", () => {
    const prepared = preparePhaseGStagingPayload(BASE_PAYLOAD, STAGING_REFS, { dry_run: true });
    expect(prepared.os_refs.client_id).toBe(STAGING_REFS.client_id);
    expect(prepared.os_refs.project_id).toBe(STAGING_REFS.project_id);
    expect(prepared.os_refs.workspace_id).toBe("1");
    expect(prepared.os_refs.project_slug).toBe(PHASE_G_PILOT.project_slug);
    expect(prepared.sector).toBe("restaurant");
    expect(prepared.sku).toBe("landing");
    expect(prepared.qa_score).toBeGreaterThanOrEqual(85);
    expect(prepared.artifacts).toEqual(BASE_PAYLOAD.artifacts);
    expect(prepared.note).toContain("Phase G");
  });
});
