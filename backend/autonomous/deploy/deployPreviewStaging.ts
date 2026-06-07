/** Phase I — deploy preview.html to Supabase staging bucket (isolated, gated) */

import { createSupabaseStagingClient, defaultPreviewBucket, type SupabaseStagingClient } from "./supabaseStagingClient";
import type { DeployMetadata, DeployPreviewResult } from "./types";
import { AUTONOMOUS_PREVIEWS_BUCKET } from "./types";

export const DEFAULT_SIGNED_URL_TTL_SEC = 3600;

export function isAutonomousStagingDeployEnabled(): boolean {
  const raw = (process.env.AUTONOMOUS_STAGING_DEPLOY ?? "false").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes" || raw === "on";
}

export function resolveDeployDryRun(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  return true;
}

export function buildStorageKey(pilotId: string, deployId?: string): string {
  const slug = pilotId.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 48);
  const id = deployId ?? `${Date.now()}`;
  return `restaurant-landing/${slug}/${id}/index.html`;
}

export interface DeployPreviewInput {
  html: string;
  pilot_id: string;
  source_html_path?: string;
  dry_run?: boolean;
  bucket?: string;
  signed_url_ttl_sec?: number;
  client?: SupabaseStagingClient;
}

export async function deployPreviewStaging(input: DeployPreviewInput): Promise<DeployPreviewResult> {
  const dryRun = resolveDeployDryRun(input.dry_run);
  const deployEnabled = isAutonomousStagingDeployEnabled();
  const bucket = input.bucket ?? defaultPreviewBucket();
  const client = input.client ?? createSupabaseStagingClient();
  const storageKey = buildStorageKey(input.pilot_id);
  const deployedAt = new Date().toISOString();
  const ttl = input.signed_url_ttl_sec ?? DEFAULT_SIGNED_URL_TTL_SEC;

  const baseMetadata: DeployMetadata = {
    phase: "I",
    bucket,
    storage_key: storageKey,
    staging_url: null,
    preview_url: null,
    expires_at: null,
    dry_run: dryRun,
    deploy_enabled: deployEnabled,
    written: false,
    mock: client.isMock(),
    pilot_id: input.pilot_id,
    source_html: input.source_html_path ?? "preview.html",
    deployed_at: deployedAt,
    visibility: "internal",
    client_visible: false,
  };

  if (dryRun) {
    return {
      dry_run: true,
      deploy_enabled: deployEnabled,
      written: false,
      mock: client.isMock(),
      bucket,
      storage_key: storageKey,
      staging_url: null,
      preview_url: null,
      expires_at: null,
      message: "Dry-run: no storage upload performed",
      metadata: baseMetadata,
    };
  }

  if (!deployEnabled) {
    throw new Error(
      "AUTONOMOUS_STAGING_DEPLOY is disabled — set AUTONOMOUS_STAGING_DEPLOY=true for controlled staging uploads",
    );
  }

  const bytes = new TextEncoder().encode(input.html);
  const upload = await client.uploadBytes(
    bucket,
    storageKey,
    bytes,
    "text/html; charset=utf-8",
  );

  if (upload.ok === false) {
    throw new Error(`Supabase upload failed: ${upload.error ?? "unknown error"}`);
  }

  const signed = await client.createSignedUrl(bucket, storageKey, ttl);
  const expiresAt =
    signed.signed_url && !client.isMock()
      ? new Date(Date.now() + ttl * 1000).toISOString()
      : signed.signed_url
        ? new Date(Date.now() + ttl * 1000).toISOString()
        : null;

  const stagingUrl = signed.signed_url ?? upload.public_url ?? null;

  const metadata: DeployMetadata = {
    ...baseMetadata,
    dry_run: false,
    written: true,
    mock: upload.mock,
    staging_url: stagingUrl,
    preview_url: stagingUrl,
    expires_at: expiresAt,
  };

  return {
    dry_run: false,
    deploy_enabled: true,
    written: true,
    mock: upload.mock,
    bucket,
    storage_key: storageKey,
    staging_url: stagingUrl,
    preview_url: stagingUrl,
    expires_at: expiresAt,
    message: upload.mock
      ? `Mock staging deploy → ${stagingUrl}`
      : `Uploaded to ${bucket}/${storageKey}`,
    metadata,
  };
}

export { AUTONOMOUS_PREVIEWS_BUCKET };
