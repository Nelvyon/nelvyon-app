/** Phase I — OsPublishPayload with staging CDN preview_url (dry_run default) */

import type { AutonomousProject, OsPublishPayload } from "../types";
import type { DeployPreviewResult } from "../deploy/types";
import type { LiveQaComparison } from "../qa/playwrightLiveQa";
import { buildPhaseHPublishPayload } from "./buildPhaseHPublishPayload";

export function buildPhaseIPublishPayload(
  project: AutonomousProject,
  input: {
    deploy: DeployPreviewResult;
    live_qa: LiveQaComparison;
    preview_metadata: Record<string, unknown>;
    qa_report: Record<string, unknown>;
    assets_manifest: Record<string, unknown>;
  },
  options?: { dry_run?: boolean },
): OsPublishPayload {
  const dryRun = options?.dry_run ?? true;
  const stagingUrl = input.deploy.staging_url ?? input.deploy.preview_url;
  const previewUrl = input.deploy.preview_url ?? stagingUrl;

  const phaseH = buildPhaseHPublishPayload(
    {
      ...project,
      artifacts: {
        ...project.artifacts,
        build: {
          ...(project.artifacts.build as Record<string, unknown>),
          staging_url: stagingUrl ?? "mock://autonomous/phase-i/preview.html",
          preview_url: previewUrl,
          preview_file: "preview.html",
        },
      },
    },
    {
      preview_metadata: input.preview_metadata as import("../wrappers/landingBuilderStaging").PreviewMetadata,
      qa_report: {
        ...input.qa_report,
        live_qa: {
          live_skipped: input.live_qa.live_skipped,
          live_skip_reason: input.live_qa.live_skip_reason,
          comparison: input.live_qa.comparison,
          live_checks: input.live_qa.live?.checks ?? null,
        },
      },
      assets_manifest: input.assets_manifest,
    },
    { dry_run: dryRun },
  );

  return {
    ...phaseH,
    sku: "landing",
    dry_run: dryRun,
    deliverables: [
      {
        type: "url",
        label: "Landing staging CDN",
        value: stagingUrl ?? "mock://autonomous/phase-i/preview.html",
        visibility: "internal",
      },
      {
        type: "file",
        label: "Preview HTML (source)",
        value: "mock://autonomous/phase-i/preview.html",
        visibility: "internal",
      },
      {
        type: "file",
        label: "Deploy metadata",
        value: "mock://autonomous/phase-i/deploy_metadata.json",
        visibility: "internal",
      },
      {
        type: "file",
        label: "QA Report",
        value: "mock://autonomous/phase-i/qaReport.json",
        visibility: "internal",
      },
    ],
    artifacts: {
      ...phaseH.artifacts,
      deploy_metadata: input.deploy.metadata,
      preview_url: previewUrl,
      staging_url: stagingUrl,
      storage_key: input.deploy.storage_key,
      expires_at: input.deploy.expires_at,
    },
    note: `${phaseH.note} | Phase I staging CDN deploy (dry_run=${dryRun}, written=${input.deploy.written})`,
  };
}
