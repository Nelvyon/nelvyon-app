export type { UiuxInput, UiuxOutput } from "./shared";
export {
  uiuxLlmOpts as uiuxLlmOpts,
  parseUiuxLlmJson,
  buildUiuxPrompt,
  runUiuxAgentCore,
  getDefaultUiuxLlm,
} from "./shared";
export * from "./UiuxSistemaDisenioAgent";
export * from "./UiuxWireframeAgent";
export * from "./UiuxComponentesAgent";
export * from "./UiuxAuditoriaAgent";
export * from "./UiuxAbTestingAgent";
export * from "./UiuxAccesibilidadAgent";
export * from "./UiuxDarkModeAgent";
export * from "./UiuxExportacionAgent";

import { resetUiuxAbTestingAgentForTests } from "./UiuxAbTestingAgent";
import { resetUiuxAccesibilidadAgentForTests } from "./UiuxAccesibilidadAgent";
import { resetUiuxAuditoriaAgentForTests } from "./UiuxAuditoriaAgent";
import { resetUiuxComponentesAgentForTests } from "./UiuxComponentesAgent";
import { resetUiuxDarkModeAgentForTests } from "./UiuxDarkModeAgent";
import { resetUiuxExportacionAgentForTests } from "./UiuxExportacionAgent";
import { resetUiuxSistemaDisenioAgentForTests } from "./UiuxSistemaDisenioAgent";
import { resetUiuxWireframeAgentForTests } from "./UiuxWireframeAgent";

export function resetAllUiuxAgentsForTests(): void {
  resetUiuxSistemaDisenioAgentForTests();
  resetUiuxWireframeAgentForTests();
  resetUiuxComponentesAgentForTests();
  resetUiuxAuditoriaAgentForTests();
  resetUiuxAbTestingAgentForTests();
  resetUiuxAccesibilidadAgentForTests();
  resetUiuxDarkModeAgentForTests();
  resetUiuxExportacionAgentForTests();
}
