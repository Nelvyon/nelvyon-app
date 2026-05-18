export type { IaPredictivaInput, IaPredictivaOutput } from "./shared";
export {
  iaPredictivaLlmOpts as iaPredictivaLlmOpts,
  parseIaPredictivaLlmJson,
  buildIaPredictivaPrompt,
  runIaPredictivaAgentCore,
  getDefaultIaPredictivaLlm,
} from "./shared";
export * from "./IaPredictivaChurnAgent";
export * from "./IaPredictivaForecastAgent";
export * from "./IaPredictivaAnomaliaAgent";
export * from "./IaPredictivaSegmentacionAgent";
export * from "./IaPredictivaRecomendacionAgent";
export * from "./IaPredictivaLtvAgent";
export * from "./IaPredictivaAlertasAgent";
export * from "./IaPredictivaInventarioAgent";

import { resetIaPredictivaAlertasAgentForTests } from "./IaPredictivaAlertasAgent";
import { resetIaPredictivaAnomaliaAgentForTests } from "./IaPredictivaAnomaliaAgent";
import { resetIaPredictivaChurnAgentForTests } from "./IaPredictivaChurnAgent";
import { resetIaPredictivaForecastAgentForTests } from "./IaPredictivaForecastAgent";
import { resetIaPredictivaInventarioAgentForTests } from "./IaPredictivaInventarioAgent";
import { resetIaPredictivaLtvAgentForTests } from "./IaPredictivaLtvAgent";
import { resetIaPredictivaRecomendacionAgentForTests } from "./IaPredictivaRecomendacionAgent";
import { resetIaPredictivaSegmentacionAgentForTests } from "./IaPredictivaSegmentacionAgent";

export function resetAllIaPredictivaAgentsForTests(): void {
  resetIaPredictivaChurnAgentForTests();
  resetIaPredictivaForecastAgentForTests();
  resetIaPredictivaAnomaliaAgentForTests();
  resetIaPredictivaSegmentacionAgentForTests();
  resetIaPredictivaRecomendacionAgentForTests();
  resetIaPredictivaLtvAgentForTests();
  resetIaPredictivaAlertasAgentForTests();
  resetIaPredictivaInventarioAgentForTests();
}
