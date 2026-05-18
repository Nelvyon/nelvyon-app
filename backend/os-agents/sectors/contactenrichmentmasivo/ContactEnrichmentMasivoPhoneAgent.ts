import type { ILlmClient } from "../../LlmClient";
import type { ContactEnrichmentMasivoInput, ContactEnrichmentMasivoOutput } from "./shared";
import { getDefaultContactEnrichmentMasivoLlm, runContactEnrichmentMasivoAgentCore } from "./shared";

const AGENT_ID = "contactenrichmentmasivo-phone";

export class ContactEnrichmentMasivoPhoneAgent {
  private static inst: ContactEnrichmentMasivoPhoneAgent | undefined;

  static get instance(): ContactEnrichmentMasivoPhoneAgent {
    if (!ContactEnrichmentMasivoPhoneAgent.inst) ContactEnrichmentMasivoPhoneAgent.inst = new ContactEnrichmentMasivoPhoneAgent();
    return ContactEnrichmentMasivoPhoneAgent.inst;
  }

  static reset(): void {
    ContactEnrichmentMasivoPhoneAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContactEnrichmentMasivoLlm();
  }

  async run(input: ContactEnrichmentMasivoInput): Promise<ContactEnrichmentMasivoOutput> {
    const eliteRole = "Eres **ContactEnrichmentMasivo Phone** — enriquecimiento masivo de teléfonos.";
    const mission =
      "Valida teléfonos; clasifica **móvil/fijo**; identifica **operadora** y **país**; normaliza formatos internacionales.";
    const fewShot =
      '{"content":"Phone masivo: validación E.164, tipo móvil/fijo, operadora, país","score":90,"highlights":["E.164","Operadora"],"metrics":["Phone coverage"]}';
    return runContactEnrichmentMasivoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getContactEnrichmentMasivoPhoneAgent(): ContactEnrichmentMasivoPhoneAgent {
  return ContactEnrichmentMasivoPhoneAgent.instance;
}

export function resetContactEnrichmentMasivoPhoneAgentForTests(): void {
  ContactEnrichmentMasivoPhoneAgent.reset();
}
