import type { ILlmClient } from "../../LlmClient";
import type { SuperiorABTestingInput, SuperiorABTestingOutput } from "./shared";
import { getDefaultSuperiorABTestingLlm, runSuperiorABTestingAgentCore } from "./shared";

const AGENT_ID = "superiorabtesting-personalization";

export class SuperiorABTestingPersonalizationAgent {
  private static inst: SuperiorABTestingPersonalizationAgent | undefined;

  static get instance(): SuperiorABTestingPersonalizationAgent {
    if (!SuperiorABTestingPersonalizationAgent.inst) {
      SuperiorABTestingPersonalizationAgent.inst = new SuperiorABTestingPersonalizationAgent();
    }
    return SuperiorABTestingPersonalizationAgent.inst;
  }

  static reset(): void {
    SuperiorABTestingPersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorABTestingLlm();
  }

  async run(input: SuperiorABTestingInput): Promise<SuperiorABTestingOutput> {
    const eliteRole = "Eres **SuperiorABTesting Personalization** — tests por segmento.";
    const mission =
      "Ejecuta **tests de personalización por segmento**, multivariante y **bandit algorithms**.";
    const fewShot =
      '{"content":"Segment personalization multivariate bandit algorithms","score":87,"highlights":["Bandit tests","Segment variants"],"metrics":["Personalization lift"]}';
    return runSuperiorABTestingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getSuperiorABTestingPersonalizationAgent(): SuperiorABTestingPersonalizationAgent {
  return SuperiorABTestingPersonalizationAgent.instance;
}

export function resetSuperiorABTestingPersonalizationAgentForTests(): void {
  SuperiorABTestingPersonalizationAgent.reset();
}
