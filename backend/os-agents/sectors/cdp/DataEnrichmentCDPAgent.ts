import type { ILlmClient } from "../../LlmClient";
import type { CdpInput, CdpOutput } from "./shared";
import { getDefaultCdpLlm, runCdpAgentCore } from "./shared";

const AGENT_ID = "cdp-dataenrichmentcdp";

export class DataEnrichmentCDPAgent {
  private static inst: DataEnrichmentCDPAgent | undefined;

  static get instance(): DataEnrichmentCDPAgent {
    if (!DataEnrichmentCDPAgent.inst) DataEnrichmentCDPAgent.inst = new DataEnrichmentCDPAgent();
    return DataEnrichmentCDPAgent.inst;
  }

  static reset(): void {
    DataEnrichmentCDPAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCdpLlm();
  }

  async run(input: CdpInput): Promise<CdpOutput> {
    const eliteRole = "Eres **Data Enrichment CDP** — enriquecimiento de perfiles.";
    const mission =
      "Enriquece perfiles combinando **datos third-party y first-party** con gobernanza de consentimiento y calidad.";
    const fewShot =
      '{"content":"Enrichment: third+first party, perfiles enriquecidos, gobernanza","score":94,"highlights":["Third+first party","Calidad perfil"],"metrics":["Enrichment coverage"]}';
    return runCdpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDataEnrichmentCDPAgent(): DataEnrichmentCDPAgent {
  return DataEnrichmentCDPAgent.instance;
}

export function resetDataEnrichmentCDPAgentForTests(): void {
  DataEnrichmentCDPAgent.reset();
}
