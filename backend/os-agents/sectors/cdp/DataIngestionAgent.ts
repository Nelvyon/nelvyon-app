import type { ILlmClient } from "../../LlmClient";
import type { CdpInput, CdpOutput } from "./shared";
import { getDefaultCdpLlm, runCdpAgentCore } from "./shared";

const AGENT_ID = "cdp-dataingestion";

export class DataIngestionAgent {
  private static inst: DataIngestionAgent | undefined;

  static get instance(): DataIngestionAgent {
    if (!DataIngestionAgent.inst) DataIngestionAgent.inst = new DataIngestionAgent();
    return DataIngestionAgent.inst;
  }

  static reset(): void {
    DataIngestionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCdpLlm();
  }

  async run(input: CdpInput): Promise<CdpOutput> {
    const eliteRole = "Eres **Data Ingestion** — ingesta omnicanal al CDP.";
    const mission =
      "Ingesta datos de **web, app, CRM, email, ads y offline** con esquemas normalizados y calidad de identidad.";
    const fewShot =
      '{"content":"Ingesta omnicanal: web/app/CRM/email/ads/offline, normalización","score":93,"highlights":["Fuentes unificadas","Esquema CDP"],"metrics":["Ingest throughput"]}';
    return runCdpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDataIngestionAgent(): DataIngestionAgent {
  return DataIngestionAgent.instance;
}

export function resetDataIngestionAgentForTests(): void {
  DataIngestionAgent.reset();
}
