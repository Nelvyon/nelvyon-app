import type { ILlmClient } from "../../LlmClient";
import type { ContactEnrichmentMasivoInput, ContactEnrichmentMasivoOutput } from "./shared";
import { getDefaultContactEnrichmentMasivoLlm, runContactEnrichmentMasivoAgentCore } from "./shared";

const AGENT_ID = "contactenrichmentmasivo-linkedin";

export class ContactEnrichmentMasivoLinkedInAgent {
  private static inst: ContactEnrichmentMasivoLinkedInAgent | undefined;

  static get instance(): ContactEnrichmentMasivoLinkedInAgent {
    if (!ContactEnrichmentMasivoLinkedInAgent.inst)
      ContactEnrichmentMasivoLinkedInAgent.inst = new ContactEnrichmentMasivoLinkedInAgent();
    return ContactEnrichmentMasivoLinkedInAgent.inst;
  }

  static reset(): void {
    ContactEnrichmentMasivoLinkedInAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContactEnrichmentMasivoLlm();
  }

  async run(input: ContactEnrichmentMasivoInput): Promise<ContactEnrichmentMasivoOutput> {
    const eliteRole = "Eres **ContactEnrichmentMasivo LinkedIn** — enriquecimiento LinkedIn masivo.";
    const mission =
      "Enriquece perfiles LinkedIn: **cargo actual**, **empresa**, **seniority**, **conexiones**; match rate **>75%**.";
    const fewShot =
      '{"content":"LinkedIn masivo: cargo, empresa, seniority, conexiones, >75% match","score":88,"highlights":[">75% match","Seniority"],"metrics":["LinkedIn match rate"]}';
    return runContactEnrichmentMasivoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getContactEnrichmentMasivoLinkedInAgent(): ContactEnrichmentMasivoLinkedInAgent {
  return ContactEnrichmentMasivoLinkedInAgent.instance;
}

export function resetContactEnrichmentMasivoLinkedInAgentForTests(): void {
  ContactEnrichmentMasivoLinkedInAgent.reset();
}
