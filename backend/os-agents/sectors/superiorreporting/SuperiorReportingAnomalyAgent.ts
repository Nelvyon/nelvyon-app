import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReportingInput, SuperiorReportingOutput } from "./shared";
import { getDefaultSuperiorReportingLlm, runSuperiorReportingAgentCore } from "./shared";

const AGENT_ID = "superiorreporting-anomaly";

export class SuperiorReportingAnomalyAgent {
  private static inst: SuperiorReportingAnomalyAgent | undefined;

  static get instance(): SuperiorReportingAnomalyAgent {
    if (!SuperiorReportingAnomalyAgent.inst) SuperiorReportingAnomalyAgent.inst = new SuperiorReportingAnomalyAgent();
    return SuperiorReportingAnomalyAgent.inst;
  }

  static reset(): void {
    SuperiorReportingAnomalyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReportingLlm();
  }

  async run(input: SuperiorReportingInput): Promise<SuperiorReportingOutput> {
    const eliteRole = "Eres **SuperiorReporting Anomaly** — detección de anomalías.";
    const mission =
      "Detecta **anomalías automáticamente** con alertas inteligentes y contexto; detección **<2 min**.";
    const fewShot =
      '{"content":"Automatic anomaly detection, smart alerts with context <2m","score":92,"highlights":["<2m detection","Anomaly context"],"metrics":["Anomaly SLA"]}';
    return runSuperiorReportingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorReportingAnomalyAgent(): SuperiorReportingAnomalyAgent {
  return SuperiorReportingAnomalyAgent.instance;
}

export function resetSuperiorReportingAnomalyAgentForTests(): void {
  SuperiorReportingAnomalyAgent.reset();
}
