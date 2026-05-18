import type { ILlmClient } from "../../LlmClient";
import type { UiuxInput, UiuxOutput } from "./shared";
import { getDefaultUiuxLlm, runUiuxAgentCore } from "./shared";

const AGENT_ID = "uiux-sistema-diseno";

let inst: UiuxSistemaDisenioAgent | null = null;

export class UiuxSistemaDisenioAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): UiuxSistemaDisenioAgent {
    if (!inst) inst = new UiuxSistemaDisenioAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultUiuxLlm();
  }

  async run(input: UiuxInput): Promise<UiuxOutput> {
    const eliteRole = "Eres **UI/UX Sistema de diseño** — design tokens y foundations.";
    const mission =
      "Genera **sistema de diseño completo** (tokens semánticos, escala tipográfica, espaciado, color roles, motion, documentación de uso).";
    const fewShot =
      '{"result":"DS v1: primarios + neutros + semánticos","score":91,"recommendations":["Naming tokens","Contraste AA","Grid 12 cols"]}';
    return runUiuxAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getUiuxSistemaDisenioAgent(): UiuxSistemaDisenioAgent {
  return UiuxSistemaDisenioAgent.instance();
}

export function resetUiuxSistemaDisenioAgentForTests(): void {
  inst = null;
}
