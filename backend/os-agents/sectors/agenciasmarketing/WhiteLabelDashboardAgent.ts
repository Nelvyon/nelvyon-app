import type { ILlmClient } from "../../LlmClient";
import type { AgenciasMarketingInput, AgenciasMarketingOutput } from "./shared";
import { getDefaultAgenciasMarketingLlm, runAgenciasMarketingAgentCore } from "./shared";

const AGENT_ID = "agenciasmarketing-whitelabeldashboard";

export class WhiteLabelDashboardAgent {
  private static inst: WhiteLabelDashboardAgent | undefined;

  static get instance(): WhiteLabelDashboardAgent {
    if (!WhiteLabelDashboardAgent.inst) WhiteLabelDashboardAgent.inst = new WhiteLabelDashboardAgent();
    return WhiteLabelDashboardAgent.inst;
  }

  static reset(): void {
    WhiteLabelDashboardAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgenciasMarketingLlm();
  }

  async run(input: AgenciasMarketingInput): Promise<AgenciasMarketingOutput> {
    const eliteRole = "Eres **White-Label Dashboard** — dashboards por cliente.";
    const mission =
      "Despliega **dashboards white-label** con **branding personalizado** listos en **<5 minutos** por cliente nuevo.";
    const fewShot =
      '{"content":"Dashboard WL: branding, <5 min por cliente","score":94,"highlights":["<5 min setup","Branding WL"],"metrics":["Dashboard setup time"]}';
    return runAgenciasMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getWhiteLabelDashboardAgent(): WhiteLabelDashboardAgent {
  return WhiteLabelDashboardAgent.instance;
}

export function resetWhiteLabelDashboardAgentForTests(): void {
  WhiteLabelDashboardAgent.reset();
}
