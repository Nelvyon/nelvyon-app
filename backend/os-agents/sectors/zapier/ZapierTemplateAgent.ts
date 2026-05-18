import type { ILlmClient } from "../../LlmClient";
import type { ZapierInput, ZapierOutput } from "./shared";
import { getDefaultZapierLlm, runZapierAgentCore } from "./shared";

const AGENT_ID = "zapier-template";

export class ZapierTemplateAgent {
  private static inst: ZapierTemplateAgent | undefined;

  static get instance(): ZapierTemplateAgent {
    if (!ZapierTemplateAgent.inst) ZapierTemplateAgent.inst = new ZapierTemplateAgent();
    return ZapierTemplateAgent.inst;
  }

  static reset(): void {
    ZapierTemplateAgent.inst = undefined;
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
        eliteRole: "ROLE: Blueprint library; sector-aware starter zaps.",
        mission:
          "Genera plantillas de zaps/scenarios: **Nuevo cliente → CRM**, **Reporte listo → Slack**, **Churn → Email rescate**, **Review negativa → Alerta**, **Billing fallido → SMS**; export JSON Zapier + blueprint Make.",
        fewShotExample:
          '{"content":"Template retail: churn→SMS con variables.","score":87,"highlights":["Sector retail","Steps"],"metrics":["Import URL"]}',
      },
      input,
      0.4,
    );
  }
}

export function getZapierTemplateAgent(): ZapierTemplateAgent {
  return ZapierTemplateAgent.instance;
}

export function resetZapierTemplateAgentForTests(): void {
  ZapierTemplateAgent.reset();
}
