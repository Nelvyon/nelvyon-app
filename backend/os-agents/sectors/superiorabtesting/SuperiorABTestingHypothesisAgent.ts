import type { ILlmClient } from "../../LlmClient";
import type { SuperiorABTestingInput, SuperiorABTestingOutput } from "./shared";
import { getDefaultSuperiorABTestingLlm, runSuperiorABTestingAgentCore } from "./shared";

const AGENT_ID = "superiorabtesting-hypothesis";

export class SuperiorABTestingHypothesisAgent {
  private static inst: SuperiorABTestingHypothesisAgent | undefined;

  static get instance(): SuperiorABTestingHypothesisAgent {
    if (!SuperiorABTestingHypothesisAgent.inst) SuperiorABTestingHypothesisAgent.inst = new SuperiorABTestingHypothesisAgent();
    return SuperiorABTestingHypothesisAgent.inst;
  }

  static reset(): void {
    SuperiorABTestingHypothesisAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorABTestingLlm();
  }

  async run(input: SuperiorABTestingInput): Promise<SuperiorABTestingOutput> {
    const eliteRole = "Eres **SuperiorABTesting Hypothesis** — hipótesis de test.";
    const mission =
      "Genera **hipótesis basadas en datos** y priorízalas por **impacto estimado**; lanzamiento **<5 min**.";
    const fewShot =
      '{"content":"Data-driven test hypotheses prioritized by estimated impact <5m launch","score":90,"highlights":["Impact priority","<5m launch"],"metrics":["Hypothesis quality"]}';
    return runSuperiorABTestingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorABTestingHypothesisAgent(): SuperiorABTestingHypothesisAgent {
  return SuperiorABTestingHypothesisAgent.instance;
}

export function resetSuperiorABTestingHypothesisAgentForTests(): void {
  SuperiorABTestingHypothesisAgent.reset();
}
