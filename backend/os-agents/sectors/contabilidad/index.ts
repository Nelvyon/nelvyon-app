import { AuditoriaContableAgent } from "./AuditoriaContableAgent";
import { CierreContableAgent } from "./CierreContableAgent";
import { ContabilidadAnalyticsAgent } from "./ContabilidadAnalyticsAgent";
import { ContabilidadAutomaticaAgent } from "./ContabilidadAutomaticaAgent";
import { FacturacionAgent } from "./FacturacionAgent";
import { ImpuestosAgent } from "./ImpuestosAgent";
import { ReconciliacionAgent } from "./ReconciliacionAgent";
import { TesoreriaAgent } from "./TesoreriaAgent";

export type { ContabilidadInput, ContabilidadOutput } from "./shared";
export { parseContabilidadLlmJson, buildContabilidadPrompt, llmOpts as contabilidadLlmOpts } from "./shared";

export {
  ContabilidadAutomaticaAgent,
  getContabilidadAutomaticaAgent,
  resetContabilidadAutomaticaAgentForTests,
} from "./ContabilidadAutomaticaAgent";
export {
  ReconciliacionAgent,
  getReconciliacionAgent,
  resetReconciliacionAgentForTests,
} from "./ReconciliacionAgent";
export { ImpuestosAgent, getImpuestosAgent, resetImpuestosAgentForTests } from "./ImpuestosAgent";
export { FacturacionAgent, getFacturacionAgent, resetFacturacionAgentForTests } from "./FacturacionAgent";
export { TesoreriaAgent, getTesoreriaAgent, resetTesoreriaAgentForTests } from "./TesoreriaAgent";
export {
  CierreContableAgent,
  getCierreContableAgent,
  resetCierreContableAgentForTests,
} from "./CierreContableAgent";
export {
  AuditoriaContableAgent,
  getAuditoriaContableAgent,
  resetAuditoriaContableAgentForTests,
} from "./AuditoriaContableAgent";
export {
  ContabilidadAnalyticsAgent,
  getContabilidadAnalyticsAgent,
  resetContabilidadAnalyticsAgentForTests,
} from "./ContabilidadAnalyticsAgent";

export function resetAllContabilidadAgentsForTests(): void {
  ContabilidadAutomaticaAgent.reset();
  ReconciliacionAgent.reset();
  ImpuestosAgent.reset();
  FacturacionAgent.reset();
  TesoreriaAgent.reset();
  CierreContableAgent.reset();
  AuditoriaContableAgent.reset();
  ContabilidadAnalyticsAgent.reset();
}
