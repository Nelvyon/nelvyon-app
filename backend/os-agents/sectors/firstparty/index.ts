export type { FirstPartyInput, FirstPartyOutput } from "./shared";
export {
  firstpartyLlmOpts as firstpartyLlmOpts,
  parseFirstPartyLlmJson,
  runFirstPartyAgentCore,
  getDefaultFirstPartyLlm,
} from "./shared";
export * from "./FirstPartyAuditoriaAgent";
export * from "./FirstPartyCaptacionAgent";
export * from "./FirstPartyCdpAgent";
export * from "./FirstPartySegmentacionAgent";
export * from "./FirstPartyActivacionAgent";
export * from "./FirstPartyPrivacidadAgent";
export * from "./FirstPartyEnriquecimientoAgent";
export * from "./FirstPartyPrediccionAgent";

import { resetFirstPartyActivacionAgentForTests } from "./FirstPartyActivacionAgent";
import { resetFirstPartyAuditoriaAgentForTests } from "./FirstPartyAuditoriaAgent";
import { resetFirstPartyCaptacionAgentForTests } from "./FirstPartyCaptacionAgent";
import { resetFirstPartyCdpAgentForTests } from "./FirstPartyCdpAgent";
import { resetFirstPartyEnriquecimientoAgentForTests } from "./FirstPartyEnriquecimientoAgent";
import { resetFirstPartyPrediccionAgentForTests } from "./FirstPartyPrediccionAgent";
import { resetFirstPartyPrivacidadAgentForTests } from "./FirstPartyPrivacidadAgent";
import { resetFirstPartySegmentacionAgentForTests } from "./FirstPartySegmentacionAgent";

export function resetAllFirstPartyAgentsForTests(): void {
  resetFirstPartyAuditoriaAgentForTests();
  resetFirstPartyCaptacionAgentForTests();
  resetFirstPartyCdpAgentForTests();
  resetFirstPartySegmentacionAgentForTests();
  resetFirstPartyActivacionAgentForTests();
  resetFirstPartyPrivacidadAgentForTests();
  resetFirstPartyEnriquecimientoAgentForTests();
  resetFirstPartyPrediccionAgentForTests();
}
