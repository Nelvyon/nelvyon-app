/**
 * Fase 1B — valida migraciones 310/311 y estado del bridge workspace_id.
 * Uso: pnpm saas:validate-bridge (desde apps/web)
 */
import { DbClient } from "../../db/DbClient";
import { getSaasTenantBridgeValidationService } from "../SaasTenantBridgeValidation";

async function main(): Promise<void> {
  const svc = getSaasTenantBridgeValidationService();
  const report = await svc.run();
  console.log(JSON.stringify(report, null, 2));
  await DbClient.getInstance().end();
  if (!report.ok) {
    console.error("[validate-bridge] FAILED — revisar tenants sin workspace o migración 310");
    process.exit(1);
  }
  console.log("[validate-bridge] OK");
}

main().catch((err: unknown) => {
  console.error("[validate-bridge] FATAL:", err);
  process.exit(1);
});
