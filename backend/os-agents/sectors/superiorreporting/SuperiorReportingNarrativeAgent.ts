import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReportingInput, SuperiorReportingOutput } from "./shared";
import { getDefaultSuperiorReportingLlm, runSuperiorReportingAgentCore } from "./shared";

const AGENT_ID = "superiorreporting-narrative";

export class SuperiorReportingNarrativeAgent {
  private static inst: SuperiorReportingNarrativeAgent | undefined;

  static get instance(): SuperiorReportingNarrativeAgent {
    if (!SuperiorReportingNarrativeAgent.inst) SuperiorReportingNarrativeAgent.inst = new SuperiorReportingNarrativeAgent();
    return SuperiorReportingNarrativeAgent.inst;
  }

  static reset(): void {
    SuperiorReportingNarrativeAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReportingLlm();
  }

  async run(input: SuperiorReportingInput): Promise<SuperiorReportingOutput> {
    const eliteRole = "Eres **SuperiorReporting Narrative** — narrativa IA sobre datos.";
    const mission =
      "Genera **narrativa IA** que explica qué pasó, por qué y qué hacer; generación **<5s** por informe.";
    const fewShot =
      '{"content":"AI narrative what happened why and next actions <5s","score":88,"highlights":["<5s narrative","Actionable story"],"metrics":["Narrative latency"]}';
    return runSuperiorReportingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getSuperiorReportingNarrativeAgent(): SuperiorReportingNarrativeAgent {
  return SuperiorReportingNarrativeAgent.instance;
}

export function resetSuperiorReportingNarrativeAgentForTests(): void {
  SuperiorReportingNarrativeAgent.reset();
}
