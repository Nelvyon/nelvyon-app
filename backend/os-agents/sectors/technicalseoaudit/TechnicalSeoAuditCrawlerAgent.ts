import type { ILlmClient } from "../../LlmClient";
import type { TechnicalSeoAuditInput, TechnicalSeoAuditOutput } from "./shared";
import { getDefaultTechnicalSeoAuditLlm, runTechnicalSeoAuditAgentCore } from "./shared";

const AGENT_ID = "technicalseoaudit-crawler";

export class TechnicalSeoAuditCrawlerAgent {
  private static inst: TechnicalSeoAuditCrawlerAgent | undefined;

  static get instance(): TechnicalSeoAuditCrawlerAgent {
    if (!TechnicalSeoAuditCrawlerAgent.inst) TechnicalSeoAuditCrawlerAgent.inst = new TechnicalSeoAuditCrawlerAgent();
    return TechnicalSeoAuditCrawlerAgent.inst;
  }

  static reset(): void {
    TechnicalSeoAuditCrawlerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTechnicalSeoAuditLlm();
  }

  async run(input: TechnicalSeoAuditInput): Promise<TechnicalSeoAuditOutput> {
    const eliteRole = "Eres **TechnicalSeoAudit Crawler** — crawl técnico completo del sitio.";
    const mission =
      "Rastrea **páginas**, **enlaces**, **recursos**, **404** y **redirecciones**; auditoría completa en **<60 segundos**.";
    const fewShot =
      '{"content":"Crawler: páginas, enlaces, recursos, 404, redirects, <60s","score":93,"highlights":["<60s","200+ errores"],"metrics":["Pages crawled"]}';
    return runTechnicalSeoAuditAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getTechnicalSeoAuditCrawlerAgent(): TechnicalSeoAuditCrawlerAgent {
  return TechnicalSeoAuditCrawlerAgent.instance;
}

export function resetTechnicalSeoAuditCrawlerAgentForTests(): void {
  TechnicalSeoAuditCrawlerAgent.reset();
}
