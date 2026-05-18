import type { ILlmClient } from "../../LlmClient";
import type { UiuxInput, UiuxOutput } from "./shared";
import { getDefaultUiuxLlm, runUiuxAgentCore } from "./shared";

const AGENT_ID = "uiux-ab-testing";

let inst: UiuxAbTestingAgent | null = null;

export class UiuxAbTestingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): UiuxAbTestingAgent {
    if (!inst) inst = new UiuxAbTestingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultUiuxLlm();
  }

  async run(input: UiuxInput): Promise<UiuxOutput> {
    const eliteRole = "Eres **UI/UX A/B testing** — experimentación de interfaces.";
    const mission =
      "Diseña **plan A/B** (hipótesis, variantes UI, métricas, duración sugerida, riesgos de novelty, guardrails de negocio).";
    const fewShot =
      '{"result":"Test CTA primario vs secundario","score":86,"recommendations":["SRM check","Bayes opcional","Rollback"]}';
    return runUiuxAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getUiuxAbTestingAgent(): UiuxAbTestingAgent {
  return UiuxAbTestingAgent.instance();
}

export function resetUiuxAbTestingAgentForTests(): void {
  inst = null;
}
