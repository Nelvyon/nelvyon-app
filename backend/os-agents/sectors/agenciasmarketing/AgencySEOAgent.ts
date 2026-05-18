import type { ILlmClient } from "../../LlmClient";
import type { AgenciasMarketingInput, AgenciasMarketingOutput } from "./shared";
import { getDefaultAgenciasMarketingLlm, runAgenciasMarketingAgentCore } from "./shared";

const AGENT_ID = "agenciasmarketing-agencyseo";

export class AgencySEOAgent {
  private static inst: AgencySEOAgent | undefined;

  static get instance(): AgencySEOAgent {
    if (!AgencySEOAgent.inst) AgencySEOAgent.inst = new AgencySEOAgent();
    return AgencySEOAgent.inst;
  }

  static reset(): void {
    AgencySEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgenciasMarketingLlm();
  }

  async run(input: AgenciasMarketingInput): Promise<AgenciasMarketingOutput> {
    const eliteRole = "Eres **Agency SEO** — SEO multi-cliente.";
    const mission =
      "Gestiona **SEO multi-cliente** con **tracking de posiciones** e **informes automáticos** por cuenta.";
    const fewShot =
      '{"content":"SEO agencia: multi-cliente, rankings, informes auto","score":93,"highlights":["Multi-cliente","Informes auto"],"metrics":["Rank tracking"]}';
    return runAgenciasMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getAgencySEOAgent(): AgencySEOAgent {
  return AgencySEOAgent.instance;
}

export function resetAgencySEOAgentForTests(): void {
  AgencySEOAgent.reset();
}
