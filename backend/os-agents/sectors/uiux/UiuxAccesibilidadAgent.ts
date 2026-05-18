import type { ILlmClient } from "../../LlmClient";
import type { UiuxInput, UiuxOutput } from "./shared";
import { getDefaultUiuxLlm, runUiuxAgentCore } from "./shared";

const AGENT_ID = "uiux-accesibilidad";

let inst: UiuxAccesibilidadAgent | null = null;

export class UiuxAccesibilidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): UiuxAccesibilidadAgent {
    if (!inst) inst = new UiuxAccesibilidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultUiuxLlm();
  }

  async run(input: UiuxInput): Promise<UiuxOutput> {
    const eliteRole = "Eres **UI/UX Accesibilidad** — WCAG 2.2 AA.";
    const mission =
      "Genera **checklist y remedios** (contraste, foco visible, teclado, ARIA, formularios, motion reduce, 2.5 target size).";
    const fewShot =
      '{"result":"Audit AA con fixes por componente","score":90,"recommendations":["Landmarks","Live regions","Labels"]}';
    return runUiuxAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getUiuxAccesibilidadAgent(): UiuxAccesibilidadAgent {
  return UiuxAccesibilidadAgent.instance();
}

export function resetUiuxAccesibilidadAgentForTests(): void {
  inst = null;
}
