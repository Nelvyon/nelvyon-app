export type { SeguridadCodigoInput, SeguridadCodigoOutput } from "./shared";
export {
  seguridadCodigoLlmOpts as seguridadCodigoLlmOpts,
  parseSeguridadCodigoLlmJson,
  buildSeguridadCodigoPrompt,
  runSeguridadCodigoAgentCore,
  getDefaultSeguridadCodigoLlm,
} from "./shared";
export * from "./SeguridadCodigoOfuscacionAgent";
export * from "./SeguridadCodigoAntiDebugAgent";
export * from "./SeguridadCodigoLicenciasAgent";
export * from "./SeguridadCodigoApiAgent";
export * from "./SeguridadCodigoBotsAgent";
export * from "./SeguridadCodigoAuditAgent";
export * from "./SeguridadCodigoHardeningAgent";
export * from "./SeguridadCodigoAnalyticsAgent";

import { resetSeguridadCodigoAnalyticsAgentForTests } from "./SeguridadCodigoAnalyticsAgent";
import { resetSeguridadCodigoAntiDebugAgentForTests } from "./SeguridadCodigoAntiDebugAgent";
import { resetSeguridadCodigoApiAgentForTests } from "./SeguridadCodigoApiAgent";
import { resetSeguridadCodigoAuditAgentForTests } from "./SeguridadCodigoAuditAgent";
import { resetSeguridadCodigoBotsAgentForTests } from "./SeguridadCodigoBotsAgent";
import { resetSeguridadCodigoHardeningAgentForTests } from "./SeguridadCodigoHardeningAgent";
import { resetSeguridadCodigoLicenciasAgentForTests } from "./SeguridadCodigoLicenciasAgent";
import { resetSeguridadCodigoOfuscacionAgentForTests } from "./SeguridadCodigoOfuscacionAgent";

export function resetAllSeguridadCodigoAgentsForTests(): void {
  resetSeguridadCodigoOfuscacionAgentForTests();
  resetSeguridadCodigoAntiDebugAgentForTests();
  resetSeguridadCodigoLicenciasAgentForTests();
  resetSeguridadCodigoApiAgentForTests();
  resetSeguridadCodigoBotsAgentForTests();
  resetSeguridadCodigoAuditAgentForTests();
  resetSeguridadCodigoHardeningAgentForTests();
  resetSeguridadCodigoAnalyticsAgentForTests();
}
