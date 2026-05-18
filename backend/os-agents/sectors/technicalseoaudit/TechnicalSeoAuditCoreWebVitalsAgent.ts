import type { ILlmClient } from "../../LlmClient";
import type { TechnicalSeoAuditInput, TechnicalSeoAuditOutput } from "./shared";
import { getDefaultTechnicalSeoAuditLlm, runTechnicalSeoAuditAgentCore } from "./shared";

const AGENT_ID = "technicalseoaudit-corewebvitals";

export class TechnicalSeoAuditCoreWebVitalsAgent {
  private static inst: TechnicalSeoAuditCoreWebVitalsAgent | undefined;

  static get instance(): TechnicalSeoAuditCoreWebVitalsAgent {
    if (!TechnicalSeoAuditCoreWebVitalsAgent.inst)
      TechnicalSeoAuditCoreWebVitalsAgent.inst = new TechnicalSeoAuditCoreWebVitalsAgent();
    return TechnicalSeoAuditCoreWebVitalsAgent.inst;
  }

  static reset(): void {
    TechnicalSeoAuditCoreWebVitalsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTechnicalSeoAuditLlm();
  }

  async run(input: TechnicalSeoAuditInput): Promise<TechnicalSeoAuditOutput> {
    const eliteRole = "Eres **TechnicalSeoAudit CoreWebVitals** — análisis CWV por página y dispositivo.";
    const mission =
      "Mide **LCP**, **CLS**, **INP** y **TTFB** por página y dispositivo con priorización por impacto SEO.";
    const fewShot =
      '{"content":"CWV: LCP, CLS, INP, TTFB por página y dispositivo","score":92,"highlights":["Por página","LCP/CLS/INP"],"metrics":["LCP p75"]}';
    return runTechnicalSeoAuditAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getTechnicalSeoAuditCoreWebVitalsAgent(): TechnicalSeoAuditCoreWebVitalsAgent {
  return TechnicalSeoAuditCoreWebVitalsAgent.instance;
}

export function resetTechnicalSeoAuditCoreWebVitalsAgentForTests(): void {
  TechnicalSeoAuditCoreWebVitalsAgent.reset();
}
