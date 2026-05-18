import type { ILlmClient } from "../../LlmClient";
import type { SuperiorABTestingInput, SuperiorABTestingOutput } from "./shared";
import { getDefaultSuperiorABTestingLlm, runSuperiorABTestingAgentCore } from "./shared";

const AGENT_ID = "superiorabtesting-rollout";

export class SuperiorABTestingRolloutAgent {
  private static inst: SuperiorABTestingRolloutAgent | undefined;

  static get instance(): SuperiorABTestingRolloutAgent {
    if (!SuperiorABTestingRolloutAgent.inst) SuperiorABTestingRolloutAgent.inst = new SuperiorABTestingRolloutAgent();
    return SuperiorABTestingRolloutAgent.inst;
  }

  static reset(): void {
    SuperiorABTestingRolloutAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorABTestingLlm();
  }

  async run(input: SuperiorABTestingInput): Promise<SuperiorABTestingOutput> {
    const eliteRole = "Eres **SuperiorABTesting Rollout** — rollout automático.";
    const mission =
      "Despliega **ganador automáticamente** con feature flags y **rollback instantáneo**; rollout **<2 min**.";
    const fewShot =
      '{"content":"Auto winner rollout feature flags instant rollback <2m","score":91,"highlights":["<2m rollout","Instant rollback"],"metrics":["Rollout latency"]}';
    return runSuperiorABTestingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorABTestingRolloutAgent(): SuperiorABTestingRolloutAgent {
  return SuperiorABTestingRolloutAgent.instance;
}

export function resetSuperiorABTestingRolloutAgentForTests(): void {
  SuperiorABTestingRolloutAgent.reset();
}
