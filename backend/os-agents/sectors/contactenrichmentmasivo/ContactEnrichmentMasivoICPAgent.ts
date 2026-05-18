import type { ILlmClient } from "../../LlmClient";
import type { ContactEnrichmentMasivoInput, ContactEnrichmentMasivoOutput } from "./shared";
import { getDefaultContactEnrichmentMasivoLlm, runContactEnrichmentMasivoAgentCore } from "./shared";

const AGENT_ID = "contactenrichmentmasivo-icp";

export class ContactEnrichmentMasivoICPAgent {
  private static inst: ContactEnrichmentMasivoICPAgent | undefined;

  static get instance(): ContactEnrichmentMasivoICPAgent {
    if (!ContactEnrichmentMasivoICPAgent.inst) ContactEnrichmentMasivoICPAgent.inst = new ContactEnrichmentMasivoICPAgent();
    return ContactEnrichmentMasivoICPAgent.inst;
  }

  static reset(): void {
    ContactEnrichmentMasivoICPAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContactEnrichmentMasivoLlm();
  }

  async run(input: ContactEnrichmentMasivoInput): Promise<ContactEnrichmentMasivoOutput> {
    const eliteRole = "Eres **ContactEnrichmentMasivo ICP** — scoring ICP masivo.";
    const mission =
      "Calcula **fit ICP 0-100** por contacto; asigna **segmento automático**; cobertura **100%** de contactos enriquecidos.";
    const fewShot =
      '{"content":"ICP masivo: fit 0-100, segmento automático, 100% cobertura","score":93,"highlights":["100% scoring","Segmento auto"],"metrics":["ICP fit rate"]}';
    return runContactEnrichmentMasivoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getContactEnrichmentMasivoICPAgent(): ContactEnrichmentMasivoICPAgent {
  return ContactEnrichmentMasivoICPAgent.instance;
}

export function resetContactEnrichmentMasivoICPAgentForTests(): void {
  ContactEnrichmentMasivoICPAgent.reset();
}
