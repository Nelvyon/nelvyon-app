export type { PricingDinamicoInput, PricingDinamicoOutput } from "./shared";
export {
  pricingDinamicoLlmOpts as pricingDinamicoLlmOpts,
  parsePricingDinamicoLlmJson,
  buildPricingDinamicoPrompt,
  runPricingDinamicoAgentCore,
  getDefaultPricingDinamicoLlm,
} from "./shared";
export * from "./PricingDinamicoOptimizadorAgent";
export * from "./PricingDinamicoElasticidadAgent";
export * from "./PricingDinamicoPersonalizadoAgent";
export * from "./PricingDinamicoAbTestAgent";
export * from "./PricingDinamicoCompetenciaAgent";
export * from "./PricingDinamicoDescuentosAgent";
export * from "./PricingDinamicoBundlesAgent";
export * from "./PricingDinamicoMargenAgent";

import { resetPricingDinamicoAbTestAgentForTests } from "./PricingDinamicoAbTestAgent";
import { resetPricingDinamicoBundlesAgentForTests } from "./PricingDinamicoBundlesAgent";
import { resetPricingDinamicoCompetenciaAgentForTests } from "./PricingDinamicoCompetenciaAgent";
import { resetPricingDinamicoDescuentosAgentForTests } from "./PricingDinamicoDescuentosAgent";
import { resetPricingDinamicoElasticidadAgentForTests } from "./PricingDinamicoElasticidadAgent";
import { resetPricingDinamicoMargenAgentForTests } from "./PricingDinamicoMargenAgent";
import { resetPricingDinamicoOptimizadorAgentForTests } from "./PricingDinamicoOptimizadorAgent";
import { resetPricingDinamicoPersonalizadoAgentForTests } from "./PricingDinamicoPersonalizadoAgent";

export function resetAllPricingDinamicoAgentsForTests(): void {
  resetPricingDinamicoOptimizadorAgentForTests();
  resetPricingDinamicoElasticidadAgentForTests();
  resetPricingDinamicoPersonalizadoAgentForTests();
  resetPricingDinamicoAbTestAgentForTests();
  resetPricingDinamicoCompetenciaAgentForTests();
  resetPricingDinamicoDescuentosAgentForTests();
  resetPricingDinamicoBundlesAgentForTests();
  resetPricingDinamicoMargenAgentForTests();
}
