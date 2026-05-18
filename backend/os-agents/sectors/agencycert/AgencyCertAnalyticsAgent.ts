import type { ILlmClient } from "../../LlmClient";
import type { AgencyCertInput, AgencyCertOutput } from "./shared";
import { getDefaultAgencyCertLlm, runAgencyCertAgentCore } from "./shared";

const AGENT_ID = "agencycert-analytics";

export class AgencyCertAnalyticsAgent {
  private static inst: AgencyCertAnalyticsAgent | undefined;

  static get instance(): AgencyCertAnalyticsAgent {
    if (!AgencyCertAnalyticsAgent.inst) AgencyCertAnalyticsAgent.inst = new AgencyCertAnalyticsAgent();
    return AgencyCertAnalyticsAgent.inst;
  }

  static reset(): void {
    AgencyCertAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgencyCertLlm();
  }

  async run(input: AgencyCertInput): Promise<AgencyCertOutput> {
    return runAgencyCertAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Partner program BI; cohortes certificadas.",
        mission:
          "Métricas programa: **agencias certificadas**, **revenue generado vía partners**, **clientes gestionados** agregados.",
        fewShotExample:
          '{"content":"120 agencias cert; ARR partner €4.2M.","score":94,"highlights":["Por nivel","YoY"],"metrics":["Clientes gestionados"]}',
      },
      input,
      0.1,
    );
  }
}

export function getAgencyCertAnalyticsAgent(): AgencyCertAnalyticsAgent {
  return AgencyCertAnalyticsAgent.instance;
}

export function resetAgencyCertAnalyticsAgentForTests(): void {
  AgencyCertAnalyticsAgent.reset();
}
