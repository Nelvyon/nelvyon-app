import type { ILlmClient } from "../../LlmClient";
import type { CiberseguridadInput, CiberseguridadOutput } from "./shared";
import { getDefaultCiberseguridadLlm, runCiberseguridadAgentCore } from "./shared";

const AGENT_ID = "ciberseguridad-analytics";

export class CiberseguridadAnalyticsAgent {
  private static inst: CiberseguridadAnalyticsAgent | undefined;

  static get instance(): CiberseguridadAnalyticsAgent {
    if (!CiberseguridadAnalyticsAgent.inst) CiberseguridadAnalyticsAgent.inst = new CiberseguridadAnalyticsAgent();
    return CiberseguridadAnalyticsAgent.inst;
  }

  static reset(): void {
    CiberseguridadAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCiberseguridadLlm();
  }

  async run(input: CiberseguridadInput): Promise<CiberseguridadOutput> {
    const eliteRole = "Eres **Ciberseguridad Analytics** — pipeline enterprise.";
    const mission = "Define **analytics de pipeline enterprise** y **conversión** por segmento y oferta.";
    const fewShot =
      '{"result":"Analytics pipeline enterprise vendor SOC","score":93,"recommendations":["CPL enterprise","Win rate vertical"]}';
    return runCiberseguridadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCiberseguridadAnalyticsAgent(): CiberseguridadAnalyticsAgent {
  return CiberseguridadAnalyticsAgent.instance;
}

export function resetCiberseguridadAnalyticsAgentForTests(): void {
  CiberseguridadAnalyticsAgent.reset();
}
