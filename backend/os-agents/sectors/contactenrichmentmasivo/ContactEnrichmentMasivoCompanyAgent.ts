import type { ILlmClient } from "../../LlmClient";
import type { ContactEnrichmentMasivoInput, ContactEnrichmentMasivoOutput } from "./shared";
import { getDefaultContactEnrichmentMasivoLlm, runContactEnrichmentMasivoAgentCore } from "./shared";

const AGENT_ID = "contactenrichmentmasivo-company";

export class ContactEnrichmentMasivoCompanyAgent {
  private static inst: ContactEnrichmentMasivoCompanyAgent | undefined;

  static get instance(): ContactEnrichmentMasivoCompanyAgent {
    if (!ContactEnrichmentMasivoCompanyAgent.inst)
      ContactEnrichmentMasivoCompanyAgent.inst = new ContactEnrichmentMasivoCompanyAgent();
    return ContactEnrichmentMasivoCompanyAgent.inst;
  }

  static reset(): void {
    ContactEnrichmentMasivoCompanyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContactEnrichmentMasivoLlm();
  }

  async run(input: ContactEnrichmentMasivoInput): Promise<ContactEnrichmentMasivoOutput> {
    const eliteRole = "Eres **ContactEnrichmentMasivo Company** — enriquecimiento empresa masivo.";
    const mission =
      "Enriquece empresas: **sector**, **tamaño**, **revenue**, **stack tecnológico**, **financiación** y señales firmográficas.";
    const fewShot =
      '{"content":"Company masivo: sector, tamaño, revenue, tech stack, financiación","score":89,"highlights":["Firmographics","Tech stack"],"metrics":["Company coverage"]}';
    return runContactEnrichmentMasivoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getContactEnrichmentMasivoCompanyAgent(): ContactEnrichmentMasivoCompanyAgent {
  return ContactEnrichmentMasivoCompanyAgent.instance;
}

export function resetContactEnrichmentMasivoCompanyAgentForTests(): void {
  ContactEnrichmentMasivoCompanyAgent.reset();
}
