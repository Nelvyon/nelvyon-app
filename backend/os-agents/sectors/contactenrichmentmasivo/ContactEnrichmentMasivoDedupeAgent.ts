import type { ILlmClient } from "../../LlmClient";
import type { ContactEnrichmentMasivoInput, ContactEnrichmentMasivoOutput } from "./shared";
import { getDefaultContactEnrichmentMasivoLlm, runContactEnrichmentMasivoAgentCore } from "./shared";

const AGENT_ID = "contactenrichmentmasivo-dedupe";

export class ContactEnrichmentMasivoDedupeAgent {
  private static inst: ContactEnrichmentMasivoDedupeAgent | undefined;

  static get instance(): ContactEnrichmentMasivoDedupeAgent {
    if (!ContactEnrichmentMasivoDedupeAgent.inst) ContactEnrichmentMasivoDedupeAgent.inst = new ContactEnrichmentMasivoDedupeAgent();
    return ContactEnrichmentMasivoDedupeAgent.inst;
  }

  static reset(): void {
    ContactEnrichmentMasivoDedupeAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContactEnrichmentMasivoLlm();
  }

  async run(input: ContactEnrichmentMasivoInput): Promise<ContactEnrichmentMasivoOutput> {
    const eliteRole = "Eres **ContactEnrichmentMasivo Dedupe** — deduplicación masiva inteligente.";
    const mission =
      "Deduplica contactos con **fuzzy matching** de nombres, **emails alternativos** y señales de identidad; accuracy **>99%**.";
    const fewShot =
      '{"content":"Dedupe masivo: fuzzy nombres, emails alternativos, >99% accuracy","score":95,"highlights":[">99% accuracy","Fuzzy match"],"metrics":["Dedupe precision"]}';
    return runContactEnrichmentMasivoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getContactEnrichmentMasivoDedupeAgent(): ContactEnrichmentMasivoDedupeAgent {
  return ContactEnrichmentMasivoDedupeAgent.instance;
}

export function resetContactEnrichmentMasivoDedupeAgentForTests(): void {
  ContactEnrichmentMasivoDedupeAgent.reset();
}
