import { DbClient } from "../../db/DbClient";
import type { OsOrchestrator } from "../OsOrchestrator";
import { osOrchestrator } from "../OsOrchestrator";
import { logger } from "./logger";

export type ActiveServiceRow = {
  tenant_id: string;
  service_id: string;
  client_id: string;
};

export type OsCronMaintenanceDeps = {
  db?: Pick<DbClient, "query">;
  orchestrator?: Pick<OsOrchestrator, "enqueueAndDispatch">;
};

export class OsCronMaintenance {
  constructor(private readonly deps: OsCronMaintenanceDeps = {}) {}

  async runMonthlyMaintenance(): Promise<void> {
    logger.info("[CRON] Iniciando mantenimiento mensual");

    const db = this.deps.db ?? DbClient.getInstance();
    const orchestrator = this.deps.orchestrator ?? osOrchestrator;

    const activeServices = await db.query<ActiveServiceRow>(
      `SELECT tenant_id, service_id, client_id
       FROM os_service_contracts
       WHERE status = 'active'
       ORDER BY tenant_id`,
    );

    logger.info(`[CRON] ${activeServices.length} servicios activos encontrados`);

    let errorCount = 0;
    for (const svc of activeServices) {
      try {
        await orchestrator.enqueueAndDispatch({
          clientId: svc.client_id,
          serviceId: svc.service_id,
          payload: {
            brief: "Revisión mensual automática OS — mantenimiento de servicio activo",
            clientName: "NELVYON OS",
            tenantId: svc.tenant_id,
            trigger: "cron_monthly_maintenance",
            priority: "low",
          },
        });
        logger.info(`[CRON] Job encolado: ${svc.service_id} tenant=${svc.tenant_id}`);
      } catch (err) {
        errorCount += 1;
        logger.error(`[CRON] Error encolando ${svc.service_id}:`, err);
      }
    }

    await db.query(
      `INSERT INTO os_cron_logs (type, run_at, services_processed, error_count)
       VALUES ('monthly_maintenance', NOW(), $1, $2)`,
      [activeServices.length, errorCount],
    );

    logger.info("[CRON] Mantenimiento mensual completado");
  }
}

export const osCronMaintenance = new OsCronMaintenance();
