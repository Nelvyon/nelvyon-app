import type { ILlmClient } from "../../LlmClient";
import type { TimezoneInput, TimezoneOutput } from "./shared";
import { getDefaultTimezoneLlm, runTimezoneAgentCore } from "./shared";

const AGENT_ID = "timezone-report";

export class TimezoneReportAgent {
  private static inst: TimezoneReportAgent | undefined;

  static get instance(): TimezoneReportAgent {
    if (!TimezoneReportAgent.inst) TimezoneReportAgent.inst = new TimezoneReportAgent();
    return TimezoneReportAgent.inst;
  }

  static reset(): void {
    TimezoneReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTimezoneLlm();
  }

  async run(input: TimezoneInput): Promise<TimezoneOutput> {
    return runTimezoneAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Analytics TZ bridge; dual view UTC + cliente.",
        mission:
          "Normaliza datos de analytics a **UTC** para agregados globales y a **hora local del cliente** para informes legibles.",
        fewShotExample:
          '{"content":"Series diarias: bucket UTC + vista Europe/Madrid.","score":91,"highlights":["UTC store","Local view"],"metrics":["Alineación día"]}',
      },
      input,
      0.1,
    );
  }
}

export function getTimezoneReportAgent(): TimezoneReportAgent {
  return TimezoneReportAgent.instance;
}

export function resetTimezoneReportAgentForTests(): void {
  TimezoneReportAgent.reset();
}
