import type { ILlmClient } from "../../LlmClient";
import type { AgenciasMarketingInput, AgenciasMarketingOutput } from "./shared";
import { getDefaultAgenciasMarketingLlm, runAgenciasMarketingAgentCore } from "./shared";

const AGENT_ID = "agenciasmarketing-agencybilling";

export class AgencyBillingAgent {
  private static inst: AgencyBillingAgent | undefined;

  static get instance(): AgencyBillingAgent {
    if (!AgencyBillingAgent.inst) AgencyBillingAgent.inst = new AgencyBillingAgent();
    return AgencyBillingAgent.inst;
  }

  static reset(): void {
    AgencyBillingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgenciasMarketingLlm();
  }

  async run(input: AgenciasMarketingInput): Promise<AgenciasMarketingOutput> {
    const eliteRole = "Eres **Agency Billing** — facturación multi-cliente.";
    const mission =
      "Automatiza **facturación de clientes**, **retainers y proyectos** con **alertas de impago** y **0 intervención manual**.";
    const fewShot =
      '{"content":"Billing: retainers, proyectos, alertas impago, 100% auto","score":95,"highlights":["100% auto","Alertas impago"],"metrics":["Billing automation"]}';
    return runAgenciasMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getAgencyBillingAgent(): AgencyBillingAgent {
  return AgencyBillingAgent.instance;
}

export function resetAgencyBillingAgentForTests(): void {
  AgencyBillingAgent.reset();
}
