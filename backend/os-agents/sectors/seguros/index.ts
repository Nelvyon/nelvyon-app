export type { SegurosInput, SegurosOutput } from "./shared";
export {
  segurosLlmOpts as segurosLlmOpts,
  parseSegurosLlmJson,
  buildSegurosPrompt,
  runSegurosAgentCore,
  getDefaultSegurosLlm,
} from "./shared";
export * from "./SegurosLeadGenAgent";
export * from "./SegurosRetencionAgent";
export * from "./SegurosPreciosAgent";
export * from "./SegurosSEOAgent";
export * from "./SegurosSocialAgent";
export * from "./SegurosEmailAgent";
export * from "./SegurosReviewsAgent";
export * from "./SegurosAnalyticsAgent";

import { resetSegurosAnalyticsAgentForTests } from "./SegurosAnalyticsAgent";
import { resetSegurosEmailAgentForTests } from "./SegurosEmailAgent";
import { resetSegurosLeadGenAgentForTests } from "./SegurosLeadGenAgent";
import { resetSegurosPreciosAgentForTests } from "./SegurosPreciosAgent";
import { resetSegurosRetencionAgentForTests } from "./SegurosRetencionAgent";
import { resetSegurosReviewsAgentForTests } from "./SegurosReviewsAgent";
import { resetSegurosSEOAgentForTests } from "./SegurosSEOAgent";
import { resetSegurosSocialAgentForTests } from "./SegurosSocialAgent";

export function resetAllSegurosAgentsForTests(): void {
  resetSegurosLeadGenAgentForTests();
  resetSegurosRetencionAgentForTests();
  resetSegurosPreciosAgentForTests();
  resetSegurosSEOAgentForTests();
  resetSegurosSocialAgentForTests();
  resetSegurosEmailAgentForTests();
  resetSegurosReviewsAgentForTests();
  resetSegurosAnalyticsAgentForTests();
}
