export type { MultimodalInput, MultimodalOutput } from "./shared";
export {
  multimodalLlmOpts as multimodalLlmOpts,
  parseMultimodalLlmJson,
  buildMultimodalPrompt,
  runMultimodalAgentCore,
  getDefaultMultimodalLlm,
} from "./shared";
export * from "./MultimodalTextoImagenAgent";
export * from "./MultimodalAudioAgent";
export * from "./MultimodalVideoAgent";
export * from "./MultimodalDocumentosAgent";
export * from "./MultimodalExtraccionAgent";
export * from "./MultimodalTraduccionAgent";
export * from "./MultimodalCreativasAgent";
export * from "./MultimodalSintesisAgent";

import { resetMultimodalAudioAgentForTests } from "./MultimodalAudioAgent";
import { resetMultimodalCreativasAgentForTests } from "./MultimodalCreativasAgent";
import { resetMultimodalDocumentosAgentForTests } from "./MultimodalDocumentosAgent";
import { resetMultimodalExtraccionAgentForTests } from "./MultimodalExtraccionAgent";
import { resetMultimodalSintesisAgentForTests } from "./MultimodalSintesisAgent";
import { resetMultimodalTextoImagenAgentForTests } from "./MultimodalTextoImagenAgent";
import { resetMultimodalTraduccionAgentForTests } from "./MultimodalTraduccionAgent";
import { resetMultimodalVideoAgentForTests } from "./MultimodalVideoAgent";

export function resetAllMultimodalAgentsForTests(): void {
  resetMultimodalTextoImagenAgentForTests();
  resetMultimodalAudioAgentForTests();
  resetMultimodalVideoAgentForTests();
  resetMultimodalDocumentosAgentForTests();
  resetMultimodalExtraccionAgentForTests();
  resetMultimodalTraduccionAgentForTests();
  resetMultimodalCreativasAgentForTests();
  resetMultimodalSintesisAgentForTests();
}
