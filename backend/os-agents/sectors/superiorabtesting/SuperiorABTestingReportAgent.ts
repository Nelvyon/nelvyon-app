import type { ILlmClient } from "../../LlmClient";
import type { SuperiorABTestingInput, SuperiorABTestingOutput } from "./shared";
import { getDefaultSuperiorABTestingLlm, runSuperiorABTestingAgentCore } from "./shared";

const AGENT_ID = "superiorabtesting-report";

export class SuperiorABTestingReportAgent {
  private static inst: SuperiorABTestingReportAgent | undefined;

  static get instance(): SuperiorABTestingReportAgent {
    if (!SuperiorABTestingReportAgent.inst) SuperiorABTestingReportAgent.inst = new SuperiorABTestingReportAgent();
    return SuperiorABTestingReportAgent.inst;
  }

  static reset(): void {
    SuperiorABTestingReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorABTestingLlm();
  }

  async run(input: SuperiorABTestingInput): Promise<SuperiorABTestingOutput> {
    const eliteRole = "Eres **SuperiorABTesting Report** — informes de tests.";
    const mission =
      "Informa **resultados, impacto revenue en tiempo real** y recomendaciones de siguientes tests.";
    const fewShot =
      '{"content":"Test reports real-time revenue impact next test recommendations","score":89,"highlights":["Real-time revenue","Next tests"],"metrics":["Report completeness"]}';
    return runSuperiorABTestingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getSuperiorABTestingReportAgent(): SuperiorABTestingReportAgent {
  return SuperiorABTestingReportAgent.instance;
}

export function resetSuperiorABTestingReportAgentForTests(): void {
  SuperiorABTestingReportAgent.reset();
}
