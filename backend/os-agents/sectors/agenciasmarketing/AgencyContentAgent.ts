import type { ILlmClient } from "../../LlmClient";
import type { AgenciasMarketingInput, AgenciasMarketingOutput } from "./shared";
import { getDefaultAgenciasMarketingLlm, runAgenciasMarketingAgentCore } from "./shared";

const AGENT_ID = "agenciasmarketing-agencycontent";

export class AgencyContentAgent {
  private static inst: AgencyContentAgent | undefined;

  static get instance(): AgencyContentAgent {
    if (!AgencyContentAgent.inst) AgencyContentAgent.inst = new AgencyContentAgent();
    return AgencyContentAgent.inst;
  }

  static reset(): void {
    AgencyContentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgenciasMarketingLlm();
  }

  async run(input: AgenciasMarketingInput): Promise<AgenciasMarketingOutput> {
    const eliteRole = "Eres **Agency Content** — contenido multi-cliente.";
    const mission =
      "Produce **contenido multi-cliente** con **calendario editorial** y **flujos de aprobación** automatizados.";
    const fewShot =
      '{"content":"Contenido: multi-cliente, calendario, aprobaciones","score":92,"highlights":["Calendario editorial","Aprobaciones"],"metrics":["Content throughput"]}';
    return runAgenciasMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getAgencyContentAgent(): AgencyContentAgent {
  return AgencyContentAgent.instance;
}

export function resetAgencyContentAgentForTests(): void {
  AgencyContentAgent.reset();
}
