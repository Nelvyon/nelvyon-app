export type { EnergiaInput, EnergiaOutput } from "./shared";
export {
  energiaLlmOpts as energiaLlmOpts,
  parseEnergiaLlmJson,
  buildEnergiaPrompt,
  runEnergiaAgentCore,
  getDefaultEnergiaLlm,
} from "./shared";
export * from "./EnergiaAdquisicionAgent";
export * from "./EnergiaRetencionAgent";
export * from "./EnergiaPreciosAgent";
export * from "./EnergiaSEOAgent";
export * from "./EnergiaSocialAgent";
export * from "./EnergiaEmailAgent";
export * from "./EnergiaReviewsAgent";
export * from "./EnergiaAnalyticsAgent";

import { resetEnergiaAdquisicionAgentForTests } from "./EnergiaAdquisicionAgent";
import { resetEnergiaAnalyticsAgentForTests } from "./EnergiaAnalyticsAgent";
import { resetEnergiaEmailAgentForTests } from "./EnergiaEmailAgent";
import { resetEnergiaPreciosAgentForTests } from "./EnergiaPreciosAgent";
import { resetEnergiaRetencionAgentForTests } from "./EnergiaRetencionAgent";
import { resetEnergiaReviewsAgentForTests } from "./EnergiaReviewsAgent";
import { resetEnergiaSEOAgentForTests } from "./EnergiaSEOAgent";
import { resetEnergiaSocialAgentForTests } from "./EnergiaSocialAgent";

export function resetAllEnergiaAgentsForTests(): void {
  resetEnergiaAdquisicionAgentForTests();
  resetEnergiaRetencionAgentForTests();
  resetEnergiaPreciosAgentForTests();
  resetEnergiaSEOAgentForTests();
  resetEnergiaSocialAgentForTests();
  resetEnergiaEmailAgentForTests();
  resetEnergiaReviewsAgentForTests();
  resetEnergiaAnalyticsAgentForTests();
}
