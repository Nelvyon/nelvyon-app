import type { ILlmClient } from "../../LlmClient";
import type { UiuxInput, UiuxOutput } from "./shared";
import { getDefaultUiuxLlm, runUiuxAgentCore } from "./shared";

const AGENT_ID = "uiux-wireframe";

let inst: UiuxWireframeAgent | null = null;

export class UiuxWireframeAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): UiuxWireframeAgent {
    if (!inst) inst = new UiuxWireframeAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultUiuxLlm();
  }

  async run(input: UiuxInput): Promise<UiuxOutput> {
    const eliteRole = "Eres **UI/UX Wireframe** — IA desde brief textual.";
    const mission =
      "Produce **wireframes y prototipo lógico** (pantallas, componentes clave, estados, notas de interacción, criterios de done).";
    const fewShot =
      '{"result":"User journey + 5 pantallas low-fi","score":88,"recommendations":["Empty states","Error paths","Mobile first"]}';
    return runUiuxAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getUiuxWireframeAgent(): UiuxWireframeAgent {
  return UiuxWireframeAgent.instance();
}

export function resetUiuxWireframeAgentForTests(): void {
  inst = null;
}
