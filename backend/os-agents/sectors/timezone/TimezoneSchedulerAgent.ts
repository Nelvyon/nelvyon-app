import type { ILlmClient } from "../../LlmClient";
import type { TimezoneInput, TimezoneOutput } from "./shared";
import { getDefaultTimezoneLlm, runTimezoneAgentCore } from "./shared";

const AGENT_ID = "timezone-scheduler";

export class TimezoneSchedulerAgent {
  private static inst: TimezoneSchedulerAgent | undefined;

  static get instance(): TimezoneSchedulerAgent {
    if (!TimezoneSchedulerAgent.inst) TimezoneSchedulerAgent.inst = new TimezoneSchedulerAgent();
    return TimezoneSchedulerAgent.inst;
  }

  static reset(): void {
    TimezoneSchedulerAgent.inst = undefined;
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
        eliteRole: "ROLE: Local-time scheduler; cola de envíos respetando IANA del destinatario.",
        mission:
          "Programa envíos y publicaciones en **hora local** del cliente; expone instante UTC y local para integración cola OS.",
        fewShotExample:
          '{"content":"Post 18:00 Europe/Madrid = 17:00 UTC (ej.).","score":90,"highlights":["Local first","UTC stored"],"metrics":["IANA"]}',
      },
      input,
      0.2,
    );
  }
}

export function getTimezoneSchedulerAgent(): TimezoneSchedulerAgent {
  return TimezoneSchedulerAgent.instance;
}

export function resetTimezoneSchedulerAgentForTests(): void {
  TimezoneSchedulerAgent.reset();
}
