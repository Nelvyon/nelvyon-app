import type { ILlmClient } from "../../LlmClient";
import type { TimezoneInput, TimezoneOutput } from "./shared";
import { getDefaultTimezoneLlm, runTimezoneAgentCore } from "./shared";

const AGENT_ID = "timezone-audit";

export class TimezoneAuditAgent {
  private static inst: TimezoneAuditAgent | undefined;

  static get instance(): TimezoneAuditAgent {
    if (!TimezoneAuditAgent.inst) TimezoneAuditAgent.inst = new TimezoneAuditAgent();
    return TimezoneAuditAgent.inst;
  }

  static reset(): void {
    TimezoneAuditAgent.inst = undefined;
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
        eliteRole: "ROLE: Historical TZ QA; mixed offsets and legacy rows.",
        mission:
          "Detecta inconsistencias de timezone en datos históricos (timestamps sin TZ, cambios de DST, mezcla UTC/local).",
        fewShotExample:
          '{"content":"Job sin offset → riesgo informe.","score":86,"highlights":["NULL TZ","Ambiguous"],"metrics":["Filas sospechosas"]}',
      },
      input,
      0.1,
    );
  }
}

export function getTimezoneAuditAgent(): TimezoneAuditAgent {
  return TimezoneAuditAgent.instance;
}

export function resetTimezoneAuditAgentForTests(): void {
  TimezoneAuditAgent.reset();
}
