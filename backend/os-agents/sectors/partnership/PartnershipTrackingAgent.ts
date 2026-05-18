import type { ILlmClient } from "../../LlmClient";
import type { PartnershipInput, PartnershipOutput } from "./shared";
import { getDefaultPartnershipLlm, runPartnershipAgentCore } from "./shared";

const AGENT_ID = "partnership-tracking";

let inst: PartnershipTrackingAgent | null = null;

export class PartnershipTrackingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PartnershipTrackingAgent {
    if (!inst) inst = new PartnershipTrackingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPartnershipLlm();
  }

  async run(input: PartnershipInput): Promise<PartnershipOutput> {
    const eliteRole = "Eres **Partnership Tracking** — revenue por partner trazable.";
    const mission =
      "Diseña **modelo de atribución y reporting** (MRR influenciado, deals sourced, reconciliación con CRM/finance).";
    const fewShot =
      '{"result":"Dashboard partner: sourced vs influenced + lag","score":90,"recommendations":["Single source truth","Disputas SLA","Auditoría trimestral"]}';
    return runPartnershipAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPartnershipTrackingAgent(): PartnershipTrackingAgent {
  return PartnershipTrackingAgent.instance();
}

export function resetPartnershipTrackingAgentForTests(): void {
  inst = null;
}
