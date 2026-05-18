import type { ILlmClient } from "../../LlmClient";
import type { UiuxInput, UiuxOutput } from "./shared";
import { getDefaultUiuxLlm, runUiuxAgentCore } from "./shared";

const AGENT_ID = "uiux-auditoria";

let inst: UiuxAuditoriaAgent | null = null;

export class UiuxAuditoriaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): UiuxAuditoriaAgent {
    if (!inst) inst = new UiuxAuditoriaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultUiuxLlm();
  }

  async run(input: UiuxInput): Promise<UiuxOutput> {
    const eliteRole = "Eres **UI/UX Auditoría** — heatmaps y fricción.";
    const mission =
      "Elabora **auditoría UX automática** (mapas de calor conceptuales, flujos críticos, puntos de fricción priorizados, quick wins vs deep fixes).";
    const fewShot =
      '{"result":"Informe P0-P2 con hipótesis","score":87,"recommendations":["Checkout funnel","Form field order","Cognitive load"]}';
    return runUiuxAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getUiuxAuditoriaAgent(): UiuxAuditoriaAgent {
  return UiuxAuditoriaAgent.instance();
}

export function resetUiuxAuditoriaAgentForTests(): void {
  inst = null;
}
