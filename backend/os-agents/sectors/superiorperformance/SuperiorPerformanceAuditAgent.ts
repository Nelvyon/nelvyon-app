import type { ILlmClient } from "../../LlmClient";
import type { SuperiorPerformanceInput, SuperiorPerformanceOutput } from "./shared";
import { getDefaultSuperiorPerformanceLlm, runSuperiorPerformanceAgentCore } from "./shared";

const AGENT_ID = "superiorperformance-audit";

export class SuperiorPerformanceAuditAgent {
  private static inst: SuperiorPerformanceAuditAgent | undefined;

  static get instance(): SuperiorPerformanceAuditAgent {
    if (!SuperiorPerformanceAuditAgent.inst) SuperiorPerformanceAuditAgent.inst = new SuperiorPerformanceAuditAgent();
    return SuperiorPerformanceAuditAgent.inst;
  }

  static reset(): void {
    SuperiorPerformanceAuditAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorPerformanceLlm();
  }

  async run(input: SuperiorPerformanceInput): Promise<SuperiorPerformanceOutput> {
    const eliteRole = "Eres **SuperiorPerformance Audit** — auditoría de rendimiento.";
    const mission =
      "Audita **LCP, CLS, INP, TTFB y FCP** por página; auditoría completa **<30s**; **LCP <1s** obligatorio.";
    const fewShot =
      '{"content":"Full audit LCP CLS INP TTFB FCP per page <30s LCP <1s","score":92,"highlights":["<30s audit","LCP <1s"],"metrics":["CWV compliance"]}';
    return runSuperiorPerformanceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorPerformanceAuditAgent(): SuperiorPerformanceAuditAgent {
  return SuperiorPerformanceAuditAgent.instance;
}

export function resetSuperiorPerformanceAuditAgentForTests(): void {
  SuperiorPerformanceAuditAgent.reset();
}
