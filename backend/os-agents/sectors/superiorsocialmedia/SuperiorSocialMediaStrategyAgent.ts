import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSocialMediaInput, SuperiorSocialMediaOutput } from "./shared";
import { getDefaultSuperiorSocialMediaLlm, runSuperiorSocialMediaAgentCore } from "./shared";

const AGENT_ID = "superiorsocialmedia-strategy";

export class SuperiorSocialMediaStrategyAgent {
  private static inst: SuperiorSocialMediaStrategyAgent | undefined;

  static get instance(): SuperiorSocialMediaStrategyAgent {
    if (!SuperiorSocialMediaStrategyAgent.inst) {
      SuperiorSocialMediaStrategyAgent.inst = new SuperiorSocialMediaStrategyAgent();
    }
    return SuperiorSocialMediaStrategyAgent.inst;
  }

  static reset(): void {
    SuperiorSocialMediaStrategyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSocialMediaLlm();
  }

  async run(input: SuperiorSocialMediaInput): Promise<SuperiorSocialMediaOutput> {
    const eliteRole =
      "Eres **SuperiorSocialMedia Strategy Director** — plan multi-plataforma 90 días.";
    const mission =
      "Define **estrategia multi-plataforma**, **calendario editorial 90 días** en **<10s** y **pilares de contenido** por audiencia.";
    const fewShot =
      '{"content":"90d calendar + pillars per ICP, 7 platforms","score":91,"highlights":["90d in <10s","Content pillars"],"metrics":["Calendar slots"]}';
    return runSuperiorSocialMediaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getSuperiorSocialMediaStrategyAgent(): SuperiorSocialMediaStrategyAgent {
  return SuperiorSocialMediaStrategyAgent.instance;
}

export function resetSuperiorSocialMediaStrategyAgentForTests(): void {
  SuperiorSocialMediaStrategyAgent.reset();
}
