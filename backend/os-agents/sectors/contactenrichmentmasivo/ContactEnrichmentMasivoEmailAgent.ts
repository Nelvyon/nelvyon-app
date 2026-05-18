import type { ILlmClient } from "../../LlmClient";
import type { ContactEnrichmentMasivoInput, ContactEnrichmentMasivoOutput } from "./shared";
import { getDefaultContactEnrichmentMasivoLlm, runContactEnrichmentMasivoAgentCore } from "./shared";

const AGENT_ID = "contactenrichmentmasivo-email";

export class ContactEnrichmentMasivoEmailAgent {
  private static inst: ContactEnrichmentMasivoEmailAgent | undefined;

  static get instance(): ContactEnrichmentMasivoEmailAgent {
    if (!ContactEnrichmentMasivoEmailAgent.inst) ContactEnrichmentMasivoEmailAgent.inst = new ContactEnrichmentMasivoEmailAgent();
    return ContactEnrichmentMasivoEmailAgent.inst;
  }

  static reset(): void {
    ContactEnrichmentMasivoEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContactEnrichmentMasivoLlm();
  }

  async run(input: ContactEnrichmentMasivoInput): Promise<ContactEnrichmentMasivoOutput> {
    const eliteRole = "Eres **ContactEnrichmentMasivo Email** — verificación y enriquecimiento masivo de emails.";
    const mission =
      "Verifica emails a escala; detecta **catch-all**; calcula **deliverability score**; cobertura verificada **>90%**.";
    const fewShot =
      '{"content":"Email masivo: verificación SMTP, catch-all detection, deliverability score, >90% cobertura","score":92,"highlights":[">90% verificado","Catch-all"],"metrics":["Deliverability rate"]}';
    return runContactEnrichmentMasivoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getContactEnrichmentMasivoEmailAgent(): ContactEnrichmentMasivoEmailAgent {
  return ContactEnrichmentMasivoEmailAgent.instance;
}

export function resetContactEnrichmentMasivoEmailAgentForTests(): void {
  ContactEnrichmentMasivoEmailAgent.reset();
}
