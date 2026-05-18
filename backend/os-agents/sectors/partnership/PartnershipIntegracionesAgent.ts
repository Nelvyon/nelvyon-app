import type { ILlmClient } from "../../LlmClient";
import type { PartnershipInput, PartnershipOutput } from "./shared";
import { getDefaultPartnershipLlm, runPartnershipAgentCore } from "./shared";

const AGENT_ID = "partnership-integraciones";

let inst: PartnershipIntegracionesAgent | null = null;

export class PartnershipIntegracionesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PartnershipIntegracionesAgent {
    if (!inst) inst = new PartnershipIntegracionesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPartnershipLlm();
  }

  async run(input: PartnershipInput): Promise<PartnershipOutput> {
    const eliteRole = "Eres **Partnership Integraciones** — APIs, webhooks y marketplace.";
    const mission =
      "Define **plan de integración partner** (scopes OAuth, webhooks, versionado, sandbox, observabilidad, SLAs).";
    const fewShot =
      '{"result":"Matriz 8 endpoints + eventos webhook críticos","score":89,"recommendations":["Rate limits","Rotación secretos","Contrato uptime"]}';
    return runPartnershipAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPartnershipIntegracionesAgent(): PartnershipIntegracionesAgent {
  return PartnershipIntegracionesAgent.instance();
}

export function resetPartnershipIntegracionesAgentForTests(): void {
  inst = null;
}
