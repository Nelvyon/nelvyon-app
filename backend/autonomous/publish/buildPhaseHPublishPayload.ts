/** Phase H — OsPublishPayload with preview staging metadata (dry_run default) */

import type { AutonomousProject, OsPublishPayload } from "../types";
import { buildOsPublishPayload } from "./osPublishPayload";
import type { PreviewMetadata } from "../wrappers/landingBuilderStaging";
import type { StagingQaResult } from "../qa/playwrightStagingQa";

export function buildPhaseHPublishPayload(
  project: AutonomousProject,
  preview: {
    preview_metadata: PreviewMetadata;
    qa_report: Record<string, unknown>;
    assets_manifest: Record<string, unknown>;
  },
  options?: { dry_run?: boolean },
): OsPublishPayload {
  const base = buildOsPublishPayload(project, { dry_run: options?.dry_run ?? true });
  const build = project.artifacts.build as { staging_url?: string; preview_file?: string };

  return {
    ...base,
    sku: "landing",
    dry_run: options?.dry_run ?? true,
    deliverables: [
      {
        type: "url",
        label: "Landing preview staging",
        value: build?.staging_url ?? "mock://autonomous/phase-h/preview.html",
        visibility: "internal",
      },
      {
        type: "file",
        label: "Preview HTML",
        value: `mock://autonomous/phase-h/${build?.preview_file ?? "preview.html"}`,
        visibility: "internal",
      },
      {
        type: "file",
        label: "QA Report",
        value: "mock://autonomous/phase-h/qaReport.json",
        visibility: "internal",
      },
      {
        type: "json",
        label: "Assets manifest",
        value: "mock://autonomous/phase-h/assetsManifest.json",
        visibility: "internal",
      },
    ],
    artifacts: {
      ...project.artifacts,
      preview_metadata: preview.preview_metadata,
      qa_report: preview.qa_report,
      assets_manifest: preview.assets_manifest,
    },
    note: `${base.note} | Phase H landing preview staging (dry_run=${options?.dry_run ?? true})`,
  };
}

export function buildQaReport(input: {
  offline_score: number;
  staging_qa: StagingQaResult;
  passed: boolean;
}): Record<string, unknown> {
  return {
    phase: "H",
    offline_score: input.offline_score,
    playwright_score: input.staging_qa.score,
    playwright_passed: input.staging_qa.passed,
    playwright_mode: input.staging_qa.mode,
    blocking_failures: input.staging_qa.blocking_failures,
    checks: input.staging_qa.checks,
    passed: input.passed,
    generated_at: new Date().toISOString(),
  };
}
