import type { ILlmClient } from "../../LlmClient";
import type { ZapierInput, ZapierOutput } from "./shared";
import { getDefaultZapierLlm, runZapierAgentCore } from "./shared";

const AGENT_ID = "zapier-analytics";

export class ZapierAnalyticsAgent {
  private static inst: ZapierAnalyticsAgent | undefined;

  static get instance(): ZapierAnalyticsAgent {
    if (!ZapierAnalyticsAgent.inst) ZapierAnalyticsAgent.inst = new ZapierAnalyticsAgent();
    return ZapierAnalyticsAgent.inst;
  }

  static reset(): void {
    ZapierAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultZapierLlm();
  }

  async run(input: ZapierInput): Promise<ZapierOutput> {
    return runZapierAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Integration observability; Zapier vs Make split.",
        mission:
          "Métricas: **zaps/scenarios activos**, **ejecuciones/día**, **errores**, **top workflows** por volumen y latencia.",
        fewShotExample:
          '{"content":"1.2k exec/día; top workflow Churn→Email.","score":92,"highlights":["Error rate","p95"],"metrics":["Make vs Zapier"]}',
      },
      input,
      0.1,
    );
  }
}

export function getZapierAnalyticsAgent(): ZapierAnalyticsAgent {
  return ZapierAnalyticsAgent.instance;
}

export function resetZapierAnalyticsAgentForTests(): void {
  ZapierAnalyticsAgent.reset();
}
