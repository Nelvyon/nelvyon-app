export type { AutoprocesosInput, AutoprocesosOutput } from "./shared";
export {
  autoprocesosLlmOpts as autoprocesosLlmOpts,
  parseAutoprocesosLlmJson,
  buildAutoprocesosPrompt,
  runAutoprocesosAgentCore,
  getDefaultAutoprocesosLlm,
} from "./shared";
export * from "./AutoprocesosWorkflowAgent";
export * from "./AutoprocesosReportesAgent";
export * from "./AutoprocesosIntegracionAgent";
export * from "./AutoprocesosAlertasAgent";
export * from "./AutoprocesosFacturasAgent";
export * from "./AutoprocesosContratosAgent";
export * from "./AutoprocesosEmailsAgent";
export * from "./AutoprocesosOptimizadorAgent";

import { resetAutoprocesosAlertasAgentForTests } from "./AutoprocesosAlertasAgent";
import { resetAutoprocesosContratosAgentForTests } from "./AutoprocesosContratosAgent";
import { resetAutoprocesosEmailsAgentForTests } from "./AutoprocesosEmailsAgent";
import { resetAutoprocesosFacturasAgentForTests } from "./AutoprocesosFacturasAgent";
import { resetAutoprocesosIntegracionAgentForTests } from "./AutoprocesosIntegracionAgent";
import { resetAutoprocesosOptimizadorAgentForTests } from "./AutoprocesosOptimizadorAgent";
import { resetAutoprocesosReportesAgentForTests } from "./AutoprocesosReportesAgent";
import { resetAutoprocesosWorkflowAgentForTests } from "./AutoprocesosWorkflowAgent";

export function resetAllAutoprocesosAgentsForTests(): void {
  resetAutoprocesosWorkflowAgentForTests();
  resetAutoprocesosReportesAgentForTests();
  resetAutoprocesosIntegracionAgentForTests();
  resetAutoprocesosAlertasAgentForTests();
  resetAutoprocesosFacturasAgentForTests();
  resetAutoprocesosContratosAgentForTests();
  resetAutoprocesosEmailsAgentForTests();
  resetAutoprocesosOptimizadorAgentForTests();
}
