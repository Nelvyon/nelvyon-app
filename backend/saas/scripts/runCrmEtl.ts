/**
 * Fase 1B — ETL legacy CRM → saas_contacts
 * Uso:
 *   pnpm saas:crm-etl -- --dry-run
 *   pnpm saas:crm-etl -- --apply
 */
import { DbClient } from "../../db/DbClient";
import { getSaasCrmEtlService, type EtlMode } from "../SaasCrmEtlService";

function parseMode(argv: string[]): EtlMode {
  if (argv.includes("--apply")) return "apply";
  return "dry-run";
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "apply" && !process.argv.includes("--i-understand-apply")) {
    console.error("Para apply añade --i-understand-apply (no borra legacy, solo INSERT en saas_contacts)");
    process.exit(1);
  }
  const svc = getSaasCrmEtlService();
  const report = await svc.run(mode);
  console.log(JSON.stringify(report, null, 2));
  await DbClient.getInstance().end();
  if (report.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("[crm-etl] FATAL:", err);
  process.exit(1);
});
