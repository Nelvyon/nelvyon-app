import type { ILlmClient } from "../../LlmClient";
import type { UiuxInput, UiuxOutput } from "./shared";
import { getDefaultUiuxLlm, runUiuxAgentCore } from "./shared";

const AGENT_ID = "uiux-componentes";

let inst: UiuxComponentesAgent | null = null;

export class UiuxComponentesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): UiuxComponentesAgent {
    if (!inst) inst = new UiuxComponentesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultUiuxLlm();
  }

  async run(input: UiuxInput): Promise<UiuxOutput> {
    const eliteRole = "Eres **UI/UX Componentes** — React + Tailwind product-ready.";
    const mission =
      "Define **biblioteca de componentes** (API props, variantes Tailwind, composición, accesibilidad base, ejemplos de uso).";
    const fewShot =
      '{"result":"Button+Input+Modal patterns","score":89,"recommendations":["cn() merge","Focus ring","Data-testid"]}';
    return runUiuxAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getUiuxComponentesAgent(): UiuxComponentesAgent {
  return UiuxComponentesAgent.instance();
}

export function resetUiuxComponentesAgentForTests(): void {
  inst = null;
}
