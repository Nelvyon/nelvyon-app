/** Phase I — staging CDN deploy types (isolated, no portal publish) */

export const AUTONOMOUS_PREVIEWS_BUCKET = "autonomous-previews";

export interface SupabaseUploadResult {
  mock: boolean;
  ok?: boolean;
  bucket: string;
  path: string;
  public_url?: string;
  error?: string;
}

export interface SupabaseSignedUrlResult {
  mock: boolean;
  ok?: boolean;
  bucket: string;
  path: string;
  signed_url?: string;
  error?: string;
}

export interface DeployMetadata {
  phase: "I";
  bucket: string;
  storage_key: string;
  staging_url: string | null;
  preview_url: string | null;
  expires_at: string | null;
  dry_run: boolean;
  deploy_enabled: boolean;
  written: boolean;
  mock: boolean;
  pilot_id: string;
  source_html: string;
  deployed_at: string;
  visibility: "internal";
  client_visible: false;
}

export interface DeployPreviewResult {
  dry_run: boolean;
  deploy_enabled: boolean;
  written: boolean;
  mock: boolean;
  bucket: string;
  storage_key: string;
  staging_url: string | null;
  preview_url: string | null;
  expires_at: string | null;
  message: string;
  metadata: DeployMetadata;
}
