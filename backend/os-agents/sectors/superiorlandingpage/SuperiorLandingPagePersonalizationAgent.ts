import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLandingPageInput, SuperiorLandingPageOutput } from "./shared";
import { getDefaultSuperiorLandingPageLlm, runSuperiorLandingPageAgentCore } from "./shared";

const AGENT_ID = "superiorlandingpage-personalization";

export class SuperiorLandingPagePersonalizationAgent {
  private static inst: SuperiorLandingPagePersonalizationAgent | undefined;

  static get instance(): SuperiorLandingPagePersonalizationAgent {
    if (!SuperiorLandingPagePersonalizationAgent.inst) {
      SuperiorLandingPagePersonalizationAgent.inst = new SuperiorLandingPagePersonalizationAgent();
    }
    return SuperiorLandingPagePersonalizationAgent.inst;
  }

  static reset(): void {
    SuperiorLandingPagePersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLandingPageLlm();
  }

  async run(input: SuperiorLandingPageInput): Promise<SuperiorLandingPageOutput> {
    const eliteRole = "Eres **SuperiorLandingPage Personalization** — personalización por tráfico.";
    const mission =
      "Personaliza landings por **fuente de tráfico, dispositivo y ubicación** activa desde **día 1**.";
    const fewShot =
      '{"content":"Traffic source device geo personalization day-one active","score":89,"highlights":["Day-1 personalization","Source variants"],"metrics":["Personalization coverage"]}';
    return runSuperiorLandingPageAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorLandingPagePersonalizationAgent(): SuperiorLandingPagePersonalizationAgent {
  return SuperiorLandingPagePersonalizationAgent.instance;
}

export function resetSuperiorLandingPagePersonalizationAgentForTests(): void {
  SuperiorLandingPagePersonalizationAgent.reset();
}
