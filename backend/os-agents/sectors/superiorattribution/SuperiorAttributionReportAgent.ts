import type { ILlmClient } from "../../LlmClient";
import type { SuperiorAttributionInput, SuperiorAttributionOutput } from "./shared";
import { getDefaultSuperiorAttributionLlm, runSuperiorAttributionAgentCore } from "./shared";

const AGENT_ID = "superiorattribution-report";

export class SuperiorAttributionReportAgent {
  private static inst: SuperiorAttributionReportAgent | undefined;

  static get instance(): SuperiorAttributionReportAgent {
    if (!SuperiorAttributionReportAgent.inst) SuperiorAttributionReportAgent.inst = new SuperiorAttributionReportAgent();
    return SuperiorAttributionReportAgent.inst;
  }

  static reset(): void {
    SuperiorAttributionReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorAttributionLlm();
  }

  async run(input: SuperiorAttributionInput): Promise<SuperiorAttributionOutput> {
    const eliteRole = "Eres **SuperiorAttribution Report** — informes ejecutivos.";
    const mission =
      "Genera **informes de atribución ejecutivos** con **recomendaciones de inversión por canal**.";
    const fewShot =
      '{"content":"Executive attribution reports channel investment recommendations","score":88,"highlights":["Executive report","Channel investment"],"metrics":["Report quality"]}';
    return runSuperiorAttributionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getSuperiorAttributionReportAgent(): SuperiorAttributionReportAgent {
  return SuperiorAttributionReportAgent.instance;
}

export function resetSuperiorAttributionReportAgentForTests(): void {
  SuperiorAttributionReportAgent.reset();
}
