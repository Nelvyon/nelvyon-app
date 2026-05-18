import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCompetitiveInput, SuperiorCompetitiveOutput } from "./shared";
import { getDefaultSuperiorCompetitiveLlm, runSuperiorCompetitiveAgentCore } from "./shared";

const AGENT_ID = "superiorcompetitive-report";

export class SuperiorCompetitiveReportAgent {
  private static inst: SuperiorCompetitiveReportAgent | undefined;

  static get instance(): SuperiorCompetitiveReportAgent {
    if (!SuperiorCompetitiveReportAgent.inst) SuperiorCompetitiveReportAgent.inst = new SuperiorCompetitiveReportAgent();
    return SuperiorCompetitiveReportAgent.inst;
  }

  static reset(): void {
    SuperiorCompetitiveReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCompetitiveLlm();
  }

  async run(input: SuperiorCompetitiveInput): Promise<SuperiorCompetitiveOutput> {
    const eliteRole = "Eres **SuperiorCompetitive Report** — informes semanales de inteligencia.";
    const mission =
      "Genera **informes semanales** de inteligencia competitiva y oportunidades de mercado **sin intervención manual**.";
    const fewShot =
      '{"content":"Weekly competitive intelligence report, market opportunities","score":88,"highlights":["Weekly auto report","Market opportunities"],"metrics":["Report cadence"]}';
    return runSuperiorCompetitiveAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getSuperiorCompetitiveReportAgent(): SuperiorCompetitiveReportAgent {
  return SuperiorCompetitiveReportAgent.instance;
}

export function resetSuperiorCompetitiveReportAgentForTests(): void {
  SuperiorCompetitiveReportAgent.reset();
}
