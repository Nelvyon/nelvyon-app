export type { ProteccionIpInput, ProteccionIpOutput } from "./shared";
export {
  proteccionIpLlmOpts as proteccionIpLlmOpts,
  parseProteccionIpLlmJson,
  buildProteccionIpPrompt,
  runProteccionIpAgentCore,
  getDefaultProteccionIpLlm,
} from "./shared";
export * from "./ProteccionIpMarcasAgent";
export * from "./ProteccionIpPatentesAgent";
export * from "./ProteccionIpCopyrightAgent";
export * from "./ProteccionIpOfuscacionAgent";
export * from "./ProteccionIpSecretsAgent";
export * from "./ProteccionIpMonitoreoAgent";
export * from "./ProteccionIpLitigacionAgent";
export * from "./ProteccionIpAnalyticsAgent";

import { resetProteccionIpAnalyticsAgentForTests } from "./ProteccionIpAnalyticsAgent";
import { resetProteccionIpCopyrightAgentForTests } from "./ProteccionIpCopyrightAgent";
import { resetProteccionIpLitigacionAgentForTests } from "./ProteccionIpLitigacionAgent";
import { resetProteccionIpMarcasAgentForTests } from "./ProteccionIpMarcasAgent";
import { resetProteccionIpMonitoreoAgentForTests } from "./ProteccionIpMonitoreoAgent";
import { resetProteccionIpOfuscacionAgentForTests } from "./ProteccionIpOfuscacionAgent";
import { resetProteccionIpPatentesAgentForTests } from "./ProteccionIpPatentesAgent";
import { resetProteccionIpSecretsAgentForTests } from "./ProteccionIpSecretsAgent";

export function resetAllProteccionIpAgentsForTests(): void {
  resetProteccionIpMarcasAgentForTests();
  resetProteccionIpPatentesAgentForTests();
  resetProteccionIpCopyrightAgentForTests();
  resetProteccionIpOfuscacionAgentForTests();
  resetProteccionIpSecretsAgentForTests();
  resetProteccionIpMonitoreoAgentForTests();
  resetProteccionIpLitigacionAgentForTests();
  resetProteccionIpAnalyticsAgentForTests();
}
