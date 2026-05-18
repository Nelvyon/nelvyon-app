import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync, zipSync } from "fflate";

import { osAssetStore } from "../assets/OsAssetStore";

export type OsArtifactKind =
  | "static-site"
  | "email-bundle"
  | "landing"
  | "funnel"
  | "ads-bundle"
  | "seo-report"
  | "social-bundle"
  | "content-bundle"
  | "sector-report"
  | "saas-dashboard-report";

export type ArtifactFileMap = Record<string, string>;

export interface PublishArtifactResult {
  assetId: string;
  downloadUrl: string;
  fileCount: number;
  sizeBytes: number;
}

const ARTIFACT_META: Record<
  OsArtifactKind,
  {
    envKey: string;
    defaultDir: string;
    downloadSegment: string;
    defaultZipName: string;
    /** When set, download URL uses `/api/saas/...` instead of `/api/os/...`. */
    apiScope?: "saas";
  }
> = {
  "static-site": {
    envKey: "OS_STATIC_SITES_DIR",
    defaultDir: "os-static-sites",
    downloadSegment: "static-site",
    defaultZipName: "nelvyon-web-premium-site.zip",
  },
  "email-bundle": {
    envKey: "OS_EMAIL_BUNDLES_DIR",
    defaultDir: "os-email-bundles",
    downloadSegment: "email-bundle",
    defaultZipName: "nelvyon-email-bundle.zip",
  },
  landing: {
    envKey: "OS_LANDING_ARTIFACTS_DIR",
    defaultDir: "os-landing-artifacts",
    downloadSegment: "landing",
    defaultZipName: "nelvyon-landing-page.zip",
  },
  funnel: {
    envKey: "OS_FUNNEL_ARTIFACTS_DIR",
    defaultDir: "os-funnel-artifacts",
    downloadSegment: "funnel",
    defaultZipName: "nelvyon-funnel-multipaso.zip",
  },
  "ads-bundle": {
    envKey: "OS_ADS_BUNDLES_DIR",
    defaultDir: "os-ads-bundles",
    downloadSegment: "ads-bundle",
    defaultZipName: "nelvyon-ads-creatives.zip",
  },
  "seo-report": {
    envKey: "OS_SEO_REPORTS_DIR",
    defaultDir: "os-seo-reports",
    downloadSegment: "seo-report",
    defaultZipName: "nelvyon-seo-report.zip",
  },
  "social-bundle": {
    envKey: "OS_SOCIAL_BUNDLES_DIR",
    defaultDir: "os-social-bundles",
    downloadSegment: "social-bundle",
    defaultZipName: "nelvyon-social-bundle.zip",
  },
  "content-bundle": {
    envKey: "OS_CONTENT_BUNDLES_DIR",
    defaultDir: "os-content-bundles",
    downloadSegment: "content-bundle",
    defaultZipName: "nelvyon-content-bundle.zip",
  },
  "sector-report": {
    envKey: "OS_SECTOR_REPORTS_DIR",
    defaultDir: "os-sector-reports",
    downloadSegment: "sector-report",
    defaultZipName: "nelvyon-sector-report.zip",
  },
  "saas-dashboard-report": {
    envKey: "SAAS_DASHBOARD_REPORTS_DIR",
    defaultDir: "saas-dashboard-reports",
    downloadSegment: "reports",
    defaultZipName: "nelvyon-saas-dashboard-report.zip",
    apiScope: "saas",
  },
};

export function getArtifactStorageRoot(kind: OsArtifactKind): string {
  const meta = ARTIFACT_META[kind];
  const fromEnv = process.env[meta.envKey];
  if (fromEnv?.trim()) return fromEnv.trim();
  return path.join(process.cwd(), ".data", meta.defaultDir);
}

export function resolveArtifactZipPath(clientId: string, jobId: string, kind: OsArtifactKind): string {
  return path.join(getArtifactStorageRoot(kind), clientId, jobId, "bundle.zip");
}

export function buildArtifactDownloadUrl(kind: OsArtifactKind, jobId: string): string {
  const meta = ARTIFACT_META[kind];
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (meta.apiScope === "saas") {
    return `${base}/api/saas/reports/${jobId}/export`;
  }
  return `${base}/api/os/${meta.downloadSegment}/${jobId}`;
}

export function createArtifactZip(files: ArtifactFileMap): Uint8Array {
  const zipped: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(files)) {
    zipped[name] = new TextEncoder().encode(content);
  }
  return zipSync(zipped);
}

export function listZipEntryNames(zipBytes: Uint8Array): string[] {
  const unzipped = unzipSync(zipBytes);
  return Object.keys(unzipped)
    .filter((name) => name.length > 0 && !name.endsWith("/"))
    .sort();
}

export async function writeArtifactZipFile(
  kind: OsArtifactKind,
  clientId: string,
  jobId: string,
  zipBytes: Uint8Array,
): Promise<string> {
  const dir = path.join(getArtifactStorageRoot(kind), clientId, jobId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, "bundle.zip");
  await writeFile(filePath, Buffer.from(zipBytes));
  return filePath;
}

export async function publishArtifactZip(options: {
  kind: OsArtifactKind;
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: ArtifactFileMap;
  zipBytes?: Uint8Array;
  zipFileName?: string;
}): Promise<PublishArtifactResult> {
  const zipBytes = options.zipBytes ?? createArtifactZip(options.files);
  await writeArtifactZipFile(options.kind, options.clientId, options.jobId, zipBytes);
  const downloadUrl = buildArtifactDownloadUrl(options.kind, options.jobId);
  const zipFileName = options.zipFileName ?? ARTIFACT_META[options.kind].defaultZipName;

  const asset = await osAssetStore.saveAsset({
    clientId: options.clientId,
    tenantId: options.tenantId,
    jobId: options.jobId,
    serviceId: options.serviceId,
    type: "document",
    name: zipFileName,
    url: downloadUrl,
    sizeBytes: zipBytes.byteLength,
    mimeType: "application/zip",
  });

  return {
    assetId: asset.id,
    downloadUrl,
    fileCount: Object.keys(options.files).length,
    sizeBytes: zipBytes.byteLength,
  };
}

/** @deprecated Use resolveArtifactZipPath(clientId, jobId, "static-site") */
export function resolveStaticSiteZipPath(clientId: string, jobId: string): string {
  return resolveArtifactZipPath(clientId, jobId, "static-site");
}
