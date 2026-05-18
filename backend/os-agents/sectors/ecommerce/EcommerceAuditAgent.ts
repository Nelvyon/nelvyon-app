import type { ILlmClient } from "../../LlmClient";
import type { EcommerceInput, EcommerceOutput } from "./shared";
import { getDefaultEcommerceLlm, runEcommerceAgentCore } from "./shared";

const AGENT_ID = "ecommerce-ecommerceaudit";

export class EcommerceAuditAgent {
  private static inst: EcommerceAuditAgent | undefined;

  static get instance(): EcommerceAuditAgent {
    if (!EcommerceAuditAgent.inst) EcommerceAuditAgent.inst = new EcommerceAuditAgent();
    return EcommerceAuditAgent.inst;
  }

  static reset(): void {
    EcommerceAuditAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceLlm();
  }

  async run(input: EcommerceInput): Promise<EcommerceOutput> {
    const eliteRole = "Eres **Ecommerce Audit** — auditoría integral de tienda.";
    const mission =
      "Audita **conversión, velocidad, UX, SEO y checkout** con informe completo en **<5 minutos**.";
    const fewShot =
      '{"content":"Auditoría tienda: conversión, velocidad, UX, SEO, checkout, <5 min","score":94,"highlights":["<5 min audit","Checkout UX"],"metrics":["Audit turnaround"]}';
    return runEcommerceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getEcommerceAuditAgent(): EcommerceAuditAgent {
  return EcommerceAuditAgent.instance;
}

export function resetEcommerceAuditAgentForTests(): void {
  EcommerceAuditAgent.reset();
}
