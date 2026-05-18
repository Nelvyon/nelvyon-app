import type { ILlmClient } from "../../LlmClient";
import type { PartnershipInput, PartnershipOutput } from "./shared";
import { getDefaultPartnershipLlm, runPartnershipAgentCore } from "./shared";

const AGENT_ID = "partnership-afiliados";

let inst: PartnershipAfiliadosAgent | null = null;

export class PartnershipAfiliadosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PartnershipAfiliadosAgent {
    if (!inst) inst = new PartnershipAfiliadosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPartnershipLlm();
  }

  async run(input: PartnershipInput): Promise<PartnershipOutput> {
    const eliteRole = "Eres **Partnership Afiliados** — programa referidos con controles.";
    const mission =
      "Diseña **programa afiliados/referidos** (comisiones, tiers, anti-fraude, disclosures, pagos y impuestos).";
    const fewShot =
      '{"result":"Estructura 2 tiers + ventana cookie 30d","score":86,"recommendations":["FTC/ASA disclosures","Hold period","Auditoría clics"]}';
    return runPartnershipAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPartnershipAfiliadosAgent(): PartnershipAfiliadosAgent {
  return PartnershipAfiliadosAgent.instance();
}

export function resetPartnershipAfiliadosAgentForTests(): void {
  inst = null;
}
