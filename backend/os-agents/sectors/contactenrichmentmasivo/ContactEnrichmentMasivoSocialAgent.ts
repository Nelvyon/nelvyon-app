import type { ILlmClient } from "../../LlmClient";
import type { ContactEnrichmentMasivoInput, ContactEnrichmentMasivoOutput } from "./shared";
import { getDefaultContactEnrichmentMasivoLlm, runContactEnrichmentMasivoAgentCore } from "./shared";

const AGENT_ID = "contactenrichmentmasivo-social";

export class ContactEnrichmentMasivoSocialAgent {
  private static inst: ContactEnrichmentMasivoSocialAgent | undefined;

  static get instance(): ContactEnrichmentMasivoSocialAgent {
    if (!ContactEnrichmentMasivoSocialAgent.inst)
      ContactEnrichmentMasivoSocialAgent.inst = new ContactEnrichmentMasivoSocialAgent();
    return ContactEnrichmentMasivoSocialAgent.inst;
  }

  static reset(): void {
    ContactEnrichmentMasivoSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContactEnrichmentMasivoLlm();
  }

  async run(input: ContactEnrichmentMasivoInput): Promise<ContactEnrichmentMasivoOutput> {
    const eliteRole = "Eres **ContactEnrichmentMasivo Social** — enriquecimiento social masivo.";
    const mission =
      "Enriquece presencia social: **X**, **GitHub**, **Instagram**; mide **actividad reciente** y señales de engagement.";
    const fewShot =
      '{"content":"Social masivo: X, GitHub, Instagram, actividad reciente","score":86,"highlights":["Multi-red","Actividad"],"metrics":["Social coverage"]}';
    return runContactEnrichmentMasivoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getContactEnrichmentMasivoSocialAgent(): ContactEnrichmentMasivoSocialAgent {
  return ContactEnrichmentMasivoSocialAgent.instance;
}

export function resetContactEnrichmentMasivoSocialAgentForTests(): void {
  ContactEnrichmentMasivoSocialAgent.reset();
}
