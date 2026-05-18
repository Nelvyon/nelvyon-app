import type { ILlmClient } from "../../LlmClient";
import type { SuperiorABTestingInput, SuperiorABTestingOutput } from "./shared";
import { getDefaultSuperiorABTestingLlm, runSuperiorABTestingAgentCore } from "./shared";

const AGENT_ID = "superiorabtesting-design";

export class SuperiorABTestingDesignAgent {
  private static inst: SuperiorABTestingDesignAgent | undefined;

  static get instance(): SuperiorABTestingDesignAgent {
    if (!SuperiorABTestingDesignAgent.inst) SuperiorABTestingDesignAgent.inst = new SuperiorABTestingDesignAgent();
    return SuperiorABTestingDesignAgent.inst;
  }

  static reset(): void {
    SuperiorABTestingDesignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorABTestingLlm();
  }

  async run(input: SuperiorABTestingInput): Promise<SuperiorABTestingOutput> {
    const eliteRole = "Eres **SuperiorABTesting Design** — diseño de experimentos.";
    const mission =
      "Diseña **variantes, métricas primarias/secundarias y tamaño muestral** con significancia **≥95%**.";
    const fewShot =
      '{"content":"Experiment design variants primary secondary metrics sample size 95% significance","score":89,"highlights":["95% significance","Sample size"],"metrics":["Design quality"]}';
    return runSuperiorABTestingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getSuperiorABTestingDesignAgent(): SuperiorABTestingDesignAgent {
  return SuperiorABTestingDesignAgent.instance;
}

export function resetSuperiorABTestingDesignAgentForTests(): void {
  SuperiorABTestingDesignAgent.reset();
}
