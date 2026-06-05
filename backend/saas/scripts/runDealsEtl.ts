/**
 * Fase 3A — ETL legacy deals → saas_deals (global, solo ops/CLI)
 * Uso:
 *   pnpm saas:deals-etl -- --dry-run
 *   pnpm saas:deals-etl -- --apply --i-understand-apply
 */
import { DbClient } from "../../db/DbClient";
import { getSaasDealsEtlService, type DealsEtlMode } from "../SaasDealsEtlService";

function parseMode(argv: string[]): DealsEtlMode {
  if (argv.includes("--apply")) return "apply";
  return "dry-run";
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "apply" && !process.argv.includes("--i-understand-apply")) {
    console.error(
      "Para apply añade --i-understand-apply (no borra legacy, solo INSERT en saas_deals)",
    );
    process.exit(1);
  }
  const svc = getSaasDealsEtlService();
  const report = await svc.run(mode);
  console.log(JSON.stringify(report, null, 2));
  await DbClient.getInstance().end();
  if (report.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("[deals-etl] FATAL:", err);
  process.exit(1);
});
