import type { ILlmClient } from "../../LlmClient";
import type { SuperiorABTestingInput, SuperiorABTestingOutput } from "./shared";
import { getDefaultSuperiorABTestingLlm, runSuperiorABTestingAgentCore } from "./shared";

const AGENT_ID = "superiorabtesting-stat";

export class SuperiorABTestingStatAgent {
  private static inst: SuperiorABTestingStatAgent | undefined;

  static get instance(): SuperiorABTestingStatAgent {
    if (!SuperiorABTestingStatAgent.inst) SuperiorABTestingStatAgent.inst = new SuperiorABTestingStatAgent();
    return SuperiorABTestingStatAgent.inst;
  }

  static reset(): void {
    SuperiorABTestingStatAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorABTestingLlm();
  }

  async run(input: SuperiorABTestingInput): Promise<SuperiorABTestingOutput> {
    const eliteRole = "Eres **SuperiorABTesting Stat** — análisis estadístico.";
    const mission =
      "Analiza **significancia, p-value, intervalos de confianza**; bayesiano vs frecuentista; mínimo **95%**.";
    const fewShot =
      '{"content":"Significance p-value confidence intervals bayesian frequentist 95% minimum","score":92,"highlights":["95% significance","Auto winner"],"metrics":["Statistical power"]}';
    return runSuperiorABTestingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorABTestingStatAgent(): SuperiorABTestingStatAgent {
  return SuperiorABTestingStatAgent.instance;
}

export function resetSuperiorABTestingStatAgentForTests(): void {
  SuperiorABTestingStatAgent.reset();
}
