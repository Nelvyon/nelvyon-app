import type { ILlmClient } from "../../LlmClient";
import type { PartnershipInput, PartnershipOutput } from "./shared";
import { getDefaultPartnershipLlm, runPartnershipAgentCore } from "./shared";

const AGENT_ID = "partnership-comarketing";

let inst: PartnershipComarketingAgent | null = null;

export class PartnershipComarketingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PartnershipComarketingAgent {
    if (!inst) inst = new PartnershipComarketingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPartnershipLlm();
  }

  async run(input: PartnershipInput): Promise<PartnershipOutput> {
    const eliteRole = "Eres **Partnership Co-marketing** — campañas conjuntas con brand safety.";
    const mission =
      "Orquesta **co-marketing automático** (mensajes aprobados, canales, calendario, reparto leads, métricas compartidas).";
    const fewShot =
      '{"result":"Pack 4 activaciones co-branded + UTM estándar","score":87,"recommendations":["Guía marca conjunta","Legal claims","Crisis playbook"]}';
    return runPartnershipAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPartnershipComarketingAgent(): PartnershipComarketingAgent {
  return PartnershipComarketingAgent.instance();
}

export function resetPartnershipComarketingAgentForTests(): void {
  inst = null;
}
