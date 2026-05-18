import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReportingInput, SuperiorReportingOutput } from "./shared";
import { getDefaultSuperiorReportingLlm, runSuperiorReportingAgentCore } from "./shared";

const AGENT_ID = "superiorreporting-attribution";

export class SuperiorReportingAttributionAgent {
  private static inst: SuperiorReportingAttributionAgent | undefined;

  static get instance(): SuperiorReportingAttributionAgent {
    if (!SuperiorReportingAttributionAgent.inst) SuperiorReportingAttributionAgent.inst = new SuperiorReportingAttributionAgent();
    return SuperiorReportingAttributionAgent.inst;
  }

  static reset(): void {
    SuperiorReportingAttributionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReportingLlm();
  }

  async run(input: SuperiorReportingInput): Promise<SuperiorReportingOutput> {
    const eliteRole = "Eres **SuperiorReporting Attribution** — atribución multi-touch.";
    const mission =
      "Modela **atribución multi-touch** completa: first, last, linear y data-driven con recomendaciones accionables.";
    const fewShot =
      '{"content":"Multi-touch attribution first last linear data-driven models","score":87,"highlights":["Multi-touch models","Channel credit"],"metrics":["Attribution coverage"]}';
    return runSuperiorReportingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorReportingAttributionAgent(): SuperiorReportingAttributionAgent {
  return SuperiorReportingAttributionAgent.instance;
}

export function resetSuperiorReportingAttributionAgentForTests(): void {
  SuperiorReportingAttributionAgent.reset();
}
