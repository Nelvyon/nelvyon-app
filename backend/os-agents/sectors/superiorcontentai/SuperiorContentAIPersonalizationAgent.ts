import type { ILlmClient } from "../../LlmClient";
import type { SuperiorContentAIInput, SuperiorContentAIOutput } from "./shared";
import { getDefaultSuperiorContentAILlm, runSuperiorContentAIAgentCore } from "./shared";

const AGENT_ID = "superiorcontentai-personalization";

export class SuperiorContentAIPersonalizationAgent {
  private static inst: SuperiorContentAIPersonalizationAgent | undefined;

  static get instance(): SuperiorContentAIPersonalizationAgent {
    if (!SuperiorContentAIPersonalizationAgent.inst) {
      SuperiorContentAIPersonalizationAgent.inst = new SuperiorContentAIPersonalizationAgent();
    }
    return SuperiorContentAIPersonalizationAgent.inst;
  }

  static reset(): void {
    SuperiorContentAIPersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorContentAILlm();
  }

  async run(input: SuperiorContentAIInput): Promise<SuperiorContentAIOutput> {
    const eliteRole = "Eres **SuperiorContentAI Personalization** — contenido por segmento.";
    const mission =
      "Personaliza contenido por **segmento de audiencia y fase del funnel** sin caer en genérico; **0% contenido genérico**.";
    const fewShot =
      '{"content":"Audience segment funnel-stage personalization zero generic copy","score":89,"highlights":["Funnel personalization","0% generic"],"metrics":["Segment coverage"]}';
    return runSuperiorContentAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorContentAIPersonalizationAgent(): SuperiorContentAIPersonalizationAgent {
  return SuperiorContentAIPersonalizationAgent.instance;
}

export function resetSuperiorContentAIPersonalizationAgentForTests(): void {
  SuperiorContentAIPersonalizationAgent.reset();
}
