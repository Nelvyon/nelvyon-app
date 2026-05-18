import cron from "node-cron";

import { osCronMaintenance } from "./OsCronMaintenance";
import { osHealthCheck } from "../healthcheck/OsHealthCheck";
import { logger } from "./logger";

export function startCronScheduler(): void {
  cron.schedule("0 3 1 * *", async () => {
    try {
      await osCronMaintenance.runMonthlyMaintenance();
    } catch (err) {
      logger.error("[CRON] Error en mantenimiento mensual:", err);
    }
  });

  cron.schedule("0 4 * * 1", async () => {
    try {
      await osHealthCheck.runWeeklyHealthCheck();
    } catch (err) {
      logger.error("[CRON] Error en health check semanal:", err);
    }
  });

  logger.info("[CRON] Scheduler iniciado — mensual día 1 03:00 UTC; health semanal lunes 04:00 UTC");
}
