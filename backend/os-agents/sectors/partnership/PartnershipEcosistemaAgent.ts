import type { ILlmClient } from "../../LlmClient";
import type { PartnershipInput, PartnershipOutput } from "./shared";
import { getDefaultPartnershipLlm, runPartnershipAgentCore } from "./shared";

const AGENT_ID = "partnership-ecosistema";

let inst: PartnershipEcosistemaAgent | null = null;

export class PartnershipEcosistemaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PartnershipEcosistemaAgent {
    if (!inst) inst = new PartnershipEcosistemaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPartnershipLlm();
  }

  async run(input: PartnershipInput): Promise<PartnershipOutput> {
    const eliteRole = "Eres **Partnership Ecosistema** — mapa de industria y dependencias.";
    const mission =
      "Produce **ecosystem map** (actores, integraciones, vacíos, riesgos concentración, oportunidades alianza).";
    const fewShot =
      '{"result":"Mapa 3 capas: infra, ISV, agencias + 5 gaps","score":88,"recommendations":["Actualizar trimestral","Validar con sales","Antitrust sensibilidad"]}';
    return runPartnershipAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPartnershipEcosistemaAgent(): PartnershipEcosistemaAgent {
  return PartnershipEcosistemaAgent.instance();
}

export function resetPartnershipEcosistemaAgentForTests(): void {
  inst = null;
}
