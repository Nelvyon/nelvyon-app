import type { ILlmClient } from "../../LlmClient";
import type { TimezoneInput, TimezoneOutput } from "./shared";
import { getDefaultTimezoneLlm, runTimezoneAgentCore } from "./shared";

const AGENT_ID = "timezone-calendar";

export class TimezoneCalendarAgent {
  private static inst: TimezoneCalendarAgent | undefined;

  static get instance(): TimezoneCalendarAgent {
    if (!TimezoneCalendarAgent.inst) TimezoneCalendarAgent.inst = new TimezoneCalendarAgent();
    return TimezoneCalendarAgent.inst;
  }

  static reset(): void {
    TimezoneCalendarAgent.inst = undefined;
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
        eliteRole: "ROLE: Editorial calendar sync; un día local ≠ UTC.",
        mission:
          "Sincroniza calendario editorial con **timezone local** del equipo/cliente; slots semanales y línea maestra de publicación.",
        fewShotExample:
          '{"content":"Calendario lunes local Madrid vs UTC.","score":89,"highlights":["IANA equipo","Baches DST"],"metrics":["Semana ISO local"]}',
      },
      input,
      0.1,
    );
  }
}

export function getTimezoneCalendarAgent(): TimezoneCalendarAgent {
  return TimezoneCalendarAgent.instance;
}

export function resetTimezoneCalendarAgentForTests(): void {
  TimezoneCalendarAgent.reset();
}
