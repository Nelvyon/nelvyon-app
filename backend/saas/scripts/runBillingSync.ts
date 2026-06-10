/**
 * Commit 3.5 — Backfill subscriptions → saas_tenants.plan (ops CLI)
 *
 *   pnpm saas:billing-backfill -- --dry-run
 *   pnpm saas:billing-backfill -- --workspace-id=1 --dry-run --verbose
 *   pnpm saas:billing-backfill -- --apply --i-understand-apply
 *
 * Prod override: SAAS_BILLING_BACKFILL_ALLOW_PROD=true
 */
import { DbClient } from "../../db/DbClient";
import { getSaasBillingSyncService } from "../SaasBillingSyncService";
import {
  assertApplyAllowed,
  assertDatabaseAllowed,
  BillingBackfillCliError,
  buildCliReport,
  loadEnvFiles,
  maskDatabaseUrl,
  parseMode,
  parseOutputPath,
  parseVerbose,
  parseWorkspaceId,
  writeCliReport,
} from "./billingBackfillCli";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  loadEnvFiles();

  const databaseUrl = process.env.DATABASE_URL ?? "";
  const mode = parseMode(argv);
  const workspaceId = parseWorkspaceId(argv);
  const outputPath = parseOutputPath(argv);
  const verbose = parseVerbose(argv);

  assertDatabaseAllowed(databaseUrl);
  assertApplyAllowed(mode, argv);

  const svc = getSaasBillingSyncService();
  const batch = await svc.runBackfill(
    mode,
    workspaceId !== undefined ? { workspaceId } : undefined,
  );

  const scope = workspaceId !== undefined ? { workspaceId } : ("global" as const);
  const report = buildCliReport(batch, {
    scope,
    databaseUrlMasked: maskDatabaseUrl(databaseUrl),
    verbose,
  });

  console.log(JSON.stringify(report, null, 2));
  if (outputPath) {
    writeCliReport(report, outputPath);
  }

  await DbClient.getInstance().end();
  if (report.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  if (err instanceof BillingBackfillCliError) {
    console.error(`[billing-backfill] ${err.message}`);
  } else {
    console.error("[billing-backfill] FATAL:", err);
  }
  process.exit(1);
});
