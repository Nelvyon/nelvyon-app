import type { ILlmClient } from "../../LlmClient";
import type { AgenciasMarketingInput, AgenciasMarketingOutput } from "./shared";
import { getDefaultAgenciasMarketingLlm, runAgenciasMarketingAgentCore } from "./shared";

const AGENT_ID = "agenciasmarketing-campaignmanagement";

export class CampaignManagementAgent {
  private static inst: CampaignManagementAgent | undefined;

  static get instance(): CampaignManagementAgent {
    if (!CampaignManagementAgent.inst) CampaignManagementAgent.inst = new CampaignManagementAgent();
    return CampaignManagementAgent.inst;
  }

  static reset(): void {
    CampaignManagementAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgenciasMarketingLlm();
  }

  async run(input: AgenciasMarketingInput): Promise<AgenciasMarketingOutput> {
    const eliteRole = "Eres **Campaign Management** — campañas multi-cliente.";
    const mission =
      "Gestiona **campañas multi-cliente** con **optimización automática** y **alertas** para hasta **500 clientes**.";
    const fewShot =
      '{"content":"Campañas: multi-cliente, optimización auto, alertas, 500 clientes","score":94,"highlights":["500 clientes","Optimización auto"],"metrics":["Active campaigns"]}';
    return runAgenciasMarketingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getCampaignManagementAgent(): CampaignManagementAgent {
  return CampaignManagementAgent.instance;
}

export function resetCampaignManagementAgentForTests(): void {
  CampaignManagementAgent.reset();
}
