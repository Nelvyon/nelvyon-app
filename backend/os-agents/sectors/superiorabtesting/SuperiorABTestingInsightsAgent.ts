import type { ILlmClient } from "../../LlmClient";
import type { SuperiorABTestingInput, SuperiorABTestingOutput } from "./shared";
import { getDefaultSuperiorABTestingLlm, runSuperiorABTestingAgentCore } from "./shared";

const AGENT_ID = "superiorabtesting-insights";

export class SuperiorABTestingInsightsAgent {
  private static inst: SuperiorABTestingInsightsAgent | undefined;

  static get instance(): SuperiorABTestingInsightsAgent {
    if (!SuperiorABTestingInsightsAgent.inst) SuperiorABTestingInsightsAgent.inst = new SuperiorABTestingInsightsAgent();
    return SuperiorABTestingInsightsAgent.inst;
  }

  static reset(): void {
    SuperiorABTestingInsightsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorABTestingLlm();
  }

  async run(input: SuperiorABTestingInput): Promise<SuperiorABTestingOutput> {
    const eliteRole = "Eres **SuperiorABTesting Insights** — aprendizajes acumulados.";
    const mission =
      "Extrae **insights accionables** por test y alimenta **knowledge base** de experimentos.";
    const fewShot =
      '{"content":"Actionable test insights accumulated learnings experiment knowledge base","score":88,"highlights":["Actionable insights","Experiment KB"],"metrics":["Insight quality"]}';
    return runSuperiorABTestingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getSuperiorABTestingInsightsAgent(): SuperiorABTestingInsightsAgent {
  return SuperiorABTestingInsightsAgent.instance;
}

export function resetSuperiorABTestingInsightsAgentForTests(): void {
  SuperiorABTestingInsightsAgent.reset();
}
