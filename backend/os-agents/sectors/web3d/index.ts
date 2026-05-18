export type { Web3dInput, Web3dOutput } from "./shared";
export {
  web3dLlmOpts as web3dLlmOpts,
  parseWeb3dLlmJson,
  buildWeb3dPrompt,
  runWeb3dAgentCore,
  getDefaultWeb3dLlm,
} from "./shared";
export * from "./Web3dEstructuraAgent";
export * from "./Web3dAnimacionAgent";
export * from "./Web3dConfigurador3dAgent";
export * from "./Web3dTourVirtualAgent";
export * from "./Web3dShadersAgent";
export * from "./Web3dRendimientoAgent";
export * from "./Web3dWebxrAgent";
export * from "./Web3dAssetsAgent";

import { resetWeb3dAnimacionAgentForTests } from "./Web3dAnimacionAgent";
import { resetWeb3dAssetsAgentForTests } from "./Web3dAssetsAgent";
import { resetWeb3dConfigurador3dAgentForTests } from "./Web3dConfigurador3dAgent";
import { resetWeb3dEstructuraAgentForTests } from "./Web3dEstructuraAgent";
import { resetWeb3dRendimientoAgentForTests } from "./Web3dRendimientoAgent";
import { resetWeb3dShadersAgentForTests } from "./Web3dShadersAgent";
import { resetWeb3dTourVirtualAgentForTests } from "./Web3dTourVirtualAgent";
import { resetWeb3dWebxrAgentForTests } from "./Web3dWebxrAgent";

export function resetAllWeb3dAgentsForTests(): void {
  resetWeb3dEstructuraAgentForTests();
  resetWeb3dAnimacionAgentForTests();
  resetWeb3dConfigurador3dAgentForTests();
  resetWeb3dTourVirtualAgentForTests();
  resetWeb3dShadersAgentForTests();
  resetWeb3dRendimientoAgentForTests();
  resetWeb3dWebxrAgentForTests();
  resetWeb3dAssetsAgentForTests();
}
