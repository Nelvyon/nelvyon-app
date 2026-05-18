import type { ILlmClient } from "../../LlmClient";
import type { LeadEnrichInput, LeadEnrichOutput } from "./shared";
import { getDefaultLeadEnrichLlm, runLeadEnrichAgentCore } from "./shared";

const AGENT_ID = "leadenrich-sync";

export class LeadEnrichSyncAgent {
  private static inst: LeadEnrichSyncAgent | undefined;

  static get instance(): LeadEnrichSyncAgent {
    if (!LeadEnrichSyncAgent.inst) LeadEnrichSyncAgent.inst = new LeadEnrichSyncAgent();
    return LeadEnrichSyncAgent.inst;
  }

  static reset(): void {
    LeadEnrichSyncAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLeadEnrichLlm();
  }

  async run(input: LeadEnrichInput): Promise<LeadEnrichOutput> {
    const eliteRole =
      "Eres **LeadEnrich CRM Sync** — push de leads enriquecidos al CRM NELVYON en tiempo real.";
    const mission =
      "Sincroniza **leads enriquecidos** con **CRM NELVYON** en tiempo real: campos perfil, score, segmento y contacto verificado.";
    const fewShot =
      '{"content":"CRM upsert: profile, score 76, MQL, contacts synced","score":92,"highlights":["Realtime CRM sync","Idempotent upsert"],"metrics":["Sync latency"]}';
    return runLeadEnrichAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getLeadEnrichSyncAgent(): LeadEnrichSyncAgent {
  return LeadEnrichSyncAgent.instance;
}

export function resetLeadEnrichSyncAgentForTests(): void {
  LeadEnrichSyncAgent.reset();
}
