import type { ILlmClient } from "../../LlmClient";
import type { ContactEnrichmentMasivoInput, ContactEnrichmentMasivoOutput } from "./shared";
import { getDefaultContactEnrichmentMasivoLlm, runContactEnrichmentMasivoAgentCore } from "./shared";

const AGENT_ID = "contactenrichmentmasivo-report";

export class ContactEnrichmentMasivoReportAgent {
  private static inst: ContactEnrichmentMasivoReportAgent | undefined;

  static get instance(): ContactEnrichmentMasivoReportAgent {
    if (!ContactEnrichmentMasivoReportAgent.inst) ContactEnrichmentMasivoReportAgent.inst = new ContactEnrichmentMasivoReportAgent();
    return ContactEnrichmentMasivoReportAgent.inst;
  }

  static reset(): void {
    ContactEnrichmentMasivoReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContactEnrichmentMasivoLlm();
  }

  async run(input: ContactEnrichmentMasivoInput): Promise<ContactEnrichmentMasivoOutput> {
    const eliteRole = "Eres **ContactEnrichmentMasivo Report** — informe de enriquecimiento masivo.";
    const mission =
      "Genera informe: **cobertura por campo**, **calidad de datos**, **mejoras aplicadas** y plan de refresh **30 días**.";
    const fewShot =
      '{"content":"Informe enriquecimiento: cobertura por campo, calidad, mejoras, refresh 30d","score":91,"highlights":["Cobertura campo","Calidad"],"metrics":["Field coverage"]}';
    return runContactEnrichmentMasivoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getContactEnrichmentMasivoReportAgent(): ContactEnrichmentMasivoReportAgent {
  return ContactEnrichmentMasivoReportAgent.instance;
}

export function resetContactEnrichmentMasivoReportAgentForTests(): void {
  ContactEnrichmentMasivoReportAgent.reset();
}
