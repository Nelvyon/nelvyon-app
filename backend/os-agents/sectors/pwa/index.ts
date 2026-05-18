export type { PwaInput, PwaOutput } from "./shared";
export {
  pwaLlmOpts as pwaLlmOpts,
  parsePwaLlmJson,
  runPwaAgentCore,
  getDefaultPwaLlm,
} from "./shared";
export * from "./PwaAuditoriaAgent";
export * from "./PwaServiceWorkerAgent";
export * from "./PwaOfflineAgent";
export * from "./PwaNotificacionesAgent";
export * from "./PwaInstalacionAgent";
export * from "./PwaPerformanceAgent";
export * from "./PwaSincronizacionAgent";
export * from "./PwaResponsiveAgent";

import { resetPwaAuditoriaAgentForTests } from "./PwaAuditoriaAgent";
import { resetPwaInstalacionAgentForTests } from "./PwaInstalacionAgent";
import { resetPwaNotificacionesAgentForTests } from "./PwaNotificacionesAgent";
import { resetPwaOfflineAgentForTests } from "./PwaOfflineAgent";
import { resetPwaPerformanceAgentForTests } from "./PwaPerformanceAgent";
import { resetPwaResponsiveAgentForTests } from "./PwaResponsiveAgent";
import { resetPwaServiceWorkerAgentForTests } from "./PwaServiceWorkerAgent";
import { resetPwaSincronizacionAgentForTests } from "./PwaSincronizacionAgent";

export function resetAllPwaAgentsForTests(): void {
  resetPwaAuditoriaAgentForTests();
  resetPwaServiceWorkerAgentForTests();
  resetPwaOfflineAgentForTests();
  resetPwaNotificacionesAgentForTests();
  resetPwaInstalacionAgentForTests();
  resetPwaPerformanceAgentForTests();
  resetPwaSincronizacionAgentForTests();
  resetPwaResponsiveAgentForTests();
}
