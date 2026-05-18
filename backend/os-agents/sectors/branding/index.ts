export type { BrandingInput, BrandingOutput } from "./shared";
export {
  brandingLlmOpts as brandingLlmOpts,
  parseBrandingLlmJson,
  buildBrandingPrompt,
  runBrandingAgentCore,
  getDefaultBrandingLlm,
} from "./shared";
export * from "./BrandingIdentidadAgent";
export * from "./BrandingLogoAgent";
export * from "./BrandingGuiaAgent";
export * from "./BrandingNamingAgent";
export * from "./BrandingPosicionamientoAgent";
export * from "./BrandingArquitecturaAgent";
export * from "./BrandingVoiceAgent";
export * from "./BrandingAuditAgent";

import { resetBrandingArquitecturaAgentForTests } from "./BrandingArquitecturaAgent";
import { resetBrandingAuditAgentForTests } from "./BrandingAuditAgent";
import { resetBrandingGuiaAgentForTests } from "./BrandingGuiaAgent";
import { resetBrandingIdentidadAgentForTests } from "./BrandingIdentidadAgent";
import { resetBrandingLogoAgentForTests } from "./BrandingLogoAgent";
import { resetBrandingNamingAgentForTests } from "./BrandingNamingAgent";
import { resetBrandingPosicionamientoAgentForTests } from "./BrandingPosicionamientoAgent";
import { resetBrandingVoiceAgentForTests } from "./BrandingVoiceAgent";

export function resetAllBrandingAgentsForTests(): void {
  resetBrandingIdentidadAgentForTests();
  resetBrandingLogoAgentForTests();
  resetBrandingGuiaAgentForTests();
  resetBrandingNamingAgentForTests();
  resetBrandingPosicionamientoAgentForTests();
  resetBrandingArquitecturaAgentForTests();
  resetBrandingVoiceAgentForTests();
  resetBrandingAuditAgentForTests();
}
