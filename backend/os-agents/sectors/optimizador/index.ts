export type { OptimizadorInput, OptimizadorOutput } from "./shared";
export {
  optimizadorLlmOpts as optimizadorLlmOpts,
  parseOptimizadorLlmJson,
  buildOptimizadorPrompt,
  runOptimizadorAgentCore,
  getDefaultOptimizadorLlm,
} from "./shared";
export * from "./OptimizadorCampanasAgent";
export * from "./OptimizadorPresupuestoAgent";
export * from "./OptimizadorAnunciosAgent";
export * from "./OptimizadorCopyAgent";
export * from "./OptimizadorCanalesAgent";
export * from "./OptimizadorAbTestAgent";
export * from "./OptimizadorReportesAgent";
export * from "./OptimizadorAprendizajeAgent";

import { resetOptimizadorAbTestAgentForTests } from "./OptimizadorAbTestAgent";
import { resetOptimizadorAnunciosAgentForTests } from "./OptimizadorAnunciosAgent";
import { resetOptimizadorAprendizajeAgentForTests } from "./OptimizadorAprendizajeAgent";
import { resetOptimizadorCampanasAgentForTests } from "./OptimizadorCampanasAgent";
import { resetOptimizadorCanalesAgentForTests } from "./OptimizadorCanalesAgent";
import { resetOptimizadorCopyAgentForTests } from "./OptimizadorCopyAgent";
import { resetOptimizadorPresupuestoAgentForTests } from "./OptimizadorPresupuestoAgent";
import { resetOptimizadorReportesAgentForTests } from "./OptimizadorReportesAgent";

export function resetAllOptimizadorAgentsForTests(): void {
  resetOptimizadorCampanasAgentForTests();
  resetOptimizadorPresupuestoAgentForTests();
  resetOptimizadorAnunciosAgentForTests();
  resetOptimizadorCopyAgentForTests();
  resetOptimizadorCanalesAgentForTests();
  resetOptimizadorAbTestAgentForTests();
  resetOptimizadorReportesAgentForTests();
  resetOptimizadorAprendizajeAgentForTests();
}
