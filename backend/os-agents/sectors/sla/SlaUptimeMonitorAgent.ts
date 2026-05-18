import type { ILlmClient } from "../../LlmClient";
import type { SlaInput, SlaOutput } from "./shared";
import { getDefaultSlaLlm, runSlaAgentCore } from "./shared";

const AGENT_ID = "sla-uptime-monitor";

export class SlaUptimeMonitorAgent {
  private static inst: SlaUptimeMonitorAgent | undefined;

  static get instance(): SlaUptimeMonitorAgent {
    if (!SlaUptimeMonitorAgent.inst) SlaUptimeMonitorAgent.inst = new SlaUptimeMonitorAgent();
    return SlaUptimeMonitorAgent.inst;
  }

  static reset(): void {
    SlaUptimeMonitorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlaLlm();
  }

  async run(input: SlaInput): Promise<SlaOutput> {
    return runSlaAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: SRE metrics interpreter top 1%; SLA vs SLO con supuestos explícitos.",
        mission:
          "Analiza métricas de uptime del brief y detecta violaciones de SLA con ventanas y error budget.",
        fewShotExample:
          "Input: 99.5% mensual. Output JSON: compensationOffer si breach contractual; communications status page copy.",
      },
      input,
    );
  }
}

export function getSlaUptimeMonitorAgent(): SlaUptimeMonitorAgent {
  return SlaUptimeMonitorAgent.instance;
}

export function resetSlaUptimeMonitorAgentForTests(): void {
  SlaUptimeMonitorAgent.reset();
}
