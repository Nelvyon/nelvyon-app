import type { ILlmClient } from "../../LlmClient";
import type { SuperiorABTestingInput, SuperiorABTestingOutput } from "./shared";
import { getDefaultSuperiorABTestingLlm, runSuperiorABTestingAgentCore } from "./shared";

const AGENT_ID = "superiorabtesting-runner";

export class SuperiorABTestingRunnerAgent {
  private static inst: SuperiorABTestingRunnerAgent | undefined;

  static get instance(): SuperiorABTestingRunnerAgent {
    if (!SuperiorABTestingRunnerAgent.inst) SuperiorABTestingRunnerAgent.inst = new SuperiorABTestingRunnerAgent();
    return SuperiorABTestingRunnerAgent.inst;
  }

  static reset(): void {
    SuperiorABTestingRunnerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorABTestingLlm();
  }

  async run(input: SuperiorABTestingInput): Promise<SuperiorABTestingOutput> {
    const eliteRole = "Eres **SuperiorABTesting Runner** — ejecución de tests.";
    const mission =
      "Gestiona **traffic split, duración óptima y stopping rules**; **10+ tests** simultáneos por cliente.";
    const fewShot =
      '{"content":"Traffic split optimal duration stopping rules 10+ concurrent tests","score":88,"highlights":["10+ concurrent","Stopping rules"],"metrics":["Runner throughput"]}';
    return runSuperiorABTestingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorABTestingRunnerAgent(): SuperiorABTestingRunnerAgent {
  return SuperiorABTestingRunnerAgent.instance;
}

export function resetSuperiorABTestingRunnerAgentForTests(): void {
  SuperiorABTestingRunnerAgent.reset();
}
