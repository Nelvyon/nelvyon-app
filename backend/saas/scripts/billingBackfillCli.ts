/**
 * Commit 3.5 — CLI helpers for billing backfill (pure: no DbClient, no network).
 */
import fs from "fs";
import path from "path";

import type {
  SaasBillingSyncBatchReport,
  SaasBillingSyncMode,
  SaasBillingSyncSkipReason,
} from "../SaasBillingSyncService";

export const BILLING_BACKFILL_PHASE = "3.5-billing-backfill" as const;

export const SKIP_REASON_KEYS: readonly SaasBillingSyncSkipReason[] = [
  "NO_TENANT",
  "NO_SUBSCRIPTION",
  "STATUS_NOT_SYNCABLE",
  "PLAN_UNCHANGED",
  "VALIDATION",
] as const;

export type SaasBillingBackfillScope = "global" | { workspaceId: number };

export type SaasBillingBackfillCliReport = {
  phase: typeof BILLING_BACKFILL_PHASE;
  generatedAt: string;
  mode: SaasBillingSyncMode;
  scope: SaasBillingBackfillScope;
  databaseUrlMasked: string;
  summary: {
    scanned: number;
    synced: number;
    skipped: number;
    errors: number;
    bySkipReason: Record<SaasBillingSyncSkipReason, number>;
  };
  results?: SaasBillingSyncBatchReport["results"];
  errors: SaasBillingSyncBatchReport["errors"];
};

export class BillingBackfillCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingBackfillCliError";
  }
}

export function emptySkipReasonCounts(): Record<SaasBillingSyncSkipReason, number> {
  return {
    NO_TENANT: 0,
    NO_SUBSCRIPTION: 0,
    STATUS_NOT_SYNCABLE: 0,
    PLAN_UNCHANGED: 0,
    VALIDATION: 0,
  };
}

export function loadEnvFiles(): void {
  const repoRoot = path.resolve(__dirname, "../../..");
  const webRoot = path.join(repoRoot, "apps", "web");
  const files = [
    path.join(webRoot, ".env.production.local"),
    path.join(webRoot, ".env.local"),
    path.join(repoRoot, ".env.production"),
    path.join(repoRoot, ".env"),
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

export function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url.replace(/^postgresql\+asyncpg:/, "postgresql:"));
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

export function looksLikeProductionDb(url: string): boolean {
  const lower = url.toLowerCase();
  const prodHints = [
    "supabase.co",
    "railway.app",
    "neon.tech",
    "prod",
    "production",
    "lezzkqpkxcoxqqcgohof",
  ];
  return prodHints.some((h) => lower.includes(h));
}

export function assertDatabaseAllowed(databaseUrl: string): void {
  const allowProd = (process.env.SAAS_BILLING_BACKFILL_ALLOW_PROD ?? "").toLowerCase() === "true";
  if (!databaseUrl.trim()) {
    throw new BillingBackfillCliError("DATABASE_URL is not set");
  }
  if (!allowProd && looksLikeProductionDb(databaseUrl)) {
    throw new BillingBackfillCliError(
      "DATABASE_URL parece producción. Set SAAS_BILLING_BACKFILL_ALLOW_PROD=true para override.",
    );
  }
}

export function parseMode(argv: string[]): SaasBillingSyncMode {
  if (argv.includes("--apply")) return "apply";
  return "dry-run";
}

export function parseWorkspaceId(argv: string[]): number | undefined {
  const prefix = "--workspace-id=";
  const arg = argv.find((a) => a.startsWith(prefix));
  if (!arg) return undefined;
  const raw = arg.slice(prefix.length).trim();
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new BillingBackfillCliError(`--workspace-id inválido: ${raw}`);
  }
  return n;
}

export function parseOutputPath(argv: string[]): string | undefined {
  const prefix = "--output=";
  const arg = argv.find((a) => a.startsWith(prefix));
  if (!arg) return undefined;
  const out = arg.slice(prefix.length).trim();
  if (!out) {
    throw new BillingBackfillCliError("--output requiere una ruta de archivo");
  }
  return out;
}

export function parseVerbose(argv: string[]): boolean {
  return argv.includes("--verbose");
}

export function assertApplyAllowed(mode: SaasBillingSyncMode, argv: string[]): void {
  if (mode === "apply" && !argv.includes("--i-understand-apply")) {
    throw new BillingBackfillCliError(
      "Para --apply añade --i-understand-apply (solo UPDATE saas_tenants.plan)",
    );
  }
}

export function summarizeSkipReasons(
  results: SaasBillingSyncBatchReport["results"],
): Record<SaasBillingSyncSkipReason, number> {
  const counts = emptySkipReasonCounts();
  for (const r of results) {
    if (r.skipReason) {
      counts[r.skipReason] += 1;
    }
  }
  return counts;
}

export function buildCliReport(
  batch: SaasBillingSyncBatchReport,
  opts: {
    scope: SaasBillingBackfillScope;
    databaseUrlMasked: string;
    verbose: boolean;
    generatedAt?: string;
  },
): SaasBillingBackfillCliReport {
  const report: SaasBillingBackfillCliReport = {
    phase: BILLING_BACKFILL_PHASE,
    generatedAt: opts.generatedAt ?? new Date().toISOString(),
    mode: batch.mode,
    scope: opts.scope,
    databaseUrlMasked: opts.databaseUrlMasked,
    summary: {
      scanned: batch.scanned,
      synced: batch.synced,
      skipped: batch.skipped,
      errors: batch.errors.length,
      bySkipReason: summarizeSkipReasons(batch.results),
    },
    errors: batch.errors,
  };
  if (opts.verbose) {
    report.results = batch.results;
  }
  return report;
}

export function writeCliReport(report: SaasBillingBackfillCliReport, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (dir && dir !== ".") {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
}
